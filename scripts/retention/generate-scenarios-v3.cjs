#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-100 Block 4 v3 — programmatic scenario generator to close gap toward 200.
// Uses template skeletons × parameter variations to generate ~80 additional scenarios
// with 5-6 turns each. Lower per-scenario variety than v2 but solid volume.

const https = require('https')

const BACKOFFS_RETRY = [2000, 5000, 10000, 20000, 40000]
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
async function callOnce(token, ref, query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = ''; res.on('data', (c) => body += c)
      res.on('end', () => resolve({ statusCode: res.statusCode, body }))
    })
    req.on('error', reject); req.write(data); req.end()
  })
}
async function call(token, ref, query) {
  for (let attempt = 0; attempt <= BACKOFFS_RETRY.length; attempt++) {
    const res = await callOnce(token, ref, query)
    if (res.statusCode === 429 && attempt < BACKOFFS_RETRY.length) {
      await sleep(BACKOFFS_RETRY[attempt]); continue
    }
    if (res.statusCode >= 400) throw new Error(`HTTP ${res.statusCode}: ${res.body.slice(0,300)}`)
    try { return JSON.parse(res.body) } catch { return res.body }
  }
}
const esc = (s) => s == null ? 'NULL' : `$${'s'}$${String(s).replace(/\$s\$/g,'$_s_$')}$${'s'}$`
const arrText = (a) => !a||a.length===0 ? "'{}'::text[]" : `ARRAY[${a.map((x)=>esc(x)).join(',')}]::text[]`

// ─── L1: SHOP/SERVICE BASIC (item + location + persona) ──────────────────
const L1_SHOPS = [
  { item:'bread',          location:'the bakery',       persona:'lina-shopkeeper',  vocab:['fresh','loaf','price','take'] },
  { item:'flowers',        location:'a florist',        persona:'lina-shopkeeper',  vocab:['roses','beautiful','color','price'] },
  { item:'fruit',          location:'the market',       persona:'lina-shopkeeper',  vocab:['kilo','sweet','ripe','choose'] },
  { item:'a toy',          location:'a toy shop',       persona:'lina-shopkeeper',  vocab:['gift','child','age','wrap'] },
  { item:'a book',         location:'a bookstore',      persona:'lina-shopkeeper',  vocab:['English','novel','recommend','author'] },
  { item:'fish',           location:'the fish market',  persona:'lina-shopkeeper',  vocab:['fresh','today','clean','price'] },
  { item:'a watch battery', location:'a small kiosk',   persona:'lina-shopkeeper',  vocab:['battery','watch','size','replace'] },
  { item:'sunglasses',     location:'an optical shop',  persona:'lina-shopkeeper',  vocab:['try','color','style','expensive'] },
  { item:'a notebook',     location:'a stationery shop', persona:'lina-shopkeeper', vocab:['lines','squares','plain','cover'] },
  { item:'shampoo',        location:'a pharmacy',       persona:'noor-waiter',      vocab:['brand','dry hair','oily','recommend'] },
]
function gL1Shop(s, idx) {
  return {
    slug: `l1-buy-${s.item.replace(/[^a-z]/gi,'-')}-${idx}`,
    personaSlug: s.persona, level:'L1', difficulty:'easy',
    title_en: `Buy ${s.item} at ${s.location}`,
    title_ar: `اشتري ${s.item} من ${s.location}`,
    setting_en: `A friendly visit to ${s.location} on a calm afternoon.`,
    goal_en: `Ask for ${s.item}, confirm price, and complete the purchase.`,
    target_vocab: s.vocab,
    target_grammar: ['present_simple','polite_requests','quantity_questions'],
    turns: [
      {ai:`Hello! Can I help you find something?`, type:'description', vocab:s.vocab.slice(0,2), minw:2},
      {ai:`Sure, we have a few kinds. Any preference?`, type:'description', vocab:s.vocab.slice(1,3), minw:3},
      {ai:`Great choice. That'll be 25 riyals.`, type:'yes_no', vocab:['OK','here','thank you'], minw:2},
      {ai:`Need a bag, or you're good?`, type:'yes_no', vocab:['yes','no','please','thank'], minw:2},
      {ai:`Thanks for stopping by!`, type:'closing', vocab:['bye','thank you'], minw:1, terminal:true},
    ]
  }
}

