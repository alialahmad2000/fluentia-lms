// Retones «ورقة المذاكرة» and the reading tab's section chrome onto the --ds-*
// token layer, DIRECT-TO-MAIN via the GitHub Git Trees API.
//
// The three component files are shipped whole from the working tree; each one's
// preserved (non-colour) region was asserted byte-identical to origin/main
// before this ran. CLAUDE.md is re-derived HERE from origin/main because the
// local copy carries other sessions' uncommitted edits.
//
// Run:  node scripts/_ship-study-sheet-palette.cjs
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const OWNER = 'alialahmad2000'
const REPO = 'fluentia-lms'
const REPO_DIR = path.join(__dirname, '..')

const FILES = [
  'src/components/curriculum/reading/StudySheet.jsx',
  'src/components/curriculum/SectionBand.jsx',
  'src/components/curriculum/SectionJumper.jsx',
  'scripts/_ship-study-sheet-palette.cjs',
]

const showMain = (f) =>
  execFileSync('git', ['show', `origin/main:${f}`], { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })

const ENTRY = `### 2026-08-21 (later 2) — READING: «ورقة المذاكرة» stops fighting the theme — the whole section moves onto the token layer
- Owner on the live reading tab: *"I didn't like the colors of the backgrounds and so on."* He was right, and the cause was not taste — the sheet was painted outside the design system entirely.
- **Root cause: cold neutrals lit by a warm accent.** The reading tab runs on the \`--ds-*\` token layer, and in the student's default theme that layer is WARM — ground \`#0b0f18\`, cream ink \`#faf5e6\`, one gold accent \`#e9b949\`. The study sheet was built from raw Tailwind instead: **cold slate** neutrals (\`slate-900/40\`, \`slate-800/70\`, \`text-slate-300\`, \`text-white\`), a **SECOND gold** (\`amber-500\` \`#f59e0b\`) sitting beside the theme's own gold, and a **sky-blue** check block. Its body was \`linear-gradient(160deg, rgba(251,191,36,.055), rgba(15,23,42,.5))\` — amber over cold navy, which composites to exactly the muddy brown in his screenshot. The section chrome had the same disease: SectionBand's default seam was cold slate \`rgba(148,163,184,.14)\` and its feature seam a third amber, and SectionJumper's active chip was **sky-blue** — a second accent hue dropped into a section whose entire palette is one gold.
- **Fix: every colour in all three files is now a token** with the same fallback the article card already uses, so the sheet inherits the student's theme instead of fighting it. Two rules held throughout: elevation moves toward the **light** (a card darker than the surface under it is the single thing that makes a dark UI look unfinished — the same defect that scored the STEP pass 4.0/10), and there is **ONE accent** — a block that is a different KIND of thing is separated by MATERIAL (raised warm glass + a dashed rule), never by a second hue. The sheet now sits under the same \`--ds-accent-wash\` crown bloom and \`--ds-accent-rule\` hairline as the passage card, so the two read as one document.
- **Two real defects caught in the loop, not after:** the MCQ options and the word-bank chips had only a \`rgba(255,255,255,.06)\` hairline and no fill, so the section's main interactive control read as plain text rather than a button; and «تحقّقي» — the one primary action in the card — was gold text on a gold wash inside a gold border. Options got a surface; «تحقّقي» became the solid accent with inverse ink, matching the article card's own controls.
- **This also silently repaired the other two themes.** Because the sheet is now tokenised, it was rendered under all three: \`night\` (warm gold, the student default), \`aurora-cinematic\` (correctly becomes cool navy/sky) and \`minimal\` (light — dark ink on white). The old hardcoded version would have painted cream-on-white there, i.e. invisible.
- **⚠️ Note for the next session — the working tree's \`src/design-system/themes.css\` is NOT what production serves.** The local copy carries a PARCHMENT token set (\`--ds-bg-base: #E9DFCF\`, ink \`#262019\`, teal accent \`#14504A\`) from another session's WIP; \`origin/main\` is the warm night set. Verification screenshots taken against the local file would be a lie, so the harness imported \`origin/main\`'s themes.css last. Left untouched per the shared-tree rule.
- **Also worth knowing:** \`--ds-accent-rule\` and \`--ds-accent-wash\` are **defined in no theme block** — they always resolve to their inline fallbacks, so they stay gold even under \`aurora-cinematic\`. That is pre-existing (the passage card, STEP and IELTS all rely on the same fallbacks) and was deliberately NOT changed here, since defining them per-theme would restyle those surfaces too.
- Verified against the REAL components and a REAL production \`study_sheet\` row (3 patterns, 8 phrases, a 6-node map, and all three check types — mcq, order, produce) in a throwaway Vite harness, since \`src/App.jsx\` still cannot boot in this shared tree. Desktop 1440 + iPhone 390, plus the answered state (correct, wrong, verdict, model answer): **0 console errors, 0 horizontal overflow.** Harness deleted. Behaviour asserted unchanged — 56/56 markers (renderAr + the LONE_TAIL bidi fix, markParts, the IntersectionObserver scroll-spy, the measured rail height, the 44px coarse-pointer floor, every content key) still present.
- Files: \`src/components/curriculum/reading/StudySheet.jsx\`, \`src/components/curriculum/SectionBand.jsx\`, \`src/components/curriculum/SectionJumper.jsx\`. DB: none. Edge functions: none.

`

function buildClaudeMd() {
  const f = 'CLAUDE.md'
  const s = showMain(f)
  const anchor = '## CHANGE LOG (Claude Code: update this after EVERY task — newest first)\n\n'
  const n = s.split(anchor).length - 1
  if (n !== 1) throw new Error(`CLAUDE.md: changelog anchor matched ${n}× (expected 1)`)
  return { path: f, content: s.replace(anchor, anchor + ENTRY) }
}

