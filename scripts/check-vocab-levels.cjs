require('dotenv').config();
const sb = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: vocab } = await sb.from('curriculum_vocabulary').select('id, word, reading_id');
  const { data: readings } = await sb.from('curriculum_readings').select('id, unit_id');
  const { data: units } = await sb.from('curriculum_units').select('id, level_id, unit_number');
  const { data: levels } = await sb.from('curriculum_levels').select('id, level_number, name_ar');

  const levelMap = {}; (levels||[]).forEach(l => levelMap[l.id] = l);
  const unitMap = {}; (units||[]).forEach(u => unitMap[u.id] = u);
  const readingMap = {}; (readings||[]).forEach(r => readingMap[r.id] = r);

  // Q1: Vocab per level
  console.log('=== Q1: Vocabulary per level ===');
  const perLevel = {};
  let orphans = 0;
  (vocab||[]).forEach(v => {
    const reading = readingMap[v.reading_id];
    if (!reading) { orphans++; return; }
    const unit = unitMap[reading.unit_id];
    if (!unit) { orphans++; return; }
    const level = levelMap[unit.level_id];
    if (!level) { orphans++; return; }
    const ln = level.level_number;
    if (!perLevel[ln]) perLevel[ln] = { name_ar: level.name_ar, count: 0 };
    perLevel[ln].count++;
  });
  for (let ln = 0; ln <= 5; ln++) {
    if (perLevel[ln]) {
      console.log('  Level ' + ln + ' (' + perLevel[ln].name_ar + '): ' + perLevel[ln].count + ' words');
    } else {
      console.log('  Level ' + ln + ': 0 words  *** MISSING ***');
    }
  }
  if (orphans) console.log('  Orphaned (no level match): ' + orphans);

  // Q2: Units per level
  console.log('\n=== Q2: Units per level ===');
  const unitsPerLevel = {};
  (units||[]).forEach(u => {
    const level = levelMap[u.level_id];
    if (!level) return;
    if (!unitsPerLevel[level.level_number]) unitsPerLevel[level.level_number] = 0;
    unitsPerLevel[level.level_number]++;
  });
  for (let ln = 0; ln <= 5; ln++) {
    console.log('  Level ' + ln + ': ' + (unitsPerLevel[ln] || 0) + ' units');
  }

  // Q3: Total
  console.log('\n=== Q3: Total vocabulary ===');
  console.log('  ' + (vocab||[]).length + ' words');

  // Investigation: Readings per level
  console.log('\n=== Readings per level ===');
  const readingsPerLevel = {};
  (readings||[]).forEach(r => {
    const unit = unitMap[r.unit_id];
    if (!unit) return;
    const level = levelMap[unit.level_id];
    if (!level) return;
    if (!readingsPerLevel[level.level_number]) readingsPerLevel[level.level_number] = 0;
    readingsPerLevel[level.level_number]++;
  });
  for (let ln = 0; ln <= 5; ln++) {
    console.log('  Level ' + ln + ': ' + (readingsPerLevel[ln] || 0) + ' readings');
  }

  // How many Level 4/5 readings have vocab?
  console.log('\n=== Level 4/5 readings with linked vocab ===');
  const level45ReadingIds = new Set();
  (readings||[]).forEach(r => {
    const unit = unitMap[r.unit_id];
    if (!unit) return;
    const level = levelMap[unit.level_id];
    if (!level) return;
    if (level.level_number >= 4) level45ReadingIds.add(r.id);
  });
  console.log('  Level 4/5 reading count: ' + level45ReadingIds.size);

  let vocabLinked = 0;
  (vocab||[]).forEach(v => {
    if (level45ReadingIds.has(v.reading_id)) vocabLinked++;
  });
  console.log('  Vocab linked to these readings: ' + vocabLinked);

  // Columns check
  console.log('\n=== curriculum_vocabulary columns ===');
  const { data: sample } = await sb.from('curriculum_vocabulary').select('*').limit(1);
  if (sample && sample[0]) {
    console.log('  ' + Object.keys(sample[0]).join(', '));
  }
}

run().catch(e => console.error(e));
