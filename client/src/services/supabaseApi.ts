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

// UUID generator fallback if DB default is missing
const genUUID = (): string => {
  const g = (globalThis as any);
  if (g.crypto && typeof g.crypto.randomUUID === 'function') return g.crypto.randomUUID();
  // Minimal RFC4122 v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
    // Attempt snake_case first; if schema uses camelCase, retry
    const snakePayload: any = {
      name: campaignData.name,
      client_name: campaignData.clientName,
      start_date: campaignData.startDate,
      end_date: campaignData.endDate,
      description: campaignData.description ?? null
    };

    const camelPayload: any = {
      name: campaignData.name,
      clientName: campaignData.clientName,
      startDate: campaignData.startDate,
      endDate: campaignData.endDate,
      description: campaignData.description ?? null
    };

  let insertRes = await supabase
      .from('campaigns')
      .insert([snakePayload])
      .select('*')
      .single();

    // If missing column error, retry with camelCase keys
    if (
      insertRes.error && (
        /42703/.test(insertRes.error.code || '') ||
        /column .* does not exist/i.test(insertRes.error.message || '') ||
        /could not find .*column/i.test((insertRes.error.message || '').toLowerCase()) ||
        /schema cache/i.test((insertRes.error.message || '').toLowerCase())
      )
    ) {
      insertRes = await supabase
        .from('campaigns')
        .insert([camelPayload])
        .select('*')
        .single();
    }

    // If id default is missing (NOT NULL violation), retry providing a client-side UUID
    if (
      insertRes.error && (
        insertRes.error.code === '23502' || /null value in column\s+"id"/i.test(insertRes.error.message || '')
      )
    ) {
      const idVal = genUUID();
      // Try snake with id
      let withId = await supabase
        .from('campaigns')
        .insert([{ id: idVal, ...snakePayload }])
        .select('*')
        .single();
      // If schema mismatch, retry camel with id
      if (
        withId.error && (
          /42703/.test(withId.error.code || '') || /column .* does not exist/i.test(withId.error.message || '')
        )
      ) {
        withId = await supabase
          .from('campaigns')
          .insert([{ id: idVal, ...camelPayload }])
          .select('*')
          .single();
      }
      insertRes = withId;
    }

    if (insertRes.error) {
      console.error('Error creating campaign:', insertRes.error);
      throw new Error(`Failed to create campaign: ${insertRes.error.message || 'Unknown error'}`);
    }

    return mapCampaign({ ...insertRes.data, visits: [] });
  },

  // Update campaign
  update: async (id: string, updates: CreateCampaignRequest): Promise<Campaign> => {
    const snakePayload: any = {
      name: updates.name,
      client_name: updates.clientName,
      start_date: updates.startDate,
      end_date: updates.endDate,
      description: updates.description ?? null
    };

    const camelPayload: any = {
      name: updates.name,
      clientName: updates.clientName,
      startDate: updates.startDate,
      endDate: updates.endDate,
      description: updates.description ?? null
    };

    let updateRes = await supabase
      .from('campaigns')
      .update(snakePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (
      updateRes.error && (
        /42703/.test(updateRes.error.code || '') ||
        /column .* does not exist/i.test(updateRes.error.message || '') ||
        /could not find .*column/i.test((updateRes.error.message || '').toLowerCase()) ||
        /schema cache/i.test((updateRes.error.message || '').toLowerCase())
      )
    ) {
      updateRes = await supabase
        .from('campaigns')
        .update(camelPayload)
        .eq('id', id)
        .select('*')
        .single();
    }

    if (updateRes.error) {
      console.error('Error updating campaign:', updateRes.error);
      throw new Error(`Failed to update campaign: ${updateRes.error.message || 'Unknown error'}`);
    }

    return mapCampaign({ ...updateRes.data, visits: [] });
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
    if (
      error && (
        error.code === '42703' ||
        /campaign_id does not exist/i.test(error.message || '') ||
        /could not find .*column/i.test((error.message || '').toLowerCase()) ||
        /schema cache/i.test((error.message || '').toLowerCase())
      )
    ) {
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
        
  const fileName = `visits/visit-${Date.now()}-${index}-${sanitizedName}`;
        
        console.log(`Uploading photo ${index + 1}:`, fileName, 'Size:', photo.size, 'Type:', photo.type);
        
        const { data, error } = await supabase.storage
          .from('campaign-photos')
          .upload(fileName, photo, {
            cacheControl: '3600',
            upsert: true
          });
        
        if (error) {
          console.error('Supabase storage error:', error);
          const msg = (error as any)?.message || '';
          if (/row-level security|RLS/i.test(msg)) {
            throw new Error(`Failed to upload photo: ${photo.name} - RLS policy blocked upload. Ensure storage policy allows INSERT on bucket 'campaign-photos'.`);
          }
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
    
    // Create visit record (snake_case first, retry camelCase on schema mismatch)
    const snakePayload: any = {
      date: visitData.date,
      location: visitData.location,
      campaign_id: visitData.campaignId,
      notes: visitData.notes || null,
      photo_url_1: photoUrls[0] || null,
      photo_url_2: photoUrls[1] || null,
      photo_url_3: photoUrls[2] || null,
      photo_url_4: photoUrls[3] || null,
    };
    const camelPayload: any = {
      date: visitData.date,
      location: visitData.location,
      campaignId: visitData.campaignId,
      notes: visitData.notes || null,
      photoUrl1: photoUrls[0] || null,
      photoUrl2: photoUrls[1] || null,
      photoUrl3: photoUrls[2] || null,
      photoUrl4: photoUrls[3] || null,
    };

  let insertRes = await supabase
      .from('visits')
      .insert([snakePayload])
      .select('*')
      .single();

    if (
      insertRes.error && (
        /42703/.test(insertRes.error.code || '') ||
        /column .* does not exist/i.test(insertRes.error.message || '') ||
        /could not find .*column/i.test((insertRes.error.message || '').toLowerCase()) ||
        /schema cache/i.test((insertRes.error.message || '').toLowerCase())
      )
    ) {
      insertRes = await supabase
        .from('visits')
        .insert([camelPayload])
        .select('*')
        .single();
    }

    // If id default is missing (NOT NULL violation), retry providing a client-side UUID
    if (
      insertRes.error && (
        insertRes.error.code === '23502' || /null value in column\s+"id"/i.test(insertRes.error.message || '')
      )
    ) {
      const idVal = genUUID();
      // Try snake with id
      let withId = await supabase
        .from('visits')
        .insert([{ id: idVal, ...snakePayload }])
        .select('*')
        .single();
      // If schema mismatch, retry camel with id
      if (
        withId.error && (
          /42703/.test(withId.error.code || '') || /column .* does not exist/i.test(withId.error.message || '')
        )
      ) {
        withId = await supabase
          .from('visits')
          .insert([{ id: idVal, ...camelPayload }])
          .select('*')
          .single();
      }
      insertRes = withId;
    }

    if (insertRes.error) {
      console.error('Error creating visit:', insertRes.error);
      throw new Error(`Failed to create visit: ${insertRes.error.message || 'Unknown error'}`);
    }
    
    return mapVisit(insertRes.data);
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
        
  const fileName = `visits/visit-${Date.now()}-${index}-${sanitizedName}`;
        
        console.log(`Uploading photo ${index + 1}:`, fileName, 'Size:', photo.size, 'Type:', photo.type);
        
        const { data, error } = await supabase.storage
          .from('campaign-photos')
          .upload(fileName, photo, {
            cacheControl: '3600',
            upsert: true
          });
        
        if (error) {
          console.error('Supabase storage error:', error);
          const msg = (error as any)?.message || '';
          if (/row-level security|RLS/i.test(msg)) {
            throw new Error(`Failed to upload photo: ${photo.name} - RLS policy blocked upload. Ensure storage policy allows INSERT on bucket 'campaign-photos'.`);
          }
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
    
    // Attempt update with snake_case keys; retry camelCase on schema mismatch
    let updateRes = await supabase
      .from('visits')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (
      updateRes.error && (
        /42703/.test(updateRes.error.code || '') ||
        /column .* does not exist/i.test(updateRes.error.message || '') ||
        /could not find .*column/i.test((updateRes.error.message || '').toLowerCase()) ||
        /schema cache/i.test((updateRes.error.message || '').toLowerCase())
      )
    ) {
      const camelUpdate: any = {};
      if (updateData.date) camelUpdate.date = updateData.date;
      if (updateData.location) camelUpdate.location = updateData.location;
      if (updateData.notes !== undefined) camelUpdate.notes = updateData.notes;
      if (updateData.photo_url_1) camelUpdate.photoUrl1 = updateData.photo_url_1;
      if (updateData.photo_url_2) camelUpdate.photoUrl2 = updateData.photo_url_2;
      if (updateData.photo_url_3) camelUpdate.photoUrl3 = updateData.photo_url_3;
      if (updateData.photo_url_4) camelUpdate.photoUrl4 = updateData.photo_url_4;

      updateRes = await supabase
        .from('visits')
        .update(camelUpdate)
        .eq('id', id)
        .select('*')
        .single();
    }

    if (updateRes.error) {
      console.error('Error updating visit:', updateRes.error);
      throw new Error(`Failed to update visit: ${updateRes.error.message || 'Unknown error'}`);
    }
    
    return mapVisit(updateRes.data);
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
