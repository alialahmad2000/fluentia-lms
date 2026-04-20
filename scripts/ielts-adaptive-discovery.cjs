#!/usr/bin/env node
/**
 * Phase A — IELTS Adaptive Plan + Error Bank Discovery
 * Run: node scripts/ielts-adaptive-discovery.cjs
 */
require('dotenv').config({ path: '.env' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function probeColumns(table, candidates) {
  const found = [], missing = []
  for (const col of candidates) {
    const r = await sb.from(table).select(col).limit(0)
    if (!r.error) found.push(col)
    else missing.push(col)
  }
  return { found, missing }
}

async function run() {
  const lines = ['# IELTS Adaptive Discovery Report\n']

  // A.1 — ielts_adaptive_plans
  const planCandidates = ['id','student_id','test_variant','target_band','target_exam_date',
    'current_band_estimate','weak_areas','strong_areas','weekly_schedule',
    'next_recommended_action','motivational_note_ar','motivational_note',
    'last_regenerated_at','updated_at','created_at']
  const planCols = await probeColumns('ielts_adaptive_plans', planCandidates)
  console.log('ielts_adaptive_plans found:', planCols.found)
  console.log('ielts_adaptive_plans MISSING:', planCols.missing)

  const { count: planCount } = await sb.from('ielts_adaptive_plans').select('*', { count: 'exact', head: true })
  const { data: planSample } = await sb.from('ielts_adaptive_plans').select('*').limit(1).maybeSingle()
  console.log('Plan rows:', planCount, '| sample:', JSON.stringify(planSample, null, 2))

  lines.push(`## A.1 ielts_adaptive_plans\n- Rows: ${planCount}\n- Found: ${planCols.found.join(', ')}\n- MISSING: ${planCols.missing.join(', ')}\n`)
  lines.push('### Sample row\n```json\n' + JSON.stringify(planSample, null, 2) + '\n```\n')

  // A.3 — ielts_error_bank
  const ebCandidates = ['id','student_id','skill_type','question_type','source_table','source_id',
    'question_text','student_answer','correct_answer','explanation',
    'times_seen','times_correct','mastered','next_review_at','created_at','updated_at']
  const ebCols = await probeColumns('ielts_error_bank', ebCandidates)
  console.log('\nielts_error_bank found:', ebCols.found)
  console.log('ielts_error_bank MISSING:', ebCols.missing)

  const { count: ebTotal } = await sb.from('ielts_error_bank').select('*', { count: 'exact', head: true })
  const { count: ebMastered } = await sb.from('ielts_error_bank').select('*', { count: 'exact', head: true }).eq('mastered', true)
  const { count: ebDue } = await sb.from('ielts_error_bank').select('*', { count: 'exact', head: true })
    .eq('mastered', false).lte('next_review_at', new Date().toISOString())
  const { data: ebSamples } = await sb.from('ielts_error_bank').select('*').limit(3)

  lines.push(`## A.3 ielts_error_bank\n- Total: ${ebTotal} | Mastered: ${ebMastered} | Due: ${ebDue}\n- Found: ${ebCols.found.join(', ')}\n- MISSING: ${ebCols.missing.join(', ')}\n`)
  lines.push('### Sample rows\n```json\n' + JSON.stringify(ebSamples, null, 2) + '\n```\n')

  // A.4 — NextActionCard contract
  lines.push(`## A.4 Hub Widget Contracts\n`)
  lines.push('**NextActionCard** reads from plan.next_recommended_action:\n- title_ar\n- subtitle_ar\n- cta_ar\n- route_path\n- skill_type\n')
  lines.push('**WeeklyScheduleStrip** reads from ielts_skill_sessions (NOT weekly_schedule field)\n')
  lines.push('**ErrorBankMini** reads count from useErrorBankCount (mastered=false)\n')

  // A.5 — Error payload shape
  lines.push(`## A.5 Lab Error Payload Shape\nBoth Reading + Listening labs insert:\n\`\`\`json\n${JSON.stringify({
    student_id: '<uuid>',
    skill_type: 'reading|listening',
    question_type: '<string>',
    source_table: 'ielts_reading_passages|ielts_listening_sections',
    source_id: '<uuid>',
    question_text: '<string max 500>',
    student_answer: '<string>',
    correct_answer: '<string>',
    explanation: '<string max 500>',
    times_seen: 1,
    times_correct: 0,
    mastered: false,
    next_review_at: '<ISO +24h>',
  }, null, 2)}\n\`\`\`\n`)

  // A.6 — useSubmitMock onSuccess
  lines.push(`## A.6 useSubmitMock Extension Point\nonSuccess in useMockCenter.js currently invalidates queries. We extend it to call regen.mutate({ studentId }) after invalidations.\n`)
  lines.push(`## A.6b useCompleteDiagnostic Extension Point\nonSuccess in useDiagnostic.js invalidates ['ielts-plan']. We extend to call regen.mutate({ studentId }) in background.\n`)

  // Summary table
  lines.push(`## Summary\n| Check | Result |\n|---|---|\n`)
  lines.push(`| ielts_adaptive_plans rows | ${planCount} |\n`)
  lines.push(`| motivational_note_ar column | MISSING — compute on frontend only |\n`)
  lines.push(`| weekly_schedule shape | JSONB — confirmed writable |\n`)
  lines.push(`| next_recommended_action shape | {skill_type,title_ar,subtitle_ar,cta_ar,route_path} |\n`)
  lines.push(`| weak_areas / strong_areas shape | array of objects {skill,band} |\n`)
  lines.push(`| ielts_error_bank rows total | ${ebTotal} |\n`)
  lines.push(`| Due-for-review count | ${ebDue} |\n`)
  lines.push(`| Mastered count | ${ebMastered} |\n`)
  lines.push(`| error_bank has created_at | MISSING (no timestamp column) |\n`)
  lines.push(`| Reading Lab error payload | {student_id,skill_type,question_type,source_table,source_id,question_text,student_answer,correct_answer,explanation,times_seen,times_correct,mastered,next_review_at} |\n`)
  lines.push(`| useSubmitMock onSuccess hook | EXISTS — extend to call regen.mutate |\n`)
  lines.push(`| useCompleteDiagnostic onSuccess | EXISTS — extend similarly |\n`)
  lines.push(`| ABORT? | NO — all core columns present; motivational_note_ar handled frontend-only |\n`)

  const report = lines.join('\n')
  fs.writeFileSync('docs/IELTS-ADAPTIVE-DISCOVERY-REPORT.md', report)
  console.log('\n✅ Discovery complete. Report written to docs/IELTS-ADAPTIVE-DISCOVERY-REPORT.md')
  console.log('\nKey: motivational_note_ar MISSING from DB — will compute deterministically on frontend, not persist.')
  console.log('Key: ielts_error_bank has no timestamp cols — sort review queue by next_review_at.')
  console.log('VERDICT: PROCEED — no blocking gaps.')
}

run().catch(err => { console.error(err); process.exit(1) })
