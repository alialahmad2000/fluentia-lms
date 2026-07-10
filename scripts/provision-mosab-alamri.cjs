// scripts/provision-mosab-alamri.cjs
// Provisions ONE private student end-to-end: مصعب جمال العمري.
//   Layer 1 — General-English backbone: dedicated private group (Level 2) + auth user + profiles + students row
//   Layer 2 — 5 university-course English vocabulary tracks (A2-LOCKED) → vocab_cards (the LIVE unified store)
//   Phase C — end-to-end verification (as data; RLS-scoped checks in a separate student-JWT pass)
// Idempotent + check-existence-first everywhere. NO hard deletes. `.select()` after every write.
// Mirrors the proven private-student template `provision-sara-alasmari.cjs` (discovered live, not guessed).
// Run:  node scripts/provision-mosab-alamri.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ─── FIXED FACTS (verified against live schema in Phase A) ───────────────────
const MOSAB_EMAIL   = 'mosab05113@gmail.com';
const MOSAB_NAME    = 'مصعب جمال العمري';
const MOSAB_DISPLAY = 'مصعب';
const TEMP_PASSWORD = 'Fluentia2025!';
const ACADEMIC_LEVEL = 2;               // Level 2 (A2) — resolves to curriculum_levels.level_number=2 (12 units)
const PACKAGE = 'private';              // student_package enum (الفردي)
const TRACK   = 'foundation';           // matches the 2 existing L2/private students
const GENDER  = 'male';                 // students.gender → masculine Arabic UI
const GROUP_NAME = 'مصعب العمري — فردي';
const GROUP_CODE = 'MOSAB';
const GROUP_LEVEL = 2;
const ALI_ID = 'e5528ced-b3e2-45bb-8c89-9368dc9b5b96'; // د. علي الأحمد (admin + active trainers row exists)
const MOSAB_GOAL =
  'بناء أساس إنجليزي قوي في المستوى A2، وتعلّم مفردات إنجليزية بسيطة مرتبطة بمقرّرات إدارة الأعمال ' +
  '(ريادة الأعمال، سلاسل الإمداد، إدارة الرعاية الصحية، المنظمات غير الربحية، والمهارات المهنية) ' +
  'ليتحدث ويقرأ عن مجاله بثقة.';
const MOSAB_INTERESTS = ['Business', 'Career', 'Entrepreneurship', 'Supply Chain', 'Healthcare'];

