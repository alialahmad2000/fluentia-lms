require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
let classifyQuestion;

const CONFIRM = process.env.CONFIRM === 'true';
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CONFIDENCE_THRESHOLD = 0.8;

/**
 * Resolve answer from answer_key (array shape: [{question_number, correct_answer}]).
 * Falls back to q.correct_answer which is embedded in question objects.
 */
function resolveAnswer(answerKey, q, idx) {
  // Prefer embedded answer
  if (q.correct_answer != null) return q.correct_answer;
  if (!answerKey) return null;
  const qNum = q.question_number ?? q.number ?? q.q_id ?? q.id ?? (idx + 1);
  if (Array.isArray(answerKey)) {
    const match = answerKey.find(a =>
      String(a.question_number) === String(qNum) ||
      String(a.id) === String(qNum) ||
      String(a.number) === String(qNum)
    );
    return match?.correct_answer ?? match?.answer ?? match?.value ?? null;
  }
  if (typeof answerKey === 'object') {
    const v = answerKey[qNum] ?? answerKey[String(qNum)];
    if (v == null) return null;
    if (typeof v === 'object') return v.correct_answer ?? v.answer ?? v.value;
    return v;
  }
  return null;
}

/**
 * Classify all untyped questions in a row.
 * Returns { newQuestions, log, changed }
 */
function classifyRowQuestions(row) {
  if (!Array.isArray(row.questions)) {
    return { newQuestions: row.questions, log: [], changed: false };
  }
  const log = [];
  let changed = false;

  const newQuestions = row.questions.map((q, idx) => {
    // Already typed? Skip.
    if (q.type || q.question_type) {
      log.push({ qIdx: idx, already_typed: q.type || q.question_type });
      return q;
    }
    const answer = resolveAnswer(row.answer_key, q, idx);
    const result = classifyQuestion(q, answer, {});
    const applied = (result.confidence >= CONFIDENCE_THRESHOLD && result.type !== 'unclassified')
      ? result.type : 'unclassified';
    log.push({
      qIdx: idx,
      classified: applied,       // what actually gets written to DB
      raw_type: result.type,     // classifier's best guess
      confidence: result.confidence,
      reasons: result.reasons,
    });

    changed = true;
    if (applied !== 'unclassified') {
      return { ...q, type: applied, _classified_by: 'deterministic_v1' };
    }
    return { ...q, type: 'unclassified', _classified_by: 'deterministic_v1_low_confidence' };
  });

  return { newQuestions, log, changed };
}

