-- Recording health scan results — per-file diagnostics
CREATE TABLE IF NOT EXISTS public.recording_health (
  recording_id UUID PRIMARY KEY REFERENCES class_recordings(id) ON DELETE CASCADE,
  checked_at   TIMESTAMPTZ DEFAULT now(),
  status       TEXT NOT NULL DEFAULT 'PENDING', -- OK, NOT_PUBLIC, WEBM_FORMAT, UNRESOLVABLE, UNKNOWN_FORMAT, NO_RANGE_SUPPORT, WRONG_MIME
  drive_status INT,
  content_type TEXT,
  is_mp4       BOOLEAN,
  is_webm      BOOLEAN,
  bytes_status INT,
  first_bytes  TEXT,
  error_detail TEXT
);

-- RLS: admin/trainer can read, only service_role writes
ALTER TABLE public.recording_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and trainers can view recording health"
  ON public.recording_health FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer')
    )
  );
