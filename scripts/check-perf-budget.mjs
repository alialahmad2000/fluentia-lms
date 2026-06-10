// Performance budget gate — fails the build when the initial JS payload grows
// past budget. Run AFTER `vite build` (npm run build:check).
//
// Budgets were set on 2026-06-11 at (optimized size + ~15% headroom):
//   entry chunk 443 kB → budget 510 kB
//   total initial JS (entry + modulepreloaded vendors) 955 kB → budget 1100 kB
// Raising a budget must be a DELIBERATE decision recorded in
// PERF-AUDIT-FINDINGS.md — never bump it just to make CI green.
// History this protects against: the unit-page chunk silently reaching 737 kB
// because one namespace import defeated tree-shaking.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BUDGET_ENTRY_KB = 510
const BUDGET_INITIAL_KB = 1100
// any single lazy chunk beyond this is almost certainly an import accident
const BUDGET_MAX_CHUNK_KB = 600

const dist = 'dist'
const assetsDir = join(dist, 'assets')
const html = readFileSync(join(dist, 'index.html'), 'utf8')

// initial JS = the entry <script src> + every <link rel="modulepreload">
const initialFiles = [
  ...html.matchAll(/<script[^>]+src="\/assets\/([^"]+\.js)"/g),
  ...html.matchAll(/<link rel="modulepreload"[^>]+href="\/assets\/([^"]+\.js)"/g),
].map((m) => m[1])

if (initialFiles.length === 0) {
  console.error('perf-budget: could not find initial scripts in dist/index.html — did the build change shape?')
  process.exit(1)
}

const kb = (f) => statSync(join(assetsDir, f)).size / 1024
const entryFile = initialFiles.find((f) => f.startsWith('index-'))
const entryKb = kb(entryFile)
const initialKb = initialFiles.reduce((sum, f) => sum + kb(f), 0)

const allChunks = readdirSync(assetsDir).filter((f) => f.endsWith('.js'))
const oversized = allChunks
  .map((f) => ({ f, kb: kb(f) }))
  .filter((c) => c.kb > BUDGET_MAX_CHUNK_KB)

console.log(`perf-budget: entry ${entryKb.toFixed(0)} kB (budget ${BUDGET_ENTRY_KB})`)
console.log(`perf-budget: initial JS total ${initialKb.toFixed(0)} kB across ${initialFiles.length} files (budget ${BUDGET_INITIAL_KB})`)

let failed = false
if (entryKb > BUDGET_ENTRY_KB) {
  console.error(`✗ entry chunk ${entryKb.toFixed(0)} kB exceeds ${BUDGET_ENTRY_KB} kB budget`)
  failed = true
}
if (initialKb > BUDGET_INITIAL_KB) {
  console.error(`✗ initial JS ${initialKb.toFixed(0)} kB exceeds ${BUDGET_INITIAL_KB} kB budget`)
  failed = true
}
for (const c of oversized) {
  console.error(`✗ chunk ${c.f} is ${c.kb.toFixed(0)} kB (> ${BUDGET_MAX_CHUNK_KB} kB) — check for a tree-shaking-defeating import`)
  failed = true
}

if (failed) {
  console.error('perf-budget: FAILED — see PERF-AUDIT-FINDINGS.md before raising any budget')
  process.exit(1)
}
console.log('perf-budget: OK')
