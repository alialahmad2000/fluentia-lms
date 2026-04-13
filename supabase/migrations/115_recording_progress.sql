-- Migration 115: Recording progress tracking for premium player
-- Tracks student watch position, speed preference, and completion

CREATE TABLE IF NOT EXISTS recording_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recording_id uuid NOT NULL REFERENCES class_recordings(id) ON DELETE CASCADE,
  position real NOT NULL DEFAULT 0,          -- seconds
  watched_percent real NOT NULL DEFAULT 0,   -- 0-100
  speed real NOT NULL DEFAULT 1,             -- playback speed
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, recording_id)
);

CREATE INDEX idx_recording_progress_student ON recording_progress(student_id);
CREATE INDEX idx_recording_progress_recording ON recording_progress(recording_id);

ALTER TABLE recording_progress ENABLE ROW LEVEL SECURITY;

-- Students manage own progress
CREATE POLICY "own_recording_progress" ON recording_progress FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Staff can view all progress
CREATE POLICY "staff_view_recording_progress" ON recording_progress FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

-- Also add sort_order + duration_seconds to class_recordings if missing
ALTER TABLE class_recordings ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE class_recordings ADD COLUMN IF NOT EXISTS duration_seconds integer;
