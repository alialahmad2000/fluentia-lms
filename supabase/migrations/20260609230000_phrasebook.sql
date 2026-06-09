-- ── Personal Phrasebook (دفتر عباراتي) ───────────────────────────────────────
-- Claude reads each speaking-recording transcript (already produced by Whisper
-- in speaking_recordings.ai_evaluation->>'transcript') and extracts "you said X
-- → a native says Y" pairs. The corrected sentence is voiced in Dr. Ali's
-- cloned Najdi voice (locked recipe: D6V3XntWeusiNMR4kdSw /
-- eleven_multilingual_v2 / sim .9 / speed .92) — voicing is BEST-EFFORT: if
-- ElevenLabs is unavailable (subscription may lapse ~June 11) entries are
-- text-only and audio backfills on a later run.

CREATE TABLE IF NOT EXISTS public.phrasebook_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recording_id uuid REFERENCES public.speaking_recordings(id) ON DELETE SET NULL,
  unit_id      uuid,
  said_text    text NOT NULL,       -- what the student actually said (from transcript)
  native_text  text NOT NULL,       -- how a native would say it
  note_ar      text,                -- why, in warm Arabic
  category     text NOT NULL DEFAULT 'expression' CHECK (category IN ('grammar','word_choice','expression','pronunciation')),
  audio_url    text,                -- Dr. Ali's voice saying native_text (nullable until voiced)
  dedupe_key   text NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phrasebook_student ON public.phrasebook_entries(student_id, created_at DESC);

ALTER TABLE public.phrasebook_entries ENABLE ROW LEVEL SECURITY;

-- Students read their own phrasebook; staff read all; only the builder
-- (service role) writes.
DROP POLICY IF EXISTS pb_student_select ON public.phrasebook_entries;
CREATE POLICY pb_student_select ON public.phrasebook_entries FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer'))
  );

-- Builder bookkeeping: which recordings have been mined already.
CREATE TABLE IF NOT EXISTS public.phrasebook_processed (
  recording_id uuid PRIMARY KEY REFERENCES public.speaking_recordings(id) ON DELETE CASCADE,
  entries_n    int NOT NULL DEFAULT 0,
  processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.phrasebook_processed ENABLE ROW LEVEL SECURITY;
-- service-role only (no policies) — clients never touch it.

-- Weekly build, Thu 02:00 Riyadh (Wed 23:00 UTC) — after the week's speaking
-- work lands. Bearer from Vault (see detector migration for why).
DO $$ BEGIN PERFORM cron.unschedule('phrasebook-builder-weekly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('phrasebook-builder-weekly', '0 23 * * 3', $cron$
  SELECT net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/phrasebook-builder',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='edge_service_key')
    ),
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 300000
  );
$cron$);
