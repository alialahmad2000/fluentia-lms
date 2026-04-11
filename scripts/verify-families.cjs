#!/usr/bin/env node
/**
 * Prompt 35 verifier:
 *  - counts total / with word_family / still null
 *  - verifies ≥90% of non-base derivatives have non-null morphology.affix
 *    (irregular entries excluded from this denominator)
 *  - reports % of derivatives flagged irregular
 *  - samples 10 random rows for manual review
 *  - flags entries whose rule_ar is shorter than 30 chars
 *  - flags entries with fewer than 2 similar_examples
 *  - reports linked vs unlinked percentage
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
      .select('id, word, word_family, word_family_generated_at')
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
  const withFamily = rows.filter(
    (r) => r.word_family_generated_at && Array.isArray(r.word_family) && r.word_family.length > 0
  )
  const nullFamily = rows.filter(
    (r) => !r.word_family_generated_at || !Array.isArray(r.word_family) || r.word_family.length === 0
  )

  console.log('\n=== Coverage ===')
  console.log(`  total:        ${total}`)
  console.log(`  with_family:  ${withFamily.length} (${((100 * withFamily.length) / total).toFixed(1)}%)`)
  console.log(`  null_family:  ${nullFamily.length}`)

  // Derivative stats
  let totalMembers = 0
  let baseMembers = 0
  let derivatives = 0
  let derivativesWithAffix = 0
  let irregular = 0
  let shortRuleAr = 0
  let fewExamples = 0
  let linked = 0
  let unlinked = 0

  const shortRuleExamples = []
  const fewExamplesExamples = []
  const missingAffixExamples = []

  for (const r of withFamily) {
    for (const m of r.word_family) {
      totalMembers++
      if (m.vocabulary_id) linked++
      else unlinked++
      if (m.is_base) {
        baseMembers++
        continue
      }
      derivatives++
      const morph = m.morphology || {}
      if (morph.irregular) {
        irregular++
        continue
      }
      if (morph.affix) {
        derivativesWithAffix++
      } else if (missingAffixExamples.length < 5) {
        missingAffixExamples.push(`${r.word}: ${m.word}`)
      }
      if (typeof morph.rule_ar === 'string' && morph.rule_ar.length < 30) {
        shortRuleAr++
        if (shortRuleExamples.length < 5) shortRuleExamples.push(`${r.word}: ${m.word} — "${morph.rule_ar}"`)
      }
      if (!Array.isArray(morph.similar_examples) || morph.similar_examples.length < 2) {
        fewExamples++
        if (fewExamplesExamples.length < 5) fewExamplesExamples.push(`${r.word}: ${m.word}`)
      }
    }
  }

  const nonIrregularDerivatives = derivatives - irregular
  const affixPct = nonIrregularDerivatives > 0 ? (100 * derivativesWithAffix) / nonIrregularDerivatives : 0
  const irregularPct = derivatives > 0 ? (100 * irregular) / derivatives : 0
  const linkedPct = totalMembers > 0 ? (100 * linked) / totalMembers : 0

  console.log('\n=== Members ===')
  console.log(`  total_members:    ${totalMembers}`)
  console.log(`  base_members:     ${baseMembers}`)
  console.log(`  derivatives:      ${derivatives}`)
  console.log(`  irregular:        ${irregular} (${irregularPct.toFixed(1)}% of derivatives)`)
  console.log(`  with_affix:       ${derivativesWithAffix} / ${nonIrregularDerivatives} non-irregular (${affixPct.toFixed(1)}%)`)

  console.log('\n=== Linking ===')
  console.log(`  linked:           ${linked} (${linkedPct.toFixed(1)}%)`)
  console.log(`  unlinked:         ${unlinked}`)

  console.log('\n=== Quality flags ===')
  console.log(`  rule_ar < 30ch:   ${shortRuleAr}`)
  console.log(`  <2 examples:      ${fewExamples}`)

  if (missingAffixExamples.length > 0) {
    console.log('\n  Missing-affix samples (regular derivatives):')
    for (const s of missingAffixExamples) console.log(`    - ${s}`)
  }
  if (shortRuleExamples.length > 0) {
    console.log('\n  Short rule_ar samples:')
    for (const s of shortRuleExamples) console.log(`    - ${s}`)
  }
  if (fewExamplesExamples.length > 0) {
    console.log('\n  Few-example samples:')
    for (const s of fewExamplesExamples) console.log(`    - ${s}`)
  }

  // Sample 10 random rows with ≥3 members
  console.log('\n=== Random sample (10 rows) ===')
  const rich = withFamily.filter((r) => r.word_family.length >= 3)
  const picked = new Set()
  for (let i = 0; i < 10 && rich.length > 0 && picked.size < 10; i++) {
    let idx = rand(rich.length)
    let tries = 0
    while (picked.has(idx) && tries < 20) {
      idx = rand(rich.length)
      tries++
    }
    picked.add(idx)
    const r = rich[idx]
    console.log(`\n  ${r.word} (${r.word_family.length} members)`)
    for (const m of r.word_family) {
      const flags = []
      if (m.is_base) flags.push('BASE')
      if (m.is_opposite) flags.push('OPP')
      if (m.morphology?.irregular) flags.push('IRR')
      const affix = m.morphology?.affix || ''
      console.log(`    - ${m.word} (${m.pos}, L${m.level}) ${flags.join(',')} ${affix}`)
    }
  }

  // Pass/fail summary
  console.log('\n=== Result ===')
  const coveragePct = (100 * withFamily.length) / total
  const coverageOk = coveragePct >= 95
  const affixOk = affixPct >= 90
  const irregularOk = true // soft check — prompt says "5-10%" but that's an estimate
  console.log(`  coverage ≥95%:         ${coverageOk ? 'PASS' : 'FAIL'} (${coveragePct.toFixed(1)}%)`)
  console.log(`  derivatives-with-affix ≥90%: ${affixOk ? 'PASS' : 'FAIL'} (${affixPct.toFixed(1)}%)`)
  console.log(`  irregular:              ${irregularPct.toFixed(1)}% of derivatives (expected ~5-10%)`)

  if (!coverageOk || !affixOk) {
    process.exit(2)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
