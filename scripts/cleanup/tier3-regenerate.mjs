// Tier 3 — Regenerate 43 example_sentences where word is not in example
// Per-level prompt tuning. Same validation as Tier 2.
import { createClient }  from '@supabase/supabase-js'
import Anthropic          from '@anthropic-ai/sdk'
import pkg                from 'pg'
import { readFileSync }   from 'fs'
import { join, dirname }  from 'path'
import { fileURLToPath }  from 'url'

const { Client } = pkg
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')

function readEnv() {
  const env = {}
  readFileSync(join(ROOT, '.env'), 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m) env[m[1]] = m[2].trim()
  })
  return env
}
const ENV = readEnv()
const db  = createClient(ENV['VITE_SUPABASE_URL'], ENV['SUPABASE_SERVICE_ROLE_KEY'])
const ai  = new Anthropic({ apiKey: ENV['CLAUDE_API_KEY'] })
const RUN_ID = readFileSync(join(ROOT, 'docs/audits/vocab/run-id.txt'), 'utf8').trim()
const results = JSON.parse(readFileSync(join(ROOT, 'docs/audits/vocab/investigation-results.json'), 'utf8'))

const DRY_RUN = process.argv.includes('--dry-run')
const FORCE   = process.argv.includes('--force')

const ARABIC_RE = /[؀-ۿݐ-ݿ]/
const containsArabic = s => s && ARABIC_RE.test(s)

function wordInExample(word, example) {
  if (!word || !example) return false
  const w = word.toLowerCase().trim()
  const ex = example.toLowerCase()
  if (ex.includes(w)) return true
  const stems = new Set([w])
  ;[/s$/, /es$/, /ed$/, /ing$/, /er$/, /est$/, /ly$/, /ies$/, /ied$/,
    /y$/, /ry$/, /tion$/, /ment$/, /ness$/, /ity$/, /al$/, /ful$/, /less$/].forEach(re => {
    const s = w.replace(re, '')
    if (s.length > 2) stems.add(s)
  })
  if (/([a-z])\1ing$/.test(w)) stems.add(w.replace(/([a-z])\1ing$/, '$1'))
  if (w.includes(' ')) {
    const parts = w.split(/\s+/).filter(p => p.length > 3)
    if (parts.length > 0 && parts.every(p => ex.includes(p))) return true
  }
  return [...stems].some(s => s.length > 2 && ex.includes(s))
}

function buildPrompt(row) {
  const lvl = row.level_number ?? 0
  const wordRange = lvl === 0 ? '5-10' : lvl === 1 ? '6-12' : lvl <= 3 ? '8-16' : lvl === 4 ? '8-18' : '10-25'
  const complexity = lvl === 0 ? 'absolute beginner (A1)' : lvl === 1 ? 'beginner (A2)'
    : lvl === 2 ? 'elementary (A2-B1)' : lvl === 3 ? 'intermediate (B1-B2)'
    : lvl === 4 ? 'upper-intermediate (B2-C1)' : 'advanced (C1-C2)'
  return `You are writing an English example sentence for a ${complexity} vocabulary course.

Word:       ${row.word}
Definition: ${row.definition_en || ''}

Write ONE natural English sentence that:
- Clearly contains "${row.word}" or a recognizable inflection (plural/past/-ing/comparative)
- Is ${wordRange} words
- Matches ${complexity} register and vocabulary
- Has ZERO Arabic characters
- Makes the word's meaning clear from context

Output ONLY the sentence. No quotes, labels, or explanations.`
}

async function regenerateOne(row, stats) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    let out
    try {
      const msg = await ai.messages.create({
        model: 'claude-sonnet-4-6', max_tokens: 100,
        messages: [{ role: 'user', content: buildPrompt(row) }],
      })
      out = msg.content[0].text.trim().replace(/^["']|["']$/g, '')
    } catch (e) {
      if (e.status === 529 || e.status === 503) await new Promise(r => setTimeout(r, 5000))
      else console.error(`  API err attempt ${attempt}:`, e.message)
      continue
    }
    if (containsArabic(out)) { stats.rejected++; continue }
    const wc = out.split(/\s+/).length
    if (wc < 4 || wc > 30) { stats.rejected++; continue }
    if (!wordInExample(row.word, out)) { stats.rejected++; continue }

    const { error } = await db
      .from('curriculum_vocabulary')
      .update({ original_example_sentence: row.example_sentence, example_sentence: out,
                regenerated_at: new Date().toISOString(), cleanup_run_id: RUN_ID })
      .eq('id', row.id)
    if (error) throw new Error(error.message)
    return { ok: true, out }
  }
  return { ok: false }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
console.log(`=== Tier 3${DRY_RUN ? ' [DRY-RUN]' : ''} — ${results.tier3.ids.length} rows ===\n`)

const pgClient = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432,
  database: 'postgres', user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000', ssl: { rejectUnauthorized: false },
})
await pgClient.connect()

// Load Tier 3 rows in batches to avoid URL limit
const allT3Ids = results.tier3.ids
const batchSize = 50
const rowAccum = []
for (let i = 0; i < allT3Ids.length; i += batchSize) {
  const batch = allT3Ids.slice(i, i + batchSize)
  const { rows } = await pgClient.query(`
    SELECT v.id, v.word, v.definition_en, v.example_sentence, v.regenerated_at,
           l.level_number
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE v.id = ANY($1)
  `, [batch])
  rowAccum.push(...rows)
}
await pgClient.end()

const toProcess = FORCE ? rowAccum : rowAccum.filter(r => !r.regenerated_at)
console.log(`Total Tier 3 rows: ${rowAccum.length}`)
console.log(`To process now:    ${toProcess.length}\n`)

if (DRY_RUN) {
  for (const row of toProcess.slice(0, 5)) {
    console.log(`\nL${row.level_number} "${row.word}":`)
    console.log(`  Old: "${(row.example_sentence || '').slice(0, 100)}"`)
    const msg = await ai.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 100,
      messages: [{ role: 'user', content: buildPrompt(row) }],
    })
    const gen = msg.content[0].text.trim().replace(/^["']|["']$/g, '')
    console.log(`  New: "${gen}"`)
    console.log(`  Checks: arabic=${containsArabic(gen)} wc=${gen.split(/\s+/).length} match=${wordInExample(row.word, gen)}`)
  }
  console.log('\n[DRY-RUN] done.')
  process.exit(0)
}

const stats = { processed: 0, succeeded: 0, failed: 0, rejected: 0 }
const failures = []
const CONCURRENCY = 5
for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
  await Promise.all(toProcess.slice(i, i + CONCURRENCY).map(async row => {
    const r = await regenerateOne(row, stats)
    stats.processed++
    if (r.ok) { stats.succeeded++; console.log(`  ✅ "${row.word}" → "${r.out.slice(0,70)}"`) }
    else { stats.failed++; failures.push(row.word); console.log(`  ❌ "${row.word}"`) }
  }))
}

console.log(`\nTier 3 done: ${stats.succeeded} ✅ ${stats.failed} ❌`)
if (failures.length) console.log('Failed:', failures.join(', '))
