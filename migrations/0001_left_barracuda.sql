ALTER TABLE "users" RENAME TO "profiles";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "users_username_unique";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "users_google_id_unique";--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_guest_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_receiver_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_reviewer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tee_time_listings" DROP CONSTRAINT "tee_time_listings_host_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_clubs" DROP CONSTRAINT "user_clubs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "guest_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "sender_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "receiver_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "reviewer_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "target_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tee_time_listings" ALTER COLUMN "host_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_clubs" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "onboarding_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guest_id_profiles_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_profiles_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_profiles_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tee_time_listings" ADD CONSTRAINT "tee_time_listings_host_id_profiles_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_clubs" ADD CONSTRAINT "user_clubs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "password";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "google_id";--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_username_unique" UNIQUE("username");