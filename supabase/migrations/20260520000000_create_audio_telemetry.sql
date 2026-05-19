-- AUDIO-TELEMETRY 2026-05-20
-- Server-side log of audio-load and play() failures across the LMS so the
-- next "audio doesn't play" report is diagnosable from data, not from
-- re-investigation. Fire-and-forget INSERTs from the client; admins/trainers
-- read via /admin/audio-telemetry dashboard.
--
-- IDEMPOTENT — re-runnable. No data destruction. Telemetry rows are NEW data,
-- not student-content mutations.

CREATE TABLE IF NOT EXISTS public.audio_telemetry (
  id              bigserial PRIMARY KEY,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  profile_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  context         text NOT NULL,           -- 'listening' | 'reading' | 'vocab'
  row_id          uuid,                    -- the curriculum_listening / curriculum_readings row
  audio_url       text,
  error_code      int,                     -- MediaError.code (1-4) or 0 for play() promise rejection
  error_message   text,
  browser_ua      text,
  network_status  text,                    -- 'online' | 'offline' (best-effort)
  bundle_version  text,                    -- from version.json so we can correlate to deploy
  extra           jsonb                    -- room for anything else
);

CREATE INDEX IF NOT EXISTS idx_audio_telemetry_occurred_at ON public.audio_telemetry (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_telemetry_context_error ON public.audio_telemetry (context, error_code);
CREATE INDEX IF NOT EXISTS idx_audio_telemetry_profile ON public.audio_telemetry (profile_id);

ALTER TABLE public.audio_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audio_telemetry_authenticated_insert" ON public.audio_telemetry;
DROP POLICY IF EXISTS "audio_telemetry_staff_select"          ON public.audio_telemetry;
DROP POLICY IF EXISTS "audio_telemetry_service_role_all"      ON public.audio_telemetry;

-- Authenticated users insert their own failure events (profile_id can also be
-- NULL if the failure happens before auth is fully hydrated)
CREATE POLICY "audio_telemetry_authenticated_insert"
  ON public.audio_telemetry
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid() OR profile_id IS NULL);

-- Only admins + trainers can SELECT
CREATE POLICY "audio_telemetry_staff_select"
  ON public.audio_telemetry
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'trainer')
  ));

CREATE POLICY "audio_telemetry_service_role_all"
  ON public.audio_telemetry
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.audio_telemetry IS
  'AUDIO-TELEMETRY 2026-05-20 — server-side log of client audio failures. Populated by src/lib/audioTelemetry.js logAudioFailure(). Read by /admin/audio-telemetry dashboard.';
