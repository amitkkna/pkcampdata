-- Run these commands in your Supabase SQL Editor

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

-- Insert sample data (optional)
INSERT INTO campaigns (name, client_name, start_date, end_date, description) VALUES
('Demo Campaign With Photos', 'Demo Client', '2025-04-09', '2025-09-18', 'Sample campaign for testing'),
('AMIT KHERA', 'Ayush Indravali', '2025-04-09', '2025-05-09', 'Another test campaign')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (optional but recommended)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

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

-- Create storage bucket for photos (run this separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-photos', 'campaign-photos', true);

COMMENT ON TABLE campaigns IS 'Campaign Reporting Generator - Campaign data';
COMMENT ON TABLE visits IS 'Campaign Reporting Generator - Visit tracking data';
