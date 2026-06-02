-- Student bug reporting — a simple, always-reachable "report a problem" channel.
-- Students submit a short description + optional screenshot; staff (admin/trainer)
-- see every report and are notified. Kept deliberately minimal.

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_role   text,
  reporter_name   text,
  description     text NOT NULL,
  page_url        text,                         -- where they were when they hit the bug
  screenshot_path text,                         -- path in the bug-screenshots bucket (nullable)
  device_info     jsonb DEFAULT '{}'::jsonb,    -- userAgent / viewport / platform
  status          text NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','in_progress','resolved','wontfix')),
  admin_notes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  resolved_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.bug_reports IS
  'Student-submitted bug reports. Simple channel: description + optional screenshot. Staff are notified on insert.';

CREATE INDEX IF NOT EXISTS bug_reports_status_idx  ON public.bug_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS bug_reports_reporter_idx ON public.bug_reports (reporter_id, created_at DESC);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- A user can file a report as themselves.
DROP POLICY IF EXISTS bug_reports_insert_own ON public.bug_reports;
CREATE POLICY bug_reports_insert_own ON public.bug_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- A user can see their own reports; staff can see all.
DROP POLICY IF EXISTS bug_reports_select ON public.bug_reports;
CREATE POLICY bug_reports_select ON public.bug_reports
  FOR SELECT TO authenticated
  USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = auth.uid() AND p.role IN ('admin','trainer'))
  );

-- Staff can triage (update status / notes).
DROP POLICY IF EXISTS bug_reports_staff_update ON public.bug_reports;
CREATE POLICY bug_reports_staff_update ON public.bug_reports
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role IN ('admin','trainer')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p
                      WHERE p.id = auth.uid() AND p.role IN ('admin','trainer')));

DROP POLICY IF EXISTS bug_reports_service_all ON public.bug_reports;
CREATE POLICY bug_reports_service_all ON public.bug_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Screenshot storage ──────────────────────────────────────────────────────
-- Private bucket; students upload into their own folder, staff read everything.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bug-screenshots', 'bug-screenshots', false, 10485760,
        ARRAY['image/png','image/jpeg','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Upload only into a folder named after your own uid: <uid>/<file>.
DROP POLICY IF EXISTS bug_screenshots_insert_own ON storage.objects;
CREATE POLICY bug_screenshots_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bug-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read your own screenshots; staff read all.
DROP POLICY IF EXISTS bug_screenshots_select ON storage.objects;
CREATE POLICY bug_screenshots_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'bug-screenshots'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role IN ('admin','trainer'))
    )
  );
