const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 1. Trainers
  const { data: trainers } = await sb.from('profiles')
    .select('id, full_name, role').eq('role', 'trainer');
  console.log('Trainers:', trainers?.map(t => `${t.full_name} (${t.id.substring(0,8)})`));

  const trainer = trainers?.find(t => t.full_name.includes('محمد')) || trainers?.[0];
  if (!trainer) { console.log('No trainer found'); return; }
  console.log(`\nUsing trainer: ${trainer.full_name} (${trainer.id.substring(0,8)})`);

  // 2. Groups for this trainer
  const { data: groups } = await sb.from('groups')
    .select('id, name, level_id').eq('trainer_id', trainer.id);
  console.log(`\nGroups (${groups?.length}):`, groups?.map(g => `${g.name} (${g.id.substring(0,8)})`));

  // 3. Students in those groups
  const groupIds = groups?.map(g => g.id) || [];
  const { data: students, count } = await sb.from('profiles')
    .select('id, full_name, group_id, xp_points, current_streak', { count: 'exact' })
    .in('group_id', groupIds).eq('role', 'student');
  console.log(`\nStudents total: ${count}`);
  students?.slice(0, 5).forEach(s => console.log(`  ${s.full_name} (xp:${s.xp_points}, streak:${s.current_streak})`));

  // 4. XP activity last 7 days
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: activity, count: actCount } = await sb.from('xp_transactions')
    .select('user_id, created_at, amount', { count: 'exact' })
    .in('user_id', students?.map(s => s.id) || [])
    .gte('created_at', since)
    .limit(500);
  console.log(`\nXP events last 7 days: ${actCount}`);

  // 5. Activity tables check
  const actTables = ['activity_feed', 'student_curriculum_progress', 'curriculum_progress', 'vocab_mastery', 'game_sessions'];
  console.log('\n-- Activity tables:');
  for (const t of actTables) {
    const { count: c, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${error ? 'NOT FOUND' : c + ' rows'}`);
  }

  // 6. Schedule tables
  const schedTables = ['class_schedules', 'classes', 'group_schedules', 'sessions'];
  console.log('\n-- Schedule tables:');
  for (const t of schedTables) {
    const { count: c, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${error ? 'NOT FOUND' : c + ' rows'}`);
  }

  // 7. Grading tables
  const gradTables = ['writing_submissions', 'submissions', 'assignment_submissions', 'assignments'];
  console.log('\n-- Grading tables:');
  for (const t of gradTables) {
    const { count: c, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${error ? 'NOT FOUND' : c + ' rows'}`);
  }

  // 8. Competition
  console.log('\n-- Competition:');
  const { data: comp, error: cErr } = await sb.rpc('get_active_competition').maybeSingle();
  if (cErr) {
    console.log(`  get_active_competition: NOT FOUND (${cErr.message})`);
    // Try direct query
    const { data: comps, error: ce2 } = await sb.from('competitions')
      .select('id, name, status, start_date, end_date').eq('status', 'active').limit(1);
    console.log(`  competitions table direct: ${ce2 ? 'NOT FOUND' : JSON.stringify(comps?.[0] || null)}`);
  } else {
    console.log(`  get_active_competition: ${JSON.stringify(comp)}`);
  }

  // 9. xp_transactions columns
  const { data: xpCols } = await sb.from('information_schema.columns')
    .select('column_name').eq('table_schema', 'public').eq('table_name', 'xp_transactions');
  console.log(`\nxp_transactions columns: ${xpCols?.map(c => c.column_name).join(', ') || 'see direct'}`);

  // 10. Check profiles columns (for xp_points, current_streak)
  const { data: profCols } = await sb.from('information_schema.columns')
    .select('column_name').eq('table_schema', 'public').eq('table_name', 'profiles');
  console.log(`profiles columns: ${profCols?.map(c => c.column_name).join(', ') || 'n/a'}`);

  // 11. Check if AnimatedNumber component exists
  const fs = require('fs');
  const animPath = 'src/components/shared/AnimatedNumber.jsx';
  console.log(`\nAnimatedNumber exists: ${fs.existsSync(animPath)}`);

  // 12. Check if framer-motion installed
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`framer-motion: ${pkg.dependencies?.['framer-motion'] || 'NOT INSTALLED'}`);
    console.log(`motion package: ${pkg.dependencies?.['motion'] || 'not found'}`);
  } catch {}
})();
