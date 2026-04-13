-- 114: Duels system — matchmaking, duels, rounds, stats, leaderboard
-- Tables: duel_queue, duels, duel_rounds, duel_stats
-- View: duel_leaderboard_weekly

-- Add duel XP reasons to existing enum
ALTER TYPE xp_reason ADD VALUE IF NOT EXISTS 'duel_win';
ALTER TYPE xp_reason ADD VALUE IF NOT EXISTS 'duel_loss';
ALTER TYPE xp_reason ADD VALUE IF NOT EXISTS 'duel_draw';
ALTER TYPE xp_reason ADD VALUE IF NOT EXISTS 'duel_daily_bonus';

-- Matchmaking queue
CREATE TABLE IF NOT EXISTS duel_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  group_id uuid,
  team_id uuid,
  level int,
  game_type text NOT NULL,  -- 'vocab_sprint' | 'irregular_verbs' | 'grammar_clash' | 'sentence_builder' | 'listening_lightning'
  queued_at timestamptz DEFAULT now(),
  UNIQUE(student_id)
);

-- Duels
CREATE TABLE IF NOT EXISTS duels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type text NOT NULL,
  player_a uuid NOT NULL REFERENCES students(id),
  player_b uuid NOT NULL REFERENCES students(id),
  status text DEFAULT 'active',  -- 'active' | 'finished' | 'abandoned'
  winner_id uuid,
  score_a int DEFAULT 0,
  score_b int DEFAULT 0,
  round_count int DEFAULT 10,
  current_round int DEFAULT 0,
  questions jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  finished_at timestamptz
);

-- Rounds (one row per player per round answer)
CREATE TABLE IF NOT EXISTS duel_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id uuid NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  round_number int NOT NULL,
  player_id uuid NOT NULL REFERENCES students(id),
  answer text,
  is_correct boolean,
  response_ms int,
  points_earned int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Duel stats per student
CREATE TABLE IF NOT EXISTS duel_stats (
  student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  wins int DEFAULT 0,
  losses int DEFAULT 0,
  draws int DEFAULT 0,
  elo int DEFAULT 1000,
  current_streak int DEFAULT 0,
  best_streak int DEFAULT 0,
  duels_today int DEFAULT 0,
  xp_lost_today int DEFAULT 0,
  last_duel_at timestamptz,
  duels_grace_remaining int DEFAULT 10,
  last_daily_reset date
);

-- Index for matchmaking queries
CREATE INDEX IF NOT EXISTS idx_duel_queue_game_type ON duel_queue(game_type);
CREATE INDEX IF NOT EXISTS idx_duel_queue_queued_at ON duel_queue(queued_at);
CREATE INDEX IF NOT EXISTS idx_duels_status ON duels(status);
CREATE INDEX IF NOT EXISTS idx_duels_players ON duels(player_a, player_b);
CREATE INDEX IF NOT EXISTS idx_duel_rounds_duel ON duel_rounds(duel_id);

-- RLS
ALTER TABLE duel_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_stats ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_full_duel_queue" ON duel_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_full_duels" ON duels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_full_duel_rounds" ON duel_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_full_duel_stats" ON duel_stats FOR ALL USING (true) WITH CHECK (true);

-- Authenticated read-only for own data
CREATE POLICY "own_queue" ON duel_queue FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "own_duels" ON duels FOR SELECT TO authenticated USING (auth.uid() = player_a OR auth.uid() = player_b);
CREATE POLICY "own_rounds" ON duel_rounds FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM duels WHERE duels.id = duel_rounds.duel_id AND (duels.player_a = auth.uid() OR duels.player_b = auth.uid())));
CREATE POLICY "own_stats" ON duel_stats FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- All students can read leaderboard stats (for leaderboard display)
CREATE POLICY "read_all_stats_for_leaderboard" ON duel_stats FOR SELECT TO authenticated USING (true);

-- Weekly leaderboard view (per group)
CREATE OR REPLACE VIEW duel_leaderboard_weekly AS
SELECT
  s.id,
  p.full_name,
  s.group_id,
  ds.wins,
  ds.losses,
  ds.elo,
  ds.current_streak,
  ds.best_streak
FROM duel_stats ds
JOIN students s ON s.id = ds.student_id
JOIN profiles p ON p.id = ds.student_id
WHERE ds.last_duel_at > now() - interval '7 days'
ORDER BY ds.elo DESC;

-- Function to reset daily duel counters (called by cron or on first duel of day)
CREATE OR REPLACE FUNCTION reset_duel_daily_counters()
RETURNS void AS $$
  UPDATE duel_stats
  SET duels_today = 0, xp_lost_today = 0, last_daily_reset = CURRENT_DATE
  WHERE last_daily_reset IS NULL OR last_daily_reset < CURRENT_DATE;
$$ LANGUAGE sql SECURITY DEFINER;
