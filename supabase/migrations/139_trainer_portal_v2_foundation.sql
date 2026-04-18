BEGIN;

-- ====================================================================
-- 1. trainer_xp_events — every XP gain for a trainer
-- ====================================================================
CREATE TABLE IF NOT EXISTS trainer_xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  amount int NOT NULL CHECK (amount >= 0),
  multiplier numeric(3,2) NOT NULL DEFAULT 1.0,
  final_amount int NOT NULL GENERATED ALWAYS AS (CAST(ROUND(amount * multiplier) AS int)) STORED,
  context jsonb NOT NULL DEFAULT '{}',
  day_of date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Riyadh')::date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tr_xp_trainer_day ON trainer_xp_events(trainer_id, day_of DESC);
CREATE INDEX IF NOT EXISTS idx_tr_xp_type ON trainer_xp_events(trainer_id, event_type);
CREATE INDEX IF NOT EXISTS idx_tr_xp_context_student ON trainer_xp_events((context->>'student_id'));

COMMENT ON COLUMN trainer_xp_events.event_type IS
  'morning_ritual | evening_ritual | grading_fast | grading_quality | class_prep |
   class_debrief | intervention_silent | intervention_support | student_renewed |
   student_leveled_up | student_achievement | satisfaction_5star | nabih_consulted |
   streak_milestone_7 | streak_milestone_30 | custom';

-- ====================================================================
-- 2. trainer_streaks — daily streak tracking
-- ====================================================================
CREATE TABLE IF NOT EXISTS trainer_streaks (
  trainer_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_active_day date,
  multiplier numeric(3,2) NOT NULL DEFAULT 1.0,
  milestone_7_hit_at timestamptz,
  milestone_30_hit_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ====================================================================
-- 3. student_interventions — AI-prioritized queue
-- ====================================================================
CREATE TABLE IF NOT EXISTS student_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  severity text NOT NULL CHECK (severity IN ('urgent', 'attention', 'celebrate')),
  reason_code text NOT NULL,
  reason_ar text NOT NULL,
  signal_data jsonb NOT NULL DEFAULT '{}',
  suggested_action_ar text,
  suggested_message_ar text,
  generated_by text NOT NULL DEFAULT 'signals_engine',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'acted', 'snoozed', 'dismissed', 'expired')),
  snoozed_until timestamptz,
  acted_at timestamptz,
  acted_notes text,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  day_of date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Riyadh')::date
);

-- Unique: one intervention per student+reason per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_intervention_unique_day
  ON student_interventions(student_id, reason_code, day_of);

CREATE INDEX IF NOT EXISTS idx_intervention_trainer_status
  ON student_interventions(trainer_id, status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intervention_student
  ON student_interventions(student_id, status);
CREATE INDEX IF NOT EXISTS idx_intervention_active
  ON student_interventions(trainer_id)
  WHERE status = 'pending';

-- ====================================================================
-- 4. trainer_daily_rituals — morning/evening ritual tracking
-- ====================================================================
CREATE TABLE IF NOT EXISTS trainer_daily_rituals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Riyadh')::date,
  morning_completed_at timestamptz,
  evening_completed_at timestamptz,
  classes_prepared int NOT NULL DEFAULT 0,
  debriefs_completed int NOT NULL DEFAULT 0,
  notes text,
  UNIQUE(trainer_id, day_of)
);

CREATE INDEX IF NOT EXISTS idx_ritual_trainer_day ON trainer_daily_rituals(trainer_id, day_of DESC);

-- ====================================================================
-- 5. nabih_conversations + messages — AI coach (نبيه) chat
-- ====================================================================
CREATE TABLE IF NOT EXISTS nabih_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  context_type text CHECK (context_type IN (
    'morning_briefing', 'pre_class', 'grading', 'post_class', 'general', 'intervention_drafting'
  )),
  context_data jsonb NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  archived boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_nabih_conv_trainer
  ON nabih_conversations(trainer_id, last_message_at DESC)
  WHERE archived = false;

CREATE TABLE IF NOT EXISTS nabih_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES nabih_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('trainer', 'nabih', 'system')),
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  was_helpful boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nabih_msg_conv ON nabih_messages(conversation_id, created_at);

-- ====================================================================
-- 6. class_debriefs — post-class reflection
-- ====================================================================
CREATE TABLE IF NOT EXISTS class_debriefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  class_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Riyadh')::date,
  class_quality int CHECK (class_quality BETWEEN 1 AND 5),
  standout_student_ids uuid[] NOT NULL DEFAULT '{}',
  struggling_student_ids uuid[] NOT NULL DEFAULT '{}',
  next_class_focus text,
  trainer_notes text,
  ai_summary text,
  ai_summary_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debrief_trainer ON class_debriefs(trainer_id, class_date DESC);
CREATE INDEX IF NOT EXISTS idx_debrief_group ON class_debriefs(group_id, class_date DESC);

-- ====================================================================
-- ROWCOUNT ASSERTION
-- ====================================================================
DO $$
DECLARE
  t_count int;
BEGIN
  SELECT count(*) INTO t_count FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'trainer_xp_events', 'trainer_streaks', 'student_interventions',
      'trainer_daily_rituals', 'nabih_conversations', 'nabih_messages', 'class_debriefs'
    );
  IF t_count <> 7 THEN
    RAISE EXCEPTION 'Expected 7 tables created, got %', t_count;
  END IF;
END $$;

COMMIT;
