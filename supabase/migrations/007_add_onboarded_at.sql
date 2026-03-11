-- ============================================================================
-- 007: Add onboarded_at column to profiles for student onboarding flow
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Mark all existing profiles as already onboarded
UPDATE public.profiles SET onboarded_at = created_at WHERE onboarded_at IS NULL;
