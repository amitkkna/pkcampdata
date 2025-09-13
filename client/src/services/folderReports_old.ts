import type { Folder, Campaign } from '../../../shared/types';

// Helper function to load image with size info
const loadImageBase64WithSize = (url: string): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

// Generate folder-based PDF report with EXACT same layout as visit system
export const generateFolderPDF = async (
  folder: Folder,
  campaign: Campaign,
  options: {
    selectedPhotoIds?: string[];
    photosPerPage?: number;
  } = {}
): Promise<void> => {
  try {
    // Dynamic import to reduce bundle size
    const { jsPDF } = await import('jspdf');

    // Use EXACT same format as existing system
    const format: [number, number] = [960, 540]; // 16:9 landscape
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 24; // pts - SAME as existing
    const contentWidth = pageWidth - margin * 2;
    const headerPad = 8;
    const boxRadius = 8;
    doc.setLineHeightFactor(1.25);

    // Initialize with default font to ensure font metrics are available
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    // Footer font loading (SAME as existing system)
    let footerFontLoaded = false;
    const ensureFooterFont = async () => {
      if (footerFontLoaded) return;
      const tryPaths = ['/fonts/bookman-old-style.ttf', '/fonts/BOOKOS.TTF'];
      for (const p of tryPaths) {
        try {
          const res = await fetch(p);
          if (!res.ok) continue;
          const buf = await res.arrayBuffer();
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

  // EXACT same footer as existing system
  const drawFooter = async () => {
    try {
      await ensureFooterFont();
      const prevFont = doc.getFont()?.fontName || 'helvetica';
      const prevStyle = doc.getFont()?.fontStyle || 'normal';
      
      try {
        if (footerFontLoaded) {
          // @ts-ignore known font added dynamically
          doc.setFont('BookmanOldStyle', 'normal');
        } else {
          doc.setFont('times', 'normal');
        }
      } catch (fontError) {
        console.warn('Error setting custom font, using default:', fontError);
        doc.setFont('helvetica', 'normal');
      }
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      const text = 'Submitted by : Global Digital Connect';
      
      try {
        doc.text(text, pageWidth - margin, pageHeight - 8, { align: 'right' } as any);
      } catch (textError) {
        console.warn('Error drawing footer text:', textError);
        // Fallback without alignment
        doc.text(text, pageWidth - margin - 100, pageHeight - 8);
      }
      
      doc.setTextColor(0);
      
      try {
        doc.setFont(prevFont as any, prevStyle as any);
      } catch (restoreError) {
        console.warn('Error restoring font:', restoreError);
        doc.setFont('helvetica', 'normal');
      }
    } catch (error) {
      console.error('Error in drawFooter:', error);
      // Continue without footer rather than breaking the whole PDF
    }
  };

  // EXACT same header box layout but adapted for folder info
  const drawHeaderBox = (folderName: string, location: string, photoCount: number) => {
    try {
      doc.setDrawColor(180);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);

      const labels = [
        `Campaign: ${campaign.name}`,
        `Location: ${location}`,
        `Folder: ${folderName}`,
        `Photos: ${photoCount}`,
      ];
      const maxTextWidth = contentWidth - headerPad * 2;
      
      // Ensure font is properly set before calling splitTextToSize
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      
      const wrappedLines = labels.map((t) => {
        try {
          return doc.splitTextToSize(t, maxTextWidth);
        } catch (error) {
          console.warn('Error splitting text:', t, error);
          // Fallback: return text as single line if splitting fails
          return [t];
        }
      });
      
      const lineHeight = 16;
      const linesCount = wrappedLines.reduce((acc, lines) => acc + lines.length, 0);
      const headerH = headerPad * 2 + linesCount * lineHeight;
      
      try {
        doc.roundedRect(margin, margin, contentWidth, headerH, boxRadius, boxRadius);
      } catch (error) {
        console.warn('Error drawing rounded rect, using regular rect:', error);
        doc.rect(margin, margin, contentWidth, headerH);
      }

      let yCursor = margin + headerPad + 12;
      wrappedLines.forEach((lines) => {
        try {
          doc.text(lines, margin + headerPad, yCursor);
          yCursor += lineHeight;
        } catch (error) {
          console.warn('Error drawing text:', lines, error);
        }
      });
      return margin + headerH + 10;
    } catch (error) {
      console.error('Error in drawHeaderBox:', error);
      // Fallback: return a minimal header height
      return margin + 100;
    }
  };

  // EXACT same image fitting logic
  const fitImageInto = (
    imgW: number,
    imgH: number,
    maxW: number,
    maxH: number
  ) => {
    const ratio = Math.min(maxW / imgW, maxH / imgH);
    return { w: imgW * ratio, h: imgH * ratio };
  };

  // EXACT same images box layout
  const drawImagesBox = async (photos: string[], startY: number) => {
    try {
      const pad = 10;
      const outerH = pageHeight - startY - margin;
      doc.setDrawColor(180);
      
      try {
        doc.roundedRect(margin, startY, contentWidth, outerH, boxRadius, boxRadius);
      } catch (rectError) {
        console.warn('Error drawing rounded rect, using regular rect:', rectError);
        doc.rect(margin, startY, contentWidth, outerH);
      }
      
      const innerX = margin + pad;
      const innerY = startY + pad;
      const innerW = contentWidth - pad * 2;
      const innerH = outerH - pad * 2;

      const loaded: Array<{ dataUrl: string; w: number; h: number }> = [];
      for (const p of photos) {
        try {
          const { dataUrl, width, height } = await loadImageBase64WithSize(p);
          loaded.push({ dataUrl, w: width, h: height });
        } catch (imgError) {
          console.warn('Failed to load image:', p, imgError);
          // ignore failed image
        }
      }

      const n = loaded.length;
      if (n === 0) return;

      const gap = 10;

      const drawCell = (x: number, y: number, w: number, h: number, img: { dataUrl: string; w: number; h: number }) => {
        try {
          doc.setDrawColor(200);
          try {
            doc.roundedRect(x, y, w, h, 6, 6);
          } catch (cellRectError) {
            console.warn('Error drawing rounded cell rect, using regular rect:', cellRectError);
            doc.rect(x, y, w, h);
          }
          
          const inset = 8;
          const fit = fitImageInto(img.w, img.h, w - inset * 2, h - inset * 2);
          const ix = x + inset + (w - inset * 2 - fit.w) / 2;
          const iy = y + inset + (h - inset * 2 - fit.h) / 2;
          const fmt = img.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          
          try {
            doc.addImage(img.dataUrl, fmt as any, ix, iy, fit.w, fit.h);
          } catch (imageError) {
            console.warn('Error adding image to PDF:', imageError);
            // Draw placeholder text instead
            doc.setFontSize(10);
            doc.text('Image Error', ix, iy + 20);
          }
        } catch (cellError) {
          console.warn('Error drawing cell:', cellError);
        }
      };

    // EXACT same layout logic: 1, 2, 3, or 4+ photos
    if (n === 1) {
      drawCell(innerX, innerY, innerW, innerH, loaded[0]);
    } else if (n === 2) {
      const cellW = (innerW - gap) / 2;
      const cellH = innerH;
      drawCell(innerX, innerY, cellW, cellH, loaded[0]);
      drawCell(innerX + cellW + gap, innerY, cellW, cellH, loaded[1]);
    } else if (n === 3) {
      const leftW = Math.round((innerW - gap) * 0.6);
      const rightW = innerW - gap - leftW;
      const rightH = (innerH - gap) / 2;
      drawCell(innerX, innerY, leftW, innerH, loaded[0]);
      drawCell(innerX + leftW + gap, innerY, rightW, rightH, loaded[1]);
      drawCell(innerX + leftW + gap, innerY + rightH + gap, rightW, rightH, loaded[2]);
    } else if (n >= 4) {
      // 4+ => 2x2 grid of first 4
      const cellW = (innerW - gap) / 2;
      const cellH = (innerH - gap) / 2;
      drawCell(innerX, innerY, cellW, cellH, loaded[0]);
      drawCell(innerX + cellW + gap, innerY, cellW, cellH, loaded[1] || loaded[0]);
      drawCell(innerX, innerY + cellH + gap, cellW, cellH, loaded[2] || loaded[0]);
      drawCell(innerX + cellW + gap, innerY + cellH + gap, cellW, cellH, loaded[3] || loaded[0]);
    }
    
    } catch (drawError) {
      console.error('Error drawing images box:', drawError);
      // Continue without images rather than breaking the PDF
    }
  };

  // Group photos by pages with flexible photos per page
  let sortedPhotos = [...folder.photos].sort((a, b) => 
    a.filename.localeCompare(b.filename)
  );

  // Filter to selected photos if specified
  if (options.selectedPhotoIds && options.selectedPhotoIds.length > 0) {
    sortedPhotos = sortedPhotos.filter(photo => 
      options.selectedPhotoIds!.includes(photo.id)
    );
  }

  // Use specified photos per page or default to 4
  const photosPerPage = options.photosPerPage || 4;
  const totalPages = Math.ceil(sortedPhotos.length / photosPerPage);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    const startIdx = page * photosPerPage;
    const endIdx = Math.min(startIdx + photosPerPage, sortedPhotos.length);
    const pagePhotos = sortedPhotos.slice(startIdx, endIdx);
    
    const photoUrls = pagePhotos.map(p => p.photoUrl);
    const contentStartY = drawHeaderBox(folder.name, folder.location, sortedPhotos.length);
    await drawImagesBox(photoUrls, contentStartY);
    await drawFooter();
  }

  // Save with same naming pattern
  const filename = `${folder.location}-${campaign.name}-Photos-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  } catch (error) {
    console.error('Error generating folder PDF:', error);
    throw new Error(`Failed to generate PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Generate folder-based PowerPoint with EXACT same layout as visit system
export const generateFolderPPT = async (
  folder: Folder,
  campaign: Campaign,
  options: {
    selectedPhotoIds?: string[];
    photosPerPage?: number;
  } = {}
): Promise<void> => {
  // Dynamic import to reduce bundle size
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  
  // EXACT same layout as existing system
  // @ts-ignore - depending on typings, layout string may be untyped
  pptx.layout = 'LAYOUT_16x9';

  const SLIDE_W = (pptx as any).width || 10;
  const SLIDE_H = (pptx as any).height || 5.625;
  const margin = 0.33; // ~24pt exactly like existing
  const contentW = SLIDE_W - margin * 2;
  const headerH = 1.5;
  const gap = 0.15;
  const pad = 0.12;

  // EXACT same footer as existing system
  const addFooter = (slide: any) => {
    const text = 'Submitted by : Global Digital Connect';
    const style = { fontSize: 11, color: '666666', fontFace: 'Bookman Old Style' as any };
    // Bottom-right positioning exactly like existing system
    slide.addText(text, { 
      x: SLIDE_W - margin - 4.0, 
      y: SLIDE_H - 0.35, 
      w: 4.0, 
      h: 0.25, 
      align: 'right', 
      ...style 
    });
  };

  // Helper to load images as base64 with size info (exactly like existing)
  const loadImageBase64WithSize = (url: string): Promise<{ dataUrl: string; w: number; h: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ dataUrl, w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  };

  // Sort photos by filename (which includes date)
  let sortedPhotos = [...folder.photos].sort((a, b) => 
    a.filename.localeCompare(b.filename)
  );

  // Filter to selected photos if specified
  if (options.selectedPhotoIds && options.selectedPhotoIds.length > 0) {
    sortedPhotos = sortedPhotos.filter(photo => 
      options.selectedPhotoIds!.includes(photo.id)
    );
  }

  // Use specified photos per page or default to 4
  const photosPerPage = options.photosPerPage || 4;
  const totalPages = Math.ceil(sortedPhotos.length / photosPerPage);

  for (let page = 0; page < totalPages; page++) {
    const slide = pptx.addSlide();
    
    const startIdx = page * photosPerPage;
    const endIdx = Math.min(startIdx + photosPerPage, sortedPhotos.length);
    const pagePhotos = sortedPhotos.slice(startIdx, endIdx);
    
    // EXACT same header rounded rectangle as existing system
    // @ts-ignore - roundRect shape
    slide.addShape('roundRect', {
      x: margin, y: margin, w: contentW, h: headerH,
      line: { color: 'BBBBBB', width: 1 }, fill: { color: 'FFFFFF' }, rectRadius: 0.15
    });

    // Header text (campaign, place, folder, photos) - adapted for folder
    const headerText = [
      `Campaign: ${campaign.name}`,
      `Location: ${folder.location}`,
      `Folder: ${folder.name}`,
      `Photos: ${sortedPhotos.length}`
    ].join('\n');
    
    slide.addText(headerText, {
      x: margin + pad, y: margin + pad, w: contentW - pad * 2, h: headerH - pad * 2,
      fontSize: 12, color: '000000'
    });

    // Outer images box with EXACT same styling as existing system
    const imagesTop = margin + headerH + gap;
    const imagesH = SLIDE_H - imagesTop - margin - 0.3; // leave small space above footer
    // @ts-ignore - roundRect shape
    slide.addShape('roundRect', {
      x: margin, y: imagesTop, w: contentW, h: imagesH,
      line: { color: 'BBBBBB', width: 1 }, fill: { color: 'FFFFFF' }, rectRadius: 0.15
    });

    // Load images as base64 with sizes (exactly like existing)
    const loaded: Array<{ dataUrl: string; w: number; h: number }> = [];
    for (const photo of pagePhotos) {
      try {
        const { dataUrl, w, h } = await loadImageBase64WithSize(photo.photoUrl);
        loaded.push({ dataUrl, w, h });
      } catch (e) {
        // ignore failures
      }
    }

    const innerX = margin + pad;
    const innerY = imagesTop + pad;
    const innerW = contentW - pad * 2;
    const innerH = imagesH - pad * 2;
    const gapImg = 0.15; // EXACT gap size from existing

    // EXACT same fitIn helper as existing system
    const fitIn = (imgW: number, imgH: number, maxW: number, maxH: number) => {
      const r = Math.min(maxW / imgW, maxH / imgH);
      return { w: imgW * r, h: imgH * r };
    };

    // EXACT same drawCell helper as existing system
    const drawCell = (x: number, y: number, w: number, h: number, img?: { dataUrl: string; w: number; h: number }) => {
      // @ts-ignore - roundRect shape
      slide.addShape('roundRect', {
        x, y, w, h, 
        line: { color: 'DDDDDD', width: 1 }, 
        fill: { color: 'FFFFFF' }, 
        rectRadius: 0.12
      });
      if (img) {
        const inset = 0.1;
        const fit = fitIn(img.w, img.h, w - inset * 2, h - inset * 2);
        const ix = x + inset + (w - inset * 2 - fit.w) / 2;
        const iy = y + inset + (h - inset * 2 - fit.h) / 2;
        slide.addImage({ data: img.dataUrl, x: ix, y: iy, w: fit.w, h: fit.h });
      }
    };

    // EXACT same image layout logic as existing system
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
      // no images: leave empty cells (exactly like existing)
      drawCell(innerX, innerY, innerW, innerH);
    }

    addFooter(slide);
  }

  // Save with same naming pattern
  const filename = `${folder.location}-${campaign.name}-Photos-${new Date().toISOString().split('T')[0]}.pptx`;
  await pptx.writeFile({ fileName: filename });
};

// Main function to generate folder-based reports
export const generateFolderReport = async (
  reportType: 'pdf' | 'ppt',
  folder: Folder,
  campaign: Campaign,
  options: {
    selectedPhotoIds?: string[];
    photosPerPage?: number;
  } = {}
): Promise<void> => {
  // Check if we have photos to work with
  const photosToProcess = options.selectedPhotoIds && options.selectedPhotoIds.length > 0
    ? folder.photos.filter(photo => options.selectedPhotoIds!.includes(photo.id))
    : folder.photos;

  if (photosToProcess.length === 0) {
    throw new Error('No photos selected for report generation');
  }

  try {
    if (reportType === 'pdf') {
      await generateFolderPDF(folder, campaign, options);
    } else {
      await generateFolderPPT(folder, campaign, options);
    }
  } catch (error) {
    console.error('Error generating folder report:', error);
    throw new Error(`Failed to generate ${reportType.toUpperCase()} report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};