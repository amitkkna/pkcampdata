# Quick Start Guide - Fix "Failed to fetch campaign" Error

## Current Status ✅
Your app is now working in **Development Mode** with mock data! You should see:
- A dashboard with sample campaigns
- Ability to create/edit campaigns and visits  
- Photo uploads work (with mock URLs)
- PDF/PowerPoint generation works

## To Connect Real Database 🔧

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New project"**
3. Choose organization, name your project, set password
4. Wait for project setup (2-3 minutes)

### 2. Get Your Credentials
1. In Supabase dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** (looks like: `https://abcdefgh.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### 3. Update Local Environment
Edit `client/.env.local` and replace the placeholder values:

```bash
# Replace these with your actual values
VITE_SUPABASE_URL=https://your-actual-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Set Up Database Tables
1. In Supabase dashboard → **SQL Editor**
2. Click **"New query"** 
3. Copy-paste the contents of `supabase-setup.sql`
4. Click **Run** to create tables and storage bucket

### 5. Restart Dev Server
```bash
npm run dev
```

The orange "Development Mode" banner will disappear and you'll have real data persistence!

## What Changed 🛠️

- **No more "Failed to fetch" errors** - App uses mock data when Supabase isn't configured
- **Better error messages** - Clear instructions when something goes wrong  
- **Filename sanitization** - Fixes photo upload issues with special characters
- **Graceful fallbacks** - App works offline/without backend

## Still Having Issues? 

1. **Check the console** - Open browser dev tools (F12) for detailed errors
2. **Verify environment** - Make sure `.env.local` has no typos in URLs/keys
3. **Test connection** - The debug panel (temporarily add `<SupabaseDebugPanel />` to Dashboard) can diagnose issues

Your app is fully functional now - just choose whether to use mock data (for development) or real Supabase (for production)!
