-- ============================================================
-- LEGENDARY-A: Shared Core Foundation
-- Unified Activity Ledger + Skill Radar + Helper RPCs + RLS
-- ============================================================

-- ─── PHASE 2: Unified Activity Ledger ─────────────────────

CREATE TABLE IF NOT EXISTS public.unified_activity_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  event_subtype   text,
  ref_table       text,
  ref_id          uuid,
  xp_delta        integer NOT NULL DEFAULT 0,
  skill_impact    jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Canonical event_type values (documented — enforced by convention, not constraint):
-- unit_completed, unit_tab_completed (subtype: reading_a|reading_b|grammar|vocabulary|writing|speaking|listening|pronunciation|assessment)
-- reading_submitted, writing_submitted, speaking_submitted, speaking_graded, writing_graded
-- vocab_added, vocab_reviewed, vocab_mastered
-- class_attended, peer_recognition_received, peer_recognition_given
-- achievement_unlocked, streak_milestone, streak_freeze_used, streak_broken
-- level_promoted, daily_challenge_completed, placement_test_completed
-- recording_completed

COMMENT ON TABLE public.unified_activity_log IS
  'LEGENDARY-A: Single source of truth for all student activity. Every XP grant, skill impact, and engagement event flows through here. Do NOT write directly — use log_activity() RPC.';

