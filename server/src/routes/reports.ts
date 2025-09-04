import express from 'express';
import PDFDocument from 'pdfkit';
import pptxgen from 'pptxgenjs';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import { Database } from '../lib/supabase';

const router = express.Router();
const db = new Database();

// Helper function to download image from URL
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

// Helper function to download and save image locally
const downloadImage = async (photoUrl: string, fileName: string): Promise<string> => {
  try {
    const imageBuffer = await downloadImageFromUrl(photoUrl);
    const localPath = path.join(__dirname, '../../uploads', fileName);
    await fs.writeFile(localPath, imageBuffer);
    return localPath;
  } catch (error) {
    console.error(`Error downloading image ${photoUrl}:`, error);
    throw error;
  }
};

// Layout helpers for PDF/PPT
type VisitLike = {
  id: string;
  location: string;
  date: string;
  notes?: string | null;
  photoUrl1?: string | null;
  photoUrl2?: string | null;
  photoUrl3?: string | null;
  photoUrl4?: string | null;
};

function collectPhotoUrls(v: VisitLike): string[] {
  return [v.photoUrl1, v.photoUrl2, v.photoUrl3, v.photoUrl4].filter(Boolean) as string[];
}

function gridForCount(count: number): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 }; // side-by-side special case
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}

async function addHeaderBoxPDF(doc: any, x: number, y: number, w: number, lines: string[]) {
  const padding = 10;
  const lineHeight = 14;
  const boxHeight = padding * 2 + lines.length * lineHeight;
  doc.roundedRect(x, y, w, boxHeight, 6).strokeColor('#444').lineWidth(1).stroke();
  doc.fillColor('#111').fontSize(12);
  let ty = y + padding;
  for (const line of lines) {
    doc.text(line, x + padding, ty, { width: w - padding * 2 });
    ty += lineHeight;
  }
  return y + boxHeight;
}

async function renderVisitPDF(doc: any, visit: VisitLike, campaignName: string, pageMargin: number) {
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const usableW = pageW - pageMargin * 2;

  // Visit header box
  const headerBottom = await addHeaderBoxPDF(
    doc,
    pageMargin,
    pageMargin,
    usableW,
    [
      `Campaign: ${campaignName}`,
      `Place: ${visit.location}`,
      `Date: ${new Date(visit.date).toLocaleString()}`,
      `Notes: ${visit.notes || '—'}`,
    ]
  );

  const topY = headerBottom + 10;
  const bottomY = pageH - pageMargin;
  const imagesAreaH = bottomY - topY;
  const imagesAreaW = usableW;
  const imagesX = pageMargin;
  const imagesY = topY;

  const urls = collectPhotoUrls(visit);
  if (urls.length === 0) return; // nothing to lay out

  const { cols, rows } = gridForCount(urls.length);
  const gap = 10;
  // Special asymmetric layout for exactly 3 images
  if (urls.length === 3) {
    const leftW = (imagesAreaW - gap) / 2;
    const rightW = imagesAreaW - leftW - gap;
    const leftX = imagesX;
    const rightX = imagesX + leftW + gap;
    const topY = imagesY;
    const halfH = (imagesAreaH - gap) / 2;

    const slots = [
      { x: leftX, y: topY, w: leftW, h: imagesAreaH },
      { x: rightX, y: topY, w: rightW, h: halfH },
      { x: rightX, y: topY + halfH + gap, w: rightW, h: halfH },
    ];
      for (let i = 0; i < 3; i++) {
        const s = slots[i];
        try {
          const fileName = `temp-${Date.now()}-${i}.jpg`;
          const localPath = await downloadImage(urls[i], fileName);
          // Clip to rounded frame, draw image, then border on top
          doc.save();
          doc.roundedRect(s.x, s.y, s.w, s.h, 4).clip();
          (doc as any).image(localPath, s.x, s.y, { fit: [s.w, s.h], align: 'center', valign: 'center' });
          doc.restore();
          doc.lineWidth(1).strokeColor('#CCCCCC').roundedRect(s.x, s.y, s.w, s.h, 4).stroke();
          await fs.unlink(localPath);
        } catch (err) {
          doc.lineWidth(1).strokeColor('#CCCCCC').roundedRect(s.x, s.y, s.w, s.h, 4).stroke();
          doc.fontSize(10).fillColor('#888').text('[Image load failed]', s.x, s.y + s.h / 2 - 5, { width: s.w, height: 10, align: 'center' });
        }
      }
    return;
  }

  const cellW = (imagesAreaW - (cols - 1) * gap) / cols;
  const cellH = (imagesAreaH - (rows - 1) * gap) / rows;

  for (let i = 0; i < urls.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = imagesX + c * (cellW + gap);
    const y = imagesY + r * (cellH + gap);
    try {
      const fileName = `temp-${Date.now()}-${i}.jpg`;
      const localPath = await downloadImage(urls[i], fileName);
  // Clip to frame then draw border
  doc.save();
  doc.roundedRect(x, y, cellW, cellH, 4).clip();
  (doc as any).image(localPath, x, y, { fit: [cellW, cellH], align: 'center', valign: 'center' });
  doc.restore();
  doc.lineWidth(1).strokeColor('#CCCCCC').roundedRect(x, y, cellW, cellH, 4).stroke();
      await fs.unlink(localPath);
    } catch (err) {
  doc.lineWidth(1).strokeColor('#CCCCCC').roundedRect(x, y, cellW, cellH, 4).stroke();
  doc.fontSize(10).fillColor('#888').text('[Image load failed]', x, y + cellH / 2 - 5, { width: cellW, height: 10, align: 'center' });
    }
  }
}

