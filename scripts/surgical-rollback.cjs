/**
 * surgical-rollback.cjs
 *
 * Rolls back L0+L1 passages and questions to their original content.
 * Handles student progress by backing up old answers and setting correct answers.
 *
 * Usage:
 *   node scripts/surgical-rollback.cjs            # dry-run (no changes)
 *   node scripts/surgical-rollback.cjs --confirm   # apply changes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const CONFIRM = process.argv.includes('--confirm');
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 200;

const TOKEN = 'sbp_413df100e74f46976469493a8fed4d68581fdf82';
const PROJECT_REF = 'nmjexpuycmqcxuxljier';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runManagementSQL(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Management API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function batchUpdate(table, rows, fields) {
  let updated = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const promises = batch.map(row => {
      const payload = {};
      for (const f of fields) {
        payload[f] = row[f];
      }
      return supabase.from(table).update(payload).eq('id', row.id);
    });
    const results = await Promise.all(promises);
    for (const { error } of results) {
      if (error) throw new Error(`Update ${table} failed: ${error.message}`);
    }
    updated += batch.length;
    if (i + BATCH_SIZE < rows.length) await sleep(BATCH_DELAY_MS);
  }
  return updated;
}

// ── main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║   SURGICAL ROLLBACK — L0 + L1 Content           ║`);
  console.log(`║   Mode: ${CONFIRM ? 'CONFIRM (changes WILL be applied)' : 'DRY-RUN (no changes)         '}    ║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);

  // ── 1. Load original data ────────────────────────────────────────────────

  const passagesPath = path.resolve(__dirname, '../PHASE-2-CLEANUP/rollback-staging/l0_l1_passages_original.json');
  const questionsPath = path.resolve(__dirname, '../PHASE-2-CLEANUP/rollback-staging/l0_l1_questions_original.json');

  const passages = JSON.parse(fs.readFileSync(passagesPath, 'utf8'));
  const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

  const l0Passages = passages.filter(p => p.level_number === 0);
  const l1Passages = passages.filter(p => p.level_number === 1);
  const l0Questions = questions.filter(q => q.level_number === 0);
  const l1Questions = questions.filter(q => q.level_number === 1);

  console.log('Original data loaded:');
  console.log(`  Passages : ${passages.length} total (L0=${l0Passages.length}, L1=${l1Passages.length})`);
  console.log(`  Questions: ${questions.length} total (L0=${l0Questions.length}, L1=${l1Questions.length})`);

  // Build a map of reading_id -> [correct answers by question id]
  const questionsByReading = {};
  for (const q of questions) {
    if (!questionsByReading[q.reading_id]) questionsByReading[q.reading_id] = {};
    questionsByReading[q.reading_id][q.id] = q.correct_answer;
  }

  // ── 2. Fetch L1 student completions ──────────────────────────────────────

  const l1ReadingIds = l1Passages.map(p => p.id);

  const { data: l1Progress, error: progressErr } = await supabase
    .from('student_curriculum_progress')
    .select('*')
    .in('reading_id', l1ReadingIds);

  if (progressErr) throw new Error(`Fetch progress failed: ${progressErr.message}`);

  console.log(`  L1 student completions: ${l1Progress ? l1Progress.length : 0} rows`);

  // ── DRY-RUN: just print summary ─────────────────────────────────────────

  if (!CONFIRM) {
    console.log('\n── DRY-RUN SUMMARY ──────────────────────────────');
    console.log(`  Would update ${passages.length} passages (passage_content, passage_word_count, title_en, title_ar)`);
    console.log(`  Would update ${questions.length} questions (question_en, question_ar, choices, correct_answer, explanation_en, explanation_ar, sort_order, question_type, section)`);
    console.log(`  Would add columns to student_curriculum_progress: answers_legacy, auto_migrated, migration_note`);
    console.log(`  Would backup and fix ${l1Progress ? l1Progress.length : 0} L1 student completion rows`);
    console.log('\nRe-run with --confirm to apply changes.\n');
    process.exit(0);
  }

  // ── 3. Add columns via Management API ────────────────────────────────────

  console.log('\n[Step 1/5] Adding columns to student_curriculum_progress...');
  try {
    await runManagementSQL(`
      ALTER TABLE student_curriculum_progress
        ADD COLUMN IF NOT EXISTS answers_legacy JSONB,
        ADD COLUMN IF NOT EXISTS auto_migrated BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS migration_note TEXT;
    `);
    console.log('  Columns added (or already exist).');
  } catch (err) {
    console.error('  Warning — column migration failed:', err.message);
    console.error('  Continuing anyway (columns may already exist)...');
  }

  // ── 4. Backup L1 completions ─────────────────────────────────────────────

  console.log('\n[Step 2/5] Backing up L1 student completions...');
  const backupDir = path.resolve(__dirname, '../PHASE-2-CLEANUP/rollback-staging');
  const backupFile = path.join(backupDir, `l1_completions_backup_${Date.now()}.json`);
  if (l1Progress && l1Progress.length > 0) {
    fs.writeFileSync(backupFile, JSON.stringify(l1Progress, null, 2));
    console.log(`  Backed up ${l1Progress.length} rows to ${path.basename(backupFile)}`);
  } else {
    console.log('  No L1 completions to back up.');
  }

  // ── 5. Update passages ───────────────────────────────────────────────────

  console.log(`\n[Step 3/5] Updating ${passages.length} passages...`);
  const passageFields = ['passage_content', 'passage_word_count', 'title_en', 'title_ar'];
  const pUpdated = await batchUpdate('curriculum_readings', passages, passageFields);
  console.log(`  Updated ${pUpdated} passages.`);

  // ── 6. Update questions ──────────────────────────────────────────────────

  console.log(`\n[Step 4/5] Updating ${questions.length} questions...`);
  const questionFields = [
    'question_en', 'question_ar', 'choices', 'correct_answer',
    'explanation_en', 'explanation_ar', 'sort_order', 'question_type', 'section'
  ];
  const qUpdated = await batchUpdate('curriculum_comprehension_questions', questions, questionFields);
  console.log(`  Updated ${qUpdated} questions.`);

  // ── 7. Fix L1 student completions ────────────────────────────────────────

  console.log(`\n[Step 5/5] Fixing L1 student completions...`);
  if (l1Progress && l1Progress.length > 0) {
    let fixedCount = 0;
    for (let i = 0; i < l1Progress.length; i += BATCH_SIZE) {
      const batch = l1Progress.slice(i, i + BATCH_SIZE);
      const promises = batch.map(row => {
        const readingCorrectAnswers = questionsByReading[row.reading_id] || {};
        // Build new answers: for each question_id in the original answers,
        // set the answer to the correct one from the original data
        const oldAnswers = row.answers || {};
        const newAnswers = {};
        for (const qId of Object.keys(oldAnswers)) {
          if (readingCorrectAnswers[qId] !== undefined) {
            newAnswers[qId] = readingCorrectAnswers[qId];
          } else {
            // Question ID not in our original data — keep as-is
            newAnswers[qId] = oldAnswers[qId];
          }
        }
        // Also ensure all original questions for this reading are present
        for (const [qId, correctAns] of Object.entries(readingCorrectAnswers)) {
          if (!newAnswers[qId]) {
            newAnswers[qId] = correctAns;
          }
        }

        return supabase
          .from('student_curriculum_progress')
          .update({
            answers: newAnswers,
            answers_legacy: oldAnswers,
            auto_migrated: true,
            migration_note: `Surgical rollback ${new Date().toISOString().slice(0, 10)}: answers set to correct after content rollback`,
          })
          .eq('id', row.id);
      });
      const results = await Promise.all(promises);
      for (const { error } of results) {
        if (error) console.error('  Warning updating progress:', error.message);
      }
      fixedCount += batch.length;
      if (i + BATCH_SIZE < l1Progress.length) await sleep(BATCH_DELAY_MS);
    }
    console.log(`  Fixed ${fixedCount} student completion rows.`);
  } else {
    console.log('  No L1 completions to fix.');
  }

  // ── 8. Verification ─────────────────────────────────────────────────────

  console.log('\n── VERIFICATION ─────────────────────────────────');

  // Count passages by level
  const passageCounts = await runManagementSQL(`
    SELECT l.level_number, COUNT(*) as cnt
    FROM curriculum_readings r
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE l.level_number IN (0, 1)
    GROUP BY l.level_number
    ORDER BY l.level_number;
  `);
  for (const row of passageCounts) {
    const label = row.level_number === 0 ? 'L0' : 'L1';
    const expected = 24;
    const status = parseInt(row.cnt) === expected ? 'OK' : 'MISMATCH';
    console.log(`  ${label} passages: ${row.cnt} (expected ${expected}) [${status}]`);
  }

  // Count questions by level
  const questionCounts = await runManagementSQL(`
    SELECT l.level_number, COUNT(*) as cnt
    FROM curriculum_comprehension_questions q
    JOIN curriculum_readings r ON r.id = q.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE l.level_number IN (0, 1)
    GROUP BY l.level_number
    ORDER BY l.level_number;
  `);
  for (const row of questionCounts) {
    const label = row.level_number === 0 ? 'L0' : 'L1';
    const expected = row.level_number === 0 ? 120 : 144;
    const status = parseInt(row.cnt) === expected ? 'OK' : 'MISMATCH';
    console.log(`  ${label} questions: ${row.cnt} (expected ${expected}) [${status}]`);
  }

  // Count vocabulary
  const vocabCount = await runManagementSQL(`SELECT COUNT(*) as cnt FROM curriculum_vocabulary;`);
  const vocabN = parseInt(vocabCount[0].cnt);
  console.log(`  Vocabulary: ${vocabN} (expected 1954) [${vocabN === 1954 ? 'OK' : 'MISMATCH'}]`);

  // Count student_curriculum_progress
  const { count: progressCount } = await supabase
    .from('student_curriculum_progress')
    .select('id', { count: 'exact', head: true });
  console.log(`  student_curriculum_progress: ${progressCount} (expected 117) [${progressCount === 117 ? 'OK' : 'MISMATCH'}]`);

  // ── 9. Summary ───────────────────────────────────────────────────────────

  console.log('\n── SUMMARY ──────────────────────────────────────');
  console.log(`  Passages updated:     ${pUpdated}`);
  console.log(`  Questions updated:    ${qUpdated}`);
  console.log(`  Completions fixed:    ${l1Progress ? l1Progress.length : 0}`);
  console.log(`  Backup file:          ${l1Progress && l1Progress.length > 0 ? path.basename(backupFile) : 'N/A'}`);
  console.log(`  Columns added:        answers_legacy, auto_migrated, migration_note`);
  console.log('\nSurgical rollback complete.\n');
})();
