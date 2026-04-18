require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const CONFIRM = process.env.CONFIRM === 'true';
const TIER = 'tier1';

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TARGETS = {
  reading: 15,
  writing: 10,
  listening: 8,
  speaking: 15,
};

// ============================================
// SECTION 1 — FETCHERS
// ============================================

async function fetchUnpublishedReading() {
  const { data, error } = await sb
    .from('ielts_reading_passages')
    .select('id, title, content, word_count, difficulty_band, test_variant, questions, answer_key, is_published, created_at')
    .eq('is_published', false);
  if (error) throw error;
  return data || [];
}

async function fetchUnpublishedWriting() {
  const { data, error } = await sb
    .from('ielts_writing_tasks')
    .select('id, task_type, sub_type, title, prompt, image_url, chart_data, template_structure, model_answer_band6, model_answer_band7, model_answer_band8, rubric, word_count_target, difficulty_band, test_variant, is_published')
    .eq('is_published', false);
  if (error) throw error;
  return data || [];
}

async function fetchUnpublishedListening() {
  const { data, error } = await sb
    .from('ielts_listening_sections')
    .select('id, test_id, section_number, title, audio_url, audio_duration_seconds, transcript, speaker_count, accent, questions, answer_key, is_published')
    .eq('is_published', false);
  if (error) throw error;
  return data || [];
}

async function fetchUnpublishedSpeaking() {
  const { data, error } = await sb
    .from('ielts_speaking_questions')
    .select('id, part, topic, questions, cue_card, follow_up_questions, model_answer_text, useful_phrases, band_descriptors, is_published')
    .eq('is_published', false);
  if (error) throw error;
  return data || [];
}

// ============================================
// SECTION 2 — REJECTION (hard filters)
// ============================================

function rejectReading(row, reasons) {
  if (!row.questions) return reasons.push('no questions JSON');
  if (Array.isArray(row.questions) && row.questions.length < 3) return reasons.push('fewer than 3 questions');
  if (!Array.isArray(row.questions) && Object.keys(row.questions).length < 3) return reasons.push('fewer than 3 questions (object shape)');
  if (!row.answer_key) return reasons.push('no answer_key');
  if (!row.content || row.content.length < 500) return reasons.push('content too short (< 500 chars)');
  if (!row.word_count || row.word_count < 200) return reasons.push('word_count too low');
  if (!row.difficulty_band) return reasons.push('no difficulty_band');
  if (!row.test_variant) return reasons.push('no test_variant');
  return null;
}

function rejectWriting(row, reasons) {
  if (!row.prompt || row.prompt.length < 40) return reasons.push('prompt too short');
  if (!row.task_type) return reasons.push('no task_type');
  if (!row.word_count_target) return reasons.push('no word_count_target');
  if (row.task_type === 'task1' && !row.test_variant) return reasons.push('Task 1 missing test_variant');
  return null;
}

async function rejectListening(row, reasons) {
  if (!row.questions) return reasons.push('no questions JSON');
  if (Array.isArray(row.questions) && row.questions.length < 3) return reasons.push('fewer than 3 questions');
  if (!row.answer_key) return reasons.push('no answer_key');
  if (!row.audio_url) return reasons.push('no audio_url');
  if (!row.section_number) return reasons.push('no section_number');
  try {
    const audioCheck = await verifyAudioExists(row.audio_url);
    if (!audioCheck) return reasons.push('audio_url does not resolve');
  } catch (e) {
    return reasons.push(`audio check error: ${e.message}`);
  }
  return null;
}

function rejectSpeaking(row, reasons) {
  if (!row.part || !['part1','part2','part3','Part 1','Part 2','Part 3'].includes(row.part)) {
    return reasons.push(`invalid part: ${row.part}`);
  }
  if (!row.topic) return reasons.push('no topic');
  const partNum = String(row.part).includes('2') ? 2 : String(row.part).includes('1') ? 1 : 3;
  if (partNum === 2 && !row.cue_card) return reasons.push('Part 2 missing cue_card');
  if (partNum !== 2 && !row.questions && !row.follow_up_questions) return reasons.push('no questions');
  return null;
}

