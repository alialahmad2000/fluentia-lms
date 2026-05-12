-- User interests for the Personalization Bank
-- Each user picks up to 3 from 8 buckets; ordering = priority
CREATE TABLE IF NOT EXISTS public.user_interests (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  interests TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  has_completed_survey BOOLEAN NOT NULL DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  survey_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_interests_count_check CHECK (array_length(interests, 1) IS NULL OR array_length(interests, 1) <= 3),
  CONSTRAINT user_interests_values_check CHECK (
    interests <@ ARRAY['medical','business','tech','sports','travel_food','islamic','fashion_beauty','family']::TEXT[]
  )
);

CREATE OR REPLACE FUNCTION public.set_user_interests_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_interests_updated_at
  BEFORE UPDATE ON public.user_interests
  FOR EACH ROW EXECUTE FUNCTION public.set_user_interests_updated_at();

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_interests_self_read" ON public.user_interests;
CREATE POLICY "user_interests_self_read"
  ON public.user_interests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_interests_self_upsert" ON public.user_interests;
CREATE POLICY "user_interests_self_upsert"
  ON public.user_interests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_interests_self_update" ON public.user_interests;
CREATE POLICY "user_interests_self_update"
  ON public.user_interests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_interests_service_role_all" ON public.user_interests;
CREATE POLICY "user_interests_service_role_all"
  ON public.user_interests FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);