// Generate PDF report with responsive grid and header boxes (A4)
router.get('/pdf/:campaignId', async (req, res) => {
  try {
    const campaignId = req.params.campaignId;
    const campaign = await db.getCampaignWithVisits(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const doc = new PDFDocument({ size: [960, 540], margins: { top: 24, left: 24, right: 24, bottom: 24 } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${campaignId}-report.pdf"`);
    doc.pipe(res);

    // Render visits directly; no campaign-level title page
    const margin = 36;
    if (campaign.visits.length > 0) {
      // Use the initial page for the first visit
      await renderVisitPDF(doc, campaign.visits[0], campaign.name, margin);
      for (let i = 1; i < campaign.visits.length; i++) {
    doc.addPage({ size: [960, 540], margins: { top: 24, left: 24, right: 24, bottom: 24 } });
        await renderVisitPDF(doc, campaign.visits[i], campaign.name, margin);
      }
    } else {
      doc.fontSize(14).text('No visits found for this campaign.', margin, margin);
    }

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

async function addHeaderBoxPPT(slide: any, x: number, y: number, w: number, lines: string[]) {
  const padding = 0.15; // inches
  // Estimate height: 0.25in per line + paddings
  const h = padding * 2 + lines.length * 0.28;
  slide.addShape('roundRect', { x, y, w, h, line: { color: '444444' }, fill: { color: 'FFFFFF' }, rectRadius: 0.12 });
  let ty = y + padding;
  for (const line of lines) {
    slide.addText(line, { x: x + padding, y: ty, w: w - padding * 2, h: 0.26, fontSize: 12, color: '111111' });
    ty += 0.28;
  }
  return y + h;
}

async function renderVisitPPT(slide: any, visit: VisitLike, campaignName: string, margin: number, tempPaths: string[]) {
  const pageW = 13.33; // widescreen width in inches
  const pageH = 7.5;   // widescreen height in inches
  const usableW = pageW - margin * 2;

  const bottomOfHeader = await addHeaderBoxPPT(slide, margin, margin, usableW, [
    `Campaign: ${campaignName}`,
    `Place: ${visit.location}`,
    `Date: ${new Date(visit.date).toLocaleString()}`,
    `Notes: ${visit.notes || '—'}`,
  ]);

  const topY = bottomOfHeader + 0.15;
  const bottomY = pageH - margin;
  const areaH = bottomY - topY;
  const areaW = usableW;
  const x0 = margin;

  const urls = collectPhotoUrls(visit);
  if (urls.length === 0) return;

  const { cols, rows } = gridForCount(urls.length);
  const gap = 0.2; // a bit more spacing in inches
  // Special asymmetric layout for exactly 3 images
  if (urls.length === 3) {
    const leftW = (areaW - gap) / 2;
    const rightW = areaW - leftW - gap;
    const leftX = x0;
    const rightX = x0 + leftW + gap;
    const halfH = (areaH - gap) / 2;
  const slots = [
      { x: leftX, y: topY, w: leftW, h: areaH },
      { x: rightX, y: topY, w: rightW, h: halfH },
      { x: rightX, y: topY + halfH + gap, w: rightW, h: halfH },
    ];
  for (let i = 0; i < 3; i++) {
      const s = slots[i];
      try {
        const fileName = `temp-${Date.now()}-${i}.jpg`;
  const localPath = await downloadImage(urls[i], fileName);
    // Draw image first, then overlay frame so border is visible on top
  slide.addImage({ path: localPath, x: s.x, y: s.y, w: s.w, h: s.h, sizing: { type: 'contain', w: s.w, h: s.h } as any });
  slide.addShape('rect', { x: s.x, y: s.y, w: s.w, h: s.h, line: { color: 'CCCCCC' }, fill: { color: 'FFFFFF', transparency: 100 } as any });
  tempPaths.push(localPath);
      } catch (err) {
    slide.addShape('rect', { x: s.x, y: s.y, w: s.w, h: s.h, line: { color: 'CCCCCC' }, fill: { color: 'FFFFFF' } });
    slide.addText('[Image load failed]', { x: s.x, y: s.y, w: s.w, h: s.h, fontSize: 12, color: '888888', align: 'center', valign: 'middle' } as any);
      }
    }
    return;
  }

  const cellW = (areaW - (cols - 1) * gap) / cols;
  const cellH = (areaH - (rows - 1) * gap) / rows;

  for (let i = 0; i < urls.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = x0 + c * (cellW + gap);
    const y = topY + r * (cellH + gap);
    try {
      const fileName = `temp-${Date.now()}-${i}.jpg`;
  const localPath = await downloadImage(urls[i], fileName);
      // Draw image first, then frame shape on top
  slide.addImage({ path: localPath, x, y, w: cellW, h: cellH, sizing: { type: 'contain', w: cellW, h: cellH } as any });
  slide.addShape('rect', { x, y, w: cellW, h: cellH, line: { color: 'CCCCCC' }, fill: { color: 'FFFFFF', transparency: 100 } as any });
  tempPaths.push(localPath);
    } catch (err) {
      slide.addShape('rect', { x, y, w: cellW, h: cellH, line: { color: 'CCCCCC' }, fill: { color: 'FFFFFF' } });
      slide.addText('[Image load failed]', { x, y, w: cellW, h: cellH, fontSize: 12, color: '888888', align: 'center', valign: 'middle' } as any);
    }
  }
}

// Generate PowerPoint report with responsive grid and header boxes
router.get('/pptx/:campaignId', async (req, res) => {
  try {
    const campaignId = req.params.campaignId;
    const campaign = await db.getCampaignWithVisits(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const pres = new pptxgen();
  // Set widescreen layout to 13.33 x 7.5 inches
  pres.defineLayout({ name: 'WIDE_1333x75', width: 13.33, height: 7.5 });
  pres.layout = 'WIDE_1333x75';

    const margin = 0.5;
    const tempPaths: string[] = [];
    for (const visit of campaign.visits) {
      const slide = pres.addSlide();
      await renderVisitPPT(slide, visit, campaign.name, margin, tempPaths);
    }

    const fileName = `campaign-${campaignId}-report.pptx`;
    const filePath = path.join(__dirname, '../../uploads', fileName);
    await pres.writeFile({ fileName: filePath });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    const fileBuffer = await fs.readFile(filePath);
    res.send(fileBuffer);
    await fs.unlink(filePath);
    // Cleanup temp images
    for (const p of tempPaths) {
      try { await fs.unlink(p); } catch {}
    }
  } catch (error) {
    console.error('Error generating PowerPoint:', error);
    res.status(500).json({ error: 'Failed to generate PowerPoint report' });
  }
});

export { router as reportRoutes };

// New POST endpoints matching client expectations with date filtering
interface ReportOptions {
  reportType: 'single' | 'range' | 'all';
  selectedDate?: string; // ISO date
  startDate?: string;    // ISO date
  endDate?: string;      // ISO date
}

function filterVisits(visits: any[], options: ReportOptions): any[] {
  if (options.reportType === 'all') return visits;
  // Local YYYY-MM-DD for deterministic comparisons
  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (options.reportType === 'single' && options.selectedDate) {
    const target = options.selectedDate;
    return visits.filter(v => {
      const ymd = toLocalYMD(new Date(v.date));
      return ymd === target;
    });
  }

  if (options.reportType === 'range' && options.startDate && options.endDate) {
    const start = options.startDate;
    const end = options.endDate;
    return visits.filter(v => {
      const ymd = toLocalYMD(new Date(v.date));
      return ymd >= start && ymd <= end;
    });
  }
  return visits; // fallback
}

router.post('/pdf', async (req, res) => {
  try {
    const { campaignId, reportType, selectedDate, startDate, endDate } = req.body as { campaignId: string } & ReportOptions;
    if (!campaignId) return res.status(400).json({ error: 'campaignId is required' });

    const campaign = await db.getCampaignWithVisits(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const filteredVisits = filterVisits(campaign.visits, { reportType, selectedDate, startDate, endDate });

  const doc = new PDFDocument({ size: [960, 540], margins: { top: 24, left: 24, right: 24, bottom: 24 } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${campaignId}-report.pdf"`);
    doc.pipe(res);

    const margin = 36;
    if (filteredVisits.length > 0) {
      // First visit on the initial page
      await renderVisitPDF(doc, filteredVisits[0] as VisitLike, campaign.name, margin);
      for (let i = 1; i < filteredVisits.length; i++) {
  doc.addPage({ size: [960, 540], margins: { top: 24, left: 24, right: 24, bottom: 24 } });
        await renderVisitPDF(doc, filteredVisits[i] as VisitLike, campaign.name, margin);
      }
    } else {
      doc.fontSize(14).text('No visits match the selected criteria.', margin, margin);
    }

    doc.end();
  } catch (error) {
    console.error('Error generating PDF (POST):', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

router.post('/powerpoint', async (req, res) => {
  try {
    const { campaignId, reportType, selectedDate, startDate, endDate } = req.body as { campaignId: string } & ReportOptions;
    if (!campaignId) return res.status(400).json({ error: 'campaignId is required' });

    const campaign = await db.getCampaignWithVisits(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const filteredVisits = filterVisits(campaign.visits, { reportType, selectedDate, startDate, endDate });

  const pres = new pptxgen();
  // Set widescreen layout to 13.33 x 7.5 inches
  pres.defineLayout({ name: 'WIDE_1333x75', width: 13.33, height: 7.5 });
  pres.layout = 'WIDE_1333x75';

    const margin = 0.5;
    const tempPaths: string[] = [];
    for (const visit of filteredVisits) {
      const slide = pres.addSlide();
      await renderVisitPPT(slide, visit as VisitLike, campaign.name, margin, tempPaths);
    }

    const fileName = `campaign-${campaignId}-report.pptx`;
    const filePath = path.join(__dirname, '../../uploads', fileName);
    await pres.writeFile({ fileName: filePath });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename=\"${fileName}\"`);
    const fileBuffer = await fs.readFile(filePath);
    res.send(fileBuffer);
    await fs.unlink(filePath);
    for (const p of tempPaths) {
      try { await fs.unlink(p); } catch {}
    }
  } catch (error) {
    console.error('Error generating PowerPoint (POST):', error);
    res.status(500).json({ error: 'Failed to generate PowerPoint report' });
  }
});
