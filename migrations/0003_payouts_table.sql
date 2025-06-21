-- Migration: Add payouts table for tracking host payouts
-- This supports the platform collection model where we collect payments and transfer to hosts

CREATE TABLE "payouts" (
  "id" serial PRIMARY KEY NOT NULL,
  "booking_id" integer NOT NULL,
  "host_id" text NOT NULL,
  "stripe_transfer_id" text NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "platform_fee" numeric(10,2) NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "processed_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "payouts_booking_id_unique" UNIQUE("booking_id"),
  CONSTRAINT "payouts_stripe_transfer_id_unique" UNIQUE("stripe_transfer_id")
);

-- Add foreign key constraints
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_booking_id_fkey" 
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE;

ALTER TABLE "payouts" ADD CONSTRAINT "payouts_host_id_fkey" 
  FOREIGN KEY ("host_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX "payouts_booking_id_idx" ON "payouts"("booking_id");
CREATE INDEX "payouts_host_id_idx" ON "payouts"("host_id");
CREATE INDEX "payouts_status_idx" ON "payouts"("status");
CREATE INDEX "payouts_processed_at_idx" ON "payouts"("processed_at");

-- Add check constraints
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_amount_positive" 
  CHECK ("amount" > 0);

ALTER TABLE "payouts" ADD CONSTRAINT "payouts_platform_fee_non_negative" 
  CHECK ("platform_fee" >= 0);

ALTER TABLE "payouts" ADD CONSTRAINT "payouts_status_valid" 
  CHECK ("status" IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));