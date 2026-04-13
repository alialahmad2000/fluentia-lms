-- Migration 116: Chapters, personal bookmarks, timestamped notes for recordings

-- Chapters (admin/trainer authored)
CREATE TABLE IF NOT EXISTS recording_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES class_recordings(id) ON DELETE CASCADE,
  start_seconds INT NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_chapters_rec ON recording_chapters(recording_id, start_seconds);

-- Personal bookmarks (student)
CREATE TABLE IF NOT EXISTS recording_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recording_id UUID NOT NULL REFERENCES class_recordings(id) ON DELETE CASCADE,
  position_seconds INT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_bookmarks_student_rec ON recording_bookmarks(student_id, recording_id, position_seconds);

-- Timestamped notes (student)
CREATE TABLE IF NOT EXISTS recording_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recording_id UUID NOT NULL REFERENCES class_recordings(id) ON DELETE CASCADE,
  position_seconds INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notes_student_rec ON recording_notes(student_id, recording_id, position_seconds);

-- RLS
ALTER TABLE recording_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_notes ENABLE ROW LEVEL SECURITY;

-- Chapters: all authenticated read, admin/trainer write
CREATE POLICY "chapters_read_all" ON recording_chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "chapters_staff_write" ON recording_chapters FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

-- Bookmarks + Notes: own only
CREATE POLICY "bookmarks_own" ON recording_bookmarks FOR ALL TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "notes_own" ON recording_notes FOR ALL TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
