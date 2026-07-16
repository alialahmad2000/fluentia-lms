// scripts/provision-dhafer-alquhidan.cjs
// Provisions ONE private student end-to-end: ظافر مفلح محمد آل قهيدان (فردي / 3 حصص أسبوعياً).
//   Layer 1 — account: private group + auth user + profiles + students row
//             (provisional Level 1 — the in-app placement test + admin «اعتماد المستوى» set his REAL level)
//   Layer 2 — 4 automotive/business English vocabulary collections → vocab_cards (source=uni:AUTO-* / uni:BIZ-*)
// Also grants the gated «مسار الأعمال» business track (students.uses_biz_track).
// Idempotent + check-existence-first everywhere. NO hard deletes. `.select()` after every write.
// Mirrors the proven templates: provision-atyaf.cjs (placement flavor) + provision-mosab-alamri.cjs (private group).
// Run:  node scripts/provision-dhafer-alquhidan.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ─── FIXED FACTS (verified against live schema) ─────────────────────────────
const DHAFER_EMAIL   = 'al-quhidan@hotmail.com';
const DHAFER_NAME    = 'ظافر مفلح محمد آل قهيدان';   // full name
const DHAFER_DISPLAY = 'ظافر';                        // friendly first name (greetings)
const TEMP_PASSWORD  = 'Fluentia2025!';
const ACADEMIC_LEVEL = 1;              // provisional (A1). The placement test + admin queue set his REAL level.
const PACKAGE = 'private';             // student_package enum (الفردي) — 3 classes/week (scheduling handled by Ali/coordinator)
const TRACK   = 'foundation';
const GENDER  = 'male';                // drives masculine 2nd-person Arabic app-wide (gender.js)
const STUDY_MODE = 'group';            // content-group link — matches every private student (مصعب/أنوار)
const ALI_ID = 'e5528ced-b3e2-45bb-8c89-9368dc9b5b96'; // د. علي الأحمد (trainer of the private group)
const GROUP_NAME = 'ظافر آل قهيدان — فردي';
const GROUP_CODE = 'DHAFER';
const DHAFER_GOAL =
  'تطوير اللغة الإنجليزية العامة بثقة، مع تركيز خاص على مجاله: السيارات وصيانتها، والمالية، ونمو الأعمال — ' +
  'ليتواصل بالإنجليزية في عمله وتجارته: مع العملاء والمورّدين، وفي الأسعار والفواتير والصيانة وخطط النمو — بلغة عملية واثقة.';
const DHAFER_INTERESTS = ['Automotive', 'Car Maintenance', 'Business', 'Finance', 'Business Growth'];

