// Frontend-only API using direct Supabase connection or mock data
import { campaignApi as supabaseCampaignApi, visitApi as supabaseVisitApi } from './supabaseApi';
import { mockApi } from './mockApi';

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && key && !url.includes('your-project') && !key.includes('your-anon-key');
};

// Use Supabase if configured, otherwise use mock data for development
export const campaignApi = isSupabaseConfigured() ? supabaseCampaignApi : mockApi.campaigns;
export const visitApi = isSupabaseConfigured() ? supabaseVisitApi : mockApi.visits;

export { reportApi } from './clientReports';
