// scripts/seed-dhafer-worksheet.cjs
// Re-authors ظافر آل قهيدان's «الأزمنة الأربعة — تحويل الجُمل» task as an interactive
// WORKSHEET (content.render='worksheet') matching the approved artifact:
//   4 tenses × 3 rows. In EACH row ONE form is GIVEN (green cell) — and the given form
//   VARIES per row (aff / neg / Yes-No / Wh) — the student fills the other 3.
//   Automotive-business themed (personalised for ظافر). Rule-based local grading
//   (validateAnswer over accepted_answers) — NO AI at runtime.
// Surface: targeted_exercises → /student/exercises → WorksheetView.
// Safety: only UPDATES the existing PENDING row (never touches a completed attempt).
// Run:  node scripts/seed-dhafer-worksheet.cjs   (add --dry to print without writing)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('❌ missing env (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const DHAFER_ID = 'f1ebe336-fe3f-428f-957e-051458c516f5';
const TITLE = 'الأزمنة الأربعة — تحويل الجُمل';
const DRY = process.argv.includes('--dry');

const FORMS = ['aff', 'neg', 'q', 'wh']; // column order (Affirmative → Negative → Yes/No → Wh)
// Arabic form labels used as the grading question text (columns carry the visible header).
const COL_LABEL = {
  aff: 'مثبت · Affirmative',
  neg: 'منفي · Negative',
  q: 'سؤال · Yes/No',
  wh: 'سؤال بأداة · Wh- Question',
};

// ─── SOURCE (automotive-business themed; given VARIES per row) ────────────────
// acc = extra accepted variants for a blank (model is auto-included; validateAnswer
// already handles case / punctuation / contractions like doesn't↔does not).
const SRC = [
  { id: 'ps', en: 'Present Simple', ar: 'المضارع البسيط', aux: 'do / does', rows: [
    { given: 'q',   aff: 'He checks the engine every morning.', neg: "He doesn't check the engine every morning.", q: 'Does he check the engine every morning?', wh: 'When does he check the engine?',
      acc: { wh: ['When does he check the engine?', 'When does he check the engine every morning?'] } },
    { given: 'aff', aff: 'They sell spare parts here.', neg: "They don't sell spare parts here.", q: 'Do they sell spare parts here?', wh: 'What do they sell here?',
      acc: { wh: ['What do they sell here?', 'What do they sell?'] } },
    { given: 'neg', aff: 'The shop opens at eight.', neg: "The shop doesn't open at eight.", q: 'Does the shop open at eight?', wh: 'When does the shop open?' },
  ]},
  { id: 'pc', en: 'Present Continuous', ar: 'المضارع المستمر', aux: 'am / is / are + -ing', rows: [
    { given: 'wh',  aff: 'He is repairing the car now.', neg: "He isn't repairing the car now.", q: 'Is he repairing the car now?', wh: 'What is he repairing now?',
      acc: { aff: ['He is repairing the car now.', "He's repairing the car now."], neg: ["He isn't repairing the car now.", 'He is not repairing the car now.', "He's not repairing the car now."] } },
    { given: 'q',   aff: 'The customers are waiting outside.', neg: "The customers aren't waiting outside.", q: 'Are the customers waiting outside?', wh: 'Where are the customers waiting?' },
    { given: 'aff', aff: 'The manager is talking to a client.', neg: "The manager isn't talking to a client.", q: 'Is the manager talking to a client?', wh: 'Who is the manager talking to?',
      acc: { wh: ['Who is the manager talking to?', 'To whom is the manager talking?'] } },
  ]},
  { id: 'pas', en: 'Past Simple', ar: 'الماضي البسيط', aux: 'did', rows: [
    { given: 'neg', aff: 'He bought new tools yesterday.', neg: "He didn't buy new tools yesterday.", q: 'Did he buy new tools yesterday?', wh: 'What did he buy yesterday?',
      acc: { wh: ['What did he buy yesterday?', 'What did he buy?'] } },
    { given: 'wh',  aff: 'The client paid the invoice.', neg: "The client didn't pay the invoice.", q: 'Did the client pay the invoice?', wh: 'What did the client pay?' },
    { given: 'q',   aff: 'They finished the job on time.', neg: "They didn't finish the job on time.", q: 'Did they finish the job on time?', wh: 'When did they finish the job?',
      acc: { wh: ['When did they finish the job?', 'When did they finish the job on time?'] } },
  ]},
  { id: 'pastc', en: 'Past Continuous', ar: 'الماضي المستمر', aux: 'was / were + -ing', rows: [
    { given: 'aff', aff: 'He was driving to the workshop.', neg: "He wasn't driving to the workshop.", q: 'Was he driving to the workshop?', wh: 'Where was he driving?',
      acc: { wh: ['Where was he driving?', 'Where was he driving to?'] } },
    { given: 'neg', aff: 'They were cleaning the cars.', neg: "They weren't cleaning the cars.", q: 'Were they cleaning the cars?', wh: 'What were they cleaning?' },
    { given: 'wh',  aff: 'The mechanic was fixing the brakes.', neg: "The mechanic wasn't fixing the brakes.", q: 'Was the mechanic fixing the brakes?', wh: 'What was the mechanic fixing?' },
  ]},
];

