BEGIN;

-- Enable RLS on all 7 tables
ALTER TABLE trainer_xp_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_streaks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_interventions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_daily_rituals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE nabih_conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nabih_messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_debriefs          ENABLE ROW LEVEL SECURITY;

-- Helper: is_admin (stable, no context switch)
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
$$;

-- ===== trainer_xp_events (append-only — no UPDATE/DELETE policy) =====
CREATE POLICY tr_xp_read_own ON trainer_xp_events FOR SELECT
  USING (trainer_id = auth.uid() OR is_admin());

CREATE POLICY tr_xp_insert_own ON trainer_xp_events FOR INSERT
  WITH CHECK (trainer_id = auth.uid() OR is_admin());

-- ===== trainer_streaks =====
CREATE POLICY tr_streaks_read_own ON trainer_streaks FOR SELECT
  USING (trainer_id = auth.uid() OR is_admin());

CREATE POLICY tr_streaks_upsert_own ON trainer_streaks FOR ALL
  USING (trainer_id = auth.uid() OR is_admin())
  WITH CHECK (trainer_id = auth.uid() OR is_admin());

-- ===== student_interventions =====
CREATE POLICY tr_interv_read_own ON student_interventions FOR SELECT
  USING (trainer_id = auth.uid() OR is_admin());

CREATE POLICY tr_interv_update_own ON student_interventions FOR UPDATE
  USING (trainer_id = auth.uid() OR is_admin())
  WITH CHECK (trainer_id = auth.uid() OR is_admin());

-- Insert only by admin / service role (signals engine uses service role)
CREATE POLICY tr_interv_insert_admin ON student_interventions FOR INSERT
  WITH CHECK (is_admin());

-- ===== trainer_daily_rituals =====
CREATE POLICY tr_rituals_all_own ON trainer_daily_rituals FOR ALL
  USING (trainer_id = auth.uid() OR is_admin())
  WITH CHECK (trainer_id = auth.uid() OR is_admin());

-- ===== nabih_conversations =====
CREATE POLICY tr_nabih_conv_all_own ON nabih_conversations FOR ALL
  USING (trainer_id = auth.uid() OR is_admin())
  WITH CHECK (trainer_id = auth.uid() OR is_admin());

-- ===== nabih_messages =====
CREATE POLICY tr_nabih_msg_read ON nabih_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM nabih_conversations c
    WHERE c.id = nabih_messages.conversation_id
      AND (c.trainer_id = auth.uid() OR is_admin())
  ));

CREATE POLICY tr_nabih_msg_insert ON nabih_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM nabih_conversations c
    WHERE c.id = nabih_messages.conversation_id
      AND (c.trainer_id = auth.uid() OR is_admin())
  ));

-- ===== class_debriefs =====
CREATE POLICY tr_debrief_all_own ON class_debriefs FOR ALL
  USING (trainer_id = auth.uid() OR is_admin())
  WITH CHECK (trainer_id = auth.uid() OR is_admin());

-- Students have ZERO access — no student policy on any of these tables.

COMMIT;
