-- ============================================================================
-- 123: Bulletproof writing evaluation queue
-- Adds evaluation tracking columns + backfill + sweeper index + cron
-- ============================================================================

-- Add evaluation tracking columns
ALTER TABLE student_curriculum_progress
  ADD COLUMN IF NOT EXISTS evaluation_status TEXT DEFAULT NULL
    CHECK (evaluation_status IS NULL OR evaluation_status IN ('pending','evaluating','completed','failed','escalated')),
  ADD COLUMN IF NOT EXISTS evaluation_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evaluation_last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS evaluation_last_error TEXT,
  ADD COLUMN IF NOT EXISTS evaluation_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_to_trainer_at TIMESTAMPTZ;

-- Backfill: completed evaluations
UPDATE student_curriculum_progress
SET evaluation_status = 'completed',
    evaluation_completed_at = updated_at
WHERE section_type = 'writing'
  AND writing_id IS NOT NULL
  AND ai_feedback IS NOT NULL
  AND evaluation_status IS NULL;

-- Backfill: stuck pending (submitted but no feedback)
UPDATE student_curriculum_progress
SET evaluation_status = 'pending',
    evaluation_attempts = 0
WHERE section_type = 'writing'
  AND writing_id IS NOT NULL
  AND ai_feedback IS NULL
  AND status = 'completed'
  AND evaluation_status IS NULL;

-- Index for the sweeper to find pending work fast
CREATE INDEX IF NOT EXISTS idx_writing_pending_eval
  ON student_curriculum_progress (evaluation_status, evaluation_last_attempt_at)
  WHERE writing_id IS NOT NULL
    AND evaluation_status IN ('pending','failed','evaluating');

-- Add notification type for manual review escalation
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'writing_needs_review';

-- Enable Realtime for this table (students need live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE student_curriculum_progress;

-- Schedule the sweeper every 5 minutes
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('sweep-writing-evaluations')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sweep-writing-evaluations');

SELECT cron.schedule(
  'sweep-writing-evaluations',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/sweep-writing-evaluations',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
