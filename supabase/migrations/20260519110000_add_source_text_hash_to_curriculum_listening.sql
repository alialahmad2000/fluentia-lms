-- LISTENING-AUDIO-PLAYER-DRIFT-PROTECTION 2026-05-19
-- Adds source_text_hash + source_text_hash_at to curriculum_listening so we can
-- detect "audio was generated from text X, but transcript has since been rewritten
-- to text Y" — the same class of bug that hit L1 reading on 2026-05-19
-- (regenerated via commit f911750 after content drift was discovered the hard way).
--
-- IDEMPOTENT. Future retrofit: add the same two columns to curriculum_readings
-- and curriculum_vocabulary so the drift-check script covers them too.

ALTER TABLE public.curriculum_listening
  ADD COLUMN IF NOT EXISTS source_text_hash TEXT,
  ADD COLUMN IF NOT EXISTS source_text_hash_at TIMESTAMPTZ;

COMMENT ON COLUMN public.curriculum_listening.source_text_hash IS
  'SHA-256 (hex) of the transcript text used to generate audio_url. If transcript changes and this hash is not updated by a fresh audio generation, the audio is DRIFTED. Computed via scripts/lib/text-hash.cjs sourceTextHash() — text is normalized (CRLF→LF, whitespace collapse, NFC) before hashing.';

COMMENT ON COLUMN public.curriculum_listening.source_text_hash_at IS
  'Timestamp when source_text_hash was last computed. Equal to audio_generated_at for fresh regenerations; equal to backfill time for legacy rows.';

CREATE INDEX IF NOT EXISTS idx_curriculum_listening_source_text_hash
  ON public.curriculum_listening (source_text_hash)
  WHERE source_text_hash IS NOT NULL;
