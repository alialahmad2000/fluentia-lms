const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const origQuestions = require('../PHASE-2-CLEANUP/rollback-staging/l0_l1_questions_original.json');
const origPassages = require('../PHASE-2-CLEANUP/rollback-staging/l0_l1_passages_original.json');

(async () => {
  console.log('=== POST-MIGRATION VERIFICATION ===\n');

  // 1. Spot-check 3 questions
  console.log('Question content checks:');
  const qSamples = [origQuestions[0], origQuestions[60], origQuestions[200]];
  for (const orig of qSamples) {
    const { data } = await supabase.from('curriculum_comprehension_questions')
      .select('question_en, choices, correct_answer').eq('id', orig.id).single();
    const match = data.question_en === orig.question_en && data.correct_answer === orig.correct_answer;
    console.log('  Q', orig.id.substring(0, 8), match ? 'MATCH' : 'MISMATCH',
      '- "' + data.question_en.substring(0, 50) + '..."');
  }

  // 2. Spot-check 3 passages
  console.log('\nPassage content checks:');
  const pSamples = [origPassages[0], origPassages[20], origPassages[40]];
  for (const orig of pSamples) {
    const { data } = await supabase.from('curriculum_readings')
      .select('title_en, passage_content').eq('id', orig.id).single();
    const match = data.title_en === orig.title_en;
    console.log('  P', orig.id.substring(0, 8), match ? 'MATCH' : 'MISMATCH',
      '- "' + data.title_en + '"');
  }

  // 3. L1 completion preservation
  const { data: levels } = await supabase.from('curriculum_levels').select('id, level_number');
  const { data: units } = await supabase.from('curriculum_units').select('id, level_id');
  const { data: readings } = await supabase.from('curriculum_readings').select('id, unit_id');

  const levelMap = {};
  for (const l of levels) levelMap[l.id] = l.level_number;
  const unitLevelMap = {};
  for (const u of units) unitLevelMap[u.id] = levelMap[u.level_id];
  const l1ReadingIds = readings.filter(r => unitLevelMap[r.unit_id] === 1).map(r => r.id);

  let allCompletions = [];
  for (let i = 0; i < l1ReadingIds.length; i += 10) {
    const batch = l1ReadingIds.slice(i, i + 10);
    const { data } = await supabase.from('student_curriculum_progress')
      .select('id, student_id, score, completed_at, answers_legacy, auto_migrated, migration_note')
      .in('reading_id', batch)
      .eq('status', 'completed');
    allCompletions = allCompletions.concat(data || []);
  }

  console.log('\nL1 completions preserved:', allCompletions.length, '(expected 18)');
  const withLegacy = allCompletions.filter(c => c.answers_legacy !== null);
  const withMigrated = allCompletions.filter(c => c.auto_migrated === true);
  console.log('  With answers_legacy:', withLegacy.length);
  console.log('  With auto_migrated:', withMigrated.length);

  if (allCompletions.length > 0) {
    const sample = allCompletions[0];
    console.log('  Sample:', sample.id.substring(0, 8),
      '| score=' + sample.score,
      '| completed=' + sample.completed_at,
      '| has_legacy=' + (sample.answers_legacy !== null));
  }

  // 4. Untouched tables
  console.log('\nUntouched table counts:');
  const counts = [
    ['curriculum_vocabulary', 1954],
    ['curriculum_writing', 72],
    ['curriculum_speaking', 72],
    ['curriculum_readings', 144],
    ['curriculum_comprehension_questions', 1152],
    ['student_curriculum_progress', 117],
    ['profiles', 15],
  ];
  for (const [table, expected] of counts) {
    const { count } = await supabase.from(table).select('id', { count: 'exact', head: true });
    const ok = count == expected;
    console.log('  ' + table + ': ' + count + ' (expected ' + expected + ') ' + (ok ? 'OK' : 'MISMATCH'));
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
})();
