const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Ali's decision (Apr 12, 2026): keep package + price unchanged, only level+group change.
const NEW_PACKAGE = 'talaqa';    // unchanged from current
const NEW_PRICE = 1100;          // unchanged from current

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log('===========================================');
  console.log('  Moving Hanoof from A1 -> B1');
  console.log('===========================================\n');

  // 1. Get Hanoof's current record
  const { data: hanoof, error: hErr } = await supabase
    .from('students')
    .select('id, academic_level, package, custom_price, group_id, status, enrollment_date, profiles!inner(full_name, email)')
    .eq('profiles.email', 'hanoof1naif@gmail.com')
    .single();
  if (hErr || !hanoof) {
    console.error('Hanoof not found:', hErr?.message);
    process.exit(1);
  }

  // Get current group name
  const { data: currGroup } = await supabase.from('groups').select('name').eq('id', hanoof.group_id).single();

  console.log('Current state:');
  console.log('  Name:', hanoof.profiles.full_name);
  console.log('  Email:', hanoof.profiles.email);
  console.log('  Level:', hanoof.academic_level);
  console.log('  Package:', hanoof.package);
  console.log('  Price:', hanoof.custom_price);
  console.log('  Group:', currGroup?.name, '(' + hanoof.group_id + ')');
  console.log('  Status:', hanoof.status);

  if (hanoof.academic_level === 3) {
    console.log('\nAlready at B1. Nothing to do. Exiting.');
    process.exit(0);
  }
  if (hanoof.academic_level !== 1) {
    console.error('Unexpected current level ' + hanoof.academic_level + '. Aborting for safety.');
    process.exit(1);
  }

  // 2. Get B1 group (the active one with students = المجموعة 4)
  const { data: b1groups } = await supabase
    .from('groups').select('id, name, level, max_students')
    .eq('level', 3);
  console.log('\nB1 groups found:', b1groups?.length);

  // Find the active B1 group (المجموعة 4)
  let b1 = null;
  for (const g of b1groups) {
    const { count } = await supabase.from('students')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', g.id).eq('status', 'active');
    console.log('  ' + g.name + ': ' + count + '/' + g.max_students + ' active');
    if (count > 0 && !b1) b1 = { ...g, currentCount: count };
  }

  if (!b1) {
    console.error('No active B1 group found');
    process.exit(1);
  }

  console.log('\nTarget: ' + b1.name + ' (currently ' + b1.currentCount + '/' + b1.max_students + ' active)');
  if (b1.currentCount >= b1.max_students) {
    console.error('B1 group full (' + b1.currentCount + '/' + b1.max_students + '). Aborting.');
    process.exit(1);
  }

  // 3. Check A1 groups
  console.log('\nA1 groups:');
  const { data: a1groups } = await supabase.from('groups').select('id, name, level').eq('level', 1);
  for (const g of a1groups) {
    const { count } = await supabase.from('students')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', g.id).eq('status', 'active');
    console.log('  ' + g.name + ': ' + count + ' active');
  }

  // 4. Check progress to preserve
  console.log('\nProgress check (will be preserved):');
  const { count: xpCount } = await supabase
    .from('xp_transactions').select('*', { count: 'exact', head: true })
    .eq('student_id', hanoof.id);
  console.log('  XP transactions:', xpCount || 0);

  try {
    const { count: vocabCount } = await supabase
      .from('vocabulary_mastery').select('*', { count: 'exact', head: true })
      .eq('student_id', hanoof.id);
    console.log('  Vocabulary mastery:', vocabCount || 0);
  } catch(e) { console.log('  Vocabulary mastery: table not found or 0'); }

  try {
    const { count: subCount } = await supabase
      .from('submissions').select('*', { count: 'exact', head: true })
      .eq('student_id', hanoof.id);
    console.log('  Submissions:', subCount || 0);
  } catch(e) { console.log('  Submissions: table not found or 0'); }

  // 5. Update Hanoof (atomic: level + group + package + price)
  console.log('\nUpdating Hanoof...');
  const { data: updated, error: uErr } = await supabase
    .from('students')
    .update({
      academic_level: 3,
      group_id: b1.id,
      package: NEW_PACKAGE,
      custom_price: NEW_PRICE,
    })
    .eq('id', hanoof.id)
    .select();

  if (uErr || !updated || updated.length === 0) {
    console.error('Update failed (possibly silent RLS):', uErr?.message || 'no rows returned');
    process.exit(1);
  }

  console.log('Hanoof updated successfully');
  console.log('  New level:', updated[0].academic_level);
  console.log('  New group_id:', updated[0].group_id);
  console.log('  Package:', updated[0].package);
  console.log('  Price:', updated[0].custom_price);

  // 6. Verify
  const { count: newB1Count } = await supabase
    .from('students').select('*', { count: 'exact', head: true })
    .eq('group_id', b1.id).eq('status', 'active');

  const { data: a1Active } = await supabase
    .from('groups').select('id, name').eq('level', 1);
  let a1TotalActive = 0;
  for (const g of a1Active) {
    const { count } = await supabase.from('students')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', g.id).eq('status', 'active');
    a1TotalActive += (count || 0);
  }

  console.log('\nPost-migration counts:');
  console.log('  B1 (' + b1.name + '): ' + newB1Count + ' active (was ' + b1.currentCount + ', expected +1)');
  console.log('  A1 total active: ' + a1TotalActive + ' (expected -1 from before)');

  if (xpCount > 0) {
    console.log('\nNote: Hanoof has ' + xpCount + ' XP transactions from A1 time - preserved (not deleted).');
  }

  console.log('\nDone. Hanoof now in B1 group with 7:30 PM daily schedule.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
