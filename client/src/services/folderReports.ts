import type { Folder, Campaign } from '../../../shared/types';

// Helper function to clean up filename for display
const cleanFilename = (filename: string): string => {
  // Decode URL encoding (e.g., %20 -> space)
  let cleaned = decodeURIComponent(filename);
  
  // Remove 'visit-' prefix if present
  cleaned = cleaned.replace(/^visit-/, '');
  
  // Remove all file extensions (including double extensions like .jpeg.jpg)
  // Keep removing extensions until there are no more
  while (/\.[^/.]+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\.[^/.]+$/, '');
  }
  
  return cleaned;
};

// Helper function to load image with size info and optimize for smaller file size
const loadImageBase64WithSize = (url: string): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Optimize image dimensions for smaller file size while maintaining quality
      const maxWidth = 800;  // Reduced from potentially larger original size
      const maxHeight = 600; // Reduced from potentially larger original size
      
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw with better quality settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      // Lower JPEG quality for smaller file size (0.65 instead of 0.85)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
      resolve({ dataUrl, width, height });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

// Generate folder-based PDF report with flexible options
export const generateFolderPDF = async (
  folder: Folder,
  campaign: Campaign,
  options: {
    selectedPhotoIds?: string[];
    photosPerPage?: number;
  } = {}
): Promise<void> => {
  try {
    const { jsPDF } = await import('jspdf');

    const format: [number, number] = [960, 540]; // 16:9 landscape
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 24;
    const contentWidth = pageWidth - margin * 2;
    const headerPad = 8;
    const boxRadius = 8;
    doc.setLineHeightFactor(1.25);

    // Initialize with default font
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    // Footer font loading
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

    // Footer drawing
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
        } catch {
          doc.setFont('helvetica', 'normal');
        }
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        const text = 'Submitted by : Global Digital Connect';
        
        // Calculate text width to ensure proper positioning
        const textWidth = doc.getTextWidth(text);
        const rightPosition = pageWidth - margin - 5; // Add some padding from edge
        
        try {
          // Try right-aligned positioning first
          doc.text(text, rightPosition, pageHeight - 8, { align: 'right' } as any);
        } catch {
          // Fallback: Position manually from right edge
          const fallbackX = pageWidth - textWidth - margin - 10;
          doc.text(text, Math.max(fallbackX, margin), pageHeight - 8);
        }
        
        doc.setTextColor(0);
        
        try {
          doc.setFont(prevFont as any, prevStyle as any);
        } catch {
          doc.setFont('helvetica', 'normal');
        }
      } catch (error) {
        console.error('Error in drawFooter:', error);
      }
    };

    // Header box drawing
    const drawHeaderBox = (location: string) => {
      try {
        doc.setDrawColor(180);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);

        const labels = [
          `Campaign: ${campaign.name}`,
          `Location: ${location}`,
        ];
        const maxTextWidth = contentWidth - headerPad * 2;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        
        const wrappedLines = labels.map((t) => {
          try {
            return doc.splitTextToSize(t, maxTextWidth);
          } catch {
            return [t];
          }
        });
        
        const lineHeight = 16;
        const linesCount = wrappedLines.reduce((acc, lines) => acc + lines.length, 0);
        const headerH = headerPad * 2 + linesCount * lineHeight;
        
        try {
          doc.roundedRect(margin, margin, contentWidth, headerH, boxRadius, boxRadius);
        } catch {
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
        return margin + 100;
      }
    };

    // Image fitting logic
    const fitImageInto = (
      imgW: number,
      imgH: number,
      maxW: number,
      maxH: number
    ) => {
      const ratio = Math.min(maxW / imgW, maxH / imgH);
      return { w: imgW * ratio, h: imgH * ratio };
    };

    // Images box drawing
    const drawImagesBox = async (photos: string[], startY: number) => {
      try {
        const pad = 10;
        const outerH = pageHeight - startY - margin;
        doc.setDrawColor(180);
        
        try {
          doc.roundedRect(margin, startY, contentWidth, outerH, boxRadius, boxRadius);
        } catch {
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
          } catch {
            console.warn('Failed to load image:', p);
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
            } catch {
              doc.rect(x, y, w, h);
            }
            
            const inset = 8;
            const fit = fitImageInto(img.w, img.h, w - inset * 2, h - inset * 2);
            const ix = x + inset + (w - inset * 2 - fit.w) / 2;
            const iy = y + inset + (h - inset * 2 - fit.h) / 2;
            const fmt = img.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            
            try {
              doc.addImage(img.dataUrl, fmt as any, ix, iy, fit.w, fit.h);
            } catch {
              doc.setFontSize(10);
              doc.text('Image Error', ix, iy + 20);
            }
          } catch (error) {
            console.warn('Error drawing cell:', error);
          }
        };

        // Layout logic - supports 1-8 photos
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
        } else if (n === 4) {
          const cellW = (innerW - gap) / 2;
          const cellH = (innerH - gap) / 2;
          drawCell(innerX, innerY, cellW, cellH, loaded[0]);
          drawCell(innerX + cellW + gap, innerY, cellW, cellH, loaded[1]);
          drawCell(innerX, innerY + cellH + gap, cellW, cellH, loaded[2]);
          drawCell(innerX + cellW + gap, innerY + cellH + gap, cellW, cellH, loaded[3]);
        } else if (n === 5) {
          // 3 photos on top row, 2 on bottom
          const cellW = (innerW - gap * 2) / 3;
          const cellH = (innerH - gap) / 2;
          // Top row (3 photos)
          drawCell(innerX, innerY, cellW, cellH, loaded[0]);
          drawCell(innerX + cellW + gap, innerY, cellW, cellH, loaded[1]);
          drawCell(innerX + (cellW + gap) * 2, innerY, cellW, cellH, loaded[2]);
          // Bottom row (2 photos - centered)
          const bottomCellW = (innerW - gap) / 2;
          drawCell(innerX, innerY + cellH + gap, bottomCellW, cellH, loaded[3]);
          drawCell(innerX + bottomCellW + gap, innerY + cellH + gap, bottomCellW, cellH, loaded[4]);
        } else if (n === 6) {
          // 3x2 grid
          const cellW = (innerW - gap * 2) / 3;
          const cellH = (innerH - gap) / 2;
          // Top row
          drawCell(innerX, innerY, cellW, cellH, loaded[0]);
          drawCell(innerX + cellW + gap, innerY, cellW, cellH, loaded[1]);
          drawCell(innerX + (cellW + gap) * 2, innerY, cellW, cellH, loaded[2]);
          // Bottom row
          drawCell(innerX, innerY + cellH + gap, cellW, cellH, loaded[3]);
          drawCell(innerX + cellW + gap, innerY + cellH + gap, cellW, cellH, loaded[4]);
          drawCell(innerX + (cellW + gap) * 2, innerY + cellH + gap, cellW, cellH, loaded[5]);
        } else if (n === 7) {
          // 4 photos on top row, 3 on bottom
          const topCellW = (innerW - gap * 3) / 4;
          const bottomCellW = (innerW - gap * 2) / 3;
          const cellH = (innerH - gap) / 2;
          // Top row (4 photos)
          drawCell(innerX, innerY, topCellW, cellH, loaded[0]);
          drawCell(innerX + topCellW + gap, innerY, topCellW, cellH, loaded[1]);
          drawCell(innerX + (topCellW + gap) * 2, innerY, topCellW, cellH, loaded[2]);
          drawCell(innerX + (topCellW + gap) * 3, innerY, topCellW, cellH, loaded[3]);
          // Bottom row (3 photos)
          drawCell(innerX, innerY + cellH + gap, bottomCellW, cellH, loaded[4]);
          drawCell(innerX + bottomCellW + gap, innerY + cellH + gap, bottomCellW, cellH, loaded[5]);
          drawCell(innerX + (bottomCellW + gap) * 2, innerY + cellH + gap, bottomCellW, cellH, loaded[6]);
        } else if (n >= 8) {
          // 4x2 grid (8 photos maximum)
          const cellW = (innerW - gap * 3) / 4;
          const cellH = (innerH - gap) / 2;
          // Top row
          drawCell(innerX, innerY, cellW, cellH, loaded[0]);
          drawCell(innerX + cellW + gap, innerY, cellW, cellH, loaded[1]);
          drawCell(innerX + (cellW + gap) * 2, innerY, cellW, cellH, loaded[2]);
          drawCell(innerX + (cellW + gap) * 3, innerY, cellW, cellH, loaded[3]);
          // Bottom row
          drawCell(innerX, innerY + cellH + gap, cellW, cellH, loaded[4]);
          drawCell(innerX + cellW + gap, innerY + cellH + gap, cellW, cellH, loaded[5]);
          drawCell(innerX + (cellW + gap) * 2, innerY + cellH + gap, cellW, cellH, loaded[6]);
          drawCell(innerX + (cellW + gap) * 3, innerY + cellH + gap, cellW, cellH, loaded[7]);
        }
      } catch (error) {
        console.error('Error drawing images box:', error);
      }
    };

    // Filter and prepare photos
    let sortedPhotos = [...folder.photos].sort((a, b) => 
      a.filename.localeCompare(b.filename)
    );

    if (options.selectedPhotoIds && options.selectedPhotoIds.length > 0) {
      sortedPhotos = sortedPhotos.filter(photo => 
        options.selectedPhotoIds!.includes(photo.id)
      );
    }

    const photosPerPage = Math.min(options.photosPerPage || 8, 8); // Maximum 8 photos per page
    const totalPages = Math.ceil(sortedPhotos.length / photosPerPage);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage();

      const startIdx = page * photosPerPage;
      const endIdx = Math.min(startIdx + photosPerPage, sortedPhotos.length);
      const pagePhotos = sortedPhotos.slice(startIdx, endIdx);
      
      // Create location text with photo filenames
      const photoFilenames = pagePhotos.map(photo => {
        // Extract filename from photo URL or use a default pattern
        const urlParts = photo.photoUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        // Clean up filename: decode URL encoding and remove extensions
        return cleanFilename(filename);
      }).join(', ');
      
      const locationWithPhotos = `${folder.location}-${photoFilenames}`;
      
      const photoUrls = pagePhotos.map(p => p.photoUrl);
      const contentStartY = drawHeaderBox(locationWithPhotos);
      await drawImagesBox(photoUrls, contentStartY);
      await drawFooter();
    }

    const filename = `${folder.location}-${campaign.name}-Photos-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);

  } catch (error) {
    console.error('Error generating folder PDF:', error);
    throw new Error(`Failed to generate PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Generate folder-based PowerPoint with flexible options
