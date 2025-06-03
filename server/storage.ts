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
} from "@shared/schema";

import session from "express-session";

// Storage interface for all our models
export interface IStorage {
  // Session store
  sessionStore: any;
  
  // User operations (now using Profile types)
  getUser(id: string): Promise<Profile | undefined>;
  getUserByUsername(username: string): Promise<Profile | undefined>;
  getUserByEmail(email: string): Promise<Profile | undefined>;
  getUserByResetToken(resetToken: string): Promise<Profile | undefined>;
  getUserByGoogleId(googleId: string): Promise<Profile | undefined>;
  createUser(user: InsertProfile): Promise<Profile>;
  updateUser(id: string, user: Partial<Profile>): Promise<Profile | undefined>;
  updateUserStripeInfo(id: string, stripeInfo: { customerId: string, connectId?: string }): Promise<Profile | undefined>;
  upsertUser(user: UpsertProfile & { id: string }): Promise<Profile>;
  
  // Club operations
  getClub(id: number): Promise<Club | undefined>;
  getClubs(): Promise<Club[]>;
  createClub(club: InsertClub): Promise<Club>;
  
  // UserClub operations (user IDs are now UUIDs)
  getUserClubs(userId: string): Promise<UserClub[]>;
  addUserToClub(userClub: InsertUserClub): Promise<UserClub>;
  
  // TeeTimeListing operations (host IDs are now UUIDs)
  getTeeTimeListing(id: number): Promise<TeeTimeListing | undefined>;
  getTeeTimeListingsByHostId(hostId: string): Promise<TeeTimeListing[]>;
  getTeeTimeListingsByClubId(clubId: number): Promise<TeeTimeListing[]>;
  getAvailableTeeTimeListings(): Promise<TeeTimeListing[]>;
  createTeeTimeListing(teeTimeListing: InsertTeeTimeListing): Promise<TeeTimeListing>;
  updateTeeTimeListing(id: number, teeTimeListing: Partial<TeeTimeListing>): Promise<TeeTimeListing | undefined>;
  
