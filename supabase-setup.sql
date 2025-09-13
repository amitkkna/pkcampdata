-- IMPORTANT: If you saw "permission denied to set role 'supabase_admin'":
-- - Do NOT use SET ROLE. This script does not require it.
-- - In the Supabase Dashboard SQL Editor, run this with the Owner role (postgres) if available.
-- - If you cannot run DDL (CREATE POLICY/INSERT INTO storage.buckets) due to permissions,
--   use the Storage UI instead (steps below) or ask a project Owner to run this file.
--
-- Storage UI alternative (no SQL privileges needed):
-- 1) Go to Storage → New bucket → id: campaign-photos → Public: ON → Create bucket.
-- 2) Open the bucket → Policies → New Policy →
--    - Create 4 policies on table storage.objects, each scoped to this bucket:
--      a) SELECT:   USING: bucket_id = 'campaign-photos'
--      b) INSERT:   WITH CHECK: bucket_id = 'campaign-photos'
--      c) UPDATE:   USING: bucket_id = 'campaign-photos'  AND  WITH CHECK: bucket_id = 'campaign-photos'
--      d) DELETE:   USING: bucket_id = 'campaign-photos'
-- This makes uploads/reads work for public demos. Tighten later for real auth.

-- Ensure UUID generation function is available
create extension if not exists pgcrypto;

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  target_audience TEXT,
  budget DECIMAL(10,2),
  objectives TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create visits table
CREATE TABLE IF NOT EXISTS visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  notes TEXT,
  photo_url_1 TEXT,
  photo_url_2 TEXT,
  photo_url_3 TEXT,
  photo_url_4 TEXT,
  original_filename_1 TEXT,
  original_filename_2 TEXT,
  original_filename_3 TEXT,
  original_filename_4 TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_visits_campaign_id ON visits(campaign_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(date);
CREATE INDEX IF NOT EXISTS idx_campaigns_start_date ON campaigns(start_date);

-- Create folders table for location-based photo organization
CREATE TABLE IF NOT EXISTS folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- e.g., "Bemetara"
  location TEXT NOT NULL, -- Location name for photo naming
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create folder_photos table for structured photo storage
CREATE TABLE IF NOT EXISTS folder_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL, -- Auto-generated: Location-Campaign-Date format
  original_name TEXT NOT NULL, -- Original uploaded filename
  photo_url TEXT NOT NULL, -- Supabase Storage URL
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for folder tables
CREATE INDEX IF NOT EXISTS idx_folders_campaign_id ON folders(campaign_id);
CREATE INDEX IF NOT EXISTS idx_folder_photos_folder_id ON folder_photos(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_photos_upload_date ON folder_photos(upload_date);

-- Insert sample data (optional)
INSERT INTO campaigns (name, client_name, start_date, end_date, description) VALUES
('Demo Campaign With Photos', 'Demo Client', '2025-04-09', '2025-09-18', 'Sample campaign for testing'),
('AMIT KHERA', 'Ayush Indravali', '2025-04-09', '2025-05-09', 'Another test campaign')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (optional but recommended)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_photos ENABLE ROW LEVEL SECURITY;

-- Permissive policies so anyone (anon) can read/write. Adjust for real auth later.
-- Campaigns policies
DROP POLICY IF EXISTS "Allow all operations on campaigns" ON campaigns;
DROP POLICY IF EXISTS "Enable read access for all users" ON campaigns;
DROP POLICY IF EXISTS "Enable insert for all users" ON campaigns;
DROP POLICY IF EXISTS "Enable update for all users" ON campaigns;
DROP POLICY IF EXISTS "Enable delete for all users" ON campaigns;

CREATE POLICY "Enable read access for all users" ON campaigns
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON campaigns
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON campaigns
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON campaigns
  FOR DELETE USING (true);

-- Visits policies
DROP POLICY IF EXISTS "Allow all operations on visits" ON visits;
DROP POLICY IF EXISTS "Enable read access for all users (visits)" ON visits;
DROP POLICY IF EXISTS "Enable insert for all users (visits)" ON visits;
DROP POLICY IF EXISTS "Enable update for all users (visits)" ON visits;
DROP POLICY IF EXISTS "Enable delete for all users (visits)" ON visits;

CREATE POLICY "Enable read access for all users (visits)" ON visits
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users (visits)" ON visits
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users (visits)" ON visits
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users (visits)" ON visits
  FOR DELETE USING (true);

-- Folders policies
CREATE POLICY "Enable read access for all users (folders)" ON folders
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users (folders)" ON folders
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users (folders)" ON folders
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users (folders)" ON folders
  FOR DELETE USING (true);

-- Folder photos policies
CREATE POLICY "Enable read access for all users (folder_photos)" ON folder_photos
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users (folder_photos)" ON folder_photos
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users (folder_photos)" ON folder_photos
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users (folder_photos)" ON folder_photos
  FOR DELETE USING (true);

-- Create storage bucket for photos (run this separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-photos', 'campaign-photos', true);

-- Storage bucket and RLS policies for photo uploads
-- 1. Create the storage bucket for campaign photos (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-photos', 'campaign-photos', true)
ON CONFLICT (id) DO UPDATE SET
  public = true;

-- 2. Create RLS policies for the storage bucket to allow public uploads and reads

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Allow public uploads to campaign-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from campaign-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to campaign-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from campaign-photos" ON storage.objects;

-- Allow public uploads to campaign-photos bucket
CREATE POLICY "Allow public uploads to campaign-photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'campaign-photos'
);

-- Allow public reads from campaign-photos bucket  
CREATE POLICY "Allow public reads from campaign-photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'campaign-photos'
);

-- Allow public updates to campaign-photos bucket (for overwrites)
CREATE POLICY "Allow public updates to campaign-photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'campaign-photos'
) WITH CHECK (
  bucket_id = 'campaign-photos'
);

-- Allow public deletes from campaign-photos bucket
CREATE POLICY "Allow public deletes from campaign-photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'campaign-photos'
);

-- 3. Ensure RLS is enabled on storage.objects (should be by default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE campaigns IS 'Campaign Reporting Generator - Campaign data';
COMMENT ON TABLE visits IS 'Campaign Reporting Generator - Visit tracking data';
COMMENT ON TABLE folders IS 'Campaign Reporting Generator - Location-based photo folders';
COMMENT ON TABLE folder_photos IS 'Campaign Reporting Generator - Organized photos by location';