export const generateFolderPPT = async (
  folder: Folder,
  campaign: Campaign,
  options: {
    selectedPhotoIds?: string[];
    photosPerPage?: number;
  } = {}
): Promise<void> => {
  try {
    const PptxGenJS = (await import('pptxgenjs')).default;
    const pptx = new PptxGenJS();
    
    // @ts-ignore
    pptx.layout = 'LAYOUT_16x9';

    const SLIDE_W = (pptx as any).width || 10;
    const SLIDE_H = (pptx as any).height || 5.625;
    const margin = 0.33;
    const contentW = SLIDE_W - margin * 2;
    const headerH = 1.5;
    const gap = 0.15;
    const pad = 0.12;

    // Footer
    const addFooter = (slide: any) => {
      const text = 'Submitted by : Global Digital Connect';
      const style = { fontSize: 11, color: '666666', fontFace: 'Bookman Old Style' as any };
      // Ensure enough width for the full text and proper positioning
      slide.addText(text, { 
        x: SLIDE_W - margin - 5.0, // Increased width area
        y: SLIDE_H - 0.35, 
        w: 5.0, // Increased width to accommodate full text
        h: 0.3, // Slightly increased height
        align: 'right', 
        ...style 
      });
    };

    // Helper to load images as base64 with size info
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

    // Filter and prepare photos
    let sortedPhotos = [...folder.photos].sort((a, b) => 
      a.filename.localeCompare(b.filename)
    );

    if (options.selectedPhotoIds && options.selectedPhotoIds.length > 0) {
      sortedPhotos = sortedPhotos.filter(photo => 
        options.selectedPhotoIds!.includes(photo.id)
      );
    }

    const photosPerPage = Math.min(options.photosPerPage || 8, 8); // Maximum 8 photos per page
    const totalPages = Math.ceil(sortedPhotos.length / photosPerPage);

    for (let page = 0; page < totalPages; page++) {
      const slide = pptx.addSlide();
      
      const startIdx = page * photosPerPage;
      const endIdx = Math.min(startIdx + photosPerPage, sortedPhotos.length);
      const pagePhotos = sortedPhotos.slice(startIdx, endIdx);
      
      // Create location text with photo filenames
      const photoFilenames = pagePhotos.map(photo => {
        // Extract filename from photo URL or use a default pattern
        const urlParts = photo.photoUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        // Clean up filename: decode URL encoding and remove extensions
        return cleanFilename(filename);
      }).join(', ');
      
      const locationWithPhotos = `${folder.location}-${photoFilenames}`;
      
      // Header rounded rectangle
      // @ts-ignore
      slide.addShape('roundRect', {
        x: margin, y: margin, w: contentW, h: headerH,
        line: { color: 'BBBBBB', width: 1 }, fill: { color: 'FFFFFF' }, rectRadius: 0.15
      });

      // Header text
      const headerText = [
        `Campaign: ${campaign.name}`,
        `Location: ${locationWithPhotos}`,
      ].join('\n');
      
      slide.addText(headerText, {
        x: margin + pad, y: margin + pad, w: contentW - pad * 2, h: headerH - pad * 2,
        fontSize: 12, color: '000000'
      });

      // Outer images box
      const imagesTop = margin + headerH + gap;
      const imagesH = SLIDE_H - imagesTop - margin - 0.3;
      // @ts-ignore
      slide.addShape('roundRect', {
        x: margin, y: imagesTop, w: contentW, h: imagesH,
        line: { color: 'BBBBBB', width: 1 }, fill: { color: 'FFFFFF' }, rectRadius: 0.15
      });

      // Load images
      const loaded: Array<{ dataUrl: string; w: number; h: number }> = [];
      for (const photo of pagePhotos) {
        try {
          const { dataUrl, w, h } = await loadImageBase64WithSize(photo.photoUrl);
          loaded.push({ dataUrl, w, h });
        } catch (e) {
          console.warn('Failed to load image:', photo.photoUrl);
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

      // Layout logic - supports 1-8 photos
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
      } else if (n === 4) {
        const cellW = (innerW - gapImg) / 2;
        const cellH = (innerH - gapImg) / 2;
        drawCell(innerX, innerY, cellW, cellH, loaded[0]);
        drawCell(innerX + cellW + gapImg, innerY, cellW, cellH, loaded[1]);
        drawCell(innerX, innerY + cellH + gapImg, cellW, cellH, loaded[2]);
        drawCell(innerX + cellW + gapImg, innerY + cellH + gapImg, cellW, cellH, loaded[3]);
      } else if (n === 5) {
        // 3 photos on top row, 2 on bottom
        const cellW = (innerW - gapImg * 2) / 3;
        const cellH = (innerH - gapImg) / 2;
        // Top row (3 photos)
        drawCell(innerX, innerY, cellW, cellH, loaded[0]);
        drawCell(innerX + cellW + gapImg, innerY, cellW, cellH, loaded[1]);
        drawCell(innerX + (cellW + gapImg) * 2, innerY, cellW, cellH, loaded[2]);
        // Bottom row (2 photos - centered)
        const bottomCellW = (innerW - gapImg) / 2;
        drawCell(innerX, innerY + cellH + gapImg, bottomCellW, cellH, loaded[3]);
        drawCell(innerX + bottomCellW + gapImg, innerY + cellH + gapImg, bottomCellW, cellH, loaded[4]);
      } else if (n === 6) {
        // 3x2 grid
        const cellW = (innerW - gapImg * 2) / 3;
        const cellH = (innerH - gapImg) / 2;
        // Top row
        drawCell(innerX, innerY, cellW, cellH, loaded[0]);
        drawCell(innerX + cellW + gapImg, innerY, cellW, cellH, loaded[1]);
        drawCell(innerX + (cellW + gapImg) * 2, innerY, cellW, cellH, loaded[2]);
        // Bottom row
        drawCell(innerX, innerY + cellH + gapImg, cellW, cellH, loaded[3]);
        drawCell(innerX + cellW + gapImg, innerY + cellH + gapImg, cellW, cellH, loaded[4]);
        drawCell(innerX + (cellW + gapImg) * 2, innerY + cellH + gapImg, cellW, cellH, loaded[5]);
      } else if (n === 7) {
        // 4 photos on top row, 3 on bottom
        const topCellW = (innerW - gapImg * 3) / 4;
        const bottomCellW = (innerW - gapImg * 2) / 3;
        const cellH = (innerH - gapImg) / 2;
        // Top row (4 photos)
        drawCell(innerX, innerY, topCellW, cellH, loaded[0]);
        drawCell(innerX + topCellW + gapImg, innerY, topCellW, cellH, loaded[1]);
        drawCell(innerX + (topCellW + gapImg) * 2, innerY, topCellW, cellH, loaded[2]);
        drawCell(innerX + (topCellW + gapImg) * 3, innerY, topCellW, cellH, loaded[3]);
        // Bottom row (3 photos)
        drawCell(innerX, innerY + cellH + gapImg, bottomCellW, cellH, loaded[4]);
        drawCell(innerX + bottomCellW + gapImg, innerY + cellH + gapImg, bottomCellW, cellH, loaded[5]);
        drawCell(innerX + (bottomCellW + gapImg) * 2, innerY + cellH + gapImg, bottomCellW, cellH, loaded[6]);
      } else if (n >= 8) {
        // 4x2 grid (8 photos maximum)
        const cellW = (innerW - gapImg * 3) / 4;
        const cellH = (innerH - gapImg) / 2;
        // Top row
        drawCell(innerX, innerY, cellW, cellH, loaded[0]);
        drawCell(innerX + cellW + gapImg, innerY, cellW, cellH, loaded[1]);
        drawCell(innerX + (cellW + gapImg) * 2, innerY, cellW, cellH, loaded[2]);
        drawCell(innerX + (cellW + gapImg) * 3, innerY, cellW, cellH, loaded[3]);
        // Bottom row
        drawCell(innerX, innerY + cellH + gapImg, cellW, cellH, loaded[4]);
        drawCell(innerX + cellW + gapImg, innerY + cellH + gapImg, cellW, cellH, loaded[5]);
        drawCell(innerX + (cellW + gapImg) * 2, innerY + cellH + gapImg, cellW, cellH, loaded[6]);
        drawCell(innerX + (cellW + gapImg) * 3, innerY + cellH + gapImg, cellW, cellH, loaded[7]);
      } else {
        drawCell(innerX, innerY, innerW, innerH);
      }

      addFooter(slide);
    }

    const filename = `${folder.location}-${campaign.name}-Photos-${new Date().toISOString().split('T')[0]}.pptx`;
    await pptx.writeFile({ fileName: filename });

  } catch (error) {
    console.error('Error generating folder PPT:', error);
    throw new Error(`Failed to generate PowerPoint report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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