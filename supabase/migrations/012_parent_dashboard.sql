-- 012: Parent/Sponsor Dashboard
-- Links parents/sponsors to students for read-only progress viewing

CREATE TABLE IF NOT EXISTS parent_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  parent_email TEXT NOT NULL,
  parent_name TEXT,
  access_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_parent_links_student ON parent_links(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_code ON parent_links(access_code);
CREATE INDEX IF NOT EXISTS idx_parent_links_email ON parent_links(parent_email);

ALTER TABLE parent_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY admin_all_parent_links ON parent_links
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY trainer_view_parent_links ON parent_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s JOIN groups g ON s.group_id = g.id
      WHERE s.id = parent_links.student_id AND g.trainer_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY service_manage_parent_links ON parent_links
  FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