// ─── LAYER 2 — 4 automotive/business vocabulary collections (globally UNIQUE words) ─
// Each item: [word(EN), meaning_en (A1/A2, ≤12 words), meaning_ar, example (A1/A2)]
// source tag = 'uni:<CODE>' (4 distinct → 4 collections). Words are entry-level & concrete
// (his level is provisional until placement — keep the floor low, the content HIS world).
const COURSES = [
  {
    code: 'AUTO-CARS', source: 'uni:AUTO-CARS', name_ar: 'السيارة وأجزاؤها',
    words: [
      ['car',      'a road vehicle with four wheels',              'سيارة',            'He drives his car to work every day.'],
      ['engine',   'the part that makes a car move',               'محرّك',             'The engine makes a strange sound.'],
      ['wheel',    'the round part a car moves on',                'عجلة',             'The front wheel needs air.'],
      ['tire',     'the rubber ring around a wheel',               'إطار',             'This tire is old and needs a change.'],
      ['brake',    'the part that stops the car',                  'فرامل / مكبح',     'Check the brakes before a long trip.'],
      ['door',     'the part you open to get in',                  'باب',              'The back door does not close well.'],
      ['seat',     'the place where you sit in a car',             'مقعد',             'The driver’s seat is very comfortable.'],
      ['mirror',   'glass you look in to see behind you',          'مرآة',             'Look in the mirror before you turn.'],
      ['light',    'the lamp on a car',                            'ضوء / مصباح',      'Turn on the lights at night.'],
      ['key',      'the small metal piece that starts the car',    'مفتاح',            'I cannot find my car key.'],
      ['fuel',     'the liquid that gives the car power',          'وقود',             'The car needs fuel before the trip.'],
      ['oil',      'the liquid that keeps the engine smooth',      'زيت',              'Change the oil every six months.'],
      ['battery',  'the part that gives electric power',           'بطارية',           'The car battery is dead.'],
      ['horn',     'the part that makes a loud warning sound',     'منبّه / بوق',       'Do not use the horn near the hospital.'],
      ['trunk',    'the space at the back of a car for bags',      'صندوق السيارة',    'Put the bags in the trunk.'],
    ],
  },
  {
    code: 'AUTO-SHOP', source: 'uni:AUTO-SHOP', name_ar: 'الورشة والصيانة',
    words: [
      ['workshop',    'a place where people fix cars',                 'ورشة',             'His workshop opens at eight in the morning.'],
      ['mechanic',    'a person who fixes cars',                       'ميكانيكي',         'The mechanic found the problem quickly.'],
      ['repair',      'to fix something that is broken',               'يُصلح',            'We can repair this engine today.'],
      ['maintenance', 'work that keeps a car in good condition',       'صيانة',            'Regular maintenance keeps your car safe.'],
      ['check',       'to look at something carefully',                'يفحص',             'Please check the brakes and the oil.'],
      ['change',      'to put a new thing in place of an old one',     'يغيّر',             'It is time to change the tires.'],
      ['part',        'one piece of a machine',                        'قطعة غيار',        'This part is not available today.'],
      ['tool',        'a thing you use to do work',                    'أداة',             'A mechanic needs good tools.'],
      ['problem',     'something that is wrong',                       'مشكلة / عطل',      'The problem is in the battery.'],
      ['noise',       'a sound, often loud or strange',                'صوت / ضجيج',       'I hear a noise from the engine.'],
      ['broken',      'not working',                                   'معطّل / مكسور',     'The mirror is broken.'],
      ['replace',     'to put a new one instead of the old one',       'يستبدل',           'We need to replace this old battery.'],
      ['service',     'the work of checking and fixing a car',         'صيانة دورية',      'Your car service is finished.'],
      ['ready',       'finished and can be used',                      'جاهز',             'Your car will be ready at five.'],
      ['warranty',    'a promise to fix or replace something',         'ضمان',             'The new battery has a one-year warranty.'],
    ],
  },
  {
    code: 'BIZ-FIN', source: 'uni:BIZ-FIN', name_ar: 'المال والحسابات',
    words: [
      ['price',    'the money you pay for something',               'سعر',              'What is the price of this part?'],
      ['cost',     'the money needed to buy or do something',       'تكلفة',            'The cost of the repair is high.'],
      ['pay',      'to give money for something',                   'يدفع',             'You can pay by card or cash.'],
      ['cash',     'money in notes and coins',                      'نقد / كاش',        'He paid in cash.'],
      ['invoice',  'a paper that shows what to pay',                'فاتورة',           'I will send the invoice today.'],
      ['discount', 'money taken off the price',                     'خصم',              'We give a discount to old customers.'],
      ['profit',   'the money you keep after costs',                'ربح',              'The profit was good this month.'],
      ['budget',   'a plan for spending money',                     'ميزانية',          'We have a small budget this year.'],
      ['tax',      'money paid to the government',                  'ضريبة',            'The price includes the tax.'],
      ['receipt',  'a paper that shows you paid',                   'إيصال',            'Keep the receipt after you pay.'],
      ['total',    'the full amount',                               'المجموع / الإجمالي','The total is five hundred riyals.'],
      ['salary',   'the money you get for your job',                'راتب',             'He gets his salary every month.'],
      ['spend',    'to use money',                                  'يُنفق',            'Do not spend more than you earn.'],
      ['earn',     'to get money for work',                         'يكسب',             'She earns good money from her business.'],
      ['account',  'a place to keep money in a bank',               'حساب',             'Send the money to my bank account.'],
    ],
  },
  {
    code: 'BIZ-GROW', source: 'uni:BIZ-GROW', name_ar: 'نمو الأعمال والعملاء',
    words: [
      ['customer', 'a person who buys from you',                    'عميل / زبون',      'A happy customer comes back again.'],
      ['sell',     'to give something for money',                   'يبيع',             'We sell used cars and parts.'],
      ['buy',      'to get something with money',                   'يشتري',            'People buy more in the summer.'],
      ['offer',    'a special lower price or deal',                 'عرض',              'This offer ends on Friday.'],
      ['deal',     'an agreement in business',                      'صفقة / اتفاق',     'We made a good deal with the supplier.'],
      ['order',    'a request to buy something',                    'طلب / طلبية',      'Your order will arrive tomorrow.'],
      ['deliver',  'to take something to a person',                 'يوصّل',            'We deliver the parts to your workshop.'],
      ['quality',  'how good something is',                         'جودة',             'Good quality brings more customers.'],
      ['trust',    'to believe someone is honest',                  'ثقة / يثق',        'Customers trust honest work.'],
      ['market',   'the place or people you sell to',               'سوق',              'The car market is growing fast.'],
      ['supplier', 'a company that sells you what you need',        'مورّد',            'Our supplier sends the parts every week.'],
      ['growth',   'the process of getting bigger',                 'نمو',              'The growth of the business was fast this year.'],
      ['plan',     'an idea for what to do',                        'خطة',              'We need a plan for the next year.'],
      ['goal',     'something you want to reach',                   'هدف',              'My goal is to open a second workshop.'],
      ['team',     'a group of people who work together',           'فريق',             'A strong team makes work easy.'],
    ],
  },
];

