import path from 'path';
import fs from 'fs/promises';
import https from 'https';
import dotenv from 'dotenv';
import pptxgen from 'pptxgenjs';
import { Database } from '../src/lib/supabase';

dotenv.config({ path: path.join(__dirname, '../.env') });

const downloadImageFromUrl = (url: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
};

async function main() {
  const db = new Database();
  const argId = process.argv[2];
  let campaignId = argId;

  if (!campaignId) {
    const campaigns = await db.getCampaigns();
    if (campaigns.length === 0) throw new Error('No campaigns found; seed first.');
    campaigns.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    campaignId = campaigns[0].id;
  }

  const campaign = await db.getCampaignWithVisits(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  const pres = new pptxgen();
  pres.defineLayout({ name: 'WIDE_1333x75', width: 13.33, height: 7.5 });
  pres.layout = 'WIDE_1333x75';

  const uploadsDir = path.join(__dirname, '../uploads');
  await fs.mkdir(uploadsDir, { recursive: true });

  for (const visit of campaign.visits) {
    const slide = pres.addSlide();
    slide.addText(`Visit #${visit.id} - ${visit.location}`, { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 18, bold: true });
    slide.addText(`Date: ${visit.date} | Notes: ${visit.notes || 'No notes'}`, { x: 0.5, y: 1, w: 9, h: 0.5, fontSize: 12 });

    const photoUrls = [visit.photoUrl1, visit.photoUrl2, visit.photoUrl3, visit.photoUrl4].filter(Boolean) as string[];
    let photoIndex = 0;
    const positions = [ { x: 0.5, y: 2 }, { x: 5, y: 2 }, { x: 0.5, y: 4.5 }, { x: 5, y: 4.5 } ];

    for (const photoUrl of photoUrls) {
      if (photoIndex >= 4) break;
      try {
        const buf = await downloadImageFromUrl(photoUrl);
        const tmpPath = path.join(uploadsDir, `ppt-img-${Date.now()}-${Math.random()}.jpg`);
        await fs.writeFile(tmpPath, buf);
        const pos = positions[photoIndex];
        slide.addImage({ path: tmpPath, x: pos.x, y: pos.y, w: 4, h: 2 });
        photoIndex++;
        // Clean up later (pptxgen needs file while writing)
        // We'll unlink after writeFile completes
      } catch (err) {
        const pos = positions[photoIndex];
        slide.addText('[Image could not be loaded]', { x: pos.x, y: pos.y, w: 4, h: 2, fontSize: 12 });
        photoIndex++;
      }
    }
  }

  const outPath = path.join(uploadsDir, `campaign-${campaignId}-report.pptx`);
  await pres.writeFile({ fileName: outPath });
  console.log('PPTX saved to', outPath);
}

main().catch((err) => {
  console.error('Offline PPT generation failed:', err);
  process.exit(1);
});
