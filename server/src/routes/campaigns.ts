import { Router } from 'express';
import { Database, supabase } from '../lib/supabase';
import type { CreateCampaignRequest, ApiResponse, Campaign } from '../../../shared/types';

const router = Router();
const db = new Database();

// Debug: raw Supabase read (keep above parameterized routes)
router.get('/debug/raw', async (_req, res) => {
  const { data, error } = await supabase.from('campaigns').select('*');
  res.json({ data, error });
});

router.get('/debug/derived', async (_req, res) => {
  try {
    const result = await db.getCampaigns();
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ ok: false, message: e?.message, details: e });
  }
});

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await db.getCampaigns();
    
    const response: ApiResponse<Campaign[]> = {
      success: true,
      data: campaigns
    };
    
    res.json(response);
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    const response: ApiResponse<never> & { errorMessage?: string; errorDetails?: { message?: string; code?: string; details?: string; hint?: string } } = {
      success: false,
      error: 'Failed to fetch campaigns',
      errorMessage: error?.message,
      errorDetails: error ? {
        message: error.message ?? error?.error ?? undefined,
        code: error.code ?? undefined,
        details: error.details ?? undefined,
        hint: error.hint ?? undefined
      } : undefined
    };
    res.status(500).json(response);
  }
});

// Alternate list endpoint for debugging
router.get('/list', async (_req, res) => {
  try {
    const campaigns = await db.getCampaigns();
    res.json({ success: true, data: campaigns, via: 'list' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch campaigns', message: error?.message, via: 'list' });
  }
});

// Get campaign by ID
router.get('/:id', async (req, res) => {
  try {
    const campaign = await db.getCampaignById(req.params.id);
    
    if (!campaign) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Campaign not found'
      };
      return res.status(404).json(response);
    }
    
    const response: ApiResponse<Campaign> = {
      success: true,
      data: campaign
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch campaign'
    };
    res.status(500).json(response);
  }
});

// Create new campaign
router.post('/', async (req, res) => {
  try {
    const campaignData: CreateCampaignRequest = req.body;
    
    const campaign = await db.createCampaign(campaignData);
    
    const response: ApiResponse<Campaign> = {
      success: true,
      data: campaign
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating campaign:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to create campaign'
    };
    res.status(500).json(response);
  }
});

// Update campaign
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    
    const campaign = await db.updateCampaign(req.params.id, updates);
    
    const response: ApiResponse<Campaign> = {
      success: true,
      data: campaign
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error updating campaign:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to update campaign'
    };
    res.status(500).json(response);
  }
});

// Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    await db.deleteCampaign(req.params.id);
    
    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: req.params.id }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error deleting campaign:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to delete campaign'
    };
    res.status(500).json(response);
  }
});

export { router as campaignRoutes };
