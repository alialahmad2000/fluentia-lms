-- AI Coach B4: Conversational tutor — coach_conversations + coach_messages
-- Service role writes via edge function; students read-only via RLS.

BEGIN;

CREATE TABLE IF NOT EXISTS coach_conversations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id         uuid        NOT NULL,
  task_type       text        NOT NULL CHECK (task_type IN ('writing','speaking')),
  message_count   int         NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  total_cost_sar  numeric(10,4) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_conversation UNIQUE (student_id, task_id, task_type)
);

CREATE INDEX IF NOT EXISTS idx_conversations_student
  ON coach_conversations (student_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS coach_messages (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid        NOT NULL REFERENCES coach_conversations(id) ON DELETE CASCADE,
  role              text        NOT NULL CHECK (role IN ('user','assistant')),
  content           text        NOT NULL,
  input_tokens      int,
  output_tokens     int,
  cost_sar          numeric(10,4),
  draft_snapshot    text,  -- student's draft at time of message (user messages only)
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv
  ON coach_messages (conversation_id, created_at);

ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

-- Students can only read their own conversations
CREATE POLICY "students read own conversations"
  ON coach_conversations FOR SELECT
  USING (auth.uid() = student_id);

-- Students can only read messages belonging to their conversations
CREATE POLICY "students read own messages"
  ON coach_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_conversations c
      WHERE c.id = coach_messages.conversation_id
        AND c.student_id = auth.uid()
    )
  );

COMMIT;
