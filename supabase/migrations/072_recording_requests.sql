-- Recording request system: students request missing recordings
CREATE TABLE IF NOT EXISTS recording_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  group_id UUID NOT NULL REFERENCES groups(id),
  unit_id UUID NOT NULL REFERENCES curriculum_units(id),
  part TEXT NOT NULL CHECK (part IN ('a', 'b')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'dismissed')),
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent spam: one pending request per student per unit per part
CREATE UNIQUE INDEX idx_recording_requests_unique
  ON recording_requests(student_id, unit_id, part)
  WHERE status = 'pending';

ALTER TABLE recording_requests ENABLE ROW LEVEL SECURITY;

-- Students can insert requests for their group
CREATE POLICY "students_insert_recording_requests"
  ON recording_requests FOR INSERT
  WITH CHECK (
    student_id = auth.uid() AND
    group_id IN (
      SELECT group_id FROM students WHERE id = auth.uid() AND status = 'active'
    )
  );

-- Students can view their own requests
CREATE POLICY "students_view_own_requests"
  ON recording_requests FOR SELECT
  USING (student_id = auth.uid());

-- Trainers can view requests for their groups
CREATE POLICY "trainers_view_group_requests"
  ON recording_requests FOR SELECT
  USING (
    group_id IN (SELECT id FROM groups WHERE trainer_id = auth.uid())
  );

-- Trainers can update request status for their groups
CREATE POLICY "trainers_update_group_requests"
  ON recording_requests FOR UPDATE
  USING (
    group_id IN (SELECT id FROM groups WHERE trainer_id = auth.uid())
  );

-- Admin full access
CREATE POLICY "admin_full_access_recording_requests"
  ON recording_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
