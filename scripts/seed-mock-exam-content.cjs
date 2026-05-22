// scripts/seed-mock-exam-content.cjs
// Inserts 2 mock exams + all questions (A1: 35 items, B1: 39 items) — 100 pts each.
// Idempotent: re-running gives identical final state.

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// KSA Thursday 22:00 = UTC 19:00
const OPEN_AT  = '2026-05-21T19:00:00+00:00';
const CLOSE_AT = '2026-05-22T19:00:00+00:00';

const L1_LEVEL_ID = '2755b494-c7ff-4bdc-96ac-7ab735dc038c';
const L3_LEVEL_ID = 'f7e8dbfb-ec8e-4491-a62d-f54fd4c41aab';

const A1_EXAM = {
  code: 'midterm-mock-a1',
  title_ar: 'الاختبار التجريبي — المستوى A1',
  subtitle_ar: 'الوحدات ١–٤ — اختبار تدريبي قبل الاختبار الفعلي',
  level_id: L1_LEVEL_ID,
  duration_minutes: 75,
  pass_threshold: 60,
  total_points: 100,
  open_at: OPEN_AT,
  close_at: CLOSE_AT,
  min_writing_words: 50,
  visibility: 'preview',
  is_active: true,
};

const B1_EXAM = {
  code: 'midterm-mock-b1',
  title_ar: 'الاختبار التجريبي — المستوى B1',
  subtitle_ar: 'الوحدات ١–٤ — اختبار تدريبي قبل الاختبار الفعلي',
  level_id: L3_LEVEL_ID,
  duration_minutes: 90,
  pass_threshold: 60,
  total_points: 100,
  open_at: OPEN_AT,
  close_at: CLOSE_AT,
  min_writing_words: 80,
  visibility: 'preview',
  is_active: true,
};

// =================================================================
// A1 — 35 items
// Grammar 10×3.0=30 | Reading 10×2.5=25 | Vocabulary 8×2.5=20 | Spelling 6×2.5=15 | Writing 1×10=10  → 100
// =================================================================

const A1_GRAMMAR = [
  { stem: 'She ___ from Saudi Arabia.', options: ['am','is','are','be'], correct_index: 1, question_type: 'mcq' },
  { stem: 'My brother and I ___ students at this school.', options: ['am','is','are','be'], correct_index: 2, question_type: 'mcq' },
  { stem: 'He eats ___ apple every morning.', options: ['a','an','the','—'], correct_index: 1, question_type: 'mcq' },
  { stem: 'I usually ___ to school by bus.', question_type: 'fill_blank', acceptable_answers: ['go','take'] },
  { stem: 'There ___ three books and a pen on the table.', options: ['am','is','are','be'], correct_index: 2, question_type: 'mcq' },
  { stem: '[1]My sister [2]like [3]to [4]watch movies on Friday.', options: ['My sister','like','to','watch movies on Friday'], correct_index: 1, question_type: 'error_detection' },
  { stem: 'What ___ your favorite color?', options: ['is','are','am','be'], correct_index: 0, question_type: 'mcq' },
  { stem: 'Riyadh ___ the capital of Saudi Arabia.', question_type: 'fill_blank', acceptable_answers: ['is'] },
  { stem: 'Sara doesn\'t ___ coffee in the morning.', options: ['drink','drinks','drinking','drank'], correct_index: 0, question_type: 'mcq' },
  { stem: '[1]My friends [2]is [3]coming to [4]my house tomorrow.', options: ['My friends','is','coming to','my house tomorrow'], correct_index: 1, question_type: 'error_detection' },
];

const A1_READING_PASSAGE_1 = {
  title: 'A Family Picnic in the Park',
  text:
`On a sunny Friday morning, Layla and her family go to the park. They bring sandwiches, fruit, and cold water from home. Her father is a kind man who loves to tell stories. Her mother is a teacher and she sings songs with the kids.

Layla has two brothers and one little sister. Her brothers play football on the green grass. Her sister is only three years old. She runs after the birds and laughs every time they fly.

The family sits under a big tree. They eat lunch together and share food with cousins. Layla's grandfather joins them after the noon prayer. He tells the children old stories about the desert.

In the evening, the family is tired but happy. Layla says, "Friday with my family is the best day of the week." Everyone agrees and they go home together.`,
};

