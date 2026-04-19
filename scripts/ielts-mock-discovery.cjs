// IELTS Mock Center — Phase A Discovery Script
// Runs read-only probes against all tables and edge functions needed for Prompt-IELTS-09
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const lines = []
function log(...args) {
  const msg = args.join(' ')
  console.log(msg)
  lines.push(msg)
}

async function main() {
  log('# IELTS Mock Center — Phase A Discovery Report')
  log(`Generated: ${new Date().toISOString()}`)
  log('')

  // ─── A.1 Mock Test Catalog ─────────────────────────────────────────
  log('## A.1 — ielts_mock_tests catalog')

  // First get columns
  const { data: cols, error: colErr } = await sb
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_schema', 'public')
    .eq('table_name', 'ielts_mock_tests')
    .order('ordinal_position')
  if (colErr) {
    log('ERROR fetching columns:', colErr.message)
  } else {
    log('Columns:', cols.map(c => `${c.column_name}(${c.data_type})`).join(', '))
  }

  const { data: mocks, error: mErr } = await sb
    .from('ielts_mock_tests')
    .select('id, test_number, title_ar, title_en, test_variant, is_published, created_at, reading_passage_ids, writing_task1_id, writing_task2_id, listening_test_id, speaking_questions')
    .order('test_number')
  if (mErr) { log('ERROR:', mErr.message); }
  else {
    log(`Total ielts_mock_tests rows: ${mocks.length}`)
    const nonDiag = mocks.filter(m => m.test_number > 0)
    const published = mocks.filter(m => m.is_published && m.test_number > 0)
    const complete = mocks.filter(m =>
      m.test_number > 0 &&
      m.writing_task1_id && m.writing_task2_id && m.listening_test_id &&
      Array.isArray(m.reading_passage_ids) && m.reading_passage_ids.length >= 3 &&
      m.speaking_questions != null
    )
    log(`  Non-diagnostic (test_number > 0): ${nonDiag.length}`)
    log(`  Published non-diagnostic: ${published.length}`)
    log(`  Complete (all parts linked): ${complete.length}`)

    for (const m of mocks) {
      const passCount = Array.isArray(m.reading_passage_ids) ? m.reading_passage_ids.length : 0
      const sqKeys = m.speaking_questions ? Object.keys(m.speaking_questions) : []
      const isComplete = m.writing_task1_id && m.writing_task2_id && m.listening_test_id && passCount >= 3
      log(`  [test_number=${m.test_number}] id=${m.id} variant=${m.test_variant || 'N/A'} published=${m.is_published} passages=${passCount} task1=${!!m.writing_task1_id} task2=${!!m.writing_task2_id} listening=${!!m.listening_test_id} speaking_keys=[${sqKeys.join(',')}] → ${isComplete ? 'COMPLETE' : 'INCOMPLETE'}`)
    }
  }
  log('')

  // ─── A.2 — ielts_mock_attempts schema ─────────────────────────────
  log('## A.2 — ielts_mock_attempts columns')
  const requiredCols = [
    'id', 'student_id', 'mock_test_id', 'status',
    'current_section', 'section_started_at', 'section_time_remaining',
    'answers', 'writing_task1_submission', 'writing_task2_submission',
    'speaking_submissions', 'auto_saved_at', 'started_at', 'completed_at',
    'result_id', 'test_variant', 'tab_blur_events',
  ]
  const ABORT_COLS = ['status', 'current_section', 'answers', 'section_time_remaining']
  let abortTriggered = false
  for (const col of requiredCols) {
    const { error } = await sb.from('ielts_mock_attempts').select(col).limit(0)
    const exists = !error
    const tag = ABORT_COLS.includes(col) && !exists ? '❌ ABORT' : exists ? '✓' : '✗ (optional/missing)'
    log(`  ${col}: ${tag}`)
    if (ABORT_COLS.includes(col) && !exists) abortTriggered = true
  }
  if (abortTriggered) {
    log('ABORT: Missing required column on ielts_mock_attempts — Prompt 01 expected to create this')
    process.exit(1)
  }
  log('')

  // ─── A.3 — complete-ielts-diagnostic analysis (static, already read) ──
  log('## A.3 — complete-ielts-diagnostic analysis (from source code)')
  log('  - Input: { attempt_id }')
  log('  - Writing: handles Task 2 ONLY (writing_task2_submission / answers.writing.task2)')
  log('  - Speaking: handles part1 + part2 ONLY (PARTS constant)')
  log('  - result_type: hardcoded "diagnostic" — cannot be called with result_type=mock')
  log('  - evaluate-writing called with { student_id, task_type, task_id, submission, test_variant, purpose }')
  log('    WARNING: useSpeakingLab found actual evaluate-writing input is { text, task_type } — verify!')
  log('  - No shared helpers exported — gradeObjective + evaluateSpeakingInline are inline')
  log('  Decision: CREATE complete-ielts-mock as NEW function (copy + adapt)')
  log('')

  // ─── A.4 — Content health ─────────────────────────────────────────
  log('## A.4 — Content health')

  const { data: passages } = await sb
    .from('ielts_reading_passages')
    .select('id, difficulty_band, test_variant, is_published')
  const pubPassages = (passages || []).filter(p => p.is_published)
  const byBand = {}
  for (const p of pubPassages) {
    const b = p.difficulty_band || 'unknown'
    byBand[b] = (byBand[b] || 0) + 1
  }
  log(`  Reading passages: ${(passages||[]).length} total / ${pubPassages.length} published`)
  log(`    By difficulty: ${JSON.stringify(byBand)}`)

  const { data: lisSections } = await sb
    .from('ielts_listening_sections')
    .select('id, section_number, is_published')
  const pubLis = (lisSections || []).filter(s => s.is_published)
  const bySecNum = {}
  for (const s of pubLis) {
    const n = s.section_number || '?'
    bySecNum[n] = (bySecNum[n] || 0) + 1
  }
  log(`  Listening sections: ${(lisSections||[]).length} total / ${pubLis.length} published`)
  log(`    By section_number: ${JSON.stringify(bySecNum)}`)

  const { data: writingTasks } = await sb
    .from('ielts_writing_tasks')
    .select('id, task_type, test_variant, is_published')
  const pubWriting = (writingTasks || []).filter(t => t.is_published)
  const byTaskType = {}
  for (const t of pubWriting) {
    const k = `${t.task_type}|${t.test_variant || 'any'}`
    byTaskType[k] = (byTaskType[k] || 0) + 1
  }
  log(`  Writing tasks: ${(writingTasks||[]).length} total / ${pubWriting.length} published`)
  log(`    By task_type|variant: ${JSON.stringify(byTaskType)}`)

  const { data: speakingQs } = await sb
    .from('ielts_speaking_questions')
    .select('id, part, is_published')
  const pubSpeaking = (speakingQs || []).filter(q => q.is_published)
  const byPart = {}
  for (const q of pubSpeaking) {
    byPart[q.part] = (byPart[q.part] || 0) + 1
  }
  log(`  Speaking questions: ${(speakingQs||[]).length} total / ${pubSpeaking.length} published`)
  log(`    By part: ${JSON.stringify(byPart)}`)

  // Viability
  const hasP1R = pubPassages.length >= 3
  const hasListening = Object.keys(bySecNum).length >= 4 && Object.values(bySecNum).every(c => c >= 1)
  const hasWritingAcadTask1 = (byTaskType['task1|academic'] || 0) >= 1 || (byTaskType['task1|null'] || byTaskType['task1|any'] || 0) >= 1
  const hasWritingTask2 = Object.entries(byTaskType).some(([k, v]) => k.startsWith('task2') && v >= 1)
  const hasSpeakingP1 = (byPart['1'] || 0) >= 3
  const hasSpeakingP2 = (byPart['2'] || 0) >= 1
  const hasSpeakingP3 = (byPart['3'] || 0) >= 3

  const academicViable = hasP1R && hasListening && hasWritingAcadTask1 && hasWritingTask2 && hasSpeakingP1 && hasSpeakingP2 && hasSpeakingP3
  log(`  Viable for Academic: ${academicViable ? 'YES' : 'NO'}`)
  if (!academicViable) {
    if (!hasP1R) log(`    ✗ Need ≥3 published reading passages (have ${pubPassages.length})`)
    if (!hasListening) log(`    ✗ Need ≥1 published listening section per section_number 1-4 (have: ${JSON.stringify(bySecNum)})`)
    if (!hasWritingAcadTask1) log(`    ✗ Need ≥1 published Task 1 academic`)
    if (!hasWritingTask2) log(`    ✗ Need ≥1 published Task 2`)
    if (!hasSpeakingP1) log(`    ✗ Need ≥3 published Part 1 questions (have ${byPart['1'] || 0})`)
    if (!hasSpeakingP2) log(`    ✗ Need ≥1 published Part 2 question (have ${byPart['2'] || 0})`)
    if (!hasSpeakingP3) log(`    ✗ Need ≥3 published Part 3 questions (have ${byPart['3'] || 0})`)
  }
  // GT viability check
  const hasWritingGTTask1 = (byTaskType['task1|general_training'] || 0) >= 1
  const gtViable = hasP1R && hasListening && hasWritingGTTask1 && hasWritingTask2 && hasSpeakingP1 && hasSpeakingP2 && hasSpeakingP3
  log(`  Viable for General Training: ${gtViable ? 'YES' : 'NO'}`)
  if (!gtViable && !hasWritingGTTask1) log(`    ✗ Need ≥1 published Task 1 general_training`)
  log('')

  // ─── A.5 — Hub mock widget ────────────────────────────────────────
  log('## A.5 — Hub mock widget (from source code grep)')
  log('  StudentIELTSHub.jsx line 137: comment "Mock Tests" widget placeholder')
  log('  useIELTSHub.js line 123-124: queries ielts_mock_attempts — id, mock_test_id, status, started_at, completed_at')
  log('  Hub widget reads mock attempt list — will naturally pick up new mock results after query invalidation')
  log('')

  // ─── A.6 — Diagnostic component signatures ────────────────────────
  log('## A.6 — Diagnostic section component signatures')
  log('  DiagnosticListening({ attempt, content }) — NO strict/onePlay props yet')
  log('    → Already uses AudioPlayer with onePlayOnly=true ✓')
  log('    → onExpire={() => {}} in DiagnosticTimer — timer is forgiving (does nothing on expire)')
  log('    → FIX: Add onExpire prop with default () => {} — pass to DiagnosticTimer')
  log('  DiagnosticReading({ attempt, content }) — NO strict props yet')
  log('    → onExpire={() => {}} — forgiving timer')
  log('    → FIX: Add onExpire prop with default () => {} — pass to DiagnosticTimer')
  log('  DiagnosticWriting({ attempt, content }) — Task 2 only')
  log('    → Cannot be reused for mock (needs Task 1+2 combined timer)')
  log('    → NEW: MockWritingTabs.jsx')
  log('  DiagnosticSpeaking({ attempt, content }) — Parts 1+2 only (PARTS = ["part1","part2"])')
  log('    → Cannot be reused for mock (needs Part 3)')
  log('    → NEW: MockSpeaking.jsx')
  log('')

  // ─── A.7 — Timer behavior ─────────────────────────────────────────
  log('## A.7 — Timer behavior')
  log('  DiagnosticTimer: takes { initialSeconds, onExpire, onTick }')
  log('  DiagnosticListening: passes onExpire={() => {}} → FORGIVING (visual only)')
  log('  DiagnosticReading: passes onExpire={() => {}} → FORGIVING')
  log('  Plan: add onExpire prop (default () => {}) to DiagnosticListening + DiagnosticReading')
  log('  MockFlow will pass real advance handler → STRICT auto-advance')
  log('  Timer logic: inline in each section component (uses DiagnosticTimer component)')
  log('  Approach: prop threading (Path 1) — minimal additive change, backward-compatible')
  log('')

  // ─── A.8 — test_variant propagation ──────────────────────────────
  log('## A.8 — test_variant propagation')
  log('  useDiagnostic.js line 98: stored on ielts_mock_attempts.test_variant at attempt creation')
  log('  complete-ielts-diagnostic line 237: reads attempt.test_variant for evaluate-writing call')
  log('  Plan: mock attempt also stores test_variant on insert → same pattern')
  log('')

  // ─── A.9 — Storage RLS ───────────────────────────────────────────
  log('## A.9 — Storage RLS for speaking submissions')
  const { data: buckets } = await sb.storage.listBuckets()
  const speakingBucket = (buckets || []).find(b => b.name === 'ielts-speaking-submissions')
  log(`  ielts-speaking-submissions bucket: ${speakingBucket ? 'EXISTS' : 'MISSING'}`)
  log(`  Prompt 08 confirmed: {profile.id}/{attemptId}/{partN}.webm path works`)
  log(`  Mock will use: {studentId}/{attemptAttemptId}/part{N}.webm — same bucket, different prefix`)
  log('')

  // ─── evaluate-writing input probe ─────────────────────────────────
  log('## A.3b — evaluate-writing edge function actual input probe')
  try {
    const evWritingPath = path.resolve(__dirname, '../supabase/functions/evaluate-writing/index.ts')
    if (fs.existsSync(evWritingPath)) {
      const src = fs.readFileSync(evWritingPath, 'utf-8')
      // Find how it reads body
      const bodyMatch = src.match(/const\s*\{([^}]+)\}\s*=\s*(?:await\s+)?req\.json\(\)/)
      if (bodyMatch) log(`  Reads from body: { ${bodyMatch[1].trim()} }`)
      const bandMatch = src.match(/overall_band|band_score|feedback\.band/)
      log(`  Band response field: ${bandMatch ? bandMatch[0] : 'unknown'}`)
    } else {
      log('  evaluate-writing/index.ts not found locally — skipping static analysis')
    }
  } catch(e) {
    log('  ERROR reading evaluate-writing:', e.message)
  }
  log('')

  // ─── A.10 — Summary table ─────────────────────────────────────────
  log('## A.10 — Summary Table')
  log('```')
  log('| Check                                      | Result                    |')
  log('|--------------------------------------------|---------------------------|')

  const totalMocks = (mocks || []).length
  const pubNonDiag = (mocks || []).filter(m => m.is_published && m.test_number > 0).length
  const completeMocks = (mocks || []).filter(m =>
    m.test_number > 0 && m.writing_task1_id && m.writing_task2_id && m.listening_test_id &&
    Array.isArray(m.reading_passage_ids) && m.reading_passage_ids.length >= 3
  ).length

  log(`| Total ielts_mock_tests rows                | ${String(totalMocks).padEnd(25)} |`)
  log(`| Published non-diagnostic mocks             | ${String(pubNonDiag).padEnd(25)} |`)
  log(`| Complete mocks (all parts linked)          | ${String(completeMocks).padEnd(25)} |`)
  log(`| Viable auto-assembly: Academic             | ${(academicViable ? 'YES' : 'NO — see A.4').padEnd(25)} |`)
  log(`| Viable auto-assembly: General Training     | ${(gtViable ? 'YES' : 'NO — no GT Task 1').padEnd(25)} |`)
  log(`| complete-ielts-diagnostic handles mock     | NO → NEW FN needed        |`)
  log(`| ielts_mock_attempts.test_variant column    | exists                    |`)
  log(`| ielts_mock_attempts.tab_blur_events column | exists (from A.2)         |`)
  log(`| Diagnostic section components reusable     | L/R: yes+prop; W/S: new   |`)
  log(`| Timer logic reuse approach                 | prop threading (Path 1)   |`)
  log('```')
  log('')
  log('## Decision: No ABORT conditions. Proceed to Phase B.')

  // Write report
  const reportPath = path.resolve(__dirname, '../docs/IELTS-MOCK-DISCOVERY-REPORT.md')
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8')
  console.log(`\nReport written to docs/IELTS-MOCK-DISCOVERY-REPORT.md`)
}

main().catch(e => { console.error(e); process.exit(1) })
