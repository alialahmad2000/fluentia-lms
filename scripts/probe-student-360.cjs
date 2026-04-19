require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

;(async () => {
  // 1. Find trainer
  const { data: trainer } = await sb.from('profiles').select('id, full_name').eq('email', 'goldmohmmed@gmail.com').single()
  console.log('Trainer:', trainer?.full_name, trainer?.id?.slice(0, 8))

  // 2. Trainer's groups
  const { data: groups } = await sb.from('groups').select('id, name, level').eq('trainer_id', trainer.id)
  console.log('Groups:', groups?.map(g => `${g.name} (L${g.level})`).join(', '))
  const groupIds = (groups || []).map(g => g.id)

  // 3. Sample student - try profile_id and id join
  const { data: students, error: sErr } = await sb
    .from('students')
    .select('id, profiles(full_name, avatar_url, email), group_id, status, created_at, last_active_at, total_xp, current_streak')
    .in('group_id', groupIds).eq('status', 'active').is('deleted_at', null).limit(3)
  console.log('\n=== STUDENTS (first 3) ===')
  if (sErr) console.log('students error:', sErr.message)
  else students?.forEach(s => console.log(' -', s.profiles?.full_name, `| xp=${s.total_xp} streak=${s.current_streak} last_active=${s.last_active_at?.slice(0,10)}`))

  const sample = students?.[0]
  if (!sample) { console.log('NO STUDENTS'); process.exit(1) }
  const sid = sample.id
  console.log('\nUsing student:', sample.profiles?.full_name, 'id:', sid.slice(0, 8))

  // 4. Activity feed
  const { count: actCount, error: actErr } = await sb.from('activity_feed').select('*', { count: 'exact', head: true }).eq('student_id', sid).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
  console.log('\nActivity feed 30d:', actCount, actErr?.message || '')

  // 5. XP transactions
  const { count: xpCount, error: xpErr } = await sb.from('xp_transactions').select('*', { count: 'exact', head: true }).eq('student_id', sid)
  console.log('XP transactions total:', xpCount, xpErr?.message || '')

  // 6. Writing submissions
  const { count: wCount, error: wErr } = await sb.from('writing_submissions').select('*', { count: 'exact', head: true }).eq('student_id', sid)
  console.log('writing_submissions:', wCount, wErr?.message || '')

  // 7. Speaking tables
  for (const tbl of ['speaking_recordings', 'speaking_submissions']) {
    const { count, error } = await sb.from(tbl).select('*', { count: 'exact', head: true }).eq('student_id', sid)
    console.log(`${tbl}:`, error ? error.message : count)
  }

  // 8. Vocabulary
  const { count: vCount, error: vErr } = await sb.from('vocabulary_attempts').select('*', { count: 'exact', head: true }).eq('student_id', sid)
  console.log('vocabulary_attempts:', vCount, vErr?.message || '')
  const { count: vmCount, error: vmErr } = await sb.from('vocabulary_mastery').select('*', { count: 'exact', head: true }).eq('student_id', sid)
  console.log('vocabulary_mastery:', vmCount !== null ? vmCount : vmErr?.message)

  // 9. Curriculum progress
  const { count: cpCount, error: cpErr } = await sb.from('student_curriculum_progress').select('*', { count: 'exact', head: true }).eq('student_id', sid)
  console.log('student_curriculum_progress:', cpCount, cpErr?.message || '')

  // 10. Interventions
  const { count: iCount, error: iErr } = await sb.from('student_interventions').select('*', { count: 'exact', head: true }).eq('student_id', sid)
  console.log('student_interventions:', iCount, iErr?.message || '')

  // 11. Attendance
  const { count: aCount, error: aErr } = await sb.from('attendance').select('*', { count: 'exact', head: true }).eq('student_id', sid)
  console.log('attendance:', aCount, aErr?.message || '')

  // 12. Trainer notes
  const { count: tnCount, error: tnErr } = await sb.from('trainer_notes').select('*', { count: 'exact', head: true }).eq('student_id', sid)
  console.log('trainer_notes:', tnCount, tnErr?.message || '')

  // 13. Phone field
  const { data: profCols } = await sb.from('profiles').select('phone').eq('id', sample.profiles?.id || sid).maybeSingle().catch(() => ({ data: null }))
  console.log('\nProfiles phone field exists:', profCols !== null && 'phone' in (profCols || {}))

  // 14. vocabulary_attempts schema
  const { data: vSample } = await sb.from('vocabulary_attempts').select('*').eq('student_id', sid).limit(1)
  console.log('\nvocabulary_attempts sample keys:', vSample?.[0] ? Object.keys(vSample[0]).join(', ') : 'no rows')

  // 15. vocabulary_mastery schema
  const { data: vmSample } = await sb.from('vocabulary_mastery').select('*').eq('student_id', sid).limit(1).catch(() => ({ data: null }))
  console.log('vocabulary_mastery sample keys:', vmSample?.[0] ? Object.keys(vmSample[0]).join(', ') : (vmSample === null ? 'table not found' : 'no rows'))

  // 16. Check students table columns for ai_insight_cache
  const { data: stSample } = await sb.from('students').select('*').eq('id', sid).single()
  const studentCols = stSample ? Object.keys(stSample) : []
  console.log('\nstudents columns:', studentCols.join(', '))
  console.log('has ai_insight_cache:', studentCols.includes('ai_insight_cache'))

  // 17. grading_events
  const { count: geCount, error: geErr } = await sb.from('grading_events').select('*', { count: 'exact', head: true }).eq('student_id', sid)
  console.log('\ngrading_events:', geCount, geErr?.message || '')

  // 18. peer_recognitions
  const { count: prCount, error: prErr } = await sb.from('peer_recognitions').select('*', { count: 'exact', head: true }).eq('receiver_student_id', sid)
  console.log('peer_recognitions:', prCount !== null ? prCount : prErr?.message)

  // 19. Check attendance columns
  const { data: attSample } = await sb.from('attendance').select('*').eq('student_id', sid).limit(1)
  console.log('attendance sample keys:', attSample?.[0] ? Object.keys(attSample[0]).join(', ') : 'no rows')

  // 20. speaking_recordings final_score + graded_at columns
  const { data: spkSample } = await sb.from('speaking_recordings').select('*').eq('student_id', sid).limit(1)
  console.log('speaking_recordings sample keys:', spkSample?.[0] ? Object.keys(spkSample[0]).join(', ') : 'no rows')

  // 21. writing_submissions schema
  const { data: wrSample } = await sb.from('writing_submissions').select('*').eq('student_id', sid).limit(1)
  console.log('writing_submissions sample keys:', wrSample?.[0] ? Object.keys(wrSample[0]).join(', ') : 'no rows')

  // 22. xp_transactions columns
  const { data: xpSample } = await sb.from('xp_transactions').select('*').eq('student_id', sid).limit(1)
  console.log('xp_transactions sample keys:', xpSample?.[0] ? Object.keys(xpSample[0]).join(', ') : 'no rows')

  // 23. student_interventions columns
  const { data: siSample } = await sb.from('student_interventions').select('*').eq('student_id', sid).limit(1)
  console.log('student_interventions sample keys:', siSample?.[0] ? Object.keys(siSample[0]).join(', ') : 'no rows')

  // 24. trainer_notes columns
  const { data: tnSample } = await sb.from('trainer_notes').select('*').eq('student_id', sid).limit(1)
  console.log('trainer_notes sample keys:', tnSample?.[0] ? Object.keys(tnSample[0]).join(', ') : 'no data, structure: id, trainer_id, student_id, note_type, content, created_at, updated_at')

  // 25. Curriculum progress sample
  const { data: cpSample } = await sb.from('student_curriculum_progress').select('*').eq('student_id', sid).limit(2)
  console.log('student_curriculum_progress sample keys:', cpSample?.[0] ? Object.keys(cpSample[0]).join(', ') : 'no rows')
})()