async function main() {
  ({ classifyQuestion } = await import('../src/lib/ielts/classifyQuestion.js'));
  console.log(`\n${'='.repeat(60)}`);
  console.log(`IELTS Question Classifier — ${CONFIRM ? '✍️  LIVE' : '🔍 DRY RUN'}`);
  console.log(`Confidence threshold: ${CONFIDENCE_THRESHOLD}`);
  console.log(`${'='.repeat(60)}\n`);

  const manifest = {
    generated_at: new Date().toISOString(),
    mode: CONFIRM ? 'live' : 'dry_run',
    confidence_threshold: CONFIDENCE_THRESHOLD,
    reading: { rows: [], summary: {} },
    listening: { rows: [], summary: {} },
  };

  // ── READING ─────────────────────────────────────────────────
  console.log('📖 Classifying Reading questions...');
  const { data: passages, error: rErr } = await sb
    .from('ielts_reading_passages')
    .select('id, title, questions, answer_key, is_published');
  if (rErr) throw rErr;

  const rSummary = { already_typed: 0, classified_now: 0, low_confidence: 0, by_type: {}, rows_updated: 0 };

  for (const p of passages || []) {
    const { newQuestions, log, changed } = classifyRowQuestions(p);
    manifest.reading.rows.push({ id: p.id, title: p.title, published: p.is_published, log, changed });

    for (const entry of log) {
      if (entry.already_typed) { rSummary.already_typed++; continue; }
      if (entry.classified === 'unclassified') { rSummary.low_confidence++; continue; }
      rSummary.classified_now++;
      rSummary.by_type[entry.classified] = (rSummary.by_type[entry.classified] || 0) + 1;
    }

    if (CONFIRM && changed) {
      const { data: upd, error: uErr } = await sb
        .from('ielts_reading_passages')
        .update({ questions: newQuestions })
        .eq('id', p.id)
        .select('id');
      if (uErr) { console.error(`  ❌ ${p.id}:`, uErr.message); throw uErr; }
      if (!upd || upd.length !== 1) throw new Error(`Rowcount mismatch on ${p.id}`);
      rSummary.rows_updated++;
    }
  }
  manifest.reading.summary = rSummary;
  console.log(`  Already typed:    ${rSummary.already_typed}`);
  console.log(`  Newly classified: ${rSummary.classified_now}`);
  console.log(`  Low confidence:   ${rSummary.low_confidence}`);
  if (CONFIRM) console.log(`  Rows updated:     ${rSummary.rows_updated}`);
  console.log(`  Type distribution:`, rSummary.by_type);

  // ── LISTENING ────────────────────────────────────────────────
  console.log('\n🎧 Classifying Listening questions...');
  const { data: sections, error: lErr } = await sb
    .from('ielts_listening_sections')
    .select('id, title, section_number, questions, answer_key, is_published');
  if (lErr) throw lErr;

  const lSummary = { already_typed: 0, classified_now: 0, low_confidence: 0, by_type: {}, rows_updated: 0 };

  for (const s of sections || []) {
    const { newQuestions, log, changed } = classifyRowQuestions({ questions: s.questions, answer_key: s.answer_key });
    manifest.listening.rows.push({ id: s.id, section: s.section_number, published: s.is_published, log, changed });

    for (const entry of log) {
      if (entry.already_typed) { lSummary.already_typed++; continue; }
      if (entry.classified === 'unclassified') { lSummary.low_confidence++; continue; }
      lSummary.classified_now++;
      lSummary.by_type[entry.classified] = (lSummary.by_type[entry.classified] || 0) + 1;
    }

    if (CONFIRM && changed) {
      const { data: upd, error: uErr } = await sb
        .from('ielts_listening_sections')
        .update({ questions: newQuestions })
        .eq('id', s.id)
        .select('id');
      if (uErr) throw uErr;
      if (!upd || upd.length !== 1) throw new Error(`Rowcount mismatch on ${s.id}`);
      lSummary.rows_updated++;
    }
  }
  manifest.listening.summary = lSummary;
  console.log(`  Already typed:    ${lSummary.already_typed}`);
  console.log(`  Newly classified: ${lSummary.classified_now}`);
  console.log(`  Low confidence:   ${lSummary.low_confidence}`);
  if (CONFIRM) console.log(`  Rows updated:     ${lSummary.rows_updated}`);
  console.log(`  Type distribution:`, lSummary.by_type);

  // ── MANIFEST ─────────────────────────────────────────────────
  const manifestPath = path.join(__dirname, '..', 'docs', 'question-classification-manifest.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  if (CONFIRM) manifest.applied_at = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const sizeKB = (fs.statSync(manifestPath).size / 1024).toFixed(1);
  console.log(`\n📝 Manifest: ${manifestPath} (${sizeKB} KB)`);

  // ── LOW CONFIDENCE CSV ────────────────────────────────────────
  const lowConfRows = [];
  for (const r of manifest.reading.rows) {
    for (const l of r.log) {
      if (l.classified === 'unclassified') {
        lowConfRows.push(`"reading","${r.id}","${(r.title || '').replace(/"/g, "'")}",${l.qIdx},"${(l.reasons || []).join(' | ')}"`);
      }
    }
  }
  for (const r of manifest.listening.rows) {
    for (const l of r.log) {
      if (l.classified === 'unclassified') {
        lowConfRows.push(`"listening","${r.id}","Section ${r.section}",${l.qIdx},"${(l.reasons || []).join(' | ')}"`);
      }
    }
  }
  if (lowConfRows.length) {
    const csvPath = path.join(__dirname, '..', 'docs', 'questions-needing-manual-review.csv');
    fs.writeFileSync(csvPath, `type,source_id,title,q_index,reasons\n${lowConfRows.join('\n')}`);
    console.log(`   Low-confidence CSV: ${csvPath} (${lowConfRows.length} rows)`);
  } else {
    console.log(`   Low-confidence CSV: none (0 unclassified questions)`);
  }

  // ── SUMMARY ───────────────────────────────────────────────────
  const lowConfRate = (rSummary.low_confidence + lSummary.low_confidence) /
    Math.max(1, rSummary.classified_now + rSummary.low_confidence + lSummary.classified_now + lSummary.low_confidence);
  console.log(`\n   Low-confidence rate: ${(lowConfRate * 100).toFixed(1)}%`);
  if (lowConfRate > 0.25) {
    console.log(`   ⚠️  Low-confidence > 25% — consider refining classifier before live apply`);
  }

  if (!CONFIRM) {
    console.log(`\n⚠️  DRY RUN — no rows changed.`);
    console.log(`   To apply: CONFIRM=true node scripts/ielts-classify-questions.cjs\n`);
  } else {
    console.log(`\n✅ Classifications applied.\n`);
  }
}

main().catch(err => { console.error('\n❌ FAILED:', err); process.exit(1); });
