#!/usr/bin/env node
/**
 * Single-agent helper for Prompt 31 (synonyms + antonyms).
 *
 * Replaces the old splitter (`split-vocab-for-agents.cjs`) and the 10
 * agent-manager files. Provides three small DB primitives that the
 * single sequential Claude Code agent calls between reasoning batches.
 *
 * Usage
 * -----
 *   node scripts/generate-relationships.cjs --fetch 50          # next 50 pending
 *   node scripts/generate-relationships.cjs --apply <file>      # write batch result
 *   node scripts/generate-relationships.cjs --status            # progress counts
 *
 * --fetch <N>
 *   Prints a JSON array of the next N pending vocabulary rows to stdout:
 *     [{ id, word, level, meaning_en, meaning_ar, pos }, ...]
 *   Also prints "BATCH N-M / TOTAL" + count to STDERR so it doesn't
 *   contaminate the JSON the agent will pipe to a file.
 *
 * --apply <file>
 *   Reads a JSON array of result entries:
 *     [{ id, synonyms: [...], antonyms: [...] }, ...]
 *   Looks up vocabulary_id for each related word (case-insensitive),
 *   marks the highest-level synonym with is_strongest: true, and writes:
 *     UPDATE curriculum_vocabulary
 *     SET synonyms = $1, antonyms = $2, relationships_generated_at = NOW()
 *     WHERE id = $3
 *
 * --status
 *   Prints `{ total, done, pending }` to stdout.
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
const TIMESTAMP_COL = 'relationships_generated_at'

function clampLevel(l) {
  if (typeof l !== 'number' || !Number.isFinite(l)) return 1
  if (l < 1) return 1
  if (l > 5) return 5
  return Math.round(l)
}

function normalizeList(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const out = []
  for (const item of list) {
    if (!item || typeof item.word !== 'string') continue
    const w = item.word.trim()
    if (!w) continue
    const key = w.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ word: w, level: clampLevel(item.level) })
  }
  return out
}

function markStrongest(syns) {
  if (syns.length === 0) return syns
  let maxLvl = -1
  for (const s of syns) if (s.level > maxLvl) maxLvl = s.level
  let marked = false
  return syns.map((s) => {
    if (!marked && s.level === maxLvl) {
      marked = true
      return { ...s, is_strongest: true }
    }
    return { ...s, is_strongest: false }
  })
}

async function buildWordIndex() {
  const index = new Map()
  let from = 0
  const pageSize = 1000
  for (;;) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, word')
      .order('id')
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const row of data) {
      const key = row.word.trim().toLowerCase()
      if (!index.has(key)) index.set(key, row.id)
    }
    if (data.length < pageSize) break
    from += pageSize
  }
  return index
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

  const index = await buildWordIndex()
  const linkAgainstIndex = (list) =>
    list.map((item) => ({ ...item, vocabulary_id: index.get(item.word.toLowerCase()) || null }))

  let updated = 0
  let skipped = 0
  let failed = 0
  for (const entry of raw) {
    if (!entry || !entry.id) {
      skipped++
      continue
    }
    const syns = markStrongest(linkAgainstIndex(normalizeList(entry.synonyms)))
    const ants = linkAgainstIndex(normalizeList(entry.antonyms)).map((a) => ({
      ...a,
      is_strongest: false,
    }))
    const { error } = await supabase
      .from(TABLE)
      .update({
        synonyms: syns,
        antonyms: ants,
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
  console.log(JSON.stringify({ updated, skipped, failed }))
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
      '  node scripts/generate-relationships.cjs --fetch 50\n' +
      '  node scripts/generate-relationships.cjs --apply <result.json>\n' +
      '  node scripts/generate-relationships.cjs --status\n'
  )
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
