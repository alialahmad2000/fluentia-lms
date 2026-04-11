#!/usr/bin/env node
/**
 * Loads agent-generated relationship JSON files into curriculum_vocabulary.
 *
 * Input format (per file, one entry per word processed):
 *   [
 *     {
 *       "id": "<vocabulary uuid>",
 *       "synonyms": [{ "word": "angry", "level": 1 }, ...],
 *       "antonyms": [{ "word": "calm",  "level": 2 }, ...]
 *     },
 *     ...
 *   ]
 *
 * The loader:
 *  - validates each entry
 *  - looks up `vocabulary_id` for each synonym/antonym word (case-insensitive)
 *  - marks the highest-level synonym with `is_strongest: true`
 *  - updates curriculum_vocabulary rows
 *
 * Usage:
 *   node scripts/load-relationships.cjs scripts/agent-batches/batch-01.result.json [batch-02.result.json ...]
 *   node scripts/load-relationships.cjs --all    # loads all batch-*.result.json files
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

function clampLevel(l) {
  if (typeof l !== 'number' || !Number.isFinite(l)) return 1
  if (l < 1) return 1
  if (l > 5) return 5
  return Math.round(l)
}

function normalizeEntry(list) {
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
  console.log('Loading vocabulary lookup index...')
  const index = new Map()
  let from = 0
  const pageSize = 1000
  for (;;) {
    const { data, error } = await supabase
      .from('curriculum_vocabulary')
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
  console.log(`Indexed ${index.size} unique vocabulary words`)
  return index
}

function linkAgainstIndex(list, index) {
  return list.map((item) => ({
    ...item,
    vocabulary_id: index.get(item.word.toLowerCase()) || null,
  }))
}

async function loadFile(file, index) {
  const abs = path.resolve(file)
  if (!fs.existsSync(abs)) {
    console.error(`  MISSING: ${abs}`)
    return { ok: 0, fail: 0 }
  }
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'))
  if (!Array.isArray(raw)) {
    console.error(`  NOT AN ARRAY: ${abs}`)
    return { ok: 0, fail: 0 }
  }

  let ok = 0
  let fail = 0
  for (const entry of raw) {
    if (!entry || !entry.id) {
      fail++
      continue
    }
    const syns = markStrongest(linkAgainstIndex(normalizeEntry(entry.synonyms), index))
    const ants = linkAgainstIndex(normalizeEntry(entry.antonyms), index).map((a) => ({
      ...a,
      is_strongest: false,
    }))
    const { error } = await supabase
      .from('curriculum_vocabulary')
      .update({
        synonyms: syns,
        antonyms: ants,
        relationships_generated_at: new Date().toISOString(),
      })
      .eq('id', entry.id)
    if (error) {
      console.error(`    error updating ${entry.id}: ${error.message}`)
      fail++
    } else {
      ok++
    }
  }
  console.log(`  ${path.basename(file)}: ok=${ok} fail=${fail}`)
  return { ok, fail }
}

async function main() {
  const args = process.argv.slice(2)
  let files = args
  if (args.includes('--all')) {
    const dir = path.resolve(__dirname, 'agent-batches')
    files = fs
      .readdirSync(dir)
      .filter((f) => /batch-\d{2}\.result\.json$/.test(f))
      .sort()
      .map((f) => path.join(dir, f))
  }
  if (files.length === 0) {
    console.error('No input files. Pass file paths or --all.')
    process.exit(1)
  }

  const index = await buildWordIndex()
  let totalOk = 0
  let totalFail = 0
  for (const f of files) {
    const { ok, fail } = await loadFile(f, index)
    totalOk += ok
    totalFail += fail
  }
  console.log(`\nDONE — ok=${totalOk} fail=${totalFail}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
