import path from 'path';
import dotenv from 'dotenv';
import { Database } from '../src/lib/supabase';

async function main() {
  // Ensure env is loaded when running directly
  dotenv.config({ path: path.join(__dirname, '../.env') });

  const db = new Database();

  console.log('Seeding demo campaign...');
  const campaign = await db.createCampaign({
    name: 'Demo Campaign',
    clientName: 'Acme Corp',
    startDate: new Date('2025-09-01').toISOString(),
    endDate: new Date('2025-09-30').toISOString(),
    description: 'Seeded demo campaign',
    targetAudience: 'General Public',
    budget: 250000,
    objectives: 'Brand awareness',
    notes: 'Created via seed script'
  });
  console.log('Created campaign:', campaign.id);

  console.log('Creating two demo visits...');
  const visit1 = await db.createVisit({
    date: new Date('2025-09-05T10:30:00Z').toISOString(),
    location: 'City Center Mall',
    notes: 'Great footfall, positive engagement.',
    campaignId: campaign.id
  });
  console.log('Created visit:', visit1.id);

  const visit2 = await db.createVisit({
    date: new Date('2025-09-10T15:00:00Z').toISOString(),
    location: 'Riverside Park',
    notes: 'Afternoon crowd, requested more flyers.',
    campaignId: campaign.id
  });
  console.log('Created visit:', visit2.id);

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
