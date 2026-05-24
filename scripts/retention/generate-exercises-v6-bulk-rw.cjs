#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-100 fix #1 (continued) — bulk reading + writing from curriculum + templates.
// Pulls existing curriculum_readings + curriculum_comprehension_questions to seed
// retention reading exercises. Generates large set of writing prompts per level.

const https = require('https')

function callOnce(token, ref, query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      method: 'POST', family: 4,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = ''; res.on('data', (c) => body += c)
      res.on('end', () => resolve({ statusCode: res.statusCode, body }))
    })
    req.on('error', reject); req.write(data); req.end()
  })
}
const BACKOFFS = [2000, 5000, 10000, 20000, 40000]
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function call(token, ref, query) {
  for (let i = 0; i <= BACKOFFS.length; i++) {
    const res = await callOnce(token, ref, query)
    if (res.statusCode === 429 && i < BACKOFFS.length) { await sleep(BACKOFFS[i]); continue }
    if (res.statusCode >= 400) throw new Error(`HTTP ${res.statusCode}: ${res.body.slice(0,200)}`)
    try { return JSON.parse(res.body) } catch { return res.body }
  }
}
const esc = (s) => s == null ? 'NULL' : `$${'g'}$${String(s).replace(/\$g\$/g, '$_g_$')}$${'g'}$`
const jsonbVal = (v) => `${esc(JSON.stringify(v))}::jsonb`
const arrText = (a) => !a || a.length===0 ? "'{}'::text[]" : `ARRAY[${a.map((x)=>esc(x)).join(',')}]::text[]`

// ─── READING: pull from curriculum_comprehension_questions (existing LMS Qs) ───
async function genReadingFromCurriculum(token, ref) {
  const rows = await call(token, ref, `
    SELECT
      cq.id, cq.question_en, cq.choices, cq.correct_answer, cq.explanation_ar,
      cr.passage_content, l.level_number
    FROM curriculum_comprehension_questions cq
    JOIN curriculum_readings cr ON cr.id = cq.reading_id
    JOIN curriculum_units u ON u.id = cr.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE cq.question_en IS NOT NULL
      AND cq.choices IS NOT NULL
      AND cq.correct_answer IS NOT NULL
    LIMIT 1500
  `)
  console.log('  fetched ' + rows.length + ' curriculum questions')
  let inserted = 0, skipped = 0
  for (const r of rows) {
    if (!r.choices || !Array.isArray(r.choices) || r.choices.length < 2) { skipped++; continue }
    const level = 'L' + r.level_number
    const correct = String(r.correct_answer)
    const distract = r.choices.filter(c => String(c) !== correct).slice(0, 3)
    if (!correct || distract.length < 2) { skipped++; continue }
    // Construct short passage excerpt (first paragraph of curriculum passage)
    let excerpt = ''
    if (r.passage_content && r.passage_content.paragraphs && r.passage_content.paragraphs[0]) {
      excerpt = String(r.passage_content.paragraphs[0]).slice(0, 240)
    }
    const prompt = excerpt ? `Read: "${excerpt}" — ${r.question_en}` : r.question_en
    const explain = (r.explanation_ar || 'فهم القراءة يعتمد على البحث عن الكلمة المفتاحية في النص.') + ' (مصدر السؤال: المنهج)'
    const vals = `(${esc('mcq')}, ${esc(level)}, ${esc('reading')}, ${arrText(['comprehension','reading','curriculum_sourced'])}, 3, ${esc(prompt)}, NULL, ${jsonbVal({value:correct})}, ${jsonbVal(distract)}, ${esc(explain)}, 75)`
    try {
      await call(token, ref, `INSERT INTO retention_exercises (exercise_type, level, skill, topic_tags, difficulty, prompt_en, prompt_ar, correct_answer, distractors, explanation_ar, estimated_seconds) VALUES ${vals} ON CONFLICT DO NOTHING`)
      inserted++
      if (inserted % 50 === 0) console.log('  reading progress: +' + inserted)
    } catch (e) {
      // most failures are dup natural-key (idempotent re-run)
      if (!e.message.includes('duplicate')) console.error('  reading fail: ' + e.message.slice(0, 100))
    }
  }
  return { inserted, skipped }
}

