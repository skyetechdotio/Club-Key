import { db } from './db';
import { eq, and, or, desc, lte } from 'drizzle-orm';
import { 
  User, InsertUser, UpsertUser,
  Club, InsertClub, 
  UserClub, InsertUserClub,
  TeeTimeListing, InsertTeeTimeListing,
  Booking, InsertBooking,
  Review, InsertReview,
  Message, InsertMessage,
  Notification, InsertNotification,
  users, clubs, userClubs, teeTimeListing, bookings, reviews, messages, notifications
} from '@shared/schema';
import { IStorage } from './storage';
import { pool } from './db';
import connectPg from 'connect-pg-simple';
import session from 'express-session';

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }
  
  async getUserByResetToken(resetToken: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, resetToken));
    return user;
  }
  
  // Removed getUserByReplitId as it's not needed in our current implementation

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      createdAt: new Date()
    }).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    // Add updatedAt to force a cache refresh
    const updateData = {
      ...userData,
      updatedAt: new Date()
    };
    
    console.log(`Updating user ${id} with data:`, updateData);
    
    try {
      const [updatedUser] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();
      
      console.log(`Updated user ${id} successfully:`, updatedUser);
      return updatedUser;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  async updateUserStripeInfo(id: number, stripeInfo: { customerId: string, connectId?: string }): Promise<User | undefined> {
    const updateData: any = { 
      stripeCustomerId: stripeInfo.customerId,
      updatedAt: new Date()
    };
    
    if (stripeInfo.connectId) {
      updateData.stripeConnectId = stripeInfo.connectId;
    }
    
    console.log(`Updating Stripe info for user ${id}:`, updateData);
    
    try {
      const [updatedUser] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();
      
      console.log(`Updated Stripe info for user ${id} successfully:`, updatedUser);
      return updatedUser;
    } catch (error) {
      console.error(`Error updating Stripe info for user ${id}:`, error);
      throw error;
    }
  }
  
  async upsertUser(upsertUser: UpsertUser): Promise<User> {
    // Convert numeric IDs to strings for consistency in Replit Auth
    const userId = typeof upsertUser.id === 'number' ? upsertUser.id.toString() : upsertUser.id;
    
    try {
      // Try to update the existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          ...upsertUser,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
        
      if (updatedUser) {
        return updatedUser;
      }
    } catch (error) {
      console.log('Error updating user:', error);
      // If update fails, proceed to insert
    }
    
    // If update didn't return a user, insert a new one
    const [newUser] = await db
      .insert(users)
      .values({
        ...upsertUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...upsertUser,
          updatedAt: new Date(),
        },
      })
      .returning();
      
    return newUser;
  }

  async getClub(id: number): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
    return club;
  }

  async getClubs(): Promise<Club[]> {
    return await db.select().from(clubs);
  }

  async createClub(insertClub: InsertClub): Promise<Club> {
    const [club] = await db.insert(clubs).values({
      ...insertClub,
      createdAt: new Date()
    }).returning();
    return club;
  }

  async getUserClubs(userId: number): Promise<UserClub[]> {
    return await db.select().from(userClubs).where(eq(userClubs.userId, userId));
  }

  async addUserToClub(insertUserClub: InsertUserClub): Promise<UserClub> {
    const [userClub] = await db.insert(userClubs).values(insertUserClub).returning();
    return userClub;
  }

  async getTeeTimeListing(id: number): Promise<TeeTimeListing | undefined> {
    const [teeTime] = await db.select().from(teeTimeListing).where(eq(teeTimeListing.id, id));
    return teeTime;
  }

  async getTeeTimeListingsByHostId(hostId: number): Promise<TeeTimeListing[]> {
    return await db.select().from(teeTimeListing).where(eq(teeTimeListing.hostId, hostId));
  }

  async getTeeTimeListingsByClubId(clubId: number): Promise<TeeTimeListing[]> {
    return await db.select().from(teeTimeListing).where(eq(teeTimeListing.clubId, clubId));
  }

  async getAvailableTeeTimeListings(): Promise<TeeTimeListing[]> {
    return await db.select().from(teeTimeListing).where(eq(teeTimeListing.status, 'available'));
  }

  async createTeeTimeListing(insertTeeTimeListing: InsertTeeTimeListing): Promise<TeeTimeListing> {
    const [teeTime] = await db.insert(teeTimeListing).values({
      ...insertTeeTimeListing,
      createdAt: new Date(),
      status: 'available'
    }).returning();
    return teeTime;
  }

  async updateTeeTimeListing(id: number, teeTimeListingData: Partial<TeeTimeListing>): Promise<TeeTimeListing | undefined> {
    // Ensure we're not trying to set updatedAt since it doesn't exist in database schema
    const { updatedAt, ...validData } = teeTimeListingData as any;
    
    const [updatedTeeTime] = await db.update(teeTimeListing)
      .set(validData)
      .where(eq(teeTimeListing.id, id))
      .returning();
    return updatedTeeTime;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getBookingsByGuestId(guestId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.guestId, guestId));
  }

  async getBookingsByTeeTimeId(teeTimeId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.teeTimeId, teeTimeId));
  }
  
  async getBookingsByPaymentIntent(paymentIntentId: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.stripePaymentIntentId, paymentIntentId));
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values({
      ...insertBooking,
      createdAt: new Date(),
      status: 'pending'
    }).returning();
    return booking;
  }

  async updateBooking(id: number, bookingData: Partial<Booking>): Promise<Booking | undefined> {
    const [updatedBooking] = await db.update(bookings)
      .set(bookingData)
      .where(eq(bookings.id, id))
      .returning();
    return updatedBooking;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const [updatedBooking] = await db.update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    return updatedBooking;
  }

  async getReview(id: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }

  async getReviewsByTargetId(targetId: number, targetType: string): Promise<Review[]> {
    return await db.select().from(reviews)
      .where(and(
        eq(reviews.targetId, targetId),
        eq(reviews.targetType, targetType)
      ));
  }

  async getReviewsByReviewerId(reviewerId: number): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.reviewerId, reviewerId));
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values({
      ...insertReview,
      createdAt: new Date()
    }).returning();
    return review;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessagesByBookingId(bookingId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.bookingId, bookingId));
  }

  async getConversation(userOneId: number, userTwoId: number): Promise<Message[]> {
    return await db.select().from(messages)
      .where(
        or(
          and(
            eq(messages.senderId, userOneId),
            eq(messages.receiverId, userTwoId)
          ),
          and(
            eq(messages.senderId, userTwoId),
            eq(messages.receiverId, userOneId)
          )
        )
      )
      .orderBy(desc(messages.createdAt));
  }
  
  async getUserMessages(userId: number): Promise<Message[]> {
    return await db.select().from(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      )
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values({
      ...insertMessage,
      createdAt: new Date(),
      isRead: false
    }).returning();
    return message;
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const [updatedMessage] = await db.update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id))
      .returning();
    return updatedMessage;
  }

  // Notification operations
  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationsByUserId(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values({
      ...insertNotification,
      createdAt: new Date()
    }).returning();
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [updatedNotification] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updatedNotification;
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }
  
  // Reminder operations
  // Pending booking operations
  async getPendingBookingsOlderThan(minutes: number): Promise<Booking[]> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    
    return db.select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, 'pending'),
          lte(bookings.createdAt, cutoffTime)
        )
      )
      .execute();
  }
  
  async getRemindersToSend(reminderType: 'one_week' | 'one_day', currentDate: Date): Promise<Booking[]> {
    const field = reminderType === 'one_week' 
      ? bookings.reminderOneWeek 
      : bookings.reminderOneDay;
      
    const sentField = reminderType === 'one_week' 
      ? bookings.reminderOneWeekSent 
      : bookings.reminderOneDaySent;
    
    // Find bookings that have reminder time before now and haven't been sent yet
    return await db.select()
      .from(bookings)
      .where(
        and(
          lte(field, currentDate),
          eq(sentField, false),
          eq(bookings.status, 'confirmed')
        )
      );
  }
}