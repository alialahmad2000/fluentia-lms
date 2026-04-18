const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 1. Trainers in profiles
  const { data: trainers, error: tErr } = await sb.from('profiles')
    .select('id, full_name, role')
    .eq('role', 'trainer');
  console.log(`\nTrainers found: ${trainers?.length || 0}`);
  trainers?.forEach(t => console.log(`  - ${t.full_name} (${t.id.substring(0,8)})`));

  // 2. Groups with trainer_id
  const { data: groups } = await sb.from('groups')
    .select('id, name, trainer_id')
    .limit(30);
  const withTrainer = groups?.filter(g => g.trainer_id) || [];
  console.log(`\nGroups with trainer_id set: ${withTrainer.length} / ${groups?.length || 0} total`);
  withTrainer.slice(0, 5).forEach(g => console.log(`  - ${g.name} → ${g.trainer_id?.substring(0,8)}`));

  // 3. xp_transactions columns
  const { data: xpCols } = await sb.from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_schema', 'public')
    .eq('table_name', 'xp_transactions')
    .order('ordinal_position');
  console.log(`\nxp_transactions columns: ${xpCols ? xpCols.map(c => c.column_name).join(', ') : 'TABLE NOT FOUND'}`);

  // 4. Check if our target tables already exist
  const targetTables = [
    'trainer_xp_events', 'trainer_streaks', 'student_interventions',
    'trainer_daily_rituals', 'nabih_conversations', 'nabih_messages', 'class_debriefs'
  ];
  const { data: existing } = await sb.from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', targetTables);
  console.log(`\nTarget tables already existing: ${existing?.length || 0}`);
  existing?.forEach(t => console.log(`  ⚠️  ${t.table_name} already exists`));
  const missing = targetTables.filter(t => !existing?.find(e => e.table_name === t));
  console.log(`Tables to create: ${missing.length}`);
  missing.forEach(t => console.log(`  + ${t}`));

  // 5. Distinct roles in profiles
  const { data: roles } = await sb.from('profiles')
    .select('role')
    .order('role');
  const distinctRoles = [...new Set(roles?.map(r => r.role))];
  console.log(`\nProfile roles: ${distinctRoles.join(', ')}`);

  // 6. trainers table structure
  const { data: trainerCols } = await sb.from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_schema', 'public')
    .eq('table_name', 'trainers')
    .order('ordinal_position');
  console.log(`\ntrainers table columns: ${trainerCols ? trainerCols.map(c => c.column_name).join(', ') : 'TABLE NOT FOUND'}`);

  // 7. groups.trainer_id column
  const { data: groupCols } = await sb.from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_schema', 'public')
    .eq('table_name', 'groups')
    .ilike('column_name', '%trainer%');
  console.log(`\ngroups trainer columns: ${groupCols?.map(c => `${c.column_name} (${c.data_type})`).join(', ') || 'none'}`);

  // 8. writing_submissions (for grading badge)
  const { count: pendingGrading } = await sb.from('writing_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted')
    .is('graded_at', null);
  console.log(`\nPending grading submissions: ${pendingGrading ?? 'table not found'}`);
})();
