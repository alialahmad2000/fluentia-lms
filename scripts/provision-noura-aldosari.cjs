// scripts/provision-noura-aldosari.cjs
// Provisions ONE private student end-to-end: نورة خالد الدوسري (فردي / حصّتان أسبوعياً, A2).
//   Layer 1 — account: private group + auth user + profiles + students row
//             (Level 2 = A2 set DIRECTLY — her level is known, so NO placement test).
//   Layer 2 — 4 wildlife/environment/ecotourism English vocabulary collections → vocab_cards (source=uni:ENV-*)
// Also grants the gated «مسار البيئة» environment track (students.uses_env_track).
// Idempotent + check-existence-first everywhere. NO hard deletes. `.select()` after every write.
// Mirrors provision-dhafer-alquhidan.cjs (private group + field vocab + gated field track).
// Run:  node scripts/provision-noura-aldosari.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ─── FIXED FACTS ────────────────────────────────────────────────────────────
const NOURA_EMAIL   = 'neno19941@hotmail.com';
const NOURA_NAME    = 'نورة خالد الدوسري';   // full name
const NOURA_DISPLAY = 'نورة';                 // friendly first name (greetings)
const TEMP_PASSWORD = 'Fluentia2025!';
const ACADEMIC_LEVEL = 2;              // A2 (تطوير) — KNOWN level, set directly (no placement)
const PACKAGE = 'private';             // student_package enum (الفردي) — حصّتان أسبوعياً (scheduling handled by Ali/coordinator)
const TRACK   = 'foundation';
const GENDER  = 'female';              // drives feminine 2nd-person Arabic app-wide (gender.js)
const STUDY_MODE = 'group';            // keeps the STANDARD student nav (full B1 curriculum) — NOT 'individual'
const ALI_ID = 'e5528ced-b3e2-45bb-8c89-9368dc9b5b96'; // د. علي الأحمد (trainer of the private group)
const GROUP_NAME = 'نورة الدوسري — فردي';
const GROUP_CODE = 'NOURA';
const NOURA_GOAL =
  'تطوير اللغة الإنجليزية العامة بثقة، مع تركيز خاص على مجالها: الحياة الفطرية والبيئة والسياحة البيئية — ' +
  'لتتواصل بالإنجليزية في عملها بالمركز الوطني لتنمية الحياة الفطرية: وصف الكائنات والموائل، حماية الأنواع، ' +
  'إرشاد الزوّار في المحميات، والعمل الميداني والتقارير — بلغة عملية واثقة.';
const NOURA_INTERESTS = ['Wildlife', 'Environment', 'Nature Conservation', 'Ecotourism', 'Fieldwork'];

