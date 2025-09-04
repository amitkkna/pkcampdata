import http from 'http';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Database } from '../src/lib/supabase';

dotenv.config({ path: path.join(__dirname, '../.env') });

function postAndSave(urlPath: string, body: object, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: Number(process.env.PORT || 3001),
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(json)
      }
    }, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        let errData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => errData += chunk);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${errData}`)));
        return;
      }
      const file = fs.createWriteStream(outPath);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    });
    req.on('error', reject);
    req.write(json);
    req.end();
  });
}

async function main() {
  const db = new Database();
  const argId = process.argv[2];
  let campaignId = argId;

  if (!campaignId) {
    // pick the most recently updated campaign
    const campaigns = await db.getCampaigns();
    if (campaigns.length === 0) throw new Error('No campaigns found; run the seed script first.');
    campaigns.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    campaignId = campaigns[0].id;
  }

  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const pdfPath = path.join(uploadsDir, `campaign-${campaignId}-report.pdf`);
  const pptxPath = path.join(uploadsDir, `campaign-${campaignId}-report.pptx`);

  console.log('Generating PDF...');
  await postAndSave('/api/reports/pdf', { campaignId, reportType: 'all' }, pdfPath);
  console.log('PDF saved to', pdfPath);

  console.log('Generating PowerPoint...');
  await postAndSave('/api/reports/powerpoint', { campaignId, reportType: 'all' }, pptxPath);
  console.log('PPTX saved to', pptxPath);
}

main().catch((err) => {
  console.error('Failed to generate reports:', err);
  process.exit(1);
});
