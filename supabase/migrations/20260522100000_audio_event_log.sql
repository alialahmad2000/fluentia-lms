-- MEGA-FIX V2 Phase B: audio playback telemetry
-- Lets us see, in prod, exactly which audio URL / event / reason caused a
-- failure so the next student complaint comes with diagnosable evidence.

CREATE TABLE IF NOT EXISTS public.audio_event_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  player_id   text NOT NULL,
  audio_url   text,
  event       text NOT NULL,
  reason      text,
  state       text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audio_event_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audio_event_log_students_insert_own" ON public.audio_event_log;
CREATE POLICY "audio_event_log_students_insert_own"
  ON public.audio_event_log FOR INSERT
  WITH CHECK (auth.uid() = student_id OR student_id IS NULL);

DROP POLICY IF EXISTS "audio_event_log_admin_reads_all" ON public.audio_event_log;
CREATE POLICY "audio_event_log_admin_reads_all"
  ON public.audio_event_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

DROP POLICY IF EXISTS "audio_event_log_students_read_own" ON public.audio_event_log;
CREATE POLICY "audio_event_log_students_read_own"
  ON public.audio_event_log FOR SELECT
  USING (auth.uid() = student_id);

CREATE INDEX IF NOT EXISTS idx_audio_event_log_created
  ON public.audio_event_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audio_event_log_student
  ON public.audio_event_log (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audio_event_log_event
  ON public.audio_event_log (event, created_at DESC);
