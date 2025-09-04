// Mock data for local development when Supabase is not configured
import type { Campaign, Visit } from '../../../shared/types';

// Sample campaigns data
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Summer Product Launch',
    clientName: 'Tech Innovations Inc',
    startDate: '2025-06-01',
    endDate: '2025-08-31',
    description: 'Launch campaign for new tech product',
    targetAudience: 'Tech enthusiasts, ages 25-45',
    budget: 50000,
    objectives: 'Increase brand awareness by 30%',
    notes: 'Focus on digital channels',
    createdAt: '2025-05-01T10:00:00Z',
    updatedAt: '2025-05-01T10:00:00Z',
    visits: [
      {
        id: '1',
        date: '2025-06-15',
        location: 'Times Square, NYC',
        notes: 'Great foot traffic, positive response',
        photoUrl1: 'https://picsum.photos/800/600?random=1',
        photoUrl2: 'https://picsum.photos/800/600?random=2',
        photoUrl3: null,
        photoUrl4: null,
        originalFilename1: 'times_square_1.jpg',
        originalFilename2: 'times_square_2.jpg',
        originalFilename3: null,
        originalFilename4: null,
        createdAt: '2025-06-15T14:30:00Z',
        updatedAt: '2025-06-15T14:30:00Z',
        campaignId: '1'
      },
      {
        id: '2',
        date: '2025-07-01',
        location: 'Central Park, NYC',
        notes: 'Family-friendly environment, good engagement',
        photoUrl1: 'https://picsum.photos/800/600?random=3',
        photoUrl2: null,
        photoUrl3: null,
        photoUrl4: null,
        originalFilename1: 'central_park.jpg',
        originalFilename2: null,
        originalFilename3: null,
        originalFilename4: null,
        createdAt: '2025-07-01T11:00:00Z',
        updatedAt: '2025-07-01T11:00:00Z',
        campaignId: '1'
      }
    ]
  },
  {
    id: '2',
    name: 'Holiday Shopping Campaign',
    clientName: 'Retail Giant LLC',
    startDate: '2025-11-01',
    endDate: '2025-12-31',
    description: 'Drive holiday season sales',
    targetAudience: 'Families, gift shoppers',
    budget: 75000,
    objectives: 'Increase sales by 25% during holiday season',
    notes: 'Focus on emotional messaging',
    createdAt: '2025-10-01T09:00:00Z',
    updatedAt: '2025-10-01T09:00:00Z',
    visits: []
  }
];

export const mockApi = {
  campaigns: {
    getAll: async (): Promise<Campaign[]> => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return [...mockCampaigns];
    },

    getById: async (id: string): Promise<Campaign> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const campaign = mockCampaigns.find(c => c.id === id);
      if (!campaign) {
        throw new Error(`Campaign with id ${id} not found`);
      }
      return { ...campaign };
    },

    create: async (data: any): Promise<Campaign> => {
      await new Promise(resolve => setTimeout(resolve, 400));
      const newCampaign: Campaign = {
        id: String(Date.now()),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        visits: []
      };
      mockCampaigns.unshift(newCampaign);
      return newCampaign;
    },

    update: async (id: string, data: any): Promise<Campaign> => {
      await new Promise(resolve => setTimeout(resolve, 400));
      const index = mockCampaigns.findIndex(c => c.id === id);
      if (index === -1) {
        throw new Error(`Campaign with id ${id} not found`);
      }
      mockCampaigns[index] = {
        ...mockCampaigns[index],
        ...data,
        updatedAt: new Date().toISOString()
      };
      return mockCampaigns[index];
    },

    delete: async (id: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const index = mockCampaigns.findIndex(c => c.id === id);
      if (index === -1) {
        throw new Error(`Campaign with id ${id} not found`);
      }
      mockCampaigns.splice(index, 1);
    }
  },

  visits: {
    getTotalCount: async (): Promise<number> => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockCampaigns.reduce((total, campaign) => 
        total + (campaign.visits?.length || 0), 0
      );
    },

    getByCampaign: async (campaignId: string): Promise<Visit[]> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const campaign = mockCampaigns.find(c => c.id === campaignId);
      return campaign?.visits ? [...campaign.visits] : [];
    },

    create: async (data: any, photos?: File[]): Promise<Visit> => {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Simulate photo upload by creating mock URLs
      const photoUrls = photos ? photos.map((_, index) => 
        `https://picsum.photos/800/600?random=${Date.now() + index}`
      ) : [];

      const newVisit: Visit = {
        id: String(Date.now()),
        date: data.date,
        location: data.location,
        notes: data.notes || null,
        photoUrl1: photoUrls[0] || null,
        photoUrl2: photoUrls[1] || null,
        photoUrl3: photoUrls[2] || null,
        photoUrl4: photoUrls[3] || null,
        originalFilename1: photos?.[0]?.name || null,
        originalFilename2: photos?.[1]?.name || null,
        originalFilename3: photos?.[2]?.name || null,
        originalFilename4: photos?.[3]?.name || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        campaignId: data.campaignId
      };

      // Add visit to the campaign
      const campaign = mockCampaigns.find(c => c.id === data.campaignId);
      if (campaign) {
        if (!campaign.visits) campaign.visits = [];
        campaign.visits.unshift(newVisit);
      }

      return newVisit;
    },

    update: async (id: string, data: any, photos?: File[]): Promise<Visit> => {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Find the visit across all campaigns
      let targetVisit: Visit | null = null;
      let targetCampaign: Campaign | null = null;
      
      for (const campaign of mockCampaigns) {
        if (!campaign.visits) continue;
        const visit = campaign.visits.find(v => v.id === id);
        if (visit) {
          targetVisit = visit;
          targetCampaign = campaign;
          break;
        }
      }

      if (!targetVisit || !targetCampaign) {
        throw new Error(`Visit with id ${id} not found`);
      }

      // Simulate photo upload
      const photoUrls = photos ? photos.map((_, index) => 
        `https://picsum.photos/800/600?random=${Date.now() + index}`
      ) : [];

      // Update the visit
      Object.assign(targetVisit, {
        ...data,
        photoUrl1: photoUrls[0] || targetVisit.photoUrl1,
        photoUrl2: photoUrls[1] || targetVisit.photoUrl2,
        photoUrl3: photoUrls[2] || targetVisit.photoUrl3,
        photoUrl4: photoUrls[3] || targetVisit.photoUrl4,
        originalFilename1: photos?.[0]?.name || targetVisit.originalFilename1,
        originalFilename2: photos?.[1]?.name || targetVisit.originalFilename2,
        originalFilename3: photos?.[2]?.name || targetVisit.originalFilename3,
        originalFilename4: photos?.[3]?.name || targetVisit.originalFilename4,
        updatedAt: new Date().toISOString()
      });

      return targetVisit;
    },

    delete: async (id: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      for (const campaign of mockCampaigns) {
        if (!campaign.visits) continue;
        const index = campaign.visits.findIndex(v => v.id === id);
        if (index !== -1) {
          campaign.visits.splice(index, 1);
          return;
        }
      }
      
      throw new Error(`Visit with id ${id} not found`);
    }
  }
};
