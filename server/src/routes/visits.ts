import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { uploadFileToSupabase, deleteFileFromSupabase, extractFileNameFromUrl } from '../services/supabase';
import { Database } from '../lib/supabase';
import type { CreateVisitRequest, ApiResponse, Visit } from '../../../shared/types';

const router = Router();
const db = new Database();

// Configure multer for memory storage (files will be uploaded to Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get visits for a campaign
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const visits = await db.getVisitsByCampaign(req.params.campaignId);
    
    const response: ApiResponse<Visit[]> = {
      success: true,
      data: visits
    };
    
    res.json(response);
  } catch (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch visits'
    };
    res.status(500).json(response);
  }
});

// Create new visit with optional photo upload (up to 4 photos)
router.post('/', upload.array('photos', 4), async (req, res) => {
  try {
    const { date, location, notes, campaignId }: CreateVisitRequest = req.body;
    let photoUrls: (string | undefined)[] = [undefined, undefined, undefined, undefined];
    let originalFilenames: (string | undefined)[] = [undefined, undefined, undefined, undefined];
    
    if (req.files && Array.isArray(req.files)) {
      for (let i = 0; i < Math.min(req.files.length, 4); i++) {
        const file = req.files[i];
        
        // Optimize the uploaded image
        const optimizedBuffer = await sharp(file.buffer)
          .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = `visit-${uniqueSuffix}-optimized.jpg`;
        
        // Upload to Supabase Storage
        const photoUrl = await uploadFileToSupabase(optimizedBuffer, fileName, 'image/jpeg');
        
        photoUrls[i] = photoUrl;
        originalFilenames[i] = file.originalname;
      }
    }
    
    const visit = await db.createVisit({
      date: new Date(date).toISOString(),
      location,
      notes: notes || undefined,
      campaignId,
      photoUrl1: photoUrls[0],
      photoUrl2: photoUrls[1],
      photoUrl3: photoUrls[2],
      photoUrl4: photoUrls[3],
      originalFilename1: originalFilenames[0],
      originalFilename2: originalFilenames[1],
      originalFilename3: originalFilenames[2],
      originalFilename4: originalFilenames[3]
    });
    
    const response: ApiResponse<Visit> = {
      success: true,
      data: visit
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating visit:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to create visit'
    };
    res.status(500).json(response);
  }
});

// Update visit
router.put('/:id', upload.array('photos', 4), async (req, res) => {
  try {
    const { date, location, notes }: Partial<CreateVisitRequest> = req.body;
    
    const existingVisit = await db.getVisitById(req.params.id);
    
    if (!existingVisit) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Visit not found'
      };
      return res.status(404).json(response);
    }
    
    // Handle multiple photo uploads - replace all existing photos
    let photoUrls: (string | undefined)[] = [undefined, undefined, undefined, undefined];
    let originalFilenames: (string | undefined)[] = [undefined, undefined, undefined, undefined];
    
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      // Remove old photos from Supabase if they exist
      const oldUrls = [existingVisit.photoUrl1, existingVisit.photoUrl2, existingVisit.photoUrl3, existingVisit.photoUrl4];
      for (const url of oldUrls) {
        if (url) {
          const fileName = extractFileNameFromUrl(url);
          if (fileName) {
            try {
              await deleteFileFromSupabase(fileName);
            } catch (error) {
              console.error('Error deleting old photo:', error);
            }
          }
        }
      }
      
      // Process new uploaded images
      for (let i = 0; i < req.files.length && i < 4; i++) {
        const file = req.files[i] as Express.Multer.File;
        
        // Optimize the uploaded image
        const optimizedBuffer = await sharp(file.buffer)
          .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = `visit-${uniqueSuffix}-optimized.jpg`;
        
        // Upload to Supabase Storage
        const photoUrl = await uploadFileToSupabase(optimizedBuffer, fileName, 'image/jpeg');
        
        photoUrls[i] = photoUrl;
        originalFilenames[i] = file.originalname;
      }
    } else {
      // Keep existing photos if no new ones uploaded
      photoUrls[0] = existingVisit.photoUrl1 || undefined;
      photoUrls[1] = existingVisit.photoUrl2 || undefined;
      photoUrls[2] = existingVisit.photoUrl3 || undefined;
      photoUrls[3] = existingVisit.photoUrl4 || undefined;
      originalFilenames[0] = existingVisit.originalFilename1 || undefined;
      originalFilenames[1] = existingVisit.originalFilename2 || undefined;
      originalFilenames[2] = existingVisit.originalFilename3 || undefined;
      originalFilenames[3] = existingVisit.originalFilename4 || undefined;
    }
    
    const visit = await db.updateVisit(req.params.id, {
      ...(date && { date: new Date(date).toISOString() }),
      ...(location && { location }),
      notes: notes !== undefined ? notes || undefined : (existingVisit.notes || undefined),
      photoUrl1: photoUrls[0],
      photoUrl2: photoUrls[1],
      photoUrl3: photoUrls[2],
      photoUrl4: photoUrls[3],
      originalFilename1: originalFilenames[0],
      originalFilename2: originalFilenames[1],
      originalFilename3: originalFilenames[2],
      originalFilename4: originalFilenames[3]
    });
    
    const response: ApiResponse<Visit> = {
      success: true,
      data: visit
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error updating visit:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to update visit'
    };
    res.status(500).json(response);
  }
});

// Delete visit
router.delete('/:id', async (req, res) => {
  try {
    const visit = await db.getVisitById(req.params.id);
    
    if (!visit) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Visit not found'
      };
      return res.status(404).json(response);
    }
    
    // Remove photo files from Supabase Storage if they exist
    const photoUrls = [visit.photoUrl1, visit.photoUrl2, visit.photoUrl3, visit.photoUrl4];
    for (const url of photoUrls) {
      if (url) {
        const fileName = extractFileNameFromUrl(url);
        if (fileName) {
          try {
            await deleteFileFromSupabase(fileName);
          } catch (error) {
            console.error('Error deleting photo from Supabase:', error);
          }
        }
      }
    }
    
    await db.deleteVisit(req.params.id);
    
    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: req.params.id }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error deleting visit:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to delete visit'
    };
    res.status(500).json(response);
  }
});

export { router as visitRoutes };
