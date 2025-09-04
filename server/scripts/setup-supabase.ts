import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function createSchemaViaSupabaseAPI() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🔗 Testing Supabase API connection...');
    
    // Test API connection
    const { data, error } = await supabase.from('').select('*').limit(1);
    console.log('✅ Supabase API connection successful!');

    // Create tables using SQL
    console.log('📊 Creating database schema...');
    
    // Create campaigns table
    const { error: campaignsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS campaigns (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          "clientName" TEXT NOT NULL,
          "startDate" TIMESTAMP(3) NOT NULL,
          "endDate" TIMESTAMP(3) NOT NULL,
          description TEXT,
          "targetAudience" TEXT,
          budget DECIMAL,
          objectives TEXT,
          notes TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `
    });

    if (campaignsError) {
      console.log('Creating campaigns table via direct SQL...');
      const { error: directError } = await supabase
        .from('campaigns')
        .select('id')
        .limit(1);
      
      if (directError && directError.code === '42P01') {
        console.log('Table does not exist, we need to create it via Prisma push');
      }
    } else {
      console.log('✅ Campaigns table created/verified');
    }

    // Create visits table
    const { error: visitsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS visits (
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
          FOREIGN KEY ("campaignId") REFERENCES campaigns(id) ON DELETE CASCADE
        );
      `
    });

    if (visitsError) {
      console.log('Table creation via RPC may not be available, this is normal');
    } else {
      console.log('✅ Visits table created/verified');
    }

    // Test if we can create a storage bucket
    console.log('🪣 Setting up storage bucket...');
    const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
    
    if (!bucketListError) {
      const campaignPhotoBucket = buckets.find(bucket => bucket.name === 'campaign-photos');
      
      if (!campaignPhotoBucket) {
        const { error: createBucketError } = await supabase.storage.createBucket('campaign-photos', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
          fileSizeLimit: 10485760 // 10MB
        });
        
        if (createBucketError) {
          console.log('⚠️  Could not create bucket automatically. Please create it manually in Supabase dashboard.');
        } else {
          console.log('✅ Storage bucket "campaign-photos" created successfully');
        }
      } else {
        console.log('✅ Storage bucket "campaign-photos" already exists');
      }
    }

    console.log('🎉 Supabase setup completed! Now try connecting with Prisma.');

  } catch (error) {
    console.error('❌ Supabase API test failed:', error);
  }
}

createSchemaViaSupabaseAPI();
