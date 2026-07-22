#!/usr/bin/env node
/**
 * Re-grade every ALREADY-SUBMITTED tense-transformation worksheet with the
 * structure-first grader (utils/worksheetGrader.js) and repair the record:
 *   · targeted_exercises.score      → the corrected percentage
 *   · targeted_exercises.xp_awarded → the tier the corrected score earns
 *   · targeted_exercises.ai_feedback→ a short Arabic note naming what to work on
 *   · xp_transactions               → ONE delta row so the student's XP balance follows
 *
 * The old grading compared each cell to the model sentence, so every legitimate
 * answer that used a different object (unknowable from the given cell) or carried a
 * spelling slip was marked wrong. Student answers themselves are never modified.
 *
 * Idempotent: the XP delta is only inserted once (guarded on its description).
 *
 * Usage:  node scripts/regrade-worksheets.mjs [--apply]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gradeWorksheet } from '../src/utils/worksheetGrader.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REF = process.env.SUPABASE_PROJECT_REF || 'nmjexpuycmqcxuxljier'
const APPLY = process.argv.includes('--apply')

const TOKEN = (() => {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.mcp.json'), 'utf8')
  const m = raw.match(/sbp_[A-Za-z0-9]+/)
  if (!m) throw new Error('no sbp_ token in .mcp.json')
  return m[0]
})()

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0' },
    body: JSON.stringify({ query }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`)
  return text ? JSON.parse(text) : []
}
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`

const AR = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩']
const toAr = (n) => String(n ?? 0).replace(/\d/g, (d) => AR[+d])

const xpFor = (score) => (score >= 80 ? 15 : score >= 60 ? 10 : 5)

const BUCKETS = [
  { label: 'صيغة الفعل مع الزمن', codes: ['verb_form'] },
  { label: 'بناء السؤال والفعل المساعد', codes: ['wh_inversion', 'wh_no_aux', 'wh_missing', 'q_no_aux', 'q_is_wh', 'aux_wrong', 'aux_missing', 'be_missing', 'be_wrong'] },
  { label: 'النفي وصيغة الجملة', codes: ['negation_missing', 'negation_extra', 'statement_expected'] },
  { label: 'اكتمال الجملة', codes: ['verb_missing', 'subject', 'empty'] },
]

function feedbackAr(results, score) {
  const wrong = Object.values(results).filter((v) => !v.ok)
  const head = `أُعيد تصحيح ورقتك يدويًا بمعيار «التركيب» (الفعل المساعد، صيغة الفعل، النفي، ترتيب السؤال) — اختلاف المفعول أو الكلمات لم يعد يُحتسب خطأً. النتيجة بعد المراجعة: ${toAr(score)}٪.`
  if (!wrong.length) return `${head} لا ملاحظات — كل التحويلات صحيحة. أحسنت.`
  const parts = BUCKETS
    .map((b) => ({ label: b.label, n: wrong.filter((v) => b.codes.includes(v.code)).length }))
    .filter((b) => b.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((b) => `${b.label} (${toAr(b.n)})`)
  return `${head} الملاحظات المتبقية تتركّز في: ${parts.join('، ')}. الصواب مكتوب تحت كل خانة مع سبب مختصر.`
}

const rows = await sql(`
  select te.id, te.student_id, coalesce(p.display_name, p.full_name) as student, te.title,
         te.score as old_score, te.xp_awarded as old_xp, te.content, te.student_answers
  from targeted_exercises te left join profiles p on p.id = te.student_id
  where te.content->>'render' = 'worksheet' and te.status = 'completed'
  order by te.created_at;
`)

for (const r of rows) {
  const { results, correct, total, score } = gradeWorksheet(r.content, r.student_answers || {})
  const oldScore = Math.round(Number(r.old_score) || 0)
  const oldXp = r.old_xp || 0
  const newXp = xpFor(score)
  const delta = newXp - oldXp
  const fb = feedbackAr(results, score)
  const desc = `تصحيح مُراجَع: ${r.title}`

  console.log(`\n${r.student} — ${oldScore}% → ${score}% (${correct}/${total}) · XP ${oldXp} → ${newXp}`)
  console.log(`  ${fb}`)
  if (!APPLY) { console.log('  (dry run — pass --apply to write)'); continue }

  await sql(`
    update targeted_exercises
       set score = ${score}, xp_awarded = ${newXp}, ai_feedback = ${lit(fb)}
     where id = ${lit(r.id)};
  `)
  if (delta > 0) {
    await sql(`
      insert into xp_transactions (student_id, amount, reason, description)
      select ${lit(r.student_id)}, ${delta}, 'custom', ${lit(desc)}
      where not exists (
        select 1 from xp_transactions
        where student_id = ${lit(r.student_id)} and description = ${lit(desc)}
      );
    `)
  }
  console.log(`  ✓ written${delta > 0 ? ` (+${delta} XP)` : ''}`)
}

if (APPLY) {
  const check = await sql(`
    select coalesce(p.display_name,p.full_name) as student, te.score, te.xp_awarded, left(te.ai_feedback, 60) as fb
    from targeted_exercises te left join profiles p on p.id = te.student_id
    where te.content->>'render' = 'worksheet' and te.status='completed' order by te.created_at;
  `)
  console.log('\nfinal state:', JSON.stringify(check, null, 1))
}
