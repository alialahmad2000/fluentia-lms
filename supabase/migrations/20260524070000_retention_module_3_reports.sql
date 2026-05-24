-- ─────────────────────────────────────────────────────────────────────────────
-- Retention System — Block 6 (Module 3 — Weekly Progress Reports)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. retention_report_templates ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.retention_report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shape_key jsonb NOT NULL,
  title_ar text NOT NULL,
  intro_ar text NOT NULL,
  body_ar text NOT NULL,
  closing_ar text NOT NULL,
  priority smallint DEFAULT 50,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retention_report_templates_active_idx
  ON public.retention_report_templates (active, priority DESC);

-- ─── 2. retention_reports ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.retention_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  shape_key jsonb,
  template_id uuid REFERENCES public.retention_report_templates(id) ON DELETE SET NULL,
  metrics jsonb NOT NULL,
  rendered_title_ar text,
  rendered_body_ar text,
  status text NOT NULL DEFAULT 'pending_trainer_review'
    CHECK (status IN ('pending_trainer_review','approved','sent','skipped')),
  trainer_edits jsonb,
  trainer_id uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, week_start)
);
CREATE INDEX IF NOT EXISTS retention_reports_pending_idx
  ON public.retention_reports (status, week_start DESC)
  WHERE status = 'pending_trainer_review';
CREATE INDEX IF NOT EXISTS retention_reports_student_idx
  ON public.retention_reports (student_id, week_start DESC);

-- ─── 3. RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.retention_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS retention_report_templates_read ON public.retention_report_templates;
CREATE POLICY retention_report_templates_read ON public.retention_report_templates
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS retention_report_templates_admin_write ON public.retention_report_templates;
CREATE POLICY retention_report_templates_admin_write ON public.retention_report_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Reports: students see only their own AND only when status='sent'
DROP POLICY IF EXISTS retention_reports_student_select ON public.retention_reports;
CREATE POLICY retention_reports_student_select ON public.retention_reports
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() AND status = 'sent');
-- Trainers + admins see all
DROP POLICY IF EXISTS retention_reports_staff_select ON public.retention_reports;
CREATE POLICY retention_reports_staff_select ON public.retention_reports
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','trainer')));
-- Trainers + admins can UPDATE (approve/edit/send)
DROP POLICY IF EXISTS retention_reports_staff_update ON public.retention_reports;
CREATE POLICY retention_reports_staff_update ON public.retention_reports
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','trainer')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','trainer')));

-- ─── 4. Report generation RPC ───────────────────────────────────────────────
-- Per-student metrics collector + template matcher + slot filler.
-- Called per-student by the edge function. Inserts a 'pending_trainer_review' row.