const A1_READING_PASSAGE_2 = {
  title: 'The Robot at My School',
  text:
`Last month, a new helper came to our school. It is not a person — it is a small robot called Nour. Nour is white and blue, and it has bright eyes. Our science teacher, Mr. Khalid, brought it to our class on Monday.

Nour can speak English and Arabic. It helps us learn new words every day. When we say a word in English, Nour says the word in Arabic. The students love this game. We laugh when Nour makes a small mistake.

Nour does not get tired. It works all day and never asks for a break. But Mr. Khalid says we still need a real teacher. A robot can help us, but it can not understand our feelings.

I think Nour is amazing. I want to be an engineer one day. Maybe I will build a robot like Nour for my future students.`,
};

const A1_READING = [
  // Passage 1 — index 0..4
  { passage_group: 1, stem: 'Why does Layla\'s family go to the park?', options: ['To play football alone','To have a family picnic together','To pray together at the masjid','To buy food from the shops'], correct_index: 1, question_type: 'mcq' },
  { passage_group: 1, stem: 'How old is Layla\'s little sister?', options: ['One year old','Two years old','Three years old','Five years old'], correct_index: 2, question_type: 'mcq' },
  { passage_group: 1, stem: 'Who joins the family after the noon prayer?', options: ['The mother','The cousins','The grandfather','A neighbour'], correct_index: 2, question_type: 'mcq' },
  { passage_group: 1, stem: 'TRUE or FALSE: Layla\'s father is a teacher.', options: ['True','False'], correct_index: 1, question_type: 'true_false' },
  { passage_group: 1, stem: 'TRUE or FALSE: Layla thinks Friday is the best day because she is with her family.', options: ['True','False'], correct_index: 0, question_type: 'true_false' },
  // Passage 2 — index 5..9
  { passage_group: 2, stem: 'What is Nour?', options: ['A new student','A science teacher','A small robot','A computer game'], correct_index: 2, question_type: 'mcq' },
  { passage_group: 2, stem: 'What two languages can Nour speak?', options: ['English and French','English and Arabic','Arabic and Urdu','English and Spanish'], correct_index: 1, question_type: 'mcq' },
  { passage_group: 2, stem: 'Why does Mr. Khalid say we still need a real teacher?', options: ['A robot is too expensive','A robot can not understand our feelings','A robot is too small to be useful','A robot does not speak Arabic'], correct_index: 1, question_type: 'mcq' },
  { passage_group: 2, stem: 'TRUE or FALSE: Nour needs a break every hour.', options: ['True','False'], correct_index: 1, question_type: 'true_false' },
  { passage_group: 2, stem: 'TRUE or FALSE: The writer wants to build robots in the future.', options: ['True','False'], correct_index: 0, question_type: 'true_false' },
];

const A1_VOCABULARY = [
  { stem: 'What does the word "celebrate" mean in Arabic?', options: ['يحلم','يحتفل','يبكي','ينام'], correct_index: 1, question_type: 'mcq' },
  { stem: 'Choose the best word: Many families ___ together for Eid lunch.', options: ['finish','gather','leave','forget'], correct_index: 1, question_type: 'mcq' },
  { stem: 'What does "traditional" mean?', options: ['very expensive and modern','passed down from past generations','made only for children','used only on weekends'], correct_index: 1, question_type: 'mcq' },
  { stem: 'Choose the best word: The big whale ___ very deep songs to other whales far away.', options: ['sings','writes','draws','cooks'], correct_index: 0, question_type: 'mcq' },
  { stem: 'ما معنى كلمة "discover" بالعربي؟', options: ['يكتشف','يصف','يقرر','يدمر'], correct_index: 0, question_type: 'mcq' },
  { stem: 'Type the missing word: After many years of training, the astronaut is ready to ___ space for the first time.', question_type: 'fill_blank', acceptable_answers: ['explore'] },
  { stem: 'Which word is closest in meaning to "amazing"?', options: ['small','incredible','sleepy','angry'], correct_index: 1, question_type: 'mcq' },
  { stem: 'What is the opposite of "expensive"?', options: ['affordable','large','fast','old'], correct_index: 0, question_type: 'mcq' },
];

