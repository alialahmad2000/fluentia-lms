require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function discover() {
  const { data: units } = await sb.from('curriculum_units').select('id, level_id, unit_number');
  const { data: levels } = await sb.from('curriculum_levels').select('id, level_number, name_ar');

  const unitMap = {}; (units || []).forEach(u => unitMap[u.id] = u);
  const levelMap = {}; (levels || []).forEach(l => levelMap[l.id] = l);

  function getLevelNum(unitId) {
    const unit = unitMap[unitId];
    if (!unit) return null;
    const level = levelMap[unit.level_id];
    return level ? level.level_number : null;
  }

  function getLevelNumFromLevelId(levelId) {
    const level = levelMap[levelId];
    return level ? level.level_number : null;
  }

  let totalVocabChars = 0, totalVerbChars = 0, totalLisChars = 0, totalReadChars = 0;
  let vocabCount = 0, verbCount = 0, lisCount = 0, readCount = 0;

  // 1A. Vocabulary (linked via reading_id, not unit_id directly)
  console.log('=== 1A. Vocabulary Words ===');
  const { data: vocab, error: vocErr } = await sb.from('curriculum_vocabulary').select('id, word, reading_id');
  if (vocErr) { console.log('  Error:', vocErr.message); }
  else if (!vocab || vocab.length === 0) { console.log('  No vocabulary found'); }
  else {
    vocabCount = vocab.length;
    vocab.forEach(v => { totalVocabChars += (v.word || '').length; });
    console.log(`  TOTAL: ${vocab.length} words, ${totalVocabChars} chars`);
  }

  // 1B. Irregular Verbs (has level_id, uses verb_base/verb_past/verb_past_participle)
  console.log('\n=== 1B. Irregular Verbs per Level ===');
  const { data: verbs, error: verbErr } = await sb.from('curriculum_irregular_verbs').select('id, verb_base, verb_past, verb_past_participle, level_id');
  if (verbErr) { console.log('  Error:', verbErr.message); }
  else if (!verbs || verbs.length === 0) { console.log('  No irregular verbs found'); }
  else {
    verbCount = verbs.length;
    const verbsByLevel = {};
    verbs.forEach(v => {
      const ln = getLevelNumFromLevelId(v.level_id);
      if (ln === null) return;
      if (!verbsByLevel[ln]) verbsByLevel[ln] = { count: 0, chars: 0 };
      verbsByLevel[ln].count++;
      const chars = (v.verb_base||'').length + (v.verb_past||'').length + (v.verb_past_participle||'').length;
      verbsByLevel[ln].chars += chars;
      totalVerbChars += chars;
    });
    Object.keys(verbsByLevel).sort((a,b) => a-b).forEach(ln => {
      console.log(`  Level ${ln}: ${verbsByLevel[ln].count} verbs, ${verbsByLevel[ln].chars} chars`);
    });
    console.log(`  TOTAL: ${verbs.length} verbs, ${totalVerbChars} chars`);
  }

  // 1C. Listening
  console.log('\n=== 1C. Listening Scripts per Level ===');
  const { data: listening, error: lisErr } = await sb.from('curriculum_listening').select('id, transcript, unit_id');
  if (lisErr) { console.log('  Error:', lisErr.message); }
  else if (!listening || listening.length === 0) { console.log('  No listening scripts found'); }
  else {
    lisCount = listening.length;
    const lisByLevel = {};
    listening.forEach(l => {
      const ln = getLevelNum(l.unit_id);
      if (ln === null) return;
      if (!lisByLevel[ln]) lisByLevel[ln] = { count: 0, chars: 0 };
      lisByLevel[ln].count++;
      const chars = (l.transcript||'').length;
      lisByLevel[ln].chars += chars;
      totalLisChars += chars;
    });
    Object.keys(lisByLevel).sort((a,b) => a-b).forEach(ln => {
      console.log(`  Level ${ln}: ${lisByLevel[ln].count} scripts, ${lisByLevel[ln].chars} chars`);
    });
    console.log(`  TOTAL: ${listening.length} scripts, ${totalLisChars} chars`);
  }

  // 1D. Readings
  console.log('\n=== 1D. Reading Passages per Level ===');
  const { data: readings, error: readErr } = await sb.from('curriculum_readings').select('id, passage_content, unit_id');
  if (readErr) { console.log('  Error:', readErr.message); }
  else if (!readings || readings.length === 0) { console.log('  No reading passages found'); }
  else {
    readCount = readings.length;
    const readByLevel = {};
    readings.forEach(r => {
      const ln = getLevelNum(r.unit_id);
      if (ln === null) return;
      if (!readByLevel[ln]) readByLevel[ln] = { count: 0, chars: 0 };
      readByLevel[ln].count++;
      let chars = 0;
      if (r.passage_content && typeof r.passage_content === 'object' && r.passage_content.paragraphs) {
        chars = r.passage_content.paragraphs.join(' ').length;
      } else {
        chars = (typeof r.passage_content === 'string' ? r.passage_content : JSON.stringify(r.passage_content || '')).length;
      }
      readByLevel[ln].chars += chars;
      totalReadChars += chars;
    });
    Object.keys(readByLevel).sort((a,b) => a-b).forEach(ln => {
      console.log(`  Level ${ln}: ${readByLevel[ln].count} passages, ${readByLevel[ln].chars} chars`);
    });
    console.log(`  TOTAL: ${readings.length} passages, ${totalReadChars} chars`);
  }

  // 1E. IELTS Listening
  console.log('\n=== 1E. IELTS Listening Sections ===');
  const { data: ielts } = await sb.from('ielts_listening_sections').select('id, section_number, transcript');
  let ieltsChars = 0;
  if (ielts && ielts.length) {
    const bySec = {};
    ielts.forEach(s => {
      if (!bySec[s.section_number]) bySec[s.section_number] = { count: 0, chars: 0 };
      bySec[s.section_number].count++;
      const c = (s.transcript||'').length;
      bySec[s.section_number].chars += c;
      ieltsChars += c;
    });
    Object.keys(bySec).sort().forEach(s => {
      console.log(`  Section ${s}: ${bySec[s].count} items, ${bySec[s].chars} chars`);
    });
    console.log(`  TOTAL: ${ielts.length} sections, ${ieltsChars} chars`);
  } else {
    console.log('  No IELTS listening sections yet');
  }

  // 1F. IELTS Reading Passages
  console.log('\n=== 1F. IELTS Reading Passages ===');
  const { data: ieltsRead } = await sb.from('ielts_reading_passages').select('id, content, difficulty_band');
  let ieltsReadChars = 0;
  if (ieltsRead && ieltsRead.length) {
    ieltsRead.forEach(r => { ieltsReadChars += (r.content||'').length; });
    console.log(`  TOTAL: ${ieltsRead.length} passages, ${ieltsReadChars} chars`);
  } else {
    console.log('  No IELTS reading passages yet');
  }

  // 1G. Audio columns
  console.log('\n=== 1G. Existing Audio/Pronunciation Columns ===');
  const tables = ['curriculum_vocabulary', 'curriculum_irregular_verbs', 'curriculum_readings', 'curriculum_listening', 'ielts_listening_sections'];
  for (const table of tables) {
    const { data: sample } = await sb.from(table).select('*').limit(1);
    const allCols = sample && sample[0] ? Object.keys(sample[0]) : [];
    const audioCols = allCols.filter(c => c.includes('audio') || c.includes('pronunciation') || c.includes('voice'));
    console.log(`  ${table}: ${audioCols.length ? audioCols.join(', ') : 'NONE'}`);
  }

  // 1H. Storage buckets
  console.log('\n=== 1H. Storage Buckets ===');
  const { data: buckets } = await sb.storage.listBuckets();
  if (buckets && buckets.length) {
    buckets.forEach(b => console.log(`  - ${b.name} (public: ${b.public})`));
  } else {
    console.log('  No buckets found');
  }

  // Summary
  console.log('\n=== ESTIMATED TOTAL CHARACTERS FOR TTS ===');
  console.log(`  Vocabulary words:     ${totalVocabChars.toLocaleString()} chars (${vocabCount} words)`);
  console.log(`  Irregular verbs:      ${totalVerbChars.toLocaleString()} chars (${verbCount} verbs x 3 forms)`);
  console.log(`  Listening scripts:    ${totalLisChars.toLocaleString()} chars (${lisCount} scripts)`);
  console.log(`  Reading passages:     ${totalReadChars.toLocaleString()} chars (${readCount} passages)`);
  console.log(`  IELTS listening:      ${ieltsChars.toLocaleString()} chars (${(ielts||[]).length} sections)`);
  console.log(`  IELTS reading:        ${ieltsReadChars.toLocaleString()} chars (${(ieltsRead||[]).length} passages)`);
  const grandTotal = totalVocabChars + totalVerbChars + totalLisChars + totalReadChars + ieltsChars + ieltsReadChars;
  console.log(`  ─────────────────────`);
  console.log(`  GRAND TOTAL:          ${grandTotal.toLocaleString()} chars`);
}

discover().catch(e => console.error('Error:', e.message));
