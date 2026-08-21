// Losslessness is the whole safety property: the formatter may re-typeset a
// brief, never change a character of it. Runs against EVERY brief in the
// database, ordinary and custom-track alike.
import fs from 'node:fs'
import { analyzeBrief, joinAnalysis, splitSentences, splitMoveClauses } from '../../src/lib/writingBrief.js'

const mcp = fs.readFileSync(process.env.HOME + '/projects/fluentia-lms/.mcp.json', 'utf8')
const tok = (mcp.match(/sbp_[A-Za-z0-9]+/) || [])[0]
const res = await fetch('https://api.supabase.com/v1/projects/nmjexpuycmqcxuxljier/database/query', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: `select w.id, w.prompt_en, w.grammar_to_use->>'topic_name_en' as topic
                                 from curriculum_writing w where w.prompt_en is not null;` }),
})
const rows = await res.json()

let lossy = 0, noAsk = 0, withScenario = 0, withConstraint = 0, totalMoves = 0, maxMoves = 0
for (const r of rows) {
  const a = analyzeBrief(r.prompt_en, { grammarTopic: r.topic })
  if (joinAnalysis(a) !== r.prompt_en) {
    lossy++
    if (lossy <= 3) {
      console.log('\nLOSSY', r.id)
      console.log('  in :', JSON.stringify(r.prompt_en.slice(0, 150)))
      console.log('  out:', JSON.stringify(joinAnalysis(a).slice(0, 150)))
    }
  }
  if (!a.ask.length) noAsk++
  if (a.scenario) withScenario++
  if (a.constraint) withConstraint++
  totalMoves += a.moves.length
  maxMoves = Math.max(maxMoves, a.moves.length)
}

console.log(`\nbriefs              ${rows.length}`)
console.log(`lossy               ${lossy}   (must be 0)`)
console.log(`no ask              ${noAsk}   (must be 0)`)
console.log(`with a scenario     ${withScenario}`)
console.log(`with a constraint   ${withConstraint}`)
console.log(`avg moves           ${(totalMoves / rows.length).toFixed(1)}   max ${maxMoves}`)

// The series that motivated the change must actually come apart.
const series = 'Open with a brief thank-you, state the main goal for the quarter, explain the plan clearly (which channel gets the budget, when you launch, what you are arranging this week), and close with when you will send the full timeline.'
const parts = splitMoveClauses(series)
console.log(`\nseries split        ${parts.length} instructions (expect 4)`)
parts.forEach((p) => console.log('   •', p.s.slice(0, 62)))
if (parts.map((p) => p.lead + p.s + p.tail).join('') !== series) { console.log('SERIES JOIN LOSSY'); process.exit(1) }

for (const t of [
  'Consider brain-computer interfaces (BCIs) in neuroscience. Support your view.',
  'Spend 3.5 hours on it. Then write.',
  'Use e.g. simple sentences. Close with a question.',
]) console.log(`split "${t.slice(0, 40)}…" -> ${splitSentences(t).length}`)

process.exit(lossy === 0 && noAsk === 0 && parts.length === 4 ? 0 : 1)
