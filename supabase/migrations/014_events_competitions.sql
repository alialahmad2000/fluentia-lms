-- 014: Seasonal Events + Group Competitions

-- Seasonal events
CREATE TABLE seasonal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('seasonal', 'competition', 'challenge', 'special')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  rules JSONB,
  rewards JSONB, -- {xp, badge, title}
  banner_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Event participation
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES seasonal_events(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  score NUMERIC(10,2) DEFAULT 0,
  rank INTEGER,
  data JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, student_id),
  UNIQUE(event_id, group_id)
);

CREATE INDEX idx_seasonal_events_active ON seasonal_events(is_active, end_date);
CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_student ON event_participants(student_id);

ALTER TABLE seasonal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Everyone can view events
DO $$ BEGIN CREATE POLICY everyone_view_events ON seasonal_events FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_manage_events ON seasonal_events FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY service_manage_events ON seasonal_events FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Participants
DO $$ BEGIN CREATE POLICY everyone_view_participants ON event_participants FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY students_join_events ON event_participants FOR INSERT WITH CHECK (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY service_manage_participants ON event_participants FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY admin_manage_participants ON event_participants FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
