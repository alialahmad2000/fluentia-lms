-- ============================================================================
-- 149: Trainer Onboarding — tour state tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS trainer_onboarding (
  trainer_id        uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  tour_started_at   timestamptz,
  tour_completed_at timestamptz,
  tour_skipped_at   timestamptz,
  last_step         integer DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE trainer_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainer owns onboarding" ON trainer_onboarding
  FOR ALL USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Admin reads all onboarding" ON trainer_onboarding
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RPC: mark_tour_event — upsert + update by event type
CREATE OR REPLACE FUNCTION mark_tour_event(
  p_event text,
  p_step  integer DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_trainer_id uuid := auth.uid();
BEGIN
  INSERT INTO trainer_onboarding (trainer_id, last_step)
  VALUES (v_trainer_id, 0)
  ON CONFLICT (trainer_id) DO NOTHING;

  IF p_event = 'started' THEN
    UPDATE trainer_onboarding
    SET tour_started_at = COALESCE(tour_started_at, NOW()),
        updated_at = NOW()
    WHERE trainer_id = v_trainer_id;
  ELSIF p_event = 'step' AND p_step IS NOT NULL THEN
    UPDATE trainer_onboarding
    SET last_step = GREATEST(last_step, p_step),
        updated_at = NOW()
    WHERE trainer_id = v_trainer_id;
  ELSIF p_event = 'completed' THEN
    UPDATE trainer_onboarding
    SET tour_completed_at = NOW(),
        updated_at = NOW()
    WHERE trainer_id = v_trainer_id;
  ELSIF p_event = 'skipped' THEN
    UPDATE trainer_onboarding
    SET tour_skipped_at = NOW(),
        updated_at = NOW()
    WHERE trainer_id = v_trainer_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_tour_event(text, integer) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Migration 149 applied — trainer_onboarding + mark_tour_event ready';
END $$;
