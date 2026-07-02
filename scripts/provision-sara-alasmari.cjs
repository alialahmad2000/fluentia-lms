// scripts/provision-sara-alasmari.cjs
// Provisions ONE new private-intensive student end-to-end: سارة علي الأسمري.
//   Phase B — core account (auth user + profiles + students row)   [MUST SUCCEED]
//   Phase C — 12 July private sessions with د. علي                  [guarded]
//   Phase D — custom IT vocabulary deck (vocabulary_bank)           [guarded]
//   Phase E — goal + interests (folded into the students upsert)    [guarded]
//   Phase F — end-to-end verification report
//   Phase G — login handoff block
// Idempotent + check-existence-first everywhere. NO hard deletes. `.select()` after every write.
// Mirrors the proven private-student template (وجدان الحارثي) discovered live, not guessed.
// Run:  node scripts/provision-sara-alasmari.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ─── 🔴 FILL BEFORE RUNNING ────────────────────────────────────────────────
const SARA_EMAIL = 'Sarahasmari6@gmail.com';   // ← her real email
const SARA_MEET_LINK = '';                      // ← recurring Google Meet link, or blank to add later
// ───────────────────────────────────────────────────────────────────────────

// FIXED FACTS (verified against project docs + live schema)
const SARA_NAME = 'سارة علي الأسمري';
const SARA_DISPLAY = 'سارة';
const TEMP_PASSWORD = 'Fluentia2025!';
const ACADEMIC_LEVEL = 3;               // B1 / Level 3
const PACKAGE = 'private';
const ENROLLMENT_DATE = '2026-07-01';
const CUSTOM_PRICE = 3000;
const WRITING_LIMIT_OVERRIDE = 30;      // column confirmed present in Phase A
const SARA_GOAL =
  'Speak and explain IT system issues fluently on live calls with the support team — without freezing or ' +
  'translating. Clear enough for a non-native listener to follow first time. (Analyst II, Infrastructure Services.)';
const SARA_INTERESTS = ['IT', 'Infrastructure', 'Digital Transformation', 'Career English'];

// Fallbacks (only used if the Wejdan template can't be resolved)
const FALLBACK_TRACK = 'development';
const FALLBACK_GROUP_LEVEL = 3;

// Her 12 sessions (Asia/Riyadh wall-clock). status defaults to 'scheduled'.
const SESSIONS = [
  { n: 1,  date: '2026-07-04', start: '23:00', end: '23:59', notes: 'Diagnostic & baseline recording' },
  { n: 2,  date: '2026-07-06', start: '18:00', end: '19:00', notes: 'The explanation scaffold + fluency basics' },
  { n: 3,  date: '2026-07-08', start: '23:00', end: '23:59', notes: 'First structured role-play (single issue)' },
  { n: 4,  date: '2026-07-11', start: '23:00', end: '23:59', notes: 'Clarity for a non-native listener' },
  { n: 5,  date: '2026-07-13', start: '18:00', end: '19:00', notes: 'Clarifying-question layer + interruptions' },
  { n: 6,  date: '2026-07-15', start: '23:00', end: '23:59', notes: 'Describing system behavior precisely' },
  { n: 7,  date: '2026-07-18', start: '23:00', end: '23:59', notes: 'Multi-part issues' },
  { n: 8,  date: '2026-07-20', start: '18:00', end: '19:00', notes: 'Faster pace + interruptions' },
  { n: 9,  date: '2026-07-22', start: '23:00', end: '23:59', notes: 'Rephrasing on the fly ("listener didn\'t get it")' },
  { n: 10, date: '2026-07-25', start: '23:00', end: '23:59', notes: 'Full simulated call #1' },
  { n: 11, date: '2026-07-27', start: '18:00', end: '19:00', notes: 'Full simulated call #2 + polish' },
  { n: 12, date: '2026-07-29', start: '23:00', end: '23:59', notes: 'Final assessment + baseline re-record' },
];

