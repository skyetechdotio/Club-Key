-- Fix currency precision issues by changing from double precision to numeric(10,2)
-- This ensures exact decimal precision for currency values

-- Update tee_time_listings price column
ALTER TABLE tee_time_listings 
ALTER COLUMN price TYPE numeric(10,2);

-- Update bookings total_price column  
ALTER TABLE bookings 
ALTER COLUMN total_price TYPE numeric(10,2);

-- Update payouts amount and platform_fee columns (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payouts') THEN
        -- These should already be numeric(10,2) from the payouts migration, but ensure consistency
        ALTER TABLE payouts 
        ALTER COLUMN amount TYPE numeric(10,2),
        ALTER COLUMN platform_fee TYPE numeric(10,2);
    END IF;
END
$$;