// The reading tab's sticky chrome must clear EVERYTHING above the content, not
// just the header — DIRECT-TO-MAIN via the Trees API.
//
// The owner hit this while impersonating: the jump rail slid underneath the
// header and was clipped. --header-height is the header's OWN height and knows
// nothing about what sits above it, so the rail was short by exactly the 44px
// impersonation banner. The header itself already gets this right
// (top: var(--impersonation-banner-height)), and so does the chat shell.
//
// For a real student --impersonation-banner-height is 0px, so every value below
// resolves to exactly what shipped before. Students were never affected.
//
// Run:  node scripts/_ship-sticky-banner-offset.cjs
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const OWNER = 'alialahmad2000'
const REPO = 'fluentia-lms'
const REPO_DIR = path.join(__dirname, '..')
const NEW_FILES = [
  'src/components/curriculum/SectionJumper.jsx',
  'src/components/curriculum/SectionBand.jsx',
  'scripts/_ship-sticky-banner-offset.cjs',
]
const OFFSET = 'calc(var(--impersonation-banner-height, 0px) + var(--header-height, 64px))'

const showMain = (f) =>
  execFileSync('git', ['show', `origin/main:${f}`], { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })

function patch(src, file, anchor, replacement) {
  const n = src.split(anchor).length - 1
  if (n !== 1) throw new Error(`${file}: anchor matched ${n}× (expected 1)`)
  return src.replace(anchor, replacement)
}

function buildReadingTab() {
  const f = 'src/pages/student/curriculum/tabs/ReadingTab.jsx'
  let s = showMain(f)

  s = patch(s, f,
    `      <div className="sticky z-rise -mx-4 px-4 pb-2" style={{ top: 'var(--header-height, 64px)' }}>`,
    `      {/* Sticks below EVERYTHING above the content. --header-height is the
          header's own height and knows nothing about what sits on top of it, so
          offsetting by it alone put this rail underneath the header whenever the
          impersonation banner was showing. 0px for a real student. */}
      <div className="sticky z-rise -mx-4 px-4 pb-2" style={{ top: '${OFFSET}' }}>`)

  s = patch(s, f,
    `        <div id="sec-contract" className="scroll-mt-[132px]">`,
    `        <div id="sec-contract" style={{ scrollMarginTop: '${OFFSET.slice(0, -1)} + 68px)' }}>`)

  return { path: f, content: s }
}

const ENTRY = `### 2026-08-22 (later) — READING: the sticky jump rail clears the impersonation banner too
- Owner, viewing a student's account: the sticky bar at the top of the reading section was **clipped and sliding under the header**, and he asked whether this hits students or only staff impersonating.
- **It is impersonation-only, and students were never affected.** \`--impersonation-banner-height\` is \`0px\` for a real student, so every offset below resolves to exactly what shipped before. Confirmed in \`LayoutShell\`, which sets that variable to \`44px\` only while impersonating.
- **Root cause, and it was mine.** \`--header-height\` is the header element's **own height** (\`SidebarMetricsObserver\` reads \`getBoundingClientRect().height\`) and knows nothing about what sits above it. The header itself already handles this correctly — it sticks at \`top: var(--impersonation-banner-height)\` — and the chat shell composes \`sat + banner + header\`. The jump rail I shipped offset by \`var(--header-height)\` **alone**, so with the 44px banner showing it stuck 44px too high, i.e. underneath the header. A repo-wide sweep found exactly **two** consumers of \`var(--header-height\` for a sticky offset: the chat shell (already correct) and this one.
- Three offsets corrected, all in code from this week: the reading tab's sticky container, \`SectionBand\`'s scroll anchor (a hardcoded \`scroll-mt-[132px]\`, also a banner's height wrong), and \`SectionJumper\`'s measured \`chrome()\`, which drives where every jump lands.
- Verified by computing the resolved values in a browser with the banner variable at both \`0px\` and \`44px\`: sticky top **64 → 108**, scroll margin **132 → 176**, and the rail's measured jump chrome **~120 → ~164**. Student path byte-identical.
- Files: \`src/pages/student/curriculum/tabs/ReadingTab.jsx\`, \`src/components/curriculum/SectionJumper.jsx\`, \`src/components/curriculum/SectionBand.jsx\`. DB: none.

`

