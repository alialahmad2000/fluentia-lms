#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-100 Block 4 v4 — additional programmatic scenarios to push toward 200.
// Different slug prefixes from v3 to avoid collisions.

const https = require('https')

function call(token, ref, query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = ''; res.on('data', (c) => body += c)
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0,400)}`))
        try { resolve(JSON.parse(body)) } catch { resolve(body) }
      })
    })
    req.on('error', reject); req.write(data); req.end()
  })
}
const esc = (s) => s == null ? 'NULL' : `$${'s'}$${String(s).replace(/\$s\$/g,'$_s_$')}$${'s'}$`
const arrText = (a) => !a||a.length===0 ? "'{}'::text[]" : `ARRAY[${a.map((x)=>esc(x)).join(',')}]::text[]`

// More daily-life and professional scenarios at each level.
const L1_MORE = [
  { topic:'borrowing a pen from a stranger',         persona:'sarah-barista' },
  { topic:'asking a neighbor for a quick favor',     persona:'amira-hotel' },
  { topic:'returning a misdelivered package',         persona:'fahad-receptionist' },
  { topic:'asking a security guard for directions',   persona:'omar-taxi' },
  { topic:'paying a parking fine',                    persona:'fahad-receptionist' },
  { topic:'buying a movie ticket',                    persona:'lina-shopkeeper' },
  { topic:'asking for the wifi at a cafe',            persona:'sarah-barista' },
  { topic:'asking a librarian to renew a book',       persona:'amira-hotel' },
  { topic:'returning a clothes hanger',               persona:'lina-shopkeeper' },
  { topic:'asking for change at a shop',              persona:'lina-shopkeeper' },
]
const L2_MORE = [
  { topic:'getting your car serviced',                persona:'omar-taxi' },
  { topic:'switching electricity providers',          persona:'fahad-receptionist' },
  { topic:'planning a road trip with a friend',       persona:'amira-hotel' },
  { topic:'asking for time off at work',              persona:'omar-taxi' },
  { topic:'discussing a recent book with a friend',   persona:'amira-hotel' },
  { topic:'comparing two restaurants',                persona:'noor-waiter' },
  { topic:'returning faulty headphones',              persona:'lina-shopkeeper' },
  { topic:'organizing a study group',                 persona:'dr-lopez' },
  { topic:'booking a cleaner for the weekend',        persona:'fahad-receptionist' },
  { topic:'arranging a video call with a relative',   persona:'amira-hotel' },
]
const L3_MORE = [
  { topic:'planning a small wedding budget',          persona:'amira-hotel' },
  { topic:'opening a savings account',                persona:'fahad-receptionist' },
  { topic:'discussing children\'s school progress',   persona:'dr-lopez' },
  { topic:'mediating a family dispute',               persona:'amira-hotel' },
  { topic:'planning a sabbatical',                    persona:'dr-lopez' },
  { topic:'choosing between two job offers',          persona:'omar-taxi' },
  { topic:'discussing a refund with customer service', persona:'fahad-receptionist' },
  { topic:'planning a charity fundraiser',            persona:'amira-hotel' },
  { topic:'discussing aging parents\' care',          persona:'dr-lopez' },
  { topic:'sharing concerns about a friend\'s health', persona:'amira-hotel' },
]
const L4_MORE = [
  { topic:'leading a project kickoff meeting',        persona:'omar-taxi' },
  { topic:'presenting a competitive analysis',        persona:'dr-lopez' },
  { topic:'rejecting a vendor proposal politely',     persona:'omar-taxi' },
  { topic:'pushing back on an unrealistic deadline',  persona:'amira-hotel' },
  { topic:'recommending a process improvement',       persona:'dr-lopez' },
  { topic:'discussing succession planning',           persona:'omar-taxi' },
  { topic:'navigating a difficult one-on-one',        persona:'amira-hotel' },
  { topic:'reviewing a junior\'s code/design',        persona:'dr-lopez' },
  { topic:'arguing for a budget increase',            persona:'omar-taxi' },
  { topic:'presenting QBR (quarterly business review)', persona:'dr-lopez' },
]
const L5_MORE = [
  { topic:'shaping the company\'s long-term vision',  persona:'dr-lopez' },
  { topic:'navigating an investor disagreement',      persona:'omar-taxi' },
  { topic:'managing a crisis press conference',       persona:'amira-hotel' },
  { topic:'negotiating an exit package',              persona:'omar-taxi' },
  { topic:'discussing succession at the C-level',     persona:'dr-lopez' },
  { topic:'speaking at a UN-level panel',             persona:'dr-lopez' },
  { topic:'declining a board seat',                   persona:'amira-hotel' },
  { topic:'arbitrating a partner dispute',            persona:'omar-taxi' },
  { topic:'launching an industry-wide initiative',    persona:'dr-lopez' },
  { topic:'closing a 9-figure deal',                  persona:'omar-taxi' },
]

function build() {
  const all = []
  let i = 0
  for (const s of L1_MORE) {
    i++; all.push({
      slug:`l1-more-${i}`, personaSlug:s.persona, level:'L1', difficulty:'easy',
      title_en:`Practice: ${s.topic}`, title_ar:`تدريب: ${s.topic}`,
      setting_en:`A natural everyday moment where you need to ${s.topic}.`,
      goal_en:`Speak politely, get what you need, end gracefully.`,
      target_vocab:['please','thank you','help','yes','no'],
      target_grammar:['polite_requests','present_simple'],
      turns:[
        {ai:`Hello! How can I help?`, type:'description', vocab:['please','need','help'], minw:2},
        {ai:`Sure thing. Anything else?`, type:'yes_no', vocab:['yes','no','that\'s all'], minw:1},
        {ai:`OK, all done!`, type:'closing', vocab:['thank you','great'], minw:1, terminal:true},
      ]
    })
  }
  i = 0
  for (const s of L2_MORE) {
    i++; all.push({
      slug:`l2-more-${i}`, personaSlug:s.persona, level:'L2', difficulty:'medium',
      title_en:`Discuss: ${s.topic}`, title_ar:`ناقشي: ${s.topic}`,
      setting_en:`A focused conversation about ${s.topic}, with options to weigh.`,
      goal_en:`Ask the right questions, compare options, decide.`,
      target_vocab:['option','prefer','because','depends','agree'],
      target_grammar:['present_simple','future_simple','prefer'],
      turns:[
        {ai:`Let's talk about ${s.topic}. What's important to you?`, type:'opinion', vocab:['important','prefer','because'], minw:5},
        {ai:`We have two ways to go. Which do you like better?`, type:'description', vocab:['like','prefer','option','choose'], minw:4},
        {ai:`Good. Anything else to consider?`, type:'yes_no', vocab:['no','question','one more'], minw:3},
        {ai:`Locked in. Let me know how it goes.`, type:'closing', vocab:['thank you','will do','update'], minw:3, terminal:true},
      ]
    })
  }
  i = 0
  for (const s of L3_MORE) {
    i++; all.push({
      slug:`l3-more-${i}`, personaSlug:s.persona, level:'L3', difficulty:'medium',
      title_en:`Navigate: ${s.topic}`, title_ar:`تجاوزي: ${s.topic}`,
      setting_en:`A thoughtful discussion about ${s.topic}.`,
      goal_en:`Share context, listen, propose a path forward.`,
      target_vocab:['situation','consider','options','suggest','agree'],
      target_grammar:['present_perfect','modal_verbs','conditionals'],
      turns:[
        {ai:`Walk me through the situation with ${s.topic}.`, type:'opinion', vocab:['situation','context','recently','noticed'], minw:6},
        {ai:`What have you tried so far?`, type:'opinion', vocab:['tried','attempted','considered'], minw:6},
        {ai:`Here's what I would consider — does it fit?`, type:'opinion', vocab:['consider','fit','agree','disagree'], minw:5},
        {ai:`What's the next step?`, type:'opinion', vocab:['next','step','timeline','commit'], minw:5},
        {ai:`Good. Keep me posted.`, type:'closing', vocab:['thank you','update','soon'], minw:3, terminal:true},
      ]
    })
  }
  i = 0
  for (const s of L4_MORE) {
    i++; all.push({
      slug:`l4-more-${i}`, personaSlug:s.persona, level:'L4', difficulty:'challenging',
      title_en:`Lead: ${s.topic}`, title_ar:`قودي: ${s.topic}`,
      setting_en:`A high-stakes professional discussion about ${s.topic}.`,
      goal_en:`Be clear, confident, listen well, commit to action.`,
      target_vocab:['propose','tradeoff','timeline','responsibility','commit'],
      target_grammar:['conditionals','passive_voice','linkers'],
      turns:[
        {ai:`Where do we stand on ${s.topic}?`, type:'opinion', vocab:['stand','progress','blocker','update'], minw:7},
        {ai:`What's the tradeoff if we delay?`, type:'opinion', vocab:['tradeoff','delay','impact','risk'], minw:7},
        {ai:`Propose a path.`, type:'opinion', vocab:['propose','phased','option','recommend'], minw:7},
        {ai:`Who owns it?`, type:'opinion', vocab:['own','responsible','timeline','commit'], minw:6},
        {ai:`Locked. Let's regroup Friday.`, type:'closing', vocab:['agree','Friday','update'], minw:4, terminal:true},
      ]
    })
  }
  i = 0
  for (const s of L5_MORE) {
    i++; all.push({
      slug:`l5-more-${i}`, personaSlug:s.persona, level:'L5', difficulty:'challenging',
      title_en:`Engage: ${s.topic}`, title_ar:`شاركي: ${s.topic}`,
      setting_en:`A demanding senior-level conversation about ${s.topic}.`,
      goal_en:`Hold multiple perspectives, drive toward outcome with nuance.`,
      target_vocab:['perspective','synthesize','tradeoff','principle','outcome'],
      target_grammar:['conditionals','linkers','complex_sentences','passive_voice'],
      turns:[
        {ai:`Open the topic. What's your read on ${s.topic}?`, type:'opinion', vocab:['perspective','synthesize','principle','underlying'], minw:9},
        {ai:`What's the strongest counterargument?`, type:'opinion', vocab:['counterargument','partial','valid','reconcile'], minw:9},
        {ai:`How do you address it?`, type:'opinion', vocab:['address','specifically','data','reframe','distinguish'], minw:8},
        {ai:`What's your recommendation?`, type:'opinion', vocab:['recommend','tradeoff','phased','metric','commit'], minw:8},
        {ai:`Strong. Let's execute.`, type:'closing', vocab:['thank you','agree','execute'], minw:4, terminal:true},
      ]
    })
  }
  return all
}

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN required')
  const SCENARIOS = build()
  console.log(`Built ${SCENARIOS.length} v4 scenarios`)

  for (const ref of targets) {
    console.log(`\n=== TARGET: ${ref} ===`)
    const personas = await call(token, ref, 'SELECT id, slug FROM retention_personas')
    const pm = Object.fromEntries(personas.map(p => [p.slug, p.id]))
    let scI = 0, scS = 0, tI = 0
    for (const sc of SCENARIOS) {
      const pid = pm[sc.personaSlug]
      if (!pid) { console.error(`  no persona ${sc.personaSlug}`); continue }
      const r = await call(token, ref, `INSERT INTO retention_scenarios (slug, persona_id, title_en, title_ar, setting_en, goal_en, difficulty, target_level, estimated_minutes, target_vocab, target_grammar, active)
        VALUES (${esc(sc.slug)}, '${pid}', ${esc(sc.title_en)}, ${esc(sc.title_ar)}, ${esc(sc.setting_en)}, ${esc(sc.goal_en)}, '${sc.difficulty}', '${sc.level}', ${sc.turns.length+2}, ${arrText(sc.target_vocab)}, ${arrText(sc.target_grammar)}, true)
        ON CONFLICT (slug) DO NOTHING RETURNING id`)
      let sid
      if (Array.isArray(r) && r.length > 0) { sid = r[0].id; scI++ }
      else {
        const f = await call(token, ref, `SELECT id FROM retention_scenarios WHERE slug = ${esc(sc.slug)} LIMIT 1`)
        sid = f[0]?.id; scS++
      }
      if (!sid) continue
      const tc = await call(token, ref, `SELECT count(*)::int as c FROM retention_dialogue_turns WHERE scenario_id='${sid}'`)
      if (tc[0].c >= sc.turns.length) continue
      for (let i = 0; i < sc.turns.length; i++) {
        const t = sc.turns[i]
        try { await call(token, ref, `INSERT INTO retention_dialogue_turns (scenario_id, turn_number, ai_text_en, expected_response_type, expected_vocab, min_words, is_terminal) VALUES ('${sid}', ${i+1}, ${esc(t.ai)}, '${t.type}', ${arrText(t.vocab)}, ${t.minw||3}, ${t.terminal?'true':'false'})`); tI++ }
        catch (e) {}
      }
    }
    const s = await call(token, ref, 'SELECT count(*)::int as c FROM retention_scenarios')
    const t = await call(token, ref, 'SELECT count(*)::int as c FROM retention_dialogue_turns')
    console.log(`[${ref}] +${scI} (${scS} existed), +${tI} turns; totals: ${s[0].c}/${t[0].c}`)
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })
