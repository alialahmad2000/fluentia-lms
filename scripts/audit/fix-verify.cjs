require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALI_ID      = 'e5528ced-b3e2-45bb-8c89-9368dc9b5b96';
const MOHAMMED_ID = 'e8e64b7c-66df-43a7-83f7-9b96b660dcdd';
const B1_GROUP_ID = 'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa';
const A1_GROUP_ID = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb';

let pass = 0; let fail = 0;

function check(label, ok, detail = '') {
  if (ok) { console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); pass++ }
  else     { console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); fail++ }
}

(async () => {
  // 1. Active B1 group trainer_id === Ali
  const { data: b1 } = await sb.from('groups').select('trainer_id,name').eq('id', B1_GROUP_ID).single();
  check('B1 (المجموعة 4) trainer_id = Ali', b1?.trainer_id === ALI_ID,
    `got ${b1?.trainer_id}`);

  // 2. Mohammed still on A1 only
  const { data: a1 } = await sb.from('groups').select('trainer_id,name').eq('id', A1_GROUP_ID).single();
  check('A1 (المجموعة 2) trainer_id = Mohammed', a1?.trainer_id === MOHAMMED_ID,
    `got ${a1?.trainer_id}`);

  // 3. Ali has trainers row with is_active=true
  const { data: aliTrainer } = await sb.from('trainers').select('id,is_active').eq('id', ALI_ID).maybeSingle();
  check('Ali has trainers row, is_active=true', aliTrainer?.is_active === true);

  // 4. get_trainer_grading_queue executes without error for Mohammed
  const { data: queue, error: qErr } = await sb.rpc('get_trainer_grading_queue', {
    p_trainer_id: MOHAMMED_ID, p_limit: 5
  });
  check('get_trainer_grading_queue runs without error', !qErr,
    qErr ? qErr.message : `returned ${queue?.length ?? 0} rows`);

  // 5. activity_feed query with student_id returns rows (or empty — column exists check)
  const { data: af, error: afErr } = await sb.from('activity_feed')
    .select('student_id, xp_amount').limit(1);
  check('activity_feed.student_id + xp_amount columns exist', !afErr,
    afErr ? afErr.message : 'columns confirmed');

  console.log(`\n${pass === 5 ? '✅ All 5 fixes verified.' : `❌ ${fail}/${pass+fail} assertions failed.`}`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e.message); process.exit(1); });
