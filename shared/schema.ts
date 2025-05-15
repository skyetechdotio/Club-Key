import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(), 
  username: text("username").unique(), // Keeping for backward compatibility but making optional
  email: text("email").unique(),
  password: text("password"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  bio: text("bio"),
  profileImage: text("profile_image"),
  profileImageUrl: text("profile_image_url"), // Profile image URL
  isHost: boolean("is_host").default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeConnectId: text("stripe_connect_id"),
  googleId: text("google_id").unique(),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  onboardingCompleted: boolean("onboarding_completed").default(false),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    email: true,
    password: true,
    firstName: true,
    lastName: true,
    isHost: true,
    profileImage: true,
    profileImageUrl: true,
    googleId: true,
    username: true, // Optional, keeping for backward compatibility
    onboardingCompleted: true,
  })
  .extend({
    // Explicitly mark these fields as optional
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    profileImage: z.string().optional(),
    profileImageUrl: z.string().optional(),
    googleId: z.string().optional(),
    username: z.string().optional(),
    isHost: z.boolean().optional(),
    onboardingCompleted: z.boolean().optional(),
  });

// Schema for standard user updates
export const upsertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    email: true,
    firstName: true,
    lastName: true,
    bio: true,
    profileImage: true,
    profileImageUrl: true,
    isHost: true,
    onboardingCompleted: true,
  })
  .extend({
    // Explicitly mark these fields as optional
    username: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    bio: z.string().optional(),
    profileImage: z.string().optional(),
    profileImageUrl: z.string().optional(),
    isHost: z.boolean().optional(),
    onboardingCompleted: z.boolean().optional(),
  });

// Clubs that hosts are members of
export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClubSchema = createInsertSchema(clubs).pick({
  name: true,
  location: true,
  description: true,
  imageUrl: true,
});

// Relationship between users and clubs (for member hosts)
export const userClubs = pgTable("user_clubs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clubId: integer("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  memberSince: timestamp("member_since").defaultNow(),
});

export const insertUserClubSchema = createInsertSchema(userClubs).pick({
  userId: true,
  clubId: true,
  memberSince: true,
});

// Tee time listings
export const teeTimeListing = pgTable("tee_time_listings", {
  id: serial("id").primaryKey(),
  hostId: integer("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clubId: integer("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  price: doublePrecision("price").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  playersAllowed: integer("players_allowed").notNull().default(4),
  notes: text("notes"),
  status: text("status").notNull().default("available"), // available, pending, booked, cancelled
});

export const insertTeeTimeListingSchema = createInsertSchema(teeTimeListing)
  .pick({
    hostId: true,
    clubId: true,
    date: true,
    price: true,
    playersAllowed: true,
    notes: true,
    status: true,
  })
  .extend({
    notes: z.string().optional(),
    status: z.string().optional().default('available'),
  })
  .transform((data) => ({
    ...data,
    date: data.date instanceof Date ? data.date : new Date(data.date),
  }));

// Bookings
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  teeTimeId: integer("tee_time_id").notNull().references(() => teeTimeListing.id, { onDelete: "cascade" }),
  guestId: integer("guest_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  numberOfPlayers: integer("number_of_players").notNull(),
  status: text("status").notNull().default("pending"), // pending, confirmed, completed, cancelled
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  totalPrice: doublePrecision("total_price").notNull(),
  // Reminder fields
  reminderOneWeek: timestamp("reminder_one_week"),
  reminderOneDay: timestamp("reminder_one_day"),
  reminderOneWeekSent: boolean("reminder_one_week_sent").default(false),
  reminderOneDaySent: boolean("reminder_one_day_sent").default(false),
});

export const insertBookingSchema = createInsertSchema(bookings)
  .pick({
    teeTimeId: true,
    guestId: true,
    numberOfPlayers: true,
    totalPrice: true,
    status: true,
    stripePaymentIntentId: true,
  })
  .extend({
    status: z.string().optional().default('pending'),
    stripePaymentIntentId: z.string().optional(),
  });

// Reviews for hosts, guests and clubs
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  reviewerId: integer("reviewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetId: integer("target_id").notNull(), // Can be userId or clubId
  targetType: text("target_type").notNull(), // "host", "guest", "club"
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviews)
  .pick({
    reviewerId: true,
    targetId: true,
    targetType: true,
    bookingId: true,
    rating: true,
    comment: true,
  })
  .extend({
    comment: z.string().optional(),
    bookingId: z.number().optional(),
  });

// Messages between hosts and guests
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages)
  .pick({
    senderId: true,
    receiverId: true,
    bookingId: true,
    content: true,
  })
  .extend({
    bookingId: z.number().optional(),
  });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClub = z.infer<typeof insertClubSchema>;
export type Club = typeof clubs.$inferSelect;

export type InsertUserClub = z.infer<typeof insertUserClubSchema>;
export type UserClub = typeof userClubs.$inferSelect;

export type InsertTeeTimeListing = z.infer<typeof insertTeeTimeListingSchema>;
export type TeeTimeListing = typeof teeTimeListing.$inferSelect;

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // "booking", "message", "system"
  relatedId: integer("related_id").notNull(), // ID of the related entity (booking, message, etc.)
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications)
  .pick({
    userId: true,
    title: true,
    message: true,
    type: true,
    relatedId: true,
    isRead: true,
  })
  .extend({
    isRead: z.boolean().optional().default(false),
  });

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