const A1_SPELLING = [
  { stem: 'Pick the correct spelling:', options: ['beautiful','beutiful','beautifull','beatuful'], correct_index: 0, question_type: 'mcq' },
  { stem: 'Pick the correct spelling:', options: ['tradisional','traditional','tradtional','traditionall'], correct_index: 1, question_type: 'mcq' },
  { stem: 'Pick the correct spelling:', options: ['incradible','increedable','incredible','increadible'], correct_index: 2, question_type: 'mcq' },
  { stem: 'اكتبي الكلمة الصحيحة: I look up at the bright ___ at night. (المعنى: السماء)', question_type: 'fill_blank', acceptable_answers: ['sky'] },
  { stem: 'اكتبي الكلمة الصحيحة: Saudi families ___ Eid with sweets and gifts. (المعنى: يحتفلون)', question_type: 'fill_blank', acceptable_answers: ['celebrate'] },
  { stem: 'اكتبي الكلمة الصحيحة: Scientists want to ___ the deep ocean. (المعنى: يستكشفون)', question_type: 'fill_blank', acceptable_answers: ['explore'] },
];

const A1_WRITING = [
  {
    stem: 'تعليمات: Write about your morning routine in English. What time do you wake up? What do you do first? What do you eat for breakfast? Where do you go after breakfast? Write at least 50 words.',
    question_type: 'writing_prompt',
    writing_min_words: 50,
  },
];

// =================================================================
// B1 — 39 items
// Grammar 12×2.5=30 | Reading 10×2.5=25 | Vocabulary 10×2.0=20 | Spelling 6×2.5=15 | Writing 1×10=10 → 100
// =================================================================

const B1_GRAMMAR = [
  { stem: 'She ___ to Paris three times in her life.', options: ['went','has gone','was going','goes'], correct_index: 1, question_type: 'mcq' },
  { stem: 'When the earthquake started, we ___ dinner.', options: ['had','were having','have had','are having'], correct_index: 1, question_type: 'mcq' },
  { stem: 'If it ___ tomorrow, we will stay home.', options: ['rains','will rain','rained','is raining'], correct_index: 0, question_type: 'mcq' },
  { stem: 'She has been working at the hospital ___ five years.', options: ['since','for','during','in'], correct_index: 1, question_type: 'mcq' },
  { stem: 'Type the missing superlative: Mount Everest is the ___ mountain in the world.', question_type: 'fill_blank', acceptable_answers: ['highest','tallest'] },
  { stem: '[1]Since 2020, [2]our team [3]have implemented [4]more than ten new AI tools.', options: ['Since 2020,','our team','have implemented','more than ten new AI tools'], correct_index: 2, question_type: 'error_detection' },
  { stem: 'By the time we arrived, the meeting ___ already started.', options: ['had','has','was','is'], correct_index: 0, question_type: 'mcq' },
  { stem: 'Coffee is good ___ your morning, but bad ___ your sleep.', options: ['at / at','for / at','for / for','in / on'], correct_index: 2, question_type: 'mcq' },
  { stem: 'Type the missing word: Climate change ___ already affected the coral reefs.', question_type: 'fill_blank', acceptable_answers: ['has'] },
  { stem: 'I\'d rather ___ at home tonight than go out.', options: ['stay','to stay','staying','stayed'], correct_index: 0, question_type: 'mcq' },
  { stem: 'Coral reefs are ___ beautiful than many people think.', options: ['more','most','very','much'], correct_index: 0, question_type: 'mcq' },
  { stem: '[1]The scientist [2]which discovered [3]this new species [4]works in Riyadh.', options: ['The scientist','which discovered','this new species','works in Riyadh'], correct_index: 1, question_type: 'error_detection' },
];

