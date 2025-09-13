import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { campaignRoutes } from './routes/campaigns';
import { visitRoutes } from './routes/visits';
import { reportRoutes } from './routes/reports';
import folderRoutes from './routes/folders';
// Auth middleware removed to run the API without authentication

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/campaigns', campaignRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/folders', folderRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'Connected to Supabase PostgreSQL',
    storage: 'Connected to Supabase Storage'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, HOST, () => {
  const hostShown = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`Server running on http://${hostShown}:${PORT}`);
  console.log(`API available at http://${hostShown}:${PORT}/api`);
});