// ─── WRITING: large bulk of mini_write prompts (level-tagged) ───
const WRITING_BULK = {
  L1: [
    "Write 2 sentences introducing yourself: your name and where you live.",
    "Describe your bedroom in 3 sentences.",
    "Write 3 sentences about your favorite drink.",
    "Write 3 sentences about what you do on Friday.",
    "Describe your school bag in 3 sentences.",
    "Write 3 sentences about your pet (or a pet you would like).",
    "Describe your favorite teacher in 3 sentences.",
    "Write 3 sentences about your favorite color.",
    "Describe your kitchen in 3 sentences.",
    "Write 3 sentences about what you eat for breakfast.",
    "Describe your shoes in 3 sentences.",
    "Write 3 sentences about your favorite season.",
    "Describe your bag in 3 sentences.",
    "Write 3 sentences about your morning routine.",
    "Describe your favorite snack in 3 sentences.",
    "Write 3 sentences about how you go to school.",
    "Describe your favorite cousin in 3 sentences.",
    "Write 3 sentences about your favorite TV show.",
    "Describe your favorite store in 3 sentences.",
    "Write 3 sentences about your favorite singer.",
    "Describe your bicycle (or one you would like) in 3 sentences.",
    "Write 3 sentences about a recent gift you received.",
    "Describe your favorite book in 3 sentences.",
    "Write 3 sentences about a holiday you celebrated.",
    "Describe your phone in 3 sentences.",
    "Write 3 sentences about your favorite fruit.",
    "Describe your father in 3 sentences.",
    "Write 3 sentences about your favorite restaurant.",
    "Describe your mother in 3 sentences.",
    "Write 3 sentences about your favorite cartoon.",
    "Describe your living room in 3 sentences.",
    "Write 3 sentences about what you do after school.",
    "Describe your handwriting in 3 sentences.",
    "Write 3 sentences about your favorite game.",
    "Describe a happy day in 3 sentences.",
    "Write 3 sentences about a place you want to visit.",
    "Describe your hair in 3 sentences.",
    "Write 3 sentences about your favorite sport.",
    "Describe your watch in 3 sentences.",
    "Write 3 sentences about a person you admire.",
  ],
  L2: [
    "Describe a typical Friday in your family using past simple (5 sentences).",
    "Write 5 sentences about a hobby you started recently.",
    "Describe your first day at a new job or school (5 sentences).",
    "Write a short paragraph about why you like (or dislike) your city (5 sentences).",
    "Describe a meal you cooked recently in 5 sentences.",
    "Write 5 sentences comparing two seasons in your country.",
    "Describe a person who taught you something important (5 sentences).",
    "Write a short message to a friend you haven't seen in a long time (5 sentences).",
    "Describe a memorable celebration in 5 sentences.",
    "Write 5 sentences about your weekend plans next month.",
    "Describe a recent shopping trip (5 sentences).",
    "Write 5 sentences about your dream vacation.",
    "Describe a movie you watched recently (5 sentences).",
    "Write 5 sentences about an important decision you made.",
    "Describe a tradition in your family (5 sentences).",
    "Write 5 sentences explaining what you do when you feel tired.",
    "Describe a small habit you want to start (5 sentences).",
    "Write 5 sentences about a song that means something to you.",
    "Describe the last time you helped someone (5 sentences).",
    "Write a short email to invite a friend to dinner (5 sentences).",
    "Describe your morning ritual in 5 sentences.",
    "Write 5 sentences about a small win this week.",
    "Describe the most useful app on your phone (5 sentences).",
    "Write 5 sentences about a meal you want to try one day.",
    "Describe your study routine in 5 sentences.",
    "Write 5 sentences thanking a teacher who helped you.",
    "Describe a difficult moment and how you handled it (5 sentences).",
    "Write 5 sentences about a goal for this month.",
    "Describe a place you go to relax (5 sentences).",
    "Write 5 sentences about a quote that inspires you.",
    "Describe your earliest memory in 5 sentences.",
    "Write 5 sentences explaining why you chose your career.",
    "Describe a recent change in your routine (5 sentences).",
    "Write 5 sentences about a skill you want to learn.",
    "Describe a book that changed how you think (5 sentences).",
    "Write a short paragraph reflecting on this past year (5 sentences).",
    "Describe a problem at home and how it was solved (5 sentences).",
    "Write 5 sentences about a recent surprise.",
    "Describe a small kindness you witnessed (5 sentences).",
    "Write 5 sentences about an item you can't live without.",
  ],
  L3: [
    "Write a 6-sentence paragraph discussing why exercise matters.",
    "Write a 6-sentence paragraph about a problem in your community.",
    "Write a 6-sentence comparison of two cities.",
    "Write a 6-sentence reflection on a person who shaped your character.",
    "Write a 6-sentence opinion piece on social media's effects on teenagers.",
    "Write a 6-sentence paragraph on the importance of family.",
    "Write a 6-sentence story about an unexpected event.",
    "Write a 6-sentence paragraph on the value of reading.",
    "Write a 6-sentence essay on why honesty matters at work.",
    "Write a 6-sentence story about a journey you took.",
    "Write a 6-sentence paragraph on managing stress.",
    "Write a 6-sentence reflection on what success means to you.",
    "Write a 6-sentence opinion on whether technology helps or harms relationships.",
    "Write a 6-sentence narrative about a turning point in your life.",
    "Write a 6-sentence paragraph on saving money.",
    "Write a 6-sentence essay on why volunteering is rewarding.",
    "Write a 6-sentence story about an act of kindness you received.",
    "Write a 6-sentence paragraph on healthy eating habits.",
    "Write a 6-sentence reflection on what makes a good friend.",
    "Write a 6-sentence opinion on whether students should have part-time jobs.",
    "Write a 6-sentence paragraph on how to deal with criticism.",
    "Write a 6-sentence story about overcoming a fear.",
    "Write a 6-sentence essay on the impact of music in your life.",
    "Write a 6-sentence paragraph on the importance of sleep.",
    "Write a 6-sentence opinion on living in a big city vs a small town.",
    "Write a 6-sentence reflection on a lesson you learned the hard way.",
    "Write a 6-sentence paragraph on the role of art in society.",
    "Write a 6-sentence essay on managing screen time.",
    "Write a 6-sentence story about a moment when you felt proud.",
    "Write a 6-sentence paragraph on the importance of asking questions.",
    "Write a 6-sentence opinion on the value of solo travel.",
    "Write a 6-sentence reflection on a small daily habit that changed your life.",
    "Write a 6-sentence essay on the meaning of hospitality.",
    "Write a 6-sentence story about an unforgettable meal.",
    "Write a 6-sentence paragraph on the joys of cooking.",
    "Write a 6-sentence opinion on the importance of learning history.",
    "Write a 6-sentence reflection on a quote that resonates with you.",
    "Write a 6-sentence essay on why patience is a skill, not a trait.",
    "Write a 6-sentence story about a moment when you stood up for someone.",
    "Write a 6-sentence paragraph on the role of nature in well-being.",
  ],
  L4: [
    "Write a 7-sentence paragraph evaluating the pros and cons of remote work.",
    "Write a 7-sentence reflection on a leadership lesson you learned.",
    "Write a 7-sentence opinion on whether AI should be regulated.",
    "Write a 7-sentence formal email proposing a meeting with a potential client.",
    "Write a 7-sentence analysis of why some startups fail.",
    "Write a 7-sentence reflection on a time you handled conflict effectively.",
    "Write a 7-sentence formal email declining a job offer politely.",
    "Write a 7-sentence essay on the impact of automation on jobs.",
    "Write a 7-sentence opinion on the ethics of online tracking.",
    "Write a 7-sentence reflection on the value of mentorship.",
    "Write a 7-sentence analysis of a recent global news event.",
    "Write a 7-sentence formal email requesting feedback on a project.",
    "Write a 7-sentence essay on the meaning of integrity in business.",
    "Write a 7-sentence reflection on a presentation you gave.",
    "Write a 7-sentence opinion on universal healthcare.",
    "Write a 7-sentence essay on the future of education.",
    "Write a 7-sentence reflection on what makes a great team.",
    "Write a 7-sentence formal email apologizing for a missed deadline.",
    "Write a 7-sentence analysis of climate change responses.",
    "Write a 7-sentence essay on managing burnout.",
    "Write a 7-sentence opinion on the role of nonprofits in society.",
    "Write a 7-sentence reflection on the most useful book you have read this year.",
    "Write a 7-sentence formal email asking for a salary review.",
    "Write a 7-sentence essay on the value of cross-cultural experience.",
    "Write a 7-sentence opinion on whether competition is healthy.",
    "Write a 7-sentence reflection on a personal goal you almost gave up on.",
    "Write a 7-sentence analysis of public transportation in your city.",
    "Write a 7-sentence formal email thanking a colleague for help.",
    "Write a 7-sentence essay on the trade-offs of working in a startup vs a corporation.",
    "Write a 7-sentence opinion on whether failure should be celebrated in schools.",
    "Write a 7-sentence reflection on a difficult conversation that went well.",
    "Write a 7-sentence analysis of why some habits stick and others don't.",
    "Write a 7-sentence opinion on the future of physical books.",
    "Write a 7-sentence essay on what defines a great teacher.",
    "Write a 7-sentence formal email responding to a customer complaint.",
    "Write a 7-sentence reflection on a creative project that taught you something.",
    "Write a 7-sentence opinion on the responsibilities of social media platforms.",
    "Write a 7-sentence analysis of changes in your industry over the past decade.",
    "Write a 7-sentence essay on the importance of asking for help.",
    "Write a 7-sentence reflection on a hobby that became serious.",
  ],
  L5: [
    "Write an 8-sentence essay arguing for or against universal basic income.",
    "Write an 8-sentence critical analysis of how attention economy shapes modern life.",
    "Write an 8-sentence essay on the ethics of genetic engineering.",
    "Write an 8-sentence policy memo recommending a city-level climate initiative.",
    "Write an 8-sentence opinion on whether nationalism is rising globally.",
    "Write an 8-sentence reflection on a paradox in your professional life.",
    "Write an 8-sentence analysis of the geopolitical implications of energy transition.",
    "Write an 8-sentence essay on what civilization owes future generations.",
    "Write an 8-sentence critique of a popular productivity book or method.",
    "Write an 8-sentence opinion on the role of philosophy in modern life.",
    "Write an 8-sentence reflection on a moment you changed your mind about an important issue.",
    "Write an 8-sentence essay on the relationship between privacy and security.",
    "Write an 8-sentence formal proposal to your board for a strategic pivot.",
    "Write an 8-sentence analysis of how public discourse has changed in the last decade.",
    "Write an 8-sentence essay on whether democracy can survive the internet.",
    "Write an 8-sentence reflection on the limits of meritocracy.",
    "Write an 8-sentence essay on the role of art in difficult times.",
    "Write an 8-sentence critique of a recent policy decision in your country.",
    "Write an 8-sentence formal letter to a thought leader requesting collaboration.",
    "Write an 8-sentence essay on the trade-offs of optimizing for happiness vs meaning.",
    "Write an 8-sentence analysis of how a single technology reshaped an entire industry.",
    "Write an 8-sentence reflection on a hard conversation you wish you had handled differently.",
    "Write an 8-sentence essay on the limits of evidence-based decision making.",
    "Write an 8-sentence opinion on whether universities serve their original mission.",
    "Write an 8-sentence policy proposal to address misinformation in your country.",
    "Write an 8-sentence essay on the cultural significance of food.",
    "Write an 8-sentence reflection on a person whose intellect changed your trajectory.",
    "Write an 8-sentence critique of a movement or trend you partially agree with.",
    "Write an 8-sentence analysis of how a country's history shapes its present.",
    "Write an 8-sentence essay on whether ambition has limits.",
    "Write an 8-sentence formal opinion piece for a newspaper on a national issue.",
    "Write an 8-sentence reflection on what you would do if you had a year off, fully funded.",
    "Write an 8-sentence essay on the ethics of celebrity culture.",
    "Write an 8-sentence analysis of the relationship between language and thought.",
    "Write an 8-sentence policy proposal for improving public reading habits.",
    "Write an 8-sentence reflection on the most underrated skill in your field.",
    "Write an 8-sentence essay on the role of beauty in human life.",
    "Write an 8-sentence opinion on whether scientific consensus should drive policy.",
    "Write an 8-sentence formal critique of an idea you used to believe.",
    "Write an 8-sentence essay on what your generation owes the next.",
  ],
}