const MESSAGE = `fix(reading): the study sheet stops fighting the theme — section moves onto the --ds-* token layer

Owner on the live reading tab: "I didn't like the colors of the backgrounds and
so on." He was right, and the cause was not taste — the sheet was painted
outside the design system entirely.

The reading tab runs on the --ds-* token layer, and in the student's default
theme that layer is WARM: ground #0b0f18, cream ink #faf5e6, one gold accent
#e9b949. The study sheet was built from raw Tailwind instead — cold slate
neutrals (slate-900/40, slate-800/70, text-slate-300, text-white), a SECOND gold
(amber-500 #f59e0b) beside the theme's own, and a sky-blue check block. Its body
was linear-gradient(160deg, rgba(251,191,36,.055), rgba(15,23,42,.5)): amber over
cold navy, which composites to exactly the muddy brown in the screenshot. Cold
neutrals lit by a warm accent is the whole bug.

The chrome had the same disease — SectionBand's default seam was cold slate and
its feature seam a third amber; SectionJumper's active chip was sky-blue, a
second accent hue in a section whose entire palette is one gold.

Every colour in all three files is now a token with the same fallback the
article card already uses, so the sheet inherits the student's theme instead of
fighting it. Two rules held throughout:
  • elevation moves toward the LIGHT — a card darker than the surface under it
    is the single thing that makes a dark UI look unfinished.
  • ONE accent. A block that is a different KIND of thing is separated by
    MATERIAL (raised warm glass + a dashed rule), never by a second hue.
The sheet now sits under the same --ds-accent-wash crown and --ds-accent-rule
hairline as the passage card, so the two read as one document.

Two real defects caught in the loop rather than after it: the MCQ options and
the word-bank chips had only a hairline and no fill, so the section's main
interactive control read as plain text rather than a button; and «تحقّقي» — the
one primary action in the card — was gold text on a gold wash inside a gold
border. Options got a surface; «تحقّقي» became the solid accent with inverse ink.

This also silently repaired the other two themes. Rendered under all three:
night (warm gold, the student default), aurora-cinematic (correctly becomes cool
navy/sky) and minimal (light — dark ink on white). The old hardcoded version
would have painted cream-on-white there, i.e. invisible.

Verified against the real components and a REAL production study_sheet row (3
patterns, 8 phrases, a 6-node map, all three check types) in a throwaway harness,
at 1440 and 390 plus the answered state: 0 console errors, 0 horizontal overflow.
Behaviour asserted unchanged — 56/56 markers still present, including the
LONE_TAIL bidi fix, the scroll-spy and the measured 44px rail.

NOTE: the working tree's src/design-system/themes.css is NOT what production
serves (it carries another session's parchment token set), so the harness
imported origin/main's copy. Left untouched per the shared-tree rule.`

function gh(args, input) {
  const opts = { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  if (input !== undefined) opts.input = input
  return execFileSync('gh', args, opts)
}
const ghGet = (e) => JSON.parse(gh(['api', e]))
const ghPost = (e, p) => JSON.parse(gh(['api', e, '--method', 'POST', '--input', '-'], JSON.stringify(p)))

function main() {
  const head = ghGet(`repos/${OWNER}/${REPO}/git/ref/heads/main`).object.sha

  const derived = [buildClaudeMd()]
  for (const e of derived) {
    if (e.content === showMain(e.path)) throw new Error(`${e.path}: patch produced no change`)
  }
  // Every shipped component must actually differ from main, and must still
  // carry its behavioural core.
  for (const f of FILES) {
    const p = path.join(REPO_DIR, f)
    if (!fs.existsSync(p)) throw new Error(`missing file: ${f}`)
  }
  for (const f of FILES.filter((x) => x.startsWith('src/'))) {
    const local = fs.readFileSync(path.join(REPO_DIR, f), 'utf8')
    if (local === showMain(f)) throw new Error(`${f}: identical to main — nothing to ship`)
    if (/\b(slate|amber|sky|rose|emerald)-[0-9]{2,3}\b/.test(local.replace(/^\/\/.*$/gm, ''))) {
      throw new Error(`${f}: a raw Tailwind colour literal survived outside comments`)
    }
  }
  console.log(`pre-flight OK — main at ${head.slice(0, 8)}`)

  const tree = []
  for (const e of derived) {
    const blob = ghPost(`repos/${OWNER}/${REPO}/git/blobs`, { content: e.content, encoding: 'utf-8' })
    tree.push({ path: e.path, mode: '100644', type: 'blob', sha: blob.sha })
    console.log(`  blob ${blob.sha.slice(0, 8)}  ${e.path}  (derived from main)`)
  }
  for (const f of FILES) {
    const blob = ghPost(`repos/${OWNER}/${REPO}/git/blobs`, { content: fs.readFileSync(path.join(REPO_DIR, f), 'utf8'), encoding: 'utf-8' })
    tree.push({ path: f, mode: '100644', type: 'blob', sha: blob.sha })
    console.log(`  blob ${blob.sha.slice(0, 8)}  ${f}`)
  }
  const base = ghGet(`repos/${OWNER}/${REPO}/git/commits/${head}`)
  const newTree = ghPost(`repos/${OWNER}/${REPO}/git/trees`, { base_tree: base.tree.sha, tree })
  const commit = ghPost(`repos/${OWNER}/${REPO}/git/commits`, { message: MESSAGE, tree: newTree.sha, parents: [head] })
  gh(['api', `repos/${OWNER}/${REPO}/git/refs/heads/main`, '--method', 'PATCH', '-f', `sha=${commit.sha}`, '-F', 'force=false'])
  console.log(`\nshipped ${commit.sha.slice(0, 8)} → main`)
}

main()
