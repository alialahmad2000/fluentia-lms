// Tier 2 — Regenerate 3,389 L4 example_sentences that contain Arabic
// CLI: --dry-run (3 samples), --limit N, --force (re-process already done)
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
const RUN_ID  = readFileSync(join(ROOT, 'docs/audits/vocab/run-id.txt'), 'utf8').trim()

const DRY_RUN  = process.argv.includes('--dry-run')
const FORCE    = process.argv.includes('--force')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT    = limitIdx >= 0 ? parseInt(process.argv[limitIdx + 1]) : null

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
  const lvl = row.level_number ?? 4
  const range = lvl <= 1 ? '6-12' : lvl <= 3 ? '8-16' : '8-20'
  const complexity = lvl === 4 ? 'upper-intermediate / B2-C1' : `Level ${lvl}`
  return `You are writing an English example sentence for a CEFR ${complexity} language course.

Word:       ${row.word}
Definition: ${row.definition_en || ''}
Level:      L${lvl}

Write ONE natural English sentence that:
- Contains "${row.word}" or a clear inflection (plural/past/-ing)
- Is ${range} words
- Has ZERO Arabic characters
- Is contextually rich

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
      if (e.status === 529 || e.status === 503) await new Promise(r => setTimeout(r, 10000))
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

async function runBatch(rows, concurrency = 5) {
  const stats = { processed: 0, succeeded: 0, failed: 0, rejected: 0 }
  const failures = []
  for (let i = 0; i < rows.length; i += concurrency) {
    await Promise.all(rows.slice(i, i + concurrency).map(async row => {
      const r = await regenerateOne(row, stats)
      stats.processed++
      if (r.ok) stats.succeeded++
      else { stats.failed++; failures.push({ id: row.id, word: row.word }) }
    }))
    if ((i + concurrency) % 100 === 0 || i + concurrency >= rows.length) {
      const pct = Math.min(100, Math.round(((i + concurrency) / rows.length) * 100))
      process.stdout.write(`\r  ${Math.min(i + concurrency, rows.length)}/${rows.length} (${pct}%) ✅${stats.succeeded} ❌${stats.failed}`)
    }
  }
  console.log()
  return { stats, failures }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
console.log(`=== Tier 2${DRY_RUN ? ' [DRY-RUN]' : ''}${LIMIT ? ` [--limit ${LIMIT}]` : ''} ===\n`)

const pgClient = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432,
  database: 'postgres', user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000', ssl: { rejectUnauthorized: false },
})
await pgClient.connect()

const { rows: allRows } = await pgClient.query(`
  SELECT v.id, v.word, v.definition_en, v.example_sentence, v.regenerated_at,
         l.level_number
  FROM curriculum_vocabulary v
  JOIN curriculum_readings r ON r.id = v.reading_id
  JOIN curriculum_units u ON u.id = r.unit_id
  JOIN curriculum_levels l ON l.id = u.level_id
  WHERE v.example_sentence ~ '[\\u0600-\\u06FF]'
    ${FORCE ? '' : 'AND v.regenerated_at IS NULL'}
  ORDER BY v.id
`)
await pgClient.end()

const toProcess = LIMIT ? allRows.slice(0, LIMIT) : allRows
console.log(`Rows with Arabic example: ${allRows.length}`)
console.log(`To process now:           ${toProcess.length}\n`)

if (DRY_RUN) {
  for (const row of toProcess.slice(0, 3)) {
    console.log(`\n"${row.word}" (L${row.level_number})`)
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

const { stats, failures } = await runBatch(toProcess)
console.log(`\nTier 2 done: ${stats.processed} processed, ${stats.succeeded} ✅, ${stats.failed} ❌`)
if (failures.length) { console.log('Failed:'); failures.slice(0,10).forEach(f => console.log(' ', f.word)) }
