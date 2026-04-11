#!/usr/bin/env node
/**
 * Loads agent-generated word_family JSON files into curriculum_vocabulary.
 *
 * Input format (per file, one entry per word):
 *   [
 *     {
 *       "id": "<vocabulary uuid>",
 *       "word": "differ",
 *       "word_family": [
 *         { "word": "differ", "pos": "verb", "level": 2, "is_base": true, ... },
 *         { "word": "different", "pos": "adjective", "level": 2, "is_base": false,
 *           "morphology": { "affix": "-ent", "affix_type": "suffix",
 *                           "base_word": "differ", "base_pos": "verb",
 *                           "rule_ar": "...", "similar_examples": [...] } },
 *         ...
 *       ]
 *     },
 *     ...
 *   ]
 *
 * The loader:
 *  - validates each entry
 *  - links `vocabulary_id` for each family member by lowercase word lookup
 *  - clamps level to 1..5
 *  - updates curriculum_vocabulary.word_family and word_family_generated_at
 *
 * Usage:
 *   node scripts/load-families.cjs scripts/family-batches/batch-01.result.json [batch-02.result.json ...]
 *   node scripts/load-families.cjs --all    # loads all batch-*.result.json files
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

function normalizeFamily(list) {
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
    const entry = {
      word: w,
      pos: typeof item.pos === 'string' ? item.pos : null,
      level: clampLevel(item.level),
      is_base: !!item.is_base,
      is_opposite: !!item.is_opposite,
      morphology: item.morphology && typeof item.morphology === 'object' ? item.morphology : null,
    }
    out.push(entry)
  }
  // Guarantee exactly one base
  if (out.length > 0 && !out.some((m) => m.is_base)) {
    out[0].is_base = true
    if (!out[0].morphology || !out[0].morphology.is_base) {
      out[0].morphology = { is_base: true, note_ar: 'الصيغة الأصلية — منها تشتق باقي العائلة' }
    }
  }
  return out
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

function linkFamily(family, index) {
  return family.map((m) => ({
    ...m,
    vocabulary_id: index.get(m.word.toLowerCase()) || null,
  }))
}

async function loadFile(file, index) {
  const abs = path.resolve(file)
  if (!fs.existsSync(abs)) {
    console.error(`  MISSING: ${abs}`)
    return { ok: 0, fail: 0, skipped: 0 }
  }
  let raw
  try {
    raw = JSON.parse(fs.readFileSync(abs, 'utf8'))
  } catch (e) {
    console.error(`  INVALID JSON: ${abs} — ${e.message}`)
    return { ok: 0, fail: 0, skipped: 0 }
  }
  if (!Array.isArray(raw)) {
    console.error(`  NOT AN ARRAY: ${abs}`)
    return { ok: 0, fail: 0, skipped: 0 }
  }

  let ok = 0
  let fail = 0
  let skipped = 0
  for (const entry of raw) {
    if (!entry || !entry.id) {
      skipped++
      continue
    }
    const fam = linkFamily(normalizeFamily(entry.word_family), index)
    if (fam.length === 0) {
      skipped++
      continue
    }
    const { error } = await supabase
      .from('curriculum_vocabulary')
      .update({
        word_family: fam,
        word_family_generated_at: new Date().toISOString(),
      })
      .eq('id', entry.id)
    if (error) {
      console.error(`    error updating ${entry.id}: ${error.message}`)
      fail++
    } else {
      ok++
    }
  }
  console.log(`  ${path.basename(file)}: ok=${ok} fail=${fail} skipped=${skipped}`)
  return { ok, fail, skipped }
}

async function main() {
  const args = process.argv.slice(2)
  let files = args
  if (args.includes('--all')) {
    const dir = path.resolve(__dirname, 'family-batches')
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
  let totalSkipped = 0
  for (const f of files) {
    const { ok, fail, skipped } = await loadFile(f, index)
    totalOk += ok
    totalFail += fail
    totalSkipped += skipped
  }
  console.log(`\nDONE — ok=${totalOk} fail=${totalFail} skipped=${totalSkipped}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