CREATE OR REPLACE FUNCTION public.retention_build_weekly_report(p_student_id uuid, p_week_start date DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Riyadh')::date;
  v_week_start date;
  v_week_end date;
  v_prev_start date;
  v_prev_end date;
  v_xp_this_week int := 0;
  v_xp_prev_week int := 0;
  v_streak int := 0;
  v_dialogues int := 0;
  v_homework int := 0;
  v_words_saved int := 0;
  v_briefs_opened int := 0;
  v_attendance_pct int := 0;
  v_xp_trend text;
  v_streak_trend text;
  v_full_name text;
  v_template RECORD;
  v_metrics jsonb;
  v_shape jsonb;
  v_report_id uuid;
BEGIN
  -- Default to current week (Sunday-Saturday in Riyadh time)
  IF p_week_start IS NULL THEN
    v_week_start := v_today - ((EXTRACT(DOW FROM v_today)::int) % 7);
  ELSE
    v_week_start := p_week_start;
  END IF;
  v_week_end := v_week_start + 6;
  v_prev_start := v_week_start - 7;
  v_prev_end := v_week_start - 1;

  -- Collect metrics
  SELECT COALESCE(sum(amount), 0)::int INTO v_xp_this_week
    FROM xp_transactions WHERE student_id = p_student_id
      AND created_at >= v_week_start::timestamptz AND amount > 0;
  SELECT COALESCE(sum(amount), 0)::int INTO v_xp_prev_week
    FROM xp_transactions WHERE student_id = p_student_id
      AND created_at >= v_prev_start::timestamptz AND created_at < v_week_start::timestamptz AND amount > 0;
  SELECT current_streak INTO v_streak FROM students WHERE id = p_student_id;
  v_streak := COALESCE(v_streak, 0);
  SELECT count(*)::int INTO v_dialogues FROM retention_dialogue_attempts
    WHERE student_id = p_student_id AND completed_at IS NOT NULL
      AND completed_at >= v_week_start::timestamptz;
  SELECT count(*)::int INTO v_homework FROM retention_homework_sets
    WHERE student_id = p_student_id AND completed_at IS NOT NULL
      AND completed_at >= v_week_start::timestamptz;
  SELECT count(*)::int INTO v_words_saved FROM student_saved_words
    WHERE student_id = p_student_id AND created_at >= v_week_start::timestamptz;
  SELECT count(*)::int INTO v_briefs_opened FROM retention_lesson_brief_deliveries
    WHERE student_id = p_student_id AND opened_at IS NOT NULL
      AND opened_at >= v_week_start::timestamptz;

  -- Attendance % this week (based on attendance records)
  SELECT CASE WHEN count(*) > 0
    THEN (count(*) FILTER (WHERE status = 'present'))::int * 100 / count(*)
    ELSE 0 END
    INTO v_attendance_pct
  FROM attendance
  WHERE student_id = p_student_id
    AND created_at >= v_week_start::timestamptz AND created_at <= (v_week_end + 1)::timestamptz;

  -- Trends
  v_xp_trend := CASE
    WHEN v_xp_this_week > v_xp_prev_week * 1.1 THEN 'up'
    WHEN v_xp_this_week < v_xp_prev_week * 0.9 THEN 'down'
    ELSE 'flat'
  END;
  v_streak_trend := CASE WHEN v_streak >= 3 THEN 'strong' WHEN v_streak >= 1 THEN 'building' ELSE 'broken' END;

  v_metrics := jsonb_build_object(
    'xp_this_week', v_xp_this_week,
    'xp_prev_week', v_xp_prev_week,
    'streak', v_streak,
    'dialogues_completed', v_dialogues,
    'homework_completed', v_homework,
    'words_saved', v_words_saved,
    'briefs_opened', v_briefs_opened,
    'attendance_pct', v_attendance_pct,
    'xp_trend', v_xp_trend,
    'streak_trend', v_streak_trend
  );
  v_shape := jsonb_build_object(
    'xp_trend', v_xp_trend,
    'streak_trend', v_streak_trend,
    'attendance_full', v_attendance_pct >= 90
  );

  -- Get student name
  SELECT COALESCE(display_name, full_name) INTO v_full_name FROM profiles WHERE id = p_student_id;
  v_full_name := COALESCE(v_full_name, 'الطالبة');

  -- Pick template — most specific match first.
  -- `v_shape @> shape_key` is true when the actual shape contains every key/value
  -- in the template's constraint. Empty shape_key '{}' matches everything.
  SELECT * INTO v_template FROM retention_report_templates
    WHERE active = true
      AND v_shape @> shape_key
    ORDER BY
      (SELECT count(*) FROM jsonb_object_keys(shape_key)) DESC,  -- most specific first
      priority DESC
    LIMIT 1;
  IF v_template IS NULL THEN
    -- Fallback: the most generic + highest priority active template
    SELECT * INTO v_template FROM retention_report_templates WHERE active = true ORDER BY priority DESC LIMIT 1;
  END IF;
  IF v_template IS NULL THEN
    RAISE EXCEPTION 'No retention_report_templates seeded';
  END IF;

  -- Slot-fill (rendered title + body)
  INSERT INTO retention_reports (
    student_id, week_start, week_end, shape_key, template_id, metrics,
    rendered_title_ar, rendered_body_ar
  ) VALUES (
    p_student_id, v_week_start, v_week_end, v_shape, v_template.id, v_metrics,
    replace(v_template.title_ar, '{{student_name}}', v_full_name),
    replace(replace(replace(replace(replace(replace(replace(
      v_template.intro_ar || E'\n\n' || v_template.body_ar || E'\n\n' || v_template.closing_ar,
      '{{student_name}}', v_full_name),
      '{{xp_this_week}}', v_xp_this_week::text),
      '{{xp_prev_week}}', v_xp_prev_week::text),
      '{{streak}}', v_streak::text),
      '{{dialogues}}', v_dialogues::text),
      '{{homework}}', v_homework::text),
      '{{words_saved}}', v_words_saved::text)
  )
  ON CONFLICT (student_id, week_start) DO UPDATE
    SET metrics = EXCLUDED.metrics,
        shape_key = EXCLUDED.shape_key,
        template_id = EXCLUDED.template_id,
        rendered_title_ar = EXCLUDED.rendered_title_ar,
        rendered_body_ar = EXCLUDED.rendered_body_ar
    WHERE retention_reports.status = 'pending_trainer_review'  -- never overwrite approved/sent
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.retention_build_weekly_report(uuid, date) TO authenticated;

-- ─── 5. pg_cron schedule — DISABLED ─────────────────────────────────────────
DO $$
DECLARE v_jobid bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retention-weekly-reports') THEN
    PERFORM cron.unschedule('retention-weekly-reports');
  END IF;
  v_jobid := cron.schedule(
    'retention-weekly-reports',
    '0 14 * * 0',  -- Sunday 14:00 UTC = Sunday 17:00 Riyadh
    $cmd$
      SELECT public.retention_build_weekly_report(s.id, NULL)
      FROM public.students s
      WHERE s.status = 'active' AND s.deleted_at IS NULL
        AND public.retention_is_module_enabled(s.id, 'weekly_reports') = true;
    $cmd$
  );
  PERFORM cron.alter_job(v_jobid, active => false);
END
$$;