// ─── LAYER 2 — 5 course-themed A2 vocabulary collections (globally UNIQUE words) ─
// Each item: [word(EN), meaning_en (A2, ≤12 words), meaning_ar, example (A2), part_of_speech]
// source tag = 'uni:<CODE>' (5 distinct → 5 collections). Words are entry-level & concrete.
const COURSES = [
  {
    code: 'ENT 325',
    source: 'uni:ENT325',
    name_ar: 'ريادة الأعمال',
    words: [
      ['business',  'work you do to make and sell things',         'عمل تجاري',          'She started a small business selling coffee.',        'noun'],
      ['idea',      'a thought or plan in your mind',               'فكرة',               'He had a good idea for a new shop.',                  'noun'],
      ['startup',   'a new small company',                          'شركة ناشئة',         'Their startup is only one year old.',                'noun'],
      ['customer',  'a person who buys something',                  'زبون / عميل',        'The customer wants to buy two shirts.',              'noun'],
      ['product',   'a thing that a company makes to sell',         'منتج',               'This product is very popular with young people.',    'noun'],
      ['sell',      'to give something for money',                  'يبيع',               'They sell fresh bread every morning.',               'verb'],
      ['profit',    'money you make after you pay costs',           'ربح',                'The shop made a small profit last month.',           'noun'],
      ['price',     'how much money something costs',               'سعر',                'The price of the phone is too high.',                'noun'],
      ['plan',      'what you will do to reach a goal',             'خطة',                'We made a plan to open a new shop.',                 'noun'],
      ['risk',      'a chance that something bad can happen',       'مخاطرة',             'Starting a business is always a risk.',              'noun'],
      ['market',    'a place or group of people who buy',           'سوق',                'There is a big market for cheap phones.',            'noun'],
      ['money',     'coins and notes you use to buy things',        'مال / نقود',         'He saved money to start his business.',              'noun'],
      ['buy',       'to get something for money',                   'يشتري',              'I want to buy a new laptop for work.',               'verb'],
      ['owner',     'a person who has a business or thing',         'مالك / صاحب',        'She is the owner of the small cafe.',                'noun'],
      ['sale',      'the act of selling something',                 'عملية بيع',          'The shop had a big sale last week.',                 'noun'],
      ['grow',      'to become bigger',                             'ينمو / يكبر',        'They want their company to grow fast.',              'verb'],
      ['company',   'a business that makes or sells things',        'شركة',               'He works for a small company in the city.',          'noun'],
      ['goal',      'a thing you want to reach',                    'هدف',                'Our goal is to help many customers.',                'noun'],
    ],
  },
  {
    code: 'SCM 341',
    source: 'uni:SCM341',
    name_ar: 'إدارة سلاسل الإمداد',
    words: [
      ['supplier',  'a company that gives you products',            'مورّد',              'The supplier sends us fresh food every day.',        'noun'],
      ['order',     'a request to buy or bring products',           'طلب / طلبية',        'We made a big order for new boxes.',                 'noun'],
      ['deliver',   'to bring something to a place',                'يوصّل / يسلّم',      'They deliver the food to the shop at night.',        'verb'],
      ['transport', 'moving things from one place to another',      'نقل',                'The transport of goods takes two days.',             'noun'],
      ['warehouse', 'a big building to keep products',              'مستودع',             'The boxes are in the warehouse.',                    'noun'],
      ['stock',     'the products a shop has ready',                'مخزون',              'We have a lot of stock in the store.',               'noun'],
      ['cost',      'the money you pay for something',              'تكلفة',              'The cost of transport is very high.',                'noun'],
      ['ship',      'to send products to a place',                  'يشحن',               'They ship the products to many cities.',             'verb'],
      ['truck',     'a big car that carries products',              'شاحنة',              'The truck brings boxes to the shop.',                'noun'],
      ['box',       'a container for keeping things',               'صندوق / علبة',       'Put the products in a big box.',                     'noun'],
      ['store',     'to keep things in a safe place',               'يخزّن',              'We store the food in a cold room.',                  'verb'],
      ['factory',   'a place where things are made',                'مصنع',               'The phones come from a big factory.',                'noun'],
      ['goods',     'things that are made to be sold',              'بضائع / سلع',        'The goods arrived at the shop today.',               'noun'],
      ['package',   'a thing wrapped to send',                      'طرد / حزمة',         'The package is ready to send.',                      'noun'],
      ['send',      'to make something go to a place',              'يرسل',               'Please send the order to the customer.',             'verb'],
      ['receive',   'to get something that comes to you',           'يستلم',              'We receive new products every week.',                'verb'],
      ['quantity',  'how many or how much you have',                'كمية',               'What quantity of boxes do you need?',                'noun'],
      ['delay',     'a time when something is late',                'تأخير',              'There was a delay in the delivery.',                 'noun'],
    ],
  },
  {
    code: 'HCM 345',
    source: 'uni:HCM345',
    name_ar: 'مقدمة في إدارة الرعاية الصحية',
    words: [
      ['hospital',    'a place where sick people get help',        'مستشفى',             'My friend is in the hospital today.',                'noun'],
      ['patient',     'a sick person who gets care',                'مريض',               'The doctor is talking to the patient.',              'noun'],
      ['doctor',      'a person who helps sick people',             'طبيب',               'The doctor gave me some medicine.',                  'noun'],
      ['nurse',       'a person who takes care of sick people',     'ممرّض / ممرّضة',     'The nurse checks the patient every hour.',           'noun'],
      ['care',        'help you give to keep people well',          'رعاية',              'The hospital gives very good care.',                 'noun'],
      ['treatment',   'the way a doctor helps a sick person',       'علاج',               'The treatment takes about one week.',                'noun'],
      ['service',     'help or work a place gives people',          'خدمة',               'The hospital has a fast service.',                   'noun'],
      ['staff',       'the people who work in a place',             'طاقم / موظفون',      'The staff at the clinic are very kind.',             'noun'],
      ['appointment', 'a time you plan to meet the doctor',         'موعد',               'I have an appointment with the doctor at ten.',      'noun'],
      ['clinic',      'a small place to see a doctor',              'عيادة',              'She works at a clinic near my house.',               'noun'],
      ['insurance',   'money help to pay for care',                 'تأمين',              'My insurance pays for the doctor.',                  'noun'],
      ['medicine',    'a thing you take to feel better',           'دواء',               'Take this medicine two times a day.',                'noun'],
      ['health',      'how well your body is',                      'صحة',                'Good food is important for your health.',            'noun'],
      ['sick',        'not feeling well; ill',                      'مريض / متوعّك',      'He is sick and stays at home today.',                'adjective'],
      ['visit',       'to go to see a person or place',             'يزور',               'I will visit my friend in the hospital.',            'verb'],
      ['emergency',   'a sudden serious problem',                   'حالة طارئة',         'They took him to the emergency room.',               'noun'],
      ['schedule',    'a plan of times for things',                 'جدول مواعيد',        'The doctor has a busy schedule today.',              'noun'],
      ['pain',        'a bad feeling in your body',                 'ألم',                'She has a lot of pain in her arm.',                  'noun'],
    ],
  },
  {
    code: 'NPF 323',
    source: 'uni:NPF323',
    name_ar: 'إدارة المنظمات غير الهادفة للربح',
    words: [
      ['charity',   'a group that helps people for free',          'جمعية خيرية',        'The charity gives food to poor families.',           'noun'],
      ['nonprofit', 'a group that works to help, not for money',    'منظمة غير ربحية',    'She works for a small nonprofit.',                   'noun'],
      ['donate',    'to give money or things to help',             'يتبرّع',             'People donate clothes to the charity.',              'verb'],
      ['volunteer', 'a person who helps for free',                 'متطوّع',             'He is a volunteer at the hospital.',                 'noun'],
      ['fund',      'money kept to be used for something',         'تمويل / صندوق مالي', 'The fund helps children go to school.',              'noun'],
      ['community', 'the people who live in one area',             'مجتمع محلي',         'The whole community came to help.',                  'noun'],
      ['support',   'to give help to someone',                     'يدعم',               'We support families who need food.',                 'verb'],
      ['help',      'to make things easier for someone',           'يساعد',              'The volunteers help old people.',                    'verb'],
      ['member',    'a person who is part of a group',             'عضو',                'She is a member of the charity.',                    'noun'],
      ['event',     'something planned that happens',              'فعالية / حدث',       'The charity had a big event last week.',             'noun'],
      ['cause',     'an aim that people want to help',             'قضية / هدف نبيل',    'They work for a good cause.',                        'noun'],
      ['gift',      'a thing you give to someone',                 'هدية',               'The children got a small gift.',                     'noun'],
      ['donation',  'money or things given to help',               'تبرّع',              'The donation helped many families.',                 'noun'],
      ['group',     'a number of people together',                 'مجموعة',             'A group of students joined the charity.',            'noun'],
      ['give',      'to let someone have something',               'يعطي',               'They give food to people in need.',                  'verb'],
      ['need',      'something you must have',                     'حاجة',               'The families have a big need for water.',            'noun'],
      ['together',  'with each other, as a group',                 'معاً',               'We work together to help the community.',            'adverb'],
      ['share',     'to give part of what you have',               'يشارك / يتقاسم',     'They share food with poor people.',                  'verb'],
    ],
  },
  {
    code: 'MGT 303',
    source: 'uni:MGT303',
    name_ar: 'مهارات التأهيل المهني في إدارة الأعمال',
    words: [
      ['job',       'the work a person does for money',            'وظيفة / عمل',        'She found a good job in the city.',                  'noun'],
      ['career',    'the work you do for many years',              'مسار مهني',          'He wants a career in business.',                     'noun'],
      ['interview', 'a meeting to get a job',                      'مقابلة عمل',         'I have a job interview tomorrow.',                   'noun'],
      ['resume',    'a paper about your work and skills',          'سيرة ذاتية',         'Send your resume to the manager.',                   'noun'],
      ['meeting',   'a time when people talk about work',          'اجتماع',             'We have a team meeting at nine.',                    'noun'],
      ['team',      'a group of people who work together',        'فريق',               'Our team works very well together.',                 'noun'],
      ['manager',   'a person who leads workers',                  'مدير',               'The manager gave us a new task.',                    'noun'],
      ['task',      'a piece of work you must do',                 'مهمة',               'I finished my first task today.',                    'noun'],
      ['deadline',  'the last day to finish work',                'موعد نهائي',         'The deadline for the report is Friday.',             'noun'],
      ['email',     'a message you send on the internet',          'بريد إلكتروني',      'Please send me an email about the meeting.',         'noun'],
      ['office',    'a place where people work',                   'مكتب',               'She works in a big office downtown.',                'noun'],
      ['skill',     'a thing you can do well',                     'مهارة',              'Good English is a useful skill for work.',           'noun'],
      ['work',      'to do a job or task',                         'يعمل',               'I work from nine to five every day.',                'verb'],
      ['boss',      'the person who leads you at work',            'رئيس العمل',         'My boss is very kind and helpful.',                  'noun'],
      ['report',    'a paper that tells about work',               'تقرير',              'I wrote a short report for the meeting.',            'noun'],
      ['colleague', 'a person you work with',                      'زميل عمل',           'My colleague helped me with the task.',              'noun'],
      ['project',   'a big piece of planned work',                 'مشروع',              'We are working on a new project.',                   'noun'],
      ['message',   'words you send to someone',                   'رسالة',              'I sent a message to my manager.',                    'noun'],
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
if (!MOSAB_EMAIL || /placeholder|example\.com/i.test(MOSAB_EMAIL)) {
  console.error('🛑 HALT: MOSAB_EMAIL looks like a placeholder.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const EMAIL_LOWER = MOSAB_EMAIL.toLowerCase();

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

// ─── LAYER 1 — BACKBONE (must succeed) ───────────────────────────────────────
async function layer1() {
  console.log('\n=== LAYER 1 — BACKBONE (private group + account) ===');

  // 0. Guard: email must not already exist (STOP if it does)
  const pre = await getExistingAuthUser(MOSAB_EMAIL);
  const { data: preProf } = await supabase.from('profiles').select('id').eq('email', EMAIL_LOWER).maybeSingle();
  if (pre || preProf) {
    // Re-run safety: only continue if this is OUR record (same email). We reuse it idempotently.
    console.log(`  ⏭️  ${MOSAB_EMAIL} already present (auth:${!!pre} profile:${!!preProf}) — will reuse idempotently.`);
  }

  // 1. Dedicated private group (idempotent on code)
  let groupId;
  const { data: existingGroup } = await supabase.from('groups').select('id, name, level, trainer_id').eq('code', GROUP_CODE).maybeSingle();
  if (existingGroup) {
    groupId = existingGroup.id;
    console.log(`  ⏭️  Group '${GROUP_CODE}' already exists (${groupId}) — reusing.`);
  } else {
    const { data: g, error: gErr } = await supabase
      .from('groups')
      .insert({ name: GROUP_NAME, code: GROUP_CODE, level: GROUP_LEVEL, trainer_id: ALI_ID, max_students: 1, is_active: true })
      .select('id, name, level, trainer_id, max_students, is_active');
    if (gErr) throw new Error(`Group insert failed: ${gErr.message}`);
    assertOne(g, 'groups insert');
    groupId = g[0].id;
    console.log(`  ✅ Group created: '${g[0].name}' id=${groupId} level=${g[0].level} trainer=${g[0].trainer_id} cap=${g[0].max_students}`);
  }

  // 2. Auth user (idempotent)
  let userId;
  if (pre) {
    userId = pre.id;
    console.log(`  ⏭️  Auth user already exists (${userId}) — reusing.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: MOSAB_EMAIL,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: MOSAB_NAME },
    });
    if (error) throw new Error(`Auth create failed: ${error.message}`);
    userId = data.user.id;
    console.log(`  ✅ Auth user created: ${userId}`);
  }

  // 3. profiles upsert (must_change_password lives HERE)
  const profilePayload = {
    id: userId,
    full_name: MOSAB_NAME,
    display_name: MOSAB_DISPLAY,
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

  // 4. students upsert (gender lives HERE; mirrors L2/private pattern)
  const studentPayload = {
    id: userId,
    academic_level: ACADEMIC_LEVEL,
    package: PACKAGE,
    track: TRACK,
    group_id: groupId,
    status: 'active',
    gender: GENDER,
    onboarding_completed: true,
    goals: MOSAB_GOAL,
    interests: MOSAB_INTERESTS,
    // study_mode omitted → defaults to 'group' (content-group link, matches L2/private students)
    // payment_day / custom_price / writing_limit_override intentionally NOT set (left default/null)
  };
  const { data: stu, error: sErr } = await supabase
    .from('students').upsert(studentPayload, { onConflict: 'id' })
    .select('id, academic_level, package, track, group_id, status, gender, study_mode, onboarding_completed');
  if (sErr) throw new Error(`Student upsert failed: ${sErr.message}\n  → payload: ${JSON.stringify(studentPayload)}`);
  assertOne(stu, 'students upsert');
  const s = stu[0];
  console.log(`  ✅ Student row upserted (level=${s.academic_level}, pkg=${s.package}, track=${s.track}, group=${s.group_id}, status=${s.status}, gender=${s.gender}, study_mode=${s.study_mode})`);

  // 5. Assert Level-2 units resolve (owner_student_id NULL, generic) — the app's exact query path
  const { data: lvl } = await supabase.from('curriculum_levels').select('id').eq('level_number', ACADEMIC_LEVEL).maybeSingle();
  if (!lvl) throw new Error(`No curriculum_levels row for level_number=${ACADEMIC_LEVEL}`);
  const { count: unitCount, error: uErr } = await supabase
    .from('curriculum_units').select('id', { count: 'exact', head: true })
    .eq('level_id', lvl.id).is('owner_student_id', null);
  if (uErr) throw new Error(`L2 unit count failed: ${uErr.message}`);
  if (!unitCount || unitCount < 1) throw new Error(`🔴 0-UNITS: Level 2 has ${unitCount} generic units — student would see an empty curriculum!`);
  console.log(`  ✅ Level 2 curriculum resolves: ${unitCount} generic units (level_id=${lvl.id}). §3-rule-8 satisfied.`);

  return { userId, groupId, unitCount };
}

// ─── LAYER 2 — 5 UNIVERSITY VOCAB TRACKS (A2-locked) into vocab_cards ─────────
async function layer2(userId) {
  console.log('\n=== LAYER 2 — UNIVERSITY VOCABULARY TRACKS (A2) ===');

  // Global-uniqueness self-check (UNIQUE student_id+word_normalized would reject dupes anyway)
  const seen = new Map();
  for (const c of COURSES) for (const [w] of c.words) {
    const n = normWord(w);
    if (seen.has(n)) throw new Error(`Duplicate word across collections: '${w}' in ${c.code} and ${seen.get(n)}`);
    seen.set(n, c.code);
  }

  // Existing cards for this student (idempotency)
  const { data: existing, error: exErr } = await supabase
    .from('vocab_cards').select('word_normalized, source').eq('student_id', userId);
  if (exErr) throw new Error(`Reading existing vocab_cards failed: ${exErr.message}`);
  const have = new Set((existing || []).map((r) => r.word_normalized));

  const perCourse = {};
  let insertedTotal = 0;
  for (const course of COURSES) {
    const rows = course.words
      .filter(([w]) => !have.has(normWord(w)))
      .map(([word, meaning_en, meaning_ar, example, pos]) => ({
        student_id: userId,
        curriculum_vocabulary_id: null,       // clean custom cards; audio via the app's word-pronunciation util
        word,
        word_normalized: normWord(word),
        meaning_ar,
        meaning_en,
        context_sentence: example,
        source: course.source,                // 'uni:<CODE>' → distinct collection tag
        // part_of_speech has no column on vocab_cards; POS is embedded in the frontend course catalog
      }));

    let inserted = 0;
    if (rows.length) {
      const { data: ins, error: insErr } = await supabase.from('vocab_cards').insert(rows).select('id');
      if (insErr) throw new Error(`Vocab insert (${course.code}) failed: ${insErr.message}`);
      inserted = ins.length;
      insertedTotal += inserted;
    }
    // Count what's actually in the store for this collection (idempotent truth)
    const { count, error: cErr } = await supabase
      .from('vocab_cards').select('id', { count: 'exact', head: true })
      .eq('student_id', userId).eq('source', course.source);
    if (cErr) throw new Error(`Vocab count (${course.code}) failed: ${cErr.message}`);
    perCourse[course.code] = { name_ar: course.name_ar, source: course.source, count, inserted, planned: course.words.length };
    console.log(`  ✅ ${course.name_ar} · ${course.code}: ${count} words in store (+${inserted} new / ${course.words.length} planned)`);
  }
  console.log(`  📊 Total course words inserted this run: ${insertedTotal}`);
  return perCourse;
}

// ─── PHASE C — VERIFY (service-role data assertions) ─────────────────────────
async function verify(userId, groupId, unitCount, perCourse) {
  console.log('\n=== PHASE C — VERIFICATION (data) ===');
  const authUser = await getExistingAuthUser(MOSAB_EMAIL);
  const { data: prof } = await supabase.from('profiles').select('full_name, role, must_change_password').eq('id', userId).maybeSingle();
  const { data: stu } = await supabase.from('students').select('academic_level, package, track, group_id, status, gender, study_mode, onboarding_completed').eq('id', userId).maybeSingle();
  const { data: grp } = await supabase.from('groups').select('name, level, trainer_id').eq('id', groupId).maybeSingle();

  const collectionCount = Object.keys(perCourse).length;
  const totalWords = Object.values(perCourse).reduce((a, c) => a + c.count, 0);

  const checks = [];
  checks.push(['Auth user exists', !!authUser]);
  checks.push(['profiles.role = student', prof?.role === 'student']);
  checks.push(['profiles.must_change_password = true', prof?.must_change_password === true]);
  checks.push(['students.academic_level = 2', stu?.academic_level === 2]);
  checks.push(['students.package = private', stu?.package === 'private']);
  checks.push(['students.gender = male', stu?.gender === 'male']);
  checks.push(['students.group_id = private group', stu?.group_id === groupId]);
  checks.push(['students.status = active', stu?.status === 'active']);
  checks.push([`group level = 2 (${grp?.name})`, grp?.level === 2]);
  checks.push([`group trainer = Ali`, grp?.trainer_id === ALI_ID]);
  checks.push([`Level 2 unit count > 0 (${unitCount})`, unitCount > 0]);
  checks.push([`5 vocab collections (${collectionCount})`, collectionCount === 5]);
  checks.push([`each collection 15-20 words`, Object.values(perCourse).every((c) => c.count >= 15 && c.count <= 20)]);

  let allOk = true;
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? '✅' : '❌'} ${label}`);
    if (!ok) allOk = false;
  }

  console.log('\n  — Collections —');
  for (const [code, c] of Object.entries(perCourse)) {
    console.log(`     • ${c.name_ar} · ${code}  →  ${c.count} words  [source=${c.source}]`);
  }
  console.log(`     TOTAL course words: ${totalWords}`);

  // Rowcount assertions
  console.log('\n  — Rowcount assertions —');
  const { count: profN } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('id', userId);
  const { count: stuN } = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('id', userId);
  const { count: grpN } = await supabase.from('groups').select('id', { count: 'exact', head: true }).eq('code', GROUP_CODE);
  const { count: srcN } = await supabase.from('vocab_cards').select('source', { count: 'exact', head: true }).eq('student_id', userId).like('source', 'uni:%');
  console.log(`     profiles=${profN} (exp 1) · students=${stuN} (exp 1) · groups[MOSAB]=${grpN} (exp 1) · uni vocab rows=${srcN}`);

  return allOk;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log(`🚀 Provisioning ${MOSAB_NAME} <${MOSAB_EMAIL}>`);
    const { userId, groupId, unitCount } = await layer1();
    const perCourse = await layer2(userId);
    const ok = await verify(userId, groupId, unitCount, perCourse);

    console.log('\n=== HANDOFF ===');
    console.log('┌───────────────────────────────────────────────');
    console.log(`  STUDENT: ${MOSAB_NAME}`);
    console.log(`  AUTH ID: ${userId}`);
    console.log(`  GROUP ID: ${groupId} (${GROUP_NAME})`);
    console.log('  LOGIN URL: https://app.fluentia.academy');
    console.log(`  EMAIL: ${MOSAB_EMAIL}`);
    console.log(`  TEMP PASSWORD: ${TEMP_PASSWORD}  (forced change on first login)`);
    console.log('  LEVEL: 2 (A2) · PACKAGE: الفردي (private) · TRAINER: د. علي الأحمد');
    console.log('└───────────────────────────────────────────────');

    if (!ok) { console.error('\n💥 Some checks FAILED — investigate above.'); process.exit(1); }
    console.log('\n✅ Done — Mosab has a working L2/private account + 5 A2 university vocab tracks.');
  } catch (e) {
    console.error('\n💥 FATAL:', e.message);
    process.exit(1);
  }
})();
