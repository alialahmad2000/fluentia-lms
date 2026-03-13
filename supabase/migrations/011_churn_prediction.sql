-- 011: Churn Prediction System
-- AI-powered student churn risk analysis

CREATE TABLE IF NOT EXISTS churn_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  risk_score NUMERIC(5,2) NOT NULL, -- 0-100
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  factors JSONB DEFAULT '[]', -- [{factor, weight, description}]
  recommendations JSONB DEFAULT '[]', -- [{action, description, priority}]
  predicted_at TIMESTAMPTZ DEFAULT now(),
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_churn_predictions_student ON churn_predictions(student_id);
CREATE INDEX IF NOT EXISTS idx_churn_predictions_risk ON churn_predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_churn_predictions_date ON churn_predictions(predicted_at DESC);

ALTER TABLE churn_predictions ENABLE ROW LEVEL SECURITY;

-- Trainers can view predictions for their students
DO $$ BEGIN
CREATE POLICY trainers_view_churn ON churn_predictions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN groups g ON s.group_id = g.id
      WHERE s.id = churn_predictions.student_id
      AND g.trainer_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin full access
DO $$ BEGIN
CREATE POLICY admin_all_churn ON churn_predictions
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role insert/update
DO $$ BEGIN
CREATE POLICY service_insert_churn ON churn_predictions
  FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY service_update_churn ON churn_predictions
  FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