// ─── BUILD worksheet + flat questions (for grading via submitMutation) ────────
const tenses = [];
const questions = [];
for (const t of SRC) {
  const rows = t.rows.map((r, ri) => {
    for (const f of FORMS) {
      if (f === r.given) continue; // given cell is not a blank
      questions.push({
        id: `${t.id}-${ri}-${f}`,
        form: f,
        tense_id: t.id,
        question: COL_LABEL[f],
        correct_answer: r[f],
        accepted_answers: (r.acc && r.acc[f]) || [r[f]],
      });
    }
    return { given: r.given, forms: { aff: r.aff, neg: r.neg, q: r.q, wh: r.wh } };
  });
  tenses.push({ id: t.id, en: t.en, ar: t.ar, aux: t.aux, rows });
}

const content = {
  type: 'rewrite',            // keep — nav gating + type checks stay valid
  render: 'worksheet',        // NEW → routes to WorksheetView
  variant: 'tense_transformation',
  source: 'manual',
  check_mode: 'submit',       // whole-sheet submit
  title_en: 'Tense Transformation Worksheet',
  worksheet: {
    method_ar: 'في كل صف خانة واحدة فقط محلولة ومظلّلة بالأخضر (مُعطى) — وقد تكون مُثبتةً أو منفيةً أو سؤالاً (نعم/لا) أو سؤالاً بأداة، وتختلف من صف لآخر. مهمتك: انطلق من الخانة المُعطاة واملأ الصيغ الثلاث الباقية.',
    forms: [
      { k: 'مثبت',      en: 'Affirmative',   ar: 'جملة خبرية مثبتة.' },
      { k: 'منفي',      en: 'Negative',      ar: 'نفي الجملة المثبتة.' },
      { k: 'سؤال',      en: 'Yes/No',        ar: 'يبدأ بالفعل المساعد.' },
      { k: 'سؤال بأداة', en: 'Wh- Question',  ar: 'أضِف What/Where/When/Who/Why.' },
    ],
    example: {
      hint_ar: 'هنا المُعطى هو المثبت — لاحظ أن الخانة المُعطاة تتغيّر في كل صف داخل الورقة.',
      rows: [
        { form: 'aff', tag: 'مُعطى · مثبت',      sent: 'She works in a bank.',   given: true },
        { form: 'neg', tag: 'منفي · Negative',    sent: "She doesn't work in a bank." },
        { form: 'q',   tag: 'سؤال · Yes/No',      sent: 'Does she work in a bank?' },
        { form: 'wh',  tag: 'سؤال بأداة · Wh-',   sent: 'Where does she work?' },
      ],
    },
    tenses,
  },
  questions,
};

module.exports = { content, questions, tenses };

// ─── MAIN ─────────────────────────────────────────────────────────────────────
if (require.main === module) (async () => {
  if (questions.length !== 36) throw new Error(`expected 36 blanks, built ${questions.length}`);
  for (const q of questions) {
    if (!q.accepted_answers.includes(q.correct_answer)) throw new Error(`${q.id}: correct not in accepted`);
  }
  // given-distribution sanity: each form given exactly 3×
  const dist = { aff: 0, neg: 0, q: 0, wh: 0 };
  for (const t of tenses) for (const r of t.rows) dist[r.given]++;
  console.log('given distribution:', dist);
  if (Object.values(dist).some((n) => n !== 3)) throw new Error('given forms not balanced (want 3 each)');

  if (DRY) { console.log(JSON.stringify(content, null, 2)); return; }

  // safety: target must be ظافر, male, active
  const { data: stu, error: sErr } = await sb.from('students').select('id, gender, status, deleted_at').eq('id', DHAFER_ID).maybeSingle();
  if (sErr || !stu || stu.gender !== 'male' || stu.status !== 'active' || stu.deleted_at) {
    throw new Error(`target student assertion failed: ${sErr?.message || JSON.stringify(stu)}`);
  }

  // must exist and be PENDING (never rewrite a completed attempt)
  const { data: rows, error: rErr } = await sb.from('targeted_exercises')
    .select('id, status').eq('student_id', DHAFER_ID).eq('title', TITLE);
  if (rErr) throw rErr;
  if (!rows || rows.length === 0) throw new Error('task row not found — run seed-dhafer-four-tenses.cjs first');
  if (rows.length > 1) throw new Error(`ambiguous: ${rows.length} rows with this title`);
  const row = rows[0];
  if (row.status !== 'pending') throw new Error(`refusing to overwrite: status='${row.status}' (not pending)`);

  const { data: upd, error: uErr } = await sb.from('targeted_exercises')
    .update({ content, instructions: content.worksheet.method_ar, difficulty: 'medium' })
    .eq('id', row.id).eq('status', 'pending')
    .select('id, title, status');
  if (uErr) throw uErr;
  if (!upd || upd.length !== 1) throw new Error(`update touched ${upd?.length ?? 0} rows`);
  console.log(`✅ worksheet content written to ${upd[0].id} — ${upd[0].title} (${questions.length} blanks, ${tenses.length} tenses)`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
