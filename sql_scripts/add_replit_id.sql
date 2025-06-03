-- Add replitId column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "replit_id" text UNIQUE;