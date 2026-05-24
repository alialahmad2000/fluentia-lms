-- ─────────────────────────────────────────────────────────────────────────────
-- Retention System — Block 4 (Module 5 — Pre/Post-class Briefs)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. retention_lesson_briefs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.retention_lesson_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.curriculum_units(id) ON DELETE CASCADE,
  brief_type text NOT NULL CHECK (brief_type IN ('prep','review')),
  title_ar text NOT NULL,
  body_ar text NOT NULL,
  vocab_words text[],
  grammar_concept_ar text,
  warmup_question_ar text,
  self_check_question_ar text,
  self_check_options jsonb,
  self_check_correct text,
  mini_task_ar text,
  audio_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, brief_type)
);
CREATE INDEX IF NOT EXISTS retention_briefs_unit_idx ON public.retention_lesson_briefs (unit_id, brief_type);

-- ─── 2. retention_lesson_brief_deliveries (expand Block 2 stub) ─────────────
ALTER TABLE public.retention_lesson_brief_deliveries
  ADD COLUMN IF NOT EXISTS brief_id uuid REFERENCES public.retention_lesson_briefs(id) ON DELETE CASCADE;
ALTER TABLE public.retention_lesson_brief_deliveries
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;
ALTER TABLE public.retention_lesson_brief_deliveries
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
ALTER TABLE public.retention_lesson_brief_deliveries
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.retention_lesson_brief_deliveries
  ADD COLUMN IF NOT EXISTS self_check_answer text;
ALTER TABLE public.retention_lesson_brief_deliveries
  ADD COLUMN IF NOT EXISTS self_check_correct boolean;

CREATE UNIQUE INDEX IF NOT EXISTS retention_lbd_unique_per_class_brief
  ON public.retention_lesson_brief_deliveries (student_id, brief_id, class_id);

-- Trigger updated_at on briefs
DROP TRIGGER IF EXISTS trg_retention_briefs_updated_at ON public.retention_lesson_briefs;
CREATE TRIGGER trg_retention_briefs_updated_at
  BEFORE UPDATE ON public.retention_lesson_briefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.retention_lesson_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS retention_briefs_read ON public.retention_lesson_briefs;
CREATE POLICY retention_briefs_read
  ON public.retention_lesson_briefs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS retention_briefs_admin_write ON public.retention_lesson_briefs;
CREATE POLICY retention_briefs_admin_write
  ON public.retention_lesson_briefs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Deliveries: students can update their own (for opened_at, self_check)
DROP POLICY IF EXISTS retention_lbd_student_update ON public.retention_lesson_brief_deliveries;
CREATE POLICY retention_lbd_student_update
  ON public.retention_lesson_brief_deliveries FOR UPDATE TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- ─── 4. Delivery RPCs ───────────────────────────────────────────────────────
-- retention_deliver_briefs(p_window text) called by pg_cron every 15 min.
-- Window 'pre': find classes 12-13 hours from now; deliver prep brief.
-- Window 'post': find classes 1.5-2.5 hours ago; deliver review brief.

