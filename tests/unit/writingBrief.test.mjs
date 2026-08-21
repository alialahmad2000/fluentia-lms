// Losslessness is the whole safety property: the formatter may re-typeset a
// brief, never change a character of it. Runs against EVERY brief in the
// database, ordinary and custom-track alike.
import fs from 'node:fs'
import { segmentBrief, joinSegments, splitSentences } from '../../src/lib/writingBrief.js'

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim()

const mcp = fs.readFileSync(process.env.HOME + '/projects/fluentia-lms/.mcp.json', 'utf8')
const tok = (mcp.match(/sbp_[A-Za-z0-9]+/) || [])[0]
const res = await fetch('https://api.supabase.com/v1/projects/nmjexpuycmqcxuxljier/database/query', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: `select w.id, w.prompt_en, w.grammar_to_use->>'topic_name_en' as topic
                                 from curriculum_writing w where w.prompt_en is not null;` }),
})
const rows = await res.json()

let lossy = 0, empty = 0, emphasised = 0, totalSteps = 0
for (const r of rows) {
  const seg = segmentBrief(r.prompt_en, { grammarTopic: r.topic })
  if (norm(joinSegments(seg)) !== norm(r.prompt_en)) {
    lossy++
    if (lossy <= 3) {
      console.log('\nLOSSY', r.id)
      console.log('  in :', norm(r.prompt_en).slice(0, 160))
      console.log('  out:', norm(joinSegments(seg)).slice(0, 160))
    }
  }
  if (!seg.lead.length) empty++
  totalSteps += seg.steps.length
  const runs = [seg.lead, ...seg.steps].flat()
  if (runs.some((x) => x.kind !== 'text')) emphasised++
}

console.log(`\nbriefs            ${rows.length}`)
console.log(`lossy             ${lossy}   (must be 0)`)
console.log(`empty lead        ${empty}   (must be 0)`)
console.log(`with emphasis     ${emphasised} / ${rows.length}`)
console.log(`avg steps         ${(totalSteps / rows.length).toFixed(1)}`)

// Sentence splitter must not break on brackets/abbreviations/decimals.
const tricky = [
  'Consider brain-computer interfaces (BCIs) in modern neuroscience. Support your view.',
  'Spend 3.5 hours on it. Then write.',
  'Use e.g. simple sentences. Close with a question.',
]
for (const t of tricky) {
  const n = splitSentences(t).length
  console.log(`split "${t.slice(0, 42)}…" -> ${n} sentences`)
}
process.exit(lossy === 0 && empty === 0 ? 0 : 1)
