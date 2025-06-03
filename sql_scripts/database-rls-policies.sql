-- RLS Policies for ClubKey Database
-- Run these in your Supabase SQL editor

-- Enable RLS on clubs table
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Allow everyone (including unauthenticated users) to read clubs
-- This makes sense for a golf booking app where people need to see available clubs
CREATE POLICY "Allow public read access to clubs" ON clubs
  FOR SELECT
  TO public
  USING (true);

-- Optional: Allow authenticated users to read all club details
-- (This policy would be redundant with the public policy above, but kept for reference)
CREATE POLICY "Allow authenticated users to read clubs" ON clubs
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: For testing purposes, you might want to insert some sample data
-- INSERT INTO clubs (name, location, description) VALUES 
--   ('Pine Valley Golf Club', 'New Jersey, USA', 'Championship golf course'),
--   ('Augusta National', 'Georgia, USA', 'Home of the Masters Tournament'),
--   ('St. Andrews', 'Scotland, UK', 'The home of golf'); 