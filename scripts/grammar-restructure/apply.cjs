#!/usr/bin/env node
/**
 * Restructure the single-paragraph grammar explanations in the personalised
 * tracks (يسرا, سارة) into the sectioned shape the renderer supports.
 *
 *   node scripts/grammar-restructure/apply.cjs --dry
 *   node scripts/grammar-restructure/apply.cjs
 *
 * Safety:
 *   • pre-flight asserts every target row exists and still belongs to the
 *     student + unit the content was written for — a mis-typed uuid must fail,
 *     never overwrite another student's lesson;
 *   • the current explanation_content of every target is dumped to
 *     backup-<timestamp>.json BEFORE anything is written;
 *   • every UPDATE is read back and compared, because a successful statement
 *     can still have matched zero rows.
 */
const fs = require('fs')
const path = require('path')

const REF = process.env.SUPABASE_PROJECT_REF || 'nmjexpuycmqcxuxljier'
const DRY = process.argv.includes('--dry')

const LESSONS = [
  ...require('./content-yusra.cjs').map((l) => ({ ...l, student: 'يسرا' })),
  ...require('./content-sara.cjs').map((l) => ({ ...l, student: 'سارة' })),
]

function readToken() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '..', '.mcp.json'), 'utf8')
  const m = raw.match(/sbp_[A-Za-z0-9]+/)
  if (!m) throw new Error('No sbp_ token found in .mcp.json')
  return m[0]
}
const TOKEN = readToken()

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'curl/8.4.0',
    },
    body: JSON.stringify({ query }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`)
  try { return JSON.parse(text) } catch { return text }
}

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`

function jsonLit(obj) {
  const s = JSON.stringify(obj)
  if (s.includes('$gj$')) throw new Error('content collides with the dollar-quote tag')
  return `$gj$${s}$gj$::jsonb`
}

async function main() {
  const ids = LESSONS.map((l) => lit(l.id)).join(',')

  // ── Pre-flight ────────────────────────────────────────────────────────
  const before = await sql(`
    select g.id::text id, u.unit_number, coalesce(p.display_name, p.full_name) student,
           g.topic_name_en, g.explanation_content
    from curriculum_grammar g
    join curriculum_units u on u.id = g.unit_id
    left join profiles p on p.id = u.owner_student_id
    where g.id in (${ids});
  `)
  if (before.length !== LESSONS.length) {
    throw new Error(`pre-flight: expected ${LESSONS.length} rows, found ${before.length}`)
  }
  const byId = Object.fromEntries(before.map((r) => [r.id, r]))
  for (const l of LESSONS) {
    const row = byId[l.id]
    if (!row) throw new Error(`pre-flight: ${l.id} not found`)
    if (row.student !== l.student) {
      throw new Error(`pre-flight: ${l.id} belongs to "${row.student}", content written for "${l.student}"`)
    }
    if (row.unit_number !== l.unit) {
      throw new Error(`pre-flight: ${l.id} is unit ${row.unit_number}, content written for unit ${l.unit}`)
    }
  }
  console.log(`pre-flight OK — ${LESSONS.length} rows matched student + unit`)

  // ── Backup ────────────────────────────────────────────────────────────
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backup = path.join(__dirname, `backup-${stamp}.json`)
  fs.writeFileSync(backup, JSON.stringify(before, null, 2))
  console.log(`backup written → ${path.relative(process.cwd(), backup)}`)

  if (DRY) {
    for (const l of LESSONS) {
      const types = l.sections.map((s) => s.type).join(' + ')
      console.log(`  [dry] ${l.student} U${l.unit} — ${l.sections.length} sections: ${types}`)
    }
    return
  }

  // ── Write ─────────────────────────────────────────────────────────────
  let written = 0
  for (const l of LESSONS) {
    const res = await sql(`
      update curriculum_grammar
      set explanation_content = ${jsonLit({ sections: l.sections })},
          updated_at = now()
      where id = ${lit(l.id)}
      returning id::text,
                jsonb_array_length(explanation_content->'sections') n_sections;
    `)
    if (!res.length) throw new Error(`UPDATE matched 0 rows for ${l.id} (${l.student} U${l.unit})`)
    if (res[0].n_sections !== l.sections.length) {
      throw new Error(`readback mismatch for ${l.id}: ${res[0].n_sections} != ${l.sections.length}`)
    }
    written++
    console.log(`  ✓ ${l.student} U${l.unit} — ${res[0].n_sections} sections — ${l.topic}`)
  }

  // ── Verify ────────────────────────────────────────────────────────────
  const after = await sql(`
    select coalesce(p.display_name, p.full_name) student,
           count(*) lessons,
           min(jsonb_array_length(g.explanation_content->'sections')) min_sections,
           count(*) filter (where g.explanation_content::text like '%"examples"%') with_examples,
           count(*) filter (where g.explanation_content::text like '%"formula"%') with_formula,
           count(*) filter (where g.explanation_content::text like '%"common_mistakes"%') with_mistakes
    from curriculum_grammar g
    join curriculum_units u on u.id = g.unit_id
    join profiles p on p.id = u.owner_student_id
    where g.id in (${ids})
    group by 1 order by 1;
  `)
  console.log(`\nwrote ${written}/${LESSONS.length} lessons`)
  console.table(after)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
