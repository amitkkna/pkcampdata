# 🚀 Data Migration to Supabase - Step by Step

Follow these steps to migrate your existing SQLite data to Supabase PostgreSQL with photo uploads.

## Prerequisites ✅

1. **Supabase Project Setup**: Your project is created and accessible
2. **Environment Variables**: Your `.env` file is configured with Supabase credentials
3. **Storage Bucket**: Create a bucket named `campaign-photos` in Supabase Storage
4. **Database Password**: Replace `[YOUR-PASSWORD]` in your DATABASE_URL

## Step 1: Update Your Database Password 🔑

Edit your `server/.env` file and replace `[YOUR-PASSWORD]` with your actual Supabase database password:

```env
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.svjnkcxsemhpewjamjyx.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.svjnkcxsemhpewjamjyx.supabase.co:5432/postgres"
```

## Step 2: Create Supabase Storage Bucket 🪣

1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click **Create a new bucket**
4. Name: `campaign-photos`
5. Set as **Public bucket** (for easy photo access)
6. Click **Create bucket**

### Optional: Set Storage Policies
```sql
-- Allow public reads
CREATE POLICY "Enable public reads" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'campaign-photos');

-- Allow authenticated uploads
CREATE POLICY "Enable authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'campaign-photos');
```

## Step 3: Push Database Schema 📊

```bash
cd server
npx prisma db push
```

This will create the new PostgreSQL tables in your Supabase database.

## Step 4: Generate Prisma Client 🛠️

```bash
npx prisma generate
```

This updates the Prisma client with the new schema.

## Step 5: Run Data Migration 📦

```bash
npm run migrate:data
```

This script will:
- ✅ Copy all campaigns from SQLite to PostgreSQL
- ✅ Copy all visits from SQLite to PostgreSQL  
- ✅ Upload all photos from local storage to Supabase Storage
- ✅ Update photo references to use Supabase URLs
- ✅ Preserve all original data and relationships

## Step 6: Verify Migration ✔️

1. **Check Supabase Dashboard**:
   - Go to **Database** → **Table Editor**
   - Verify `campaigns` and `visits` tables have your data

2. **Check Storage**:
   - Go to **Storage** → `campaign-photos`
   - Verify photos are uploaded

3. **Test the Application**:
   ```bash
   npm run dev
   ```
   - Open the application and verify everything works
   - Check that photos load correctly

## Migration Script Details 📋

The migration script (`scripts/migrate-data.ts`) performs these operations:

### Campaigns Migration:
- Copies all campaign data
- Preserves IDs, dates, and relationships
- Converts budget to Decimal type for PostgreSQL

### Visits Migration:
- Copies all visit data
- Processes each photo:
  - Reads from local storage
  - Optimizes image (resize to 1920x1080, 85% quality)
  - Uploads to Supabase Storage
  - Updates database with Supabase URL

### Error Handling:
- Continues migration even if individual photos fail
- Logs detailed progress and any errors
- Maintains data integrity

## Troubleshooting 🔧

### Connection Issues:
```bash
# Test database connection
npx prisma db push --preview-feature
```

### Schema Issues:
```bash
# Reset and recreate schema
npx prisma db push --force-reset
```

### Photo Upload Issues:
- Check Supabase Storage bucket exists
- Verify bucket is set to public
- Check storage policies allow uploads

### Environment Issues:
- Verify all environment variables are set
- Check database password is correct
- Ensure Supabase project is active

## Post-Migration Cleanup 🧹

After successful migration, you can:

1. **Backup SQLite Database**:
   ```bash
   cp prisma/dev.db prisma/dev.db.backup
   ```

2. **Remove Local Photos** (optional):
   ```bash
   # Keep a backup first
   cp -r uploads uploads_backup
   # Then remove original uploads folder
   ```

3. **Update Development Workflow**:
   - All new photos will automatically go to Supabase
   - Database operations now use PostgreSQL
   - Photos load from Supabase CDN

## Success! 🎉

Your application is now running on:
- **Database**: Supabase PostgreSQL
- **File Storage**: Supabase Storage
- **Photos**: Served via Supabase CDN

Benefits you now have:
- ☁️ **Cloud Storage**: Photos stored in the cloud
- 📈 **Scalability**: PostgreSQL can handle enterprise loads
- 🌍 **Global CDN**: Fast photo loading worldwide
- 🔒 **Security**: Built-in authentication and policies
- 💰 **Cost Effective**: Pay only for what you use
- 🔧 **Maintenance**: Automatic backups and updates
