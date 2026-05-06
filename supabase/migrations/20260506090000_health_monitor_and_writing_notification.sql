BEGIN;

-- 1. Add writing_evaluated to notification_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname LIKE '%notification%type%' AND e.enumlabel = 'writing_evaluated'
  ) THEN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'writing_evaluated';
  END IF;
END $$;

-- 2. Also add writing_needs_manual_review if missing (sweeper escalation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname LIKE '%notification%type%' AND e.enumlabel = 'writing_needs_manual_review'
  ) THEN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'writing_needs_manual_review';
  END IF;
END $$;

-- 3. evaluation_health_log table (Layer 6)
CREATE TABLE IF NOT EXISTS evaluation_health_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_at timestamptz NOT NULL DEFAULT NOW(),
  writing_total int NOT NULL DEFAULT 0,
  writing_completed int NOT NULL DEFAULT 0,
  writing_pending int NOT NULL DEFAULT 0,
  writing_failed int NOT NULL DEFAULT 0,
  writing_escalated int NOT NULL DEFAULT 0,
  speaking_total int NOT NULL DEFAULT 0,
  speaking_completed int NOT NULL DEFAULT 0,
  speaking_pending int NOT NULL DEFAULT 0,
  speaking_failed_retrying int NOT NULL DEFAULT 0,
  speaking_failed_manual int NOT NULL DEFAULT 0,
  affected_students int NOT NULL DEFAULT 0,
  oldest_stuck_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_health_log_check_at ON evaluation_health_log (check_at DESC);

COMMIT;
