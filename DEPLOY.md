# Backend Deployment Instructions

Your Netlify frontend is trying to call `/api` but there's no backend. Here are quick deployment options:

## Option 1: Render (Free, Recommended)

1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub account
3. Click "New +" → "Web Service"
4. Connect repository: `amitkkna/camp_track`
5. Use these settings:
   - **Name**: `pkpptreports-api`
   - **Build Command**: `cd server && npm install && npm run build`
   - **Start Command**: `cd server && npm start`
   - **Environment Variables**:
     - `NODE_ENV` = `production`
     - `HOST` = `0.0.0.0`
     - `PORT` = `10000`
     - `SUPABASE_URL` = (your Supabase project URL)
     - `SUPABASE_SERVICE_ROLE_KEY` = (your service role key)
     - `SUPABASE_BUCKET` = `campaign-photos`

6. Deploy and note your URL (e.g., `https://pkpptreports-api.onrender.com`)

## Option 2: Railway (Free tier)

1. Go to [railway.app](https://railway.app)
2. Deploy from GitHub: `amitkkna/camp_track`
3. Set environment variables (same as above)
4. Railway will auto-detect Node.js and deploy

## Option 3: Fly.io (Free allowance)

```bash
# Install flyctl first
cd server
fly launch --no-deploy
# Edit fly.toml if needed
fly deploy
```

## After Backend Deployment

1. Copy your backend URL (e.g., `https://pkpptreports-api.onrender.com`)
2. In Netlify:
   - Go to Site settings → Environment variables
   - Add: `VITE_API_BASE_URL` = `https://YOUR-BACKEND-URL/api`
   - **Important**: Include `/api` at the end!
3. Trigger a new deploy in Netlify
4. Your site should work!

## Quick Test

Once deployed, test your backend:
```bash
curl https://YOUR-BACKEND-URL/api/health
```

Should return: `{"status":"OK","timestamp":"..."}`
