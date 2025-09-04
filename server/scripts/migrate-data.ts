import { PrismaClient as SQLitePrismaClient } from '@prisma/client';
import { PrismaClient as PostgreSQLPrismaClient } from '@prisma/client';
import { uploadFileToSupabase } from '../src/services/supabase';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// This script migrates data from SQLite to Supabase PostgreSQL
// and uploads photos to Supabase Storage

async function migrateData() {
  // SQLite client (old database)
  const sqliteClient = new SQLitePrismaClient({
    datasources: {
      db: {
        url: 'file:./dev.db'
      }
    }
  });

  // PostgreSQL client (new Supabase database)
  const postgresClient = new PostgreSQLPrismaClient();

  try {
    console.log('🚀 Starting data migration to Supabase...');

    // 1. Migrate Campaigns
    console.log('📋 Migrating campaigns...');
    const campaigns = await sqliteClient.campaign.findMany({
      include: { visits: true }
    });

    for (const campaign of campaigns) {
      console.log(`   - Migrating campaign: ${campaign.name}`);
      
      await postgresClient.campaign.create({
        data: {
          id: campaign.id,
          name: campaign.name,
          clientName: campaign.clientName,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          description: campaign.description,
          targetAudience: campaign.targetAudience,
          budget: campaign.budget,
          objectives: campaign.objectives,
          notes: campaign.notes,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt
        }
      });
    }

    console.log(`✅ Migrated ${campaigns.length} campaigns`);

    // 2. Migrate Visits and Upload Photos
    console.log('📍 Migrating visits and uploading photos...');
    const visits = await sqliteClient.visit.findMany();

    for (const visit of visits) {
      console.log(`   - Migrating visit: ${visit.location} (${new Date(visit.date).toLocaleDateString()})`);
      
      // Process photos and upload to Supabase
      const photoUrls: (string | null)[] = [null, null, null, null];
      const photoPaths = [visit.photoPath1, visit.photoPath2, visit.photoPath3, visit.photoPath4];
      
      for (let i = 0; i < photoPaths.length; i++) {
        const photoPath = photoPaths[i];
        if (photoPath && fs.existsSync(photoPath)) {
          try {
            console.log(`     - Uploading photo ${i + 1}: ${photoPath}`);
            
            // Read and optimize the image
            const imageBuffer = await sharp(photoPath)
              .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 85 })
              .toBuffer();

            // Generate unique filename
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const fileName = `migrated-visit-${uniqueSuffix}-${i + 1}.jpg`;

            // Upload to Supabase Storage
            const photoUrl = await uploadFileToSupabase(imageBuffer, fileName, 'image/jpeg');
            photoUrls[i] = photoUrl;
            
            console.log(`     ✅ Photo ${i + 1} uploaded successfully`);
          } catch (error) {
            console.error(`     ❌ Failed to upload photo ${i + 1}:`, error);
          }
        }
      }

      // Create visit record in PostgreSQL
      await postgresClient.visit.create({
        data: {
          id: visit.id,
          date: visit.date,
          location: visit.location,
          notes: visit.notes,
          photoUrl1: photoUrls[0],
          photoUrl2: photoUrls[1],
          photoUrl3: photoUrls[2],
          photoUrl4: photoUrls[3],
          originalFilename1: visit.originalFilename1,
          originalFilename2: visit.originalFilename2,
          originalFilename3: visit.originalFilename3,
          originalFilename4: visit.originalFilename4,
          createdAt: visit.createdAt,
          updatedAt: visit.updatedAt,
          campaignId: visit.campaignId
        }
      });
    }

    console.log(`✅ Migrated ${visits.length} visits`);
    console.log('🎉 Data migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sqliteClient.$disconnect();
    await postgresClient.$disconnect();
  }
}

// Run migration
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateData };
