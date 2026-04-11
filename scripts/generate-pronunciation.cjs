#!/usr/bin/env node
/**
 * Single-agent helper for Prompt 36 (pronunciation alerts).
 *
 * Replaces the old splitter (`split-vocab-pronunciation.cjs`) and the
 * agent-manager files. Provides three small DB primitives that the
 * single sequential Claude Code agent calls between batches.
 *
 * Usage
 * -----
 *   node scripts/generate-pronunciation.cjs --fetch 50          # next 50 pending
 *   node scripts/generate-pronunciation.cjs --apply <file>      # write batch result
 *   node scripts/generate-pronunciation.cjs --status            # progress counts
 *
 * --apply expects entries:
 *   [{ id, pronunciation_alert: { ...alert... } | null }, ...]
 *
 * Validation rules (mirror scripts/load-pronunciation.cjs):
 *   - alert === null   → store NULL
 *   - has_alert === false → store NULL
 *   - missing required keys (severity, ipa, correct_approximation_ar,
 *     explanation_ar) → warn and store NULL
 *   - severity must be one of high|medium|low
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

const TABLE = 'curriculum_vocabulary'
const TIMESTAMP_COL = 'pronunciation_generated_at'
const SEVERITIES = new Set(['high', 'medium', 'low'])

function validateAlert(alert, word) {
  if (alert === null || alert === undefined) return null
  if (typeof alert !== 'object') {
    console.warn(`  warn ${word}: alert not an object — treating as null`)
    return null
  }
  if (alert.has_alert === false) return null
  const required = ['severity', 'ipa', 'correct_approximation_ar', 'explanation_ar']
  for (const key of required) {
    if (!alert[key] || typeof alert[key] !== 'string' || !alert[key].trim()) {
      console.warn(`  warn ${word}: missing/empty ${key} — treating as null`)
      return null
    }
  }
  if (!SEVERITIES.has(alert.severity)) {
    console.warn(`  warn ${word}: invalid severity ${alert.severity} — treating as null`)
    return null
  }
  return {
    has_alert: true,
    severity: alert.severity,
    ipa: alert.ipa,
    common_mispronunciation_ar: alert.common_mispronunciation_ar || null,
    correct_approximation_ar: alert.correct_approximation_ar,
    problem_letters: Array.isArray(alert.problem_letters) ? alert.problem_letters : [],
    rule_category: alert.rule_category || null,
    explanation_ar: alert.explanation_ar,
    similar_words: Array.isArray(alert.similar_words) ? alert.similar_words : [],
    practice_tip_ar: alert.practice_tip_ar || null,
  }
}

async function getCounts() {
  const { count: total, error: e1 } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
  if (e1) throw e1
  const { count: pending, error: e2 } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .is(TIMESTAMP_COL, null)
  if (e2) throw e2
  return { total: total || 0, pending: pending || 0, done: (total || 0) - (pending || 0) }
}

async function fetchNext(n) {
  const limit = Math.max(1, Math.min(parseInt(n, 10) || 50, 200))
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, word, level, meaning_en, meaning_ar, pos, definition_en, definition_ar, part_of_speech, difficulty_tier')
    .is(TIMESTAMP_COL, null)
    .order('level', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })
    .limit(limit)
  if (error) throw error
  const rows = (data || []).map((r) => ({
    id: r.id,
    word: r.word,
    level: r.level ?? r.difficulty_tier ?? null,
    meaning_en: r.meaning_en ?? r.definition_en ?? null,
    meaning_ar: r.meaning_ar ?? r.definition_ar ?? null,
    pos: r.pos ?? r.part_of_speech ?? null,
  }))
  const counts = await getCounts()
  const startIdx = counts.done + 1
  const endIdx = counts.done + rows.length
  process.stderr.write(
    `BATCH ${startIdx}-${endIdx} / ${counts.total} (pending after fetch: ${counts.pending - rows.length})\n`
  )
  process.stdout.write(JSON.stringify(rows))
}

async function applyResult(file) {
  const abs = path.resolve(file)
  if (!fs.existsSync(abs)) {
    console.error(`MISSING: ${abs}`)
    process.exit(1)
  }
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'))
  if (!Array.isArray(raw)) {
    console.error(`NOT AN ARRAY: ${abs}`)
    process.exit(1)
  }

  let updated = 0
  let alertsCreated = 0
  let nullAlerts = 0
  let skipped = 0
  let failed = 0
  for (const entry of raw) {
    if (!entry || !entry.id) {
      skipped++
      continue
    }
    const alert = validateAlert(entry.pronunciation_alert, entry.word || entry.id)
    if (alert) alertsCreated++
    else nullAlerts++
    const { error } = await supabase
      .from(TABLE)
      .update({
        pronunciation_alert: alert,
        [TIMESTAMP_COL]: new Date().toISOString(),
      })
      .eq('id', entry.id)
    if (error) {
      console.error(`  error updating ${entry.id}: ${error.message}`)
      failed++
    } else {
      updated++
    }
  }
  console.log(JSON.stringify({ updated, alerts_created: alertsCreated, null_alerts: nullAlerts, skipped, failed }))
}

async function status() {
  const counts = await getCounts()
  console.log(JSON.stringify(counts))
}

async function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--fetch') return fetchNext(args[1])
  if (args[0] === '--apply') return applyResult(args[1])
  if (args[0] === '--status') return status()
  console.error(
    'Usage:\n' +
      '  node scripts/generate-pronunciation.cjs --fetch 50\n' +
      '  node scripts/generate-pronunciation.cjs --apply <result.json>\n' +
      '  node scripts/generate-pronunciation.cjs --status\n'
  )
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
