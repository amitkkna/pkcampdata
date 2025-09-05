import jsPDF from 'jspdf';
import pptxgen from 'pptxgenjs';
import type { Visit } from '../../../shared/types';

// Helper to load image as dataURL (avoids canvas taint) and return dimensions
const loadImageBase64WithSize = async (
  url: string
): Promise<{ dataUrl: string; width: number; height: number }> => {
  // Fetch as blob and convert without drawing to canvas
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const blob = await res.blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = dataUrl;
  });
  // Downscale very large images and always re-encode to JPEG to ensure jsPDF compatibility
  const MAX_SIDE = 1600; // px
  const { width: w, height: h } = dims;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  const tmp = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('Failed to draw image'));
    im.src = dataUrl;
  });
  ctx?.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  const jpeg = canvas.toDataURL('image/jpeg', 0.85);
  return { dataUrl: jpeg, width: canvas.width, height: canvas.height };
};

// Get photos from visit
const getVisitPhotos = (visit: Visit): string[] => {
  return [
    visit.photoUrl1,
    visit.photoUrl2, 
    visit.photoUrl3,
    visit.photoUrl4
  ].filter(Boolean) as string[];
};

// Filter visits by date options
const filterVisitsByDate = (
  visits: Visit[],
  options: {
    reportType: 'single' | 'range' | 'all';
    selectedDate?: string;
    startDate?: string;
    endDate?: string;
  }
): Visit[] => {
  if (options.reportType === 'all') {
    return visits;
  }
  
  if (options.reportType === 'single' && options.selectedDate) {
    const targetDate = new Date(options.selectedDate).toDateString();
    return visits.filter(v => new Date(v.date).toDateString() === targetDate);
  }
  
  if (options.reportType === 'range' && options.startDate && options.endDate) {
    const start = new Date(options.startDate);
    const end = new Date(options.endDate);
    return visits.filter(v => {
      const visitDate = new Date(v.date);
      return visitDate >= start && visitDate <= end;
    });
  }
  
  return visits;
};

