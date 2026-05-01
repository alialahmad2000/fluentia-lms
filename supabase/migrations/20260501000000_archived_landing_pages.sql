-- Archive snapshots of landing page versions
-- Each row preserves the complete state of a landing page before replacement

CREATE TABLE IF NOT EXISTS archived_landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_label TEXT NOT NULL UNIQUE,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  git_commit_sha TEXT NOT NULL,
  git_tag TEXT,
  git_branch TEXT,
  rendered_html TEXT NOT NULL,
  source_jsx TEXT NOT NULL,
  packages_snapshot JSONB NOT NULL,
  copy_snapshot JSONB NOT NULL,
  notes TEXT
);

ALTER TABLE archived_landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read archives" ON archived_landing_pages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role full access" ON archived_landing_pages
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE archived_landing_pages IS 'Frozen snapshots of landing page versions for permanent retrieval';