function buildClaudeMd() {
  const f = 'CLAUDE.md'
  const a = '## CHANGE LOG (Claude Code: update this after EVERY task — newest first)\n\n'
  return { path: f, content: patch(showMain(f), f, a, a + ENTRY) }
}

const MESSAGE = `fix(reading): the sticky jump rail clears the impersonation banner too

The owner hit this while viewing a student's account: the sticky bar at the top
of the reading section was clipped and sliding under the header.

It is impersonation-only — --impersonation-banner-height is 0px for a real
student, so students were never affected and every offset below resolves to
exactly what shipped before.

Root cause: --header-height is the header element's OWN height
(SidebarMetricsObserver reads getBoundingClientRect().height) and knows nothing
about what sits above it. The header already handles this correctly — it sticks
at top: var(--impersonation-banner-height) — and the chat shell composes
sat + banner + header. The jump rail offset by var(--header-height) alone, so
with the 44px banner showing it stuck 44px too high: underneath the header.

A sweep found exactly two consumers of var(--header-height for a sticky offset:
the chat shell (already correct) and this one.

Three offsets corrected: the reading tab's sticky container, SectionBand's
scroll anchor (a hardcoded scroll-mt-[132px], also a banner's height wrong), and
SectionJumper's measured chrome(), which decides where every jump lands.

Verified by resolving the values in a browser at both 0px and 44px: sticky top
64 -> 108, scroll margin 132 -> 176, jump chrome ~120 -> ~164.`

function gh(a, i) {
  const o = { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  if (i !== undefined) o.input = i
  return execFileSync('gh', a, o)
}
const ghGet = (e) => JSON.parse(gh(['api', e]))
const ghPost = (e, p) => JSON.parse(gh(['api', e, '--method', 'POST', '--input', '-'], JSON.stringify(p)))

function main() {
  const head = ghGet(`repos/${OWNER}/${REPO}/git/ref/heads/main`).object.sha
  const edited = [buildReadingTab(), buildClaudeMd()]
  for (const e of edited) if (e.content === showMain(e.path)) throw new Error(`${e.path}: no change`)
  for (const f of NEW_FILES) {
    const local = fs.readFileSync(path.join(REPO_DIR, f), 'utf8')
    if (f.endsWith('.jsx') && local === showMain(f)) throw new Error(`${f}: identical to main`)
    if (f.endsWith('.jsx') && !local.includes('impersonation-banner-height'))
      throw new Error(`${f}: banner offset missing`)
  }
  if ((edited[0].content.split('impersonation-banner-height').length - 1) < 2)
    throw new Error('ReadingTab: expected both offsets patched')
  console.log(`pre-flight OK — main at ${head.slice(0, 8)}`)

  const tree = []
  for (const e of edited) {
    const b = ghPost(`repos/${OWNER}/${REPO}/git/blobs`, { content: e.content, encoding: 'utf-8' })
    tree.push({ path: e.path, mode: '100644', type: 'blob', sha: b.sha })
    console.log(`  blob ${b.sha.slice(0, 8)}  ${e.path}  (derived from main)`)
  }
  for (const f of NEW_FILES) {
    const b = ghPost(`repos/${OWNER}/${REPO}/git/blobs`, { content: fs.readFileSync(path.join(REPO_DIR, f), 'utf8'), encoding: 'utf-8' })
    tree.push({ path: f, mode: '100644', type: 'blob', sha: b.sha })
    console.log(`  blob ${b.sha.slice(0, 8)}  ${f}`)
  }
  const base = ghGet(`repos/${OWNER}/${REPO}/git/commits/${head}`)
  const nt = ghPost(`repos/${OWNER}/${REPO}/git/trees`, { base_tree: base.tree.sha, tree })
  const c = ghPost(`repos/${OWNER}/${REPO}/git/commits`, { message: MESSAGE, tree: nt.sha, parents: [head] })
  gh(['api', `repos/${OWNER}/${REPO}/git/refs/heads/main`, '--method', 'PATCH', '-f', `sha=${c.sha}`, '-F', 'force=false'])
  console.log(`\nshipped ${c.sha.slice(0, 8)} → main`)
}
if (process.env.DRY) { fs.writeFileSync('/tmp/rt-offset.jsx', buildReadingTab().content); console.log('DRY ok') }
else main()
