const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // 1. Get Dr. Mohammed's ID
  const { data: mohammed, error: mErr } = await supabase
    .from('profiles').select('id, email, role')
    .eq('email', 'goldmohmmed@gmail.com').single();
  if (mErr || !mohammed) { console.error('Dr. Mohammed not found:', mErr?.message); process.exit(1); }
  console.log(`Dr. Mohammed ID: ${mohammed.id}`);

  // 2. Get B1 group (level 3, trained by Ali)
  const { data: groups } = await supabase
    .from('groups').select('id, name, level, trainer_id')
    .eq('level', 3)
    .eq('trainer_id', 'e5528ced-b3e2-45bb-8c89-9368dc9b5b96');
  if (!groups || groups.length !== 1) { console.error(`Expected 1 B1 group trained by Ali, found ${groups?.length}`); process.exit(1); }
  const b1 = groups[0];
  console.log(`B1 group: ${b1.name} (current trainer: ${b1.trainer_id})`);

  // 3. Verify Dr. Mohammed is in trainers table
  const { data: tr } = await supabase.from('trainers').select('id, is_active').eq('id', mohammed.id).single();
  if (!tr) { console.error('Dr. Mohammed missing from trainers table. Aborting.'); process.exit(1); }
  if (!tr.is_active) { console.error('Dr. Mohammed is inactive. Aborting.'); process.exit(1); }

  // 4. Update B1 group trainer
  const { data: updated, error: uErr } = await supabase
    .from('groups').update({ trainer_id: mohammed.id }).eq('id', b1.id).select();
  if (uErr || !updated || updated.length === 0) {
    console.error('Update failed (check RLS):', uErr?.message || 'silent failure'); process.exit(1);
  }
  console.log('B1 trainer updated to Dr. Mohammed');

  // 5. Verify
  const { data: verify } = await supabase
    .from('groups').select('name, level, trainer_id')
    .in('level', [1, 3]);
  for (const g of verify) {
    if (g.trainer_id) {
      const { data: p } = await supabase.from('profiles').select('email').eq('id', g.trainer_id).single();
      g.trainer_email = p?.email;
    }
  }
  console.table(verify);
  console.log('\nDone.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
