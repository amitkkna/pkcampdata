# Fix for Photo Upload Error: RLS Policy Issue

## Error
```
Failed to upload photo: JK PAPER 75 GSM A4.jpg - new row violates row-level security policy
```

## Root Cause
Supabase's Row Level Security (RLS) is blocking file uploads to the storage bucket because there are no policies allowing public uploads.

## Solution Steps

### 1. Open Supabase Dashboard
- Go to [supabase.com](https://supabase.com) and login
- Select your project

### 2. Create Storage Bucket (if not exists)
- Go to **Storage** in the left sidebar
- Click **"New bucket"**
- Bucket name: `campaign-photos`
- Set **Public bucket**: `ON` (important!)
- Click **Save**

### 3. Set Up Storage RLS Policies
- Go to **SQL Editor** in the left sidebar
- Click **"New query"**
- Copy and paste this SQL:

```sql
-- Create storage bucket for campaign photos (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-photos', 'campaign-photos', true)
ON CONFLICT (id) DO UPDATE SET
  public = true;

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

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

- Click **Run** to execute

### 4. Verify Local Environment Variables
Create a file called `.env.local` in the `client` folder with your Supabase credentials:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**To find these values:**
- Go to **Settings** → **API** in your Supabase dashboard
- Copy the **Project URL** and **anon public** key

### 5. Restart Development Server
```bash
cd client
npm run dev
```

### 6. Test Photo Upload
- Try uploading a photo again
- Check the browser console for any remaining errors

## Alternative: Quick Test
If you want to test with a temporary debug panel, the code already includes one. Make sure your Supabase environment variables are set correctly.

## Notes
- The bucket must be **public** for anonymous uploads to work
- RLS policies are necessary even for public buckets
- File names are automatically sanitized to remove special characters