CREATE INDEX IF NOT EXISTS idx_ual_student_time
  ON public.unified_activity_log (student_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_ual_event_type
  ON public.unified_activity_log (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_ual_student_day
  ON public.unified_activity_log (student_id, ((occurred_at AT TIME ZONE 'Asia/Riyadh')::date));


-- ─── PHASE 3: Skill Radar ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.student_skill_state (
  student_id    uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  vocabulary    integer NOT NULL DEFAULT 0,
  reading       integer NOT NULL DEFAULT 0,
  writing       integer NOT NULL DEFAULT 0,
  speaking      integer NOT NULL DEFAULT 0,
  listening     integer NOT NULL DEFAULT 0,
  grammar       integer NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.student_skill_state IS
  'LEGENDARY-A: Current skill radar state per student (0-100 per skill). Updated by trigger on unified_activity_log.';

-- Trigger: after activity insert, apply skill_impact
CREATE OR REPLACE FUNCTION public.fn_apply_skill_impact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.skill_impact IS NULL OR NEW.skill_impact = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.student_skill_state (student_id)
  VALUES (NEW.student_id)
  ON CONFLICT (student_id) DO NOTHING;

  UPDATE public.student_skill_state SET
    vocabulary = LEAST(100, GREATEST(0, vocabulary + COALESCE((NEW.skill_impact->>'vocabulary')::int, 0))),
    reading    = LEAST(100, GREATEST(0, reading    + COALESCE((NEW.skill_impact->>'reading')::int,    0))),
    writing    = LEAST(100, GREATEST(0, writing    + COALESCE((NEW.skill_impact->>'writing')::int,    0))),
    speaking   = LEAST(100, GREATEST(0, speaking   + COALESCE((NEW.skill_impact->>'speaking')::int,   0))),
    listening  = LEAST(100, GREATEST(0, listening  + COALESCE((NEW.skill_impact->>'listening')::int,  0))),
    grammar    = LEAST(100, GREATEST(0, grammar    + COALESCE((NEW.skill_impact->>'grammar')::int,    0))),
    updated_at = now()
  WHERE student_id = NEW.student_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_skill_impact ON public.unified_activity_log;
CREATE TRIGGER trg_apply_skill_impact
AFTER INSERT ON public.unified_activity_log
FOR EACH ROW EXECUTE FUNCTION public.fn_apply_skill_impact();


-- ─── PHASE 4: Helper RPCs ────────────────────────────────

-- 4.1 log_activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_student_id    uuid,
  p_event_type    text,
  p_event_subtype text DEFAULT NULL,
  p_ref_table     text DEFAULT NULL,
  p_ref_id        uuid DEFAULT NULL,
  p_xp_delta      integer DEFAULT 0,
  p_skill_impact  jsonb DEFAULT '{}'::jsonb,
  p_metadata      jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.unified_activity_log
    (student_id, event_type, event_subtype, ref_table, ref_id, xp_delta, skill_impact, metadata)
  VALUES
    (p_student_id, p_event_type, p_event_subtype, p_ref_table, p_ref_id, p_xp_delta, p_skill_impact, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_activity(uuid, text, text, text, uuid, integer, jsonb, jsonb) TO authenticated;


-- 4.2 get_student_xp
CREATE OR REPLACE FUNCTION public.get_student_xp(
  p_student_id uuid,
  p_from       timestamptz DEFAULT '-infinity',
  p_to         timestamptz DEFAULT 'infinity'
) RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(xp_delta), 0)::bigint
  FROM public.unified_activity_log
  WHERE student_id = p_student_id
    AND occurred_at >= p_from
    AND occurred_at <  p_to;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_xp(uuid, timestamptz, timestamptz) TO authenticated;


-- 4.3 get_student_streak (Asia/Riyadh timezone, consecutive days)
CREATE OR REPLACE FUNCTION public.get_student_streak(p_student_id uuid)
RETURNS TABLE(current_streak int, longest_streak int, last_active_date date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current int := 0;
  v_longest int := 0;
  v_prev    date;
  r         record;
BEGIN
  FOR r IN
    SELECT DISTINCT (occurred_at AT TIME ZONE 'Asia/Riyadh')::date AS d
    FROM public.unified_activity_log
    WHERE student_id = p_student_id
    ORDER BY d DESC
  LOOP
    IF v_prev IS NULL THEN
      v_current := 1;
      v_longest := 1;
      v_prev := r.d;
    ELSIF v_prev - r.d = 1 THEN
      v_current := v_current + 1;
      v_longest := GREATEST(v_longest, v_current);
      v_prev := r.d;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  -- If last activity isn't today or yesterday (Riyadh time), current streak is 0
  IF v_prev IS NULL OR v_prev < (now() AT TIME ZONE 'Asia/Riyadh')::date - 1 THEN
    v_current := 0;
  END IF;

  RETURN QUERY SELECT v_current, v_longest, v_prev;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_streak(uuid) TO authenticated;


-- 4.4 get_skill_radar
CREATE OR REPLACE FUNCTION public.get_skill_radar(p_student_id uuid)
RETURNS TABLE(vocabulary int, reading int, writing int, speaking int, listening int, grammar int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT vocabulary, reading, writing, speaking, listening, grammar
  FROM public.student_skill_state
  WHERE student_id = p_student_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_skill_radar(uuid) TO authenticated;


-- 4.5 get_group_leaderboard (adapted: joins profiles for names/avatar since students has no name columns)
CREATE OR REPLACE FUNCTION public.get_group_leaderboard(
  p_group_id uuid,
  p_period   text DEFAULT 'week'
) RETURNS TABLE(
  student_id       uuid,
  display_name     text,
  avatar_url       text,
  xp_total         bigint,
  rank             int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_from timestamptz;
BEGIN
  v_from := CASE p_period
    WHEN 'day'   THEN (date_trunc('day',   now() AT TIME ZONE 'Asia/Riyadh') AT TIME ZONE 'Asia/Riyadh')
    WHEN 'week'  THEN (date_trunc('week',  now() AT TIME ZONE 'Asia/Riyadh') AT TIME ZONE 'Asia/Riyadh')
    WHEN 'month' THEN (date_trunc('month', now() AT TIME ZONE 'Asia/Riyadh') AT TIME ZONE 'Asia/Riyadh')
    ELSE '-infinity'::timestamptz
  END;

  RETURN QUERY
  WITH group_students AS (
    SELECT s.id,
           COALESCE(NULLIF(TRIM(p.full_name), ''), p.display_name, 'طالب') AS display_name,
           p.avatar_url
    FROM public.students s
    JOIN public.profiles p ON p.id = s.id
    WHERE s.group_id = p_group_id
      AND s.deleted_at IS NULL
  ),
  xp_totals AS (
    SELECT gs.id AS student_id,
           COALESCE(SUM(u.xp_delta), 0)::bigint AS xp_total
    FROM group_students gs
    LEFT JOIN public.unified_activity_log u
      ON u.student_id = gs.id AND u.occurred_at >= v_from
    GROUP BY gs.id
  )
  SELECT gs.id, gs.display_name, gs.avatar_url,
         xt.xp_total,
         DENSE_RANK() OVER (ORDER BY xt.xp_total DESC)::int AS rank
  FROM group_students gs
  JOIN xp_totals xt ON xt.student_id = gs.id
  ORDER BY xt.xp_total DESC, gs.display_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_leaderboard(uuid, text) TO authenticated;


-- ─── PHASE 5: RLS Policies ──────────────────────────────

ALTER TABLE public.unified_activity_log ENABLE ROW LEVEL SECURITY;

-- Students read only their own activity
DROP POLICY IF EXISTS ual_self_read ON public.unified_activity_log;
CREATE POLICY ual_self_read ON public.unified_activity_log
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Trainers read activity of their group students
DROP POLICY IF EXISTS ual_trainer_read ON public.unified_activity_log;
CREATE POLICY ual_trainer_read ON public.unified_activity_log
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students st
    JOIN public.groups g ON g.id = st.group_id
    WHERE st.id = unified_activity_log.student_id
      AND g.trainer_id = auth.uid()
  ));

-- Admins read all
DROP POLICY IF EXISTS ual_admin_read ON public.unified_activity_log;
CREATE POLICY ual_admin_read ON public.unified_activity_log
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- NO client-side INSERT/UPDATE/DELETE — writes go through log_activity() RPC only


ALTER TABLE public.student_skill_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sss_self_read ON public.student_skill_state;
CREATE POLICY sss_self_read ON public.student_skill_state
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS sss_trainer_read ON public.student_skill_state;
CREATE POLICY sss_trainer_read ON public.student_skill_state
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students st
    JOIN public.groups g ON g.id = st.group_id
    WHERE st.id = student_skill_state.student_id
      AND g.trainer_id = auth.uid()
  ));

DROP POLICY IF EXISTS sss_admin_read ON public.student_skill_state;
CREATE POLICY sss_admin_read ON public.student_skill_state
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));
