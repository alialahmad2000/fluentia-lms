// verify-ielts-adaptive-queries.cjs
// Confirms all columns read/written by useAdaptivePlan + useErrorBank exist in DB
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or key env vars')
  process.exit(1)
}

async function colExists(table, col) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(col)}&limit=0`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' } }
  )
  return r.ok
}

let passed = 0
let failed = 0

function ok(label) { console.log(`  ✓ ${label}`); passed++ }
function fail(label, detail) { console.log(`  ✗ ${label}${detail ? ': ' + detail : ''}`); failed++ }

async function checkCols(table, cols, label) {
  console.log(`\n[${label}]`)
  for (const col of cols) {
    const exists = await colExists(table, col)
    if (exists) { ok(col) } else { fail(col, 'column not found') }
  }
}

;(async () => {
  console.log('=== verify-ielts-adaptive-queries ===\n')

  // useAdaptivePlan — read ('*' = all), key cols that must exist
  await checkCols('ielts_adaptive_plans', [
    'id', 'student_id', 'target_band', 'current_band_estimate',
    'target_exam_date', 'test_variant',
    'weak_areas', 'strong_areas',         // actual DB column names
    'weekly_schedule', 'next_recommended_action',
    'last_regenerated_at',                // actual DB column name
    'updated_at',
  ], 'ielts_adaptive_plans READ')

  // useUpdatePlanMeta — patch
  await checkCols('ielts_adaptive_plans', [
    'target_band', 'target_exam_date', 'test_variant', 'updated_at',
  ], 'ielts_adaptive_plans PATCH (updateMeta)')

  // useRegeneratePlan — upsert (generator output keys)
  await checkCols('ielts_adaptive_plans', [
    'student_id', 'target_band', 'target_exam_date', 'test_variant',
    'weak_areas', 'strong_areas', 'current_band_estimate',
    'weekly_schedule', 'next_recommended_action',
    'last_regenerated_at', 'updated_at',
  ], 'ielts_adaptive_plans UPSERT (regen)')

  // useMarkWeeklyTaskComplete — reads + writes weekly_schedule
  await checkCols('ielts_adaptive_plans', ['weekly_schedule'], 'ielts_adaptive_plans TASK TOGGLE')

  // gatherPlanContext — reads ielts_student_results
  await checkCols('ielts_student_results', [
    'student_id', 'overall_band',
    'reading_score', 'listening_score', 'writing_score', 'speaking_score',
    'result_type', 'completed_at',
  ], 'ielts_student_results (gatherPlanContext)')

  // useErrorBankSummary — reads skill_type, mastered, next_review_at
  await checkCols('ielts_error_bank', [
    'skill_type', 'mastered', 'next_review_at',
  ], 'ielts_error_bank SUMMARY')

  // useErrorBankList — full list select
  await checkCols('ielts_error_bank', [
    'id', 'student_id', 'skill_type', 'question_type',
    'question_text', 'student_answer', 'correct_answer',
    'times_seen', 'times_correct', 'mastered', 'next_review_at',
  ], 'ielts_error_bank LIST')

  // useErrorsDueForReview — adds explanation
  await checkCols('ielts_error_bank', ['explanation'], 'ielts_error_bank DUE (explanation)')

  // useSubmitErrorReview — update
  await checkCols('ielts_error_bank', [
    'times_seen', 'times_correct', 'mastered', 'next_review_at',
  ], 'ielts_error_bank SUBMIT REVIEW')

  // useArchiveError — update mastered + next_review_at
  await checkCols('ielts_error_bank', ['mastered', 'next_review_at'], 'ielts_error_bank ARCHIVE')

  console.log(`\n${'='.repeat(40)}`)
  console.log(`TOTAL: ${passed} passed, ${failed} failed`)
  console.log('='.repeat(40))

  if (failed > 0) {
    console.log('\nSome columns are MISSING — check ✗ entries above.')
    process.exit(1)
  } else {
    console.log('\nAll column checks passed. ✓')
    process.exit(0)
  }
})()
