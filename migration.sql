-- Add missing columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token_expiry" TIMESTAMP;

-- Add any other missing columns based on our schema
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_connect_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_image_url" TEXT;

-- Add missing columns to bookings table
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "reminder_one_week" TIMESTAMP;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "reminder_one_day" TIMESTAMP;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "reminder_one_week_sent" BOOLEAN DEFAULT FALSE;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "reminder_one_day_sent" BOOLEAN DEFAULT FALSE;