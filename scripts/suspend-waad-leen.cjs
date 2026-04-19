'use strict';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TARGETS = [
  {
    id: 'b091fb1d-15f1-43fc-841b-772328087fa3',
    name: 'وعد العمران',
    original_group_id: 'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa',
  },
  {
    id: 'a64b4a03-5eac-433b-9dee-14af93e043c2',
    name: 'لين الشهري',
    original_group_id: 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb',
  },
];

(async () => {
  console.log('=== SUSPEND WAAD + LEEN ===\n');

  // Step 1: verify current status
  const { data: before } = await sb
    .from('students')
    .select('id, status, group_id')
    .in('id', TARGETS.map(t => t.id));

  console.log('Before:');
  before.forEach(r => {
    const t = TARGETS.find(x => x.id === r.id);
    console.log(`  ${t.name}: status=${r.status}, group_id=${r.group_id}`);
  });

  // Step 2: update both
  const now = new Date().toISOString();
  let successCount = 0;

  for (const t of TARGETS) {
    const pausedReason = JSON.stringify({
      reason: 'Voluntary withdrawal — preserved for potential return',
      original_group_id: t.original_group_id,
      paused_by: 'admin',
      notes: 'Student left the academy voluntarily. Data preserved. Restore: set status=active, group_id=original_group_id',
    });

    const { data, error } = await sb
      .from('students')
      .update({
        status: 'paused',
        group_id: null,
        paused_at: now,
        paused_reason: pausedReason,
      })
      .eq('id', t.id)
      .neq('status', 'paused')  // idempotent
      .select('id, status, group_id, paused_at');

    if (error) {
      console.error(`  ERROR updating ${t.name}:`, error.message);
    } else if (!data || data.length === 0) {
      console.log(`  SKIPPED ${t.name} (already paused)`);
      successCount++;
    } else {
      console.log(`  ✓ ${t.name}: status=${data[0].status}, group_id=${data[0].group_id}, paused_at=${data[0].paused_at}`);
      successCount++;
    }
  }

  if (successCount !== 2) {
    console.error('\n✗ Not all students updated. Check errors above.');
    process.exit(1);
  }

  // Step 3: verify
  const { data: after } = await sb
    .from('students')
    .select('id, status, group_id, paused_at')
    .in('id', TARGETS.map(t => t.id));

  console.log('\nAfter verification:');
  after.forEach(r => {
    const t = TARGETS.find(x => x.id === r.id);
    const ok = r.status === 'paused' && r.group_id === null;
    console.log(`  ${ok ? '✓' : '✗'} ${t.name}: status=${r.status}, group_id=${r.group_id}`);
  });

  const allPaused = after.every(r => r.status === 'paused' && r.group_id === null);
  if (!allPaused) {
    console.error('\n✗ Verification failed.');
    process.exit(1);
  }

  console.log('\n✓ Both students paused successfully. Data preserved.');
  console.log('  To restore: UPDATE students SET status=\'active\', group_id=<original_group_id>, paused_at=NULL, paused_reason=NULL WHERE id=<id>');
})();
