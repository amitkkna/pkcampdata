import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
if (!isSupabaseConfigured) {
  // Don't crash the app; show a console hint and let UI render an error state
  // eslint-disable-next-line no-console
  console.error('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in build env.');
}

export const supabase = createClient(supabaseUrl || 'https://invalid.local', supabaseAnonKey || '');

// Helper to get public URL for uploaded files
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export function getAccessToken() { 
  return null; // No auth needed
}
