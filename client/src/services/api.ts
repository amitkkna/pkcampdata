// Frontend-only API using direct Supabase connection or mock data
import { campaignApi as supabaseCampaignApi, visitApi as supabaseVisitApi, folderApi as supabaseFolderApi } from './supabaseApi';
import { mockApi } from './mockApi';

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const configured = url && key && !url.includes('your-project') && !key.includes('your-anon-key');
  console.log('Supabase configuration check:', { 
    url: url ? 'present' : 'missing', 
    key: key ? 'present' : 'missing',
    configured 
  });
  return configured;
};

// Mock folder API for development
const mockFolderApi = {
  getByCampaign: async () => {
    console.log('Mock folder API: getByCampaign called');
    return [];
  },
  create: async (data: any) => {
    console.log('Mock folder API: create called with', data);
    const newFolder = { 
      ...data, 
      id: `mock-folder-${Date.now()}`, 
      photos: [], 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString() 
    };
    console.log('Mock folder API: returning', newFolder);
    return newFolder;
  },
  uploadPhotos: async (folderId: string, files: File[]) => {
    console.log('Mock folder API: uploadPhotos called', { folderId, filesCount: files.length });
    
    // Simulate successful upload with original filenames
    return files.map((file, index) => ({
      id: `photo-${Date.now()}-${index}`,
      filename: file.name, // Use original filename
      originalName: file.name,
      photoUrl: URL.createObjectURL(file),
      uploadDate: new Date().toISOString(),
      folderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  },
  getById: async (id: string) => {
    console.log('Mock folder API: getById called with', id);
    return null;
  },
  delete: async (id: string) => {
    console.log('Mock folder API: delete called with', id);
  },
  deletePhoto: async (photoId: string) => {
    console.log('Mock folder API: deletePhoto called with', photoId);
  },
};

// Use Supabase if configured, otherwise use mock data for development
export const campaignApi = isSupabaseConfigured() ? supabaseCampaignApi : mockApi.campaigns;
export const visitApi = isSupabaseConfigured() ? supabaseVisitApi : mockApi.visits;
export const folderApi = isSupabaseConfigured() ? supabaseFolderApi : mockFolderApi;

export { reportApi } from './clientReports';