// ─── setup ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!DHAFER_EMAIL || /placeholder|example\.com/i.test(DHAFER_EMAIL)) {
  console.error('🛑 HALT: DHAFER_EMAIL looks like a placeholder.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const EMAIL_LOWER = DHAFER_EMAIL.toLowerCase();

function assertOne(rows, ctx) {
  if (!rows || rows.length !== 1) {
    throw new Error(`${ctx}: expected exactly 1 row, got ${rows ? rows.length : 'null'} (RLS/constraint failure?)`);
  }
}
function normWord(w) { return (w || '').trim().toLowerCase(); }

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

// ─── LAYER 1 — ACCOUNT (group + auth + profile + student) ────────────────────
async function layer1() {
  console.log('\n=== LAYER 1 — ACCOUNT (private group + auth + profile + student) ===');

  // 0. Dedicated private group (idempotent on code) — مصعب/أنوار pattern
  let groupId;
  {
    const { data: preGroup, error: gSelErr } = await supabase
      .from('groups').select('id, name, level').eq('code', GROUP_CODE).maybeSingle();
    if (gSelErr) throw new Error(`Group lookup failed: ${gSelErr.message}`);
    if (preGroup) {
      groupId = preGroup.id;
      console.log(`  ⏭️  Private group already exists (${preGroup.name}, level=${preGroup.level}) — reusing.`);
    } else {
      const { data: g, error: gErr } = await supabase
        .from('groups')
        .insert({
          name: GROUP_NAME,
          code: GROUP_CODE,
          level: ACADEMIC_LEVEL,   // provisional — update after «اعتماد المستوى» (see HANDOFF)
          trainer_id: ALI_ID,
          max_students: 1,
          is_active: true,
        })
        .select('id, name, level');
      if (gErr) throw new Error(`Group insert failed: ${gErr.message}`);
      assertOne(g, 'groups insert');
      groupId = g[0].id;
      console.log(`  ✅ Private group created: ${g[0].name} (level=${g[0].level}, id=${groupId})`);
    }
  }

  const pre = await getExistingAuthUser(DHAFER_EMAIL);
  const { data: preProf } = await supabase.from('profiles').select('id').eq('email', EMAIL_LOWER).maybeSingle();
  if (pre || preProf) {
    console.log(`  ⏭️  ${DHAFER_EMAIL} already present (auth:${!!pre} profile:${!!preProf}) — will reuse idempotently.`);
  }

  // 1. Auth user (idempotent)
  let userId;
  if (pre) {
    userId = pre.id;
    console.log(`  ⏭️  Auth user already exists (${userId}) — reusing.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: DHAFER_EMAIL,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: DHAFER_NAME },
    });
    if (error) throw new Error(`Auth create failed: ${error.message}`);
    userId = data.user.id;
    console.log(`  ✅ Auth user created: ${userId}`);
  }

  // 2. profiles upsert (must_change_password lives HERE)
  const profilePayload = {
    id: userId,
    full_name: DHAFER_NAME,
    display_name: DHAFER_DISPLAY,
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

  // 3. students upsert
  const studentPayload = {
    id: userId,
    academic_level: ACADEMIC_LEVEL,
    package: PACKAGE,
    track: TRACK,
    group_id: groupId,
    status: 'active',
    gender: GENDER,
    study_mode: STUDY_MODE,
    onboarding_completed: false,      // placement decides — أطياف pattern
    goals: DHAFER_GOAL,
    interests: DHAFER_INTERESTS,
    temp_password: TEMP_PASSWORD,     // so it shows in /admin/students for Ali
    uses_biz_track: true,             // gated «مسار الأعمال» (migration 20260716090000_biz_track)
  };
  const { data: stu, error: sErr } = await supabase
    .from('students').upsert(studentPayload, { onConflict: 'id' })
    .select('id, academic_level, package, track, group_id, status, gender, study_mode, onboarding_completed, uses_biz_track');
  if (sErr) throw new Error(`Student upsert failed: ${sErr.message}\n  → payload: ${JSON.stringify(studentPayload)}`);
  assertOne(stu, 'students upsert');
  const s = stu[0];
  console.log(`  ✅ Student row upserted (level=${s.academic_level}, pkg=${s.package}, track=${s.track}, group=${s.group_id}, gender=${s.gender}, biz_track=${s.uses_biz_track})`);

  return { userId, groupId };
}

// ─── LAYER 2 — 4 AUTOMOTIVE/BUSINESS VOCAB COLLECTIONS into vocab_cards ───────
async function layer2(userId) {
  console.log('\n=== LAYER 2 — AUTOMOTIVE/BUSINESS VOCABULARY COLLECTIONS ===');

  // Global-uniqueness self-check
  const seen = new Map();
  for (const c of COURSES) for (const [w] of c.words) {
    const n = normWord(w);
    if (seen.has(n)) throw new Error(`Duplicate word across collections: '${w}' in ${c.code} and ${seen.get(n)}`);
    seen.set(n, c.code);
  }

  const { data: existing, error: exErr } = await supabase
    .from('vocab_cards').select('word_normalized, source').eq('student_id', userId);
  if (exErr) throw new Error(`Reading existing vocab_cards failed: ${exErr.message}`);
  const have = new Set((existing || []).map((r) => r.word_normalized));

  const perCourse = {};
  let insertedTotal = 0;
  for (const course of COURSES) {
    const rows = course.words
      .filter(([w]) => !have.has(normWord(w)))
      .map(([word, meaning_en, meaning_ar, example]) => ({
        student_id: userId,
        curriculum_vocabulary_id: null,
        word,
        word_normalized: normWord(word),
        meaning_ar,
        meaning_en,
        context_sentence: example,
        source: course.source,
      }));

    let inserted = 0;
    if (rows.length) {
      const { data: ins, error: insErr } = await supabase.from('vocab_cards').insert(rows).select('id');
      if (insErr) throw new Error(`Vocab insert (${course.code}) failed: ${insErr.message}`);
      inserted = ins.length;
      insertedTotal += inserted;
    }
    const { count, error: cErr } = await supabase
      .from('vocab_cards').select('id', { count: 'exact', head: true })
      .eq('student_id', userId).eq('source', course.source);
    if (cErr) throw new Error(`Vocab count (${course.code}) failed: ${cErr.message}`);
    perCourse[course.code] = { name_ar: course.name_ar, source: course.source, count, inserted, planned: course.words.length };
    console.log(`  ✅ ${course.name_ar} · ${course.code}: ${count} words in store (+${inserted} new / ${course.words.length} planned)`);
  }
  console.log(`  📊 Total words inserted this run: ${insertedTotal}`);
  return perCourse;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log(`🚀 Provisioning ${DHAFER_NAME} <${DHAFER_EMAIL}>`);
    const { userId, groupId } = await layer1();
    const perCourse = await layer2(userId);

    // Verify
    const { data: prof } = await supabase.from('profiles').select('full_name, role, must_change_password').eq('id', userId).maybeSingle();
    const { data: stu } = await supabase.from('students').select('academic_level, package, track, group_id, status, gender, study_mode, uses_biz_track').eq('id', userId).maybeSingle();
    const { count: uniN } = await supabase.from('vocab_cards').select('id', { count: 'exact', head: true }).eq('student_id', userId).like('source', 'uni:%');
    const totalWords = Object.values(perCourse).reduce((a, c) => a + c.count, 0);

    console.log('\n=== HANDOFF ===');
    console.log('┌───────────────────────────────────────────────');
    console.log(`  STUDENT: ${DHAFER_NAME}`);
    console.log(`  AUTH ID: ${userId}`);
    console.log('  LOGIN URL: https://app.fluentia.academy');
    console.log(`  EMAIL: ${DHAFER_EMAIL}`);
    console.log(`  TEMP PASSWORD: ${TEMP_PASSWORD}  (forced change on first login)`);
    console.log(`  LEVEL: ${stu?.academic_level} (provisional — placement test → «اعتماد المستوى» sets the real level)`);
    console.log(`  PACKAGE: ${stu?.package} (فردي، 3 حصص أسبوعياً) · GROUP: ${GROUP_NAME} (${groupId})`);
    console.log(`  BIZ TRACK: ${stu?.uses_biz_track ? 'granted («مسار الأعمال»)' : 'NOT granted'}`);
    console.log(`  VOCAB COLLECTIONS: ${Object.keys(perCourse).length} · WORDS: ${totalWords} (uni:% rows=${uniN})`);
    console.log('  ⚠️  AFTER placement approval: update the private group level to match —');
    console.log(`      update groups set level = <N> where code = '${GROUP_CODE}';`);
    console.log('└───────────────────────────────────────────────');

    const ok = prof?.role === 'student' && prof?.must_change_password === true &&
               stu?.academic_level === ACADEMIC_LEVEL && stu?.package === PACKAGE &&
               stu?.gender === GENDER && stu?.group_id === groupId && stu?.uses_biz_track === true &&
               Object.values(perCourse).every((c) => c.count === c.planned);
    if (!ok) { console.error('\n💥 Some checks FAILED — investigate above.'); process.exit(1); }
    console.log('\n✅ Done — ظافر has a working account + 4 vocab collections + the business track gate. AUTH_ID=' + userId);
  } catch (e) {
    console.error('\n💥 FATAL:', e.message);
    process.exit(1);
  }
})();