// ─── LAYER 2 — 4 wildlife/environment/ecotourism vocabulary collections (globally UNIQUE words) ─
// Each item: [word(EN), meaning_en (A2/B1, ≤12 words), meaning_ar, example]
const COURSES = [
  {
    code: 'ENV-WILD', source: 'uni:ENV-WILD', name_ar: 'الحياة الفطرية',
    words: [
      ['wildlife',  'wild animals and plants living in nature',        'الحياة الفطرية',        'She works to protect the wildlife of the desert.'],
      ['species',   'a group of animals or plants of one kind',        'نوع / فصيلة',           'The Arabian oryx is a rare species.'],
      ['mammal',    'an animal that feeds its babies milk',            'من الثدييات',           'The Arabian leopard is a large mammal.'],
      ['reptile',   'a cold-blooded animal like a snake or lizard',    'من الزواحف',            'The desert has many kinds of reptile.'],
      ['predator',  'an animal that hunts other animals for food',     'حيوان مفترس',           'The falcon is a fast predator.'],
      ['prey',      'an animal that is hunted for food',               'فريسة',                 'The gazelle is easy prey for wolves.'],
      ['herd',      'a large group of animals that live together',     'قطيع',                  'A herd of oryx crossed the sand.'],
      ['oryx',      'a large white desert antelope with long horns',   'المها العربي',          'The oryx can live with little water.'],
      ['gazelle',   'a small fast wild animal like a deer',            'غزال',                  'A gazelle ran across the reserve.'],
      ['falcon',    'a strong bird that hunts other animals',          'صقر',                   'The falcon flew high over the dunes.'],
      ['bustard',   'a large desert bird that is hard to find',        'الحُبارى',              'The houbara bustard needs our protection.'],
      ['nocturnal', 'active at night, not in the day',                 'ليلي (نشِط ليلاً)',     'Many desert animals are nocturnal.'],
      ['burrow',    'a hole an animal digs to live in',                'جُحر',                  'The small fox sleeps in its burrow.'],
      ['tracks',    'marks an animal leaves on the ground',            'آثار الأقدام',          'We followed the animal tracks in the sand.'],
      ['behaviour', 'the way an animal acts',                          'سلوك',                  'We study the behaviour of each species.'],
    ],
  },
  {
    code: 'ENV-NATURE', source: 'uni:ENV-NATURE', name_ar: 'البيئة والطبيعة',
    words: [
      ['environment', 'the natural world around us',                   'البيئة',                'We must keep the environment clean.'],
      ['habitat',   'the natural home of an animal or plant',          'الموطن الطبيعي',        'The reef is the habitat of many fish.'],
      ['ecosystem', 'living things and their environment together',    'النظام البيئي',         'The desert ecosystem is very fragile.'],
      ['desert',    'a large dry area with little rain',               'الصحراء',               'The oryx lives in the open desert.'],
      ['dune',      'a hill of sand made by the wind',                 'كثيب رملي',             'The wind moves the sand dune slowly.'],
      ['wadi',      'a valley that is dry except after rain',          'وادٍ',                  'Plants grow in the wadi after rain.'],
      ['coast',     'the land next to the sea',                        'الساحل',                'Many birds rest along the coast.'],
      ['reef',      'a line of rock or coral under the sea',           'شعاب مرجانية',          'The Red Sea reef is full of life.'],
      ['mangrove',  'a tree that grows in salty coastal water',        'أشجار القُرم',          'Mangrove trees protect the coast.'],
      ['climate',   'the usual weather of a place over years',         'المناخ',                'The desert climate is hot and dry.'],
      ['drought',   'a long time with no rain',                        'الجفاف',                'A drought makes water hard to find.'],
      ['vegetation','the plants that grow in a place',                 'الغطاء النباتي',        'There is little vegetation in the sand.'],
      ['soil',      'the top layer of earth where plants grow',        'التربة',                'Healthy soil helps plants grow.'],
      ['balance',   'a state where nature stays healthy and stable',   'التوازن',               'Every animal keeps the balance of nature.'],
      ['wetland',   'wet land where water birds and plants live',      'أرض رطبة',              'The wetland is home to many birds.'],
    ],
  },
  {
    code: 'ENV-CONSERV', source: 'uni:ENV-CONSERV', name_ar: 'الحماية والمحافظة',
    words: [
      ['conservation','protecting nature and wildlife',                'المحافظة على البيئة',   'Conservation keeps rare animals alive.'],
      ['reserve',   'a protected area for wildlife',                   'محمية طبيعية',          'The oryx live in a large reserve.'],
      ['protect',   'to keep something safe from harm',                'يحمي',                  'We protect the birds during the season.'],
      ['endangered','at risk of no longer existing',                   'مهدَّد بالانقراض',      'The Arabian leopard is endangered.'],
      ['extinct',   'no longer existing anywhere',                     'منقرض',                 'We work so no species becomes extinct.'],
      ['threat',    'something that can cause harm',                   'تهديد / خطر',           'Hunting is a threat to wildlife.'],
      ['pollution', 'harmful waste in air, water, or land',            'التلوث',                'Pollution hurts sea animals.'],
      ['poaching',  'hunting animals against the law',                 'الصيد الجائر',          'Poaching is a serious problem.'],
      ['restore',   'to bring nature back to a healthy state',         'يُعيد التأهيل',         'We restore land after a fire.'],
      ['breeding',  'producing young animals, often to save a species','التكاثر / الإكثار',     'A breeding program saved the oryx.'],
      ['release',   'to set an animal free into the wild',             'الإطلاق في البرية',     'We release the birds after they grow.'],
      ['monitor',   'to watch something carefully over time',          'يرصد / يراقب',          'We monitor the animals every week.'],
      ['survey',    'a careful study to count or check',               'مسح ميداني',            'We do a survey of the herd each year.'],
      ['population','the number of animals of one kind',               'التعداد',               'The oryx population is growing again.'],
      ['sustainable','able to continue without harming nature',        'مستدام',                'We want sustainable use of the land.'],
    ],
  },
  {
    code: 'ENV-TOUR', source: 'uni:ENV-TOUR', name_ar: 'السياحة البيئية',
    words: [
      ['ecotourism','tourism that respects and protects nature',       'السياحة البيئية',       'Ecotourism helps the local people.'],
      ['visitor',   'a person who comes to see a place',               'زائر',                  'A visitor asked about the birds.'],
      ['guide',     'a person who shows visitors around',              'مرشد / دليل',           'She is a wildlife guide at the reserve.'],
      ['tour',      'a short trip to see a place',                     'جولة',                  'The tour starts early in the morning.'],
      ['trail',     'a path for walking in nature',                    'مسار / درب',            'Please stay on the marked trail.'],
      ['viewpoint', 'a place with a good view',                        'نقطة مشاهدة',           'We stopped at the viewpoint to rest.'],
      ['binoculars','a tool for seeing things far away',               'منظار مقرّب',           'She used binoculars to watch the falcon.'],
      ['campsite',  'a place where visitors can camp',                 'موقع تخييم',            'The campsite is near the wadi.'],
      ['permit',    'an official paper that allows something',         'تصريح',                 'You need a permit to enter the reserve.'],
      ['brochure',  'a small book with information',                   'كُتيّب تعريفي',         'The brochure explains the rules.'],
      ['souvenir',  'a thing you keep to remember a trip',             'تذكار',                 'A photo is a nice souvenir.'],
      ['sighting',  'seeing a wild animal',                            'مشاهدة كائن',           'We had a rare sighting of an oryx.'],
      ['litter',    'rubbish left on the ground',                      'نفايات / مخلفات',       'Please do not leave litter behind.'],
      ['respect',   'to treat nature and rules with care',             'يحترم',                 'Visitors must respect the wildlife.'],
      ['experience','something you do and feel',                       'تجربة',                 'A desert night is a wonderful experience.'],
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
if (!NOURA_EMAIL || /placeholder|example\.com/i.test(NOURA_EMAIL)) {
  console.error('🛑 HALT: NOURA_EMAIL looks like a placeholder.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const EMAIL_LOWER = NOURA_EMAIL.toLowerCase();

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

  // 0. Dedicated private group (idempotent on code)
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
          level: ACADEMIC_LEVEL,   // A2 — known
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

  const pre = await getExistingAuthUser(NOURA_EMAIL);
  const { data: preProf } = await supabase.from('profiles').select('id').eq('email', EMAIL_LOWER).maybeSingle();
  if (pre || preProf) {
    console.log(`  ⏭️  ${NOURA_EMAIL} already present (auth:${!!pre} profile:${!!preProf}) — will reuse idempotently.`);
  }

  // 1. Auth user (idempotent)
  let userId;
  if (pre) {
    userId = pre.id;
    console.log(`  ⏭️  Auth user already exists (${userId}) — reusing.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: NOURA_EMAIL,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: NOURA_NAME },
    });
    if (error) throw new Error(`Auth create failed: ${error.message}`);
    userId = data.user.id;
    console.log(`  ✅ Auth user created: ${userId}`);
  }

  // 2. profiles upsert (must_change_password lives HERE)
  const profilePayload = {
    id: userId,
    full_name: NOURA_NAME,
    display_name: NOURA_DISPLAY,
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

  // 3. students upsert — B1 known, no placement (onboarding_completed=true), env track granted
  const studentPayload = {
    id: userId,
    academic_level: ACADEMIC_LEVEL,
    package: PACKAGE,
    track: TRACK,
    group_id: groupId,
    status: 'active',
    gender: GENDER,
    study_mode: STUDY_MODE,
    onboarding_completed: true,        // level is known → straight to her curriculum (no placement)
    goals: NOURA_GOAL,
    interests: NOURA_INTERESTS,
    temp_password: TEMP_PASSWORD,      // so it shows in /admin/students for Ali
    uses_env_track: true,              // gated «مسار البيئة» (migration 20260720120000_env_track)
  };
  const { data: stu, error: sErr } = await supabase
    .from('students').upsert(studentPayload, { onConflict: 'id' })
    .select('id, academic_level, package, track, group_id, status, gender, study_mode, onboarding_completed, uses_env_track');
  if (sErr) throw new Error(`Student upsert failed: ${sErr.message}\n  → payload: ${JSON.stringify(studentPayload)}`);
  assertOne(stu, 'students upsert');
  const s = stu[0];
  console.log(`  ✅ Student row upserted (level=${s.academic_level}, pkg=${s.package}, track=${s.track}, group=${s.group_id}, gender=${s.gender}, env_track=${s.uses_env_track})`);

  return { userId, groupId };
}

// ─── LAYER 2 — 4 WILDLIFE/ENV/ECOTOURISM VOCAB COLLECTIONS into vocab_cards ───
async function layer2(userId) {
  console.log('\n=== LAYER 2 — WILDLIFE/ENVIRONMENT/ECOTOURISM VOCABULARY COLLECTIONS ===');

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
    console.log(`🚀 Provisioning ${NOURA_NAME} <${NOURA_EMAIL}>`);
    const { userId, groupId } = await layer1();
    const perCourse = await layer2(userId);

    // Verify
    const { data: prof } = await supabase.from('profiles').select('full_name, role, must_change_password').eq('id', userId).maybeSingle();
    const { data: stu } = await supabase.from('students').select('academic_level, package, track, group_id, status, gender, study_mode, onboarding_completed, uses_env_track').eq('id', userId).maybeSingle();
    const { count: uniN } = await supabase.from('vocab_cards').select('id', { count: 'exact', head: true }).eq('student_id', userId).like('source', 'uni:%');
    const totalWords = Object.values(perCourse).reduce((a, c) => a + c.count, 0);

    console.log('\n=== HANDOFF ===');
    console.log('┌───────────────────────────────────────────────');
    console.log(`  STUDENT: ${NOURA_NAME}`);
    console.log(`  AUTH ID: ${userId}`);
    console.log('  LOGIN URL: https://app.fluentia.academy');
    console.log(`  EMAIL: ${NOURA_EMAIL}`);
    console.log(`  TEMP PASSWORD: ${TEMP_PASSWORD}  (forced change on first login)`);
    console.log(`  LEVEL: ${stu?.academic_level} (A2 — known, no placement)`);
    console.log(`  PACKAGE: ${stu?.package} (فردي، حصّتان أسبوعياً) · GROUP: ${GROUP_NAME} (${groupId})`);
    console.log(`  ENV TRACK: ${stu?.uses_env_track ? 'granted («مسار البيئة»)' : 'NOT granted'}`);
    console.log(`  VOCAB COLLECTIONS: ${Object.keys(perCourse).length} · WORDS: ${totalWords} (uni:% rows=${uniN})`);
    console.log('└───────────────────────────────────────────────');

    const ok = prof?.role === 'student' && prof?.must_change_password === true &&
               stu?.academic_level === ACADEMIC_LEVEL && stu?.package === PACKAGE &&
               stu?.gender === GENDER && stu?.group_id === groupId && stu?.uses_env_track === true &&
               stu?.onboarding_completed === true &&
               Object.values(perCourse).every((c) => c.count === c.planned);
    if (!ok) { console.error('\n💥 Some checks FAILED — investigate above.'); process.exit(1); }
    console.log('\n✅ Done — نورة has a working account + 4 vocab collections + the environment track gate. AUTH_ID=' + userId);
  } catch (e) {
    console.error('\n💥 FATAL:', e.message);
    process.exit(1);
  }
})();
