#!/usr/bin/env node
/*  assign-tasks.cjs — hand off trainer-authored tasks onto a student's «تمارين مخصّصة»
    board (targeted_exercises). NO AI. Ali describes the tasks; Claude Code encodes them
    into a spec JSON; this inserts them as `status='pending'` for that student.

    Usage:
      node scripts/assign-tasks.cjs <spec.json>
      node scripts/assign-tasks.cjs <spec.json> --dry     # print SQL, don't write

    Spec shape:
      {
        "student_id": "f1ebe336-...",           // required (or "student_ids": [...])
        "replace_pending": false,                // optional: soft-clear this student's
                                                 //   pending manual tasks first (see below)
        "tasks": [
          {
            "title": "Past Simple — Sentence Transformation",   // shown on the card
            "skill": "grammar",                  // grammar|vocabulary|reading|listening|speaking|writing
            "difficulty": "medium",              // easy|medium|hard
            "instructions": "حوّل كل جملة إلى الماضي البسيط.",
            "content": {
              "type": "multiple_choice",         // or "fill_blank" / "rewrite"
              "questions": [
                { "id": "q1", "question": "She ___ (go) home.",
                  "options": ["go","went","goes","gone"], "correct_answer": "went",
                  "explanation": "الماضي البسيط لـ go هو went." },
                { "id": "q2", "question": "They ___ (play) football.",
                  "correct_answer": "played", "accepted_answers": ["played"],
                  "explanation": "أضف -ed للأفعال المنتظمة." }
              ]
            }
          }
        ]
      }

    Grading is automatic (the page compares each answer to correct_answer / accepted_answers,
    case-insensitive) — same engine already live. XP is awarded on submit. pattern_id stays
    NULL (these are manual, not AI-pattern tasks).                                        */

const fs = require('fs')
const path = require('path')

const REF = process.env.SUPABASE_PROJECT_REF || 'nmjexpuycmqcxuxljier'
const SKILLS = new Set(['grammar', 'vocabulary', 'reading', 'listening', 'speaking', 'writing'])
const DIFFS = new Set(['easy', 'medium', 'hard'])

function token() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.mcp.json'), 'utf8')
  const m = raw.match(/sbp_[A-Za-z0-9]+/)
  if (!m) throw new Error('No sbp_ token in .mcp.json')
  return m[0]
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`           // SQL string literal
const j = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`

async function runSql(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`Management API ${res.status}: ${body}`)
  return body
}

function validateTask(t, i) {
  const where = `tasks[${i}]`
  if (!t.title) throw new Error(`${where}: missing title`)
  if (!SKILLS.has(t.skill)) throw new Error(`${where}: skill must be one of ${[...SKILLS].join('/')}`)
  if (t.difficulty && !DIFFS.has(t.difficulty)) throw new Error(`${where}: difficulty must be easy|medium|hard`)
  const qs = t.content?.questions
  if (!Array.isArray(qs) || qs.length === 0) throw new Error(`${where}: content.questions must be a non-empty array`)
  qs.forEach((question, qi) => {
    if (!question.id) question.id = `q${qi + 1}`
    if (!question.question) throw new Error(`${where}.questions[${qi}]: missing question text`)
    if (question.correct_answer == null && !Array.isArray(question.accepted_answers))
      throw new Error(`${where}.questions[${qi}]: need correct_answer or accepted_answers`)
  })
}

async function main() {
  const specPath = process.argv[2]
  const dry = process.argv.includes('--dry')
  if (!specPath) { console.error('usage: node scripts/assign-tasks.cjs <spec.json> [--dry]'); process.exit(1) }

  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
  const students = spec.student_ids || (spec.student_id ? [spec.student_id] : [])
  if (students.length === 0) throw new Error('spec: student_id or student_ids required')
  if (!Array.isArray(spec.tasks) || spec.tasks.length === 0) throw new Error('spec: tasks[] required')
  spec.tasks.forEach(validateTask)

  const stmts = []
  for (const sid of students) {
    if (spec.replace_pending) {
      // soft-clear existing PENDING manual tasks (pattern_id IS NULL) so re-runs don't pile up;
      // completed tasks + AI-pattern tasks are never touched.
      stmts.push(`DELETE FROM public.targeted_exercises WHERE student_id = ${q(sid)} AND status = 'pending' AND pattern_id IS NULL;`)
    }
    for (const t of spec.tasks) {
      stmts.push(
        `INSERT INTO public.targeted_exercises (student_id, pattern_id, skill, title, instructions, content, difficulty, status)` +
        ` VALUES (${q(sid)}, NULL, ${q(t.skill)}, ${q(t.title)}, ${q(t.instructions || '')}, ${j(t.content)}, ${q(t.difficulty || 'medium')}, 'pending');`
      )
    }
  }
  const sql = stmts.join('\n')

  if (dry) { console.log(sql); return }
  await runSql(sql)
  console.log(`✓ assigned ${spec.tasks.length} task(s) to ${students.length} student(s).`)
  // show the resulting board for the first student
  const check = await runSql(`SELECT title, skill, difficulty, status FROM public.targeted_exercises WHERE student_id = ${q(students[0])} AND status='pending' ORDER BY created_at DESC LIMIT 20;`)
  console.log(check)
}

main().catch((e) => { console.error('✗', e.message); process.exit(1) })
