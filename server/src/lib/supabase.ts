import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { Campaign, Visit } from '../../../shared/types';
import dotenv from 'dotenv';
import path from 'path';

// Load env before reading SUPABASE_* vars, regardless of CWD
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database helper class
export class Database {
  private supabase: any;

  constructor() {
    this.supabase = supabase;
  }

  // Campaign methods
  async getCampaigns(): Promise<Campaign[]> {
    try {
      // Prefer camelCase schema
      let { data, error } = await this.supabase
        .from('campaigns')
        .select('"id","name","clientName","startDate","endDate","description","targetAudience","budget","objectives","notes","createdAt","updatedAt"');

      if (error && (error.code === '42703' || error.code === 'PGRST204')) {
        // Retry assuming snake_case columns
  const retry = await this.supabase
          .from('campaigns')
          .select('id,name,client_name,start_date,end_date,description,target_audience,budget,objectives,notes,created_at,updated_at');
        data = retry.data;
        error = retry.error;
      }
      
      if (error) {
        console.error('Supabase error getCampaigns:', {
          message: error.message,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint
        });
        throw error;
      }
      
      const rows = Array.isArray(data) ? data : [];

      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        clientName: r.client_name ?? r.clientName,
        startDate: r.start_date ?? r.startDate,
        endDate: r.end_date ?? r.endDate,
        description: r.description ?? undefined,
        targetAudience: r.target_audience ?? r.targetAudience ?? undefined,
        budget: r.budget ?? undefined,
        objectives: r.objectives ?? undefined,
        notes: r.notes ?? undefined,
        createdAt: r.created_at ?? r.createdAt,
        updatedAt: r.updated_at ?? r.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  async getCampaignById(id: string): Promise<Campaign | null> {
    try {
      // Prefer camelCase schema
      let { data, error } = await this.supabase
        .from('campaigns')
        .select('"id","name","clientName","startDate","endDate","description","targetAudience","budget","objectives","notes","createdAt","updatedAt"')
        .eq('id', id)
        .single();

      if (error && (error.code === '42703' || error.code === 'PGRST204')) {
  const retry = await this.supabase
          .from('campaigns')
          .select('id,name,client_name,start_date,end_date,description,target_audience,budget,objectives,notes,created_at,updated_at')
          .eq('id', id)
          .single();
        data = retry.data;
        error = retry.error;
      }
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      return {
        id: data.id,
        name: data.name,
        clientName: data.client_name ?? data.clientName,
        startDate: data.start_date ?? data.startDate,
        endDate: data.end_date ?? data.endDate,
        description: data.description ?? undefined,
        targetAudience: data.target_audience ?? data.targetAudience ?? undefined,
        budget: data.budget ?? undefined,
        objectives: data.objectives ?? undefined,
        notes: data.notes ?? undefined,
        createdAt: data.created_at ?? data.createdAt,
        updatedAt: data.updated_at ?? data.updatedAt
      };
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw error;
    }
  }

  async getCampaignWithVisits(id: string): Promise<(Campaign & { visits: Visit[] }) | null> {
    try {
      const campaign = await this.getCampaignById(id);
      if (!campaign) return null;

      const visits = await this.getVisitsByCampaign(id);
      
      return {
        ...campaign,
        visits
      };
    } catch (error) {
      console.error('Error fetching campaign with visits:', error);
      throw error;
    }
  }

  async createCampaign(campaignData: {
    name: string;
    clientName: string;
    startDate: string;
    endDate: string;
    description?: string;
    targetAudience?: string;
    budget?: number;
    objectives?: string;
    notes?: string;
  }): Promise<Campaign> {
    try {
      // Prefer camelCase columns; if schema uses snake_case, retry
      let { data, error } = await this.supabase
        .from('campaigns')
        .insert({
          id: randomUUID(),
          name: campaignData.name,
          clientName: campaignData.clientName,
          startDate: campaignData.startDate,
          endDate: campaignData.endDate,
          description: campaignData.description ?? null,
          targetAudience: campaignData.targetAudience ?? null,
          budget: campaignData.budget ?? null,
          objectives: campaignData.objectives ?? null,
          notes: campaignData.notes ?? null
        })
        .select('*')
        .single();

      if (error && (error.code === 'PGRST204' || /Could not find/.test(String(error.message || '')))) {
        const retry = await this.supabase
          .from('campaigns')
          .insert({
            id: randomUUID(),
            name: campaignData.name,
            client_name: campaignData.clientName,
            start_date: campaignData.startDate,
            end_date: campaignData.endDate,
            description: campaignData.description ?? null,
            target_audience: campaignData.targetAudience ?? null,
            budget: campaignData.budget ?? null,
            objectives: campaignData.objectives ?? null,
            notes: campaignData.notes ?? null
          })
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        clientName: data.client_name ?? data.clientName,
        startDate: data.start_date ?? data.startDate,
        endDate: data.end_date ?? data.endDate,
        description: data.description ?? undefined,
        targetAudience: data.target_audience ?? data.targetAudience ?? undefined,
        budget: data.budget ?? undefined,
        objectives: data.objectives ?? undefined,
        notes: data.notes ?? undefined,
        createdAt: data.created_at ?? data.createdAt,
        updatedAt: data.updated_at ?? data.updatedAt
      };
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  async updateCampaign(id: string, updates: {
    name?: string;
    clientName?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    targetAudience?: string;
    budget?: number;
    objectives?: string;
    notes?: string;
  }): Promise<Campaign> {
    try {
      const updateCamel: any = {};
      if (updates.name !== undefined) updateCamel.name = updates.name;
      if (updates.clientName !== undefined) updateCamel.clientName = updates.clientName;
      if (updates.startDate !== undefined) updateCamel.startDate = updates.startDate;
      if (updates.endDate !== undefined) updateCamel.endDate = updates.endDate;
      if (updates.description !== undefined) updateCamel.description = updates.description ?? null;
      if (updates.targetAudience !== undefined) updateCamel.targetAudience = updates.targetAudience ?? null;
      if (updates.budget !== undefined) updateCamel.budget = updates.budget ?? null;
      if (updates.objectives !== undefined) updateCamel.objectives = updates.objectives ?? null;
      if (updates.notes !== undefined) updateCamel.notes = updates.notes ?? null;

      let { data, error } = await this.supabase
        .from('campaigns')
        .update(updateCamel)
        .eq('id', id)
        .select('*')
        .single();

      if (error && (error.code === 'PGRST204' || /Could not find/.test(String(error.message || '')))) {
        const updateSnake: any = {};
        if (updates.name !== undefined) updateSnake.name = updates.name;
        if (updates.clientName !== undefined) updateSnake.client_name = updates.clientName;
        if (updates.startDate !== undefined) updateSnake.start_date = updates.startDate;
        if (updates.endDate !== undefined) updateSnake.end_date = updates.endDate;
        if (updates.description !== undefined) updateSnake.description = updates.description ?? null;
        if (updates.targetAudience !== undefined) updateSnake.target_audience = updates.targetAudience ?? null;
        if (updates.budget !== undefined) updateSnake.budget = updates.budget ?? null;
        if (updates.objectives !== undefined) updateSnake.objectives = updates.objectives ?? null;
        if (updates.notes !== undefined) updateSnake.notes = updates.notes ?? null;

        const retry = await this.supabase
          .from('campaigns')
          .update(updateSnake)
          .eq('id', id)
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }
      
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        clientName: data.client_name ?? data.clientName,
        startDate: data.start_date ?? data.startDate,
        endDate: data.end_date ?? data.endDate,
        description: data.description ?? undefined,
        targetAudience: data.target_audience ?? data.targetAudience ?? undefined,
        budget: data.budget ?? undefined,
        objectives: data.objectives ?? undefined,
        notes: data.notes ?? undefined,
        createdAt: data.created_at ?? data.createdAt,
        updatedAt: data.updated_at ?? data.updatedAt
      };
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  }

  async deleteCampaign(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('campaigns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  }

  // Visit methods
  async getVisitsByCampaign(campaignId: string): Promise<Visit[]> {
    try {
      // Try camelCase column first; if it errors (column missing), retry with snake_case
      let { data, error } = await this.supabase
        .from('visits')
        .select('*')
        .eq('"campaignId"', campaignId)
        .order('date', { ascending: false });

      if (error && (error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist/i.test(String(error.message || '')))) {
        const retry = await this.supabase
          .from('visits')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('date', { ascending: false });
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      return (data ?? []).map((visit: any) => ({
        id: visit.id,
        date: visit.date,
        location: visit.location,
        notes: visit.notes ?? undefined,
        campaignId: visit.campaign_id ?? visit.campaignId,
        photoUrl1: visit.photo_url_1 ?? visit.photoUrl1 ?? undefined,
        photoUrl2: visit.photo_url_2 ?? visit.photoUrl2 ?? undefined,
        photoUrl3: visit.photo_url_3 ?? visit.photoUrl3 ?? undefined,
        photoUrl4: visit.photo_url_4 ?? visit.photoUrl4 ?? undefined,
        originalFilename1: visit.original_filename_1 ?? visit.originalFilename1 ?? undefined,
        originalFilename2: visit.original_filename_2 ?? visit.originalFilename2 ?? undefined,
        originalFilename3: visit.original_filename_3 ?? visit.originalFilename3 ?? undefined,
        originalFilename4: visit.original_filename_4 ?? visit.originalFilename4 ?? undefined,
        createdAt: visit.created_at ?? visit.createdAt,
        updatedAt: visit.updated_at ?? visit.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching visits:', error);
      throw error;
    }
  }

  async createVisit(visitData: {
    date: string;
    location: string;
    notes?: string;
    campaignId: string;
    photoUrl1?: string;
    photoUrl2?: string;
    photoUrl3?: string;
    photoUrl4?: string;
    originalFilename1?: string;
    originalFilename2?: string;
    originalFilename3?: string;
    originalFilename4?: string;
  }): Promise<Visit> {
    try {
      // Try camelCase first, then snake_case
      let { data, error } = await this.supabase
        .from('visits')
        .insert({
          id: randomUUID(),
          date: visitData.date,
          location: visitData.location,
          notes: visitData.notes ?? null,
          campaignId: visitData.campaignId,
          photoUrl1: visitData.photoUrl1 ?? null,
          photoUrl2: visitData.photoUrl2 ?? null,
          photoUrl3: visitData.photoUrl3 ?? null,
          photoUrl4: visitData.photoUrl4 ?? null,
          originalFilename1: visitData.originalFilename1 ?? null,
          originalFilename2: visitData.originalFilename2 ?? null,
          originalFilename3: visitData.originalFilename3 ?? null,
          originalFilename4: visitData.originalFilename4 ?? null
        })
        .select('*')
        .single();

      if (error && (error.code === 'PGRST204' || /Could not find/.test(String(error.message || '')))) {
        const retry = await this.supabase
          .from('visits')
          .insert({
            id: randomUUID(),
            date: visitData.date,
            location: visitData.location,
            notes: visitData.notes ?? null,
            campaign_id: visitData.campaignId,
            photo_url_1: visitData.photoUrl1 ?? null,
            photo_url_2: visitData.photoUrl2 ?? null,
            photo_url_3: visitData.photoUrl3 ?? null,
            photo_url_4: visitData.photoUrl4 ?? null,
            original_filename_1: visitData.originalFilename1 ?? null,
            original_filename_2: visitData.originalFilename2 ?? null,
            original_filename_3: visitData.originalFilename3 ?? null,
            original_filename_4: visitData.originalFilename4 ?? null
          })
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      return {
        id: data.id,
        date: data.date,
        location: data.location,
        notes: data.notes ?? undefined,
        campaignId: data.campaign_id ?? data.campaignId,
        photoUrl1: data.photo_url_1 ?? data.photoUrl1 ?? undefined,
        photoUrl2: data.photo_url_2 ?? data.photoUrl2 ?? undefined,
        photoUrl3: data.photo_url_3 ?? data.photoUrl3 ?? undefined,
        photoUrl4: data.photo_url_4 ?? data.photoUrl4 ?? undefined,
        originalFilename1: data.original_filename_1 ?? data.originalFilename1 ?? undefined,
        originalFilename2: data.original_filename_2 ?? data.originalFilename2 ?? undefined,
        originalFilename3: data.original_filename_3 ?? data.originalFilename3 ?? undefined,
        originalFilename4: data.original_filename_4 ?? data.originalFilename4 ?? undefined,
        createdAt: data.created_at ?? data.createdAt,
        updatedAt: data.updated_at ?? data.updatedAt
      };
    } catch (error) {
      console.error('Error creating visit:', error);
      throw error;
    }
  }

  async getVisitById(id: string): Promise<Visit | null> {
    try {
      const { data, error } = await this.supabase
        .from('visits')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return {
        id: data.id,
        date: data.date,
        location: data.location,
        notes: data.notes || undefined,
        campaignId: data.campaign_id,
        photoUrl1: data.photo_url_1 || undefined,
        photoUrl2: data.photo_url_2 || undefined,
        photoUrl3: data.photo_url_3 || undefined,
        photoUrl4: data.photo_url_4 || undefined,
        originalFilename1: data.original_filename_1 || undefined,
        originalFilename2: data.original_filename_2 || undefined,
        originalFilename3: data.original_filename_3 || undefined,
        originalFilename4: data.original_filename_4 || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error fetching visit:', error);
      throw error;
    }
  }

  async updateVisit(id: string, updates: {
    date?: string;
    location?: string;
    notes?: string;
    photoUrl1?: string;
    photoUrl2?: string;
    photoUrl3?: string;
    photoUrl4?: string;
    originalFilename1?: string;
    originalFilename2?: string;
    originalFilename3?: string;
    originalFilename4?: string;
  }): Promise<Visit> {
    try {
      const updateCamel: any = {};
      if (updates.date !== undefined) updateCamel.date = updates.date;
      if (updates.location !== undefined) updateCamel.location = updates.location;
      if (updates.notes !== undefined) updateCamel.notes = updates.notes ?? null;
      if (updates.photoUrl1 !== undefined) updateCamel.photoUrl1 = updates.photoUrl1 ?? null;
      if (updates.photoUrl2 !== undefined) updateCamel.photoUrl2 = updates.photoUrl2 ?? null;
      if (updates.photoUrl3 !== undefined) updateCamel.photoUrl3 = updates.photoUrl3 ?? null;
      if (updates.photoUrl4 !== undefined) updateCamel.photoUrl4 = updates.photoUrl4 ?? null;
      if (updates.originalFilename1 !== undefined) updateCamel.originalFilename1 = updates.originalFilename1 ?? null;
      if (updates.originalFilename2 !== undefined) updateCamel.originalFilename2 = updates.originalFilename2 ?? null;
      if (updates.originalFilename3 !== undefined) updateCamel.originalFilename3 = updates.originalFilename3 ?? null;
      if (updates.originalFilename4 !== undefined) updateCamel.originalFilename4 = updates.originalFilename4 ?? null;

      let { data, error } = await this.supabase
        .from('visits')
        .update(updateCamel)
        .eq('id', id)
        .select('*')
        .single();

      if (error && (error.code === 'PGRST204' || /Could not find/.test(String(error.message || '')))) {
        const updateSnake: any = {};
        if (updates.date !== undefined) updateSnake.date = updates.date;
        if (updates.location !== undefined) updateSnake.location = updates.location;
        if (updates.notes !== undefined) updateSnake.notes = updates.notes ?? null;
        if (updates.photoUrl1 !== undefined) updateSnake.photo_url_1 = updates.photoUrl1 ?? null;
        if (updates.photoUrl2 !== undefined) updateSnake.photo_url_2 = updates.photoUrl2 ?? null;
        if (updates.photoUrl3 !== undefined) updateSnake.photo_url_3 = updates.photoUrl3 ?? null;
        if (updates.photoUrl4 !== undefined) updateSnake.photo_url_4 = updates.photoUrl4 ?? null;
        if (updates.originalFilename1 !== undefined) updateSnake.original_filename_1 = updates.originalFilename1 ?? null;
        if (updates.originalFilename2 !== undefined) updateSnake.original_filename_2 = updates.originalFilename2 ?? null;
        if (updates.originalFilename3 !== undefined) updateSnake.original_filename_3 = updates.originalFilename3 ?? null;
        if (updates.originalFilename4 !== undefined) updateSnake.original_filename_4 = updates.originalFilename4 ?? null;

        const retry = await this.supabase
          .from('visits')
          .update(updateSnake)
          .eq('id', id)
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      return {
        id: data.id,
        date: data.date,
        location: data.location,
        notes: data.notes ?? undefined,
        campaignId: data.campaign_id ?? data.campaignId,
        photoUrl1: data.photo_url_1 ?? data.photoUrl1 ?? undefined,
        photoUrl2: data.photo_url_2 ?? data.photoUrl2 ?? undefined,
        photoUrl3: data.photo_url_3 ?? data.photoUrl3 ?? undefined,
        photoUrl4: data.photo_url_4 ?? data.photoUrl4 ?? undefined,
        originalFilename1: data.original_filename_1 ?? data.originalFilename1 ?? undefined,
        originalFilename2: data.original_filename_2 ?? data.originalFilename2 ?? undefined,
        originalFilename3: data.original_filename_3 ?? data.originalFilename3 ?? undefined,
        originalFilename4: data.original_filename_4 ?? data.originalFilename4 ?? undefined,
        createdAt: data.created_at ?? data.createdAt,
        updatedAt: data.updated_at ?? data.updatedAt
      };
    } catch (error) {
      console.error('Error updating visit:', error);
      throw error;
    }
  }

  async deleteVisit(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('visits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting visit:', error);
      throw error;
    }
  }
}
