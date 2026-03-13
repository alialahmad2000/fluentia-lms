-- 018: Add weekly task notification types to enum
-- Idempotent: uses IF NOT EXISTS pattern

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'weekly_tasks_ready';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'weekly_tasks_remind';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'weekly_tasks_urgent';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'spelling_milestone';
EXCEPTION WHEN duplicate_object THEN null;
END $$;