export const reportApi = {
  // Generate PDF report
  generatePdf: async (
    campaignId: string,
    options: {
      reportType: 'single' | 'range' | 'all';
      selectedDate?: string;
      startDate?: string;
  endDate?: string;
  aspectRatio?: '16:9' | '4:3' | 'A4';
    }
  ): Promise<Blob> => {
    // Import lazily and use API selector (mock or supabase) so reports work without Supabase
    const { campaignApi } = await import('./api');

    const campaign = await campaignApi.getById(campaignId);
    const filteredVisits = filterVisitsByDate(campaign.visits || [], options);

    // Decide page size based on requested aspect ratio
    // Units in points (1in = 72pt)
    // 16:9 -> 13.333in x 7.5in = 960 x 540 pt
    // 4:3  -> 10in x 7.5in = 720 x 540 pt (classic slide size)
    // A4 landscape -> 842 x 595 pt
    const ratio = options.aspectRatio || '16:9';
    const format: [number, number] =
      ratio === '4:3' ? [720, 540] : ratio === 'A4' ? [842, 595] : [960, 540];
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 24; // pts
    const contentWidth = pageWidth - margin * 2;
    const headerPad = 8;
    const boxRadius = 8;
    doc.setLineHeightFactor(1.25);

    // Try to load Bookman Old Style font for the footer (optional at runtime)
    let footerFontLoaded = false;
    const ensureFooterFont = async () => {
      if (footerFontLoaded) return;
      const tryPaths = ['/fonts/bookman-old-style.ttf', '/fonts/BOOKOS.TTF'];
      for (const p of tryPaths) {
        try {
          const res = await fetch(p);
          if (!res.ok) continue;
          const buf = await res.arrayBuffer();
          // Convert to base64
          let binary = '';
          const bytes = new Uint8Array(buf);
          const chunk = 0x8000;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
          }
          const base64 = btoa(binary);
          doc.addFileToVFS('bookman-old-style.ttf', base64);
          doc.addFont('bookman-old-style.ttf', 'BookmanOldStyle', 'normal');
          footerFontLoaded = true;
          break;
        } catch {
          // try next path
        }
      }
    };

    const drawFooter = async () => {
      await ensureFooterFont();
      const prevFont = doc.getFont()?.fontName || 'helvetica';
      const prevStyle = doc.getFont()?.fontStyle || 'normal';
      if (footerFontLoaded) {
        // @ts-ignore known font added dynamically
        doc.setFont('BookmanOldStyle', 'normal');
      } else {
        doc.setFont('times', 'normal');
      }
      doc.setFontSize(10); // small but visible
      doc.setTextColor(100);
      const text = 'Submitted by : Global Digital Connect';
      // Bottom-right only
      doc.text(text, pageWidth - margin, pageHeight - 8, { align: 'right' } as any);
      // restore
      doc.setTextColor(0);
      doc.setFont(prevFont as any, prevStyle as any);
    };

    const drawHeaderBox = (visit: Visit) => {
      doc.setDrawColor(180);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);

      const labels = [
        `Campaign: ${campaign.name}`,
        `Place: ${visit.location}`,
        `Date: ${new Date(visit.date).toLocaleString()}`,
        `Notes: ${visit.notes || ''}`,
      ];
      const maxTextWidth = contentWidth - headerPad * 2;
      const wrappedLines = labels.map((t) => doc.splitTextToSize(t, maxTextWidth));
      const lineHeight = 16; // pt
      const linesCount = wrappedLines.reduce((acc, lines) => acc + lines.length, 0);
      const headerH = headerPad * 2 + linesCount * lineHeight;
      doc.roundedRect(margin, margin, contentWidth, headerH, boxRadius, boxRadius);

      let yCursor = margin + headerPad + 12; // baseline for first line
      wrappedLines.forEach((lines) => {
        doc.text(lines, margin + headerPad, yCursor);
        yCursor += lineHeight;
      });
      return margin + headerH + 10; // start Y for images box
    };

    const fitImageInto = (
      imgW: number,
      imgH: number,
      maxW: number,
      maxH: number
    ) => {
      const ratio = Math.min(maxW / imgW, maxH / imgH);
      return { w: imgW * ratio, h: imgH * ratio };
    };

    const drawImagesBox = async (photos: string[], startY: number) => {
      const pad = 10;
      const outerH = pageHeight - startY - margin; // available height under header
      doc.setDrawColor(180);
      doc.roundedRect(margin, startY, contentWidth, outerH, boxRadius, boxRadius);
      const innerX = margin + pad;
      const innerY = startY + pad;
      const innerW = contentWidth - pad * 2;
      const innerH = outerH - pad * 2;

      // Load images with sizes
      const loaded: Array<{ dataUrl: string; w: number; h: number }> = [];
      for (const p of photos) {
        try {
          const { dataUrl, width, height } = await loadImageBase64WithSize(p);
          loaded.push({ dataUrl, w: width, h: height });
        } catch {
          // ignore failed image
        }
      }

      const n = loaded.length;
      if (n === 0) return;

      const gap = 10;

      const drawCell = (x: number, y: number, w: number, h: number, img: { dataUrl: string; w: number; h: number }) => {
        // Each image sits in its own rounded cell
        doc.setDrawColor(200);
        doc.roundedRect(x, y, w, h, 6, 6);
        const inset = 8;
        const fit = fitImageInto(img.w, img.h, w - inset * 2, h - inset * 2);
        const ix = x + inset + (w - inset * 2 - fit.w) / 2;
        const iy = y + inset + (h - inset * 2 - fit.h) / 2;
        const fmt = img.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        try {
          doc.addImage(img.dataUrl, fmt as any, ix, iy, fit.w, fit.h);
        } catch {
          // ignore a single bad image add
        }
      };

      if (n === 1) {
        drawCell(innerX, innerY, innerW, innerH, loaded[0]);
        return;
      }

      if (n === 2) {
        const cellW = (innerW - gap) / 2;
        const cellH = innerH;
        drawCell(innerX, innerY, cellW, cellH, loaded[0]);
        drawCell(innerX + cellW + gap, innerY, cellW, cellH, loaded[1]);
        return;
      }

      if (n === 3) {
        // Big left, two stacked right
        const leftW = Math.round((innerW - gap) * 0.6);
        const rightW = innerW - gap - leftW;
        const rightH = (innerH - gap) / 2;
        drawCell(innerX, innerY, leftW, innerH, loaded[0]);
        drawCell(innerX + leftW + gap, innerY, rightW, rightH, loaded[1]);
        drawCell(innerX + leftW + gap, innerY + rightH + gap, rightW, rightH, loaded[2]);
        return;
      }

      // 4+ => 2x2 grid of first 4
      const cellW = (innerW - gap) / 2;
      const cellH = (innerH - gap) / 2;
      drawCell(innerX, innerY, cellW, cellH, loaded[0]);
      drawCell(innerX + cellW + gap, innerY, cellW, cellH, loaded[1] || loaded[0]);
      drawCell(innerX, innerY + cellH + gap, cellW, cellH, loaded[2] || loaded[0]);
      drawCell(innerX + cellW + gap, innerY + cellH + gap, cellW, cellH, loaded[3] || loaded[0]);
    };

    // Render per-visit pages matching the provided screenshots
    for (let i = 0; i < filteredVisits.length; i++) {
      try {
        const visit = filteredVisits[i];
        if (i > 0) doc.addPage();

        const photos = getVisitPhotos(visit);
        const contentStartY = drawHeaderBox(visit);
        await drawImagesBox(photos, contentStartY);
        await drawFooter();
      } catch (e) {
        // Continue with next page if one visit fails to render
        // eslint-disable-next-line no-console
        console.warn('Skipped visit due to render error', e);
      }
    }
    
  // Return as Blob
  return doc.output('blob');
  },

  // Generate PowerPoint presentation
  generatePowerpoint: async (
    campaignId: string,
    options: {
      reportType: 'single' | 'range' | 'all';
      selectedDate?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<Blob> => {
    // Import lazily and use API selector (mock or supabase) so reports work without Supabase
    const { campaignApi } = await import('./api');

    const campaign = await campaignApi.getById(campaignId);
    const filteredVisits = filterVisitsByDate(campaign.visits || [], options);
    
    const pptx = new pptxgen();
    // Ensure widescreen 16:9
    // @ts-ignore - depending on typings, layout string may be untyped
    pptx.layout = 'LAYOUT_16x9';

    // Helpers for layout in inches
    const SLIDE_W = (pptx as any).width || 10; // default 16:9 width in inches
    const SLIDE_H = (pptx as any).height || 5.625; // default 16:9 height
    const margin = 0.33; // ~24pt
    const contentW = SLIDE_W - margin * 2;
    const headerH = 1.5; // fixed header height (enough for 4 lines)
    const gap = 0.15;
    const pad = 0.12;

    const addFooter = (slide: pptxgen.Slide) => {
      const text = 'Submitted by : Global Digital Connect';
      const style = { fontSize: 11, color: '666666', fontFace: 'Bookman Old Style' as any };
      // Bottom-right only
      slide.addText(text, { x: SLIDE_W - margin - 4.0, y: SLIDE_H - 0.35, w: 4.0, h: 0.25, align: 'right', ...style });
    };

    // Optional title slide (kept, with footer)
    const titleSlide = pptx.addSlide();
    titleSlide.addText('Campaign Report', {
      x: 0, y: 1, w: SLIDE_W, h: 0.8, fontSize: 32, bold: true, align: 'center'
    });
    titleSlide.addText(`Campaign: ${campaign.name}`, {
      x: margin, y: 2.2, w: SLIDE_W - margin * 2, h: 0.4, fontSize: 18, align: 'center'
    });
    titleSlide.addText(`Client: ${campaign.clientName}`, {
      x: margin, y: 2.7, w: SLIDE_W - margin * 2, h: 0.4, fontSize: 16, align: 'center'
    });
    titleSlide.addText(`Duration: ${new Date(campaign.startDate).toLocaleDateString()} - ${new Date(campaign.endDate).toLocaleDateString()}`, {
      x: margin, y: 3.15, w: SLIDE_W - margin * 2, h: 0.4, fontSize: 14, align: 'center'
    });
    titleSlide.addText(`Total Visits: ${filteredVisits.length}`, {
      x: margin, y: 3.55, w: SLIDE_W - margin * 2, h: 0.4, fontSize: 14, align: 'center'
    });
    addFooter(titleSlide);
    
    // Visit slides
    for (let i = 0; i < filteredVisits.length; i++) {
      const visit = filteredVisits[i];
      const slide = pptx.addSlide();

      // Header rounded rectangle
      // Use a standard rectangle with slight radius if supported
      // @ts-ignore
      slide.addShape('roundRect', {
        x: margin, y: margin, w: contentW, h: headerH,
        line: { color: 'BBBBBB', width: 1 }, fill: { color: 'FFFFFF' }, rectRadius: 0.15
      });
      // Header text (campaign, place, date, notes)
      const headerText = [
        `Campaign: ${campaign.name}`,
        `Place: ${visit.location}`,
        `Date: ${new Date(visit.date).toLocaleString()}`,
        `Notes: ${visit.notes || ''}`
      ].join('\n');
      slide.addText(headerText, {
        x: margin + pad, y: margin + pad, w: contentW - pad * 2, h: headerH - pad * 2,
        fontSize: 12, color: '000000'
      });

      // Outer images box
      const imagesTop = margin + headerH + gap;
      const imagesH = SLIDE_H - imagesTop - margin - 0.3; // leave small space above footer
      // @ts-ignore
      slide.addShape('roundRect', {
        x: margin, y: imagesTop, w: contentW, h: imagesH,
        line: { color: 'BBBBBB', width: 1 }, fill: { color: 'FFFFFF' }, rectRadius: 0.15
      });

      // Load images as base64 with sizes
      const photos = getVisitPhotos(visit);
      const loaded: Array<{ dataUrl: string; w: number; h: number }> = [];
      for (const p of photos) {
        try {
          const { dataUrl, width, height } = await loadImageBase64WithSize(p);
          loaded.push({ dataUrl, w: width, h: height });
        } catch (e) {
          // ignore failures
        }
      }

      const innerX = margin + pad;
      const innerY = imagesTop + pad;
      const innerW = contentW - pad * 2;
      const innerH = imagesH - pad * 2;
      const gapImg = 0.15;

      const fitIn = (imgW: number, imgH: number, maxW: number, maxH: number) => {
        const r = Math.min(maxW / imgW, maxH / imgH);
        return { w: imgW * r, h: imgH * r };
      };

      const drawCell = (x: number, y: number, w: number, h: number, img?: { dataUrl: string; w: number; h: number }) => {
        // @ts-ignore
        slide.addShape('roundRect', {
          x, y, w, h, line: { color: 'DDDDDD', width: 1 }, fill: { color: 'FFFFFF' }, rectRadius: 0.12
        });
        if (img) {
          const inset = 0.1;
          const fit = fitIn(img.w, img.h, w - inset * 2, h - inset * 2);
          const ix = x + inset + (w - inset * 2 - fit.w) / 2;
          const iy = y + inset + (h - inset * 2 - fit.h) / 2;
          slide.addImage({ data: img.dataUrl, x: ix, y: iy, w: fit.w, h: fit.h });
        }
      };

      const n = loaded.length;
      if (n === 1) {
        drawCell(innerX, innerY, innerW, innerH, loaded[0]);
      } else if (n === 2) {
        const cellW = (innerW - gapImg) / 2;
        drawCell(innerX, innerY, cellW, innerH, loaded[0]);
        drawCell(innerX + cellW + gapImg, innerY, cellW, innerH, loaded[1]);
      } else if (n === 3) {
        const leftW = (innerW - gapImg) * 0.6;
        const rightW = innerW - gapImg - leftW;
        const rightH = (innerH - gapImg) / 2;
        drawCell(innerX, innerY, leftW, innerH, loaded[0]);
        drawCell(innerX + leftW + gapImg, innerY, rightW, rightH, loaded[1]);
        drawCell(innerX + leftW + gapImg, innerY + rightH + gapImg, rightW, rightH, loaded[2]);
      } else if (n >= 4) {
        const cellW = (innerW - gapImg) / 2;
        const cellH = (innerH - gapImg) / 2;
        drawCell(innerX, innerY, cellW, cellH, loaded[0]);
        drawCell(innerX + cellW + gapImg, innerY, cellW, cellH, loaded[1]);
        drawCell(innerX, innerY + cellH + gapImg, cellW, cellH, loaded[2]);
        drawCell(innerX + cellW + gapImg, innerY + cellH + gapImg, cellW, cellH, loaded[3]);
      } else {
        // no images: leave empty cells
        drawCell(innerX, innerY, innerW, innerH);
      }

      addFooter(slide);
    }
    
    // Generate and return blob
    const pptxData = await pptx.write({ outputType: 'blob' });
    return pptxData as Blob;
  },

  // Legacy methods for backward compatibility
  generateDailyPdf: async (campaignId: string, date: string): Promise<Blob> => {
    return reportApi.generatePdf(campaignId, { 
      reportType: 'single', 
      selectedDate: date 
    });
  },

  generateCampaignPowerpoint: async (campaignId: string): Promise<Blob> => {
    return reportApi.generatePowerpoint(campaignId, { 
      reportType: 'all' 
    });
  },
};
