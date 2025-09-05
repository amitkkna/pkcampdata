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

- Frontend: React + TypeScript + Tailwind CSS (Vite)
- Data: Supabase (Postgres + Storage) directly from the browser, with mock-data fallback for local/dev
- Reporting: jsPDF (PDF) + PptxGenJS (PowerPoint)

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

## Project Structure

```
pkpptreports/
├── client/          # React frontend
├── shared/          # Shared TypeScript types
└── netlify.toml     # Netlify config (frontend-only)
```

## Usage

1. **Create Campaign**: Click "Create New Campaign" and fill in client details
2. **Add Visits**: Enter visit data including date, location, photo, and notes
3. **Generate Reports**: 
   - Daily PDF reports for specific dates
   - Complete PowerPoint presentations for entire campaigns

## Development

- Frontend: Vite dev server with hot reload
- Data: Supabase via browser SDK (no backend needed)

## Deployment

### Netlify (Frontend-only)
1) Create a new site from this repo in Netlify.
2) Build settings: base = `client`, command = `npm run build`, publish = `dist`.
3) Environment variables: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4) SPA redirect is configured in `netlify.toml`.

## Authentication

Auth is optional and currently disabled. The app reads/writes using Supabase anonymous policies you configure. If you later add auth, wire it in the client only.