// ─── L1: SERVICE-DESK QUICK INTERACTIONS ────────────────────────────────
const L1_SERVICES = [
  { task:'ask the receptionist for the wifi password', persona:'fahad-receptionist', vocab:['wifi','password','please','thank'] },
  { task:'ask the waiter for the bill', persona:'noor-waiter', vocab:['bill','please','total','card'] },
  { task:'ask the barista for a refill', persona:'sarah-barista', vocab:['refill','same','please','thank'] },
  { task:'ask the receptionist about the breakfast time', persona:'fahad-receptionist', vocab:['breakfast','time','start','end'] },
  { task:'order a taxi from the receptionist', persona:'fahad-receptionist', vocab:['taxi','airport','time','wait'] },
  { task:'ask the waiter about a vegetarian dish', persona:'noor-waiter', vocab:['vegetarian','options','meat-free','recommend'] },
  { task:'pay the barista by card', persona:'sarah-barista', vocab:['card','total','tap','approved'] },
  { task:'ask the receptionist about late checkout', persona:'fahad-receptionist', vocab:['checkout','late','possible','fee'] },
  { task:'order a takeaway from the waiter', persona:'noor-waiter', vocab:['takeaway','order','ready','wait'] },
  { task:'ask the barista for a quieter table', persona:'sarah-barista', vocab:['quieter','table','available','move'] },
]
function gL1Service(s, idx) {
  return {
    slug: `l1-service-${idx}-${s.persona}`,
    personaSlug: s.persona, level:'L1', difficulty:'easy',
    title_en: `Service request: ${s.task}`,
    title_ar: `طلب خدمة: ${s.task}`,
    setting_en: `A short polite exchange at a service counter or cafe.`,
    goal_en: `Politely make the request and confirm.`,
    target_vocab: s.vocab,
    target_grammar: ['polite_requests','present_simple'],
    turns: [
      {ai:`Hi! Anything you need?`, type:'description', vocab:s.vocab.slice(0,2), minw:2},
      {ai:`Sure thing. Anything else?`, type:'yes_no', vocab:['no','that\'s all','one more'], minw:2},
      {ai:`On it. Just give me a minute.`, type:'closing', vocab:['OK','thank you','wait'], minw:1},
      {ai:`All done!`, type:'closing', vocab:['thank you','great','perfect'], minw:1, terminal:true},
    ]
  }
}

// ─── L2: SIMPLE EXCHANGE WITH 2 OPTIONS (medium) ────────────────────────
const L2_EXCHANGES = [
  { topic:'a haircut appointment', persona:'noor-waiter', vocab:['cut','wash','style','tomorrow'] },
  { topic:'a gym tour', persona:'khalid-gym', vocab:['equipment','membership','tour','trial'] },
  { topic:'a wedding gift discussion', persona:'amira-hotel', vocab:['friend','wedding','gift','idea'] },
  { topic:'a movie recommendation', persona:'amira-hotel', vocab:['watched','recommend','genre','rating'] },
  { topic:'a phone plan switch', persona:'lina-shopkeeper', vocab:['plan','data','price','switch'] },
  { topic:'a class enrollment', persona:'dr-lopez', vocab:['class','schedule','prerequisites','register'] },
  { topic:'a car wash service', persona:'omar-taxi', vocab:['wash','interior','wax','price'] },
  { topic:'a delivery option for online order', persona:'fahad-receptionist', vocab:['delivery','address','time','tracking'] },
  { topic:'a yoga class booking', persona:'khalid-gym', vocab:['yoga','beginner','schedule','book'] },
  { topic:'a beard trim request', persona:'fahad-receptionist', vocab:['trim','beard','short','natural'] },
]
function gL2Exchange(s, idx) {
  return {
    slug: `l2-exchange-${idx}`,
    personaSlug: s.persona, level:'L2', difficulty:'medium',
    title_en: `Discuss ${s.topic}`,
    title_ar: `ناقشي ${s.topic}`,
    setting_en: `A friendly exchange where you need to decide between options.`,
    goal_en: `Ask the right questions, weigh options, pick what suits you.`,
    target_vocab: s.vocab,
    target_grammar: ['present_simple','prefer','future_simple'],
    turns: [
      {ai:`Sure, happy to help with ${s.topic}. What's on your mind?`, type:'opinion', vocab:s.vocab.slice(0,2), minw:4},
      {ai:`We have two main options — A or B. Which do you prefer?`, type:'description', vocab:s.vocab.slice(1,3), minw:4},
      {ai:`Good pick. When works best for you?`, type:'description', vocab:['morning','evening','weekend','today'], minw:3},
      {ai:`Locked in. Is there anything else?`, type:'yes_no', vocab:['no','one question','thank you'], minw:2},
      {ai:`Thanks for booking with us!`, type:'closing', vocab:['thank you','bye','look forward'], minw:2, terminal:true},
    ]
  }
}

