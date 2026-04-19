const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

async function q(label, sql) {
  console.log(`\n=== ${label} ===`);
  try {
    const { rows } = await pool.query(sql);
    if (rows.length === 0) { console.log('(no rows)'); return rows; }
    console.table(rows);
    return rows;
  } catch (e) { console.error(`ERROR: ${e.message}`); return []; }
}

async function main() {
  // PHASE 1.1 — Full per-level telemetry
  await q('1.1 CEFR + Tier distribution per level', `
    SELECT l.level_number AS level,
           COUNT(DISTINCT LOWER(v.word)) AS unique_words,
           COUNT(v.id) AS total_entries,
           COUNT(*) FILTER (WHERE v.tier='core') AS core,
           COUNT(*) FILTER (WHERE v.tier='extended') AS extended,
           COUNT(*) FILTER (WHERE v.tier='mastery') AS mastery,
           COUNT(*) FILTER (WHERE v.cefr_level='A1') AS "A1",
           COUNT(*) FILTER (WHERE v.cefr_level='A2') AS "A2",
           COUNT(*) FILTER (WHERE v.cefr_level='B1') AS "B1",
           COUNT(*) FILTER (WHERE v.cefr_level='B2') AS "B2",
           COUNT(*) FILTER (WHERE v.cefr_level='C1') AS "C1",
           COUNT(*) FILTER (WHERE v.cefr_level='C2') AS "C2",
           COUNT(*) FILTER (WHERE v.tier IS NULL) AS null_tier,
           COUNT(*) FILTER (WHERE v.cefr_level IS NULL) AS null_cefr
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    GROUP BY l.level_number
    ORDER BY l.level_number
  `);

  // PHASE 1.5 — Readings + Passages per level
  await q('1.5a Readings per level', `
    SELECT l.level_number AS level, COUNT(*) AS readings
    FROM curriculum_readings r
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    GROUP BY l.level_number ORDER BY l.level_number
  `);

  await q('1.5b Passages per level', `
    SELECT l.level_number AS level, COUNT(*) AS passages
    FROM curriculum_reading_passages p
    JOIN curriculum_readings r ON r.id = p.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    GROUP BY l.level_number ORDER BY l.level_number
  `);

  // PHASE 1.3 — L5 C1 sample (30 words)
  await q('1.3 L5 C1 sample (30 random)', `
    SELECT v.word, v.cefr_level, v.tier, v.pos, v.meaning_ar, v.source_list
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE l.level_number = 5 AND v.cefr_level = 'C1'
    ORDER BY random() LIMIT 30
  `);

  // PHASE 2.2 — Red flag scans
  await q('2.2a Short Arabic meanings (<3 chars)', `
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary
    WHERE LENGTH(meaning_ar) < 3
  `);

  await q('2.2b Identical EN=AR', `
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary
    WHERE LOWER(word) = LOWER(meaning_ar)
  `);

  await q('2.2c Arabic with English letters (4+)', `
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary
    WHERE meaning_ar ~ '[a-zA-Z]{4,}'
  `);

  await q('2.2d Example sentence = word', `
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary
    WHERE LOWER(example_sentence_en) = LOWER(word)
  `);

  await q('2.2e Example missing the word (sample 20)', `
    SELECT v.id, v.word, LEFT(v.example_sentence_en, 80) AS example_start,
           l.level_number AS level
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE LOWER(v.example_sentence_en) NOT LIKE '%' || LOWER(v.word) || '%'
      AND v.example_sentence_en IS NOT NULL AND v.example_sentence_en != ''
    LIMIT 20
  `);

  await q('2.2e-count Example missing the word (total)', `
    SELECT COUNT(*) AS cnt
    FROM curriculum_vocabulary v
    WHERE LOWER(v.example_sentence_en) NOT LIKE '%' || LOWER(v.word) || '%'
      AND v.example_sentence_en IS NOT NULL AND v.example_sentence_en != ''
  `);

  await q('2.2f Empty example_ar', `
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary
    WHERE example_sentence_ar IS NULL OR TRIM(example_sentence_ar) = ''
  `);

  await q('2.2g Empty meaning_ar', `
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary
    WHERE meaning_ar IS NULL OR TRIM(meaning_ar) = ''
  `);

  // PHASE 4.1 — Staging tables
  await q('4.1 Staging tables', `
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE '%staging%'
  `);

  // PHASE 4.2 — Orphaned vocab
  await q('4.2 Orphaned vocab (reading_id → nonexistent reading)', `
    SELECT COUNT(*) AS orphans FROM curriculum_vocabulary v
    LEFT JOIN curriculum_readings r ON r.id = v.reading_id
    WHERE r.id IS NULL
  `);

  // PHASE 4.3 — Duplicates
  await q('4.3 Duplicate words per reading', `
    SELECT reading_id, LOWER(word) AS word, COUNT(*) AS cnt
    FROM curriculum_vocabulary
    GROUP BY reading_id, LOWER(word)
    HAVING COUNT(*) > 1
    LIMIT 20
  `);

  // PHASE 4.4 — RLS on LEGENDARY tables
  await q('4.4 RLS status', `
    SELECT tablename, rowsecurity FROM pg_tables
    WHERE schemaname='public'
      AND tablename IN (
        'unified_activity_log','student_skill_state',
        'curriculum_vocabulary','student_saved_words',
        'curriculum_units','curriculum_readings','curriculum_reading_passages'
      )
  `);

  await q('4.4b RLS policies', `
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname='public' AND tablename IN (
      'unified_activity_log','student_skill_state',
      'curriculum_vocabulary','student_saved_words',
      'curriculum_units','curriculum_readings','curriculum_reading_passages'
    )
    ORDER BY tablename, policyname
  `);

  // PHASE 4.5 — RPC catalog
  await q('4.5 RPC catalog', `
    SELECT p.proname AS fn, l.lanname AS lang,
           pg_get_function_arguments(p.oid) AS args,
           pg_get_function_result(p.oid) AS returns,
           p.prosecdef AS security_definer
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'log_activity','get_student_xp','get_student_streak','get_skill_radar',
        'get_group_leaderboard','get_level_leaderboard','get_academy_leaderboard',
        'get_team_rank','srs_review_word','srs_get_due','srs_get_counts'
      )
    ORDER BY p.proname
  `);

  // PHASE 4.6 — Columns with 100% NULL
  await q('4.6 curriculum_vocabulary columns', `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='curriculum_vocabulary'
    ORDER BY ordinal_position
  `);

  // PHASE 5.1 — Active students with activity
  await q('5.1 Active students event counts', `
    SELECT p.id, p.full_name,
           (SELECT COUNT(*) FROM unified_activity_log WHERE student_id = p.id) AS events,
           (SELECT COALESCE(SUM(xp_delta),0) FROM unified_activity_log WHERE student_id = p.id) AS total_xp
    FROM profiles p
    JOIN students s ON s.id = p.id
    WHERE p.role = 'student'
    ORDER BY events DESC
    LIMIT 30
  `);

  // PHASE 5.2 — Groups with trainers
  await q('5.2 Groups + trainers', `
    SELECT g.id, g.name, g.trainer_id,
           (SELECT COUNT(*) FROM students s WHERE s.group_id = g.id) AS students
    FROM groups g
    WHERE EXISTS (SELECT 1 FROM students s WHERE s.group_id = g.id)
  `);

  // PHASE 5.3 — SRS baseline
  await q('5.3 SRS engagement baseline', `
    SELECT COUNT(DISTINCT student_id) AS students_with_saved,
           COUNT(*) AS total_saved,
           COUNT(*) FILTER (WHERE mastered_at IS NOT NULL) AS mastered,
           COUNT(*) FILTER (WHERE next_review_at <= now()) AS currently_due,
           ROUND(AVG(review_count)::numeric, 2) AS avg_reviews
    FROM student_saved_words
  `);

  await pool.end();
  console.log('\n=== AUDIT COMPLETE ===');
}

main().catch(e => { console.error(e); process.exit(1); });
