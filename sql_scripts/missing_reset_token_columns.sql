-- Missing columns for password reset functionality
-- These were in the original migration.sql but not in Drizzle Kit migrations
-- Run these manually if password reset functionality is needed

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "reset_token" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "reset_token_expiry" TIMESTAMP; 