# Campaign Reporting Generator

An internal web application for advertisement and van management agencies to streamline client-facing report creation.

## Features

- **Campaign Management**: Create and manage multiple advertising campaigns
- **Visit Tracking**: Log campaign activities with dates, locations, photos, and notes
- **Automated PDF Reports**: Generate professional daily reports with one click
- **PowerPoint Presentations**: Create complete campaign presentations automatically
- **Photo Management**: Upload and organize proof-of-performance photographs
- **Simple Interface**: Designed for non-technical Campaign Managers

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite with Prisma ORM
- **Report Generation**: PDFKit (PDF) + PptxGenJS (PowerPoint)
- **Image Processing**: Sharp
- **Development**: Vite + Concurrently

## Quick Start

1. **Install Dependencies**
   ```bash
   npm run install:all
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Access Application**
   - Open http://localhost:5173 in your browser
   - Backend API runs on http://localhost:3001

## Project Structure

```
pkpptreports/
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared TypeScript types
└── docs/           # Documentation
```

## Usage

1. **Create Campaign**: Click "Create New Campaign" and fill in client details
2. **Add Visits**: Enter visit data including date, location, photo, and notes
3. **Generate Reports**: 
   - Daily PDF reports for specific dates
   - Complete PowerPoint presentations for entire campaigns

## Development

- Frontend: Vite dev server with hot reload
- Backend: Nodemon for automatic server restart
- Database: Prisma Studio for data management
- TypeScript: Full type safety across the stack

## Deployment

### Netlify (Frontend)
1) Create a new site from this repo in Netlify. Ensure Node 20 is used and set envs in the Netlify UI.

Frontend is configured for Netlify. For public access (no localhost proxies):

- Host the API publicly (Render/Fly.io/VPS). Ensure server binds to `0.0.0.0` and exposes `/api`.
- In Netlify Site settings > Environment variables, set `VITE_API_BASE_URL` to your public API URL, e.g. `https://your-api.example.com/api`.
- Do not use Netlify redirects to proxy to `http://localhost:3001` in production.
- Auth is disabled; no Supabase config is required.

### Backend API
Host the Node server where you prefer (Render/Fly/EC2). Required envs in `server/.env.example`:
`PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`.

### Local Dev Proxy
`netlify.toml` includes a redirect so `/api/*` proxies to `http://localhost:3001/api` during Netlify Dev.
npm run build
npm start
```

The application will be accessible on your company's internal network.

## Authentication (Supabase)

- To require login, set `REQUIRE_AUTH=true` in `server/.env` and redeploy the backend.
- Frontend must have `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set in Netlify.
- Seed initial users (requires service role key):
   - In `server` folder run: `npm run seed:auth`
   - Users created:
      - admin@globaldigitalconnect.com / admin123
      - prateek@globaldigitalconnect.com / prateek123
