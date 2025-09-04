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
1) Create a new site from this repo in Netlify.
2) Build command: `npm run build`  Publish directory: `client/dist`
3) Environment variables (Site settings → Environment):
   - `VITE_API_BASE_URL` = `/api` (when using Netlify dev proxy) or your API URL
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4) If your API is hosted separately, point `VITE_API_BASE_URL` to that full URL.

### Backend API
Host the Node server where you prefer (Render/Fly/EC2). Required envs in `server/.env.example`:
`PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`.

### Local Dev Proxy
`netlify.toml` includes a redirect so `/api/*` proxies to `http://localhost:3001/api` during Netlify Dev.
npm run build
npm start
```

The application will be accessible on your company's internal network.
