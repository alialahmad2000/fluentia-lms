require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const sb = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const report = {};

  // A.1 — all trainers
  const { data: trainers } = await sb.from('profiles').select('id, email, full_name, role').eq('role', 'trainer');
  report.trainers = trainers;
  console.log('\n=== A.1 TRAINERS (profiles.role=trainer) ===');
  console.table(trainers);

  // A.2 — trainers table
  const { data: trainerRows, error: trErr } = await sb.from('trainers').select('*');
  report.trainer_rows = trainerRows;
  console.log('\n=== A.2 TRAINERS TABLE ===');
  if (trErr) console.log('  ERROR:', trErr.message);
  else console.table(trainerRows);

  // A.3 — groups
  const { data: groups } = await sb.from('groups').select('id, name, level, trainer_id, max_students, is_active').order('level');
  report.groups = groups;
  console.log('\n=== A.3 GROUPS ===');
  console.table(groups);

  // A.4 — trainer name per group
  console.log('\n=== A.4 GROUP → TRAINER RESOLUTION ===');
  for (const g of (groups || [])) {
    if (!g.trainer_id) { console.log(`  ${g.name}: ❌ NO TRAINER ASSIGNED`); continue; }
    const t = (trainers || []).find(x => x.id === g.trainer_id);
    console.log(`  ${g.name} (level ${g.level}) → ${t ? t.full_name + ' (' + t.email + ')' : '❌ trainer_id points to non-existent profile: ' + g.trainer_id}`);
  }

  // A.5 — student counts (try both is_active and status='active')
  const { data: studentsActive, error: saErr } = await sb.from('students').select('id, group_id, status').eq('is_active', true);
  const { data: studentsStatus, error: ssErr } = await sb.from('students').select('id, group_id, status').eq('status', 'active');
  const { data: studentsAll } = await sb.from('students').select('id, group_id, status, is_active').is('deleted_at', null);

  console.log('\n=== A.5 STUDENT COUNTS ===');
  console.log('  Via is_active=true:', saErr ? '❌ ' + saErr.message : (studentsActive?.length || 0));
  console.log('  Via status=active:', ssErr ? '❌ ' + ssErr.message : (studentsStatus?.length || 0));
  console.log('  All non-deleted:', studentsAll?.length || 0);

  const activeStudents = studentsAll || [];
  const byGroup = {};
  activeStudents.forEach(s => { if (s.group_id) byGroup[s.group_id] = (byGroup[s.group_id] || 0) + 1; });

  console.log('\n=== A.5b STUDENTS PER GROUP ===');
  for (const g of (groups || [])) {
    console.log(`  ${g.name}: ${byGroup[g.id] || 0} students`);
  }
  report.students_per_group = byGroup;
  report.active_students = activeStudents;

  // A.6 — expected vs actual
  console.log('\n=== A.6 EXPECTED vs ACTUAL ASSIGNMENT ===');
  console.log('  EXPECTED: A1(level1) → goldmohmmed@gmail.com | B1(level3) → admin');
  const mohammedId = (trainers || []).find(t => t.email === 'goldmohmmed@gmail.com')?.id;
  const { data: adminProfile } = await sb.from('profiles').select('id, email').eq('role', 'admin').single();
  const aliId = adminProfile?.id;
  report.mohammedId = mohammedId;
  report.aliId = aliId;
  console.log('  Mohammed profile_id:', mohammedId || 'NOT FOUND');
  console.log('  Ali (admin) profile_id:', aliId || 'NOT FOUND');

  // A.7 — orphans
  console.log('\n=== A.7 ORPHANS ===');
  const noGroup = activeStudents.filter(s => !s.group_id);
  const noTrainer = (groups || []).filter(g => !g.trainer_id);
  console.log(`  Students without group_id: ${noGroup.length}`);
  console.log(`  Groups without trainer_id: ${noTrainer.length}`);

  // A.8 — V2 table counts
  const v2Tables = ['trainer_xp_events','trainer_streaks','student_interventions','trainer_daily_rituals','nabih_conversations','nabih_messages','class_debriefs','attendance','grading_events','trainer_onboarding'];
  console.log('\n=== A.8 V2 TABLE ROW COUNTS ===');
  for (const t of v2Tables) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${error ? '❌ ' + error.message : count}`);
  }

  // A.9 — what Mohammed sees
  if (mohammedId) {
    console.log('\n=== A.9 DR. MOHAMMED\'s ASSIGNED GROUPS + STUDENTS ===');
    const mohammedGroups = (groups || []).filter(g => g.trainer_id === mohammedId);
    console.log(`  Groups: ${mohammedGroups.map(g => g.name).join(', ') || 'NONE'}`);
    for (const g of mohammedGroups) {
      const gStudents = activeStudents.filter(s => s.group_id === g.id);
      console.log(`  → ${g.name}: ${gStudents.length} students`);
    }
  }

  // A.10 — what Ali sees as trainer
  if (aliId) {
    console.log('\n=== A.10 ALI\'s ASSIGNED GROUPS (as trainer) ===');
    const aliGroups = (groups || []).filter(g => g.trainer_id === aliId);
    console.log(`  Groups: ${aliGroups.map(g => g.name).join(', ') || 'NONE — would see nothing if he visited /trainer'}`);
  }

  // A.11 — check students table columns
  const { data: colCheck } = await sb.from('students').select('id, group_id, status, is_active, deleted_at, xp_total, current_streak, last_active_at').limit(1);
  console.log('\n=== A.11 STUDENTS COLUMN PROBE (1 row) ===');
  if (colCheck && colCheck.length > 0) console.log('  Columns confirmed:', Object.keys(colCheck[0]).join(', '));

  fs.mkdirSync('scripts/audit', { recursive: true });
  fs.writeFileSync('scripts/audit/trainer-db-audit.json', JSON.stringify(report, null, 2));
  console.log('\n✅ JSON dump: scripts/audit/trainer-db-audit.json');
})();
