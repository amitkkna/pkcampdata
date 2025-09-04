import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function createTablesDirectly() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🔗 Creating database tables directly via Supabase...');

    // Execute SQL to create tables
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop existing tables if they exist (fresh start)
        DROP TABLE IF EXISTS visits;
        DROP TABLE IF EXISTS campaigns;
        
        -- Create campaigns table
        CREATE TABLE campaigns (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          "clientName" TEXT NOT NULL,
          "startDate" TIMESTAMP(3) NOT NULL,
          "endDate" TIMESTAMP(3) NOT NULL,
          description TEXT,
          "targetAudience" TEXT,
          budget DECIMAL(10,2),
          objectives TEXT,
          notes TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create visits table
        CREATE TABLE visits (
          id TEXT PRIMARY KEY,
          date TIMESTAMP(3) NOT NULL,
          location TEXT NOT NULL,
          notes TEXT,
          "photoUrl1" TEXT,
          "photoUrl2" TEXT,
          "photoUrl3" TEXT,
          "photoUrl4" TEXT,
          "originalFilename1" TEXT,
          "originalFilename2" TEXT,
          "originalFilename3" TEXT,
          "originalFilename4" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "campaignId" TEXT NOT NULL,
          CONSTRAINT "visits_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES campaigns(id) ON DELETE CASCADE ON UPDATE CASCADE
        );
        
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS "visits_campaignId_idx" ON visits("campaignId");
        CREATE INDEX IF NOT EXISTS "visits_date_idx" ON visits(date);
        CREATE INDEX IF NOT EXISTS "campaigns_startDate_idx" ON campaigns("startDate");
      `
    });

    if (error) {
      console.error('❌ Error creating tables:', error);
      
      // Fallback: Try creating tables one by one
      console.log('🔄 Trying alternative method...');
      
      // Use the SQL editor approach
      console.log('Please go to your Supabase Dashboard > SQL Editor and run this SQL:');
      console.log(`
-- Drop existing tables if they exist (fresh start)
DROP TABLE IF EXISTS visits;
DROP TABLE IF EXISTS campaigns;

-- Create campaigns table
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  description TEXT,
  "targetAudience" TEXT,
  budget DECIMAL(10,2),
  objectives TEXT,
  notes TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create visits table
CREATE TABLE visits (
  id TEXT PRIMARY KEY,
  date TIMESTAMP(3) NOT NULL,
  location TEXT NOT NULL,
  notes TEXT,
  "photoUrl1" TEXT,
  "photoUrl2" TEXT,
  "photoUrl3" TEXT,
  "photoUrl4" TEXT,
  "originalFilename1" TEXT,
  "originalFilename2" TEXT,
  "originalFilename3" TEXT,
  "originalFilename4" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "campaignId" TEXT NOT NULL,
  CONSTRAINT "visits_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES campaigns(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "visits_campaignId_idx" ON visits("campaignId");
CREATE INDEX IF NOT EXISTS "visits_date_idx" ON visits(date);
CREATE INDEX IF NOT EXISTS "campaigns_startDate_idx" ON campaigns("startDate");
      `);
      
    } else {
      console.log('✅ Tables created successfully!');
      console.log('✅ Fresh database schema is ready!');
    }

  } catch (error) {
    console.error('❌ Failed to create tables:', error);
  }
}

createTablesDirectly();
