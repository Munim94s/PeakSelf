import { createClient } from '@supabase/supabase-js';
import logger from './logger.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.warn('Supabase credentials not configured. Storage features will not work.');
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Upload an image to Supabase Storage
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} fileName - Name for the file
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadImage(fileBuffer, fileName, contentType) {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const bucket = 'blog-images';
  const filePath = `${Date.now()}-${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType,
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    logger.error('Error uploading image to Supabase:', error);
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    path: filePath
  };
}

/**
 * Delete an image from Supabase Storage
 * @param {string} filePath - Path of the file to delete
 */
export async function deleteImage(filePath) {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const bucket = 'blog-images';

  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    logger.error('Error deleting image from Supabase:', error);
    throw error;
  }
}
