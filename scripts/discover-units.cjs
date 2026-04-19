#!/usr/bin/env node
'use strict';
require('dotenv').config({ path: 'C:/Users/Dr. Ali/Desktop/fluentia-lms/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await sb
    .from('curriculum_units')
    .select('id, unit_number, theme_ar, theme_en, why_matters, outcomes, curriculum_levels!inner(level_number, name_ar)')
    .in('curriculum_levels.level_number', [2, 3, 4, 5])
    .not('brief_generated_at', 'is', null)
    .order('unit_number');

  if (error) { console.error(error.message); process.exit(1); }
  const units = (data || []).sort((a, b) => {
    const la = a.curriculum_levels?.level_number ?? 99;
    const lb = b.curriculum_levels?.level_number ?? 99;
    if (la !== lb) return la - lb;
    return (a.unit_number || 0) - (b.unit_number || 0);
  });

  // Units to regenerate per level (score < 8 from audit)
  const regen = {
    2: [1, 4, 7, 8, 9, 10, 11, 12],
    3: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12],
    4: [2, 3, 4, 5, 7, 9, 11, 12],
    5: [1, 2, 3, 6, 7, 8, 9, 10, 12]
  };

  for (const [lvl, unitNums] of Object.entries(regen)) {
    const lu = units.filter(u => u.curriculum_levels?.level_number === parseInt(lvl) && unitNums.includes(u.unit_number));
    console.log(`\n=== L${lvl} (${lu.length} units to regen) ===`);
    for (const u of lu) {
      console.log(`\n  Unit ${u.unit_number}: ${u.theme_ar} | ${u.theme_en}`);
      console.log(`  ID: ${u.id}`);
      console.log(`  why_matters: ${(u.why_matters || '').slice(0, 120)}`);
      console.log(`  outcomes[0]: ${(u.outcomes || [])[0] || '(none)'}`);
    }
  }

  // Print totals per level for verification
  console.log('\n\n=== PHASE A — DISCOVERY ===');
  for (const [lvl, unitNums] of Object.entries(regen)) {
    const lu = units.filter(u => u.curriculum_levels?.level_number === parseInt(lvl) && unitNums.includes(u.unit_number));
    const ids = lu.map(u => u.id).join(', ');
    console.log(`L${lvl} to regenerate: ${lu.length} units`);
    console.log(`  IDs: ${ids}`);
  }
  const total = Object.entries(regen).reduce((sum, [lvl, nums]) => {
    return sum + units.filter(u => u.curriculum_levels?.level_number === parseInt(lvl) && nums.includes(u.unit_number)).length;
  }, 0);
  console.log(`Total: ${total} units`);
}
main().catch(e => { console.error(e); process.exit(1); });