async function genWriting(token, ref) {
  let inserted = 0
  for (const [level, prompts] of Object.entries(WRITING_BULK)) {
    const tagsByLevel = { L1: ['daily','present_simple'], L2: ['narrative','past_simple','description'], L3: ['opinion','b1'], L4: ['analysis','b2','formal'], L5: ['essay','c1','critical'] }
    const diffByLevel = { L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 }
    for (const p of prompts) {
      const explain = `الكتابة لا تحتاج كمال — تحتاج بداية. اكتبي بدون توقّف ثم راجعي. ركّزي على الفكرة قبل القواعد، ثم حسّني اللغة في القراءة الثانية.`
      const vals = `(${esc('mini_write')}, ${esc(level)}, ${esc('writing')}, ${arrText(tagsByLevel[level])}, ${diffByLevel[level]}, ${esc(p)}, NULL, ${jsonbVal({value:'(student writes freely; trainer evaluates against rubric)'})}, NULL, ${esc(explain)}, 600)`
      try {
        await call(token, ref, `INSERT INTO retention_exercises (exercise_type, level, skill, topic_tags, difficulty, prompt_en, prompt_ar, correct_answer, distractors, explanation_ar, estimated_seconds) VALUES ${vals} ON CONFLICT DO NOTHING`)
        inserted++
      } catch (e) {
        if (!e.message.includes('duplicate')) console.error('  writing fail: ' + e.message.slice(0, 100))
      }
    }
  }
  return inserted
}

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN required')

  for (const ref of targets) {
    console.log(`\n=== TARGET: ${ref} ===`)
    console.log('-- reading from curriculum --')
    const r = await genReadingFromCurriculum(token, ref)
    console.log('  reading inserted: ' + r.inserted + ' (skipped: ' + r.skipped + ')')
    console.log('-- writing prompts --')
    const w = await genWriting(token, ref)
    console.log('  writing inserted: ' + w)
    const finals = await call(token, ref, `SELECT skill, count(*)::int AS c FROM retention_exercises GROUP BY skill ORDER BY skill`)
    for (const x of finals) console.log('  ' + x.skill + ': ' + x.c)
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })
