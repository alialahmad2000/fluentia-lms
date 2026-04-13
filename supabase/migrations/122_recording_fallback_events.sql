-- Recording fallback event tracking — logs when students hit tier 2/3 fallback
CREATE TABLE IF NOT EXISTS public.recording_fallback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES class_recordings(id) ON DELETE CASCADE,
  student_id UUID,
  tier_used INT NOT NULL,
  reason TEXT,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fallback_recording ON recording_fallback_events(recording_id, occurred_at DESC);

ALTER TABLE recording_fallback_events ENABLE ROW LEVEL SECURITY;

-- Students can insert their own fallback events
CREATE POLICY "fallback_insert_own" ON recording_fallback_events FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Admin can read all fallback events
CREATE POLICY "fallback_admin_read" ON recording_fallback_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
