import { supabase } from './supabaseClient';
import type { Campaign, Visit, CreateCampaignRequest, CreateVisitRequest } from '../../../shared/types';

// Check if Supabase is properly configured
const isConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && key && !url.includes('your-project') && !key.includes('your-anon-key');
};

// Helpers to map DB row (snake_case or camelCase) to our camelCase types
const mapVisit = (v: any): Visit => ({
  id: v.id,
  date: v.date || v.date_at || v.createdAt, // fallbacks
  location: v.location,
  notes: v.notes ?? null,
  photoUrl1: v.photo_url_1 ?? v.photoUrl1 ?? null,
  photoUrl2: v.photo_url_2 ?? v.photoUrl2 ?? null,
  photoUrl3: v.photo_url_3 ?? v.photoUrl3 ?? null,
  photoUrl4: v.photo_url_4 ?? v.photoUrl4 ?? null,
  originalFilename1: v.original_filename_1 ?? v.originalFilename1 ?? null,
  originalFilename2: v.original_filename_2 ?? v.originalFilename2 ?? null,
  originalFilename3: v.original_filename_3 ?? v.originalFilename3 ?? null,
  originalFilename4: v.original_filename_4 ?? v.originalFilename4 ?? null,
  createdAt: v.created_at ?? v.createdAt,
  updatedAt: v.updated_at ?? v.updatedAt,
  campaignId: v.campaign_id ?? v.campaignId,
});

const mapCampaign = (c: any): Campaign => ({
  id: c.id,
  name: c.name,
  clientName: c.client_name ?? c.clientName,
  startDate: c.start_date ?? c.startDate,
  endDate: c.end_date ?? c.endDate,
  description: c.description ?? null,
  targetAudience: c.target_audience ?? c.targetAudience ?? null,
  budget: c.budget ?? null,
  objectives: c.objectives ?? null,
  notes: c.notes ?? null,
  createdAt: c.created_at ?? c.createdAt,
  updatedAt: c.updated_at ?? c.updatedAt,
  visits: (c.visits || []).map((v: any) => mapVisit(v)),
});

// Direct Supabase operations - no backend needed!
export const campaignApi = {
  // Get all campaigns with visits
  getAll: async (): Promise<Campaign[]> => {
    if (!isConfigured()) {
      throw new Error('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.');
    }

    let { data, error } = await supabase
      .from('campaigns')
      .select('*, visits(*)')
      .order('id', { ascending: false });

    // If relation name differs or fails, fallback to campaigns only
    if (error && /relationship|foreign key|column .* does not exist/i.test(error.message)) {
      const retry = await supabase.from('campaigns').select('*').order('id', { ascending: false });
      data = retry.data as any;
      error = retry.error as any;
    }
    
    if (error) {
      console.error('Error fetching campaigns:', error);
      throw new Error(`Failed to fetch campaigns: ${error.message || 'Unknown error'}`);
    }
    
  // Transform to camelCase consistently
  const campaigns = (data || []).map(mapCampaign);
  // If any campaign ended up without visits but DB has visits table, attempt to hydrate counts minimally
  // (non-blocking; UI can still render)
  return campaigns;
  },

  // Get campaign by ID with visits
  getById: async (id: string): Promise<Campaign> => {
    if (!isConfigured()) {
      throw new Error('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.');
    }

    let { data, error } = await supabase
      .from('campaigns')
      .select('*, visits(*)')
      .eq('id', id)
      .single();

    if (error && /relationship|foreign key|column .* does not exist/i.test(error.message)) {
      const retry = await supabase.from('campaigns').select('*').eq('id', id).single();
      data = retry.data as any;
      error = retry.error as any;
    }
    
    if (error) {
      console.error('Error fetching campaign:', error);
      throw new Error(`Failed to fetch campaign: ${error.message || 'Not found'}`);
    }
    
    let campaign = mapCampaign(data);
    // If visits missing (relation not pulled), fetch them explicitly
    if (!campaign.visits || campaign.visits.length === 0) {
      try {
        const visits = await visitApi.getByCampaign(campaign.id);
        campaign = { ...campaign, visits };
      } catch {
        // ignore, keep basic campaign info
      }
    }
    return campaign;
  },

  // Create new campaign
  create: async (campaignData: CreateCampaignRequest): Promise<Campaign> => {
    const { data, error } = await supabase
      .from('campaigns')
      .insert([{
        name: campaignData.name,
        client_name: campaignData.clientName,
        start_date: campaignData.startDate,
        end_date: campaignData.endDate,
        description: campaignData.description
      }])
      .select('*')
      .single();
    
    if (error) {
      console.error('Error creating campaign:', error);
      throw new Error(`Failed to create campaign: ${error.message || 'Unknown error'}`);
    }
    
  return mapCampaign({ ...data, visits: [] });
  },

  // Update campaign
  update: async (id: string, updates: CreateCampaignRequest): Promise<Campaign> => {
    const { data, error } = await supabase
      .from('campaigns')
      .update({
        name: updates.name,
        client_name: updates.clientName,
        start_date: updates.startDate,
        end_date: updates.endDate,
        description: updates.description
      })
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating campaign:', error);
      throw new Error(`Failed to update campaign: ${error.message || 'Unknown error'}`);
    }
    
  return mapCampaign({ ...data, visits: [] });
  },

  // Delete campaign
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting campaign:', error);
      throw new Error(`Failed to delete campaign: ${error.message || 'Unknown error'}`);
    }
  },
};

