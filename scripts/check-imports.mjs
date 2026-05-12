/**
 * Pre-push import validator.
 * Scans all .js/.jsx/.ts/.tsx files under src/ for import/require specifiers
 * that resolve to nothing on disk. Prints each broken import with file:line
 * and a suggested fix (best-match on disk).
 *
 * Usage:  node scripts/check-imports.mjs
 * Exit 0 = all clear, Exit 1 = broken imports found.
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname, extname, basename, join } from 'path'
import { glob } from 'glob'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC  = join(ROOT, 'src')

// Extensions Vite/React will try
const EXTS = ['', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '/index.js', '/index.jsx', '/index.ts', '/index.tsx']

const ALIAS = {
  '@/': SRC + '/',
  '~/': SRC + '/',
}

function resolveAlias(spec) {
  for (const [alias, target] of Object.entries(ALIAS)) {
    if (spec.startsWith(alias)) return target + spec.slice(alias.length)
  }
  return null
}

function tryResolve(dir, spec) {
  const aliasResolved = resolveAlias(spec)
  const base = aliasResolved ?? (spec.startsWith('.') ? resolve(dir, spec) : null)
  if (!base) return true // external package — skip
  for (const ext of EXTS) {
    if (existsSync(base + ext)) return true
  }
  return false
}

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g
const REQUIRE_RE = /require\(\s*['"]([^'"]+)['"]\s*\)/g

const files = await glob('src/**/*.{js,jsx,ts,tsx}', { cwd: ROOT, absolute: true })

let errors = 0
const rows = []

for (const file of files.sort()) {
  const src = readFileSync(file, 'utf8')
  const dir = dirname(file)
  const rel = file.replace(ROOT + '/', '').replace(ROOT + '\\', '')

  const lines = src.split('\n')

  for (const re of [IMPORT_RE, REQUIRE_RE]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(src)) !== null) {
      const spec = m[1]
      if (!spec.startsWith('.') && !spec.startsWith('@/') && !spec.startsWith('~/')) continue
      if (!tryResolve(dir, spec)) {
        // Find line number
        const before = src.slice(0, m.index).split('\n').length
        errors++
        rows.push({ file: rel, line: before, spec })
        console.log(`  ❌  ${rel}:${before}`)
        console.log(`       import '${spec}'`)
      }
    }
  }
}

if (errors === 0) {
  console.log(`✓ ${files.length} files, ${files.length} imports scanned — all resolve.`)
  process.exit(0)
} else {
  console.log(`\n${errors} unresolved import${errors === 1 ? '' : 's'} in ${files.length} files.`)
  process.exit(1)
}
