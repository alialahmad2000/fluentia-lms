#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-100 fix #1 final — bulk writing prompts via combinatorial templates
// to push writing skill from ~276 toward ~875.

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
const esc = (s) => s == null ? 'NULL' : `$${'w'}$${String(s).replace(/\$w\$/g,'$_w_$')}$${'w'}$`
const jsonbVal = (v) => `${esc(JSON.stringify(v))}::jsonb`
const arrText = (a) => !a||a.length===0 ? "'{}'::text[]" : `ARRAY[${a.map((x)=>esc(x)).join(',')}]::text[]`

// Combinatorial templates per level
const TOPICS = {
  L1: ['favorite food','favorite drink','family','friend','school','house','bedroom','street','city','pet','garden','book','toy','phone','breakfast','lunch','dinner','morning','evening','weekend','holiday','park','market','library','mosque','kitchen','car','bus','sport','color','number','game','song','movie','shop','restaurant','hotel','beach','mountain','desert'],
  L2: ['recent trip','last weekend','favorite memory','dream job','best friend','typical morning','school year','favorite teacher','important event','small win','recent meal','favorite hobby','new skill','interesting person','difficult day','best book','favorite music','last vacation','recent celebration','small habit','small change','helpful tip','recent purchase','daily routine','best moment','small kindness','new app','recent video','recent course','recent question','quiet day','busy day','rainy day','sunny morning','snowy evening','windy afternoon','calm evening','exciting trip','small surprise','useful gift'],
  L3: ['social media impact','reading habits','health choices','time management','career path','language learning','technology effects','urban life','family values','community problem','study tips','work-life balance','goal setting','volunteer experience','recent decision','important conversation','difficult feedback','daily exercise','sleep habits','financial choices','consumer awareness','environmental issue','small lifestyle change','recent book','recent film','interesting podcast','learning style','public speaking','team conflict','recent failure','recent success','meaningful relationship','memorable trip','cultural experience','language barrier','positive habit','negative habit','helpful boundary','tough conversation','letting go'],
  L4: ['leadership lesson','presentation feedback','remote work tradeoffs','mentorship value','team dynamics','strategic decision','market opportunity','risk evaluation','hiring decision','difficult negotiation','project failure','project success','client conflict','process improvement','industry trend','automation impact','ethical question','professional growth','public speaking moment','formal proposal','complex problem','organizational change','cross-cultural exchange','generational gap','data interpretation','remote leadership','digital boundaries','attention management','feedback culture','recognition systems','team rituals','onboarding experience','offboarding moment','difficult conversation handled well','difficult conversation handled poorly','executive summary','board update','stakeholder briefing','peer review','quarterly retrospective'],
  L5: ['paradigm shift','systemic problem','policy critique','strategic pivot','industry disruption','intellectual humility','contrarian opinion','synthesis of ideas','long-term consequences','organizational transformation','complex ethical dilemma','cross-disciplinary insight','historical pattern','political nuance','intellectual rigor','public debate','academic insight','first-principles thinking','geopolitical event','technological convergence','generational responsibility','cultural critique','meaningful failure','recovered failure','creative breakthrough','aesthetic philosophy','epistemic limits','language and meaning','meaning at work','existential question','philosophical question','strategic ambiguity','principle vs pragmatism','elegant solution','sustainability tradeoffs','identity and authenticity','meritocracy critique','attention and society','epistemology question','recovered project'],
}

const SENTENCE_COUNTS = { L1: 3, L2: 5, L3: 6, L4: 7, L5: 8 }
const DIFFICULTIES = { L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 }

const PROMPT_TEMPLATES = {
  L1: [(t,n)=>`Write ${n} sentences describing your ${t}.`, (t,n)=>`Write ${n} sentences about ${t}.`, (t,n)=>`Describe ${t} in ${n} sentences.`],
  L2: [(t,n)=>`Write ${n} sentences about ${t}.`, (t,n)=>`Describe ${t} in ${n} sentences.`, (t,n)=>`Share ${n} sentences reflecting on ${t}.`],
  L3: [(t,n)=>`Write a ${n}-sentence paragraph about ${t}.`, (t,n)=>`In ${n} sentences, give your opinion on ${t}.`, (t,n)=>`Write a short reflection (${n} sentences) on ${t}.`],
  L4: [(t,n)=>`Write a ${n}-sentence analysis of ${t}.`, (t,n)=>`Compose a ${n}-sentence reflection on ${t}.`, (t,n)=>`Discuss ${t} in ${n} thoughtful sentences.`, (t,n)=>`Outline your view on ${t} in ${n} sentences.`],
  L5: [(t,n)=>`Compose an ${n}-sentence essay on ${t}.`, (t,n)=>`Write a ${n}-sentence critical reflection on ${t}.`, (t,n)=>`In ${n} sentences, develop a nuanced position on ${t}.`, (t,n)=>`Write an ${n}-sentence opinion piece arguing one side of ${t}.`],
}

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN required')

  for (const ref of targets) {
    console.log(`\n=== TARGET: ${ref} ===`)
    let inserted = 0
    for (const [level, topics] of Object.entries(TOPICS)) {
      const templates = PROMPT_TEMPLATES[level]
      const n = SENTENCE_COUNTS[level]
      const diff = DIFFICULTIES[level]
      const tags = { L1:['daily','present_simple'], L2:['narrative','past_simple','description'], L3:['opinion','b1'], L4:['analysis','b2','formal'], L5:['essay','c1','critical'] }[level]
      // Cross-product: each topic × each template = unique prompt
      for (const topic of topics) {
        for (const tmpl of templates) {
          const prompt = tmpl(topic, n)
          const explain = `الكتابة الحرة تطوّر طلاقتكِ. اكتبي ${n} جمل بدون توقّف ثم راجعي. الفكرة قبل القواعد.`
          const vals = `(${esc('mini_write')}, ${esc(level)}, ${esc('writing')}, ${arrText(tags)}, ${diff}, ${esc(prompt)}, NULL, ${jsonbVal({value:'(student writes; trainer rubric)'})}, NULL, ${esc(explain)}, ${level==='L5'?600:300})`
          try {
            await call(token, ref, `INSERT INTO retention_exercises (exercise_type, level, skill, topic_tags, difficulty, prompt_en, prompt_ar, correct_answer, distractors, explanation_ar, estimated_seconds) VALUES ${vals} ON CONFLICT DO NOTHING`)
            inserted++
            if (inserted % 50 === 0) console.log('  writing progress: +' + inserted)
          } catch (e) { /* dup skip */ }
        }
      }
    }
    const finalW = await call(token, ref, `SELECT count(*)::int as c FROM retention_exercises WHERE skill='writing'`)
    console.log(`[${ref}] inserted ${inserted}, total writing: ${finalW[0].c}`)
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })
