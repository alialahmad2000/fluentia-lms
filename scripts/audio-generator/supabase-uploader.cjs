/**
 * Supabase Storage uploader for audio files
 */

const { createClient } = require('@supabase/supabase-js');

class SupabaseUploader {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    );
    this.bucket = 'curriculum-audio';
    this.uploadCount = 0;
    this.totalBytes = 0;
  }

  /**
   * Upload audio buffer to Supabase Storage
   * @param {Buffer} audioBuffer - Audio data
   * @param {string} storagePath - Path within bucket (e.g., "vocabulary/0/1/hello.mp3")
   * @returns {string} Public URL of uploaded file
   */
  async upload(audioBuffer, storagePath) {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (error) {
      throw new Error(`Upload failed for ${storagePath}: ${error.message}`);
    }

    this.uploadCount++;
    this.totalBytes += audioBuffer.length;

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  }

  /**
   * Update a database record with the audio URL
   */
  async updateRecord(table, id, updates) {
    const { error } = await this.supabase
      .from(table)
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`DB update failed for ${table}/${id}: ${error.message}`);
    }
  }

  getStats() {
    return {
      uploads: this.uploadCount,
      totalMB: (this.totalBytes / 1024 / 1024).toFixed(2)
    };
  }
}

module.exports = { SupabaseUploader };
