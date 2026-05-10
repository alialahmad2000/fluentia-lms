// Tier 1 — Duplicate vocabulary consolidation
// Hard-deletes non-protected duplicate rows. Snapshot must exist before running.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')

function readEnv() {
  const raw = readFileSync(join(ROOT, '.env'), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}
const ENV  = readEnv()
const db   = createClient(ENV['VITE_SUPABASE_URL'], ENV['SUPABASE_SERVICE_ROLE_KEY'])
const results = JSON.parse(readFileSync(join(ROOT, 'docs/audits/vocab/investigation-results.json'), 'utf8'))
const DRY_RUN = process.argv.includes('--dry-run')

const toDelete = results.tier1.ids_to_delete
console.log(`Tier 1 — ${DRY_RUN ? '[DRY-RUN] ' : ''}Hard-deleting ${toDelete.length} duplicate rows\n`)

if (DRY_RUN) {
  console.log('Sample deletions (first 10):')
  toDelete.slice(0, 10).forEach((id, i) => console.log(`  ${i+1}. ${id}`))
  console.log(`\n[DRY-RUN] Would delete ${toDelete.length} rows. No writes made.`)
  process.exit(0)
}

// Hard delete in batches of 100
let deleted = 0
const BATCH = 100
for (let i = 0; i < toDelete.length; i += BATCH) {
  const batch = toDelete.slice(i, i + BATCH)
  const { error, data } = await db
    .from('curriculum_vocabulary')
    .delete()
    .in('id', batch)
    .select('id')
  if (error) { console.error(`Batch ${i} failed:`, error.message); process.exit(1) }
  deleted += (data?.length || 0)
  if ((i + BATCH) % 500 === 0 || i + BATCH >= toDelete.length) {
    console.log(`  Deleted ${deleted}/${toDelete.length}...`)
  }
}

console.log(`\n✅ Tier 1 complete: deleted ${deleted} rows`)
