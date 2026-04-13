const { Client } = require('pg');

const connConfig = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
};

async function run() {
  const client = new Client(connConfig);
  await client.connect();
  console.log('Connected to database');

  // Step 1: ALTER TYPE (must run outside transaction, one by one)
  const enumValues = ['duel_win', 'duel_loss', 'duel_draw', 'duel_daily_bonus'];
  for (const val of enumValues) {
    try {
      await client.query(`ALTER TYPE xp_reason ADD VALUE IF NOT EXISTS '${val}'`);
      console.log(`Enum: added '${val}'`);
    } catch (err) {
      console.log(`Enum: '${val}' — ${err.message}`);
    }
  }

  // Step 2: DDL — tables, indexes, RLS, policies, view, function
  const ddl = `
-- Matchmaking queue
CREATE TABLE IF NOT EXISTS duel_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  group_id uuid,
  team_id uuid,
  level int,
  game_type text NOT NULL,
  queued_at timestamptz DEFAULT now(),
  UNIQUE(student_id)
);

-- Duels
CREATE TABLE IF NOT EXISTS duels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type text NOT NULL,
  player_a uuid NOT NULL REFERENCES students(id),
  player_b uuid NOT NULL REFERENCES students(id),
  status text DEFAULT 'active',
  winner_id uuid,
  score_a int DEFAULT 0,
  score_b int DEFAULT 0,
  round_count int DEFAULT 10,
  current_round int DEFAULT 0,
  questions jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  finished_at timestamptz
);

-- Rounds
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

-- Stats
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

-- Indexes
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
  `;

  try {
    await client.query(ddl);
    console.log('Tables + indexes + RLS created');
  } catch (err) {
    console.error('DDL error:', err.message);
  }

  // Step 3: Policies (run individually — they fail on duplicate)
  const policies = [
    `CREATE POLICY "service_full_duel_queue" ON duel_queue FOR ALL USING (true) WITH CHECK (true)`,
    `CREATE POLICY "service_full_duels" ON duels FOR ALL USING (true) WITH CHECK (true)`,
    `CREATE POLICY "service_full_duel_rounds" ON duel_rounds FOR ALL USING (true) WITH CHECK (true)`,
    `CREATE POLICY "service_full_duel_stats" ON duel_stats FOR ALL USING (true) WITH CHECK (true)`,
    `CREATE POLICY "own_queue" ON duel_queue FOR SELECT TO authenticated USING (auth.uid() = student_id)`,
    `CREATE POLICY "own_duels" ON duels FOR SELECT TO authenticated USING (auth.uid() = player_a OR auth.uid() = player_b)`,
    `CREATE POLICY "own_rounds" ON duel_rounds FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM duels WHERE duels.id = duel_rounds.duel_id AND (duels.player_a = auth.uid() OR duels.player_b = auth.uid())))`,
    `CREATE POLICY "own_stats" ON duel_stats FOR SELECT TO authenticated USING (auth.uid() = student_id)`,
    `CREATE POLICY "read_all_stats_for_leaderboard" ON duel_stats FOR SELECT TO authenticated USING (true)`,
  ];

  for (const p of policies) {
    try {
      await client.query(p);
      console.log(`Policy OK: ${p.substring(15, 60)}`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`Policy SKIP: ${p.substring(15, 60)}`);
      } else {
        console.error(`Policy ERROR: ${err.message}`);
      }
    }
  }

  // Step 4: View
  try {
    await client.query(`
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
      ORDER BY ds.elo DESC
    `);
    console.log('View created: duel_leaderboard_weekly');
  } catch (err) {
    console.error('View error:', err.message);
  }

  // Step 5: Daily reset function
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION reset_duel_daily_counters()
      RETURNS void AS $$
        UPDATE duel_stats
        SET duels_today = 0, xp_lost_today = 0, last_daily_reset = CURRENT_DATE
        WHERE last_daily_reset IS NULL OR last_daily_reset < CURRENT_DATE;
      $$ LANGUAGE sql SECURITY DEFINER
    `);
    console.log('Function created: reset_duel_daily_counters');
  } catch (err) {
    console.error('Function error:', err.message);
  }

  // Verify
  const tables = ['duel_queue', 'duels', 'duel_rounds', 'duel_stats'];
  console.log('\n=== Verification ===');
  for (const t of tables) {
    const { rows } = await client.query(`SELECT COUNT(*) as c FROM ${t}`);
    console.log(`  ${t}: ${rows[0].c} rows`);
  }

  await client.end();
  console.log('\nMigration 114 complete!');
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
