-- Per-student preferred tier (learned from past success)
CREATE TABLE public.student_player_preference (
  student_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_tier INT DEFAULT 1,
  device_type TEXT,
  consecutive_tier1_failures INT DEFAULT 0,
  last_successful_tier INT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE student_player_preference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pref_own" ON student_player_preference FOR ALL TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY "pref_admin_read" ON student_player_preference FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));


-- Per-recording aggregated tier success stats
CREATE TABLE public.recording_tier_stats (
  recording_id UUID PRIMARY KEY REFERENCES class_recordings(id) ON DELETE CASCADE,
  tier1_success_rate NUMERIC(5,2) DEFAULT 100,
  tier2_success_rate NUMERIC(5,2) DEFAULT 100,
  recommended_starting_tier INT DEFAULT 1,
  total_attempts INT DEFAULT 0,
  last_computed TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE recording_tier_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stats_read_all" ON recording_tier_stats FOR SELECT TO authenticated USING (true);

CREATE POLICY "stats_admin_write" ON recording_tier_stats FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));


-- RPC: increment tier1 failures & auto-bump preferred tier after 3 consecutive failures
CREATE OR REPLACE FUNCTION increment_student_tier1_failures(uid UUID) RETURNS void AS $$
  INSERT INTO student_player_preference (student_id, consecutive_tier1_failures)
  VALUES (uid, 1)
  ON CONFLICT (student_id) DO UPDATE
  SET consecutive_tier1_failures = student_player_preference.consecutive_tier1_failures + 1,
      preferred_tier = CASE
        WHEN student_player_preference.consecutive_tier1_failures + 1 >= 3 THEN 2
        ELSE student_player_preference.preferred_tier
      END,
      updated_at = now();
$$ LANGUAGE sql SECURITY DEFINER;


-- RPC: bump student preferred tier after repeated success on a higher tier
CREATE OR REPLACE FUNCTION maybe_bump_student_preferred_tier(uid UUID, tier INT) RETURNS void AS $$
  UPDATE student_player_preference
  SET preferred_tier = tier, updated_at = now()
  WHERE student_id = uid AND last_successful_tier = tier;
$$ LANGUAGE sql SECURITY DEFINER;


-- RPC: recompute recording tier stats from fallback events (last 30 days)
CREATE OR REPLACE FUNCTION compute_recording_tier_stats() RETURNS void AS $$
BEGIN
  INSERT INTO recording_tier_stats (recording_id, tier1_success_rate, tier2_success_rate, recommended_starting_tier, total_attempts, last_computed)
  SELECT
    recording_id,
    GREATEST(0, 100 - (SUM(CASE WHEN tier_used >= 2 THEN 1 ELSE 0 END) * 100.0 / GREATEST(COUNT(*), 1))) AS tier1_rate,
    GREATEST(0, 100 - (SUM(CASE WHEN tier_used >= 3 THEN 1 ELSE 0 END) * 100.0 / GREATEST(COUNT(*), 1))) AS tier2_rate,
    CASE
      WHEN SUM(CASE WHEN tier_used >= 3 THEN 1 ELSE 0 END) * 2 > COUNT(*) THEN 3
      WHEN SUM(CASE WHEN tier_used >= 2 THEN 1 ELSE 0 END) * 2 > COUNT(*) THEN 2
      ELSE 1
    END AS recommended_tier,
    COUNT(*)::INT,
    now()
  FROM recording_fallback_events
  WHERE occurred_at > now() - interval '30 days'
  GROUP BY recording_id
  ON CONFLICT (recording_id) DO UPDATE SET
    tier1_success_rate = EXCLUDED.tier1_success_rate,
    tier2_success_rate = EXCLUDED.tier2_success_rate,
    recommended_starting_tier = EXCLUDED.recommended_starting_tier,
    total_attempts = EXCLUDED.total_attempts,
    last_computed = EXCLUDED.last_computed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
