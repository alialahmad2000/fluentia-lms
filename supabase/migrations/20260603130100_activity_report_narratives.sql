-- Fluentia LMS — Activity Report AI Narrative Cache
-- Caches the AI-written Arabic/English summary per (student, period, locale) so opening a
-- report doesn't re-bill Claude every time. Regenerated only when the underlying numbers
-- change materially (data_signature) or when force-refreshed.

CREATE TABLE IF NOT EXISTS public.activity_report_narratives (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  range_type     text NOT NULL,                       -- day | week | month | custom
  period_start   date NOT NULL,
  period_end     date NOT NULL,
  locale         text NOT NULL DEFAULT 'ar',
  narrative      text,
  next_steps     jsonb NOT NULL DEFAULT '[]'::jsonb,  -- short actionable suggestions
  data_signature text NOT NULL,                       -- detects material data change
  model          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arn_unique UNIQUE (student_id, range_type, period_start, period_end, locale)
);

CREATE INDEX IF NOT EXISTS idx_arn_lookup ON public.activity_report_narratives (student_id, range_type, period_start, period_end, locale);

ALTER TABLE public.activity_report_narratives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS arn_service_all ON public.activity_report_narratives;
DROP POLICY IF EXISTS arn_staff_read  ON public.activity_report_narratives;

CREATE POLICY arn_service_all ON public.activity_report_narratives
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY arn_staff_read ON public.activity_report_narratives
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = ANY (ARRAY['admin'::user_role, 'trainer'::user_role]))
  );
