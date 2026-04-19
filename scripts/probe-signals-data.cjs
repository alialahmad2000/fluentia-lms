const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 1. How stale is last_active for students?
  const { data: students, error: sErr } = await sb.from('students')
    .select('id, group_id, xp_total, current_streak, profile:profiles!inner(id, full_name, last_active_at)')
    .eq('status', 'active').is('deleted_at', null);

  if (sErr) { console.error('students error:', sErr.message); }
  console.log(`Total active students: ${students?.length || 0}`);

  const now = Date.now();
  const buckets = { active_24h: 0, silent_48h: 0, silent_7d: 0, never: 0 };
  students?.forEach(s => {
    const la = s.profile?.last_active_at;
    if (!la) { buckets.never++; return; }
    const h = (now - new Date(la).getTime()) / 3600000;
    if (h < 24) buckets.active_24h++;
    else if (h < 48) { /* between 24-48 */ }
    else if (h < 168) buckets.silent_48h++;
    else buckets.silent_7d++;
  });
  console.log('Activity buckets:', buckets);

  // 2. How many streak-at-risk (>18h idle)?
  const atRisk = students?.filter(s => {
    if ((s.current_streak || 0) < 3) return false;
    const la = s.profile?.last_active_at;
    if (!la) return true;
    const h = (now - new Date(la).getTime()) / 3600000;
    return h >= 18 && h < 24;
  });
  console.log(`Streak at risk (>=3 streak + 18-24h idle): ${atRisk?.length || 0}`);

  // 3. profiles.last_active_at column existence
  const { data: cols } = await sb.from('information_schema.columns')
    .select('column_name').eq('table_name', 'profiles')
    .in('column_name', ['last_active_at', 'last_seen_at', 'updated_at']);
  console.log('profiles activity columns:', cols?.map(c => c.column_name));

  // 4. students.last_active_at column
  const { data: sCols } = await sb.from('information_schema.columns')
    .select('column_name').eq('table_name', 'students')
    .in('column_name', ['last_active_at', 'last_seen_at']);
  console.log('students activity columns:', sCols?.map(c => c.column_name));

  // 5. Stuck on same unit
  const { data: progress, error: pErr } = await sb.from('student_curriculum_progress')
    .select('student_id, unit_id, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (pErr) console.error('progress error:', pErr.message);
  console.log(`Recent progress rows: ${progress?.length}`);

  // 6. Milestones
  const thresholds = [100, 500, 1000, 5000, 10000];
  const milestones = students?.filter(s => {
    return thresholds.some(t => s.xp_total >= t - 50 && s.xp_total <= t + 20);
  });
  console.log(`Near-milestone candidates: ${milestones?.length}`);

  // 7. Existing student_interventions
  const { count } = await sb.from('student_interventions').select('*', { count: 'exact', head: true });
  console.log(`Existing interventions: ${count}`);

  // 8. pg_cron / pg_net status — check via existing cron jobs
  const { data: cronJobs } = await sb.rpc('get_jobs_if_available').catch(() => ({ data: null }));
  // fallback: check interventions table columns
  const { data: intCols } = await sb.from('information_schema.columns')
    .select('column_name').eq('table_name', 'student_interventions').order('column_name');
  console.log('student_interventions columns:', intCols?.map(c => c.column_name));

  // 9. students table structure check
  const { data: stuCols } = await sb.from('information_schema.columns')
    .select('column_name').eq('table_name', 'students').order('column_name');
  console.log('students columns:', stuCols?.map(c => c.column_name));
})();
