-- AI Coach B3: Speaking Practice Mode
-- speaking_practice_attempts: scratch-work recordings before final submission.
-- Hidden from trainers, auto-purged after 30 days.

BEGIN;

CREATE TABLE IF NOT EXISTS speaking_practice_attempts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id         uuid        NOT NULL,  -- curriculum_speaking.id
  attempt_number  int         NOT NULL,
  audio_path      text        NOT NULL,  -- voice-notes bucket path: practice/<sid>/<tid>/<n>.<ext>
  audio_duration_sec int,
  transcript      text,
  feedback        jsonb,  -- { transcript_check, pronunciation_notes, fluency_note, suggestion, score_1to10, encouragement }
  cost_sar        numeric(10,4) DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_practice_student_task
  ON speaking_practice_attempts (student_id, task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_practice_expires
  ON speaking_practice_attempts (expires_at);

ALTER TABLE speaking_practice_attempts ENABLE ROW LEVEL SECURITY;

-- Students can only see and insert their own attempts
-- No trainer/admin policy — practice is private scratch work
CREATE POLICY "students read own practice"
  ON speaking_practice_attempts FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "students insert own practice"
  ON speaking_practice_attempts FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Cleanup function
CREATE OR REPLACE FUNCTION purge_expired_practice_attempts() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM speaking_practice_attempts WHERE expires_at < now();
END;
$$;

COMMIT;
