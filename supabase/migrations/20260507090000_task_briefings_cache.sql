-- AI Coach B1: task_briefings_cache
-- Stores per-student per-task pre-task briefings with 7-day TTL

BEGIN;

CREATE TABLE IF NOT EXISTS task_briefings_cache (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id           uuid        NOT NULL,
  task_type         text        NOT NULL CHECK (task_type IN ('writing','speaking')),
  briefing_payload  jsonb       NOT NULL,
  generated_at      timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  CONSTRAINT uq_briefing UNIQUE (student_id, task_id, task_type)
);

CREATE INDEX IF NOT EXISTS idx_briefings_student_expires
  ON task_briefings_cache (student_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_briefings_lookup
  ON task_briefings_cache (student_id, task_id, task_type);

ALTER TABLE task_briefings_cache ENABLE ROW LEVEL SECURITY;

-- Students can read their own briefings (SELECT only — writes via service role)
CREATE POLICY "students read own briefings"
  ON task_briefings_cache FOR SELECT
  USING (auth.uid() = student_id);

COMMIT;