const B1_READING_PASSAGE_1 = {
  title: 'The Quiet Revolution in Saudi Classrooms',
  text:
`For many decades, classrooms in Saudi Arabia looked very similar to those in other parts of the world. Teachers stood at the front of the room, students sat in rows, and learning followed a fixed schedule. However, in the past five years, something quietly remarkable has been happening. Schools across the Kingdom have begun to embrace artificial intelligence tools that adapt lessons to each student's pace and ability.

Dr. Yara Al-Otaibi, who has been teaching English in Jeddah for fifteen years, remembers when she had to prepare every exercise by hand. "Now," she explains, "an AI program creates personalized reading exercises for each of my thirty students. Some are simple, others are more challenging. The system knows what every child needs." Her words reflect a broader shift across the region: technology is no longer replacing teachers, but supporting them.

Of course, this transformation has not been easy. Several teachers, especially those who started their careers before computers became common, initially felt uncertain about using AI. Training programs in Riyadh and Dammam have helped many of them adapt. According to a 2024 report from the Saudi Ministry of Education, over 60% of teachers now feel comfortable with at least one AI classroom tool.

Students, however, have welcomed the change much faster. Younger learners often discover useful features that surprise even their teachers. Some students use AI tutors to practice English pronunciation in the evening, while others ask the system to explain a difficult math problem in three different ways until they finally understand it.

The future of Saudi education will not be decided by machines alone. But if current trends continue, AI will remain an important partner in the classroom for years to come.`,
};

const B1_READING_PASSAGE_2 = {
  title: 'How a Cup of Coffee Connects Continents',
  text:
`When you drink your morning coffee, you might not think about the long journey that those small brown beans completed before reaching your cup. The story of coffee is, in many ways, the story of how the modern world became connected.

The plant first appeared in the highlands of Ethiopia, where, according to legend, a young goat herder noticed his animals becoming unusually lively after eating the red berries of a wild bush. By the fifteenth century, coffee had spread north into the Arabian Peninsula. In cities such as Makkah, traders gathered in early coffee houses to discuss business, poetry, and politics. These places quickly became important social spaces where ideas could move as easily as goods.

European visitors who passed through the Ottoman Empire were initially suspicious of the dark, bitter drink. Some religious leaders even tried to ban it. However, by the seventeenth century, coffee houses had opened across London, Paris, and Vienna, and they had become favourite meeting places for writers, scientists, and merchants. Many historians argue that some of Europe's most important intellectual movements would not have been possible without these lively cafés.

Today, coffee is grown in more than fifty countries, mostly in regions close to the equator. The journey from a small farm to a paper cup involves dozens of people: farmers, sorters, exporters, roasters, and baristas. When customers in the Gulf order an espresso, they are quietly supporting a global system that has taken hundreds of years to develop.

Still, this system is not perfect. Farmers in countries such as Ethiopia and Colombia often receive only a small share of the final price. Movements such as direct trade aim to give producers a fairer return — proving that the simple ritual of drinking coffee can still raise complicated questions about justice and value.`,
};

