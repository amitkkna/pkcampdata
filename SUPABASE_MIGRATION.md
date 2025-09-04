# Supabase Migration Guide

This guide will help you migrate your campaign reporting system to use Supabase as the database and photo storage solution.

## 🚀 Quick Setup

### Step 1: Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new account
2. Create a new project
3. Note down your project details:
   - Project URL: `https://[YOUR-PROJECT-ID].supabase.co`
   - Anon key: Found in Settings > API
   - Service role key: Found in Settings > API
   - Database password: Set during project creation

### Step 2: Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp server/.env.example server/.env
   ```

2. Update the `.env` file with your Supabase credentials:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres"
   DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres"
   SUPABASE_URL="https://[YOUR-PROJECT-ID].supabase.co"
   SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
   SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
   SUPABASE_BUCKET_NAME="campaign-photos"
   ```

### Step 3: Set Up Supabase Storage

1. In your Supabase dashboard, go to Storage
2. Create a new bucket called `campaign-photos`
3. Set the bucket to **Public** (for easy photo access)
4. Configure bucket policies for appropriate access control

### Step 4: Run Database Migration

```bash
cd server
npm run db:migrate
```

This will:
- Update your database schema to use PostgreSQL
- Change photo storage from local files to Supabase URLs
- Generate the new Prisma client

### Step 5: Deploy to Production

#### Option A: Vercel (Recommended for Frontend)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on git push

#### Option B: Railway/Render (For Backend)

1. Connect your GitHub repository
2. Set environment variables
3. Configure build and start commands:
   - Build: `npm run build`
   - Start: `npm start`

## 📝 Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@db.project.supabase.co:5432/postgres` |
| `DIRECT_URL` | Direct database connection | Same as DATABASE_URL |
| `SUPABASE_URL` | Your Supabase project URL | `https://projectid.supabase.co` |
| `SUPABASE_ANON_KEY` | Public anon key for client-side | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Private service role key for server | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `SUPABASE_BUCKET_NAME` | Storage bucket name | `campaign-photos` |
| `MAX_FILE_SIZE` | Max upload size in bytes | `10485760` (10MB) |

## 🔧 Bucket Policies

Add these policies to your Supabase storage bucket for proper access control:

### Allow authenticated uploads:
```sql
CREATE POLICY "Enable authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'campaign-photos');
```

### Allow public reads:
```sql
CREATE POLICY "Enable public reads" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'campaign-photos');
```

### Allow authenticated deletes:
```sql
CREATE POLICY "Enable authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'campaign-photos');
```

## 🚦 Migration from SQLite

If you have existing data in SQLite, you can migrate it:

1. Export your current data:
   ```bash
   npx prisma db seed  # If you have a seed script
   ```

2. Run the migration to create the new schema
3. Manually migrate photos to Supabase Storage if needed

## 🎯 Key Changes Made

### Backend Changes:
- ✅ Updated Prisma schema for PostgreSQL
- ✅ Added Supabase Storage integration
- ✅ Changed `photoPath` fields to `photoUrl` fields
- ✅ Updated file upload handling to use Supabase
- ✅ Added environment variable configuration
- ✅ Updated delete operations to remove files from Supabase

### Frontend Changes:
- ✅ Updated photo display to use direct URLs
- ✅ Removed local file path processing
- ✅ Updated TypeScript interfaces

### Infrastructure:
- ✅ Created environment configuration files
- ✅ Added deployment-ready setup
- ✅ Prepared for production scaling

## 🔍 Testing Your Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Create a test campaign and visit with photos
3. Verify photos are uploaded to Supabase Storage
4. Check that photos display correctly in the UI

## 🚨 Important Notes

- **Security**: Never commit your `.env` file to git
- **Performance**: Supabase Storage provides CDN for faster photo loading
- **Scalability**: PostgreSQL can handle much larger datasets than SQLite
- **Backup**: Supabase provides automatic backups
- **Monitoring**: Use Supabase dashboard for monitoring database and storage usage

## 📞 Support

If you encounter issues:
1. Check Supabase dashboard for errors
2. Verify environment variables are set correctly
3. Check network connectivity to Supabase
4. Review server logs for detailed error messages

Your application is now ready for production deployment with Supabase! 🎉
