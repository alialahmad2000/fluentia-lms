-- 020: Fix weekly tasks constraints
-- 1. Add 'vocabulary' to weekly_tasks type CHECK constraint
-- 2. Add 'weekly_tasks' to ai_usage_type enum
-- Run in Supabase SQL Editor

-- 1. Drop and recreate the CHECK constraint on weekly_tasks.type to include 'vocabulary'
ALTER TABLE weekly_tasks DROP CONSTRAINT IF EXISTS weekly_tasks_type_check;
ALTER TABLE weekly_tasks ADD CONSTRAINT weekly_tasks_type_check
  CHECK (type IN ('speaking','reading','writing','listening','irregular_verbs','vocabulary'));

-- 2. Add 'weekly_tasks' to ai_usage_type enum
ALTER TYPE ai_usage_type ADD VALUE IF NOT EXISTS 'weekly_tasks';
