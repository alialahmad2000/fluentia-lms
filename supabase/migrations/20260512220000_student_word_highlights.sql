-- Student word highlights (Kindle-style per-word color marking)
CREATE TABLE IF NOT EXISTS public.student_word_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('reading','listening')),
  segment_index int NOT NULL DEFAULT 0,
  word_index_start int NOT NULL,
  word_index_end int NOT NULL,
  word_text text NOT NULL,
  color text NOT NULL CHECK (color IN ('yellow','green','pink','blue','purple')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT highlights_word_range CHECK (word_index_end >= word_index_start)
);

CREATE INDEX IF NOT EXISTS idx_swh_lookup
  ON student_word_highlights(student_id, content_id, content_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_swh_student_recent
  ON student_word_highlights(student_id, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE student_word_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students see own highlights"
  ON student_word_highlights FOR SELECT TO authenticated
  USING (auth.uid() = student_id AND deleted_at IS NULL);

CREATE POLICY "Students insert own highlights"
  ON student_word_highlights FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students update own highlights"
  ON student_word_highlights FOR UPDATE TO authenticated
  USING (auth.uid() = student_id);

CREATE OR REPLACE FUNCTION update_swh_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER swh_updated_at
  BEFORE UPDATE ON student_word_highlights
  FOR EACH ROW EXECUTE FUNCTION update_swh_updated_at();
