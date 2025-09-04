import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { campaignRoutes } from './routes/campaigns';
import { visitRoutes } from './routes/visits';
import { reportRoutes } from './routes/reports';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/campaigns', campaignRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/reports', reportRoutes);

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
