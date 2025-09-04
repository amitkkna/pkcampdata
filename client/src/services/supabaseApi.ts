import { supabase } from './supabaseClient';
import type { Campaign, Visit, CreateCampaignRequest, CreateVisitRequest } from '../../../shared/types';

// Direct Supabase operations - no backend needed!
export const campaignApi = {
  // Get all campaigns with visits
  getAll: async (): Promise<Campaign[]> => {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        visits:visits(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching campaigns:', error);
      throw new Error('Failed to fetch campaigns');
    }
    
    return data || [];
  },

  // Get campaign by ID with visits
  getById: async (id: string): Promise<Campaign> => {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        visits:visits(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching campaign:', error);
      throw new Error('Campaign not found');
    }
    
    return data;
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
      .select()
      .single();
    
    if (error) {
      console.error('Error creating campaign:', error);
      throw new Error('Failed to create campaign');
    }
    
    return data;
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
      .select()
      .single();
    
    if (error) {
      console.error('Error updating campaign:', error);
      throw new Error('Failed to update campaign');
    }
    
    return data;
  },

  // Delete campaign
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting campaign:', error);
      throw new Error('Failed to delete campaign');
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
      throw new Error('Failed to get visits count');
    }
    
    return count || 0;
  },

  // Get visits for a campaign
  getByCampaign: async (campaignId: string): Promise<Visit[]> => {
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching visits:', error);
      throw new Error('Failed to fetch visits');
    }
    
    return data || [];
  },

  // Create new visit with photo upload
  create: async (visitData: CreateVisitRequest, photos?: File[]): Promise<Visit> => {
    let photoUrls: string[] = [];
    
    // Upload photos to Supabase Storage if provided
    if (photos && photos.length > 0) {
      const uploadPromises = photos.map(async (photo, index) => {
        const fileName = `visit-${Date.now()}-${index}-${photo.name}`;
        const { error } = await supabase.storage
          .from('campaign-photos')
          .upload(fileName, photo);
        
        if (error) {
          console.error('Error uploading photo:', error);
          throw new Error(`Failed to upload photo: ${photo.name}`);
        }
        
        const { data: urlData } = supabase.storage
          .from('campaign-photos')
          .getPublicUrl(fileName);
        
        return urlData.publicUrl;
      });
      
      photoUrls = await Promise.all(uploadPromises);
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
      .select()
      .single();
    
    if (error) {
      console.error('Error creating visit:', error);
      throw new Error('Failed to create visit');
    }
    
    return data;
  },

  // Update visit
  update: async (id: string, updates: Partial<CreateVisitRequest>, photos?: File[]): Promise<Visit> => {
    let photoUrls: string[] = [];
    
    // Upload new photos if provided
    if (photos && photos.length > 0) {
      const uploadPromises = photos.map(async (photo, index) => {
        const fileName = `visit-${Date.now()}-${index}-${photo.name}`;
        const { error } = await supabase.storage
          .from('campaign-photos')
          .upload(fileName, photo);
        
        if (error) {
          console.error('Error uploading photo:', error);
          throw new Error(`Failed to upload photo: ${photo.name}`);
        }
        
        const { data: urlData } = supabase.storage
          .from('campaign-photos')
          .getPublicUrl(fileName);
        
        return urlData.publicUrl;
      });
      
      photoUrls = await Promise.all(uploadPromises);
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
      .select()
      .single();
    
    if (error) {
      console.error('Error updating visit:', error);
      throw new Error('Failed to update visit');
    }
    
    return data;
  },

  // Delete visit
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('visits')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting visit:', error);
      throw new Error('Failed to delete visit');
    }
  },
};
