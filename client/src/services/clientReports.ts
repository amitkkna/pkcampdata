import jsPDF from 'jspdf';
import pptxgen from 'pptxgenjs';
import type { Visit } from '../../../shared/types';

// Helper to load image and convert to base64
const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
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
    }
  ): Promise<Blob> => {
    // Import here to avoid loading on initial bundle
    const { campaignApi } = await import('./supabaseApi');
    
    const campaign = await campaignApi.getById(campaignId);
    const filteredVisits = filterVisitsByDate(campaign.visits || [], options);
    
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    
    // Title page
    doc.setFontSize(24);
    doc.text('Campaign Report', margin, 40);
    
    doc.setFontSize(16);
    doc.text(`Campaign: ${campaign.name}`, margin, 60);
    doc.text(`Client: ${campaign.clientName}`, margin, 80);
    doc.text(`Duration: ${new Date(campaign.startDate).toLocaleDateString()} - ${new Date(campaign.endDate).toLocaleDateString()}`, margin, 100);
    doc.text(`Total Visits: ${filteredVisits.length}`, margin, 120);
    
    // Process each visit
    for (let i = 0; i < filteredVisits.length; i++) {
      const visit = filteredVisits[i];
      
      if (i > 0) doc.addPage(); // New page for each visit (except first)
      
      // Visit header
      doc.setFontSize(18);
      doc.text(`Visit ${i + 1}: ${visit.location}`, margin, 40);
      
      doc.setFontSize(12);
      doc.text(`Date: ${new Date(visit.date).toLocaleString()}`, margin, 60);
      doc.text(`Notes: ${visit.notes || 'No notes provided'}`, margin, 80);
      
      // Add photos if available
      const photos = getVisitPhotos(visit);
      if (photos.length > 0) {
        try {
          let currentY = 100;
          const photoWidth = 80;
          const photoHeight = 60;
          const photosPerRow = 2;
          
          for (let j = 0; j < photos.length; j++) {
            const row = Math.floor(j / photosPerRow);
            const col = j % photosPerRow;
            const x = margin + col * (photoWidth + 10);
            const y = currentY + row * (photoHeight + 10);
            
            // Check if we need a new page
            if (y + photoHeight > pageHeight - margin) {
              doc.addPage();
              currentY = 40;
              const newY = currentY + row * (photoHeight + 10);
              
              try {
                const base64Image = await loadImageAsBase64(photos[j]);
                doc.addImage(base64Image, 'JPEG', x, newY, photoWidth, photoHeight);
              } catch (error) {
                console.warn(`Failed to load image ${photos[j]}:`, error);
                // Draw placeholder rectangle
                doc.rect(x, newY, photoWidth, photoHeight);
                doc.text('Image not available', x + 5, newY + 30);
              }
            } else {
              try {
                const base64Image = await loadImageAsBase64(photos[j]);
                doc.addImage(base64Image, 'JPEG', x, y, photoWidth, photoHeight);
              } catch (error) {
                console.warn(`Failed to load image ${photos[j]}:`, error);
                // Draw placeholder rectangle
                doc.rect(x, y, photoWidth, photoHeight);
                doc.text('Image not available', x + 5, y + 30);
              }
            }
          }
        } catch (error) {
          console.error('Error adding photos to PDF:', error);
        }
      }
    }
    
    return new Blob([doc.output('blob')], { type: 'application/pdf' });
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
    // Import here to avoid loading on initial bundle
    const { campaignApi } = await import('./supabaseApi');
    
    const campaign = await campaignApi.getById(campaignId);
    const filteredVisits = filterVisitsByDate(campaign.visits || [], options);
    
    const pptx = new pptxgen();
    
    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.addText('Campaign Report', { 
      x: 1, y: 1, w: 8, h: 1, 
      fontSize: 32, bold: true, align: 'center' 
    });
    titleSlide.addText(`Campaign: ${campaign.name}`, { 
      x: 1, y: 2.5, w: 8, h: 0.5, 
      fontSize: 18, align: 'center' 
    });
    titleSlide.addText(`Client: ${campaign.clientName}`, { 
      x: 1, y: 3, w: 8, h: 0.5, 
      fontSize: 16, align: 'center' 
    });
    titleSlide.addText(`Duration: ${new Date(campaign.startDate).toLocaleDateString()} - ${new Date(campaign.endDate).toLocaleDateString()}`, { 
      x: 1, y: 3.5, w: 8, h: 0.5, 
      fontSize: 14, align: 'center' 
    });
    titleSlide.addText(`Total Visits: ${filteredVisits.length}`, { 
      x: 1, y: 4, w: 8, h: 0.5, 
      fontSize: 14, align: 'center' 
    });
    
    // Visit slides
    for (let i = 0; i < filteredVisits.length; i++) {
      const visit = filteredVisits[i];
      const slide = pptx.addSlide();
      
      // Visit header
      slide.addText(`Visit ${i + 1}: ${visit.location}`, { 
        x: 0.5, y: 0.3, w: 9, h: 0.8, 
        fontSize: 24, bold: true 
      });
      
      slide.addText(`Date: ${new Date(visit.date).toLocaleString()}`, { 
        x: 0.5, y: 1.2, w: 9, h: 0.4, 
        fontSize: 14 
      });
      
      slide.addText(`Notes: ${visit.notes || 'No notes provided'}`, { 
        x: 0.5, y: 1.7, w: 9, h: 0.6, 
        fontSize: 12 
      });
      
      // Add photos
      const photos = getVisitPhotos(visit);
      if (photos.length > 0) {
        const photosPerRow = 2;
        const photoWidth = 3.5;
        const photoHeight = 2.5;
        
        for (let j = 0; j < Math.min(photos.length, 4); j++) {
          const row = Math.floor(j / photosPerRow);
          const col = j % photosPerRow;
          const x = 1 + col * (photoWidth + 0.5);
          const y = 2.8 + row * (photoHeight + 0.3);
          
          try {
            slide.addImage({ 
              path: photos[j], 
              x, y, w: photoWidth, h: photoHeight 
            });
          } catch (error) {
            console.warn(`Failed to add image to slide:`, error);
            // Add placeholder text
            slide.addText('Image not available', { 
              x, y, w: photoWidth, h: photoHeight, 
              fontSize: 12, align: 'center' 
            });
          }
        }
      }
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
