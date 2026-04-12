const fs = require('fs');
const TOKEN = 'sbp_413df100e74f46976469493a8fed4d68581fdf82';
const PROJECT_REF = 'nmjexpuycmqcxuxljier';

async function runSQL(query) {
  const res = await fetch('https://api.supabase.com/v1/projects/' + PROJECT_REF + '/database/query', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return await res.json();
}

(async () => {
  // Extract ALL L0+L1 comprehension questions with full content
  const questions = await runSQL(
    "SELECT q.*, l.level_number, u.unit_number, r.reading_label " +
    "FROM curriculum_comprehension_questions q " +
    "JOIN curriculum_readings r ON r.id = q.reading_id " +
    "JOIN curriculum_units u ON u.id = r.unit_id " +
    "JOIN curriculum_levels l ON l.id = u.level_id " +
    "WHERE l.level_number IN (0, 1) " +
    "ORDER BY l.level_number, u.unit_number, r.reading_label, q.sort_order"
  );

  console.log('Extracted questions:', questions.length);

  const l0 = questions.filter(q => q.level_number === 0);
  const l1 = questions.filter(q => q.level_number === 1);
  console.log('L0:', l0.length, '| L1:', l1.length);

  if (l0.length > 0) {
    console.log('Sample L0 Q:', JSON.stringify(l0[0]).substring(0, 300));
  }

  // Check content fields
  const hasContent = questions.filter(q => q.question_en && q.choices);
  console.log('Questions with full content:', hasContent.length);

  fs.writeFileSync('./PHASE-2-CLEANUP/rollback-staging/l0_l1_questions_original.json', JSON.stringify(questions, null, 2));
  console.log('Saved to l0_l1_questions_original.json');

  // Also verify readings
  const readings = await runSQL(
    "SELECT COUNT(*) as cnt, l.level_number " +
    "FROM curriculum_readings r " +
    "JOIN curriculum_units u ON u.id = r.unit_id " +
    "JOIN curriculum_levels l ON l.id = u.level_id " +
    "WHERE l.level_number IN (0, 1) " +
    "GROUP BY l.level_number ORDER BY l.level_number"
  );
  console.log('Readings counts:', JSON.stringify(readings));
})();