  // Booking operations (guest IDs are now UUIDs)
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByGuestId(guestId: string): Promise<Booking[]>;
  getBookingsByTeeTimeId(teeTimeId: number): Promise<Booking[]>;
  getBookingsByPaymentIntent(paymentIntentId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<Booking>): Promise<Booking | undefined>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  
  // Review operations (reviewer IDs are now UUIDs)
  getReview(id: number): Promise<Review | undefined>;
  getReviewsByTargetId(targetId: string, targetType: string): Promise<Review[]>;
  getReviewsByReviewerId(reviewerId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  
  // Message operations (user IDs are now UUIDs)
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByBookingId(bookingId: number): Promise<Message[]>;
  getConversation(userOneId: string, userTwoId: string): Promise<Message[]>;
  getUserMessages(userId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
  
  // Notification operations (user IDs are now UUIDs)
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUserId(userId: string): Promise<Notification[]>;
  getUnreadNotificationsByUserId(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  
  // Reminder operations
  getRemindersToSend(reminderType: 'one_week' | 'one_day', currentDate: Date): Promise<Booking[]>;
  
  // Pending booking operations
  getPendingBookingsOlderThan(minutes: number): Promise<Booking[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, Profile>;
  private clubs: Map<number, Club>;
  private userClubs: Map<number, UserClub>;
  private teeTimeListings: Map<number, TeeTimeListing>;
  private bookings: Map<number, Booking>;
  private reviews: Map<number, Review>;
  private messages: Map<number, Message>;
  private notifications: Map<number, Notification>;
  
  sessionStore: any;
  
  private userCurrentId: number;
  private clubCurrentId: number;
  private userClubCurrentId: number;
  private teeTimeListingCurrentId: number;
  private bookingCurrentId: number;
  private reviewCurrentId: number;
  private messageCurrentId: number;
  private notificationCurrentId: number;

  constructor() {
    const MemoryStore = require('memorystore')(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    this.users = new Map();
    this.clubs = new Map();
    this.userClubs = new Map();
    this.teeTimeListings = new Map();
    this.bookings = new Map();
    this.reviews = new Map();
    this.messages = new Map();
    this.notifications = new Map();
    
    this.userCurrentId = 1;
    this.clubCurrentId = 1;
    this.userClubCurrentId = 1;
    this.teeTimeListingCurrentId = 1;
    this.bookingCurrentId = 1;
    this.reviewCurrentId = 1;
    this.messageCurrentId = 1;
    this.notificationCurrentId = 1;
  }

  // User operations
  async getUser(id: number): Promise<Profile | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<Profile | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<Profile | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  async getUserByGoogleId(googleId: string): Promise<Profile | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }
  
  async getUserByResetToken(resetToken: string): Promise<Profile | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.resetToken === resetToken,
    );
  }

  async createUser(insertUser: InsertProfile): Promise<Profile> {
    const id = this.userCurrentId++;
    const user: Profile = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<Profile>): Promise<Profile | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserStripeInfo(id: number, stripeInfo: { customerId: string, connectId?: string }): Promise<Profile | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user, 
      stripeCustomerId: stripeInfo.customerId,
      ...(stripeInfo.connectId ? { stripeConnectId: stripeInfo.connectId } : {})
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async upsertUser(upsertUser: UpsertProfile & { id: string }): Promise<Profile> {
    const id = typeof upsertUser.id === 'string' ? upsertUser.id : upsertUser.id.toString();
    const existingUser = Array.from(this.users.values()).find(u => u.id === id);
    
    if (existingUser) {
      // Update existing user
      const updatedUser = { 
        ...existingUser,
        ...upsertUser,
        updatedAt: new Date()
      };
      this.users.set(updatedUser.id, updatedUser);
      return updatedUser;
    } else {
      // Create new user
      const newUser: Profile = {
        ...upsertUser,
        isHost: upsertUser.isHost || false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.users.set(newUser.id, newUser);
      return newUser;
    }
  }

  // Club operations
  async getClub(id: number): Promise<Club | undefined> {
    return this.clubs.get(id);
  }

  async getClubs(): Promise<Club[]> {
    return Array.from(this.clubs.values());
  }

  async createClub(insertClub: InsertClub): Promise<Club> {
    const id = this.clubCurrentId++;
    const club: Club = { ...insertClub, id, createdAt: new Date() };
    this.clubs.set(id, club);
    return club;
  }

  // UserClub operations
  async getUserClubs(userId: string): Promise<UserClub[]> {
    return Array.from(this.userClubs.values()).filter(
      (userClub) => userClub.userId === userId,
    );
  }

  async addUserToClub(insertUserClub: InsertUserClub): Promise<UserClub> {
    const id = this.userClubCurrentId++;
    const userClub: UserClub = { ...insertUserClub, id };
    this.userClubs.set(id, userClub);
    return userClub;
  }

  // TeeTimeListing operations
  async getTeeTimeListing(id: number): Promise<TeeTimeListing | undefined> {
    return this.teeTimeListings.get(id);
  }

  async getTeeTimeListingsByHostId(hostId: string): Promise<TeeTimeListing[]> {
    return Array.from(this.teeTimeListings.values()).filter(
      (teeTimeListing) => teeTimeListing.hostId === hostId,
    );
  }

  async getTeeTimeListingsByClubId(clubId: number): Promise<TeeTimeListing[]> {
    return Array.from(this.teeTimeListings.values()).filter(
      (teeTimeListing) => teeTimeListing.clubId === clubId,
    );
  }

  async getAvailableTeeTimeListings(): Promise<TeeTimeListing[]> {
    return Array.from(this.teeTimeListings.values()).filter(
      (teeTimeListing) => teeTimeListing.status === "available",
    );
  }

  async createTeeTimeListing(insertTeeTimeListing: InsertTeeTimeListing): Promise<TeeTimeListing> {
    const id = this.teeTimeListingCurrentId++;
    const teeTimeListing: TeeTimeListing = { 
      ...insertTeeTimeListing, 
      id, 
      status: "available", 
      createdAt: new Date() 
    };
    this.teeTimeListings.set(id, teeTimeListing);
    return teeTimeListing;
  }

  async updateTeeTimeListing(id: number, teeTimeListingData: Partial<TeeTimeListing>): Promise<TeeTimeListing | undefined> {
    const teeTimeListing = this.teeTimeListings.get(id);
    if (!teeTimeListing) return undefined;
    
    const updatedTeeTimeListing = { ...teeTimeListing, ...teeTimeListingData };
    this.teeTimeListings.set(id, updatedTeeTimeListing);
    return updatedTeeTimeListing;
  }

  // Booking operations
  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByGuestId(guestId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.guestId === guestId,
    );
  }

  async getBookingsByTeeTimeId(teeTimeId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.teeTimeId === teeTimeId,
    );
  }
  
  async getBookingsByPaymentIntent(paymentIntentId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.stripePaymentIntentId === paymentIntentId,
    );
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.bookingCurrentId++;
    const booking: Booking = { 
      ...insertBooking, 
      id, 
      status: "pending", 
      createdAt: new Date() 
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBooking(id: number, bookingData: Partial<Booking>): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = { ...booking, ...bookingData };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = { 
      ...booking, 
      status,
      ...(status === "completed" ? { completedAt: new Date() } : {})
    };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  // Review operations
  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
  }

  async getReviewsByTargetId(targetId: string, targetType: string): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(
      (review) => review.targetId === targetId && review.targetType === targetType,
    );
  }