const B1_READING = [
  // Passage 1 — index 0..4: 2 MCQ + 2 T/F + 1 T/F/NG
  { passage_group: 1, stem: 'What is the main idea of the passage?', options: ['AI is replacing teachers in Saudi schools','AI is becoming a useful partner for teachers in Saudi Arabia','Saudi schools are buying very expensive computers','Students no longer need any teachers'], correct_index: 1, question_type: 'mcq' },
  { passage_group: 1, stem: 'Why did some experienced teachers feel uncertain about AI at first?', options: ['They started teaching before computers became common','They did not want students to learn anything new','They were not paid enough to use the new tools','They preferred old textbooks for cultural reasons'], correct_index: 0, question_type: 'mcq' },
  { passage_group: 1, stem: 'TRUE or FALSE: Dr. Yara Al-Otaibi has taught English for more than ten years.', options: ['True','False'], correct_index: 0, question_type: 'true_false' },
  { passage_group: 1, stem: 'TRUE or FALSE: According to the passage, all Saudi teachers immediately felt comfortable with AI tools.', options: ['True','False'], correct_index: 1, question_type: 'true_false' },
  { passage_group: 1, stem: 'TRUE, FALSE, or NOT GIVEN: The Saudi Ministry of Education will require every teacher to use AI by the year 2030.', options: ['True','False','Not Given'], correct_index: 2, question_type: 'true_false_ng' },
  // Passage 2 — index 5..9
  { passage_group: 2, stem: 'According to the passage, what did Europeans think of coffee at first?', options: ['They loved it immediately','They thought it was too cheap','They were suspicious of it','They preferred it to tea'], correct_index: 2, question_type: 'mcq' },
  { passage_group: 2, stem: 'Why does the writer mention farmers in Ethiopia and Colombia in the last paragraph?', options: ['To show that coffee is grown in many places','To suggest that the global coffee system is not always fair','To prove that coffee originated in those two countries','To complain about the price of coffee in Europe'], correct_index: 1, question_type: 'mcq' },
  { passage_group: 2, stem: 'TRUE or FALSE: Coffee first appeared in Ethiopia before it spread to the Arabian Peninsula.', options: ['True','False'], correct_index: 0, question_type: 'true_false' },
  { passage_group: 2, stem: 'TRUE or FALSE: Direct-trade movements aim to give coffee farmers a larger share of the final price.', options: ['True','False'], correct_index: 0, question_type: 'true_false' },
  { passage_group: 2, stem: 'TRUE, FALSE, or NOT GIVEN: The coffee served in Makkah and the coffee served in London were exactly the same.', options: ['True','False','Not Given'], correct_index: 2, question_type: 'true_false_ng' },
];

const B1_VOCABULARY = [
  { stem: '"embrace" is closest in meaning to:', options: ['reject','accept','ignore','forget'], correct_index: 1, question_type: 'mcq' },
  { stem: 'Choose the best word: The technology has ___ as one of the most important tools of our century.', options: ['emerged','disappeared','arrived late','slowed down'], correct_index: 0, question_type: 'mcq' },
  { stem: 'Choose the best word: Coral reefs are extremely ___ to small changes in water temperature.', options: ['resistant','vulnerable','famous','crowded'], correct_index: 1, question_type: 'mcq' },
  { stem: 'Which word is closest in meaning to "sophisticated"?', options: ['simple','advanced','traditional','loud'], correct_index: 1, question_type: 'mcq' },
  { stem: 'Type the missing word: The AI system can ___ early signs of disease with 94% accuracy.', question_type: 'fill_blank', acceptable_answers: ['detect'] },
  { stem: '"investigate" means:', options: ['to celebrate something','to research a problem carefully','to leave quickly','to forgive someone'], correct_index: 1, question_type: 'mcq' },
  { stem: 'Choose the best word: These corals can ___ water temperatures up to 32°C, which would kill most coral species.', options: ['withstand','reject','copy','draw'], correct_index: 0, question_type: 'mcq' },
  { stem: 'What is the opposite of "prevalent"?', options: ['common','widespread','rare','powerful'], correct_index: 2, question_type: 'mcq' },
  { stem: 'Type the missing verb: Coffee farmers have ___ their traditional growing methods to many new climate challenges.', question_type: 'fill_blank', acceptable_answers: ['adapted'] },
  { stem: 'Choose the best word: Climate change has begun to ___ traditional coffee-growing regions, forcing some farmers to move to higher altitudes.', options: ['support','disrupt','celebrate','monitor'], correct_index: 1, question_type: 'mcq' },
];

