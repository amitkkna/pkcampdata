import axios from 'axios';
import type { Campaign, Visit, CreateCampaignRequest, CreateVisitRequest, ApiResponse } from '../../../shared/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const campaignApi = {
  // Get all campaigns
  getAll: async (): Promise<Campaign[]> => {
    const response = await api.get<ApiResponse<Campaign[]>>('/campaigns');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch campaigns');
    }
    return response.data.data || [];
  },

  // Get campaign by ID
  getById: async (id: string): Promise<Campaign> => {
    const response = await api.get<ApiResponse<Campaign>>(`/campaigns/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch campaign');
    }
    return response.data.data!;
  },

  // Create new campaign
  create: async (data: CreateCampaignRequest): Promise<Campaign> => {
    const response = await api.post<ApiResponse<Campaign>>('/campaigns', data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create campaign');
    }
    return response.data.data!;
  },

  // Update campaign
  update: async (id: string, data: CreateCampaignRequest): Promise<Campaign> => {
    const response = await api.put<ApiResponse<Campaign>>(`/campaigns/${id}`, data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update campaign');
    }
    return response.data.data!;
  },

  // Delete campaign
  delete: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse<{ id: string }>>(`/campaigns/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete campaign');
    }
  },
};

export const visitApi = {
  // Get visits for a campaign
  getByCampaign: async (campaignId: string): Promise<Visit[]> => {
    const response = await api.get<ApiResponse<Visit[]>>(`/visits/campaign/${campaignId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch visits');
    }
    return response.data.data || [];
  },

  // Create new visit
  create: async (data: CreateVisitRequest, photos?: File[]): Promise<Visit> => {
    const formData = new FormData();
    formData.append('date', data.date);
    formData.append('location', data.location);
    formData.append('campaignId', data.campaignId);
    if (data.notes) {
      formData.append('notes', data.notes);
    }
    if (photos && photos.length > 0) {
      photos.forEach(photo => {
        formData.append('photos', photo);
      });
    }

    const response = await api.post<ApiResponse<Visit>>('/visits', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create visit');
    }
    return response.data.data!;
  },

  // Update visit
  update: async (id: string, data: Partial<CreateVisitRequest>, photos?: File[]): Promise<Visit> => {
    const formData = new FormData();
    if (data.date) formData.append('date', data.date);
    if (data.location) formData.append('location', data.location);
    if (data.notes !== undefined) formData.append('notes', data.notes);
    if (photos && photos.length > 0) {
      photos.forEach(photo => {
        formData.append('photos', photo);
      });
    }

    const response = await api.put<ApiResponse<Visit>>(`/visits/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update visit');
    }
    return response.data.data!;
  },

  // Delete visit
  delete: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse<{ id: string }>>(`/visits/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete visit');
    }
  },
};

export const reportApi = {
  // Generate PDF report with flexible date filtering
  generatePdf: async (
    campaignId: string, 
    options: {
      reportType: 'single' | 'range' | 'all';
      selectedDate?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<Blob> => {
    const response = await api.post('/reports/pdf', { 
      campaignId, 
      ...options 
    }, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Generate PowerPoint presentation with flexible date filtering
  generatePowerpoint: async (
    campaignId: string,
    options: {
      reportType: 'single' | 'range' | 'all';
      selectedDate?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<Blob> => {
    const response = await api.post('/reports/powerpoint', { 
      campaignId, 
      ...options 
    }, {
      responseType: 'blob',
    });
    return response.data;
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
