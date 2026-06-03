-- Fluentia LMS — Shareable parent links for the per-student activity report.
-- A staff member mints a revocable/expirable token bound to (student, period). The
-- public /r/:token page calls student-activity-report with the token (no login),
-- which validates the row and returns that period's report read-only.

CREATE TABLE IF NOT EXISTS public.activity_report_shares (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token         text UNIQUE NOT NULL
                  DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  student_id    uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  range_type    text NOT NULL,
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  locale        text NOT NULL DEFAULT 'ar',
  created_by    uuid REFERENCES public.profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz,
  revoked_at    timestamptz,
  view_count    int NOT NULL DEFAULT 0,
  last_viewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ars_token   ON public.activity_report_shares (token);
CREATE INDEX IF NOT EXISTS idx_ars_student ON public.activity_report_shares (student_id, created_at DESC);

ALTER TABLE public.activity_report_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ars_service_all ON public.activity_report_shares;
DROP POLICY IF EXISTS ars_staff_read  ON public.activity_report_shares;

CREATE POLICY ars_service_all ON public.activity_report_shares
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY ars_staff_read ON public.activity_report_shares
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = ANY (ARRAY['admin'::user_role, 'trainer'::user_role]))
  );

-- Mint a share link (staff only). Returns the token.
CREATE OR REPLACE FUNCTION public.create_activity_report_share(
  p_student uuid, p_range_type text, p_start date, p_end date, p_expires_days int DEFAULT 30
)
RETURNS text
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_uid  uuid := auth.uid();
  v_role text;
  v_token text;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('admin', 'trainer') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  INSERT INTO activity_report_shares (student_id, range_type, period_start, period_end, created_by, expires_at)
  VALUES (
    p_student, p_range_type, p_start, p_end, v_uid,
    CASE WHEN p_expires_days IS NULL THEN NULL ELSE now() + (p_expires_days || ' days')::interval END
  )
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$fn$;

-- Revoke a share link (the creator or any admin).
CREATE OR REPLACE FUNCTION public.revoke_activity_report_share(p_token text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_uid  uuid := auth.uid();
  v_role text;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('admin', 'trainer') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE activity_report_shares
  SET revoked_at = now()
  WHERE token = p_token
    AND (created_by = v_uid OR v_role = 'admin')
    AND revoked_at IS NULL;

  RETURN FOUND;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.create_activity_report_share(uuid, text, date, date, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_activity_report_share(text) TO authenticated;