const B1_SPELLING = [
  { stem: 'Pick the correct spelling:', options: ['sophistecated','sophisticated','sophestecated','sofisticated'], correct_index: 1, question_type: 'mcq' },
  { stem: 'Pick the correct spelling:', options: ['unprecedented','unprecidented','unprecedanted','unpresedented'], correct_index: 0, question_type: 'mcq' },
  { stem: 'Pick the correct spelling:', options: ['acommodate','accommodate','accomodate','acomodate'], correct_index: 1, question_type: 'mcq' },
  { stem: 'Type the word that means "يحقق ويبحث بدقة" (to study a problem carefully):', question_type: 'fill_blank', acceptable_answers: ['investigate'] },
  { stem: 'Spell the word for "متطور ومتقدم" (highly advanced and complex):', question_type: 'fill_blank', acceptable_answers: ['sophisticated'] },
  { stem: 'Type the missing word: Coral reefs that can ___ rising sea temperatures may help save other reefs. (المعنى: يصمد أمام / يتحمل)', question_type: 'fill_blank', acceptable_answers: ['withstand'] },
];

const B1_WRITING = [
  {
    stem: 'Some people prefer studying English with the help of AI tools and apps. Others prefer learning in a classroom with a teacher and classmates. Which do you prefer and why? Write at least 80 words in English.',
    question_type: 'writing_prompt',
    writing_min_words: 80,
  },
];

// ---------------------------------------------------------------
// Build the full per-exam question arrays
// ---------------------------------------------------------------

function buildA1Questions() {
  const out = [];
  A1_GRAMMAR.forEach((q, i) => out.push({
    section: 'grammar', order_index: i + 1, question_type: q.question_type,
    stem: q.stem, options: q.options || null,
    correct_index: q.correct_index ?? null,
    acceptable_answers: q.acceptable_answers || null,
    passage_group: null, passage_text: null, passage_title: null,
    writing_min_words: null, points: 3.0,
  }));
  A1_READING.forEach((q, i) => {
    const p = q.passage_group === 1 ? A1_READING_PASSAGE_1 : A1_READING_PASSAGE_2;
    out.push({
      section: 'reading', order_index: i + 1, question_type: q.question_type,
      stem: q.stem, options: q.options || null,
      correct_index: q.correct_index ?? null,
      acceptable_answers: null,
      passage_group: q.passage_group, passage_text: p.text, passage_title: p.title,
      writing_min_words: null, points: 2.5,
    });
  });
  A1_VOCABULARY.forEach((q, i) => out.push({
    section: 'vocabulary', order_index: i + 1, question_type: q.question_type,
    stem: q.stem, options: q.options || null,
    correct_index: q.correct_index ?? null,
    acceptable_answers: q.acceptable_answers || null,
    passage_group: null, passage_text: null, passage_title: null,
    writing_min_words: null, points: 2.5,
  }));
  A1_SPELLING.forEach((q, i) => out.push({
    section: 'spelling', order_index: i + 1, question_type: q.question_type,
    stem: q.stem, options: q.options || null,
    correct_index: q.correct_index ?? null,
    acceptable_answers: q.acceptable_answers || null,
    passage_group: null, passage_text: null, passage_title: null,
    writing_min_words: null, points: 2.5,
  }));
  A1_WRITING.forEach((q, i) => out.push({
    section: 'writing', order_index: i + 1, question_type: q.question_type,
    stem: q.stem, options: null, correct_index: null,
    acceptable_answers: null,
    passage_group: null, passage_text: null, passage_title: null,
    writing_min_words: q.writing_min_words, points: 10.0,
  }));
  return out;
}

