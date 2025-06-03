import { db } from './db';
import { eq, and, or, desc, lte } from 'drizzle-orm';
import { 
  Profile, InsertProfile, UpsertProfile,
  Club, InsertClub, 
  UserClub, InsertUserClub,
  TeeTimeListing, InsertTeeTimeListing,
  Booking, InsertBooking,
  Review, InsertReview,
  Message, InsertMessage,
  Notification, InsertNotification,
  profiles, clubs, userClubs, teeTimeListing, bookings, reviews, messages, notifications
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

  async getUser(id: string): Promise<Profile | undefined> {
    const [user] = await db.select().from(profiles).where(eq(profiles.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<Profile | undefined> {
    const [user] = await db.select().from(profiles).where(eq(profiles.username, username));
    return user;
  }

  // Email lookup - not available in profiles table (handled by Supabase Auth)
  async getUserByEmail(email: string): Promise<Profile | undefined> {
    // Email is handled by Supabase Auth, not stored in profiles
    // This method should not be used with the new schema
    throw new Error('Email lookup should be handled by Supabase Auth, not profiles table');
  }
  
  // Google ID lookup - not available in profiles table (handled by Supabase Auth)
  async getUserByGoogleId(googleId: string): Promise<Profile | undefined> {
    // Google ID is handled by Supabase Auth, not stored in profiles
    throw new Error('Google ID lookup should be handled by Supabase Auth, not profiles table');
  }
  
  // Reset token lookup - not available in profiles table (handled by Supabase Auth)
  async getUserByResetToken(resetToken: string): Promise<Profile | undefined> {
    // Reset tokens are handled by Supabase Auth, not stored in profiles
    throw new Error('Reset token lookup should be handled by Supabase Auth, not profiles table');
  }

  async createUser(insertUser: InsertProfile): Promise<Profile> {
    const [user] = await db.insert(profiles).values({
      ...insertUser,
      createdAt: new Date()
    }).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<Profile>): Promise<Profile | undefined> {
    // Add updatedAt to force a cache refresh
    const updateData = {
      ...userData,
      updatedAt: new Date()
    };
    
    console.log(`Updating user ${id} with data:`, updateData);
    
    try {
      const [updatedUser] = await db.update(profiles)
        .set(updateData)
        .where(eq(profiles.id, id))
        .returning();
      
      console.log(`Updated user ${id} successfully:`, updatedUser);
      return updatedUser;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  async updateUserStripeInfo(id: string, stripeInfo: { customerId: string, connectId?: string }): Promise<Profile | undefined> {
    const updateData: any = { 
      stripeCustomerId: stripeInfo.customerId,
      updatedAt: new Date()
    };
    
    if (stripeInfo.connectId) {
      updateData.stripeConnectId = stripeInfo.connectId;
    }
    
    console.log(`Updating Stripe info for user ${id}:`, updateData);
    
    try {
      const [updatedUser] = await db.update(profiles)
        .set(updateData)
        .where(eq(profiles.id, id))
        .returning();
      
      console.log(`Updated Stripe info for user ${id} successfully:`, updatedUser);
      return updatedUser;
    } catch (error) {
      console.error(`Error updating Stripe info for user ${id}:`, error);
      throw error;
    }
  }
  
  async upsertUser(upsertUser: UpsertProfile & { id: string }): Promise<Profile> {
    const userId = upsertUser.id;
    
    try {
      // Try to update the existing user
      const [updatedUser] = await db
        .update(profiles)
        .set({
          ...upsertUser,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, userId))
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
      .insert(profiles)
      .values({
        ...upsertUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: profiles.id,
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

  async getUserClubs(userId: string): Promise<UserClub[]> {
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

  async getTeeTimeListingsByHostId(hostId: string): Promise<TeeTimeListing[]> {
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

  async getBookingsByGuestId(guestId: string): Promise<Booking[]> {
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

  async getReviewsByTargetId(targetId: string, targetType: string): Promise<Review[]> {
    return await db.select().from(reviews)
      .where(and(
        eq(reviews.targetId, targetId),
        eq(reviews.targetType, targetType)
      ));
  }

  async getReviewsByReviewerId(reviewerId: string): Promise<Review[]> {
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

  async getConversation(userOneId: string, userTwoId: string): Promise<Message[]> {
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
  
  async getUserMessages(userId: string): Promise<Message[]> {
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

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationsByUserId(userId: string): Promise<Notification[]> {
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

  async markAllNotificationsAsRead(userId: string): Promise<void> {
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