import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service role key for server-side operations
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Bucket name for storing campaign photos
export const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'campaign-photos';

/**
 * Upload a file to Supabase Storage
 * @param file - File buffer to upload
 * @param fileName - Name of the file
 * @param contentType - MIME type of the file
 * @returns Promise with the public URL of the uploaded file
 */
export async function uploadFileToSupabase(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      contentType,
      upsert: true, // Overwrite if file exists
    });

  if (error) {
    console.error('Error uploading file to Supabase:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL for the uploaded file
  const { data: publicData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

/**
 * Delete a file from Supabase Storage
 * @param fileName - Name of the file to delete
 * @returns Promise indicating success/failure
 */
export async function deleteFileFromSupabase(fileName: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([fileName]);

  if (error) {
    console.error('Error deleting file from Supabase:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Extract file name from Supabase URL
 * @param url - Supabase storage URL
 * @returns File name or null if not a valid Supabase URL
 */
export function extractFileNameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    return pathParts[pathParts.length - 1] || null;
  } catch {
    return null;
  }
}