function buildB1Questions() {
  const out = [];
  B1_GRAMMAR.forEach((q, i) => out.push({
    section: 'grammar', order_index: i + 1, question_type: q.question_type,
    stem: q.stem, options: q.options || null,
    correct_index: q.correct_index ?? null,
    acceptable_answers: q.acceptable_answers || null,
    passage_group: null, passage_text: null, passage_title: null,
    writing_min_words: null, points: 2.5,
  }));
  B1_READING.forEach((q, i) => {
    const p = q.passage_group === 1 ? B1_READING_PASSAGE_1 : B1_READING_PASSAGE_2;
    out.push({
      section: 'reading', order_index: i + 1, question_type: q.question_type,
      stem: q.stem, options: q.options || null,
      correct_index: q.correct_index ?? null,
      acceptable_answers: null,
      passage_group: q.passage_group, passage_text: p.text, passage_title: p.title,
      writing_min_words: null, points: 2.5,
    });
  });
  B1_VOCABULARY.forEach((q, i) => out.push({
    section: 'vocabulary', order_index: i + 1, question_type: q.question_type,
    stem: q.stem, options: q.options || null,
    correct_index: q.correct_index ?? null,
    acceptable_answers: q.acceptable_answers || null,
    passage_group: null, passage_text: null, passage_title: null,
    writing_min_words: null, points: 2.0,
  }));
  B1_SPELLING.forEach((q, i) => out.push({
    section: 'spelling', order_index: i + 1, question_type: q.question_type,
    stem: q.stem, options: q.options || null,
    correct_index: q.correct_index ?? null,
    acceptable_answers: q.acceptable_answers || null,
    passage_group: null, passage_text: null, passage_title: null,
    writing_min_words: null, points: 2.5,
  }));
  B1_WRITING.forEach((q, i) => out.push({
    section: 'writing', order_index: i + 1, question_type: q.question_type,
    stem: q.stem, options: null, correct_index: null,
    acceptable_answers: null,
    passage_group: null, passage_text: null, passage_title: null,
    writing_min_words: q.writing_min_words, points: 10.0,
  }));
  return out;
}

async function upsertExam(exam) {
  const { data: existing } = await supabase
    .from('mock_exams').select('id').eq('code', exam.code).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('mock_exams').update(exam).eq('code', exam.code);
    if (error) throw error;
    console.log(`updated ${exam.code} (${existing.id})`);
    return existing.id;
  }
  const { data, error } = await supabase.from('mock_exams').insert(exam).select('id').single();
  if (error) throw error;
  console.log(`created ${exam.code} (${data.id})`);
  return data.id;
}

async function reseedQuestions(examId, code, questions) {
  const { error: delErr } = await supabase.from('mock_exam_questions').delete().eq('exam_id', examId);
  if (delErr) throw delErr;
  const withId = questions.map((q) => ({ ...q, exam_id: examId }));
  const { error } = await supabase.from('mock_exam_questions').insert(withId);
  if (error) {
    console.error(`insert for ${code} failed:`, error);
    throw error;
  }
  console.log(`inserted ${questions.length} questions for ${code}`);
}

async function verify(examId, code) {
  const { data, error } = await supabase
    .from('mock_exam_questions')
    .select('section, points')
    .eq('exam_id', examId);
  if (error) throw error;
  const bySection = data.reduce((acc, r) => {
    acc[r.section] = acc[r.section] || { count: 0, points: 0 };
    acc[r.section].count += 1;
    acc[r.section].points += Number(r.points);
    return acc;
  }, {});
  const total = Object.values(bySection).reduce((a, b) => a + b.points, 0);
  console.log(`${code}: ${data.length} questions, ${total.toFixed(2)} pts`);
  for (const [k, v] of Object.entries(bySection)) {
    console.log(`  ${k}: ${v.count} × ~${(v.points / v.count).toFixed(2)} = ${v.points.toFixed(2)} pts`);
  }
  if (Math.abs(total - 100) > 0.01) {
    console.error(`WEIGHT MISMATCH for ${code}`);
    process.exit(1);
  }
}

(async () => {
  const a1Id = await upsertExam(A1_EXAM);
  const b1Id = await upsertExam(B1_EXAM);
  await reseedQuestions(a1Id, A1_EXAM.code, buildA1Questions());
  await reseedQuestions(b1Id, B1_EXAM.code, buildB1Questions());
  console.log('\n=== Verification ===');
  await verify(a1Id, A1_EXAM.code);
  await verify(b1Id, B1_EXAM.code);
  console.log('\nSeed complete.');
})().catch((e) => { console.error(e); process.exit(1); });
