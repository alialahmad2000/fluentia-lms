-- Phase 0.5 — Dialogue preprocessor output
-- Adds speaker_segments (multi-voice TTS data) and a timestamp column.
-- Idempotent: ADD COLUMN IF NOT EXISTS guards.

ALTER TABLE curriculum_listening
  ADD COLUMN IF NOT EXISTS speaker_segments        JSONB,
  ADD COLUMN IF NOT EXISTS segments_processed_at   TIMESTAMPTZ;

COMMENT ON COLUMN curriculum_listening.speaker_segments IS
  'JSONB array of speaker segments for multi-voice TTS. NULL = single-voice (monologue/lecture). Each element: {order, speaker, gender, voice_id, voice_name, text, char_count}. Phase 0.5 output.';

COMMENT ON COLUMN curriculum_listening.segments_processed_at IS
  'Timestamp when speaker_segments was last populated. NULL = not yet processed by Phase 0.5.';

CREATE INDEX IF NOT EXISTS idx_listening_segments_processed
  ON curriculum_listening (segments_processed_at)
  WHERE segments_processed_at IS NOT NULL;