// Custom IT vocabulary deck: [word, meaning_ar, example_sentence]
const SARA_VOCAB = [
  ['server', 'الخادم', 'The main server keeps going down during peak hours.'],
  ['downtime', 'فترة توقّف الخدمة', 'We had two hours of downtime last night.'],
  ['outage', 'انقطاع الخدمة', 'The outage affected all users in the region.'],
  ['latency', 'زمن الاستجابة / التأخير', 'Users are complaining about high latency.'],
  ['bandwidth', 'سعة النطاق', 'The backup is using too much bandwidth.'],
  ['timeout', 'انتهاء المهلة', 'The request keeps timing out after 30 seconds.'],
  ['throughput', 'معدل المعالجة', 'Throughput dropped after the update.'],
  ['load balancer', 'موزّع الأحمال', "The load balancer isn't distributing traffic evenly."],
  ['firewall', 'الجدار الناري', 'The firewall is blocking the connection.'],
  ['endpoint', 'نقطة الوصول', 'The API endpoint is returning an error.'],
  ['deployment', 'النشر / الإطلاق', 'The deployment failed in production.'],
  ['rollback', 'التراجع / الاسترجاع', 'We rolled back to the previous version.'],
  ['patch', 'التحديث الأمني', 'We applied the security patch this morning.'],
  ['migration', 'الترحيل', 'The database migration took longer than expected.'],
  ['backup', 'النسخة الاحتياطية', 'We restored the data from the backup.'],
  ['configuration', 'الإعدادات / التهيئة', 'The issue was a wrong configuration.'],
  ['cluster', 'العنقود / المجموعة', 'One node in the cluster went offline.'],
  ['node', 'العقدة', 'The faulty node has been replaced.'],
  ['virtual machine', 'الجهاز الافتراضي', 'The virtual machine ran out of memory.'],
  ['incident', 'الحادثة / العطل', "I'm opening an incident for this issue."],
  ['ticket', 'التذكرة / طلب الدعم', "I've raised a ticket with the support team."],
  ['escalate', 'تصعيد', 'We need to escalate this to level-two support.'],
  ['root cause', 'السبب الجذري', "We're still investigating the root cause."],
  ['workaround', 'حل مؤقت', "For now, there's a workaround."],
  ['impact', 'الأثر / التأثير', 'Let me explain the impact on the users.'],
  ['severity', 'درجة الخطورة', 'This is a high-severity issue.'],
  ['intermittent', 'متقطّع', 'The problem is intermittent, not constant.'],
  ['reproduce', 'إعادة إنتاج المشكلة', 'I can reproduce the error every time.'],
  ['mitigate', 'التخفيف / الاحتواء', "We've mitigated the issue for now."],
  ['SLA', 'اتفاقية مستوى الخدمة', 'This breach affects our SLA.'],
  ['monitoring', 'المراقبة', 'Our monitoring picked up the spike.'],
  ['threshold', 'الحد / العتبة', 'CPU usage crossed the threshold.'],
];

// ─── setup ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!SARA_EMAIL || /your.*email|placeholder|example\.com/i.test(SARA_EMAIL)) {
  console.error('🛑 HALT: SARA_EMAIL is still a placeholder — refusing to create an account with a fake email.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const EMAIL_LOWER = SARA_EMAIL.toLowerCase();
const meetLink = SARA_MEET_LINK && SARA_MEET_LINK.trim() ? SARA_MEET_LINK.trim() : null;

function assertOne(rows, ctx) {
  if (!rows || rows.length !== 1) {
    throw new Error(`${ctx}: expected exactly 1 row, got ${rows ? rows.length : 'null'} (RLS/constraint failure?)`);
  }
}

async function getExistingAuthUser(email) {
  const lower = email.toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((u) => (u.email || '').toLowerCase() === lower);
    if (found) return found;
    if (data.users.length < 1000) return null;
    page++;
  }
}

// ─── Phase A (targeted re-confirmation of the moving parts) ─────────────────
async function resolveTemplate() {
  // Wejdan → track + group_id
  const { data: wejdan } = await supabase
    .from('students').select('id, track, group_id')
    .eq('id', (await profileIdByEmail('wejdan.alharthi02@gmail.com')) || '00000000-0000-0000-0000-000000000000')
    .maybeSingle();
  let track = wejdan?.track || FALLBACK_TRACK;
  let groupId = wejdan?.group_id || null;
  if (!groupId) {
    const { data: g } = await supabase
      .from('groups').select('id').eq('level', FALLBACK_GROUP_LEVEL).eq('is_active', true)
      .order('created_at').limit(1).maybeSingle();
    groupId = g?.id || null;
  }
  if (!groupId) throw new Error('Could not resolve a B1 (level-3) group_id for Sara.');
  console.log(`  📎 Template → track='${track}', group_id=${groupId}${wejdan ? ' (from Wejdan)' : ' (fallback)'}`);
  return { track, groupId };
}
async function profileIdByEmail(email) {
  const { data } = await supabase.from('profiles').select('id').eq('email', email.toLowerCase()).maybeSingle();
  return data?.id || null;
}
async function resolveAdmin() {
  const { data, error } = await supabase.from('profiles').select('id, full_name').eq('role', 'admin');
  if (error) throw error;
  if (!data || data.length !== 1) {
    console.warn(`  ⚠️  Found ${data ? data.length : 0} admins — Phase C (sessions) will be SKIPPED.`);
    if (data) data.forEach((a) => console.warn(`       • ${a.full_name} (${a.id})`));
    return null;
  }
  console.log(`  📎 Admin (Ali) = ${data[0].full_name} (${data[0].id})`);
  return data[0].id;
}

