#!/usr/bin/env node
/**
 * Verifies the structure-first worksheet grader against the REAL submissions of the
 * two students who have already handed this worksheet in, and against the verdicts
 * Dr. Ali's grading policy asks for (structure > object/wording).
 *
 * Usage: node scripts/_test-worksheet-grader.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gradeWorksheet } from '../src/utils/worksheetGrader.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REF = process.env.SUPABASE_PROJECT_REF || 'nmjexpuycmqcxuxljier'

function token() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.mcp.json'), 'utf8')
  const m = raw.match(/sbp_[A-Za-z0-9]+/)
  if (!m) throw new Error('no sbp_ token in .mcp.json')
  return m[0]
}

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0' },
    body: JSON.stringify({ query }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`)
  return JSON.parse(text)
}

// The verdicts this worksheet SHOULD produce (hand-graded by Dr. Ali's rule:
// the transformation is what counts; the object/wording is not).
const EXPECTED_WRONG = {
  'سارة': ['ps-2-q', 'pc-2-neg'],
  'ظافر': ['ps-0-aff', 'ps-0-wh', 'ps-1-wh', 'ps-2-aff', 'ps-2-wh',
           'pas-0-aff', 'pas-1-aff', 'pas-2-aff', 'pastc-0-wh', 'pastc-1-wh'],
}

const rows = await sql(`
  select te.id, coalesce(p.display_name,p.full_name) as student, te.score as old_score,
         te.content, te.student_answers
  from targeted_exercises te left join profiles p on p.id = te.student_id
  where te.content->>'render' = 'worksheet' and te.status = 'completed'
  order by te.created_at;
`)

let failures = 0
for (const r of rows) {
  const { results, correct, total, score } = gradeWorksheet(r.content, r.student_answers || {})
  const wrong = Object.entries(results).filter(([, v]) => !v.ok).map(([k]) => k).sort()
  const expected = (EXPECTED_WRONG[r.student] || []).slice().sort()

  console.log(`\n═══ ${r.student} — old ${Number(r.old_score)}% → new ${score}% (${correct}/${total})`)
  const qmap = Object.fromEntries((r.content.questions || []).map((q) => [q.id, q]))
  for (const [qid, v] of Object.entries(results)) {
    const mark = v.ok ? (v.code === 'exact' ? '✓' : '✓~') : '✗'
    if (v.ok && v.code === 'exact') continue // only show the interesting ones
    console.log(
      `  ${mark.padEnd(3)} ${qid.padEnd(11)} ${String(r.student_answers?.[qid] ?? '').padEnd(46)}` +
      `| ${String(qmap[qid]?.correct_answer ?? '').padEnd(44)}| ${v.code}`
    )
  }

  const missing = expected.filter((q) => !wrong.includes(q))   // should be wrong, graded right
  const extra = wrong.filter((q) => !expected.includes(q))     // should be right, graded wrong
  if (missing.length || extra.length) {
    failures++
    console.log(`  ✗ MISMATCH  too-lenient: [${missing}]   too-strict: [${extra}]`)
  } else {
    console.log(`  ✓ matches the hand-graded verdict exactly (${wrong.length} wrong)`)
  }
}

console.log(failures ? `\n❌ ${failures} worksheet(s) mismatched` : '\n✅ all worksheets match the hand-graded verdict')
process.exit(failures ? 1 : 0)
