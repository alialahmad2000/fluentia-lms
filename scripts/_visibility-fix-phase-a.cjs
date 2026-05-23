#!/usr/bin/env node
/**
 * MOCK-EXAM-VISIBILITY-FIX — Phase A (read-only forensic diagnosis)
 *
 * Prints findings to stdout, also writes machine-readable JSON to docs/.
 * NO MUTATIONS. Service-role used to bypass RLS for cross-student inspection.
 */
const fs = require('fs')
const path = require('path')

// load .env (same parser as scripts/lib/supa.mjs but in CJS)
const env = {}
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=')
  if (k && v.length) {
    let val = v.join('=').trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    val = val.replace(/\\n$/, '')
    env[k.trim()] = val
  }
})

const { createClient } = require('@supabase/supabase-js')
const url = env.VITE_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}
const admin = createClient(url, key, { auth: { persistSession: false } })

const findings = { generated_at: new Date().toISOString(), checks: {} }

function section(title) {
  console.log('\n' + '='.repeat(70))
  console.log(title)
  console.log('='.repeat(70))
}

async function rawSql(query) {
  // Use rpc('execute_sql') if it exists, otherwise fall back to per-table calls.
  // The Supabase JS client doesn't support arbitrary SQL — so we use HTTP postgres-meta
  // or rely on selecting from tables directly. For complex joins, use the REST URL.
  // Easiest: use rpc on a custom function if present, else do .from() chains.
  throw new Error('rawSql not used — see per-check functions below')
}

