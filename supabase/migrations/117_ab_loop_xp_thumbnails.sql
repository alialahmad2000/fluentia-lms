-- Migration 117: A-B loop support, XP reward tracking, auto thumbnails

-- Add xp_awarded flag to recording_progress
ALTER TABLE recording_progress ADD COLUMN IF NOT EXISTS xp_awarded BOOLEAN DEFAULT FALSE;

-- Add thumbnail_url to class_recordings
ALTER TABLE class_recordings ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add recording_complete to xp_reason enum
ALTER TYPE xp_reason ADD VALUE IF NOT EXISTS 'recording_complete';

-- Storage bucket for thumbnails
INSERT INTO storage.buckets (id, name, public) VALUES ('recording-thumbnails', 'recording-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for thumbnails
CREATE POLICY "thumbnails_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'recording-thumbnails');

-- Authenticated users can upload thumbnails
CREATE POLICY "thumbnails_auth_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'recording-thumbnails');

-- Allow update (overwrite) for authenticated users
CREATE POLICY "thumbnails_auth_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'recording-thumbnails');
