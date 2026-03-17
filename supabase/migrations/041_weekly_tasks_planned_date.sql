-- Migration 041: Add planned_date to weekly_tasks for task planning on calendar
ALTER TABLE weekly_tasks ADD COLUMN IF NOT EXISTS planned_date date;
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_planned ON weekly_tasks(planned_date) WHERE planned_date IS NOT NULL;
