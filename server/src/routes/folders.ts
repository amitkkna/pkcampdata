import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import sharp from 'sharp';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Helper function to generate photo filename
const generatePhotoFilename = (location: string, campaignName: string, date: Date = new Date()): string => {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
  const cleanLocation = location.replace(/[^a-zA-Z0-9]/g, '-');
  const cleanCampaign = campaignName.replace(/[^a-zA-Z0-9]/g, '-');
  return `${cleanLocation}-${cleanCampaign}-${dateStr}`;
};

// Helper function to optimize image
const optimizeImage = async (buffer: Buffer): Promise<Buffer> => {
  return await sharp(buffer)
    .resize(1200, 1200, { 
      fit: 'inside',
      withoutEnlargement: true 
    })
    .jpeg({ quality: 85 })
    .toBuffer();
};

// Get all folders for a campaign
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    // This is a placeholder - in real implementation, you'd query your database
    // For now, return mock data structure
    const folders = [
      {
        id: uuidv4(),
        name: 'Bemetara',
        location: 'Bemetara',
        campaignId: req.params.campaignId,
        photos: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    res.json({ success: true, data: folders });
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch folders' });
  }
});

// Create a new folder
router.post('/', async (req, res) => {
  try {
    const { name, location, campaignId } = req.body;

    if (!name || !location || !campaignId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, location, and campaignId are required' 
      });
    }

    // Create new folder
    const newFolder = {
      id: uuidv4(),
      name,
      location,
      campaignId,
      photos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // In real implementation, save to database here
    console.log('Creating folder:', newFolder);

    res.json({ success: true, data: newFolder });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ success: false, error: 'Failed to create folder' });
  }
});

// Upload photos to a folder
router.post('/:folderId/photos', upload.array('photos', 10), async (req, res) => {
  try {
    const { folderId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No files uploaded' 
      });
    }

    // In real implementation, fetch folder and campaign details from database
    const folderLocation = req.body.location || 'Unknown';
    const campaignName = req.body.campaignName || 'Unknown';

    const uploadedPhotos = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Optimize image
        const optimizedBuffer = await optimizeImage(file.buffer);
        
        // Use original filename as-is (preserve original name)
        const filename = file.originalname;
        
        // In real implementation, upload to Supabase Storage here
        const photoUrl = `/uploads/folder-${folderId}/${filename}`;
        
        const photoRecord = {
          id: uuidv4(),
          filename,
          originalName: file.originalname,
          photoUrl,
          uploadDate: new Date().toISOString(),
          folderId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        uploadedPhotos.push(photoRecord);
        
        console.log(`Uploaded photo: ${filename} for folder ${folderId}`);
      } catch (uploadError) {
        console.error(`Failed to upload ${file.originalname}:`, uploadError);
        // Continue with other files
      }
    }

    res.json({ success: true, data: uploadedPhotos });
  } catch (error) {
    console.error('Error uploading photos:', error);
    res.status(500).json({ success: false, error: 'Failed to upload photos' });
  }
});

// Get folder details with photo count
router.get('/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    
    // In real implementation, fetch from database
    const folder = {
      id: folderId,
      name: 'Bemetara',
      location: 'Bemetara',
      campaignId: 'sample-campaign-id',
      photos: [], // This would contain actual photo records
      photoCount: 0, // Calculated from photos array or separate query
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.json({ success: true, data: folder });
  } catch (error) {
    console.error('Error fetching folder:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch folder' });
  }
});

// Delete a folder and all its photos
router.delete('/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    
    // In real implementation:
    // 1. Delete all photos from storage
    // 2. Delete all photo records from database
    // 3. Delete folder record from database
    
    console.log(`Deleting folder: ${folderId}`);
    
    res.json({ success: true, data: { id: folderId } });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ success: false, error: 'Failed to delete folder' });
  }
});

export default router;