-- Phase 1B vocab audio columns (idempotent)
-- audio_url and audio_generated_at already exist from prior work (March 2026)
ALTER TABLE curriculum_vocabulary
  ADD COLUMN IF NOT EXISTS audio_duration_ms  INT,
  ADD COLUMN IF NOT EXISTS audio_voice_name   TEXT;

COMMENT ON COLUMN curriculum_vocabulary.audio_duration_ms IS
  'Duration of the combined word+example audio clip in milliseconds.';
COMMENT ON COLUMN curriculum_vocabulary.audio_voice_name IS
  'ElevenLabs voice name used for generation (e.g. alice).';

-- Index to quickly find entries still needing audio
CREATE INDEX IF NOT EXISTS idx_vocab_audio_pending
  ON curriculum_vocabulary (audio_generated_at)
  WHERE audio_url IS NULL;