CREATE OR REPLACE FUNCTION public.retention_deliver_briefs(p_window text)
RETURNS TABLE (deliveries_inserted integer, classes_matched integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_brief_type text;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_class RECORD;
  v_student RECORD;
  v_brief RECORD;
  v_inserted int := 0;
  v_classes int := 0;
BEGIN
  IF p_window = 'pre' THEN
    v_brief_type := 'prep';
    -- Classes starting 12-13 hours from now
    v_window_start := now() + interval '12 hours';
    v_window_end   := now() + interval '13 hours';
  ELSIF p_window = 'post' THEN
    v_brief_type := 'review';
    -- Classes that ended 1.5-2.5 hours ago
    v_window_start := now() - interval '2 hours 30 minutes';
    v_window_end   := now() - interval '1 hour 30 minutes';
  ELSE
    RAISE EXCEPTION 'Invalid window: %; must be pre or post', p_window;
  END IF;

  FOR v_class IN
    SELECT c.id AS class_id, c.group_id, c.date, c.start_time, c.end_time,
           a.unit_id, (c.date + c.start_time)::timestamptz AS starts_at,
           (c.date + COALESCE(c.end_time, c.start_time + interval '1 hour'))::timestamptz AS ends_at
    FROM public.classes c
    LEFT JOIN LATERAL (
      SELECT unit_id FROM public.attendance att
      WHERE att.class_id = c.id AND att.unit_id IS NOT NULL
      ORDER BY att.created_at DESC LIMIT 1
    ) a ON true
    WHERE c.status = 'scheduled' OR c.status = 'completed'
  LOOP
    -- Window check (pre uses starts_at, post uses ends_at)
    IF (p_window = 'pre'  AND v_class.starts_at BETWEEN v_window_start AND v_window_end) OR
       (p_window = 'post' AND v_class.ends_at   BETWEEN v_window_start AND v_window_end) THEN
      v_classes := v_classes + 1;

      -- Lookup brief for this unit
      IF v_class.unit_id IS NULL THEN CONTINUE; END IF;
      SELECT * INTO v_brief FROM public.retention_lesson_briefs
        WHERE unit_id = v_class.unit_id AND brief_type = v_brief_type LIMIT 1;
      IF v_brief IS NULL THEN CONTINUE; END IF;

      -- For each student in the group with module enabled, insert delivery
      FOR v_student IN
        SELECT s.id
        FROM public.students s
        WHERE s.group_id = v_class.group_id
          AND s.status = 'active' AND s.deleted_at IS NULL
          AND public.retention_is_module_enabled(s.id, 'lesson_briefs') = true
      LOOP
        BEGIN
          INSERT INTO public.retention_lesson_brief_deliveries (
            student_id, brief_id, class_id, scheduled_for, delivered_at
          ) VALUES (
            v_student.id, v_brief.id, v_class.class_id,
            CASE WHEN p_window = 'pre' THEN v_class.starts_at - interval '12 hours'
                 ELSE v_class.ends_at + interval '2 hours' END,
            now()
          )
          ON CONFLICT (student_id, brief_id, class_id) DO NOTHING;
          IF FOUND THEN
            v_inserted := v_inserted + 1;
            -- Notify student
            INSERT INTO public.notifications (user_id, type, title, body, data, priority)
            VALUES (
              v_student.id,
              'class_reminder'::notification_type,
              CASE WHEN p_window = 'pre' THEN 'تحضير الكلاس القادم' ELSE 'مراجعة كلاسكِ' END,
              v_brief.title_ar,
              jsonb_build_object('kind', 'retention_lesson_brief', 'brief_id', v_brief.id, 'window', p_window),
              'normal'
            );
          END IF;
        EXCEPTION WHEN OTHERS THEN
          INSERT INTO public.system_errors (error_type, service, error_message, error_context)
          VALUES (
            'retention_deliver_briefs.insert',
            'retention_deliver_briefs',
            SQLERRM,
            jsonb_build_object('student_id', v_student.id, 'brief_id', v_brief.id, 'class_id', v_class.class_id)
          );
        END;
      END LOOP;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_inserted, v_classes;
END;
$$;

GRANT EXECUTE ON FUNCTION public.retention_deliver_briefs(text) TO authenticated;

-- ─── 5. pg_cron schedules — DISABLED ────────────────────────────────────────
DO $$
DECLARE v_pre_jobid bigint; v_post_jobid bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retention-deliver-pre-class') THEN
    PERFORM cron.unschedule('retention-deliver-pre-class');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retention-deliver-post-class') THEN
    PERFORM cron.unschedule('retention-deliver-post-class');
  END IF;

  v_pre_jobid := cron.schedule(
    'retention-deliver-pre-class',
    '*/15 * * * *',
    $cmd$SELECT public.retention_deliver_briefs('pre');$cmd$
  );
  v_post_jobid := cron.schedule(
    'retention-deliver-post-class',
    '*/15 * * * *',
    $cmd$SELECT public.retention_deliver_briefs('post');$cmd$
  );

  PERFORM cron.alter_job(v_pre_jobid, active => false);
  PERFORM cron.alter_job(v_post_jobid, active => false);
END
$$;