// ─── L3: ASK-FOR-ADVICE (intermediate) ──────────────────────────────────
const L3_ADVICE = [
  { topic:'changing careers', persona:'dr-lopez', vocab:['career','change','risks','advice'] },
  { topic:'studying abroad', persona:'dr-lopez', vocab:['abroad','program','funding','language'] },
  { topic:'starting a side business', persona:'omar-taxi', vocab:['business','side','time','customers'] },
  { topic:'investing money for the first time', persona:'amira-hotel', vocab:['invest','risk','beginner','plan'] },
  { topic:'choosing a healthier lifestyle', persona:'khalid-gym', vocab:['health','start','sustainable','goal'] },
  { topic:'learning to drive', persona:'omar-taxi', vocab:['drive','lessons','license','nervous'] },
  { topic:'getting better sleep', persona:'dr-lopez', vocab:['sleep','routine','quality','tips'] },
  { topic:'building a daily reading habit', persona:'amira-hotel', vocab:['reading','daily','habit','time'] },
  { topic:'managing work stress', persona:'dr-lopez', vocab:['stress','manage','boundary','rest'] },
  { topic:'choosing a wedding venue', persona:'amira-hotel', vocab:['venue','guests','budget','style'] },
]
function gL3Advice(s, idx) {
  return {
    slug: `l3-advice-${idx}`,
    personaSlug: s.persona, level:'L3', difficulty:'medium',
    title_en: `Ask for advice about ${s.topic}`,
    title_ar: `اطلبي نصيحة عن ${s.topic}`,
    setting_en: `A relaxed conversation with someone you trust about ${s.topic}.`,
    goal_en: `Explain your situation, ask focused questions, take notes.`,
    target_vocab: s.vocab,
    target_grammar: ['present_perfect','modal_verbs','conditionals'],
    turns: [
      {ai:`What's on your mind today?`, type:'opinion', vocab:s.vocab.slice(0,2), minw:5},
      {ai:`Tell me more about your situation.`, type:'opinion', vocab:s.vocab.slice(1,3), minw:6},
      {ai:`What have you tried so far?`, type:'opinion', vocab:['tried','attempted','researched','spoken'], minw:5},
      {ai:`Here's my suggestion — does that resonate?`, type:'opinion', vocab:['yes','makes sense','consider','try'], minw:4},
      {ai:`Anything else you want to ask?`, type:'yes_no', vocab:['no','thank you','enough','helpful'], minw:3},
      {ai:`Glad I could help. Let me know how it goes.`, type:'closing', vocab:['thank you','update','soon'], minw:3, terminal:true},
    ]
  }
}

