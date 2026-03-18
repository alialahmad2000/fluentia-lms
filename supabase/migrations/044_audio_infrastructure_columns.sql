-- Phase 3: Audio infrastructure — add missing audio tracking columns

ALTER TABLE curriculum_vocabulary
  ADD COLUMN IF NOT EXISTS audio_generated_at TIMESTAMPTZ;

ALTER TABLE curriculum_irregular_verbs
  ADD COLUMN IF NOT EXISTS audio_generated_at TIMESTAMPTZ;

ALTER TABLE curriculum_readings
  ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS audio_generated_at TIMESTAMPTZ;

ALTER TABLE curriculum_listening
  ADD COLUMN IF NOT EXISTS audio_generated_at TIMESTAMPTZ;

ALTER TABLE ielts_listening_sections
  ADD COLUMN IF NOT EXISTS audio_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voice_id TEXT;

-- RLS policies for curriculum-audio storage bucket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read audio'
  ) THEN
    CREATE POLICY "Authenticated users can read audio"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'curriculum-audio');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role can manage audio'
  ) THEN
    CREATE POLICY "Service role can manage audio"
    ON storage.objects FOR ALL
    TO service_role
    USING (bucket_id = 'curriculum-audio');
  END IF;
END $$;