export const visitApi = {
  // Get total visits count
  getTotalCount: async (): Promise<number> => {
    const { count, error } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error getting visits count:', error);
      throw new Error(`Failed to get visits count: ${error.message || 'Unknown error'}`);
    }
    
    return count || 0;
  },

  // Get visits for a campaign
  getByCampaign: async (campaignId: string): Promise<Visit[]> => {
    // Try snake_case first
    let { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('date', { ascending: false });

    // If the column doesn't exist, retry with camelCase
    if (error && (error.code === '42703' || /campaign_id does not exist/i.test(error.message))) {
      const retry = await supabase
        .from('visits')
        .select('*')
        .eq('campaignId', campaignId)
        .order('date', { ascending: false });
      data = retry.data as any;
      error = retry.error as any;
    }

    if (error) {
      console.error('Error fetching visits:', error);
      throw new Error(`Failed to fetch visits: ${error.message || 'Unknown error'}`);
    }

    return (data || []).map(mapVisit);
  },

  // Create new visit with photo upload
  create: async (visitData: CreateVisitRequest, photos?: File[]): Promise<Visit> => {
    let photoUrls: string[] = [];
    
    // Upload photos to Supabase Storage if provided
    if (photos && photos.length > 0) {
      const uploadPromises = photos.map(async (photo, index) => {
        // Sanitize filename: remove spaces, special chars, keep only alphanumeric and basic chars
        const sanitizedName = photo.name
          .replace(/[^a-zA-Z0-9.-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const fileName = `visit-${Date.now()}-${index}-${sanitizedName}`;
        
        console.log(`Uploading photo ${index + 1}:`, fileName, 'Size:', photo.size, 'Type:', photo.type);
        
        const { data, error } = await supabase.storage
          .from('campaign-photos')
          .upload(fileName, photo, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          console.error('Supabase storage error:', error);
          throw new Error(`Failed to upload photo: ${photo.name} - ${error.message}`);
        }
        
        console.log('Upload successful:', data);
        
        const { data: urlData } = supabase.storage
          .from('campaign-photos')
          .getPublicUrl(fileName);
        
        return urlData.publicUrl;
      });
      
      try {
        photoUrls = await Promise.all(uploadPromises);
        console.log('All photos uploaded successfully:', photoUrls);
      } catch (uploadError) {
        console.error('Photo upload failed:', uploadError);
        throw uploadError;
      }
    }
    
    // Create visit record
    const { data, error } = await supabase
      .from('visits')
      .insert([{
        date: visitData.date,
        location: visitData.location,
        campaign_id: visitData.campaignId,
        notes: visitData.notes || null,
        photo_url_1: photoUrls[0] || null,
        photo_url_2: photoUrls[1] || null,
        photo_url_3: photoUrls[2] || null,
        photo_url_4: photoUrls[3] || null,
      }])
      .select('*')
      .single();
    
    if (error) {
      console.error('Error creating visit:', error);
      throw new Error(`Failed to create visit: ${error.message || 'Unknown error'}`);
    }
    
  return mapVisit(data);
  },

  // Update visit
  update: async (id: string, updates: Partial<CreateVisitRequest>, photos?: File[]): Promise<Visit> => {
    let photoUrls: string[] = [];
    
    // Upload new photos if provided
    if (photos && photos.length > 0) {
      const uploadPromises = photos.map(async (photo, index) => {
        // Sanitize filename: remove spaces, special chars, keep only alphanumeric and basic chars
        const sanitizedName = photo.name
          .replace(/[^a-zA-Z0-9.-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const fileName = `visit-${Date.now()}-${index}-${sanitizedName}`;
        
        console.log(`Uploading photo ${index + 1}:`, fileName, 'Size:', photo.size, 'Type:', photo.type);
        
        const { data, error } = await supabase.storage
          .from('campaign-photos')
          .upload(fileName, photo, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          console.error('Supabase storage error:', error);
          throw new Error(`Failed to upload photo: ${photo.name} - ${error.message}`);
        }
        
        console.log('Upload successful:', data);
        
        const { data: urlData } = supabase.storage
          .from('campaign-photos')
          .getPublicUrl(fileName);
        
        return urlData.publicUrl;
      });
      
      try {
        photoUrls = await Promise.all(uploadPromises);
        console.log('All photos uploaded successfully:', photoUrls);
      } catch (uploadError) {
        console.error('Photo upload failed:', uploadError);
        throw uploadError;
      }
    }
    
    const updateData: any = {};
    if (updates.date) updateData.date = updates.date;
    if (updates.location) updateData.location = updates.location;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (photoUrls[0]) updateData.photo_url_1 = photoUrls[0];
    if (photoUrls[1]) updateData.photo_url_2 = photoUrls[1];
    if (photoUrls[2]) updateData.photo_url_3 = photoUrls[2];
    if (photoUrls[3]) updateData.photo_url_4 = photoUrls[3];
    
    const { data, error } = await supabase
      .from('visits')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating visit:', error);
      throw new Error(`Failed to update visit: ${error.message || 'Unknown error'}`);
    }
    
  return mapVisit(data);
  },

  // Delete visit
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('visits')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting visit:', error);
      throw new Error(`Failed to delete visit: ${error.message || 'Unknown error'}`);
    }
  },
};
