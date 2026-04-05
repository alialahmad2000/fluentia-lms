-- ============================================
-- 076: Add audio_path column to speaking_recordings
-- Stores the raw storage path so we can regenerate signed URLs
-- ============================================

ALTER TABLE speaking_recordings ADD COLUMN IF NOT EXISTS audio_path text;
