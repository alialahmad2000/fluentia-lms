const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, select) {
  let all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(offset, offset + 999);
    if (error) { console.error(`Error fetching ${table}:`, error); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

(async () => {
  // Simple counts
  const countTables = ['curriculum_vocabulary', 'curriculum_writing', 'curriculum_speaking', 'xp_transactions', 'student_curriculum_progress', 'profiles'];
  const counts = {};
  for (const t of countTables) {
    const { count } = await supabase.from(t).select('id', { count: 'exact', head: true });
    counts[t] = count;
    console.log(`${t}: ${count}`);
  }

  // Get levels, units
  const levels = await fetchAll('curriculum_levels', 'id, level_number');
  const units = await fetchAll('curriculum_units', 'id, level_id, unit_number');
  const readings = await fetchAll('curriculum_readings', 'id, unit_id, reading_label, title_en');
  const questions = await fetchAll('curriculum_comprehension_questions', 'id, reading_id');

  console.log(`\nFetched: ${levels.length} levels, ${units.length} units, ${readings.length} readings, ${questions.length} questions`);

  // Build maps
  const levelMap = {};
  for (const l of levels) levelMap[l.id] = l.level_number;
  const unitLevelMap = {};
  for (const u of units) unitLevelMap[u.id] = levelMap[u.level_id];

  // Readings by level
  const readingsByLevel = {};
  for (const r of readings) {
    const lvl = unitLevelMap[r.unit_id];
    if (lvl === undefined) continue;
    readingsByLevel[lvl] = (readingsByLevel[lvl] || 0) + 1;
  }
  console.log('Readings by level:', JSON.stringify(readingsByLevel));

  // Questions by level
  const readingLevelMap = {};
  for (const r of readings) readingLevelMap[r.id] = unitLevelMap[r.unit_id];

  const questionsByLevel = {};
  for (const q of questions) {
    const lvl = readingLevelMap[q.reading_id];
    if (lvl === undefined) continue;
    questionsByLevel[lvl] = (questionsByLevel[lvl] || 0) + 1;
  }
  console.log('Questions by level:', JSON.stringify(questionsByLevel));

  // L1 completions
  const l1ReadingIds = readings
    .filter(r => unitLevelMap[r.unit_id] === 1)
    .map(r => r.id);

  const { data: l1Completions } = await supabase
    .from('student_curriculum_progress')
    .select('id, profile_id, reading_id, score, xp_earned, completed_at, status, answers')
    .in('reading_id', l1ReadingIds)
    .eq('status', 'completed')
    .order('completed_at');

  console.log(`\nL1 completed progress rows: ${(l1Completions || []).length}`);
  for (const c of (l1Completions || [])) {
    console.log(`  ${c.id} | profile=${c.profile_id} | score=${c.score} | xp=${c.xp_earned} | ${c.completed_at}`);
  }

  // L0 completions too (for reference)
  const l0ReadingIds = readings
    .filter(r => unitLevelMap[r.unit_id] === 0)
    .map(r => r.id);

  const { data: l0Completions } = await supabase
    .from('student_curriculum_progress')
    .select('id, profile_id, reading_id, score, xp_earned, completed_at, status')
    .in('reading_id', l0ReadingIds)
    .eq('status', 'completed')
    .order('completed_at');

  console.log(`L0 completed progress rows: ${(l0Completions || []).length}`);

  // Save baseline
  const baseline = {
    ...counts,
    readings_by_level: readingsByLevel,
    questions_by_level: questionsByLevel,
    total_readings: readings.length,
    total_questions: questions.length,
    l1_completions: l1Completions || [],
    l0_completions_count: (l0Completions || []).length,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync('PHASE-2-CLEANUP/14-v2-baseline.json', JSON.stringify(baseline, null, 2));
  console.log('\nBaseline saved to PHASE-2-CLEANUP/14-v2-baseline.json');
})();
