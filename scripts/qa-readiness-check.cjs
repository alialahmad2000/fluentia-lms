require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== TRAINER V2 QA READINESS ===\n');

  const { data: mohammed, error: me } = await sb
    .from('profiles').select('id, full_name').eq('email', 'goldmohmmed@gmail.com').single();
  if (me) { console.error('Trainer not found:', me.message); process.exit(1); }
  console.log(`Trainer: ${mohammed.full_name} (${mohammed.id})\n`);

  const { data: groups } = await sb
    .from('groups').select('id, name, level, current_unit_id').eq('trainer_id', mohammed.id);
  console.log(`Groups: ${groups.length}`);
  groups.forEach(g => console.log(`  - ${g.name} (Level ${g.level}) — unit: ${g.current_unit_id || 'MISSING ⚠️'}`));

  const groupIds = groups.map(g => g.id);

  const { data: students } = await sb
    .from('students').select('id').in('group_id', groupIds).eq('status', 'active');
  console.log(`Active students: ${students?.length || 0}\n`);

  const studentIds = (students || []).map(s => s.id);

  // Check tables existence + counts
  async function count(label, query) {
    const { count: c, error } = await query;
    const mark = error ? '❌' : c > 0 ? '✓' : '⚠️';
    const detail = error ? 'ERR: ' + error.message : String(c);
    console.log(`  ${mark} ${label}: ${detail}`);
    return c || 0;
  }

  console.log('DATA CHECKS:');

  await count('Pending interventions',
    sb.from('student_interventions').select('id', { count: 'exact', head: true }).eq('status', 'pending'));

  // Writing grading: student_curriculum_progress (not writing_submissions)
  await count('Pending writing grading (curriculum_progress)',
    sb.from('student_curriculum_progress').select('id', { count: 'exact', head: true })
      .eq('status', 'completed').eq('section_type', 'writing')
      .is('trainer_graded_at', null).not('ai_feedback', 'is', null));

  // Speaking grading: speaking_recordings with trainer_reviewed != true
  await count('Pending speaking grading (recordings)',
    sb.from('speaking_recordings').select('id', { count: 'exact', head: true })
      .neq('trainer_reviewed', true).not('ai_evaluation', 'is', null).eq('is_latest', true));

  // Trainer XP events
  await count('Trainer XP events (last 7d)',
    sb.from('trainer_xp_events').select('id', { count: 'exact', head: true })
      .eq('trainer_id', mohammed.id)
      .gte('day_of', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]));

  // Activity feed
  if (studentIds.length) {
    await count('Activity feed entries (30d)',
      sb.from('activity_feed').select('id', { count: 'exact', head: true })
        .in('student_id', studentIds)
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()));
  } else {
    console.log('  ⚠️ Activity feed: no students to check');
  }

  // Class summaries
  await count('Class summaries (last 30d)',
    sb.from('class_summaries').select('id', { count: 'exact', head: true })
      .in('group_id', groupIds)
      .gte('class_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]));

  // Active competition (start_at / end_at — not start_date/end_date)
  const now = new Date().toISOString();
  await count('Active competition',
    sb.from('competitions').select('id', { count: 'exact', head: true })
      .lte('start_at', now).gte('end_at', now));

  // Nabih tables
  await count('Nabih conversations (dr. mohammed)',
    sb.from('nabih_conversations').select('id', { count: 'exact', head: true })
      .eq('trainer_id', mohammed.id).eq('archived', false));

  // Student 360: check RPC exists
  const { data: insight, error: ie } = await sb.rpc('get_student_360_overview', {
    p_student_id: studentIds[0] || '00000000-0000-0000-0000-000000000000'
  }).single();
  console.log(`  ${ie ? '❌' : '✓'} get_student_360_overview RPC: ${ie ? ie.message : 'OK'}`);

  // Growth dashboard RPC
  const { data: growth, error: ge } = await sb.rpc('get_trainer_growth_dashboard', {
    p_trainer_id: mohammed.id
  });
  const kpi = growth?.kpis?.composite_score;
  console.log(`  ${ge ? '❌' : '✓'} get_trainer_growth_dashboard RPC: ${ge ? ge.message : 'OK (KPI=' + kpi + ')'}`);

  // Nabih RPCs
  const { data: convList, error: cle } = await sb.rpc('get_nabih_conversation_list', { p_limit: 5 });
  console.log(`  ${cle ? '❌' : '✓'} get_nabih_conversation_list RPC: ${cle ? cle.message : 'OK'}`);

  console.log('\n=== END ===');
  console.log('\nLegend: ✓ = data present | ⚠️ = empty (will show empty state) | ❌ = error');
  console.log('\nIf ⚠️ on grading queues: run a student writing/speaking submission');
  console.log('to seed real data. Or share which ⚠️ needs seeding.\n');
})().catch(e => { console.error('Script error:', e.message); process.exit(1); });