async function A1_affectedStudents() {
  section('A.1 — Identify affected students (all archived attempts)')
  // archive rows
  const { data: ar, error: arErr } = await admin
    .from('mock_exam_attempts_archive')
    .select('id, attempt_snapshot, archive_reason, archived_at')
  if (arErr) {
    console.error('archive query error:', arErr.message)
    findings.checks.A1 = { error: arErr.message }
    return []
  }
  console.log(`Archive rows: ${ar.length}`)
  const studentIds = [...new Set(ar.map(r => r.attempt_snapshot?.student_id).filter(Boolean))]
  console.log(`Distinct affected student IDs: ${studentIds.length}`)

  // profiles: name/email/role + is_test_account.  students: academic_level + group_id + status.
  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id, full_name, email, role, is_test_account')
    .in('id', studentIds)
  if (pErr) console.error('profile query error:', pErr.message)

  const { data: students, error: sErr } = await admin
    .from('students')
    .select('id, academic_level, group_id, status')
    .in('id', studentIds)
  if (sErr) console.error('students query error:', sErr.message)

  const studentById = new Map((students || []).map(s => [s.id, s]))

  const rows = (profiles || []).map(p => {
    const st = studentById.get(p.id) || {}
    const archiveRowsForStudent = ar.filter(r => r.attempt_snapshot?.student_id === p.id)
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: p.role,
      is_test_account: p.is_test_account ?? null,
      academic_level: st.academic_level ?? null, // INT — directly matches curriculum_levels.level_number
      group_id: st.group_id ?? null,
      status: st.status ?? null,
      archived_count: archiveRowsForStudent.length,
      archive_reasons: [...new Set(archiveRowsForStudent.map(r => r.archive_reason))],
      latest_archived_at: archiveRowsForStudent.map(r => r.archived_at).sort().slice(-1)[0],
    }
  }).sort((a,b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'))

  rows.forEach(r => {
    console.log(`  ${(r.full_name || '(no name)').padEnd(30)} | L${r.academic_level ?? '?'} | role=${r.role} | test=${r.is_test_account} | status=${r.status ?? '?'} | reasons=${r.archive_reasons.join(',')}`)
  })

  findings.checks.A1 = { archive_row_count: ar.length, affected_student_count: studentIds.length, students: rows }
  return rows
}

async function A2_activeAttempts(studentIds) {
  section('A.2 — Active attempts per affected student')
  const { data: active, error } = await admin
    .from('mock_exam_attempts')
    .select('id, student_id, exam_id, is_submitted, started_at, expires_at')
    .in('student_id', studentIds)
  if (error) {
    console.error(error.message)
    findings.checks.A2 = { error: error.message }
    return
  }
  const byStudent = new Map()
  active.forEach(a => {
    if (!byStudent.has(a.student_id)) byStudent.set(a.student_id, [])
    byStudent.get(a.student_id).push(a)
  })
  const out = studentIds.map(sid => ({
    student_id: sid,
    active_count: (byStudent.get(sid) || []).length,
    active_ids: (byStudent.get(sid) || []).map(a => a.id),
    submitted_count: (byStudent.get(sid) || []).filter(a => a.is_submitted).length,
  }))
  out.forEach(r => console.log(`  ${r.student_id.slice(0,8)}… active=${r.active_count} submitted=${r.submitted_count}`))
  const studentsWithActive = out.filter(r => r.active_count > 0)
  console.log(`\n  Students with active attempts: ${studentsWithActive.length} / ${studentIds.length}`)
  console.log(`  Expected: 0 (archive should have wiped everyone). If > 0, archive was partial.`)
  findings.checks.A2 = { active_summary: out, students_with_active: studentsWithActive.length }
}

async function A3_mockExamStartRPC() {
  section('A.3 — mock_exam_start RPC source')
  // Try to read pg_proc via direct REST URL (supabase-js doesn't expose pg_proc).
  // Fall back to reading the canonical migration file.
  const migrationDir = 'supabase/migrations'
  const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql'))
  const matches = []
  for (const f of files) {
    const src = fs.readFileSync(path.join(migrationDir, f), 'utf8')
    if (/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+(public\.)?mock_exam_start/i.test(src)) {
      matches.push(f)
    }
  }
  console.log(`Files defining mock_exam_start: ${matches.length}`)
  matches.forEach(f => console.log('  ' + f))
  findings.checks.A3 = { migrations_defining_rpc: matches }
  // Show the most recent one body
  if (matches.length) {
    const latest = matches.sort().slice(-1)[0]
    const src = fs.readFileSync(path.join(migrationDir, latest), 'utf8')
    const start = src.toLowerCase().indexOf('function ' + 'mock_exam_start')
    if (start >= 0) {
      const snippet = src.slice(Math.max(0, start - 50), Math.min(src.length, start + 4500))
      console.log('\n----- function body excerpt from ' + latest + ' -----')
      console.log(snippet)
      console.log('----- end excerpt -----')
      findings.checks.A3.latest_file = latest
      findings.checks.A3.body_excerpt = snippet
    }
  }
}

async function A5_perStudentVisibilityProbe(students) {
  section('A.5 — Frontend-equivalent visibility probe per affected student')
  // Fetch all exams
  const { data: exams, error: eErr } = await admin
    .from('mock_exams')
    .select('id, code, visibility, is_active, open_at, close_at, level_id')
  if (eErr) { console.error(eErr.message); findings.checks.A5 = { error: eErr.message }; return }
  const { data: levels } = await admin.from('curriculum_levels').select('id, level_number')
  const levelById = new Map((levels || []).map(l => [l.id, l]))
  exams.forEach(e => { e.level_number = levelById.get(e.level_id)?.level_number })

  const rows = []
  for (const s of students) {
    for (const e of exams) {
      const { count: attemptCount } = await admin
        .from('mock_exam_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('exam_id', e.id)
        .eq('student_id', s.id)
      rows.push({
        student: s.full_name,
        email: s.email,
        student_level: s.academic_level,
        student_is_test: s.is_test_account,
        exam_code: e.code,
        exam_level: e.level_number,
        visibility: e.visibility,
        is_active: e.is_active,
        open_at: e.open_at,
        close_at: e.close_at,
        level_check: e.level_number === s.academic_level ? 'MATCH' : 'MISMATCH',
        attempt_count: attemptCount || 0,
      })
    }
  }
  rows.forEach(r => {
    console.log(`  ${(r.student || '').padEnd(28)} | exam ${r.exam_code.padEnd(20)} | studentL=${r.student_level} examL=${r.exam_level} | ${r.level_check} | vis=${r.visibility} active=${r.is_active} test=${r.student_is_test} attempts=${r.attempt_count}`)
  })
  findings.checks.A5 = { rows, exams }
}

async function A7_notificationCheck(students) {
  section('A.7 — Mock-exam notifications received by each affected student')
  for (const s of students) {
    const { data: notifs, error } = await admin
      .from('notifications')
      .select('title, body, data, action_url, created_at, read')
      .eq('user_id', s.id)
      .order('created_at', { ascending: false })
      .limit(5)
    if (error) { console.error(s.full_name, error.message); continue }
    const mockNotifs = (notifs || []).filter(n => {
      const kind = n.data?.kind || ''
      return kind.toLowerCase().includes('mock-exam') || (n.action_url || '').includes('mock-exam')
    })
    console.log(`\n  ${s.full_name} (${s.email})`)
    if (!mockNotifs.length) {
      console.log('    NO mock-exam notifications found.')
    } else {
      mockNotifs.forEach(n => {
        console.log(`    [${n.created_at}] kind=${n.data?.kind ?? '(none)'} route=${n.action_url ?? '(none)'} read=${n.read}`)
        console.log(`        title: ${n.title}`)
      })
    }
  }
}

async function A8_frontendQueryReview() {
  section('A.8 — Frontend gating: where do students see (or not see) the exam?')
  const candidates = [
    'src/components/layout/Sidebar.jsx',
    'src/pages/student/mock-exam/MockExamGate.jsx',
    'src/pages/student/mock-exam/MockExamHub.jsx',
    'src/pages/student/mock-exam/MockExamAttempt.jsx',
  ]
  const out = {}
  for (const f of candidates) {
    const full = path.join(process.cwd(), f)
    if (!fs.existsSync(full)) { out[f] = '(missing)'; continue }
    const txt = fs.readFileSync(full, 'utf8')
    // search for visibility / staleTime / canSeeMockExam / mock_exams
    const lines = txt.split('\n')
    const interesting = []
    lines.forEach((line, i) => {
      if (/mock_exams|mock-exam|visibility|staleTime|canSeeMockExam|level_id|level_number|academic_level/i.test(line)) {
        interesting.push(`L${i+1}: ${line.trim().slice(0, 200)}`)
      }
    })
    out[f] = { line_count: lines.length, interesting: interesting.slice(0, 80) }
    console.log(`\n  ${f}  (${lines.length} lines, ${interesting.length} interesting)`)
    interesting.slice(0, 30).forEach(line => console.log('    ' + line))
    if (interesting.length > 30) console.log('    … (' + (interesting.length - 30) + ' more)')
  }
  findings.checks.A8 = out
}

async function main() {
  const rows = await A1_affectedStudents()
  const studentIds = rows.map(r => r.id)
  await A2_activeAttempts(studentIds)
  await A3_mockExamStartRPC()
  await A5_perStudentVisibilityProbe(rows)
  await A7_notificationCheck(rows)
  await A8_frontendQueryReview()

  fs.writeFileSync('docs/MOCK-EXAM-VISIBILITY-DIAGNOSIS-RAW.json', JSON.stringify(findings, null, 2))
  console.log('\nRaw findings written to docs/MOCK-EXAM-VISIBILITY-DIAGNOSIS-RAW.json')
}
main().catch(err => { console.error(err); process.exit(1) })
