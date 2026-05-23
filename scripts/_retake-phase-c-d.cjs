#!/usr/bin/env node
/**
 * MOCK-EXAM-RETAKE — Phase C (visibility verify) + Phase D (re-notify)
 *
 * For each student archived under reason='retake_after_save_chain_fix_2026-05-23':
 *  C — simulate the frontend's landing query: confirm the live exam matches
 *      the student's academic_level AND there's no current attempt row.
 *  D — insert a personalized in-app notification (idempotent on data.kind +
 *      user_id) routing them to /student/mock-exam.
 */
const fs = require('fs')
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
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const REASON = 'retake_after_save_chain_fix_2026-05-23'
const NOTIF_KIND = 'mock-exam-retake-2026-05-23'

async function main() {
  console.log('=== Phase C + D — Verify visibility + notify ===\n')

  // 1. Affected student IDs (from archive table by reason)
  const { data: archived } = await admin
    .from('mock_exam_attempts_archive')
    .select('attempt_snapshot')
    .eq('archive_reason', REASON)
  const studentIds = [...new Set((archived || []).map(r => r.attempt_snapshot?.student_id).filter(Boolean))]
  console.log(`Archived students under reason="${REASON}": ${studentIds.length}`)

  if (!studentIds.length) {
    console.log('Nothing to verify or notify — exiting.')
    return
  }

  // 2. Fetch profiles + students + levels in parallel
  const [{ data: profiles }, { data: students }, { data: exams }, { data: levels }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, role').in('id', studentIds),
    admin.from('students').select('id, academic_level').in('id', studentIds),
    admin.from('mock_exams').select('id, code, visibility, is_active, open_at, close_at, level_id').eq('is_active', true).eq('visibility', 'live'),
    admin.from('curriculum_levels').select('id, level_number'),
  ])
  const levelById = new Map((levels || []).map(l => [l.id, l]))
  exams.forEach(e => { e.level_number = levelById.get(e.level_id)?.level_number })
  const studentById = new Map((students || []).map(s => [s.id, s]))
  const profileById = new Map((profiles || []).map(p => [p.id, p]))

  // 3. Phase C — simulate frontend landing query per student
  console.log('\n--- Phase C — frontend-equivalent visibility per affected student ---')
  const results = []
  for (const sid of studentIds) {
    const s = studentById.get(sid) || {}
    const p = profileById.get(sid) || {}
    const matchingExam = exams.find(e => e.level_number === s.academic_level)
    const { count: activeAttempts } = await admin
      .from('mock_exam_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', sid)
    const ok = !!matchingExam && activeAttempts === 0
    console.log(`  ${(p.full_name || '?').padEnd(28)} <${p.email}>  L${s.academic_level}  matching=${matchingExam?.code ?? 'NONE'}  active=${activeAttempts}  ${ok ? '✓ INTRO' : '✗ check'}`)
    results.push({ student_id: sid, name: p.full_name, email: p.email, level: s.academic_level, matching_exam_code: matchingExam?.code, active_attempts: activeAttempts, ok })
  }

  // 4. Phase D — re-notify each (idempotent on kind+user_id)
  console.log('\n--- Phase D — Insert per-student notifications ---')
  for (const sid of studentIds) {
    const p = profileById.get(sid) || {}
    // Idempotency: skip if same kind already exists for this user
    const { data: existing } = await admin
      .from('notifications')
      .select('id, created_at')
      .eq('user_id', sid)
      .eq('type', 'announcement')
      .filter('data->>kind', 'eq', NOTIF_KIND)
      .limit(1)
    if (existing && existing.length) {
      console.log(`  ${p.full_name}: notification already exists (${existing[0].id}, ${existing[0].created_at}) — skipping`)
      continue
    }
    const { data: inserted, error: insErr } = await admin
      .from('notifications')
      .insert({
        user_id: sid,
        type: 'announcement',
        title: '✨ محاولة جديدة جاهزة لكِ',
        body: 'تم إعادة فتح الاختبار التجريبي لكِ بمحاولة فريش. النظام تم تحصينه ضد المشكلة السابقة. ادخلي الآن واختبري — النافذة مفتوحة حتى ١٠م الأحد.',
        data: {
          kind: NOTIF_KIND,
          priority: 'urgent',
          action_label: 'الذهاب إلى الاختبار',
          action_route: '/student/mock-exam',
          expires_at: '2026-05-24T19:00:00+00:00',
        },
        priority: 'high',
        action_url: '/student/mock-exam',
        action_label: 'الذهاب إلى الاختبار',
        expires_at: '2026-05-24T19:00:00+00:00',
        read: false,
      })
      .select('id')
    if (insErr) console.log(`  ✗ ${p.full_name}: ${insErr.message}`)
    else console.log(`  ✓ ${p.full_name}: notification id=${inserted?.[0]?.id}`)
  }

  fs.writeFileSync('docs/MOCK-EXAM-RETAKE-PHASE-CD-RAW.json', JSON.stringify({ verify: results, reason: REASON, kind: NOTIF_KIND, generated_at: new Date().toISOString() }, null, 2))
  console.log('\nResults → docs/MOCK-EXAM-RETAKE-PHASE-CD-RAW.json')
}
main().catch(err => { console.error(err); process.exitCode = 1 })