// ─── L4: PROFESSIONAL CONVERSATIONS (upper-intermediate) ─────────────────
const L4_PROFESSIONAL = [
  { topic:'a project status update', persona:'omar-taxi', vocab:['status','milestone','blocker','timeline'] },
  { topic:'a vendor negotiation', persona:'omar-taxi', vocab:['terms','price','delivery','volume'] },
  { topic:'a stakeholder concern', persona:'dr-lopez', vocab:['concern','impact','priority','resolution'] },
  { topic:'a team conflict mediation', persona:'amira-hotel', vocab:['conflict','perspective','common ground','solution'] },
  { topic:'a new product proposal', persona:'omar-taxi', vocab:['proposal','market','feasibility','traction'] },
  { topic:'a quarterly review', persona:'dr-lopez', vocab:['review','achievements','metrics','next quarter'] },
  { topic:'a hiring decision discussion', persona:'amira-hotel', vocab:['candidate','strengths','concerns','fit'] },
  { topic:'a budget reallocation', persona:'omar-taxi', vocab:['budget','reallocate','justify','priority'] },
  { topic:'a market expansion plan', persona:'dr-lopez', vocab:['market','expand','risk','opportunity'] },
  { topic:'a remote work proposal', persona:'amira-hotel', vocab:['remote','productivity','trust','balance'] },
]
function gL4Pro(s, idx) {
  return {
    slug: `l4-pro-${idx}`,
    personaSlug: s.persona, level:'L4', difficulty:'challenging',
    title_en: `Conduct ${s.topic}`,
    title_ar: `قودي ${s.topic}`,
    setting_en: `A focused professional discussion in a meeting room or call.`,
    goal_en: `Communicate clearly, listen, decide on next steps.`,
    target_vocab: s.vocab,
    target_grammar: ['present_perfect','conditionals','passive_voice','linkers'],
    turns: [
      {ai:`Let's get started. Where do we stand on ${s.topic}?`, type:'opinion', vocab:s.vocab.slice(0,2), minw:7},
      {ai:`What's the biggest concern?`, type:'opinion', vocab:s.vocab.slice(1,3), minw:7},
      {ai:`How do you propose we address it?`, type:'opinion', vocab:['suggest','approach','phased','test'], minw:7},
      {ai:`Who owns the next step?`, type:'opinion', vocab:['I will','team','timeline','commit'], minw:6},
      {ai:`Sounds like a plan. Let's reconvene Friday.`, type:'closing', vocab:['agree','Friday','update','thank you'], minw:4, terminal:true},
    ]
  }
}

// ─── L5: COMPLEX CONVERSATIONS (advanced) ───────────────────────────────
const L5_COMPLEX = [
  { topic:'a strategic pivot', persona:'dr-lopez', vocab:['pivot','rationale','sunk cost','learning'] },
  { topic:'crisis communication', persona:'amira-hotel', vocab:['crisis','transparency','message','audience'] },
  { topic:'high-stakes negotiation', persona:'omar-taxi', vocab:['leverage','BATNA','interests','concession'] },
  { topic:'thought leadership essay', persona:'dr-lopez', vocab:['perspective','argument','evidence','original'] },
  { topic:'company values reset', persona:'amira-hotel', vocab:['values','authentic','behavior','aspiration'] },
  { topic:'organizational restructuring', persona:'omar-taxi', vocab:['restructure','reporting','communication','impact'] },
  { topic:'a board presentation', persona:'dr-lopez', vocab:['board','executive summary','decision','asked'] },
  { topic:'a sensitive performance conversation', persona:'amira-hotel', vocab:['performance','specific','impact','support'] },
  { topic:'an acquisition discussion', persona:'omar-taxi', vocab:['acquisition','synergy','valuation','integration'] },
  { topic:'a public speaking keynote', persona:'dr-lopez', vocab:['keynote','arc','memorable','audience'] },
]
function gL5Complex(s, idx) {
  return {
    slug: `l5-complex-${idx}`,
    personaSlug: s.persona, level:'L5', difficulty:'challenging',
    title_en: `Engage in ${s.topic}`,
    title_ar: `شاركي في ${s.topic}`,
    setting_en: `A demanding conversation requiring precision, empathy, and judgment.`,
    goal_en: `Navigate complexity, hold multiple perspectives, drive toward outcome.`,
    target_vocab: s.vocab,
    target_grammar: ['conditionals','linkers','complex_sentences','passive_voice'],
    turns: [
      {ai:`Tell me your perspective on ${s.topic}.`, type:'opinion', vocab:s.vocab.slice(0,2), minw:9},
      {ai:`What's the strongest counterargument?`, type:'opinion', vocab:['counterargument','however','partial','reconcile'], minw:9},
      {ai:`How do you address it?`, type:'opinion', vocab:['address','specifically','data','reframe'], minw:8},
      {ai:`What's your recommendation?`, type:'opinion', vocab:['recommend','tradeoff','phased','metric'], minw:8},
      {ai:`Solid thinking. Let's act on it.`, type:'closing', vocab:['thank you','agree','execute'], minw:4, terminal:true},
    ]
  }
}

