#!/usr/bin/env node
/**
 * Prompt 36 verifier:
 *  - counts total / with alert / null / still pending
 *  - reports alert rate (target: 20-35%)
 *  - severity distribution (expected ~30% high, ~50% medium, ~20% low)
 *  - flags explanation_ar shorter than 50 chars
 *  - flags alerts missing similar_words or practice_tip_ar
 *  - flags duplicate explanation_ar text (would indicate templating)
 *  - random sample 20 alerts for manual quality review
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function fetchAll() {
  console.log('Fetching all vocabulary...')
  const all = []
  let from = 0
  const page = 1000
  for (;;) {
    const { data, error } = await supabase
      .from('curriculum_vocabulary')
      .select('id, word, pronunciation_alert, pronunciation_generated_at')
      .order('id')
      .range(from, from + page - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < page) break
    from += page
  }
  console.log(`Fetched ${all.length} rows`)
  return all
}

function rand(n) {
  return Math.floor(Math.random() * n)
}

async function main() {
  const rows = await fetchAll()
  const total = rows.length
  const processed = rows.filter((r) => r.pronunciation_generated_at !== null)
  const pending = rows.filter((r) => r.pronunciation_generated_at === null)
  const withAlert = processed.filter(
    (r) => r.pronunciation_alert && typeof r.pronunciation_alert === 'object'
  )
  const nullAlert = processed.filter((r) => !r.pronunciation_alert)

  console.log('\n=== Coverage ===')
  console.log(`  total:           ${total}`)
  console.log(`  processed:       ${processed.length} (${((100 * processed.length) / total).toFixed(1)}%)`)
  console.log(`  with_alert:      ${withAlert.length}`)
  console.log(`  null_alert:      ${nullAlert.length}`)
  console.log(`  still_pending:   ${pending.length}`)

  if (processed.length === 0) {
    console.log('\nNothing processed yet — exiting early.')
    return
  }

  const alertRate = (100 * withAlert.length) / processed.length
  console.log('\n=== Alert Rate ===')
  console.log(`  rate:  ${alertRate.toFixed(1)}%  (target 20-35%)`)
  const rateOk = alertRate >= 18 && alertRate <= 38

  // Severity distribution
  const sev = { high: 0, medium: 0, low: 0, other: 0 }
  for (const r of withAlert) {
    const s = r.pronunciation_alert.severity
    if (sev[s] !== undefined) sev[s]++
    else sev.other++
  }
  const sevTotal = withAlert.length || 1
  console.log('\n=== Severity ===')
  console.log(`  high:   ${sev.high} (${((100 * sev.high) / sevTotal).toFixed(1)}%)`)
  console.log(`  medium: ${sev.medium} (${((100 * sev.medium) / sevTotal).toFixed(1)}%)`)
  console.log(`  low:    ${sev.low} (${((100 * sev.low) / sevTotal).toFixed(1)}%)`)
  if (sev.other > 0) console.log(`  other:  ${sev.other}  ⚠️  unexpected severity values`)

  // Quality flags
  let shortExplanation = 0
  let missingSimilar = 0
  let missingTip = 0
  let missingIpa = 0
  const explanationCounts = new Map()
  const shortExamples = []
  const missingSimilarExamples = []

  for (const r of withAlert) {
    const a = r.pronunciation_alert
    if (typeof a.explanation_ar !== 'string' || a.explanation_ar.length < 50) {
      shortExplanation++
      if (shortExamples.length < 5) {
        shortExamples.push(`${r.word}: "${(a.explanation_ar || '').slice(0, 80)}"`)
      }
    }
    if (typeof a.explanation_ar === 'string' && a.explanation_ar.length >= 50) {
      explanationCounts.set(a.explanation_ar, (explanationCounts.get(a.explanation_ar) || 0) + 1)
    }
    if (!Array.isArray(a.similar_words) || a.similar_words.length === 0) {
      missingSimilar++
      if (missingSimilarExamples.length < 5) missingSimilarExamples.push(r.word)
    }
    if (!a.practice_tip_ar) missingTip++
    if (!a.ipa) missingIpa++
  }

  // Duplicate explanations (templating detector)
  const duplicates = []
  for (const [text, count] of explanationCounts.entries()) {
    if (count > 1) duplicates.push({ count, text: text.slice(0, 100) })
  }
  duplicates.sort((a, b) => b.count - a.count)

  console.log('\n=== Quality Flags ===')
  console.log(`  short_explanation (<50ch):  ${shortExplanation}`)
  console.log(`  missing_similar_words:      ${missingSimilar}`)
  console.log(`  missing_practice_tip:       ${missingTip}`)
  console.log(`  missing_ipa:                ${missingIpa}`)
  console.log(`  duplicate_explanations:     ${duplicates.length}`)

  if (shortExamples.length > 0) {
    console.log('\n  Short explanation samples:')
    for (const s of shortExamples) console.log(`    - ${s}`)
  }
  if (missingSimilarExamples.length > 0) {
    console.log('\n  Missing similar_words samples:')
    for (const w of missingSimilarExamples) console.log(`    - ${w}`)
  }
  if (duplicates.length > 0) {
    console.log('\n  Top duplicate explanations (templates suspected):')
    for (const d of duplicates.slice(0, 5)) {
      console.log(`    ${d.count}× — "${d.text}..."`)
    }
  }

  // Random sample 20
  console.log('\n=== Random sample (20 alerts) ===')
  if (withAlert.length > 0) {
    const picked = new Set()
    for (let i = 0; i < Math.min(20, withAlert.length); i++) {
      let idx = rand(withAlert.length)
      let tries = 0
      while (picked.has(idx) && tries < 30) {
        idx = rand(withAlert.length)
        tries++
      }
      picked.add(idx)
      const r = withAlert[idx]
      const a = r.pronunciation_alert
      console.log(`\n  ${r.word}  [${a.severity}]  ${a.ipa}`)
      console.log(`    ✓ ${a.correct_approximation_ar || '—'}    ✗ ${a.common_mispronunciation_ar || '—'}`)
      console.log(`    ${(a.explanation_ar || '').slice(0, 200)}`)
      if (a.similar_words?.length) console.log(`    similar: ${a.similar_words.join(', ')}`)
      if (a.practice_tip_ar) console.log(`    tip: ${a.practice_tip_ar.slice(0, 120)}`)
    }
  }

  // Pass/fail
  console.log('\n=== Result ===')
  console.log(`  alert_rate (18-38%):      ${rateOk ? 'PASS' : 'FAIL'} (${alertRate.toFixed(1)}%)`)
  console.log(`  no_short_explanations:    ${shortExplanation === 0 ? 'PASS' : 'WARN (' + shortExplanation + ')'}`)
  console.log(`  no_duplicate_templates:   ${duplicates.length === 0 ? 'PASS' : 'WARN (' + duplicates.length + ')'}`)
  console.log(`  no_missing_ipa:           ${missingIpa === 0 ? 'PASS' : 'WARN (' + missingIpa + ')'}`)

  if (!rateOk) process.exit(2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
