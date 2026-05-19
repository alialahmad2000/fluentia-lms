#!/usr/bin/env node
/**
 * Codemod: bare `const { … } = useAuthStore()` → typed selectors / useShallow.
 *
 * - Single-field: swap to typed selector hook.
 * - Multi-field:  wrap in useAuthStore(useShallow((s) => ({ … }))) — one
 *                 subscription with shallow equality on the projected object.
 *
 * Imports are adjusted per-file:
 * - typed-selector imports appended to the existing `from '.../authStore'` import
 * - `useShallow` imported from `zustand/react/shallow` if needed
 * - `useAuthStore` import removed if no bare useAuthStore() call survives in
 *   the file (i.e. all destructures became typed selectors and no
 *   `useAuthStore((s) => …)` selector-pattern call exists in the file)
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const PROJECT_ROOT = path.resolve(__dirname, '..')

// Field name → typed selector hook for single-field swaps
const SINGLE_FIELD_HOOKS = {
  profile: 'useAuthProfile',
  user: 'useAuthUser',
  studentData: 'useAuthStudentData',
  trainerData: 'useAuthTrainerData',
  loading: 'useAuthLoading',
  impersonation: 'useAuthImpersonation',
}

// Pattern: `const { … } = useAuthStore()` on a single line (possibly with surrounding whitespace).
// Capture groups: 1 = leading whitespace, 2 = destructure body
const DESTRUCTURE_RX = /^([ \t]*)const\s*\{([^}]+)\}\s*=\s*useAuthStore\(\)\s*;?\s*$/

function parseFields(destructureBody) {
  return destructureBody
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const [src, alias] = part.split(':').map((s) => s.trim())
      return { src, alias: alias || src }
    })
}

function buildShallowReplacement(indent, fields) {
  const projection = fields.map((f) => `${f.src}: s.${f.src}`).join(', ')
  const destructure = fields
    .map((f) => (f.alias === f.src ? f.src : `${f.src}: ${f.alias}`))
    .join(', ')
  return `${indent}const { ${destructure} } = useAuthStore(useShallow((s) => ({ ${projection} })))`
}

function rewriteFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8')
  const lines = src.split('\n')

  let changedAny = false
  const usedSelectors = new Set()
  let usedShallow = false

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(DESTRUCTURE_RX)
    if (!m) continue
    const indent = m[1]
    const body = m[2]
    const fields = parseFields(body)
    if (fields.length === 0) continue

    if (fields.length === 1) {
      const { src: srcName, alias } = fields[0]
      const hook = SINGLE_FIELD_HOOKS[srcName]
      if (!hook) continue // unknown field — skip
      lines[i] = `${indent}const ${alias} = ${hook}()`
      usedSelectors.add(hook)
      changedAny = true
    } else {
      lines[i] = buildShallowReplacement(indent, fields)
      usedShallow = true
      changedAny = true
    }
  }

  if (!changedAny) return { filePath, changed: false }

  let out = lines.join('\n')

  // Manage imports
  // 1) Add typed selectors to the existing authStore import.
  if (usedSelectors.size > 0) {
    const importRx = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]*authStore)['"]/
    const im = out.match(importRx)
    if (im) {
      const existing = im[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const needed = new Set([...existing, ...usedSelectors])
      // After codemod, check whether useAuthStore is still referenced in the file
      // (selector-pattern call `useAuthStore((s) =>`, getState, or any bare ref
      // beyond what we just rewrote).
      const stillReferencesUseAuthStore =
        /useAuthStore\(\(?s/.test(out) ||
        /useAuthStore\.getState/.test(out) ||
        /useAuthStore\(useShallow/.test(out)
      if (!stillReferencesUseAuthStore) {
        needed.delete('useAuthStore')
      }
      const merged = [...needed].sort().join(', ')
      out = out.replace(importRx, `import { ${merged} } from '${im[2]}'`)
    } else {
      console.warn(`[WARN] ${filePath} — could not find authStore import to patch`)
    }
  }

  // 2) Add useShallow import if a multi-field rewrite happened.
  if (usedShallow && !/from\s*['"]zustand\/react\/shallow['"]/.test(out)) {
    // Insert after the first import line
    const firstImportEnd = out.indexOf('\n', out.indexOf('import '))
    if (firstImportEnd !== -1) {
      out =
        out.slice(0, firstImportEnd + 1) +
        `import { useShallow } from 'zustand/react/shallow'\n` +
        out.slice(firstImportEnd + 1)
    }
  }

  fs.writeFileSync(filePath, out)
  return {
    filePath,
    changed: true,
    selectorsAdded: [...usedSelectors],
    usedShallow,
  }
}

// Discover candidate files
const grepOut = execSync(
  `grep -rl "useAuthStore(" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" || true`,
  { cwd: PROJECT_ROOT, encoding: 'utf8' }
)
const allFiles = grepOut
  .split('\n')
  .filter(Boolean)
  .filter((f) => !f.includes('src/stores/authStore'))

const results = []
for (const rel of allFiles) {
  const abs = path.join(PROJECT_ROOT, rel)
  try {
    const r = rewriteFile(abs)
    if (r.changed) results.push(r)
  } catch (e) {
    console.error(`[ERROR] ${rel}: ${e.message}`)
  }
}

console.log(`Files changed: ${results.length}`)
for (const r of results) {
  console.log(
    `  ${r.filePath.replace(PROJECT_ROOT + '/', '')} — selectors:[${r.selectorsAdded.join(',')}] shallow:${r.usedShallow}`
  )
}