// ─── ASSEMBLE ────────────────────────────────────────────────────────────
function buildScenarios() {
  const out = []
  L1_SHOPS.forEach((s,i) => out.push(gL1Shop(s, i+1)))
  L1_SERVICES.forEach((s,i) => out.push(gL1Service(s, i+1)))
  L2_EXCHANGES.forEach((s,i) => out.push(gL2Exchange(s, i+1)))
  L3_ADVICE.forEach((s,i) => out.push(gL3Advice(s, i+1)))
  L4_PROFESSIONAL.forEach((s,i) => out.push(gL4Pro(s, i+1)))
  L5_COMPLEX.forEach((s,i) => out.push(gL5Complex(s, i+1)))
  return out
}

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN required')
  const SCENARIOS = buildScenarios()
  console.log(`Generated ${SCENARIOS.length} programmatic scenarios from templates`)

  for (const ref of targets) {
    console.log(`\n=== TARGET: ${ref} ===`)
    const personas = await call(token, ref, 'SELECT id, slug FROM retention_personas')
    const personaMap = {}
    for (const p of personas) personaMap[p.slug] = p.id

    let scI = 0, scS = 0, tI = 0
    for (const sc of SCENARIOS) {
      const pid = personaMap[sc.personaSlug]
      if (!pid) { console.error(`  no persona ${sc.personaSlug} for ${sc.slug}`); continue }
      const scSql = `INSERT INTO retention_scenarios (slug, persona_id, title_en, title_ar, setting_en, goal_en, difficulty, target_level, estimated_minutes, target_vocab, target_grammar, active)
        VALUES (${esc(sc.slug)}, '${pid}', ${esc(sc.title_en)}, ${esc(sc.title_ar)}, ${esc(sc.setting_en)}, ${esc(sc.goal_en)}, '${sc.difficulty}', '${sc.level}', ${sc.turns.length+2}, ${arrText(sc.target_vocab)}, ${arrText(sc.target_grammar)}, true)
        ON CONFLICT (slug) DO NOTHING
        RETURNING id`
      let sid
      try {
        const r = await call(token, ref, scSql)
        if (Array.isArray(r) && r.length > 0) { sid = r[0].id; scI++ }
        else {
          const f = await call(token, ref, `SELECT id FROM retention_scenarios WHERE slug = ${esc(sc.slug)} LIMIT 1`)
          sid = f[0]?.id; scS++
        }
      } catch (e) { console.error(`  ${sc.slug}: ${e.message.slice(0,150)}`); continue }
      if (!sid) continue

      const tc = await call(token, ref, `SELECT count(*)::int as c FROM retention_dialogue_turns WHERE scenario_id='${sid}'`)
      if (tc[0].c >= sc.turns.length) continue

      for (let i = 0; i < sc.turns.length; i++) {
        const t = sc.turns[i]
        const sql = `INSERT INTO retention_dialogue_turns (scenario_id, turn_number, ai_text_en, expected_response_type, expected_vocab, min_words, is_terminal)
          VALUES ('${sid}', ${i+1}, ${esc(t.ai)}, '${t.type}', ${arrText(t.vocab)}, ${t.minw||3}, ${t.terminal?'true':'false'})`
        try { await call(token, ref, sql); tI++ }
        catch (e) { console.error(`  turn ${i+1}/${sc.slug}: ${e.message.slice(0,100)}`) }
      }
    }
    const s = await call(token, ref, 'SELECT count(*)::int as c FROM retention_scenarios')
    const t = await call(token, ref, 'SELECT count(*)::int as c FROM retention_dialogue_turns')
    console.log(`[${ref}] +${scI} scenarios (${scS} existed), +${tI} turns; totals: ${s[0].c}/${t[0].c}`)
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })
