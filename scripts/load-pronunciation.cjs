#!/usr/bin/env node
/**
 * Loads agent-generated pronunciation_alert JSON files into curriculum_vocabulary.
 *
 * Input format (per file, one entry per word in the batch):
 *   [
 *     {
 *       "id": "<vocabulary uuid>",
 *       "word": "knight",
 *       "pronunciation_alert": {
 *         "has_alert": true,
 *         "severity": "high",
 *         "ipa": "/naɪt/",
 *         ...
 *       } OR null
 *     },
 *     ...
 *   ]
 *
 * The loader:
 *  - validates each entry
 *  - updates pronunciation_alert + pronunciation_generated_at
 *  - reports per-batch stats (alerts vs null, by severity)
 *
 * Usage:
 *   node scripts/load-pronunciation.cjs scripts/pronunciation-batches/batch-01.result.json [more...]
 *   node scripts/load-pronunciation.cjs --all
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const SEVERITIES = new Set(['high', 'medium', 'low'])

function validateAlert(alert, word) {
  if (alert === null || alert === undefined) return null
  if (typeof alert !== 'object') {
    console.warn(`  ⚠️  ${word}: alert not an object — treating as null`)
    return null
  }
  if (alert.has_alert === false) return null
  const required = ['severity', 'ipa', 'correct_approximation_ar', 'explanation_ar']
  for (const key of required) {
    if (typeof alert[key] !== 'string' || alert[key].length === 0) {
      console.warn(`  ⚠️  ${word}: missing ${key} — skipping alert`)
      return null
    }
  }
  if (!SEVERITIES.has(alert.severity)) {
    console.warn(`  ⚠️  ${word}: invalid severity "${alert.severity}" — defaulting to medium`)
    alert.severity = 'medium'
  }
  if (alert.explanation_ar.length < 50) {
    console.warn(`  ⚠️  ${word}: explanation_ar too short (${alert.explanation_ar.length} chars)`)
  }
  // Normalize
  return {
    has_alert: true,
    severity: alert.severity,
    ipa: alert.ipa,
    common_mispronunciation_ar: alert.common_mispronunciation_ar || null,
    correct_approximation_ar: alert.correct_approximation_ar,
    problem_letters: Array.isArray(alert.problem_letters) ? alert.problem_letters : [],
    rule_category: alert.rule_category || 'other',
    explanation_ar: alert.explanation_ar,
    similar_words: Array.isArray(alert.similar_words) ? alert.similar_words.slice(0, 5) : [],
    practice_tip_ar: alert.practice_tip_ar || null,
  }
}

async function loadFile(file) {
  const raw = fs.readFileSync(file, 'utf8')
  const entries = JSON.parse(raw)
  if (!Array.isArray(entries)) throw new Error(`${file}: not an array`)

  console.log(`\n→ ${path.basename(file)}: ${entries.length} entries`)
  let alerts = 0
  let nulls = 0
  let failed = 0
  const bySeverity = { high: 0, medium: 0, low: 0 }

  for (const entry of entries) {
    if (!entry || typeof entry.id !== 'string') {
      failed++
      continue
    }
    const alert = validateAlert(entry.pronunciation_alert, entry.word || entry.id)
    if (alert) {
      alerts++
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1
    } else {
      nulls++
    }
    const { error } = await supabase
      .from('curriculum_vocabulary')
      .update({
        pronunciation_alert: alert,
        pronunciation_generated_at: new Date().toISOString(),
      })
      .eq('id', entry.id)
    if (error) {
      console.error(`  ❌ ${entry.word || entry.id}: ${error.message}`)
      failed++
    }
  }

  const rate = entries.length > 0 ? ((100 * alerts) / entries.length).toFixed(1) : '0'
  console.log(
    `  ✓ alerts=${alerts} (${rate}%)  null=${nulls}  failed=${failed}  ` +
      `[high=${bySeverity.high} med=${bySeverity.medium} low=${bySeverity.low}]`
  )
  return { alerts, nulls, failed, bySeverity }
}

async function main() {
  const args = process.argv.slice(2)
  let files = []

  if (args[0] === '--all') {
    const dir = path.resolve(__dirname, 'pronunciation-batches')
    files = fs
      .readdirSync(dir)
      .filter((f) => /^batch-\d+\.result\.json$/.test(f))
      .map((f) => path.join(dir, f))
      .sort()
  } else if (args.length > 0) {
    files = args.map((a) => path.resolve(a))
  } else {
    console.error('Usage: node scripts/load-pronunciation.cjs <file.result.json> [...] | --all')
    process.exit(1)
  }

  if (files.length === 0) {
    console.log('No result files found.')
    return
  }

  const totals = { alerts: 0, nulls: 0, failed: 0, bySeverity: { high: 0, medium: 0, low: 0 } }
  for (const f of files) {
    const r = await loadFile(f)
    totals.alerts += r.alerts
    totals.nulls += r.nulls
    totals.failed += r.failed
    for (const k of Object.keys(r.bySeverity)) {
      totals.bySeverity[k] = (totals.bySeverity[k] || 0) + r.bySeverity[k]
    }
  }

  const processed = totals.alerts + totals.nulls
  const overallRate = processed > 0 ? ((100 * totals.alerts) / processed).toFixed(1) : '0'
  console.log('\n═══ TOTAL ═══')
  console.log(`  processed:    ${processed}`)
  console.log(`  alerts:       ${totals.alerts} (${overallRate}%)`)
  console.log(`  null_alerts:  ${totals.nulls}`)
  console.log(`  failed:       ${totals.failed}`)
  console.log(
    `  severity:     high=${totals.bySeverity.high} medium=${totals.bySeverity.medium} low=${totals.bySeverity.low}`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
