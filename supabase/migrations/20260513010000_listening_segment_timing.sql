-- Add audio_duration_ms for precise millisecond duration (ListeningPlayer uses this).
-- audio_duration_seconds kept for backward compat.
ALTER TABLE public.curriculum_listening
  ADD COLUMN IF NOT EXISTS audio_duration_ms integer;

-- speaker_segments is already jsonb — no DDL needed.
-- Phase C regeneration will enrich the JSON with start_ms/end_ms per segment.