async function verifyAudioExists(audioUrl) {
  try {
    let url = audioUrl;
    if (!url.startsWith('http')) {
      const { data } = sb.storage.from('curriculum-audio').getPublicUrl(url);
      url = data?.publicUrl;
    }
    if (!url) return false;
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================
// SECTION 3 — QUALITY SCORING
// ============================================

function scoreReading(row) {
  let s = 0;
  const qCount = Array.isArray(row.questions) ? row.questions.length : Object.keys(row.questions || {}).length;
  s += Math.min(qCount, 15);
  if (row.word_count >= 600 && row.word_count <= 900) s += 10;
  else if (row.word_count >= 400) s += 5;
  if (row.test_variant === 'academic') s += 2;
  if (row.title && row.title.length > 10) s += 3;
  return s;
}

function scoreWriting(row) {
  let s = 0;
  if (row.model_answer_band6) s += 3;
  if (row.model_answer_band7) s += 5;
  if (row.model_answer_band8) s += 3;
  if (row.prompt && row.prompt.length >= 100) s += 5;
  if (row.template_structure) s += 3;
  if (row.rubric) s += 2;
  if (row.task_type === 'task1' && row.image_url) s += 5;
  return s;
}

function scoreListening(row) {
  let s = 0;
  const qCount = Array.isArray(row.questions) ? row.questions.length : Object.keys(row.questions || {}).length;
  s += Math.min(qCount, 10);
  if (row.transcript && row.transcript.length > 200) s += 5;
  if (row.audio_duration_seconds >= 60 && row.audio_duration_seconds <= 240) s += 5;
  if (row.accent) s += 2;
  return s;
}

function scoreSpeaking(row) {
  let s = 0;
  if (row.model_answer_text && row.model_answer_text.length > 100) s += 5;
  if (row.useful_phrases && (Array.isArray(row.useful_phrases) ? row.useful_phrases.length : 0) >= 3) s += 3;
  if (row.band_descriptors) s += 2;
  if (row.follow_up_questions && Array.isArray(row.follow_up_questions) && row.follow_up_questions.length >= 2) s += 3;
  return s;
}

// ============================================
// SECTION 4 — COVERAGE-AWARE SELECTION
// ============================================

function selectReading(candidates) {
  const buckets = new Map();
  for (const row of candidates) {
    if (!Array.isArray(row.questions)) continue;
    const types = new Set(row.questions.map(q => q.type || q.question_type).filter(Boolean));
    for (const t of types) {
      const key = `${row.difficulty_band}|${t}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(row);
    }
    // If no typed questions, use a catch-all bucket
    if (types.size === 0) {
      const key = `${row.difficulty_band}|untyped`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(row);
    }
  }
  const picked = new Set();
  for (const [, list] of buckets) {
    list.sort((a, b) => b._score - a._score);
    if (list[0]) picked.add(list[0].id);
    if (picked.size >= TARGETS.reading) break;
  }
  if (picked.size < TARGETS.reading) {
    const remaining = candidates
      .filter(c => !picked.has(c.id))
      .sort((a, b) => b._score - a._score);
    for (const r of remaining) {
      if (picked.size >= TARGETS.reading) break;
      picked.add(r.id);
    }
  }
  return candidates.filter(c => picked.has(c.id));
}

function selectWriting(candidates) {
  const t1Academic = candidates.filter(c => c.task_type === 'task1' && c.test_variant === 'academic')
    .sort((a, b) => b._score - a._score).slice(0, 4);
  const t1GT = candidates.filter(c => c.task_type === 'task1' && c.test_variant === 'general_training')
    .sort((a, b) => b._score - a._score).slice(0, 2);
  const t2 = candidates.filter(c => c.task_type === 'task2')
    .sort((a, b) => b._score - a._score).slice(0, 4);
  return [...t1Academic, ...t1GT, ...t2];
}

function selectListening(candidates) {
  const picked = [];
  for (const sn of [1, 2, 3, 4]) {
    const inSec = candidates.filter(c => c.section_number === sn).sort((a, b) => b._score - a._score);
    picked.push(...inSec.slice(0, 2));
  }
  return picked;
}

function selectSpeaking(candidates) {
  const picked = [];
  for (const partId of [1, 2, 3]) {
    const inPart = candidates.filter(c => {
      const n = String(c.part).includes(String(partId));
      return n;
    }).sort((a, b) => b._score - a._score);
    picked.push(...inPart.slice(0, 5));
  }
  return picked;
}

// ============================================
// SECTION 5 — MAIN FLOW
// ============================================

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`IELTS Tier 1 Publish — ${CONFIRM ? '✍️  LIVE MODE' : '🔍 DRY RUN'}`);
  console.log(`${'='.repeat(60)}\n`);

  const manifest = {
    generated_at: new Date().toISOString(),
    mode: CONFIRM ? 'live' : 'dry_run',
    tier: TIER,
    targets: TARGETS,
    reading: { considered: 0, rejected: [], selected: [] },
    writing: { considered: 0, rejected: [], selected: [] },
    listening: { considered: 0, rejected: [], selected: [] },
    speaking: { considered: 0, rejected: [], selected: [] },
  };

  // --- READING ---
  console.log('📖 READING');
  const readingAll = await fetchUnpublishedReading();
  manifest.reading.considered = readingAll.length;
  const readingOk = [];
  for (const row of readingAll) {
    const reasons = [];
    rejectReading(row, reasons);
    if (reasons.length > 0) {
      manifest.reading.rejected.push({ id: row.id, title: row.title, reasons });
    } else {
      row._score = scoreReading(row);
      readingOk.push(row);
    }
  }
  const readingSelected = selectReading(readingOk);
  manifest.reading.selected = readingSelected.map(r => ({ id: r.id, title: r.title, band: r.difficulty_band, variant: r.test_variant, score: r._score }));
  console.log(`  Considered: ${readingAll.length}  |  Rejected: ${manifest.reading.rejected.length}  |  Selected: ${readingSelected.length}`);

  // --- WRITING ---
  console.log('\n✍️  WRITING');
  const writingAll = await fetchUnpublishedWriting();
  manifest.writing.considered = writingAll.length;
  const writingOk = [];
  for (const row of writingAll) {
    const reasons = [];
    rejectWriting(row, reasons);
    if (reasons.length > 0) {
      manifest.writing.rejected.push({ id: row.id, title: row.title, reasons });
    } else {
      row._score = scoreWriting(row);
      writingOk.push(row);
    }
  }
  const writingSelected = selectWriting(writingOk);
  manifest.writing.selected = writingSelected.map(r => ({ id: r.id, title: r.title, task_type: r.task_type, variant: r.test_variant, score: r._score }));
  console.log(`  Considered: ${writingAll.length}  |  Rejected: ${manifest.writing.rejected.length}  |  Selected: ${writingSelected.length}`);

  // --- LISTENING ---
  console.log('\n🎧 LISTENING');
  const listeningAll = await fetchUnpublishedListening();
  manifest.listening.considered = listeningAll.length;
  const listeningOk = [];
  for (const row of listeningAll) {
    const reasons = [];
    await rejectListening(row, reasons);
    if (reasons.length > 0) {
      manifest.listening.rejected.push({ id: row.id, title: row.title, reasons });
    } else {
      row._score = scoreListening(row);
      listeningOk.push(row);
    }
  }
  const listeningSelected = selectListening(listeningOk);
  manifest.listening.selected = listeningSelected.map(r => ({ id: r.id, title: r.title, section: r.section_number, score: r._score }));
  console.log(`  Considered: ${listeningAll.length}  |  Rejected: ${manifest.listening.rejected.length}  |  Selected: ${listeningSelected.length}`);

  // --- SPEAKING ---
  console.log('\n🎤 SPEAKING');
  const speakingAll = await fetchUnpublishedSpeaking();
  manifest.speaking.considered = speakingAll.length;
  const speakingOk = [];
  for (const row of speakingAll) {
    const reasons = [];
    rejectSpeaking(row, reasons);
    if (reasons.length > 0) {
      manifest.speaking.rejected.push({ id: row.id, topic: row.topic, reasons });
    } else {
      row._score = scoreSpeaking(row);
      speakingOk.push(row);
    }
  }
  const speakingSelected = selectSpeaking(speakingOk);
  manifest.speaking.selected = speakingSelected.map(r => ({ id: r.id, topic: r.topic, part: r.part, score: r._score }));
  console.log(`  Considered: ${speakingAll.length}  |  Rejected: ${manifest.speaking.rejected.length}  |  Selected: ${speakingSelected.length}`);

  // --- WRITE MANIFEST ---
  const manifestPath = path.join(__dirname, '..', 'docs', 'tier1-publish-manifest.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📝 Manifest saved to: ${manifestPath}`);

  // --- REJECTION DETAIL ---
  console.log('\n\n' + '='.repeat(60));
  console.log('REJECTION DETAIL (sample)');
  console.log('='.repeat(60));
  for (const type of ['reading', 'writing', 'listening', 'speaking']) {
    const rej = manifest[type].rejected.slice(0, 10);
    if (rej.length === 0) {
      console.log(`\n--- ${type.toUpperCase()}: no rejections ---`);
      continue;
    }
    console.log(`\n--- ${type.toUpperCase()} rejections (showing ${rej.length} of ${manifest[type].rejected.length}) ---`);
    for (const r of rej) {
      console.log(`  ${r.id.substring(0, 8)}... ${r.title || r.topic || '(no title)'}`);
      console.log(`    reasons: ${r.reasons.join(' | ')}`);
    }
  }

  // --- REJECTION RATE CHECK ---
  const tables = ['reading', 'writing', 'listening', 'speaking'];
  const highRejection = tables.filter(t => {
    const m = manifest[t];
    return m.considered > 0 && (m.rejected.length / m.considered) > 0.30;
  });
  if (highRejection.length > 0) {
    console.log(`\n\n⚠️  HIGH REJECTION RATE (>30%) in: ${highRejection.join(', ')}`);
    for (const t of highRejection) {
      const m = manifest[t];
      const pct = Math.round((m.rejected.length / m.considered) * 100);
      console.log(`  ${t}: ${m.rejected.length}/${m.considered} rejected (${pct}%)`);
    }
    console.log(`\n  → Investigate rejection reasons before publishing.`);
  }

  // --- PUBLISH SUMMARY ---
  const totalSelected = readingSelected.length + writingSelected.length + listeningSelected.length + speakingSelected.length;
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`PUBLISH SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total to publish: ${totalSelected}`);
  console.log(`  Reading:   ${readingSelected.length} / target ${TARGETS.reading}`);
  console.log(`  Writing:   ${writingSelected.length} / target ${TARGETS.writing}`);
  console.log(`  Listening: ${listeningSelected.length} / target ${TARGETS.listening}`);
  console.log(`  Speaking:  ${speakingSelected.length} / target ${TARGETS.speaking}`);

  // --- EXECUTE (only if CONFIRM) ---
  if (!CONFIRM) {
    console.log(`\n⚠️  DRY RUN — no rows changed. Re-run with CONFIRM=true to publish.`);
    console.log(`    Command: CONFIRM=true node scripts/ielts-tier1-publish.cjs\n`);
    return;
  }

  console.log(`\n\n🚀 EXECUTING PUBLISH...\n`);

  const publishTable = async (tableName, selectedRows, label) => {
    if (selectedRows.length === 0) {
      console.log(`  [${label}] nothing to publish`);
      return;
    }
    const ids = selectedRows.map(r => r.id);
    const { data, error } = await sb
      .from(tableName)
      .update({ is_published: true })
      .in('id', ids)
      .select('id');
    if (error) {
      console.error(`  [${label}] ❌ ERROR:`, error.message);
      throw error;
    }
    const updated = data?.length || 0;
    if (updated !== ids.length) {
      throw new Error(`[${label}] Rowcount mismatch: expected ${ids.length}, updated ${updated}`);
    }
    console.log(`  [${label}] ✅ published ${updated} rows`);
  };

  await publishTable('ielts_reading_passages', readingSelected, 'Reading');
  await publishTable('ielts_writing_tasks', writingSelected, 'Writing');
  await publishTable('ielts_listening_sections', listeningSelected, 'Listening');
  await publishTable('ielts_speaking_questions', speakingSelected, 'Speaking');

  // --- UPDATE MANIFEST with live mode ---
  manifest.mode = 'live';
  manifest.published_at = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // --- VERIFY ---
  console.log('\n\n✅ POST-PUBLISH VERIFICATION\n');
  for (const [table, label] of [
    ['ielts_reading_passages', 'Reading'],
    ['ielts_writing_tasks', 'Writing'],
    ['ielts_listening_sections', 'Listening'],
    ['ielts_speaking_questions', 'Speaking'],
  ]) {
    const { count } = await sb.from(table).select('*', { count: 'exact', head: true }).eq('is_published', true);
    console.log(`  ${label}: ${count} published total`);
  }

  console.log('\n🎉 Tier 1 publish complete!\n');
}

main().catch(err => {
  console.error('\n❌ SCRIPT FAILED:', err);
  process.exit(1);
});
