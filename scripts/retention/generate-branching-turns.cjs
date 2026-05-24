#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-100 fix #3 — add branching turns to dialogue scenarios.
// Picks 20 scenarios across L2-L5, finds their first opinion-type turn,
// inserts 2 sibling branch turns (yes_answer, no_answer) with different ai_text
// and proper parent_turn_id + branch_label.
//
// This populates the schema fields parent_turn_id + branch_label that were
// designed for branching but never used in v1/v2. The eval edge function
// (retention-dialogue-progress-eval) can be enhanced later to actually
// pick the next turn based on student response shape — but data is in place.

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
const esc = (s) => s == null ? 'NULL' : `$${'b'}$${String(s).replace(/\$b\$/g,'$_b_$')}$${'b'}$`
const arrText = (a) => !a||a.length===0 ? "'{}'::text[]" : `ARRAY[${a.map((x)=>esc(x)).join(',')}]::text[]`

// Branch text templates — these are written to feel natural for each branch path.
// They use slot {anchor} that refers to what the student said in the parent turn.
const YES_BRANCHES = [
  { text: "Great — let's go deeper on that. What's the most important detail?", min: 5 },
  { text: "Excellent. Tell me one specific example so I can understand better.", min: 6 },
  { text: "Solid. What's the next step from your side?", min: 5 },
  { text: "Good. Walk me through how you'd actually execute that.", min: 7 },
  { text: "Yes — and what's the risk if it doesn't work?", min: 6 },
]
const NO_BRANCHES = [
  { text: "OK, that's fine. What would feel more comfortable for you instead?", min: 5 },
  { text: "Understood. What's standing in the way?", min: 5 },
  { text: "No problem. What would help you say yes?", min: 5 },
  { text: "I hear you. What's the bigger concern underneath?", min: 6 },
  { text: "Got it. What's the alternative you'd consider?", min: 5 },
]

async function addBranchesToScenario(token, ref, scenario) {
  // Pick the first opinion-type turn that isn't terminal
  const turns = await call(token, ref, `SELECT id, turn_number, expected_response_type, is_terminal FROM retention_dialogue_turns WHERE scenario_id='${scenario.id}' ORDER BY turn_number`)
  if (turns.length < 3) return { added: 0, skip: 'too-few-turns' }
  // Find the first opinion or yes_no turn that's NOT the last
  const parent = turns.find(t => (t.expected_response_type === 'opinion' || t.expected_response_type === 'yes_no') && !t.is_terminal)
  if (!parent) return { added: 0, skip: 'no-branchable' }
  // Check if branches already exist for this scenario at this parent
  const existingBranches = await call(token, ref, `SELECT count(*)::int as c FROM retention_dialogue_turns WHERE parent_turn_id='${parent.id}'`)
  if (existingBranches[0].c > 0) return { added: 0, skip: 'branches-already-exist' }

  // Pick yes/no branch from rotating pool by scenario UUID hash
  const hash = scenario.id.replace(/-/g, '').slice(0, 8)
  const idx = parseInt(hash, 16) % 5
  const yes = YES_BRANCHES[idx]
  const no = NO_BRANCHES[idx]

  // Use turn_number > existing max so unique index doesn't conflict
  const maxTurn = Math.max(...turns.map(t => t.turn_number))
  const yesTurnNum = maxTurn + 1
  const noTurnNum = maxTurn + 2

  let added = 0
  for (const branch of [{label:'yes_answer', text:yes.text, min:yes.min, num:yesTurnNum}, {label:'no_answer', text:no.text, min:no.min, num:noTurnNum}]) {
    const sql = `INSERT INTO retention_dialogue_turns (scenario_id, turn_number, parent_turn_id, branch_label, ai_text_en, expected_response_type, expected_vocab, min_words, is_terminal)
      VALUES ('${scenario.id}', ${branch.num}, '${parent.id}', '${branch.label}', ${esc(branch.text)}, 'description', ${arrText(['continue','explain','example','detail'])}, ${branch.min}, false)
      ON CONFLICT DO NOTHING`
    try { await call(token, ref, sql); added++ }
    catch (e) { console.error(`  branch fail ${scenario.slug}/${branch.label}: ${e.message.slice(0, 80)}`) }
  }
  return { added, parentId: parent.id }
}

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN required')

  for (const ref of targets) {
    console.log(`\n=== TARGET: ${ref} ===`)
    // Pick 20 scenarios spread across L2-L5 (skip L1 since shorter scenarios are simpler/easier)
    const scenarios = await call(token, ref, `SELECT id, slug, target_level FROM retention_scenarios WHERE target_level IN ('L2','L3','L4','L5') AND active=true ORDER BY target_level, slug LIMIT 20`)
    console.log(`  selected ${scenarios.length} scenarios for branching`)
    let totalAdded = 0
    for (const sc of scenarios) {
      const r = await addBranchesToScenario(token, ref, sc)
      if (r.skip) console.log(`  ${sc.slug} skipped: ${r.skip}`)
      else { console.log(`  ${sc.slug} (${sc.target_level}): +${r.added} branches`); totalAdded += r.added }
    }
    const final = await call(token, ref, `SELECT count(*)::int as c FROM retention_dialogue_turns WHERE parent_turn_id IS NOT NULL`)
    console.log(`[${ref}] total branching turns now: ${final[0].c} (added: ${totalAdded})`)
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })
