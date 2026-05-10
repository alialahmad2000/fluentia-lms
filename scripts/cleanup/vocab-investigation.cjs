// Vocab Investigation — produces all prereq artifacts for PROMPT-VOCAB-CLEANUP.md
// READ-ONLY queries. Output: investigation-results.json, CLEANUP-PLAN.md,
//   exact-duplicates.csv, protected-by-student-progress.csv
'use strict'
const { Client } = require('pg')
const fs   = require('fs')
const path = require('path')

const DB = { host:'aws-1-eu-central-1.pooler.supabase.com', port:5432, database:'postgres',
  user:'postgres.nmjexpuycmqcxuxljier', password:'Ali-al-ahmad2000', ssl:{rejectUnauthorized:false} }

const OUT = path.join(__dirname, '..', '..', 'docs', 'audits', 'vocab')
fs.mkdirSync(OUT, { recursive: true })

const ARABIC_RE = /[؀-ۿݐ-ݿ]/

function containsArabic(s) { return s && ARABIC_RE.test(s) }

// Better word-in-example check using multiple inflection forms
function wordInExample(word, example) {
  if (!word || !example) return false
  const w = word.toLowerCase().trim()
  const ex = example.toLowerCase()
  if (ex.includes(w)) return true
  // Common inflections
  const stems = new Set()
  stems.add(w)
  // Remove common suffixes to get stem
  ;[/s$/, /es$/, /ed$/, /ing$/, /er$/, /est$/, /ly$/, /ies$/, /ied$/,
    /tion$/, /sion$/, /ment$/, /ness$/, /ity$/, /al$/, /ful$/, /less$/].forEach(re => {
    const s = w.replace(re, '')
    if (s.length > 2) stems.add(s)
  })
  // Double-letter stripping (running→run)
  if (/([a-z])\1ing$/.test(w)) stems.add(w.replace(/([a-z])\1ing$/, '$1'))
  // Multi-word phrases: check each significant word
  if (w.includes(' ')) {
    const parts = w.split(/\s+/).filter(p => p.length > 3)
    if (parts.length > 0 && parts.every(p => ex.includes(p))) return true
  }
  return [...stems].some(s => s.length > 2 && ex.includes(s))
}

async function main() {
  const client = new Client(DB)
  await client.connect()
  console.log('Connected. Running vocab investigation...\n')

  // 1. Load full vocab with level info
  console.log('Loading vocab corpus...')
  const { rows: allVocab } = await client.query(`
    SELECT v.id, v.reading_id, v.word, v.definition_en, v.definition_ar,
           v.example_sentence, v.created_at, v.added_in_prompt,
           r.unit_id,
           u.level_id,
           l.level_number
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    ORDER BY l.level_number, v.word
  `)
  console.log(`  Loaded ${allVocab.length} vocab entries\n`)

  // 2. Find duplicate clusters (same level_id + lower(word))
  console.log('Finding duplicate clusters...')
  const levelWordMap = new Map() // `${level_id}::${lower(word)}` → [id, ...]
  for (const v of allVocab) {
    const key = `${v.level_id}::${v.word.toLowerCase().trim()}`
    if (!levelWordMap.has(key)) levelWordMap.set(key, [])
    levelWordMap.get(key).push(v)
  }
  const dupeClusters = []
  for (const [key, rows] of levelWordMap) {
    if (rows.length > 1) dupeClusters.push({ key, rows })
  }
  const totalDupeRows = dupeClusters.reduce((s, c) => s + c.rows.length, 0)
  const totalToDelete = dupeClusters.reduce((s, c) => s + c.rows.length - 1, 0) // minus 1 to keep
  console.log(`  ${dupeClusters.length} duplicate word+level clusters`)
  console.log(`  ${totalDupeRows} rows total, ${totalToDelete} would be deleted (keeping oldest per cluster)\n`)

  // 3. Check student references
  console.log('Checking student references...')
  const { rows: savedWordRefs } = await client.query(`
    SELECT DISTINCT curriculum_vocabulary_id AS vocab_id
    FROM student_saved_words
    WHERE curriculum_vocabulary_id IS NOT NULL
  `)
  const { rows: srsRefs } = await client.query(`
    SELECT DISTINCT vocabulary_id AS vocab_id
    FROM curriculum_vocabulary_srs
    WHERE vocabulary_id IS NOT NULL
  `)
  const protectedIds = new Set([
    ...savedWordRefs.map(r => r.vocab_id),
    ...srsRefs.map(r => r.vocab_id),
  ])
  console.log(`  student_saved_words references: ${savedWordRefs.length}`)
  console.log(`  curriculum_vocabulary_srs references: ${srsRefs.length}`)
  console.log(`  Total student-protected vocab IDs: ${protectedIds.size}\n`)

  // 4. Plan Tier 1 deletions
  const tier1ToDelete = []
  const tier1ToKeep   = []
  const tier1Protected = []
  const dupeCsv = ['id,word,level_number,reading_id,created_at,action,protected']

  for (const { key, rows } of dupeClusters) {
    // Sort oldest first
    const sorted = rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    const protectedInCluster = sorted.filter(r => protectedIds.has(r.id))

    if (protectedInCluster.length > 0) {
      // Keep all protected; delete non-protected
      for (const r of sorted) {
        if (protectedIds.has(r.id)) {
          tier1ToKeep.push(r.id)
          dupeCsv.push(`${r.id},"${r.word.replace(/"/g,'""')}",${r.level_number},${r.reading_id},${r.created_at},KEEP,YES`)
          tier1Protected.push(r)
        } else {
          tier1ToDelete.push(r.id)
          dupeCsv.push(`${r.id},"${r.word.replace(/"/g,'""')}",${r.level_number},${r.reading_id},${r.created_at},DELETE,NO`)
        }
      }
    } else {
      // No protected: keep oldest, delete rest
      tier1ToKeep.push(sorted[0].id)
      dupeCsv.push(`${sorted[0].id},"${sorted[0].word.replace(/"/g,'""')}",${sorted[0].level_number},${sorted[0].reading_id},${sorted[0].created_at},KEEP,NO`)
      for (const r of sorted.slice(1)) {
        tier1ToDelete.push(r.id)
        dupeCsv.push(`${r.id},"${r.word.replace(/"/g,'""')}",${r.level_number},${r.reading_id},${r.created_at},DELETE,NO`)
      }
    }
  }

  console.log(`Tier 1 plan:`)
  console.log(`  To delete: ${tier1ToDelete.length}`)
  console.log(`  To keep:   ${tier1ToKeep.length}`)
  console.log(`  Protected clusters: ${tier1Protected.length}\n`)

  // 5. Find Tier 2: Arabic in example_sentence
  console.log('Finding Tier 2 (Arabic in example_sentence)...')
  const tier2Rows = allVocab.filter(v =>
    v.example_sentence && containsArabic(v.example_sentence)
  )
  console.log(`  Tier 2 rows: ${tier2Rows.length}\n`)

  // 6. Find Tier 3: true word/example mismatches (excluding Arabic examples = Tier 2)
  console.log('Finding Tier 3 (word not in example, non-Arabic examples)...')
  const tier3Rows = allVocab.filter(v => {
    if (!v.example_sentence || !v.word) return false
    if (containsArabic(v.example_sentence)) return false  // handled by Tier 2
    if (tier1ToDelete.includes(v.id)) return false        // will be deleted
    return !wordInExample(v.word, v.example_sentence)
  })
  console.log(`  Tier 3 rows: ${tier3Rows.length} (true mismatches after removing Arabic + Tier 1)\n`)

  // 7. Protected CSV
  const protectedCsv = ['id,word,level_number,student_saved_refs,srs_refs']
  for (const id of protectedIds) {
    const v = allVocab.find(r => r.id === id)
    if (!v) continue
    const savedCount = savedWordRefs.filter(r => r.vocab_id === id).length
    const srsCount   = srsRefs.filter(r => r.vocab_id === id).length
    protectedCsv.push(`${id},"${(v.word||'').replace(/"/g,'""')}",${v.level_number},${savedCount},${srsCount}`)
  }

  // 8. Tier 2 level breakdown
  const t2ByLevel = {}
  tier2Rows.forEach(v => {
    t2ByLevel[v.level_number] = (t2ByLevel[v.level_number] || 0) + 1
  })
  console.log('Tier 2 by level:', t2ByLevel)

  // 9. Tier 3 level breakdown
  const t3ByLevel = {}
  tier3Rows.forEach(v => {
    t3ByLevel[v.level_number] = (t3ByLevel[v.level_number] || 0) + 1
  })
  console.log('Tier 3 by level:', t3ByLevel, '\n')

  // 10. Write outputs
  const results = {
    generated_at: new Date().toISOString(),
    total_vocab: allVocab.length,
    student_protected_count: protectedIds.size,
    tier1: {
      duplicate_clusters: dupeClusters.length,
      total_to_delete: tier1ToDelete.length,
      ids_to_delete: tier1ToDelete,
      ids_to_keep: tier1ToKeep,
    },
    tier2: {
      count: tier2Rows.length,
      by_level: t2ByLevel,
      ids: tier2Rows.map(v => v.id),
    },
    tier3: {
      count: tier3Rows.length,
      by_level: t3ByLevel,
      ids: tier3Rows.map(v => v.id),
    },
  }

  fs.writeFileSync(path.join(OUT, 'investigation-results.json'), JSON.stringify(results, null, 2))
  fs.writeFileSync(path.join(OUT, 'exact-duplicates.csv'), dupeCsv.join('\n'))
  fs.writeFileSync(path.join(OUT, 'protected-by-student-progress.csv'), protectedCsv.join('\n'))

  // 11. Tier 3 sample for manual review
  const t3Sample = tier3Rows.slice(0, 20).map(v =>
    `L${v.level_number} | "${v.word}" | example: "${(v.example_sentence||'').slice(0,80)}"`
  ).join('\n')
  console.log('Tier 3 sample (first 20):')
  console.log(t3Sample)

  // 12. Write CLEANUP-PLAN.md
  const plan = `# Vocab Cleanup Plan

**Generated:** ${new Date().toISOString()}
**Total vocab rows:** ${allVocab.length}
**Student-protected rows:** ${protectedIds.size}

## Tier 1 — Duplicate Consolidation
- **Duplicate clusters (level+word):** ${dupeClusters.length}
- **Rows to delete:** ${tier1ToDelete.length}
- **Method:** Hard delete (no \`deleted_at\` column on curriculum_vocabulary)
- **Student-protected clusters (keep all rows):** ${tier1Protected.length}
- **Source CSV:** \`exact-duplicates.csv\`

## Tier 2 — L4 Arabic-in-example Regeneration
- **Rows affected:** ${tier2Rows.length}
- **By level:** ${JSON.stringify(t2ByLevel)}
- **Method:** Regenerate \`example_sentence\` via Claude claude-sonnet-4-6
- **Estimated cost:** $${(tier2Rows.length * 400 / 1000000 * 3).toFixed(2)} (input) + $${(tier2Rows.length * 60 / 1000000 * 15).toFixed(2)} (output) ≈ $${((tier2Rows.length * 400 / 1000000 * 3) + (tier2Rows.length * 60 / 1000000 * 15)).toFixed(2)}

## Tier 3 — Minor Word/Example Mismatches
- **Rows affected:** ${tier3Rows.length}
- **By level:** ${JSON.stringify(t3ByLevel)}
- **Method:** Regenerate \`example_sentence\` via Claude claude-sonnet-4-6
- **Estimated cost:** $${(tier3Rows.length * 400 / 1000000 * 3).toFixed(2)} (input) + $${(tier3Rows.length * 60 / 1000000 * 15).toFixed(2)} (output) ≈ $${((tier3Rows.length * 400 / 1000000 * 3) + (tier3Rows.length * 60 / 1000000 * 15)).toFixed(2)}

## Columns to Add Before Tier 2/3
\`\`\`sql
ALTER TABLE curriculum_vocabulary
  ADD COLUMN IF NOT EXISTS regenerated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cleanup_run_id TEXT,
  ADD COLUMN IF NOT EXISTS original_example_sentence TEXT;
\`\`\`

## Expected Final State
- **Alive rows after Tier 1:** ${allVocab.length - tier1ToDelete.length}
- **Arabic in examples:** 0
- **Word/example mismatch:** 0
`

  fs.writeFileSync(path.join(OUT, 'CLEANUP-PLAN.md'), plan)

  console.log('\n=== Investigation complete ===')
  console.log(`Tier 1 deletions: ${tier1ToDelete.length}`)
  console.log(`Tier 2 rows:      ${tier2Rows.length}`)
  console.log(`Tier 3 rows:      ${tier3Rows.length}`)
  console.log(`Student-protected:${protectedIds.size}`)
  console.log('\nArtifacts saved to docs/audits/vocab/')

  await client.end()
  return results
}

main().catch(e => { console.error(e.message); process.exit(1) })
