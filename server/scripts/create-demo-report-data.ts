import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { Database } from '../src/lib/supabase';
import { uploadFileToSupabase } from '../src/services/supabase';

async function main() {
  // Load env from server/.env explicitly
  dotenv.config({ path: path.join(__dirname, '../.env') });

  const db = new Database();

  // Pick some local demo images to upload
  const uploadDir = path.join(__dirname, '../uploads');
  const files = [
    'visit-1755939567575-424661774-optimized.jpg',
    'visit-1755950326368-562043438-optimized.jpg',
    'visit-1755950326370-332871363-optimized.jpg',
    'visit-1755954825996-669197512-optimized.jpg',
    'visit-1755954825998-840330049-optimized.jpg',
  ];

  const existing: string[] = [];
  for (const f of files) {
    try {
      await fs.access(path.join(uploadDir, f));
      existing.push(f);
    } catch {
      // ignore missing files
    }
  }

  if (existing.length === 0) {
    throw new Error('No demo images found in server/uploads to seed visits with photos.');
  }

  // Upload up to 4 images to Supabase Storage and collect their public URLs
  const photoUrls: string[] = [];
  for (let i = 0; i < Math.min(existing.length, 4); i++) {
    const name = existing[i];
    const filePath = path.join(uploadDir, name);
    const buf = await fs.readFile(filePath);
    const url = await uploadFileToSupabase(buf, `demo-${Date.now()}-${i}.jpg`, 'image/jpeg');
    photoUrls.push(url);
  }

  console.log('Uploaded photo URLs:', photoUrls);

  // Create a campaign
  const campaign = await db.createCampaign({
    name: 'Demo Campaign With Photos',
    clientName: 'Demo Client',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(), // +14 days
    description: 'Auto-generated demo with photos',
    targetAudience: 'General',
    budget: 100000,
    objectives: 'Demonstrate reporting',
    notes: 'Seeded by create-demo-report-data.ts'
  });

  console.log('Created campaign:', campaign.id);

  // Create two visits using the uploaded photos
  const v1 = await db.createVisit({
    date: new Date().toISOString(),
    location: 'Downtown Plaza',
    notes: 'Solid engagement, morning session',
    campaignId: campaign.id,
    photoUrl1: photoUrls[0],
    photoUrl2: photoUrls[1],
  });

  console.log('Created visit 1:', v1.id);

  const v2 = await db.createVisit({
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    location: 'Lakeside Park',
    notes: 'Family crowd in afternoon',
    campaignId: campaign.id,
    photoUrl1: photoUrls[2] || photoUrls[0],
    photoUrl2: photoUrls[3] || photoUrls[1],
    photoUrl3: photoUrls[1] || undefined,
  });

  console.log('Created visit 2:', v2.id);

  console.log('\nDemo data ready. Campaign ID:', campaign.id);
}

main().catch((err) => {
  console.error('Demo data creation failed:', err);
  process.exit(1);
});
