#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-100 fix #2 — add 5 L4 + 6 L5 scenarios to hit 40/level target.

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
const esc = (s) => s == null ? 'NULL' : `$${'s'}$${String(s).replace(/\$s\$/g,'$_s_$')}$${'s'}$`
const arrText = (a) => !a||a.length===0 ? "'{}'::text[]" : `ARRAY[${a.map((x)=>esc(x)).join(',')}]::text[]`

const SCENARIOS = [
  // ─── 5 more L4 scenarios ───
  { slug:'l4-cross-functional-pitch', personaSlug:'omar-taxi', level:'L4', difficulty:'challenging',
    title_en:"Pitch a cross-functional initiative", title_ar:"قدّمي مبادرة بين أقسام متعددة",
    setting_en:"You're pitching a project that affects three departments. Each has different priorities. You have 15 minutes total.",
    goal_en:"Win buy-in from all three, propose a clear ownership model.",
    target_vocab:['stakeholder','ownership','prioritize','synergy','commit','tradeoff'],
    target_grammar:['conditionals','passive_voice','complex_sentences'],
    turns:[
      {ai:"You have 15 minutes. Why does this matter to all three departments?", type:'opinion', vocab:['stakeholder','impact','common','goal'], minw:8},
      {ai:"Marketing worries about messaging consistency — how do you address that?", type:'opinion', vocab:['guidelines','partnership','review','sign-off'], minw:7},
      {ai:"Engineering says they don't have bandwidth — what's your plan?", type:'opinion', vocab:['phased','prioritize','tradeoff','quarter'], minw:7},
      {ai:"Operations needs measurable success criteria. What are they?", type:'opinion', vocab:['metric','baseline','target','review'], minw:7},
      {ai:"Who owns the day-to-day?", type:'opinion', vocab:['lead','accountable','escalation','meeting'], minw:6},
      {ai:"Sounds workable. Send the brief by Wednesday.", type:'closing', vocab:['thank you','confirm','look forward'], minw:3, terminal:true},
    ]},
  { slug:'l4-stakeholder-bad-news', personaSlug:'amira-hotel', level:'L4', difficulty:'challenging',
    title_en:"Deliver project delay news to a stakeholder", title_ar:"بلّغي مستفيدًا بتأخّر مشروع",
    setting_en:"A key stakeholder counted on a feature shipping next month. It will slip 6 weeks. You're meeting to deliver this directly.",
    goal_en:"Be honest about cause, propose mitigation, preserve trust.",
    target_vocab:['transparent','root cause','mitigation','timeline','accountability','options'],
    target_grammar:['present_perfect','passive_voice','linkers'],
    turns:[
      {ai:"You said it was urgent. What's going on?", type:'opinion', vocab:['unfortunately','delay','transparent','context'], minw:7},
      {ai:"How did this happen?", type:'opinion', vocab:['root cause','dependency','scope','assumption','underestimated'], minw:7},
      {ai:"What's your mitigation?", type:'opinion', vocab:['mitigation','interim','workaround','priority','protect'], minw:7},
      {ai:"What can you commit to now?", type:'opinion', vocab:['commit','firm','weekly update','escalation','support'], minw:6},
      {ai:"OK. I appreciate the directness.", type:'closing', vocab:['thank you','rebuild','trust'], minw:4, terminal:true},
    ]},
  { slug:'l4-recruit-passive-candidate', personaSlug:'omar-taxi', level:'L4', difficulty:'challenging',
    title_en:"Recruit a passive candidate", title_ar:"اجذبي مرشّحًا غير ساعٍ لتغيير الوظيفة",
    setting_en:"You found a talented engineer happy at her current job. You have one coffee chat to make a case for joining.",
    goal_en:"Understand her motivations, present an honest opportunity, leave the door open.",
    target_vocab:['curious','opportunity','growth','culture','fit','genuine'],
    target_grammar:['present_perfect','conditionals','linkers'],
    turns:[
      {ai:"I'm happy where I am. Why should I listen?", type:'opinion', vocab:['curious','grateful','genuinely','opportunity','no pressure'], minw:7},
      {ai:"What makes your team different?", type:'opinion', vocab:['culture','ownership','autonomy','impact','peers'], minw:7},
      {ai:"What's the growth path?", type:'opinion', vocab:['trajectory','mentorship','stretch','principal','clear'], minw:7},
      {ai:"What would my first 90 days look like?", type:'opinion', vocab:['onboarding','win','project','team','support'], minw:7},
      {ai:"I need to think about it.", type:'closing', vocab:['no rush','open door','reach out','best wishes'], minw:4, terminal:true},
    ]},
  { slug:'l4-budget-pushback', personaSlug:'omar-taxi', level:'L4', difficulty:'challenging',
    title_en:"Push back on a budget cut", title_ar:"اعترضي على تخفيض الميزانية",
    setting_en:"Leadership wants to cut your team's budget by 30%. You disagree. You have one meeting with the CFO.",
    goal_en:"Make a data-backed case, propose alternatives, accept partial compromise if needed.",
    target_vocab:['investment','ROI','reduce','reallocate','impact','options'],
    target_grammar:['conditionals','modal_verbs','passive_voice'],
    turns:[
      {ai:"30% cut. Make your case in 5 minutes.", type:'opinion', vocab:['investment','ROI','impact','quantify','data'], minw:8},
      {ai:"All teams are taking cuts. Why are you special?", type:'opinion', vocab:['fair','revenue','dependency','customer','flagship'], minw:8},
      {ai:"What if we cut 15% instead?", type:'opinion', vocab:['workable','protect','postpone','tradeoff','specific'], minw:7},
      {ai:"What would you sacrifice?", type:'opinion', vocab:['defer','reduce','outsource','consolidate','transparent'], minw:7},
      {ai:"OK, let's go with 15%. Build the plan.", type:'closing', vocab:['thank you','commit','draft','follow up'], minw:4, terminal:true},
    ]},
  { slug:'l4-design-review-deep', personaSlug:'dr-lopez', level:'L4', difficulty:'challenging',
    title_en:"Defend a design decision in review", title_ar:"دافعي عن قرار تصميم في مراجعة",
    setting_en:"Senior peers are reviewing your design. Two challenge your central choice as 'unconventional'.",
    goal_en:"Articulate the tradeoffs you considered, defend without being defensive, integrate valid feedback.",
    target_vocab:['rationale','tradeoff','constraint','iteration','feedback','convention'],
    target_grammar:['present_perfect','passive_voice','linkers','conditionals'],
    turns:[
      {ai:"Your choice goes against convention. Why?", type:'opinion', vocab:['rationale','constraint','considered','alternative','specific'], minw:8},
      {ai:"What tradeoffs did you weigh?", type:'opinion', vocab:['tradeoff','simplicity','performance','consistency','users'], minw:8},
      {ai:"How did you validate this approach?", type:'opinion', vocab:['prototype','tested','feedback','iteration','data'], minw:7},
      {ai:"What's the strongest counterargument?", type:'opinion', vocab:['acknowledge','partial','however','context','distinction'], minw:7},
      {ai:"Fair defense. Update the spec.", type:'closing', vocab:['thank you','update','reflect','soon'], minw:4, terminal:true},
    ]},

  // ─── 6 more L5 scenarios ───
  { slug:'l5-board-difficult-quarter', personaSlug:'dr-lopez', level:'L5', difficulty:'challenging',
    title_en:"Present a difficult quarter to the board", title_ar:"قدّمي ربعًا صعبًا لمجلس الإدارة",
    setting_en:"You're presenting Q3 results to the board. Revenue missed targets by 18%. You need to maintain confidence without sugar-coating.",
    goal_en:"Present unflinchingly, take ownership, articulate a credible recovery path.",
    target_vocab:['shortfall','headwinds','recovery','accountability','runway','strategic'],
    target_grammar:['passive_voice','conditionals','complex_sentences'],
    turns:[
      {ai:"Walk us through the numbers.", type:'opinion', vocab:['Q3','shortfall','specifically','versus','headwinds'], minw:9},
      {ai:"What's your read on what went wrong?", type:'opinion', vocab:['root cause','external','internal','accountability','learnings'], minw:9},
      {ai:"What's the recovery plan?", type:'opinion', vocab:['recovery','horizon','levers','prioritize','milestones'], minw:9},
      {ai:"How are you protecting the team's morale?", type:'opinion', vocab:['transparent','communicate','support','focus','momentum'], minw:8},
      {ai:"What do you need from us?", type:'opinion', vocab:['endorsement','introductions','runway','patience','partnership'], minw:7},
      {ai:"Thank you. We're with you.", type:'closing', vocab:['appreciate','update','rebuild','soon'], minw:4, terminal:true},
    ]},
  { slug:'l5-merger-integration-call', personaSlug:'omar-taxi', level:'L5', difficulty:'challenging',
    title_en:"Lead a merger integration kickoff", title_ar:"قودي اجتماع بدء دمج شركتين",
    setting_en:"Day 1 of a merger. You're the integration lead. People are anxious about jobs and culture.",
    goal_en:"Set tone with honesty + clarity, surface concerns, build initial momentum.",
    target_vocab:['integration','culture','transparency','principles','milestones','listen'],
    target_grammar:['present_continuous','passive_voice','modal_verbs'],
    turns:[
      {ai:"Today's the day. What's the first thing you say?", type:'opinion', vocab:['honest','listening','principles','transparency','journey'], minw:9},
      {ai:"How will you handle the cultural differences?", type:'opinion', vocab:['identify','respect','blend','best of both','intentional'], minw:9},
      {ai:"What guarantees can you give on jobs?", type:'opinion', vocab:['truth','review','timeline','severance','commitment'], minw:8},
      {ai:"What are the first 30-day milestones?", type:'opinion', vocab:['listen tour','quick wins','clarity','transparency','signals'], minw:8},
      {ai:"How will you measure success?", type:'opinion', vocab:['retention','sentiment','productivity','synergies','tracking'], minw:7},
      {ai:"Strong start. Update us weekly.", type:'closing', vocab:['thank you','weekly','open door','listen'], minw:4, terminal:true},
    ]},
  { slug:'l5-public-apology', personaSlug:'amira-hotel', level:'L5', difficulty:'challenging',
    title_en:"Issue a public apology after a serious incident", title_ar:"قدّمي اعتذارًا علنيًا بعد حادثة جدية",
    setting_en:"Your company's product caused a serious data breach. You're addressing the public, media, and customers.",
    goal_en:"Take full ownership, avoid legalese, articulate concrete remediation.",
    target_vocab:['ownership','remediation','transparency','accountability','rebuild','specific'],
    target_grammar:['passive_voice','present_perfect','modal_verbs'],
    turns:[
      {ai:"You're about to face the press. What's your opening statement?", type:'opinion', vocab:['no excuses','responsibility','sorry','transparent','customers first'], minw:9},
      {ai:"What specifically went wrong?", type:'opinion', vocab:['investigation','specifically','process','gap','failed'], minw:9},
      {ai:"What are you doing to fix it?", type:'opinion', vocab:['immediate','independent','reform','third-party','timeline'], minw:9},
      {ai:"How will customers be made whole?", type:'opinion', vocab:['compensate','identity protection','direct contact','no charge','long-term'], minw:8},
      {ai:"What will prevent this happening again?", type:'opinion', vocab:['systemic','culture','audit','accountability','public reporting'], minw:8},
      {ai:"That sounded human. Now follow through.", type:'closing', vocab:['commit','prove','daily','progress'], minw:5, terminal:true},
    ]},
  { slug:'l5-difficult-decision-team', personaSlug:'dr-lopez', level:'L5', difficulty:'challenging',
    title_en:"Tell your team you're stepping down", title_ar:"اخبري فريقكِ بأنّكِ ستتركين الدور",
    setting_en:"You're leaving a leadership role after a long tenure. You're telling the team before the public announcement.",
    goal_en:"Be honest about the why, honor the team's history, set them up for success.",
    target_vocab:['decision','grateful','transition','succession','proud','authentic'],
    target_grammar:['present_perfect','passive_voice','linkers'],
    turns:[
      {ai:"You called us all together. What's going on?", type:'opinion', vocab:['important','share first','decided','transition','authentic'], minw:8},
      {ai:"Why now?", type:'opinion', vocab:['time','growth','new challenge','best for','reflected'], minw:8},
      {ai:"How will succession work?", type:'opinion', vocab:['planned','interim','search','transparent','involvement'], minw:8},
      {ai:"What do you want us to remember?", type:'opinion', vocab:['proud','built together','principles','keep going','believe'], minw:8},
      {ai:"We'll miss you. Thank you for everything.", type:'closing', vocab:['honor','grateful','keep in touch','best wishes'], minw:5, terminal:true},
    ]},
  { slug:'l5-policy-reversal', personaSlug:'omar-taxi', level:'L5', difficulty:'challenging',
    title_en:"Reverse a controversial policy you championed", title_ar:"تراجعي عن سياسة جدلية كنتِ قد دافعتِ عنها",
    setting_en:"Six months ago you championed a policy. Data now shows it's not working. You need to publicly reverse course.",
    goal_en:"Show intellectual honesty, take the lesson seriously, propose what you'll do differently next time.",
    target_vocab:['data','wrong','update','course-correct','humility','process'],
    target_grammar:['present_perfect','conditionals','passive_voice'],
    turns:[
      {ai:"You championed this. Now you want to reverse. Why?", type:'opinion', vocab:['data','honest','underperformed','update','intellectually'], minw:9},
      {ai:"What did you miss when you made the original case?", type:'opinion', vocab:['assumption','signal','overweighted','context','feedback'], minw:9},
      {ai:"What's the new direction?", type:'opinion', vocab:['phased','pilot','revisit','learn','iterate'], minw:8},
      {ai:"How will you make better decisions next time?", type:'opinion', vocab:['process','dissent','red-team','metrics','timebox'], minw:8},
      {ai:"Hard call. Respect for owning it.", type:'closing', vocab:['thank you','commit','transparent','update'], minw:4, terminal:true},
    ]},
  { slug:'l5-international-keynote-q-and-a', personaSlug:'dr-lopez', level:'L5', difficulty:'challenging',
    title_en:"Handle a hostile Q&A at an international keynote", title_ar:"تعاملي مع جلسة أسئلة عدائية في كلمة دولية",
    setting_en:"You just gave a keynote. A senior attendee from another country challenges your central claim sharply.",
    goal_en:"Engage substantively, find common ground, win audience respect without escalating.",
    target_vocab:['perspective','data','common ground','context','distinguish','respectfully'],
    target_grammar:['conditionals','passive_voice','linkers'],
    turns:[
      {ai:"Your central claim is naive. What do you say?", type:'opinion', vocab:['thank you','perspective','respectfully','data','context'], minw:9},
      {ai:"In my country, your approach would fail.", type:'opinion', vocab:['context','adapt','principles','specific','common ground'], minw:9},
      {ai:"What evidence do you have?", type:'opinion', vocab:['studies','peer-reviewed','specifically','distinguish','available'], minw:9},
      {ai:"What would change your mind?", type:'opinion', vocab:['evidence','sample','longitudinal','open','test'], minw:8},
      {ai:"OK, that was a real answer. Thank you.", type:'closing', vocab:['appreciate','continue','offline','exchange'], minw:5, terminal:true},
    ]},
]

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN required')

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
      for (let i = 0; i < sc.turns.length; i++) {
        const t = sc.turns[i]
        try {
          await call(token, ref, `INSERT INTO retention_dialogue_turns (scenario_id, turn_number, ai_text_en, expected_response_type, expected_vocab, min_words, is_terminal) VALUES ('${sid}', ${i+1}, ${esc(t.ai)}, '${t.type}', ${arrText(t.vocab)}, ${t.minw||3}, ${t.terminal?'true':'false'})`)
          tI++
        } catch (e) { /* unique idx prevents dups */ }
      }
    }
    const s = await call(token, ref, 'SELECT count(*)::int as c FROM retention_scenarios')
    console.log(`[${ref}] +${scI} scenarios (${scS} existed), +${tI} turns; total scenarios=${s[0].c}`)
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })
