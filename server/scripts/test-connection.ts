import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔗 Testing Supabase connection...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Try to query the database
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ Database query successful:', result);
    
    // Check if tables exist
    try {
      const campaignCount = await prisma.campaign.count();
      console.log(`✅ Campaigns table exists with ${campaignCount} records`);
    } catch (error) {
      console.log('⚠️  Campaigns table may not exist yet - this is expected before migration');
    }
    
    try {
      const visitCount = await prisma.visit.count();
      console.log(`✅ Visits table exists with ${visitCount} records`);
    } catch (error) {
      console.log('⚠️  Visits table may not exist yet - this is expected before migration');
    }
    
    console.log('🎉 Connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check your DATABASE_URL in .env file');
    console.log('2. Verify your Supabase project is active');
    console.log('3. Check your database password');
    console.log('4. Ensure your IP is allowlisted in Supabase (if applicable)');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