// ─── Phase B — CORE ACCOUNT (must succeed) ─────────────────────────────────
async function phaseB(template) {
  console.log('\n=== PHASE B — CORE ACCOUNT ===');

  // 1. Auth user (idempotent)
  const existing = await getExistingAuthUser(SARA_EMAIL);
  let userId;
  if (existing) {
    userId = existing.id;
    console.log(`  ⏭️  Auth user already exists (${userId}) — reusing.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: SARA_EMAIL,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: SARA_NAME },
    });
    if (error) throw new Error(`Auth create failed: ${error.message}`);
    userId = data.user.id;
    console.log(`  ✅ Auth user created: ${userId}`);
  }

  // 2. profiles upsert
  const profilePayload = {
    id: userId,
    full_name: SARA_NAME,
    display_name: SARA_DISPLAY,
    email: EMAIL_LOWER,
    role: 'student',
    must_change_password: true,
  };
  const { data: prof, error: pErr } = await supabase
    .from('profiles').upsert(profilePayload, { onConflict: 'id' })
    .select('id, full_name, role, must_change_password');
  if (pErr) throw new Error(`Profile upsert failed: ${pErr.message}`);
  assertOne(prof, 'profiles upsert');
  console.log(`  ✅ Profile upserted (role=${prof[0].role}, must_change_password=${prof[0].must_change_password})`);

  // 3. students upsert (Phase E goal+interests folded in — same table, atomic)
  const studentPayload = {
    id: userId,
    academic_level: ACADEMIC_LEVEL,
    package: PACKAGE,
    track: template.track,
    group_id: template.groupId,
    status: 'active',
    enrollment_date: ENROLLMENT_DATE,
    custom_price: CUSTOM_PRICE,
    onboarding_completed: true,
    writing_limit_override: WRITING_LIMIT_OVERRIDE,
    gender: 'female',
    goals: SARA_GOAL,
    interests: SARA_INTERESTS,
    // study_mode intentionally omitted → defaults to 'group' on insert (mirrors Wejdan; content-group link)
  };
  const { data: stu, error: sErr } = await supabase
    .from('students').upsert(studentPayload, { onConflict: 'id' })
    .select('id, academic_level, package, group_id, status, custom_price, writing_limit_override, onboarding_completed');
  if (sErr) throw new Error(`Student upsert failed: ${sErr.message}\n  → payload: ${JSON.stringify(studentPayload)}`);
  assertOne(stu, 'students upsert');
  const s = stu[0];
  console.log(`  ✅ Student row upserted (level=${s.academic_level}, pkg=${s.package}, group=${s.group_id}, ` +
    `status=${s.status}, price=${s.custom_price}, writing_override=${s.writing_limit_override})`);

  return userId;
}

// ─── Phase C — 12 JULY SESSIONS (guarded) ──────────────────────────────────
async function phaseC(saraId, adminId) {
  console.log('\n=== PHASE C — PRIVATE SESSIONS ===');
  if (!adminId) {
    console.log('  ⏭️  SKIPPED — Ali\'s trainer_id could not be resolved (0 or >1 admins).');
    return { seeded: 0, total: 0, skipped: true };
  }

  // 1. Ensure Ali has a trainers row (idempotent)
  const { data: existingTrainer } = await supabase.from('trainers').select('id, is_active').eq('id', adminId).maybeSingle();
  if (existingTrainer) {
    console.log(`  ⏭️  Ali already has a trainers row (is_active=${existingTrainer.is_active}).`);
  } else {
    const { data: tr, error: tErr } = await supabase
      .from('trainers').upsert({ id: adminId, specialization: ['English', 'Speaking', 'IELTS'], is_active: true }, { onConflict: 'id' })
      .select('id');
    if (tErr) throw new Error(`Trainer row insert failed: ${tErr.message}`);
    assertOne(tr, 'trainers upsert');
    console.log(`  ✅ Created trainers row for Ali (${adminId}).`);
  }
  const aliTrainerId = adminId;

  // 2. Seed 12 sessions (idempotent on student_id + date + start_time)
  const { data: existingSessions, error: exErr } = await supabase
    .from('private_sessions').select('date, start_time').eq('student_id', saraId);
  if (exErr) throw new Error(`Reading existing sessions failed: ${exErr.message}`);
  const seen = new Set((existingSessions || []).map((r) => `${r.date}|${String(r.start_time).slice(0, 5)}`));

  const toInsert = SESSIONS
    .filter((s) => !seen.has(`${s.date}|${s.start}`))
    .map((s) => ({
      student_id: saraId,
      trainer_id: aliTrainerId,
      date: s.date,
      start_time: s.start,
      end_time: s.end,
      status: 'scheduled',
      google_meet_link: meetLink,
      trainer_rate: 0,
      notes: s.notes,
    }));

  let seeded = 0;
  if (toInsert.length) {
    const { data: ins, error: insErr } = await supabase.from('private_sessions').insert(toInsert).select('id');
    if (insErr) throw new Error(`Session insert failed: ${insErr.message}`);
    seeded = ins.length;
    console.log(`  ✅ Inserted ${seeded} new session(s) (${SESSIONS.length - toInsert.length} already existed).`);
  } else {
    console.log('  ⏭️  All 12 sessions already exist — nothing to insert.');
  }

  // 3. Assert July count == 12
  const { count, error: cErr } = await supabase
    .from('private_sessions').select('id', { count: 'exact', head: true })
    .eq('student_id', saraId).gte('date', '2026-07-01').lte('date', '2026-07-31');
  if (cErr) throw new Error(`Session count failed: ${cErr.message}`);
  console.log(`  📊 Sara's July private_sessions: ${count} (expected 12).`);
  return { seeded, total: count, skipped: false };
}

// ─── Phase D — CUSTOM IT VOCABULARY DECK (guarded) ─────────────────────────
async function phaseD(saraId) {
  console.log('\n=== PHASE D — IT VOCABULARY DECK ===');
  const { data: existingWords, error: exErr } = await supabase
    .from('vocabulary_bank').select('word').eq('student_id', saraId);
  if (exErr) throw new Error(`Reading existing vocab failed: ${exErr.message}`);
  const have = new Set((existingWords || []).map((r) => r.word.toLowerCase()));
  const nowIso = new Date().toISOString();

  const toInsert = SARA_VOCAB
    .filter(([w]) => !have.has(w.toLowerCase()))
    .map(([word, meaning_ar, example]) => ({
      student_id: saraId,
      word,
      meaning_ar,
      example_sentence: example,
      source: 'private_plan',
      level: ACADEMIC_LEVEL,
      mastery: 'new',
      next_review: nowIso,
      review_count: 0,
    }));

  let inserted = 0;
  if (toInsert.length) {
    const { data: ins, error: insErr } = await supabase.from('vocabulary_bank').insert(toInsert).select('id');
    if (insErr) throw new Error(`Vocab insert failed: ${insErr.message}`);
    inserted = ins.length;
    console.log(`  ✅ Inserted ${inserted} new word(s) (${SARA_VOCAB.length - toInsert.length} already existed).`);
  } else {
    console.log('  ⏭️  All vocab words already in Sara\'s deck — nothing to insert.');
  }

  const { count, error: cErr } = await supabase
    .from('vocabulary_bank').select('id', { count: 'exact', head: true }).eq('student_id', saraId);
  if (cErr) throw new Error(`Vocab count failed: ${cErr.message}`);
  console.log(`  📊 Sara's vocabulary_bank word count: ${count} (expected ${SARA_VOCAB.length}).`);
  return { inserted, total: count };
}

// ─── Phase F — VERIFY END-TO-END ───────────────────────────────────────────
async function phaseF(saraId, results) {
  console.log('\n=== PHASE F — VERIFICATION REPORT ===');
  const authUser = await getExistingAuthUser(SARA_EMAIL);
  const { data: prof } = await supabase.from('profiles')
    .select('role, must_change_password').eq('id', saraId).maybeSingle();
  const { data: stu } = await supabase.from('students')
    .select('academic_level, package, group_id, status, custom_price, goals, interests').eq('id', saraId).maybeSingle();

  const checks = [];
  checks.push(['1. Auth user exists', !!authUser]);
  checks.push(['2. profiles.role=student', prof?.role === 'student']);
  checks.push(['2. profiles.must_change_password=true', prof?.must_change_password === true]);
  checks.push(['3. students.academic_level=3', stu?.academic_level === 3]);
  checks.push(['3. students.package=private', stu?.package === 'private']);
  checks.push(['3. students.group_id set (B1 group)', !!stu?.group_id]);
  checks.push(['3. students.status=active', stu?.status === 'active']);
  checks.push(['3. students.custom_price=3000', stu?.custom_price === 3000]);
  checks.push(['4. private_sessions July=12', results.C.skipped ? 'SKIPPED' : results.C.total === 12]);
  checks.push([`5. vocabulary_bank words=${results.D.total}`, results.D.total === SARA_VOCAB.length]);
  checks.push(['6. goals set', !!stu?.goals]);
  checks.push(['6. interests set', Array.isArray(stu?.interests) && stu.interests.length > 0]);

  const coreFailed = checks.slice(0, 8).some(([, ok]) => ok !== true);
  if (coreFailed) console.log('  🔴🔴🔴 CORE (Phase B) FAILURE — see below. 🔴🔴🔴');
  for (const [label, ok] of checks) {
    const mark = ok === true ? '✅' : ok === 'SKIPPED' ? '⏭️ ' : '❌';
    console.log(`  ${mark} ${label}`);
  }
  return !coreFailed;
}

// ─── Phase G — LOGIN HANDOFF ───────────────────────────────────────────────
function phaseG(results) {
  console.log('\n=== PHASE G — LOGIN HANDOFF (for the welcome email) ===\n');
  console.log('┌───────────────────────────────────────────────────────────────');
  console.log(`  STUDENT: ${SARA_NAME}`);
  console.log('  LOGIN URL: https://app.fluentia.academy');
  console.log(`  EMAIL: ${SARA_EMAIL}`);
  console.log(`  TEMP PASSWORD: ${TEMP_PASSWORD}  (forced change on first login)`);
  console.log('  LEVEL: B1 (Level 3) · PACKAGE: الفردي (private)');
  console.log(`  SESSIONS SEEDED: ${results.C.skipped ? 'skipped' : results.C.total} · VOCAB WORDS: ${results.D.total}`);
  console.log('└───────────────────────────────────────────────────────────────\n');
}

(async () => {
  try {
    console.log(`🚀 Provisioning ${SARA_NAME} <${SARA_EMAIL}>`);
    console.log('\n=== PHASE A — DISCOVERY (resolve template + admin) ===');
    const template = await resolveTemplate();
    const adminId = await resolveAdmin();

    const saraId = await phaseB(template);                       // must succeed
    const resultsC = await guarded('C', () => phaseC(saraId, adminId), { seeded: 0, total: 0, skipped: true });
    const resultsD = await guarded('D', () => phaseD(saraId), { inserted: 0, total: 0 });

    const okCore = await phaseF(saraId, { C: resultsC, D: resultsD });
    phaseG({ C: resultsC, D: resultsD });

    if (!okCore) { console.error('💥 Core account checks FAILED — investigate above.'); process.exit(1); }
    console.log('✅ Done — Sara has a working B1 / private account.');
  } catch (e) {
    console.error('\n💥 FATAL:', e.message);
    process.exit(1);
  }
})();

// Run a guarded (additive) phase; never let it break the run.
async function guarded(name, fn, fallback) {
  try {
    return await fn();
  } catch (e) {
    console.warn(`  ⚠️  Phase ${name} could not complete safely: ${e.message} — skipping (account is still valid).`);
    return fallback;
  }
}
