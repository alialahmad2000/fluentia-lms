const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MOHAMMED_ID = 'e8e64b7c-66df-43a7-83f7-9b96b660dcdd';
const ALI_ID      = 'e5528ced-b3e2-45bb-8c89-9368dc9b5b96';

async function trace(label, trainerId) {
  console.log(`\n══════ ${label} ══════`);

  const { data: groups } = await sb.from('groups')
    .select('id, name, level').eq('trainer_id', trainerId);
  console.log(`groups: ${groups?.length || 0} (${groups?.map(g=>g.name).join(', ')||'none'})`);

  const groupIds = (groups||[]).map(g=>g.id);
  const gPlaceholder = ['00000000-0000-0000-0000-000000000000'];
  const safeGroupIds = groupIds.length ? groupIds : gPlaceholder;

  const { data: students } = await sb.from('students')
    .select('id, group_id').in('group_id', safeGroupIds).eq('status','active').is('deleted_at',null);
  console.log(`students (active): ${students?.length || 0}`);

  const studentIds = (students||[]).map(s=>s.id);
  const safeStudentIds = studentIds.length ? studentIds : gPlaceholder;

  const sinceIso = new Date(Date.now()-7*24*60*60*1000).toISOString();
  const { data: activity, error: actErr } = await sb.from('activity_feed')
    .select('student_id, xp_amount, created_at').in('student_id', safeStudentIds).gte('created_at', sinceIso);
  console.log(`activity_feed 7d: ${actErr ? '❌ '+actErr.message : activity?.length||0}`);

  const { data: interventions } = await sb.from('student_interventions')
    .select('id').eq('trainer_id', trainerId).eq('status','open').limit(5);
  console.log(`open interventions: ${interventions?.length || 0}`);

  const { data: grading, error: gErr } = await sb.rpc('get_trainer_grading_queue', {
    p_trainer_id: trainerId, p_limit: 5
  });
  console.log(`grading queue: ${gErr ? '❌ '+gErr.message : grading?.length||0}`);

  const { data: nextClass } = await sb.from('classes')
    .select('id, date, start_time').eq('trainer_id', trainerId).eq('status','scheduled')
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date',{ascending:true}).limit(1);
  console.log(`next class: ${nextClass?.[0] ? `${nextClass[0].date} ${nextClass[0].start_time}` : 'none (classes table empty or no match)'}`);

  const { data: ritual } = await sb.from('trainer_daily_rituals')
    .select('id').eq('trainer_id', trainerId).eq('day_of', new Date().toISOString().split('T')[0]).maybeSingle();
  console.log(`today ritual: ${ritual ? 'done' : 'not done'}`);
}

(async () => {
  await trace('د. محمد (A1)', MOHAMMED_ID);
  await trace('علي (B1)', ALI_ID);
  console.log('\n✅ Data trace complete');
})().catch(e => { console.error(e); process.exit(1); });
