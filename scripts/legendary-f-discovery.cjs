const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://nmjexpuycmqcxuxljier.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEyNTYxOCwiZXhwIjoyMDg4NzAxNjE4fQ.Abbt3bzmud1B55ym_UW_3kEUMyVkhOiQ_iiLpHo1tfs'
);

async function check() {
  // 1. Students columns
  const { data: studentSample } = await sb.from('students').select('*').limit(1);
  console.log('=== Students columns ===');
  if (studentSample && studentSample[0]) console.log(Object.keys(studentSample[0]).join(', '));

  // 2. Profiles columns
  const { data: profileSample } = await sb.from('profiles').select('*').limit(1);
  console.log('\n=== Profiles columns ===');
  if (profileSample && profileSample[0]) console.log(Object.keys(profileSample[0]).join(', '));

  // 3. Groups columns
  const { data: groupSample } = await sb.from('groups').select('*').limit(1);
  console.log('\n=== Groups columns ===');
  if (groupSample && groupSample[0]) console.log(Object.keys(groupSample[0]).join(', '));

  // 4. student_skill_state
  const { count: skillCount } = await sb.from('student_skill_state').select('*', { count: 'exact', head: true });
  console.log('\n=== student_skill_state rows:', skillCount);

  // 5. Active students
  const { count: activeStudents } = await sb.from('students').select('*', { count: 'exact', head: true }).is('deleted_at', null);
  console.log('=== Active students:', activeStudents);

  // 6. Students missing skill_state
  const { data: allStudents } = await sb.from('students').select('id').is('deleted_at', null);
  const { data: allSkillStates } = await sb.from('student_skill_state').select('student_id');
  const skillIds = new Set((allSkillStates || []).map(function(s) { return s.student_id; }));
  const missing = (allStudents || []).filter(function(s) { return !skillIds.has(s.id); });
  console.log('=== Students missing skill_state:', missing.length);

  // 7. XP audit view
  const { data: auditData, error: auditErr } = await sb.from('student_xp_audit').select('*').limit(3);
  console.log('\n=== student_xp_audit rows (sample):', auditData ? auditData.length : 0, auditErr ? auditErr.message : '');
  if (auditData && auditData[0]) console.log('Audit columns:', Object.keys(auditData[0]).join(', '));

  // 8. Groups without trainer
  const { data: noTrainer } = await sb.from('groups').select('id, name').is('trainer_id', null);
  console.log('\n=== Groups without trainer:', noTrainer ? noTrainer.length : 0);
  if (noTrainer && noTrainer.length > 0) console.log('Groups:', noTrainer.map(function(g) { return g.name; }).join(', '));

  // 9. Existing progress_reports
  const { count: reportCount } = await sb.from('progress_reports').select('*', { count: 'exact', head: true });
  console.log('\n=== Existing progress_reports:', reportCount);
  const { data: reportSample } = await sb.from('progress_reports').select('*').limit(1);
  if (reportSample && reportSample[0]) console.log('Report columns:', Object.keys(reportSample[0]).join(', '));

  // 10. unified_activity_log
  const { count: ualCount } = await sb.from('unified_activity_log').select('*', { count: 'exact', head: true });
  console.log('\n=== unified_activity_log rows:', ualCount);

  // 11. student_saved_words
  const { count: wordsCount } = await sb.from('student_saved_words').select('*', { count: 'exact', head: true });
  console.log('=== student_saved_words rows:', wordsCount);

  // 12. Storage buckets
  const { data: buckets } = await sb.storage.listBuckets();
  console.log('\n=== Storage buckets:', (buckets || []).map(function(b) { return b.name; }).join(', '));

  // 13. Pick a real student and check their data
  const { data: sampleStudent } = await sb.from('students')
    .select('id, academic_level, package, group_id, xp_total, current_streak')
    .is('deleted_at', null)
    .gt('xp_total', 0)
    .limit(1)
    .single();

  if (sampleStudent) {
    console.log('\n=== Sample student ===');
    console.log('ID:', sampleStudent.id);
    console.log('Level:', sampleStudent.academic_level, 'Package:', sampleStudent.package);
    console.log('XP:', sampleStudent.xp_total, 'Streak:', sampleStudent.current_streak);

    // Profile name
    const { data: prof } = await sb.from('profiles').select('full_name, display_name').eq('id', sampleStudent.id).single();
    console.log('Name:', prof ? (prof.display_name || prof.full_name) : 'N/A');

    // Activity log for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count: recentActivity } = await sb.from('unified_activity_log')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', sampleStudent.id)
      .gte('occurred_at', thirtyDaysAgo);
    console.log('Activity last 30d:', recentActivity);

    // Skill state
    const { data: skillState } = await sb.from('student_skill_state').select('*').eq('student_id', sampleStudent.id).single();
    console.log('Skill state:', skillState ? JSON.stringify(skillState) : 'NONE');

    // Saved words
    const { count: wordCount } = await sb.from('student_saved_words').select('*', { count: 'exact', head: true }).eq('student_id', sampleStudent.id);
    console.log('Saved words:', wordCount);
  }
}

check().catch(function(e) { console.error(e.message); });