  async getReviewsByReviewerId(reviewerId: string): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(
      (review) => review.reviewerId === reviewerId,
    );
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = this.reviewCurrentId++;
    const review: Review = { ...insertReview, id, createdAt: new Date() };
    this.reviews.set(id, review);
    return review;
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByBookingId(bookingId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.bookingId === bookingId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getConversation(userOneId: string, userTwoId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => 
        (message.senderId === userOneId && message.receiverId === userTwoId) ||
        (message.senderId === userTwoId && message.receiverId === userOneId)
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  async getUserMessages(userId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => 
        message.senderId === userId || message.receiverId === userId
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // newest first
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageCurrentId++;
    const message: Message = { 
      ...insertMessage, 
      id, 
      isRead: false, 
      createdAt: new Date() 
    };
    this.messages.set(id, message);
    return message;
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, isRead: true };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }

  // Notification operations
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // newest first
  }

  async getUnreadNotificationsByUserId(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // newest first
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.notificationCurrentId++;
    const notification: Notification = {
      ...insertNotification,
      id,
      createdAt: new Date()
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updatedNotification = { ...notification, isRead: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const userNotifications = await this.getNotificationsByUserId(userId);
    
    for (const notification of userNotifications) {
      if (!notification.isRead) {
        this.notifications.set(notification.id, { ...notification, isRead: true });
      }
    }
  }
  
  // Reminder operations
  async getRemindersToSend(reminderType: 'one_week' | 'one_day', currentDate: Date): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => {
      const reminderDate = reminderType === 'one_week' ? booking.reminderOneWeek : booking.reminderOneDay;
      const reminderSent = reminderType === 'one_week' ? booking.reminderOneWeekSent : booking.reminderOneDaySent;
      
      return booking.status === 'confirmed' && 
             reminderDate instanceof Date && 
             reminderDate <= currentDate && 
             !reminderSent;
    });
  }
  
  // Pending booking operations
  async getPendingBookingsOlderThan(minutes: number): Promise<Booking[]> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    
    return Array.from(this.bookings.values()).filter(booking => {
      return (
        booking.status === 'pending' && 
        booking.createdAt instanceof Date &&
        booking.createdAt < cutoffTime
      );
    });
  }
}

import { DatabaseStorage } from './database-storage';
export const storage = new DatabaseStorage();
