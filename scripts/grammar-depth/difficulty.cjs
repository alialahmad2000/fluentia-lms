#!/usr/bin/env node
/**
 * Assign a difficulty tier (1-5) to every grammar exercise item.
 *
 * The audit found ZERO of the 2,356 grammar questions carried a difficulty
 * field — listening got 5 tiers, grammar got none. So there is no ramp inside a
 * lesson, no way to flag the genuinely hard question, and nothing to select
 * against adaptively later.
 *
 * Derived, not authored: the signal is already in the data — what the task asks
 * the student to DO (recognise vs produce), the CEFR level, and how much text
 * she has to hold. Zero API cost, and re-runnable if the bank changes.
 *
 *   node scripts/grammar-depth/difficulty.cjs --dry
 *   node scripts/grammar-depth/difficulty.cjs
 */
const fs = require('fs')
const path = require('path')

const REF = process.env.SUPABASE_PROJECT_REF || 'nmjexpuycmqcxuxljier'
const DRY = process.argv.includes('--dry')
const TOKEN = fs.readFileSync(path.join(__dirname, '..', '..', '.mcp.json'), 'utf8').match(/sbp_[A-Za-z0-9]+/)[0]

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0' },
    body: JSON.stringify({ query }),
  })
  const t = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`)
  try { return JSON.parse(t) } catch { return t }
}

// What the task asks her to DO — recognition is easiest, free production hardest.
const TYPE_WEIGHT = {
  choose: 1.0,
  fill_blank: 2.0,
  reorder: 2.6,
  error_correction: 3.0,
  transform: 3.6,
  make_question: 3.8,
}
const LEVEL_OFFSET = { 'Pre-A1': -0.4, A1: 0, A2: 0.4, B1: 0.9, B2: 1.4, C1: 1.8 }

function tierFor({ exercise_type, cefr, question, options }) {
  let d = TYPE_WEIGHT[exercise_type] ?? 2.0
  d += LEVEL_OFFSET[cefr] ?? 0.5
  const len = (question || '').length
  if (len > 140) d += 0.7
  else if (len > 90) d += 0.35
  const n = Array.isArray(options) ? options.length : 0
  if (n === 2) d -= 0.6           // a coin-flip is not a hard question
  else if (n >= 4) d += 0.2
  return Math.max(1, Math.min(5, Math.round(d)))
}

async function main() {
  const rows = await sql(`
    select e.id::text id, e.exercise_type, l.cefr,
           e.items->0->>'question' question,
           e.items->0->'options' options,
           e.items->0->>'difficulty' existing
    from curriculum_grammar_exercises e
    join curriculum_grammar g on g.id = e.grammar_id
    join curriculum_units u on u.id = g.unit_id
    join curriculum_levels l on l.id = u.level_id;`)

  const dist = {}
  const payload = rows.map((r) => {
    const d = tierFor(r)
    dist[d] = (dist[d] || 0) + 1
    return { id: r.id, d }
  })
  console.log(`items: ${rows.length}`)
  console.log('tier distribution:', Object.keys(dist).sort().map((k) => `${k}★ ${dist[k]} (${Math.round(100 * dist[k] / rows.length)}%)`).join('  '))
  if (DRY) return

  let written = 0
  for (let i = 0; i < payload.length; i += 60) {
    const chunk = payload.slice(i, i + 60)
    const values = chunk.map((p) => `('${p.id}'::uuid, ${p.d})`).join(',')
    const res = await sql(`
      update curriculum_grammar_exercises e
      set items = jsonb_set(e.items, '{0,difficulty}', to_jsonb(v.d))
      from (values ${values}) as v(id, d)
      where e.id = v.id and jsonb_typeof(e.items) = 'array' and jsonb_array_length(e.items) > 0
      returning e.id::text;`)
    written += res.length
    process.stdout.write(`\r  written ${written}/${payload.length}`)
  }
  console.log('')

  const check = await sql(`
    select count(*) total,
           count(*) filter (where items->0 ? 'difficulty') with_difficulty,
           count(distinct items->0->>'difficulty') distinct_tiers
    from curriculum_grammar_exercises;`)
  console.table(check)
}

main().catch((e) => { console.error(e.message || e); process.exit(1) })
