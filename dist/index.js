var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  bookings: () => bookings,
  clubs: () => clubs,
  insertBookingSchema: () => insertBookingSchema,
  insertClubSchema: () => insertClubSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertProfileSchema: () => insertProfileSchema,
  insertReviewSchema: () => insertReviewSchema,
  insertTeeTimeListingSchema: () => insertTeeTimeListingSchema,
  insertUserClubSchema: () => insertUserClubSchema,
  messages: () => messages,
  notifications: () => notifications,
  profiles: () => profiles,
  reviews: () => reviews,
  sessions: () => sessions,
  teeTimeListing: () => teeTimeListing,
  upsertProfileSchema: () => upsertProfileSchema,
  userClubs: () => userClubs
});
import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb, varchar, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var sessions, profiles, insertProfileSchema, upsertProfileSchema, clubs, insertClubSchema, userClubs, insertUserClubSchema, teeTimeListing, insertTeeTimeListingSchema, bookings, insertBookingSchema, reviews, insertReviewSchema, messages, insertMessageSchema, notifications, insertNotificationSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    sessions = pgTable(
      "sessions",
      {
        sid: varchar("sid").primaryKey(),
        sess: jsonb("sess").notNull(),
        expire: timestamp("expire").notNull()
      },
      (table) => [index("IDX_session_expire").on(table.expire)]
    );
    profiles = pgTable("profiles", {
      id: uuid("id").primaryKey(),
      // Set by trigger to match auth.users(id)
      username: text("username").unique(),
      // App-specific username
      firstName: text("first_name"),
      lastName: text("last_name"),
      bio: text("bio"),
      profileImage: text("profile_image"),
      profileImageUrl: text("profile_image_url"),
      isHost: boolean("is_host").default(false),
      stripeCustomerId: text("stripe_customer_id"),
      stripeConnectId: text("stripe_connect_id"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      onboardingCompleted: boolean("onboarding_completed").default(false)
    });
    insertProfileSchema = createInsertSchema(profiles).pick({
      id: true,
      // Required: the auth user UUID
      firstName: true,
      lastName: true,
      isHost: true,
      profileImage: true,
      profileImageUrl: true,
      username: true,
      onboardingCompleted: true
    }).extend({
      // Mark fields as optional for manual profile creation
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      profileImage: z.string().optional(),
      profileImageUrl: z.string().optional(),
      username: z.string().optional(),
      isHost: z.boolean().optional(),
      onboardingCompleted: z.boolean().optional()
    });
    upsertProfileSchema = createInsertSchema(profiles).pick({
      username: true,
      firstName: true,
      lastName: true,
      bio: true,
      profileImage: true,
      profileImageUrl: true,
      isHost: true,
      onboardingCompleted: true
    }).extend({
      // All fields optional for updates
      username: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      bio: z.string().optional(),
      profileImage: z.string().optional(),
      profileImageUrl: z.string().optional(),
      isHost: z.boolean().optional(),
      onboardingCompleted: z.boolean().optional()
    });
    clubs = pgTable("clubs", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      location: text("location").notNull(),
      description: text("description"),
      imageUrl: text("image_url"),
      createdAt: timestamp("created_at").defaultNow()
    });
    insertClubSchema = createInsertSchema(clubs).pick({
      name: true,
      location: true,
      description: true,
      imageUrl: true
    });
    userClubs = pgTable("user_clubs", {
      id: serial("id").primaryKey(),
      userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      clubId: integer("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
      memberSince: timestamp("member_since").defaultNow()
    });
    insertUserClubSchema = createInsertSchema(userClubs).pick({
      userId: true,
      clubId: true,
      memberSince: true
    });
    teeTimeListing = pgTable("tee_time_listings", {
      id: serial("id").primaryKey(),
      hostId: uuid("host_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      clubId: integer("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
      date: timestamp("date").notNull(),
      price: doublePrecision("price").notNull(),
      createdAt: timestamp("created_at").defaultNow(),
      playersAllowed: integer("players_allowed").notNull().default(4),
      notes: text("notes"),
      status: text("status").notNull().default("available")
      // available, pending, booked, cancelled
    });
    insertTeeTimeListingSchema = createInsertSchema(teeTimeListing).pick({
      hostId: true,
      clubId: true,
      date: true,
      price: true,
      playersAllowed: true,
      notes: true,
      status: true
    }).extend({
      notes: z.string().optional(),
      status: z.string().optional().default("available")
    }).transform((data) => ({
      ...data,
      date: data.date instanceof Date ? data.date : new Date(data.date)
    }));
    bookings = pgTable("bookings", {
      id: serial("id").primaryKey(),
      teeTimeId: integer("tee_time_id").notNull().references(() => teeTimeListing.id, { onDelete: "cascade" }),
      guestId: uuid("guest_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      numberOfPlayers: integer("number_of_players").notNull(),
      status: text("status").notNull().default("pending"),
      // pending, confirmed, completed, cancelled
      stripePaymentIntentId: text("stripe_payment_intent_id"),
      createdAt: timestamp("created_at").defaultNow(),
      completedAt: timestamp("completed_at"),
      totalPrice: doublePrecision("total_price").notNull(),
      // Reminder fields
      reminderOneWeek: timestamp("reminder_one_week"),
      reminderOneDay: timestamp("reminder_one_day"),
      reminderOneWeekSent: boolean("reminder_one_week_sent").default(false),
      reminderOneDaySent: boolean("reminder_one_day_sent").default(false)
    });
    insertBookingSchema = createInsertSchema(bookings).pick({
      teeTimeId: true,
      guestId: true,
      numberOfPlayers: true,
      totalPrice: true,
      status: true,
      stripePaymentIntentId: true
    }).extend({
      status: z.string().optional().default("pending"),
      stripePaymentIntentId: z.string().optional()
    });
    reviews = pgTable("reviews", {
      id: serial("id").primaryKey(),
      reviewerId: uuid("reviewer_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      targetId: text("target_id").notNull(),
      // Can be profile UUID or club integer ID (as text)
      targetType: text("target_type").notNull(),
      // "host", "guest", "club"
      bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
      rating: integer("rating").notNull(),
      comment: text("comment"),
      createdAt: timestamp("created_at").defaultNow()
    });
    insertReviewSchema = createInsertSchema(reviews).pick({
      reviewerId: true,
      targetId: true,
      targetType: true,
      bookingId: true,
      rating: true,
      comment: true
    }).extend({
      comment: z.string().optional(),
      bookingId: z.number().optional()
    });
    messages = pgTable("messages", {
      id: serial("id").primaryKey(),
      senderId: uuid("sender_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      receiverId: uuid("receiver_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
      content: text("content").notNull(),
      isRead: boolean("is_read").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    insertMessageSchema = createInsertSchema(messages).pick({
      senderId: true,
      receiverId: true,
      bookingId: true,
      content: true
    }).extend({
      bookingId: z.number().optional()
    });
    notifications = pgTable("notifications", {
      id: serial("id").primaryKey(),
      userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      title: text("title").notNull(),
      message: text("message").notNull(),
      type: text("type").notNull(),
      // "booking", "message", "system"
      relatedId: integer("related_id").notNull(),
      // ID of the related entity (booking, message, etc.)
      isRead: boolean("is_read").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    insertNotificationSchema = createInsertSchema(notifications).pick({
      userId: true,
      title: true,
      message: true,
      type: true,
      relatedId: true,
      isRead: true
    }).extend({
      isRead: z.boolean().optional().default(false)
    });
  }
});

// backend/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var pool, db;
var init_db = __esm({
  "backend/db.ts"() {
    "use strict";
    init_schema();
    pool = null;
    db = null;
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        // Supabase specific configuration
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
        // Connection pool settings
        max: 20,
        // Maximum number of clients in the pool
        idleTimeoutMillis: 3e4,
        // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2e3
        // Return an error after 2 seconds if connection could not be established
      });
      db = drizzle(pool, { schema: schema_exports });
      pool.on("error", (err) => {
        console.error("Unexpected error on idle client", err);
        process.exit(-1);
      });
      console.log("\u2705 Database connected to Supabase");
    } else {
      console.warn(
        "DATABASE_URL is not set. Database functionality will be disabled. This is for UI testing only."
      );
    }
    process.on("SIGINT", async () => {
      if (pool) {
        console.log("Closing database pool...");
        await pool.end();
      }
      process.exit(0);
    });
  }
});

// backend/database-storage.ts
import { eq, and, or, desc, lte } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
var PostgresSessionStore, DatabaseStorage;
var init_database_storage = __esm({
  "backend/database-storage.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_db();
    PostgresSessionStore = connectPg(session);
    DatabaseStorage = class {
      sessionStore;
      constructor() {
        this.sessionStore = new PostgresSessionStore({
          pool,
          createTableIfMissing: true
        });
      }
      async getUser(id) {
        const [user] = await db.select().from(profiles).where(eq(profiles.id, id));
        return user;
      }
      async getUserByUsername(username) {
        const [user] = await db.select().from(profiles).where(eq(profiles.username, username));
        return user;
      }
      // Email lookup - not available in profiles table (handled by Supabase Auth)
      async getUserByEmail(email) {
        throw new Error("Email lookup should be handled by Supabase Auth, not profiles table");
      }
      // Google ID lookup - not available in profiles table (handled by Supabase Auth)
      async getUserByGoogleId(googleId) {
        throw new Error("Google ID lookup should be handled by Supabase Auth, not profiles table");
      }
      // Reset token lookup - not available in profiles table (handled by Supabase Auth)
      async getUserByResetToken(resetToken) {
        throw new Error("Reset token lookup should be handled by Supabase Auth, not profiles table");
      }
      async createUser(insertUser) {
        const [user] = await db.insert(profiles).values({
          ...insertUser,
          createdAt: /* @__PURE__ */ new Date()
        }).returning();
        return user;
      }
      async updateUser(id, userData) {
        const updateData = {
          ...userData,
          updatedAt: /* @__PURE__ */ new Date()
        };
        console.log(`Updating user ${id} with data:`, updateData);
        try {
          const [updatedUser] = await db.update(profiles).set(updateData).where(eq(profiles.id, id)).returning();
          console.log(`Updated user ${id} successfully:`, updatedUser);
          return updatedUser;
        } catch (error) {
          console.error(`Error updating user ${id}:`, error);
          throw error;
        }
      }
      async updateUserStripeInfo(id, stripeInfo) {
        const updateData = {
          stripeCustomerId: stripeInfo.customerId,
          updatedAt: /* @__PURE__ */ new Date()
        };
        if (stripeInfo.connectId) {
          updateData.stripeConnectId = stripeInfo.connectId;
        }
        console.log(`Updating Stripe info for user ${id}:`, updateData);
        try {
          const [updatedUser] = await db.update(profiles).set(updateData).where(eq(profiles.id, id)).returning();
          console.log(`Updated Stripe info for user ${id} successfully:`, updatedUser);
          return updatedUser;
        } catch (error) {
          console.error(`Error updating Stripe info for user ${id}:`, error);
          throw error;
        }
      }
      async upsertUser(upsertUser) {
        const userId = upsertUser.id;
        try {
          const [updatedUser] = await db.update(profiles).set({
            ...upsertUser,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq(profiles.id, userId)).returning();
          if (updatedUser) {
            return updatedUser;
          }
        } catch (error) {
          console.log("Error updating user:", error);
        }
        const [newUser] = await db.insert(profiles).values({
          ...upsertUser,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).onConflictDoUpdate({
          target: profiles.id,
          set: {
            ...upsertUser,
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).returning();
        return newUser;
      }
      async getClub(id) {
        const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
        return club;
      }
      async getClubs() {
        return await db.select().from(clubs);
      }
      async createClub(insertClub) {
        const [club] = await db.insert(clubs).values({
          ...insertClub,
          createdAt: /* @__PURE__ */ new Date()
        }).returning();
        return club;
      }
      async getUserClubs(userId) {
        return await db.select().from(userClubs).where(eq(userClubs.userId, userId));
      }
      async addUserToClub(insertUserClub) {
        const [userClub] = await db.insert(userClubs).values(insertUserClub).returning();
        return userClub;
      }
      async getTeeTimeListing(id) {
        const [teeTime] = await db.select().from(teeTimeListing).where(eq(teeTimeListing.id, id));
        return teeTime;
      }
      async getTeeTimeListingsByHostId(hostId) {
        return await db.select().from(teeTimeListing).where(eq(teeTimeListing.hostId, hostId));
      }
      async getTeeTimeListingsByClubId(clubId) {
        return await db.select().from(teeTimeListing).where(eq(teeTimeListing.clubId, clubId));
      }
      async getAvailableTeeTimeListings() {
        return await db.select().from(teeTimeListing).where(eq(teeTimeListing.status, "available"));
      }
      async createTeeTimeListing(insertTeeTimeListing) {
        const [teeTime] = await db.insert(teeTimeListing).values({
          ...insertTeeTimeListing,
          createdAt: /* @__PURE__ */ new Date(),
          status: "available"
        }).returning();
        return teeTime;
      }
      async updateTeeTimeListing(id, teeTimeListingData) {
        const { updatedAt, ...validData } = teeTimeListingData;
        const [updatedTeeTime] = await db.update(teeTimeListing).set(validData).where(eq(teeTimeListing.id, id)).returning();
        return updatedTeeTime;
      }
      async getBooking(id) {
        const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
        return booking;
      }
      async getBookingsByGuestId(guestId) {
        return await db.select().from(bookings).where(eq(bookings.guestId, guestId));
      }
      async getBookingsByTeeTimeId(teeTimeId) {
        return await db.select().from(bookings).where(eq(bookings.teeTimeId, teeTimeId));
      }
      async getBookingsByPaymentIntent(paymentIntentId) {
        return await db.select().from(bookings).where(eq(bookings.stripePaymentIntentId, paymentIntentId));
      }
      async createBooking(insertBooking) {
        const [booking] = await db.insert(bookings).values({
          ...insertBooking,
          createdAt: /* @__PURE__ */ new Date(),
          status: "pending"
        }).returning();
        return booking;
      }
      async updateBooking(id, bookingData) {
        const [updatedBooking] = await db.update(bookings).set(bookingData).where(eq(bookings.id, id)).returning();
        return updatedBooking;
      }
      async updateBookingStatus(id, status) {
        const [updatedBooking] = await db.update(bookings).set({ status }).where(eq(bookings.id, id)).returning();
        return updatedBooking;
      }
      async getReview(id) {
        const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
        return review;
      }
      async getReviewsByTargetId(targetId, targetType) {
        return await db.select().from(reviews).where(and(
          eq(reviews.targetId, targetId),
          eq(reviews.targetType, targetType)
        ));
      }
      async getReviewsByReviewerId(reviewerId) {
        return await db.select().from(reviews).where(eq(reviews.reviewerId, reviewerId));
      }
      async createReview(insertReview) {
        const [review] = await db.insert(reviews).values({
          ...insertReview,
          createdAt: /* @__PURE__ */ new Date()
        }).returning();
        return review;
      }
      async getMessage(id) {
        const [message] = await db.select().from(messages).where(eq(messages.id, id));
        return message;
      }
      async getMessagesByBookingId(bookingId) {
        return await db.select().from(messages).where(eq(messages.bookingId, bookingId));
      }
      async getConversation(userOneId, userTwoId) {
        return await db.select().from(messages).where(
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
        ).orderBy(desc(messages.createdAt));
      }
      async getUserMessages(userId) {
        return await db.select().from(messages).where(
          or(
            eq(messages.senderId, userId),
            eq(messages.receiverId, userId)
          )
        ).orderBy(desc(messages.createdAt));
      }
      async createMessage(insertMessage) {
        const [message] = await db.insert(messages).values({
          ...insertMessage,
          createdAt: /* @__PURE__ */ new Date(),
          isRead: false
        }).returning();
        return message;
      }
      async markMessageAsRead(id) {
        const [updatedMessage] = await db.update(messages).set({ isRead: true }).where(eq(messages.id, id)).returning();
        return updatedMessage;
      }
      // Notification operations
      async getNotification(id) {
        const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
        return notification;
      }
      async getNotificationsByUserId(userId) {
        return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
      }
      async getUnreadNotificationsByUserId(userId) {
        return await db.select().from(notifications).where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )).orderBy(desc(notifications.createdAt));
      }
      async createNotification(insertNotification) {
        const [notification] = await db.insert(notifications).values({
          ...insertNotification,
          createdAt: /* @__PURE__ */ new Date()
        }).returning();
        return notification;
      }
      async markNotificationAsRead(id) {
        const [updatedNotification] = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).returning();
        return updatedNotification;
      }
      async markAllNotificationsAsRead(userId) {
        await db.update(notifications).set({ isRead: true }).where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
      }
      // Reminder operations
      // Pending booking operations
      async getPendingBookingsOlderThan(minutes) {
        const cutoffTime = new Date(Date.now() - minutes * 60 * 1e3);
        return db.select().from(bookings).where(
          and(
            eq(bookings.status, "pending"),
            lte(bookings.createdAt, cutoffTime)
          )
        ).execute();
      }
      async getRemindersToSend(reminderType, currentDate) {
        const field = reminderType === "one_week" ? bookings.reminderOneWeek : bookings.reminderOneDay;
        const sentField = reminderType === "one_week" ? bookings.reminderOneWeekSent : bookings.reminderOneDaySent;
        return await db.select().from(bookings).where(
          and(
            lte(field, currentDate),
            eq(sentField, false),
            eq(bookings.status, "confirmed")
          )
        );
      }
    };
  }
});

// backend/storage.ts
import session2 from "express-session";
var storage;
var init_storage = __esm({
  "backend/storage.ts"() {
    "use strict";
    init_database_storage();
    storage = new DatabaseStorage();
  }
});

// backend/notifications/email.ts
import sgMail from "@sendgrid/mail";
async function sendEmail(params) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not found, email notification not sent");
    return false;
  }
  try {
    await sgMail.send({
      to: params.to,
      from: "noreply@linxgolfapp.com",
      subject: params.subject,
      text: params.text || "",
      // Provide fallback empty string
      html: params.html || ""
      // Provide fallback empty string
    });
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}
async function sendBookingConfirmation(user, bookingId, teeTimeListing2) {
  const subject = "Your Tee Time Booking is Confirmed";
  const date = new Date(teeTimeListing2.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });
  const text2 = `
    Hello ${user.firstName},

    Your tee time booking at ${teeTimeListing2.club} has been confirmed!

    Booking details:
    - Date: ${formattedDate}
    - Time: ${formattedTime}
    - Number of Players: ${teeTimeListing2.numberOfPlayers}
    - Total Price: $${teeTimeListing2.price.toFixed(2)}

    You can view your booking details and communicate with the host by visiting your account dashboard.

    Thank you for using Linx!
    
    The Linx Team
  `;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #205A50; padding: 20px; text-align: center; color: white;">
        <h1>Booking Confirmation</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${user.firstName},</p>
        
        <p>Your tee time booking at <strong>${teeTimeListing2.club}</strong> has been confirmed!</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #205A50; margin-top: 0;">Booking Details</h2>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Number of Players:</strong> ${teeTimeListing2.numberOfPlayers}</p>
          <p><strong>Total Price:</strong> $${teeTimeListing2.price.toFixed(2)}</p>
        </div>
        
        <p>You can view your booking details and communicate with the host by visiting your account dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/bookings/${bookingId}" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Booking
          </a>
        </div>
        
        <p>Thank you for using Linx!</p>
        
        <p>The Linx Team</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>\xA9 2025 Linx Golf. All rights reserved.</p>
      </div>
    </div>
  `;
  return await sendEmail({
    to: user.email,
    subject,
    text: text2,
    html
  });
}
async function sendBookingStatusUpdate(user, bookingId, status, teeTimeListing2) {
  const statusDisplay = status.charAt(0).toUpperCase() + status.slice(1);
  const subject = `Your Tee Time Booking Has Been ${statusDisplay}`;
  const date = new Date(teeTimeListing2.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });
  let statusMessage = "";
  let statusColor = "#205A50";
  if (status === "completed") {
    statusMessage = "Thank you for playing! We hope you enjoyed your tee time.";
    statusColor = "#49DCB1";
  } else if (status === "cancelled") {
    statusMessage = "We're sorry to hear that. Please contact support if you have any questions.";
    statusColor = "#FF4D4F";
  } else if (status === "confirmed") {
    statusMessage = "Your booking has been confirmed. We look forward to seeing you!";
    statusColor = "#52C41A";
  }
  const text2 = `
    Hello ${user.firstName},

    Your tee time booking at ${teeTimeListing2.club} has been ${status}!
    
    ${statusMessage}

    Booking details:
    - Date: ${formattedDate}
    - Time: ${formattedTime}
    - Number of Players: ${teeTimeListing2.numberOfPlayers}
    - Total Price: $${teeTimeListing2.price.toFixed(2)}

    You can view your booking details by visiting your account dashboard.

    Thank you for using Linx!
    
    The Linx Team
  `;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${statusColor}; padding: 20px; text-align: center; color: white;">
        <h1>Booking ${statusDisplay}</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${user.firstName},</p>
        
        <p>Your tee time booking at <strong>${teeTimeListing2.club}</strong> has been <strong>${status}</strong>!</p>
        
        <p>${statusMessage}</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #205A50; margin-top: 0;">Booking Details</h2>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Number of Players:</strong> ${teeTimeListing2.numberOfPlayers}</p>
          <p><strong>Total Price:</strong> $${teeTimeListing2.price.toFixed(2)}</p>
        </div>
        
        <p>You can view your booking details by visiting your account dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/bookings/${bookingId}" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Booking
          </a>
        </div>
        
        <p>Thank you for using Linx!</p>
        
        <p>The Linx Team</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>\xA9 2025 Linx Golf. All rights reserved.</p>
      </div>
    </div>
  `;
  return await sendEmail({
    to: user.email,
    subject,
    text: text2,
    html
  });
}
async function sendHostPaymentConfirmation(user, bookingId, teeTimeListing2, amount) {
  if (!user.email) {
    console.error("Cannot send payment confirmation: User has no email address");
    return false;
  }
  const subject = `Payment Received: Your Tee Time Funds Released`;
  const firstName = user.firstName || user.username || "Host";
  const date = new Date(teeTimeListing2.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });
  const text2 = `
    Hello ${firstName},

    Good news! The funds for your tee time booking on ${formattedDate} have been released to your account.
    
    Booking details:
    - Club: ${teeTimeListing2.club?.name || "Your club"}
    - Date: ${formattedDate}
    - Time: ${formattedTime}
    - Number of Players: ${teeTimeListing2.numberOfPlayers}
    - Amount Received: $${amount.toFixed(2)}
    
    The funds should be reflected in your Stripe account within 1-2 business days.
    
    Thank you for hosting with Linx! We hope your guest had a great experience.
    
    The Linx Team
  `;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #49DCB1; padding: 20px; text-align: center; color: white;">
        <h1>Payment Received!</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>Good news! The funds for your tee time booking on <strong>${formattedDate}</strong> have been released to your account.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #205A50; margin-top: 0;">Payment Details</h2>
          <p><strong>Club:</strong> ${teeTimeListing2.club?.name || "Your club"}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Number of Players:</strong> ${teeTimeListing2.numberOfPlayers}</p>
          <p><strong>Amount Received:</strong> $${amount.toFixed(2)}</p>
        </div>
        
        <p>The funds should be reflected in your Stripe account within 1-2 business days.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/dashboard" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Dashboard
          </a>
        </div>
        
        <p>Thank you for hosting with Linx! We hope your guest had a great experience.</p>
        
        <p>The Linx Team</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>\xA9 2025 Linx Golf. All rights reserved.</p>
      </div>
    </div>
  `;
  return await sendEmail({
    to: user.email,
    subject,
    text: text2,
    html
  });
}
async function sendHostBookingNotification(user, bookingId, teeTimeListing2, guestName) {
  if (!user.email) {
    console.error("Cannot send host booking notification: User has no email address");
    return false;
  }
  const subject = `New Booking: Your Tee Time Has Been Reserved`;
  const firstName = user.firstName || user.username || "Host";
  const date = new Date(teeTimeListing2.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });
  const text2 = `
    Hello ${firstName},

    Great news! Your tee time listing has been booked by ${guestName}.
    
    Booking details:
    - Club: ${teeTimeListing2.club?.name || "Your club"}
    - Date: ${formattedDate}
    - Time: ${formattedTime}
    - Number of Players: ${teeTimeListing2.numberOfPlayers}
    - Total Price: $${teeTimeListing2.price.toFixed(2)}
    
    Please log in to your Linx account to view the booking details and communicate with your guest.
    
    Remember, funds will be held in escrow and released to you 24 hours after the scheduled tee time.
    
    Thank you for hosting with Linx!
    
    The Linx Team
  `;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #205A50; padding: 20px; text-align: center; color: white;">
        <h1>New Booking!</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>Great news! Your tee time listing has been booked by <strong>${guestName}</strong>.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #205A50; margin-top: 0;">Booking Details</h2>
          <p><strong>Club:</strong> ${teeTimeListing2.club?.name || "Your club"}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Number of Players:</strong> ${teeTimeListing2.numberOfPlayers}</p>
          <p><strong>Total Price:</strong> $${teeTimeListing2.price.toFixed(2)}</p>
        </div>
        
        <p>Please log in to your Linx account to view the booking details and communicate with your guest.</p>
        <p>Remember, funds will be held in escrow and released to you 24 hours after the scheduled tee time.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/dashboard" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Booking
          </a>
        </div>
        
        <p>Thank you for hosting with Linx!</p>
        
        <p>The Linx Team</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>\xA9 2025 Linx Golf. All rights reserved.</p>
      </div>
    </div>
  `;
  return await sendEmail({
    to: user.email,
    subject,
    text: text2,
    html
  });
}
async function sendOneWeekReminderEmail(user, bookingId, teeTimeListing2) {
  if (!user.email) {
    console.error("Cannot send one week reminder: User has no email address");
    return false;
  }
  const subject = `Your Tee Time is One Week Away`;
  const firstName = user.firstName || user.username || "Golfer";
  const date = new Date(teeTimeListing2.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });
  const text2 = `
    Hello ${firstName},

    This is a friendly reminder that your tee time is just one week away!
    
    Booking details:
    - Club: ${teeTimeListing2.club?.name || "Your club booking"}
    - Date: ${formattedDate}
    - Time: ${formattedTime}
    - Number of Players: ${teeTimeListing2.numberOfPlayers}
    
    If you need to communicate with your host or make any changes to your booking, please log in to your Linx account.
    
    We hope you're looking forward to your golf experience!
    
    The Linx Team
  `;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #205A50; padding: 20px; text-align: center; color: white;">
        <h1>One Week Until Your Tee Time!</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>This is a friendly reminder that your tee time is just <strong>one week away</strong>!</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #205A50; margin-top: 0;">Booking Details</h2>
          <p><strong>Club:</strong> ${teeTimeListing2.club?.name || "Your club booking"}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Number of Players:</strong> ${teeTimeListing2.numberOfPlayers}</p>
        </div>
        
        <p>If you need to communicate with your host or make any changes to your booking, please log in to your Linx account.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/bookings/${bookingId}" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Booking
          </a>
        </div>
        
        <p>We hope you're looking forward to your golf experience!</p>
        
        <p>The Linx Team</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>\xA9 2025 Linx Golf. All rights reserved.</p>
      </div>
    </div>
  `;
  return await sendEmail({
    to: user.email,
    subject,
    text: text2,
    html
  });
}
async function sendOneDayReminderEmail(user, bookingId, teeTimeListing2) {
  if (!user.email) {
    console.error("Cannot send one day reminder: User has no email address");
    return false;
  }
  const subject = `Your Tee Time is Tomorrow!`;
  const firstName = user.firstName || user.username || "Golfer";
  const date = new Date(teeTimeListing2.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });
  const text2 = `
    Hello ${firstName},

    Your tee time is tomorrow! Here's everything you need to know:
    
    Booking details:
    - Club: ${teeTimeListing2.club?.name || "Your club booking"}
    - Date: ${formattedDate}
    - Time: ${formattedTime}
    - Number of Players: ${teeTimeListing2.numberOfPlayers}
    
    Please arrive at least 15 minutes before your scheduled tee time to check in.
    
    If you need to contact your host, please log in to your Linx account and use the messaging feature.
    
    Enjoy your golf experience!
    
    The Linx Team
  `;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #205A50; padding: 20px; text-align: center; color: white;">
        <h1>Your Tee Time is Tomorrow!</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>Your tee time is <strong>tomorrow</strong>! Here's everything you need to know:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #205A50; margin-top: 0;">Booking Details</h2>
          <p><strong>Club:</strong> ${teeTimeListing2.club?.name || "Your club booking"}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Number of Players:</strong> ${teeTimeListing2.numberOfPlayers}</p>
        </div>
        
        <p>Please arrive at least 15 minutes before your scheduled tee time to check in.</p>
        <p>If you need to contact your host, please log in to your Linx account and use the messaging feature.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/bookings/${bookingId}" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Booking
          </a>
        </div>
        
        <p>Enjoy your golf experience!</p>
        
        <p>The Linx Team</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>\xA9 2025 Linx Golf. All rights reserved.</p>
      </div>
    </div>
  `;
  return await sendEmail({
    to: user.email,
    subject,
    text: text2,
    html
  });
}
async function sendNewMessageNotification(user, senderName, messagePreview) {
  if (!user.email) {
    console.error("Cannot send message notification: User has no email address");
    return false;
  }
  const subject = `New Message from ${senderName}`;
  const firstName = user.firstName || user.username || "Golfer";
  const text2 = `
    Hello ${firstName},

    You have received a new message from ${senderName}:

    "${messagePreview}"

    Login to your Linx account to view and reply to this message.

    Thank you for using Linx!
    
    The Linx Team
  `;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #205A50; padding: 20px; text-align: center; color: white;">
        <h1>New Message</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>You have received a new message from <strong>${senderName}</strong>:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; font-style: italic;">
          "${messagePreview}"
        </div>
        
        <p>Login to your Linx account to view and reply to this message.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/messages" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Messages
          </a>
        </div>
        
        <p>Thank you for using Linx!</p>
        
        <p>The Linx Team</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>\xA9 2025 Linx Golf. All rights reserved.</p>
      </div>
    </div>
  `;
  return await sendEmail({
    to: user.email,
    subject,
    text: text2,
    html
  });
}
var init_email = __esm({
  "backend/notifications/email.ts"() {
    "use strict";
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    } else {
      console.warn("SENDGRID_API_KEY not found, email notifications will not be sent");
    }
  }
});

// backend/notifications/index.ts
var notifications_exports = {};
__export(notifications_exports, {
  createNotification: () => createNotification,
  notifyBookingStatusChange: () => notifyBookingStatusChange,
  notifyHostPayment: () => notifyHostPayment,
  notifyNewBooking: () => notifyNewBooking,
  notifyNewMessage: () => notifyNewMessage,
  scheduleReminderEmails: () => scheduleReminderEmails,
  sendOneDayReminder: () => sendOneDayReminder,
  sendOneWeekReminder: () => sendOneWeekReminder
});
async function notifyNewBooking(bookingId) {
  try {
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }
    const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
    if (!teeTime) {
      throw new Error(`Tee time ${booking.teeTimeId} not found`);
    }
    const host = await storage.getUser(teeTime.hostId);
    if (!host) {
      throw new Error(`Host ${teeTime.hostId} not found`);
    }
    const guest = await storage.getUser(booking.guestId);
    if (!guest) {
      throw new Error(`Guest ${booking.guestId} not found`);
    }
    const club = await storage.getClub(teeTime.clubId);
    if (!club) {
      throw new Error(`Club ${teeTime.clubId} not found`);
    }
    await createNotification({
      userId: teeTime.hostId,
      title: "New Booking",
      message: `${guest.firstName} ${guest.lastName} has booked your tee time at ${club.name}`,
      type: "booking",
      relatedId: bookingId,
      isRead: false
    });
    await createNotification({
      userId: booking.guestId,
      title: "Booking Confirmed",
      message: `Your booking with ${host.firstName} ${host.lastName} at ${club.name} is confirmed`,
      type: "booking",
      relatedId: bookingId,
      isRead: false
    });
    const teeTimeDetails = {
      date: teeTime.date,
      price: booking.totalPrice,
      numberOfPlayers: booking.numberOfPlayers,
      club: {
        name: club.name
      }
    };
    await sendBookingConfirmation(guest, bookingId, teeTimeDetails);
    const guestFullName = `${guest.firstName || ""} ${guest.lastName || ""}`.trim() || guest.username;
    await sendHostBookingNotification(host, bookingId, teeTimeDetails, guestFullName);
    await scheduleReminderEmails(bookingId);
  } catch (error) {
    console.error("Error sending booking notifications:", error);
  }
}
async function notifyBookingStatusChange(bookingId, newStatus) {
  try {
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }
    const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
    if (!teeTime) {
      throw new Error(`Tee time ${booking.teeTimeId} not found`);
    }
    const host = await storage.getUser(teeTime.hostId);
    if (!host) {
      throw new Error(`Host ${teeTime.hostId} not found`);
    }
    const guest = await storage.getUser(booking.guestId);
    if (!guest) {
      throw new Error(`Guest ${booking.guestId} not found`);
    }
    const club = await storage.getClub(teeTime.clubId);
    if (!club) {
      throw new Error(`Club ${teeTime.clubId} not found`);
    }
    await createNotification({
      userId: booking.guestId,
      title: `Booking ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      message: `Your booking at ${club.name} has been ${newStatus}`,
      type: "booking_status",
      relatedId: bookingId,
      isRead: false
    });
    const teeTimeDetails = {
      date: teeTime.date,
      club: club.name,
      price: booking.totalPrice,
      numberOfPlayers: booking.numberOfPlayers
    };
    await sendBookingStatusUpdate(guest, bookingId, newStatus, teeTimeDetails);
  } catch (error) {
    console.error("Error sending booking status notifications:", error);
  }
}
async function notifyNewMessage(messageId) {
  try {
    const message = await storage.getMessage(messageId);
    if (!message) {
      throw new Error(`Message ${messageId} not found`);
    }
    const sender = await storage.getUser(message.senderId);
    if (!sender) {
      throw new Error(`Sender ${message.senderId} not found`);
    }
    const receiver = await storage.getUser(message.receiverId);
    if (!receiver) {
      throw new Error(`Receiver ${message.receiverId} not found`);
    }
    await createNotification({
      userId: message.receiverId,
      title: "New Message",
      message: `You have a new message from ${sender.firstName} ${sender.lastName}`,
      type: "message",
      relatedId: messageId,
      isRead: false
    });
    const messagePreview = message.content.length > 50 ? `${message.content.substring(0, 50)}...` : message.content;
    await sendNewMessageNotification(receiver, `${sender.firstName} ${sender.lastName}`, messagePreview);
  } catch (error) {
    console.error("Error sending message notifications:", error);
  }
}
async function notifyHostPayment(bookingId, amount) {
  try {
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }
    const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
    if (!teeTime) {
      throw new Error(`Tee time ${booking.teeTimeId} not found`);
    }
    const host = await storage.getUser(teeTime.hostId);
    if (!host) {
      throw new Error(`Host ${teeTime.hostId} not found`);
    }
    const club = await storage.getClub(teeTime.clubId);
    if (!club) {
      throw new Error(`Club ${teeTime.clubId} not found`);
    }
    await createNotification({
      userId: teeTime.hostId,
      title: "Payment Released",
      message: `You've received $${amount.toFixed(2)} for the tee time booking at ${club.name}`,
      type: "payment",
      relatedId: bookingId,
      isRead: false
    });
    const teeTimeDetails = {
      date: teeTime.date,
      club: {
        name: club.name
      },
      numberOfPlayers: booking.numberOfPlayers
    };
    await sendHostPaymentConfirmation(host, bookingId, teeTimeDetails, amount);
  } catch (error) {
    console.error("Error sending payment notification:", error);
  }
}
async function scheduleReminderEmails(bookingId) {
  try {
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }
    const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
    if (!teeTime) {
      throw new Error(`Tee time ${booking.teeTimeId} not found`);
    }
    const teeTimeDate = new Date(teeTime.date);
    const oneWeekBefore = new Date(teeTimeDate);
    oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
    const oneDayBefore = new Date(teeTimeDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    await storage.updateBooking(bookingId, {
      reminderOneWeek: oneWeekBefore,
      reminderOneDay: oneDayBefore,
      reminderOneWeekSent: false,
      reminderOneDaySent: false
    });
    console.log(`Scheduled reminders for booking ${bookingId}: One week: ${oneWeekBefore.toISOString()}, One day: ${oneDayBefore.toISOString()}`);
  } catch (error) {
    console.error("Error scheduling reminder emails:", error);
  }
}
async function sendOneWeekReminder(bookingId) {
  try {
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }
    if (booking.reminderOneWeekSent) {
      console.log(`One week reminder for booking ${bookingId} already sent`);
      return;
    }
    const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
    if (!teeTime) {
      throw new Error(`Tee time ${booking.teeTimeId} not found`);
    }
    const guest = await storage.getUser(booking.guestId);
    if (!guest) {
      throw new Error(`Guest ${booking.guestId} not found`);
    }
    const club = await storage.getClub(teeTime.clubId);
    if (!club) {
      throw new Error(`Club ${teeTime.clubId} not found`);
    }
    await createNotification({
      userId: booking.guestId,
      title: "Upcoming Tee Time",
      message: `Your tee time at ${club.name} is one week away`,
      type: "reminder",
      relatedId: bookingId,
      isRead: false
    });
    const teeTimeDetails = {
      date: teeTime.date,
      club: {
        name: club.name
      },
      numberOfPlayers: booking.numberOfPlayers
    };
    await sendOneWeekReminderEmail(guest, bookingId, teeTimeDetails);
    await storage.updateBooking(bookingId, {
      reminderOneWeekSent: true
    });
  } catch (error) {
    console.error("Error sending one week reminder:", error);
  }
}
async function sendOneDayReminder(bookingId) {
  try {
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }
    if (booking.reminderOneDaySent) {
      console.log(`One day reminder for booking ${bookingId} already sent`);
      return;
    }
    const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
    if (!teeTime) {
      throw new Error(`Tee time ${booking.teeTimeId} not found`);
    }
    const guest = await storage.getUser(booking.guestId);
    if (!guest) {
      throw new Error(`Guest ${booking.guestId} not found`);
    }
    const club = await storage.getClub(teeTime.clubId);
    if (!club) {
      throw new Error(`Club ${teeTime.clubId} not found`);
    }
    await createNotification({
      userId: booking.guestId,
      title: "Your Tee Time is Tomorrow",
      message: `Don't forget your tee time at ${club.name} tomorrow!`,
      type: "reminder",
      relatedId: bookingId,
      isRead: false
    });
    const teeTimeDetails = {
      date: teeTime.date,
      club: {
        name: club.name
      },
      numberOfPlayers: booking.numberOfPlayers
    };
    await sendOneDayReminderEmail(guest, bookingId, teeTimeDetails);
    await storage.updateBooking(bookingId, {
      reminderOneDaySent: true
    });
  } catch (error) {
    console.error("Error sending one day reminder:", error);
  }
}
async function createNotification(data) {
  try {
    await storage.createNotification(data);
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}
var init_notifications = __esm({
  "backend/notifications/index.ts"() {
    "use strict";
    init_storage();
    init_email();
  }
});

// backend/index.ts
import express3 from "express";

// backend/routes.ts
init_storage();
import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import { z as z2 } from "zod";

// backend/booking-service.ts
init_storage();
import schedule from "node-schedule";
var BookingService = class {
  expirationMinutes;
  expirationJob;
  // Using definite assignment assertion
  /**
   * Create a booking service
   * @param expirationMinutes - The number of minutes after which pending bookings expire
   */
  constructor(expirationMinutes = 15) {
    this.expirationMinutes = expirationMinutes;
  }
  /**
   * Initialize the booking service
   * Sets up scheduled jobs for pending booking expiration
   */
  init() {
    console.log(`Starting booking service (expiration time: ${this.expirationMinutes} minutes)...`);
    this.expirationJob = schedule.scheduleJob("*/1 * * * *", async () => {
      try {
        await this.expirePendingBookings();
      } catch (error) {
        console.error("Error in booking service expiration job:", error);
      }
    });
    this.expirePendingBookings().catch((err) => {
      console.error("Error in initial pending booking expiration:", err);
    });
    console.log("Booking service started");
  }
  /**
   * Stop the booking service
   */
  stop() {
    if (this.expirationJob) {
      this.expirationJob.cancel();
    }
    console.log("Booking service stopped");
  }
  /**
   * Find and expire pending bookings that are older than the specified expiration time
   */
  async expirePendingBookings() {
    console.log("Checking for expired pending bookings...");
    try {
      const expiredBookings = await storage.getPendingBookingsOlderThan(this.expirationMinutes);
      if (expiredBookings.length === 0) {
        console.log("No expired pending bookings found");
        return;
      }
      console.log(`Found ${expiredBookings.length} expired pending bookings`);
      for (const booking of expiredBookings) {
        try {
          console.log(`Expiring booking ${booking.id} for tee time ${booking.teeTimeId}`);
          await storage.updateBookingStatus(booking.id, "expired");
          await storage.updateTeeTimeListing(booking.teeTimeId, { status: "available" });
          console.log(`Booking ${booking.id} expired and tee time ${booking.teeTimeId} is available again`);
        } catch (error) {
          console.error(`Error processing expired booking ${booking.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error checking for expired pending bookings:", error);
    }
  }
  /**
   * Create a pending booking for a tee time
   * This mimics Timekit's booking creation flow
   */
  async createPendingBooking(teeTimeId, guestId, numberOfPlayers, totalPrice) {
    try {
      const teeTime = await storage.getTeeTimeListing(teeTimeId);
      if (!teeTime) {
        throw new Error(`Tee time ${teeTimeId} not found`);
      }
      if (teeTime.status !== "available") {
        console.error(`Tee time ${teeTimeId} is not available - status is ${teeTime.status}`);
        if (teeTime.status === "pending") {
          const pendingDuration = teeTime.createdAt ? ((/* @__PURE__ */ new Date()).getTime() - new Date(teeTime.createdAt).getTime()) / (1e3 * 60) : 0;
          if (pendingDuration > 10) {
            console.log(`Found stale pending status (${pendingDuration.toFixed(2)} mins old) for tee time ${teeTimeId}, resetting to available`);
            await storage.updateTeeTimeListing(teeTimeId, { status: "available" });
            teeTime.status = "available";
          } else {
            throw new Error(`Tee time ${teeTimeId} is currently being booked by another user (${pendingDuration.toFixed(2)} mins). Please try again in a few minutes.`);
          }
        } else {
          throw new Error(`Tee time ${teeTimeId} is not available (current status: ${teeTime.status})`);
        }
      }
      await storage.updateTeeTimeListing(teeTimeId, { status: "pending" });
      const booking = await storage.createBooking({
        teeTimeId,
        guestId,
        numberOfPlayers,
        totalPrice,
        status: "pending",
        stripePaymentIntentId: void 0
      });
      console.log(`Created pending booking ${booking.id} for tee time ${teeTimeId}`);
      return {
        booking,
        teeTime
      };
    } catch (error) {
      try {
        await storage.updateTeeTimeListing(teeTimeId, { status: "available" });
      } catch (innerError) {
        console.error(`Error resetting tee time ${teeTimeId} status:`, innerError);
      }
      throw error;
    }
  }
  /**
   * Confirm a pending booking after successful payment
   * This mimics Timekit's confirmation workflow
   */
  async confirmBooking(bookingId, paymentIntentId) {
    try {
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        console.error(`Booking confirmation failed: Booking ${bookingId} not found`);
        throw new Error(`Booking ${bookingId} not found`);
      }
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if (!teeTime) {
        console.error(`Booking confirmation failed: Tee time ${booking.teeTimeId} not found`);
        throw new Error(`Tee time ${booking.teeTimeId} not found`);
      }
      if (teeTime.status === "booked" && booking.status !== "confirmed") {
        console.error(`Booking confirmation failed: Tee time ${booking.teeTimeId} is already booked by someone else`);
        await storage.updateBookingStatus(bookingId, "cancelled");
        throw new Error(`Tee time ${booking.teeTimeId} is already booked by another user`);
      }
      const validStates = ["pending", "payment_pending", "payment_processing"];
      if (!validStates.includes(booking.status)) {
        console.error(`Booking confirmation failed: Booking ${bookingId} cannot be confirmed (current status: ${booking.status})`);
        throw new Error(`Booking ${bookingId} cannot be confirmed (current status: ${booking.status})`);
      }
      console.log(`Attempting to confirm booking ${bookingId} with current status ${booking.status}`);
      let paymentToUse = paymentIntentId;
      if (booking.stripePaymentIntentId && !paymentIntentId) {
        paymentToUse = booking.stripePaymentIntentId;
      }
      const updatedBooking = await storage.updateBooking(bookingId, {
        status: "confirmed",
        stripePaymentIntentId: paymentToUse
      });
      await storage.updateTeeTimeListing(booking.teeTimeId, { status: "booked" });
      console.log(`Successfully confirmed booking ${bookingId} for tee time ${booking.teeTimeId} with payment ${paymentToUse}`);
      return updatedBooking;
    } catch (error) {
      console.error(`Error confirming booking ${bookingId}:`, error);
      throw error;
    }
  }
  /**
   * Cancel a booking and make the tee time available again
   * This mimics Timekit's cancellation workflow
   */
  async cancelBooking(bookingId, reason) {
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }
    const updatedBooking = await storage.updateBooking(bookingId, {
      status: "cancelled"
    });
    await storage.updateTeeTimeListing(booking.teeTimeId, { status: "available" });
    console.log(`Cancelled booking ${bookingId} for tee time ${booking.teeTimeId}. Reason: ${reason || "Not specified"}`);
    return updatedBooking;
  }
};
var bookingService = new BookingService();
var booking_service_default = bookingService;

// backend/routes.ts
init_schema();

// backend/routes/notifications.ts
init_storage();
init_notifications();
import { Router } from "express";
var router = Router();
router.get("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const userId = req.user.id;
    const notifications2 = await storage.getNotificationsByUserId(userId);
    return res.json(notifications2);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/unread/count", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const userId = req.user.id;
    const unreadNotifications = await storage.getUnreadNotificationsByUserId(userId);
    return res.json({ count: unreadNotifications.length });
  } catch (error) {
    console.error("Error fetching unread notifications count:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
router.patch("/:id/read", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const notificationId = parseInt(req.params.id);
  if (isNaN(notificationId)) {
    return res.status(400).json({ message: "Invalid notification ID" });
  }
  try {
    const notification = await storage.getNotification(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (notification.userId !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const updatedNotification = await storage.markNotificationAsRead(notificationId);
    return res.json(updatedNotification);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/read-all", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const userId = req.user.id;
    await storage.markAllNotificationsAsRead(userId);
    return res.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/trigger/booking/:id", async (req, res) => {
  if (!req.isAuthenticated() || !req.user?.isHost) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const bookingId = parseInt(req.params.id);
  if (isNaN(bookingId)) {
    return res.status(400).json({ message: "Invalid booking ID" });
  }
  try {
    await notifyNewBooking(bookingId);
    return res.json({ success: true });
  } catch (error) {
    console.error("Error triggering booking notification:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/trigger/booking-status/:id", async (req, res) => {
  if (!req.isAuthenticated() || !req.user?.isHost) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const bookingId = parseInt(req.params.id);
  const { status } = req.body;
  if (isNaN(bookingId) || !status) {
    return res.status(400).json({ message: "Invalid booking ID or status" });
  }
  try {
    await notifyBookingStatusChange(bookingId, status);
    return res.json({ success: true });
  } catch (error) {
    console.error("Error triggering booking status notification:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/trigger/message/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const messageId = parseInt(req.params.id);
  if (isNaN(messageId)) {
    return res.status(400).json({ message: "Invalid message ID" });
  }
  try {
    await notifyNewMessage(messageId);
    return res.json({ success: true });
  } catch (error) {
    console.error("Error triggering message notification:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
var notifications_default = router;

// backend/auth.ts
init_storage();
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session3 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import connectPg2 from "connect-pg-simple";

// backend/notifications/password-reset.ts
init_email();
async function sendPasswordResetEmail(user, resetToken) {
  if (!user.email) {
    console.error("Cannot send password reset email: User has no email address");
    return false;
  }
  const subject = `Reset Your Linx Password`;
  const firstName = user.firstName || user.username || "Golfer";
  const resetUrl = `${process.env.APP_URL || "https://linxgolfapp.com"}/reset-password?token=${resetToken}`;
  const text2 = `
    Hello ${firstName},

    You recently requested to reset your password for your Linx account. Click the link below to reset it:
    
    ${resetUrl}
    
    This password reset link is only valid for 1 hour. If you did not request a password reset, please ignore this email or contact support if you have questions.
    
    The Linx Team
  `;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #205A50; padding: 20px; text-align: center; color: white;">
        <h1>Reset Your Password</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>You recently requested to reset your password for your Linx account. Click the button below to reset it:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Your Password
          </a>
        </div>
        
        <p style="font-size: 13px; color: #777;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 13px; color: #777; word-break: break-all;"><a href="${resetUrl}" style="color: #205A50;">${resetUrl}</a></p>
        
        <p><strong>This password reset link is only valid for 1 hour.</strong></p>
        <p>If you did not request a password reset, please ignore this email or contact support if you have questions.</p>
        
        <p>The Linx Team</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>\xA9 2025 Linx Golf. All rights reserved.</p>
      </div>
    </div>
  `;
  return await sendEmail({
    to: user.email,
    subject,
    text: text2,
    html
  });
}
async function sendPasswordResetSuccessEmail(user) {
  if (!user.email) {
    console.error("Cannot send password reset success email: User has no email address");
    return false;
  }
  const subject = `Your Linx Password Has Been Reset`;
  const firstName = user.firstName || user.username || "Golfer";
  const text2 = `
    Hello ${firstName},

    Your password for your Linx account has been successfully reset.
    
    If you did not make this change or if you believe an unauthorized person has accessed your account, please contact us immediately.
    
    The Linx Team
  `;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #49DCB1; padding: 20px; text-align: center; color: white;">
        <h1>Password Reset Successful</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>Your password for your Linx account has been successfully reset.</p>
        
        <p>If you did not make this change or if you believe an unauthorized person has accessed your account, please contact us immediately.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.APP_URL || "https://linxgolfapp.com"}/login" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Sign In to Your Account
          </a>
        </div>
        
        <p>The Linx Team</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>\xA9 2025 Linx Golf. All rights reserved.</p>
      </div>
    </div>
  `;
  return await sendEmail({
    to: user.email,
    subject,
    text: text2,
    html
  });
}

// backend/auth.ts
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  try {
    if (!stored.includes(".")) {
      console.error("Invalid stored password format (missing salt separator)");
      return false;
    }
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.error("Invalid stored password format (missing hash or salt)");
      return false;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    if (hashedBuf.length !== suppliedBuf.length) {
      console.error(`Buffer length mismatch: ${hashedBuf.length} vs ${suppliedBuf.length}`);
      return false;
    }
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}
function setupAuth(app2) {
  const PostgresStore = connectPg2(session3);
  const sessionStore = new PostgresStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true
  });
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "golflinx-session-secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1e3,
      // 30 days
      secure: process.env.NODE_ENV === "production",
      httpOnly: true
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session3(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        console.log(`Attempting login for email: ${email}`);
        const user = await storage.getUserByEmail(email);
        if (!user) {
          console.log(`User not found with email: ${email}`);
          return done(null, false, { message: "Incorrect email or password" });
        }
        if (!user.password) {
          console.log(`User found but no password set: ${email}`);
          return done(null, false, { message: "Incorrect email or password" });
        }
        const passwordValid = await comparePasswords(password, user.password);
        if (!passwordValid) {
          console.log(`Invalid password for user: ${email}`);
          return done(null, false, { message: "Incorrect email or password" });
        }
        console.log(`Login successful for user: ${email}`);
        return done(null, user);
      } catch (err) {
        console.error(`Login error for ${email}:`, err);
        return done(err);
      }
    })
  );
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      if (req.body.username) {
        const existingUser = await storage.getUserByUsername(req.body.username);
        if (existingUser) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }
      if (req.body.email) {
        const existingEmail = await storage.getUserByEmail(req.body.email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already registered" });
        }
      }
      const hashedPassword = await hashPassword(req.body.password);
      const userData = {
        ...req.body,
        password: hashedPassword
      };
      if (!userData.username) {
        const emailPrefix = req.body.email.split("@")[0];
        const randomDigits = Math.floor(1e3 + Math.random() * 9e3);
        userData.username = `${emailPrefix}${randomDigits}`;
      }
      const user = await storage.createUser({
        ...userData,
        onboardingCompleted: false
      });
      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info.message || "Authentication failed" });
      }
      req.login(user, (err2) => {
        if (err2) return next(err2);
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  app2.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
  app2.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      if (user) {
        const resetToken = randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1e3);
        await storage.updateUser(user.id, {
          resetToken,
          resetTokenExpiry
        });
        await sendPasswordResetEmail(user, resetToken);
        if (process.env.NODE_ENV !== "production") {
          console.log(`Reset password link: /reset-password?token=${resetToken}`);
        }
      }
      res.status(200).json({ message: "If an account exists, a password reset link has been sent" });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process reset request" });
    }
  });
  app2.post("/api/auth/reset-password/confirm", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      const user = await storage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      const tokenExpiry = new Date(user.resetTokenExpiry);
      if (tokenExpiry < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ message: "Reset token has expired" });
      }
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      });
      await sendPasswordResetSuccessEmail(user);
      res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Password reset confirmation error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
}
var isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};
var isHost = (req, res, next) => {
  if (req.isAuthenticated() && req.user.isHost) {
    return next();
  }
  res.status(403).json({ message: "Access denied" });
};

// backend/routes.ts
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("CRITICAL ERROR: Missing STRIPE_SECRET_KEY environment variable");
}
if (process.env.STRIPE_WEBHOOK_SECRET) {
  console.log("Stripe webhook secret is properly configured");
} else {
  console.warn("Missing STRIPE_WEBHOOK_SECRET environment variable, webhook verification will fail");
}
var stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16"
  });
} else {
  console.warn(
    "STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled. This is for UI testing only."
  );
}
var connections = /* @__PURE__ */ new Map();
var processedEvents = /* @__PURE__ */ new Set();
async function registerRoutes(app2) {
  await setupAuth(app2);
  if (process.env.NODE_ENV === "development") {
    app2.get("/api/test/reset-test-user", async (req, res) => {
      try {
        console.log("Resetting test user password...");
        let testUser = await storage.getUserByEmail("test@example.com");
        if (!testUser) {
          console.log("Test user not found, creating one...");
          testUser = await storage.createUser({
            username: "testuser",
            email: "test@example.com",
            password: "temporary",
            // Will be overwritten below
            firstName: "Test",
            lastName: "User",
            isHost: false
          });
          console.log("Test user created with ID:", testUser.id);
        }
        const hashedPassword = await hashPassword("password123");
        console.log("Updating password for test user ID:", testUser.id);
        const updatedUser = await storage.updateUser(testUser.id, {
          password: hashedPassword
        });
        console.log("Test user password reset successful");
        res.json({ message: "Test user password reset successful", userId: testUser.id });
      } catch (error) {
        console.error("Error resetting test user password:", error);
        res.status(500).json({ message: "Error resetting test user password", error: String(error) });
      }
    });
  }
  app2.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.set("Surrogate-Control", "no-store");
      console.log(`Fetching user ${userId} - updatedAt:`, user.updatedAt);
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.put("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }
      const userData = req.body;
      console.log(`Processing profile update for user ${userId}:`, userData);
      delete userData.email;
      delete userData.password;
      userData.updatedAt = /* @__PURE__ */ new Date();
      const updatedUser = await storage.updateUser(userId, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = updatedUser;
      console.log(`Profile updated successfully for user ${userId}:`, userWithoutPassword);
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.set("Surrogate-Control", "no-store");
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Error updating user: " + (error instanceof Error ? error.message : String(error)) });
    }
  });
  app2.get("/api/clubs", async (req, res) => {
    try {
      const clubs2 = await storage.getClubs();
      res.json(clubs2);
    } catch (error) {
      res.status(500).json({ message: "Error fetching clubs" });
    }
  });
  app2.get("/api/clubs/:id", async (req, res) => {
    try {
      const clubId = parseInt(req.params.id);
      const club = await storage.getClub(clubId);
      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }
      res.json(club);
    } catch (error) {
      res.status(500).json({ message: "Error fetching club" });
    }
  });
  app2.post("/api/clubs", isAuthenticated, async (req, res) => {
    try {
      const clubData = insertClubSchema.parse(req.body);
      const club = await storage.createClub(clubData);
      res.status(201).json(club);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid data", details: error.errors });
      }
      res.status(500).json({ message: "Error creating club" });
    }
  });
  app2.get("/api/users/:userId/clubs", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userClubs2 = await storage.getUserClubs(userId);
      const clubDetails = await Promise.all(
        userClubs2.map(async (userClub) => {
          const club = await storage.getClub(userClub.clubId);
          return {
            ...userClub,
            club
          };
        })
      );
      res.json(clubDetails);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user clubs" });
    }
  });
  app2.post("/api/user-clubs", isAuthenticated, async (req, res) => {
    try {
      const userClubData = insertUserClubSchema.parse(req.body);
      if (req.user.id !== userClubData.userId) {
        return res.status(403).json({ message: "You can only add yourself to a club" });
      }
      const userClub = await storage.addUserToClub(userClubData);
      res.status(201).json(userClub);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid data", details: error.errors });
      }
      res.status(500).json({ message: "Error adding user to club" });
    }
  });
  app2.get("/api/tee-times", async (req, res) => {
    try {
      const { location, date, endDate, players, distance } = req.query;
      let teeTimeListings = await storage.getAvailableTeeTimeListings();
      let detailedListings = await Promise.all(
        teeTimeListings.map(async (listing) => {
          const host = await storage.getUser(listing.hostId);
          const club = await storage.getClub(listing.clubId);
          const hostReviews = await storage.getReviewsByTargetId(listing.hostId, "host");
          const avgRating = hostReviews.length > 0 ? hostReviews.reduce((sum, review) => sum + review.rating, 0) / hostReviews.length : 0;
          return {
            ...listing,
            host: host ? {
              id: host.id,
              username: host.username,
              firstName: host.firstName,
              lastName: host.lastName,
              profileImage: host.profileImage
            } : void 0,
            club,
            hostRating: avgRating,
            reviewCount: hostReviews.length,
            relevanceScore: 0
            // Default relevance score
          };
        })
      );
      console.log("Filter params:", { location, date, endDate, players, distance });
      if (date && typeof date === "string") {
        try {
          const startDate = new Date(date);
          startDate.setHours(0, 0, 0, 0);
          if (endDate && typeof endDate === "string") {
            const endDateObj = new Date(endDate);
            endDateObj.setHours(23, 59, 59, 999);
            console.log(`Filtering by date range: ${startDate.toISOString()} to ${endDateObj.toISOString()}`);
            detailedListings = detailedListings.filter((listing) => {
              const listingDate = new Date(listing.date);
              return listingDate >= startDate && listingDate <= endDateObj;
            });
            console.log(`After date range filter: ${detailedListings.length} listings`);
          } else if (startDate.getDay() === 6) {
            console.log("Weekend filter detected");
            const sunday = new Date(startDate);
            sunday.setDate(sunday.getDate() + 1);
            sunday.setHours(23, 59, 59, 999);
            console.log(`Filtering by weekend: ${startDate.toISOString()} to ${sunday.toISOString()}`);
            detailedListings = detailedListings.filter((listing) => {
              const listingDate = new Date(listing.date);
              return listingDate >= startDate && listingDate <= sunday;
            });
            console.log(`After weekend filter: ${detailedListings.length} listings`);
          } else {
            const endOfDay = new Date(startDate);
            endOfDay.setHours(23, 59, 59, 999);
            console.log(`Filtering by single date: ${startDate.toISOString()} to ${endOfDay.toISOString()}`);
            detailedListings = detailedListings.filter((listing) => {
              const listingDate = new Date(listing.date);
              return listingDate >= startDate && listingDate <= endOfDay;
            });
            console.log(`After exact date filter: ${detailedListings.length} listings`);
          }
        } catch (e) {
          console.error("Error parsing date:", e);
        }
      }
      if (players && typeof players === "string") {
        const requestedPlayers = parseInt(players);
        if (!isNaN(requestedPlayers)) {
          detailedListings = detailedListings.filter((listing) => listing.playersAllowed >= requestedPlayers);
          console.log(`After players filter (${requestedPlayers}): ${detailedListings.length} listings`);
        }
      }
      if (location && distance && typeof location === "string" && typeof distance === "string" && distance !== "any") {
        try {
          const maxDistance = parseInt(distance);
          if (!isNaN(maxDistance)) {
            console.log(`Applying distance filter: ${maxDistance} miles from ${location}`);
            detailedListings = detailedListings.filter((listing) => {
              const clubLocation = listing.club?.location || "";
              const searchLocation = location || "";
              if (clubLocation.toLowerCase() === searchLocation.toLowerCase()) {
                return true;
              }
              if (clubLocation && (clubLocation.toLowerCase().includes(searchLocation.toLowerCase()) || searchLocation.toLowerCase().includes(clubLocation.toLowerCase()))) {
                return true;
              }
              const searchParts = searchLocation.toLowerCase().split(",").map((part) => part.trim());
              const listingParts = clubLocation ? clubLocation.toLowerCase().split(",").map((part) => part.trim()) : [];
              const sharesCityOrState = searchParts.some(
                (part) => listingParts.includes(part) && part.length > 0
              );
              if (sharesCityOrState) {
                return maxDistance >= 50;
              }
              return maxDistance >= 100;
            });
            console.log(`After distance filter (${maxDistance} miles): ${detailedListings.length} listings`);
          }
        } catch (e) {
          console.error("Error applying distance filter:", e);
        }
      }
      detailedListings = detailedListings.map((listing) => {
        let relevanceScore = 0;
        if (location && typeof location === "string") {
          const searchTerms = location.toLowerCase().split(/[ ,]+/);
          const clubLocation = listing.club?.location?.toLowerCase() || "";
          const clubName = listing.club?.name?.toLowerCase() || "";
          searchTerms.forEach((term) => {
            if (clubLocation.includes(term)) {
              relevanceScore += 10;
              if (clubLocation.split(",").some((part) => part.trim() === term.trim())) {
                relevanceScore += 5;
              }
            }
            if (clubName.includes(term)) {
              relevanceScore += 5;
            }
          });
        }
        return {
          ...listing,
          relevanceScore
        };
      });
      detailedListings.sort((a, b) => b.relevanceScore - a.relevanceScore);
      console.log(`Returning ${detailedListings.length} listings after all filters`);
      res.json(detailedListings);
    } catch (error) {
      console.error("Error in tee times endpoint:", error);
      res.status(500).json({ message: "Error fetching tee time listings" });
    }
  });
  app2.get("/api/tee-times/:id", async (req, res) => {
    try {
      const teeTimeId = parseInt(req.params.id);
      const teeTime = await storage.getTeeTimeListing(teeTimeId);
      if (!teeTime) {
        return res.status(404).json({ message: "Tee time listing not found" });
      }
      const host = await storage.getUser(teeTime.hostId);
      const club = await storage.getClub(teeTime.clubId);
      const hostReviews = await storage.getReviewsByTargetId(teeTime.hostId, "host");
      const avgRating = hostReviews.length > 0 ? hostReviews.reduce((sum, review) => sum + review.rating, 0) / hostReviews.length : 0;
      res.json({
        ...teeTime,
        host: host ? {
          id: host.id,
          username: host.username,
          firstName: host.firstName,
          lastName: host.lastName,
          profileImage: host.profileImage
        } : void 0,
        club,
        hostRating: avgRating,
        reviewCount: hostReviews.length
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching tee time listing" });
    }
  });
  app2.get("/api/hosts/:hostId/tee-times", async (req, res) => {
    try {
      const hostId = parseInt(req.params.hostId);
      const teeTimeListings = await storage.getTeeTimeListingsByHostId(hostId);
      const detailedListings = await Promise.all(
        teeTimeListings.map(async (listing) => {
          const club = await storage.getClub(listing.clubId);
          return {
            ...listing,
            club
          };
        })
      );
      res.json(detailedListings);
    } catch (error) {
      res.status(500).json({ message: "Error fetching host tee time listings" });
    }
  });
  app2.post("/api/tee-times", isAuthenticated, isHost, async (req, res) => {
    try {
      if (req.body.date && typeof req.body.date === "string") {
        req.body.date = new Date(req.body.date);
      }
      const teeTimeData = insertTeeTimeListingSchema.parse(req.body);
      if (req.user.id !== teeTimeData.hostId) {
        return res.status(403).json({ message: "You can only create tee times for yourself" });
      }
      const teeTime = await storage.createTeeTimeListing(teeTimeData);
      res.status(201).json(teeTime);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid data", details: error.errors });
      }
      res.status(500).json({ message: "Error creating tee time listing" });
    }
  });
  app2.put("/api/tee-times/:id", isAuthenticated, isHost, async (req, res) => {
    try {
      const teeTimeId = parseInt(req.params.id);
      const teeTimeData = req.body;
      const existingTeeTime = await storage.getTeeTimeListing(teeTimeId);
      if (!existingTeeTime) {
        return res.status(404).json({ message: "Tee time listing not found" });
      }
      if (req.user.id !== existingTeeTime.hostId) {
        return res.status(403).json({ message: "You can only update your own tee times" });
      }
      const updatedTeeTime = await storage.updateTeeTimeListing(teeTimeId, teeTimeData);
      res.json(updatedTeeTime);
    } catch (error) {
      res.status(500).json({ message: "Error updating tee time listing" });
    }
  });
  app2.get("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if (req.user.id !== booking.guestId && req.user.id !== teeTime?.hostId) {
        return res.status(403).json({ message: "You do not have permission to view this booking" });
      }
      const guest = await storage.getUser(booking.guestId);
      const detailedBooking = {
        ...booking,
        guest: guest ? {
          id: guest.id,
          username: guest.username,
          firstName: guest.firstName,
          lastName: guest.lastName,
          profileImage: guest.profileImage
        } : void 0,
        teeTime
      };
      res.json(detailedBooking);
    } catch (error) {
      res.status(500).json({ message: "Error fetching booking" });
    }
  });
  app2.patch("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      const userId = req.user.id;
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if (booking.guestId !== userId && teeTime?.hostId !== userId) {
        return res.status(403).json({ message: "You are not authorized to update this booking" });
      }
      const { status, stripePaymentIntentId } = req.body;
      if (status === "confirmed") {
        console.log(`Attempting to confirm booking ${bookingId} with payment intent ${stripePaymentIntentId || "(none)"}`);
        if (stripePaymentIntentId) {
          try {
            console.log(`Using booking service to confirm booking ${bookingId}`);
            const confirmedBooking = await booking_service_default.confirmBooking(bookingId, stripePaymentIntentId);
            console.log(`Successfully confirmed booking ${bookingId} through booking service`);
            return res.json(confirmedBooking);
          } catch (confirmError) {
            console.error(`Error in booking service confirmation for ${bookingId}:`, confirmError);
          }
        }
        console.log(`Manually confirming booking ${bookingId}`);
        const updatedBooking = await storage.updateBookingStatus(bookingId, "confirmed");
        if (stripePaymentIntentId) {
          await storage.updateBooking(bookingId, { stripePaymentIntentId });
        }
        if (booking.teeTimeId) {
          await storage.updateTeeTimeListing(booking.teeTimeId, { status: "booked" });
        }
        try {
          const notificationsModule = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
          if (notificationsModule.notifyBookingStatusChange) {
            await notificationsModule.notifyBookingStatusChange(bookingId, "confirmed");
          }
        } catch (notifyError) {
          console.error(`Error sending confirmation notification for booking ${bookingId}:`, notifyError);
        }
        console.log(`Booking ${bookingId} successfully confirmed manually`);
        return res.json(updatedBooking);
      } else {
        const updatedBooking = await storage.updateBooking(bookingId, req.body);
        return res.json(updatedBooking);
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: error.message || "Error updating booking" });
    }
  });
  app2.get("/api/users/:userId/bookings", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "You can only view your own bookings" });
      }
      const bookings2 = await storage.getBookingsByGuestId(userId);
      const detailedBookings = await Promise.all(
        bookings2.map(async (booking) => {
          const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
          const club = teeTime ? await storage.getClub(teeTime.clubId) : void 0;
          const host = teeTime ? await storage.getUser(teeTime.hostId) : void 0;
          return {
            ...booking,
            teeTime,
            club,
            host: host ? {
              id: host.id,
              username: host.username,
              firstName: host.firstName,
              lastName: host.lastName,
              profileImage: host.profileImage
            } : void 0
          };
        })
      );
      res.json(detailedBookings);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user bookings" });
    }
  });
  app2.get("/api/hosts/:hostId/bookings", isAuthenticated, isHost, async (req, res) => {
    try {
      const hostId = parseInt(req.params.hostId);
      if (req.user.id !== hostId) {
        return res.status(403).json({ message: "You can only view bookings for your own tee times" });
      }
      const hostTeeTimes = await storage.getTeeTimeListingsByHostId(hostId);
      const allBookings = [];
      for (const teeTime of hostTeeTimes) {
        const bookings2 = await storage.getBookingsByTeeTimeId(teeTime.id);
        for (const booking of bookings2) {
          const guest = await storage.getUser(booking.guestId);
          allBookings.push({
            ...booking,
            teeTime,
            guest: guest ? {
              id: guest.id,
              username: guest.username,
              firstName: guest.firstName,
              lastName: guest.lastName,
              profileImage: guest.profileImage
            } : void 0
          });
        }
      }
      res.json(allBookings);
    } catch (error) {
      res.status(500).json({ message: "Error fetching host bookings" });
    }
  });
  app2.post("/api/bookings", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating booking with data:", req.body);
      let bookingData;
      try {
        bookingData = insertBookingSchema.parse(req.body);
      } catch (validationError) {
        console.error("Booking validation error:", validationError);
        return res.status(400).json({
          message: "Invalid booking data",
          errors: validationError
        });
      }
      const { teeTimeId, guestId, numberOfPlayers, totalPrice, status, stripePaymentIntentId } = bookingData;
      if (req.user.id !== guestId) {
        return res.status(403).json({ message: "You can only create bookings for yourself" });
      }
      const teeTime = await storage.getTeeTimeListing(teeTimeId);
      if (!teeTime) {
        console.error(`Booking failed: Tee time listing ${teeTimeId} not found`);
        return res.status(404).json({ message: "Tee time listing not found" });
      }
      const existingBookings = await storage.getBookingsByTeeTimeId(teeTimeId);
      const pendingBookings = existingBookings.filter(
        (b) => b.status === "pending" || b.status === "payment_pending" || b.status === "payment_processing"
      );
      if (pendingBookings.length > 0) {
        console.error(
          `Booking failed: Tee time ${teeTimeId} already has pending bookings:`,
          pendingBookings.map((b) => ({ id: b.id, status: b.status }))
        );
        return res.status(409).json({
          message: `This tee time is currently being booked by someone else. Please try again in a few minutes.`,
          pendingBookings: pendingBookings.length
        });
      }
      if (teeTime.status !== "available") {
        console.error(`Booking failed: Tee time ${teeTimeId} is not available, current status: ${teeTime.status}`);
        return res.status(400).json({
          message: `This tee time is no longer available (current status: ${teeTime.status})`,
          status: teeTime.status
        });
      }
      console.log(`Creating booking for tee time ${teeTimeId} with payment intent: ${stripePaymentIntentId || "none"}`);
      let booking;
      if (stripePaymentIntentId) {
        booking = await booking_service_default.createPendingBooking(
          teeTimeId,
          guestId,
          numberOfPlayers,
          totalPrice
        );
        console.log(`Created pending booking ${booking.id}, now confirming with payment ${stripePaymentIntentId}`);
        booking = await booking_service_default.confirmBooking(booking.id, stripePaymentIntentId);
        console.log(`Booking ${booking.id} confirmed with payment ${stripePaymentIntentId}`);
      } else {
        booking = await booking_service_default.createPendingBooking(
          teeTimeId,
          guestId,
          numberOfPlayers,
          totalPrice
        );
      }
      try {
        const { notifyNewBooking: notifyNewBooking2 } = (init_notifications(), __toCommonJS(notifications_exports));
        await notifyNewBooking2(booking.id);
        console.log(`Sent notifications for new booking ${booking.id}`);
      } catch (notificationError) {
        console.error("Error sending booking notifications:", notificationError);
      }
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid data", details: error.errors });
      }
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Error creating booking", error: error.message });
    }
  });
  app2.put("/api/bookings/:id/status", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { status } = req.body;
      if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if (req.user.id !== booking.guestId && req.user.id !== teeTime?.hostId) {
        return res.status(403).json({ message: "You do not have permission to update this booking" });
      }
      let updatedBooking;
      if (status === "cancelled") {
        try {
          updatedBooking = await booking_service_default.cancelBooking(bookingId, "Cancelled by user/host");
          console.log(`Booking ${bookingId} cancelled through booking service`);
        } catch (error) {
          console.error(`Error using booking service to cancel booking ${bookingId}:`, error);
          updatedBooking = await storage.updateBookingStatus(bookingId, status);
          if (teeTime) {
            await storage.updateTeeTimeListing(teeTime.id, { status: "available" });
          }
        }
      } else if (status === "confirmed" && booking.status === "pending") {
        try {
          updatedBooking = await booking_service_default.confirmBooking(bookingId, booking.stripePaymentIntentId || "");
          console.log(`Booking ${bookingId} confirmed through booking service`);
        } catch (error) {
          console.error(`Error using booking service to confirm booking ${bookingId}:`, error);
          updatedBooking = await storage.updateBookingStatus(bookingId, status);
        }
      } else {
        updatedBooking = await storage.updateBookingStatus(bookingId, status);
      }
      if (status === "confirmed") {
        try {
          const { scheduleReminderEmails: scheduleReminderEmails2 } = (init_notifications(), __toCommonJS(notifications_exports));
          await scheduleReminderEmails2(bookingId);
          console.log(`Scheduled reminders for booking ${bookingId}`);
        } catch (reminderError) {
          console.error("Error scheduling reminders:", reminderError);
        }
      }
      try {
        const { notifyBookingStatusChange: notifyBookingStatusChange2 } = (init_notifications(), __toCommonJS(notifications_exports));
        await notifyBookingStatusChange2(bookingId, status);
      } catch (notificationError) {
        console.error("Error sending notifications:", notificationError);
      }
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking status:", error);
      res.status(500).json({ message: "Error updating booking status" });
    }
  });
  app2.get("/api/reviews/target/:targetId/:targetType", async (req, res) => {
    try {
      const targetId = parseInt(req.params.targetId);
      const targetType = req.params.targetType;
      if (!["host", "guest", "club"].includes(targetType)) {
        return res.status(400).json({ message: "Invalid target type" });
      }
      const reviews2 = await storage.getReviewsByTargetId(targetId, targetType);
      const detailedReviews = await Promise.all(
        reviews2.map(async (review) => {
          const reviewer = await storage.getUser(review.reviewerId);
          return {
            ...review,
            reviewer: reviewer ? {
              id: reviewer.id,
              username: reviewer.username,
              firstName: reviewer.firstName,
              lastName: reviewer.lastName,
              profileImage: reviewer.profileImage
            } : void 0
          };
        })
      );
      res.json(detailedReviews);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reviews" });
    }
  });
  app2.post("/api/reviews", isAuthenticated, async (req, res) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);
      if (req.user.id !== reviewData.reviewerId) {
        return res.status(403).json({ message: "You can only create reviews as yourself" });
      }
      if (reviewData.bookingId) {
        const booking = await storage.getBooking(reviewData.bookingId);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }
        if (booking.status !== "completed") {
          return res.status(400).json({ message: "You can only review completed bookings" });
        }
        const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
        if (req.user.id !== booking.guestId && req.user.id !== teeTime?.hostId) {
          return res.status(403).json({ message: "You must be part of the booking to leave a review" });
        }
      }
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid data", details: error.errors });
      }
      res.status(500).json({ message: "Error creating review" });
    }
  });
  app2.get("/api/messages/booking/:bookingId", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if (req.user.id !== booking.guestId && req.user.id !== teeTime?.hostId) {
        return res.status(403).json({ message: "You must be part of the booking to view messages" });
      }
      const messages2 = await storage.getMessagesByBookingId(bookingId);
      res.json(messages2);
    } catch (error) {
      res.status(500).json({ message: "Error fetching messages" });
    }
  });
  app2.get("/api/messages/conversation/:otherUserId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const otherUserId = parseInt(req.params.otherUserId);
      const otherUser = await storage.getUser(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const messages2 = await storage.getConversation(userId, otherUserId);
      res.json(messages2);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Error fetching conversation" });
    }
  });
  app2.get("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const allMessages = await storage.getUserMessages(userId);
      const conversationPartners = /* @__PURE__ */ new Set();
      allMessages.forEach((message) => {
        if (message.senderId === userId) {
          conversationPartners.add(message.receiverId);
        } else {
          conversationPartners.add(message.senderId);
        }
      });
      const conversations = await Promise.all(
        Array.from(conversationPartners).map(async (partnerId) => {
          const partner = await storage.getUser(partnerId);
          if (!partner) return null;
          const conversationMessages = allMessages.filter(
            (msg) => msg.senderId === userId && msg.receiverId === partnerId || msg.senderId === partnerId && msg.receiverId === userId
          ).sort(
            (a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0)
          );
          const lastMessage = conversationMessages[0];
          const unreadCount = conversationMessages.filter(
            (msg) => msg.receiverId === userId && !msg.isRead
          ).length;
          return {
            id: partnerId,
            otherUser: {
              id: partner.id,
              name: partner.firstName && partner.lastName ? `${partner.firstName} ${partner.lastName}` : partner.username,
              profileImage: partner.profileImage,
              lastMessage: lastMessage?.content || "",
              lastMessageTime: lastMessage?.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
              unreadCount,
              isOnline: connections.has(partnerId)
            }
          };
        })
      );
      const validConversations = conversations.filter(Boolean).sort(
        (a, b) => new Date(b.otherUser.lastMessageTime).getTime() - new Date(a.otherUser.lastMessageTime).getTime()
      );
      res.json(validConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Error fetching conversations" });
    }
  });
  app2.post("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      if (req.user.id !== messageData.senderId) {
        return res.status(403).json({ message: "You can only send messages as yourself" });
      }
      if (messageData.bookingId) {
        const booking = await storage.getBooking(messageData.bookingId);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }
        const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
        if (req.user.id !== booking.guestId && req.user.id !== teeTime?.hostId) {
          return res.status(403).json({ message: "You must be part of the booking to send messages" });
        }
      }
      const message = await storage.createMessage(messageData);
      const recipientSocket = connections.get(messageData.receiverId);
      if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
        recipientSocket.send(JSON.stringify({
          type: "message",
          data: message
        }));
      }
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid data", details: error.errors });
      }
      res.status(500).json({ message: "Error sending message" });
    }
  });
  app2.put("/api/messages/:id/read", isAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      if (req.user.id !== message.receiverId) {
        return res.status(403).json({ message: "Only the recipient can mark a message as read" });
      }
      const updatedMessage = await storage.markMessageAsRead(messageId);
      res.json(updatedMessage);
    } catch (error) {
      res.status(500).json({ message: "Error marking message as read" });
    }
  });
  app2.post("/api/create-direct-payment-intent", isAuthenticated, async (req, res) => {
    try {
      const { amount, teeTimeId, metadata } = req.body;
      console.log("Creating direct payment intent:", { amount, teeTimeId });
      if (!amount || !teeTimeId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const teeTime = await storage.getTeeTimeListing(teeTimeId);
      if (!teeTime) {
        console.error("Tee time not found:", teeTimeId);
        return res.status(404).json({ message: "Tee time not found" });
      }
      if (teeTime.status !== "available") {
        return res.status(400).json({ message: "This tee time is no longer available" });
      }
      const club = await storage.getClub(teeTime.clubId);
      const clubName = club ? club.name : "Golf Club";
      const formattedDate = new Date(teeTime.date).toLocaleDateString();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        // Convert to cents
        currency: "usd",
        payment_method_types: ["card"],
        // Restrict to cards only
        payment_method_options: {
          card: {
            // Ensure only card payments are allowed
            request_three_d_secure: "automatic"
          }
        },
        // Disallow any automatic payment method selection
        automatic_payment_methods: { enabled: false },
        metadata: {
          teeTimeId: teeTimeId.toString(),
          guestId: req.user.id.toString(),
          ...metadata
        },
        description: `Tee time booking at ${clubName} for ${formattedDate}`
      });
      console.log("Direct payment intent created:", paymentIntent.id);
      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (error) {
      console.error("Error creating direct payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent" });
    }
  });
  app2.post("/api/bookings/:bookingId/confirm-manual", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      console.log(`[MANUAL CONFIRM] Starting manual confirmation for booking ${bookingId}`);
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        console.log(`[MANUAL CONFIRM] Booking ${bookingId} not found`);
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.guestId !== req.user.id) {
        console.log(`[MANUAL CONFIRM] User ${req.user.id} is not authorized to confirm booking ${bookingId} (belongs to user ${booking.guestId})`);
        return res.status(403).json({ message: "Forbidden - You are not authorized to confirm this booking" });
      }
      if (booking.status === "confirmed") {
        console.log(`[MANUAL CONFIRM] Booking ${bookingId} is already confirmed, returning existing booking`);
        return res.status(200).json({
          status: "success",
          message: "Booking is already confirmed",
          booking
        });
      }
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if (!teeTime) {
        console.error(`[MANUAL CONFIRM] Tee time ${booking.teeTimeId} not found for booking ${bookingId}`);
        return res.status(404).json({ message: "Tee time for this booking not found" });
      }
      if (teeTime.status === "booked") {
        const existingBookings = await storage.getBookingsByTeeTimeId(booking.teeTimeId);
        const otherConfirmedBookings = existingBookings.filter(
          (b) => b.id !== booking.id && b.status === "confirmed"
        );
        if (otherConfirmedBookings.length > 0) {
          console.error(`[MANUAL CONFIRM] Tee time ${booking.teeTimeId} is already booked by another user`);
          await storage.updateBookingStatus(bookingId, "cancelled");
          return res.status(409).json({
            message: "This tee time has already been booked by someone else",
            status: "cancelled"
          });
        }
      }
      const confirmableStates = ["pending", "payment_pending", "payment_processing"];
      if (!confirmableStates.includes(booking.status)) {
        console.error(`[MANUAL CONFIRM] Booking ${bookingId} is in ${booking.status} state, not confirmable`);
        return res.status(400).json({
          message: `Cannot confirm booking in ${booking.status} state`
        });
      }
      console.log(`[MANUAL CONFIRM] Attempting to confirm booking ${bookingId} for user ${req.user.id}`);
      let confirmedBooking;
      let paymentStatus = "none";
      if (booking.stripePaymentIntentId) {
        try {
          console.log(`[MANUAL CONFIRM] Checking payment intent ${booking.stripePaymentIntentId} status with Stripe`);
          const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
          paymentStatus = paymentIntent.status;
          console.log(`[MANUAL CONFIRM] Payment intent ${booking.stripePaymentIntentId} has status: ${paymentStatus}`);
          if (paymentStatus === "succeeded" || paymentStatus === "requires_capture" || paymentStatus === "processing") {
            console.log(`[MANUAL CONFIRM] Payment is in a successful state (${paymentStatus}), confirming booking`);
            try {
              confirmedBooking = await booking_service_default.confirmBooking(bookingId, booking.stripePaymentIntentId);
              console.log(`[MANUAL CONFIRM] Successfully confirmed booking ${bookingId} through booking service`);
            } catch (confirmError) {
              console.error(`[MANUAL CONFIRM] Error confirming through booking service:`, confirmError);
              confirmedBooking = await storage.updateBookingStatus(bookingId, "confirmed");
              if (booking.teeTimeId) {
                await storage.updateTeeTimeListing(booking.teeTimeId, { status: "booked" });
              }
              console.log(`[MANUAL CONFIRM] Manually updated booking ${bookingId} status to confirmed`);
            }
          } else if (paymentStatus === "requires_confirmation") {
            console.log(`[MANUAL CONFIRM] Payment requires confirmation, attempting to confirm with Stripe`);
            try {
              const confirmedIntent = await stripe.paymentIntents.confirm(booking.stripePaymentIntentId);
              console.log(`[MANUAL CONFIRM] Payment confirmation result: ${confirmedIntent.status}`);
              if (confirmedIntent.status === "succeeded" || confirmedIntent.status === "requires_capture" || confirmedIntent.status === "processing") {
                confirmedBooking = await booking_service_default.confirmBooking(bookingId, booking.stripePaymentIntentId);
                console.log(`[MANUAL CONFIRM] Successfully confirmed booking ${bookingId} after payment confirmation`);
              } else {
                console.log(`[MANUAL CONFIRM] Payment confirmation did not result in success: ${confirmedIntent.status}`);
              }
            } catch (confirmError) {
              console.error(`[MANUAL CONFIRM] Error confirming payment with Stripe:`, confirmError);
            }
          }
        } catch (stripeError) {
          console.error(`[MANUAL CONFIRM] Error checking payment status with Stripe:`, stripeError);
        }
      }
      if (!confirmedBooking) {
        console.log(`[MANUAL CONFIRM] No confirmedBooking yet, proceeding with manual confirmation`);
        const paymentId = booking.stripePaymentIntentId || `manual_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        try {
          confirmedBooking = await booking_service_default.confirmBooking(bookingId, paymentId);
          console.log(`[MANUAL CONFIRM] Successfully confirmed booking ${bookingId} with payment ID ${paymentId}`);
        } catch (bookingServiceError) {
          console.error(`[MANUAL CONFIRM] Booking service error:`, bookingServiceError);
          confirmedBooking = await storage.updateBookingStatus(bookingId, "confirmed");
          if (booking.teeTimeId) {
            await storage.updateTeeTimeListing(booking.teeTimeId, { status: "booked" });
          }
          console.log(`[MANUAL CONFIRM] Directly updated booking status for ${bookingId} to confirmed`);
        }
      }
      try {
        const notificationsModule = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
        if (notificationsModule.notifyBookingStatusChange) {
          await notificationsModule.notifyBookingStatusChange(bookingId, "confirmed");
          console.log(`[MANUAL CONFIRM] Sent booking confirmation notification for ${bookingId}`);
        }
      } catch (notifyError) {
        console.error(`[MANUAL CONFIRM] Error sending notification:`, notifyError);
      }
      console.log(`[MANUAL CONFIRM] Manual confirmation completed successfully for booking ${bookingId}`);
      res.status(200).json({
        status: "success",
        message: "Booking confirmed successfully",
        booking: confirmedBooking,
        paymentStatus,
        manualConfirmation: true
      });
    } catch (error) {
      console.error("[MANUAL CONFIRM] Error in manual confirmation process:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to confirm booking",
        error: error.stack || "No stack trace available"
      });
    }
  });
  app2.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      const { bookingId } = req.body;
      console.log("Creating payment intent for booking:", bookingId);
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        console.error("Booking not found:", bookingId);
        return res.status(404).json({ message: "Booking not found" });
      }
      console.log("Booking found:", JSON.stringify(booking));
      if (req.user.id !== booking.guestId) {
        console.error("User is not the guest:", req.user.id, "vs", booking.guestId);
        return res.status(403).json({ message: "You can only pay for your own bookings" });
      }
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if (!teeTime) {
        console.error("Tee time not found:", booking.teeTimeId);
        return res.status(404).json({ message: "Tee time not found" });
      }
      console.log("Tee time found:", JSON.stringify(teeTime));
      const totalPrice = booking.totalPrice || teeTime.price || 100;
      const amount = Math.round(totalPrice * 100);
      console.log("Payment amount:", amount, "cents");
      if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "") {
        console.log("NOTICE: Using mock payment flow since Stripe API key is not configured");
        const mockClientSecret = `mock_pi_${Date.now()}_secret_${Math.random().toString(36).substring(2, 15)}`;
        const mockPaymentIntentId = `mock_pi_${Date.now()}`;
        await storage.updateBooking(booking.id, {
          stripePaymentIntentId: mockPaymentIntentId,
          status: "payment_pending"
        });
        return res.json({ clientSecret: mockClientSecret, isMock: true });
      }
      console.log("Creating Stripe payment intent with real API key");
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        payment_method_types: ["card"],
        // Restrict to cards only
        payment_method_options: {
          card: {
            // Ensure only card payments are allowed
            request_three_d_secure: "automatic"
          }
        },
        // Disallow any automatic payment method selection
        automatic_payment_methods: { enabled: false },
        metadata: {
          bookingId: booking.id.toString(),
          teeTimeId: teeTime.id.toString(),
          guestId: booking.guestId.toString(),
          hostId: teeTime.hostId.toString(),
          directPayment: "true"
        }
      });
      console.log("Payment intent created successfully:", paymentIntent.id);
      await storage.updateBooking(booking.id, {
        stripePaymentIntentId: paymentIntent.id,
        status: "payment_pending"
      });
      return res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Payment intent creation error:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });
  app2.post("/api/capture-payment", isAuthenticated, async (req, res) => {
    try {
      const { bookingId } = req.body;
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if (!teeTime) {
        return res.status(404).json({ message: "Tee time not found" });
      }
      if (req.user.id !== teeTime.hostId) {
        return res.status(403).json({ message: "Only the host can capture the payment" });
      }
      if (!booking.stripePaymentIntentId) {
        return res.status(400).json({ message: "No payment intent associated with this booking" });
      }
      if (booking.status !== "completed" || !booking.completedAt) {
        return res.status(400).json({ message: "Booking must be completed before capturing payment" });
      }
      const hoursSinceCompletion = (Date.now() - booking.completedAt.getTime()) / (1e3 * 60 * 60);
      if (hoursSinceCompletion < 24) {
        return res.status(400).json({
          message: "Payment will be captured automatically 24 hours after completion",
          hoursRemaining: 24 - hoursSinceCompletion
        });
      }
      const paymentIntent = await stripe.paymentIntents.capture(booking.stripePaymentIntentId);
      try {
        const { notifyHostPayment: notifyHostPayment2 } = (init_notifications(), __toCommonJS(notifications_exports));
        const amount = booking.totalPrice;
        await notifyHostPayment2(booking.id, amount);
        console.log(`Sent payment notification for booking ${booking.id}`);
      } catch (notificationError) {
        console.error("Error sending payment notification:", notificationError);
      }
      res.json({ success: true, paymentIntent });
    } catch (error) {
      res.status(500).json({ message: "Error capturing payment: " + error.message });
    }
  });
  app2.post("/api/create-connect-account", isAuthenticated, isHost, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.stripeConnectId) {
        return res.status(400).json({ message: "You already have a connected account" });
      }
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email || void 0,
        metadata: {
          userId: user.id.toString()
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        }
      });
      await storage.updateUserStripeInfo(userId, {
        customerId: user.stripeCustomerId || "pending",
        connectId: account.id
      });
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${req.headers.origin}/dashboard`,
        return_url: `${req.headers.origin}/dashboard`,
        type: "account_onboarding"
      });
      res.json({ accountLink: accountLink.url });
    } catch (error) {
      res.status(500).json({ message: "Error creating connect account: " + error.message });
    }
  });
  app2.use("/api/notifications", notifications_default);
  app2.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    console.log("[STRIPE WEBHOOK] ===== Received at", (/* @__PURE__ */ new Date()).toISOString(), "=====");
    const sendAcknowledgment = () => {
      res.status(200).json({ received: true });
    };
    try {
      const headers = { ...req.headers };
      if (headers["stripe-signature"]) {
        headers["stripe-signature"] = "PRESENT (redacted)";
      }
      console.log("[STRIPE WEBHOOK] Headers:", JSON.stringify(headers));
      const signature = req.headers["stripe-signature"];
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.warn("STRIPE_WEBHOOK_SECRET is not set, webhook events cannot be verified");
        sendAcknowledgment();
        return;
      }
      if (!signature) {
        console.error("Missing stripe-signature header in webhook request");
        sendAcknowledgment();
        return;
      }
      console.log("Webhook body type:", typeof req.body);
      console.log("Webhook body is Buffer?", Buffer.isBuffer(req.body));
      console.log("Webhook body size:", req.body ? Buffer.isBuffer(req.body) ? req.body.length : JSON.stringify(req.body).length : 0);
      let event2;
      try {
        event2 = stripe.webhooks.constructEvent(
          req.body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log("Webhook signature verified successfully!");
        sendAcknowledgment();
      } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        console.error("Webhook verification error details:", err);
        sendAcknowledgment();
        return;
      }
      console.log(`[STRIPE WEBHOOK] Processing event: ${event2.type} with ID: ${event2.id || "unknown_id"}`);
      const eventId = event2.id || "unknown_id";
      if (processedEvents.has(eventId)) {
        console.log(`[STRIPE WEBHOOK] Event ${eventId} already processed, skipping`);
        return;
      }
      processedEvents.add(eventId);
      let bookingId = void 0;
      let teeTimeId = void 0;
      let guestId = void 0;
      let numberOfPlayers = void 0;
      let booking = void 0;
      let teeTime = void 0;
      let host = void 0;
      let guest = void 0;
      let notificationsModule = void 0;
      const eventObject = event2.data.object;
      if (eventObject) {
        if (eventObject.id) {
          try {
            const bookingsWithIntent = await storage.getBookingsByPaymentIntent(eventObject.id);
            if (bookingsWithIntent && bookingsWithIntent.length > 0) {
              booking = bookingsWithIntent[0];
              bookingId = booking.id;
              console.log(`[STRIPE WEBHOOK] Found booking ${bookingId} by payment intent ${eventObject.id}`);
              if (booking) {
                teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
                if (teeTime) {
                  host = await storage.getUser(teeTime.hostId);
                  guest = await storage.getUser(booking.guestId);
                }
              }
            }
          } catch (lookupError) {
            console.error(`[STRIPE WEBHOOK] Error looking up bookings by payment intent:`, lookupError);
          }
        }
        if (!booking && eventObject.metadata) {
          if (eventObject.metadata.bookingId) {
            bookingId = parseInt(eventObject.metadata.bookingId);
            if (!isNaN(bookingId)) {
              booking = await storage.getBooking(bookingId);
              if (booking) {
                console.log(`[STRIPE WEBHOOK] Found booking ${bookingId} from metadata`);
                teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
                if (teeTime) {
                  host = await storage.getUser(teeTime.hostId);
                  guest = await storage.getUser(booking.guestId);
                }
              }
            }
          }
        } else if (eventObject.metadata.teeTimeId && eventObject.metadata.guestId) {
          teeTimeId = parseInt(eventObject.metadata.teeTimeId);
          guestId = parseInt(eventObject.metadata.guestId);
          numberOfPlayers = parseInt(eventObject.metadata.numberOfPlayers || "1");
          if (!isNaN(teeTimeId) && !isNaN(guestId)) {
            teeTime = await storage.getTeeTimeListing(teeTimeId);
            if (teeTime) {
              host = await storage.getUser(teeTime.hostId);
              guest = await storage.getUser(guestId);
              if (teeTime.clubId) {
                teeTime.club = await storage.getClub(teeTime.clubId);
              }
            }
          }
        }
      }
      switch (event2.type) {
        case "payment_intent.created":
          console.log(`PaymentIntent ${eventObject.id || "unknown"} created for booking ${bookingId || "unknown"}`);
          break;
        case "payment_intent.succeeded":
          console.log(`PaymentIntent ${eventObject.id || "unknown"} succeeded (Webhook event)`);
          if (eventObject.status !== "succeeded") {
            console.error(`PaymentIntent ${eventObject.id} webhook shows succeeded event but intent status is ${eventObject.status}. Skipping confirmation.`);
            return;
          }
          if (!eventObject.metadata || !eventObject.metadata.bookingId && !eventObject.metadata.teeTimeId) {
            console.error(`PaymentIntent ${eventObject.id} has no valid metadata. Cannot link to booking.`);
            return;
          }
          if (booking && bookingId && booking.status !== "confirmed") {
            try {
              console.log(`Attempting to confirm booking ${bookingId} with payment ${eventObject.id}`);
              await booking_service_default.confirmBooking(bookingId, eventObject.id || "");
              console.log(`Booking ${bookingId} confirmed through booking service`);
            } catch (error) {
              console.error(`Error confirming booking ${bookingId}:`, error);
              await storage.updateBookingStatus(bookingId, "confirmed");
              if (teeTime) {
                console.log(`Marking tee time ${teeTime.id} as booked due to successful payment for booking ${bookingId}`);
                await storage.updateTeeTimeListing(teeTime.id, { status: "booked" });
              }
            }
          } else if (teeTime && teeTimeId && guestId && numberOfPlayers) {
            console.log(`Processing direct payment for tee time ${teeTimeId} by user ${guestId} (Webhook event)`);
            if (teeTime.status !== "available") {
              console.error(`Tee time ${teeTimeId} is no longer available (status: ${teeTime.status})`);
              return res.json({
                received: true,
                status: "tee_time_unavailable",
                message: `Tee time ${teeTimeId} is no longer available`
              });
            }
            try {
              const totalPrice = teeTime.price * numberOfPlayers;
              const bookingData = {
                teeTimeId,
                guestId,
                numberOfPlayers,
                totalPrice,
                status: "confirmed",
                // Directly create as confirmed since payment succeeded
                stripePaymentIntentId: eventObject.id || "",
                createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                completedAt: null
              };
              const newBooking = await storage.createBooking(bookingData);
              if (!newBooking || !newBooking.id) {
                console.error("Booking creation failed - no valid booking returned");
                return res.json({
                  received: true,
                  status: "booking_creation_failed",
                  message: "Failed to create booking record"
                });
              }
              console.log(`New booking ${newBooking.id} created from direct payment`);
              try {
                await storage.updateTeeTimeListing(teeTimeId, { status: "booked" });
                console.log(`Tee time ${teeTimeId} marked as booked`);
              } catch (teeTimeError) {
                console.error(`Failed to update tee time status to booked:`, teeTimeError);
              }
              bookingId = newBooking.id;
              booking = newBooking;
            } catch (error) {
              console.error(`Error creating booking from direct payment:`, error);
              return res.json({
                received: true,
                status: "booking_creation_error",
                message: `Error during booking creation: ${error instanceof Error ? error.message : "Unknown error"}`
              });
            }
          }
          if (booking && bookingId) {
            try {
              notificationsModule = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
              if (notificationsModule.notifyBookingStatusChange) {
                console.log(`Sending confirmation notification for booking ${bookingId}`);
                await notificationsModule.notifyBookingStatusChange(bookingId, "confirmed");
                console.log(`Confirmation notification sent successfully for booking ${bookingId}`);
              } else {
                console.warn(`Notification module loaded but notifyBookingStatusChange function not found`);
              }
            } catch (notifyError) {
              console.error(`Error sending confirmation notification for booking ${bookingId}:`, notifyError);
            }
          } else {
            console.warn(`No valid booking found for sending confirmation notification`);
          }
          break;
        case "payment_intent.payment_failed":
          console.log(`PaymentIntent ${eventObject.id || "unknown"} failed for booking ${bookingId || "unknown"}`);
          const failureMessage = eventObject.last_payment_error ? eventObject.last_payment_error.message : "Unknown payment failure reason";
          console.log(`Payment failure reason: ${failureMessage}`);
          if (booking && bookingId) {
            try {
              await storage.updateBookingStatus(bookingId, "payment_failed");
              console.log(`Updated booking ${bookingId} status to payment_failed`);
              if (teeTime) {
                try {
                  console.log(`Restoring tee time ${teeTime.id} to available status due to failed payment for booking ${bookingId}`);
                  await storage.updateTeeTimeListing(teeTime.id, { status: "available" });
                  console.log(`Successfully restored tee time ${teeTime.id} to available status`);
                } catch (teeTimeError) {
                  console.error(`Failed to restore tee time status to available:`, teeTimeError);
                }
              }
              try {
                notificationsModule = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
                if (notificationsModule.notifyBookingStatusChange) {
                  console.log(`Sending payment_failed notification for booking ${bookingId}`);
                  await notificationsModule.notifyBookingStatusChange(bookingId, "payment_failed");
                }
              } catch (notifyError) {
                console.error("Error sending payment failed notification:", notifyError);
              }
            } catch (statusError) {
              console.error(`Failed to update booking status to payment_failed:`, statusError);
            }
          } else {
            console.warn(`No valid booking found for payment_failed event`);
          }
          break;
        case "payment_intent.canceled":
          console.log(`PaymentIntent ${eventObject.id || "unknown"} canceled for booking ${bookingId || "unknown"}`);
          const cancellationReason = eventObject.cancellation_reason || "Unknown cancellation reason";
          console.log(`Payment cancellation reason: ${cancellationReason}`);
          if (booking && bookingId) {
            try {
              console.log(`Attempting to cancel booking ${bookingId} through booking service`);
              await booking_service_default.cancelBooking(bookingId, `Payment intent canceled: ${eventObject.id} (${cancellationReason})`);
              console.log(`Booking ${bookingId} cancelled successfully through booking service`);
            } catch (error) {
              console.error(`Error using booking service to cancel booking ${bookingId}:`, error);
              try {
                console.log(`Attempting manual cancellation for booking ${bookingId}`);
                await storage.updateBookingStatus(bookingId, "canceled");
                console.log(`Booking ${bookingId} manually marked as canceled`);
                if (teeTime && teeTimeId) {
                  console.log(`Restoring tee time ${teeTimeId} to available status manually`);
                  await storage.updateTeeTimeListing(teeTimeId, { status: "available" });
                  console.log(`Tee time ${teeTimeId} status successfully restored to available`);
                }
              } catch (manualError) {
                console.error(`Manual cancellation also failed for booking ${bookingId}:`, manualError);
              }
            }
            try {
              console.log(`Sending cancellation notification for booking ${bookingId}`);
              notificationsModule = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
              if (notificationsModule.notifyBookingStatusChange) {
                await notificationsModule.notifyBookingStatusChange(bookingId, "canceled");
                console.log(`Cancellation notification sent successfully for booking ${bookingId}`);
              } else {
                console.warn(`Notification module loaded but notifyBookingStatusChange function not found`);
              }
            } catch (notifyError) {
              console.error(`Error sending cancellation notification for booking ${bookingId}:`, notifyError);
            }
          } else {
            console.warn(`No valid booking found for payment_intent.canceled event`);
          }
          break;
        case "charge.captured":
          const paymentIntentId = eventObject.payment_intent ? String(eventObject.payment_intent) : "unknown";
          console.log(`Charge captured for PaymentIntent ${paymentIntentId} and booking ${bookingId || "unknown"}`);
          const chargeAmount = eventObject.amount ? `$${(eventObject.amount / 100).toFixed(2)}` : "unknown amount";
          console.log(`Charge details: ${chargeAmount} (${eventObject.currency || "unknown currency"})`);
          if (booking && host && bookingId) {
            try {
              console.log(`Updating booking ${bookingId} status to indicate payment completed to host`);
              await storage.updateBookingStatus(bookingId, "payment_completed_to_host");
              console.log(`Booking ${bookingId} status updated to payment_completed_to_host`);
            } catch (statusError) {
              console.error(`Error updating booking status for payment completion:`, statusError);
            }
            try {
              console.log(`Sending host payment notification for booking ${bookingId}`);
              notificationsModule = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
              if (notificationsModule.notifyHostPayment && booking) {
                console.log(`Using specialized host payment notification for booking ${bookingId}`);
                await notificationsModule.notifyHostPayment(bookingId, booking.totalPrice);
                console.log(`Host payment notification sent successfully for booking ${bookingId}`);
              } else if (notificationsModule.notifyBookingStatusChange) {
                console.log(`Using generic payment notification for booking ${bookingId}`);
                await notificationsModule.notifyBookingStatusChange(bookingId, "payment_completed");
                console.log(`Generic payment notification sent successfully for booking ${bookingId}`);
              } else {
                console.warn(`Notification module loaded but no suitable notification function found`);
              }
            } catch (notifyError) {
              console.error(`Error sending host payment notification for booking ${bookingId}:`, notifyError);
            }
          } else {
            console.warn(`Missing required data for charge.captured event: booking=${!!booking}, host=${!!host}, bookingId=${bookingId}`);
          }
          break;
        case "charge.refunded":
          const refundPaymentId = eventObject.payment_intent ? String(eventObject.payment_intent) : "unknown";
          console.log(`Charge refunded for PaymentIntent ${refundPaymentId} and booking ${bookingId || "unknown"}`);
          const refundReason = eventObject.refunds?.data?.[0]?.reason || "Unknown refund reason";
          console.log(`Refund reason: ${refundReason}`);
          if (booking && bookingId) {
            try {
              console.log(`Updating booking ${bookingId} status to refunded`);
              await storage.updateBookingStatus(bookingId, "refunded");
              console.log(`Booking ${bookingId} successfully marked as refunded`);
            } catch (statusError) {
              console.error(`Error updating booking ${bookingId} status to refunded:`, statusError);
            }
            try {
              console.log(`Sending refund notification for booking ${bookingId}`);
              notificationsModule = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
              if (notificationsModule.notifyBookingStatusChange) {
                await notificationsModule.notifyBookingStatusChange(bookingId, "refunded");
                console.log(`Refund notification sent successfully for booking ${bookingId}`);
              } else {
                console.warn(`Notification module loaded but notifyBookingStatusChange function not found`);
              }
            } catch (notifyError) {
              console.error(`Error sending refund notification for booking ${bookingId}:`, notifyError);
            }
          } else {
            console.warn(`No valid booking found for charge.refunded event`);
          }
          break;
        default:
          console.log(`Received unhandled Stripe event type: ${event2.type}`);
      }
      const response = {
        received: true,
        event_type: event2.type,
        event_id: event2.id || "unknown_id",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        message: "Webhook event processed successfully",
        // Add metadata for debugging specific to each event type
        details: {}
      };
      const details = {};
      if (bookingId) details.bookingId = bookingId;
      if (teeTimeId) details.teeTimeId = teeTimeId;
      if (eventObject.id) details.objectId = eventObject.id;
      response.details = details;
      console.log(`[STRIPE WEBHOOK] Successful response for ${event2.type}:`, response);
      console.log(`[STRIPE WEBHOOK] ===== Event processed successfully at ${(/* @__PURE__ */ new Date()).toISOString()} =====`);
      res.json(response);
    } catch (error) {
      console.error("Error processing webhook event:", error);
      let errorMessage = "Error processing webhook event";
      if (error instanceof Error) {
        errorMessage = `Error processing webhook event: ${error.message}`;
        console.error(`Error stack: ${error.stack}`);
      }
      if (event) {
        const eventId = event.id ? String(event.id) : "unknown";
        const eventType = typeof event.type === "string" ? event.type : "unknown";
        console.error(`[STRIPE WEBHOOK] Failed event type: ${eventType}, ID: ${eventId}`);
      }
      console.error(`----- Webhook processing FAILED at ${(/* @__PURE__ */ new Date()).toISOString()} -----`);
      res.status(500).json({
        received: false,
        error: errorMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws) => {
    let userId = null;
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "auth" && data.userId) {
          userId = parseInt(data.userId);
          connections.set(userId, ws);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    ws.on("close", () => {
      if (userId !== null) {
        connections.delete(userId);
      }
    });
  });
  return httpServer;
}

// backend/vite.ts
import express2 from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss({ config: path.resolve(import.meta.dirname, "tailwind.config.ts") }),
        autoprefixer()
      ]
    }
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "frontend", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "frontend"),
  envDir: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// backend/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "frontend",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// backend/reminder-service.ts
init_storage();
init_notifications();
async function checkReminders() {
  try {
    console.log("Checking for reminders to send...");
    const now = /* @__PURE__ */ new Date();
    await checkOneWeekReminders(now);
    await checkOneDayReminders(now);
    console.log("Reminder check completed");
  } catch (error) {
    console.error("Error checking reminders:", error);
  }
}
async function checkOneWeekReminders(now) {
  try {
    const bookings2 = await storage.getRemindersToSend("one_week", now);
    if (bookings2.length === 0) {
      console.log("No one week reminders to send");
      return;
    }
    console.log(`Found ${bookings2.length} one week reminders to send`);
    for (const booking of bookings2) {
      try {
        await sendOneWeekReminder(booking.id);
        console.log(`One week reminder sent for booking ${booking.id}`);
      } catch (error) {
        console.error(`Error sending one week reminder for booking ${booking.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error checking one week reminders:", error);
  }
}
async function checkOneDayReminders(now) {
  try {
    const bookings2 = await storage.getRemindersToSend("one_day", now);
    if (bookings2.length === 0) {
      console.log("No one day reminders to send");
      return;
    }
    console.log(`Found ${bookings2.length} one day reminders to send`);
    for (const booking of bookings2) {
      try {
        await sendOneDayReminder(booking.id);
        console.log(`One day reminder sent for booking ${booking.id}`);
      } catch (error) {
        console.error(`Error sending one day reminder for booking ${booking.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error checking one day reminders:", error);
  }
}
function startReminderService() {
  console.log("Starting reminder service...");
  checkReminders().catch((err) => {
    console.error("Error in reminder service:", err);
  });
  const interval = setInterval(() => {
    checkReminders().catch((err) => {
      console.error("Error in reminder service:", err);
    });
  }, 60 * 60 * 1e3);
  return interval;
}

// backend/index.ts
var app = express3();
var jsonParser = express3.json({ limit: "50mb" });
var urlEncodedParser = express3.urlencoded({ extended: false, limit: "50mb" });
app.use((req, res, next) => {
  if (req.path === "/api/webhook") {
    return next();
  }
  jsonParser(req, res, next);
});
app.use((req, res, next) => {
  if (req.path === "/api/webhook") {
    return next();
  }
  urlEncodedParser(req, res, next);
});
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 3001;
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`serving on port ${port}`);
    startReminderService();
    log(`reminder service started`);
    booking_service_default.init();
    log(`booking service started`);
  });
})();
