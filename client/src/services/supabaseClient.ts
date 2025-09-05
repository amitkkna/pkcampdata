import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
if (!isSupabaseConfigured) {
  // Don't crash the app; show a console hint and let UI render an error state
  // eslint-disable-next-line no-console
  console.error('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in build env.');
}

// Create a safe proxy that throws only if someone actually tries to use Supabase
function createThrowingProxy(message: string): SupabaseClient {
  return new Proxy({}, {
    get() {
      throw new Error(message);
    }
  }) as unknown as SupabaseClient;
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : createThrowingProxy('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

// Helper to get public URL for uploaded files
export const getPublicUrl = (bucket: string, path: string) => {
  if (!isSupabaseConfigured) return '';
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export function getAccessToken() { 
  return null; // No auth needed
}
