// Ships «ورقة المذاكرة» — the reading study layer — DIRECT-TO-MAIN via the
// GitHub Git Trees API.
//
// The local checkout is a shared tree with other live sessions: ReadingTab.jsx
// carries 800+ lines of ANOTHER session's uncommitted work, and this branch is
// ahead of main with unshipped reading changes. Shipping the working-tree file
// would silently publish (or revert) work that isn't mine — the exact failure
// that once cost 16 days of live data.
//
// So every EDITED file below is re-derived HERE from origin/main's blob with
// only this session's hunks applied on top, and each anchor is asserted before
// the patch lands. Nothing is read from the working tree except the new files.
//
// Run:  node scripts/_ship-reading-study-sheet.cjs
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const OWNER = 'alialahmad2000'
const REPO = 'fluentia-lms'
const REPO_DIR = path.join(__dirname, '..')

// The origin/main commit these edits were derived from.
const EXPECTED_BASE = 'da8f6b4eaf493c91871739ee54ff11d61865767a'

const NEW_FILES = [
  'src/components/curriculum/reading/StudySheet.jsx',
  'supabase/migrations/20260821120000_reading_study_sheet.sql',
  'scripts/_ship-reading-study-sheet.cjs',
]

const showMain = (f) =>
  execFileSync('git', ['show', `origin/main:${f}`], { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })

/** Apply one exact-match hunk, asserting the anchor appears exactly once. */
function patch(src, file, anchor, replacement) {
  const n = src.split(anchor).length - 1
  if (n !== 1) throw new Error(`${file}: anchor matched ${n}× (expected 1):\n${anchor.slice(0, 90)}…`)
  return src.replace(anchor, replacement)
}

// ── EDITED, each derived from origin/main ────────────────────────────────────
function buildReadingTab() {
  const f = 'src/pages/student/curriculum/tabs/ReadingTab.jsx'
  let s = showMain(f)

  const imp = "import { useArticleVocabIndex } from '../../../../hooks/useArticleVocabIndex'"
  s = patch(s, f, imp, "import StudySheet from '../../../../components/curriculum/reading/StudySheet'\n" + imp)

  const anchor = '      {/* Comprehension Questions */}'
  s = patch(
    s,
    f,
    anchor,
    '      {/* «ورقة المذاكرة» — the study layer distilled from this passage.\n' +
      '          Sits between the article and the questions so the questions now test\n' +
      '          something that was actually taught. Renders nothing without content. */}\n' +
      '      {reading.study_sheet && <StudySheet sheet={reading.study_sheet} />}\n\n' +
      anchor
  )
  return { path: f, content: s }
}

function buildRichText() {
  const f = 'src/components/grammar/RichText.jsx'
  let s = showMain(f)
  const anchor =
    "/** Wrap multi-word Latin runs so RTL bidi reordering can't scramble them. */\nfunction isolateLatin(text, key) {"
  s = patch(
    s,
    f,
    anchor,
    "/** Wrap multi-word Latin runs so RTL bidi reordering can't scramble them.\n" +
      ' *  Exported because any Arabic teaching prose that quotes English needs it —\n' +
      ' *  «ورقة المذاكرة» renders its explanations as plain paragraphs, not RichText\n' +
      ' *  blocks, so it takes the isolate helper without the block/CSS machinery. */\n' +
      'export function isolateLatin(text, key) {'
  )
  return { path: f, content: s }
}

const MESSAGE = `feat(reading): «ورقة المذاكرة» — the article becomes something to study, not just read

The reading section was read → listen → answer 7 questions → a few highlighted
words. Nothing in it survived the session: the article was something a student
consumed, never something she studied, and the questions tested recall of a text
rather than anything that had been taught.

Every passage already CONTAINS a lesson — we just never surfaced it. A 128-word
A2 article about a water bottle carries sequence signposting (starts at / Next /
When / Finally), a defining relative clause ("a big building where companies
keep their stock") and cause-and-result (make the cost higher, so …). This ships
the surface that lifts that out: what a teacher says at the board once the class
finishes reading.

Each sheet holds the passage's own digest, 3 patterns (the line from the text +
the rule + the Arabic-speaker trap + model sentences + a "try it on your work"
prompt), the phrases worth stealing whole, a text map, and a check whose
questions are about the EXPLANATION — they cannot be answered by scrolling back
up to the article.

Purely ADDITIVE. The passage, the audio, WordLens, curriculum_vocabulary and the
comprehension questions are untouched; the sheet sits between the article and
the questions so those questions now test something that was taught. The check
is graded in the browser and writes NOTHING — the graded record for a reading
stays exactly what it was, so the (fragile) progress/attempt engine is not
touched by this feature at all. A reading with no sheet renders nothing, which
makes this safe on all 260 rows from the first deploy.

Content lives in curriculum_readings.study_sheet (jsonb, applied to production).

Also exports isolateLatin from the grammar RichText renderer instead of
duplicating it: every explanation here quotes English mid-sentence, and an
un-isolated multi-word Latin run gets reordered by RTL bidi — "First / Next /
After that" arrived split across lines in the wrong order before this.

Four bidi/script rules the Arabic content has to follow, each one a bug caught
by screenshotting the real component rather than trusting the markup:
  • an Arabic sentence must never END on a Latin word — the closing «.» jumps
    to the wrong side (".so" instead of "so.")
  • never glue «و» straight onto a Latin word: "وwhen" paints as "wheng"
  • no tatweel + Latin ("ـer") for the same reason — write "-er"
  • font-en, never font-['Inter'], which falls back to Times

Verified against the REAL component at 390px and 820px: 0 console errors, 0
horizontal overflow, wrong/right/order/produce states all render, and the
Arabic reads correctly with English quoted inside it.`

function gh(args, input) {
  const opts = { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  if (input !== undefined) opts.input = input
  return execFileSync('gh', args, opts)
}
const ghGet = (endpoint) => JSON.parse(gh(['api', endpoint]))
const ghPost = (endpoint, payload) =>
  JSON.parse(gh(['api', endpoint, '--method', 'POST', '--input', '-'], JSON.stringify(payload)))

function main() {
  const ref = ghGet(`repos/${OWNER}/${REPO}/git/ref/heads/main`)
  const head = ref.object.sha
  if (head !== EXPECTED_BASE) {
    throw new Error(
      `main has moved: ${head} != ${EXPECTED_BASE}\n` +
        `Re-derive the edited files from the new main before shipping — do NOT force this.`
    )
  }

  const edited = [buildReadingTab(), buildRichText()]
  for (const e of edited) {
    if (e.content === showMain(e.path)) throw new Error(`${e.path}: patch produced no change`)
  }
  for (const f of NEW_FILES) {
    if (!fs.existsSync(path.join(REPO_DIR, f))) throw new Error(`missing new file: ${f}`)
  }
  console.log(`pre-flight OK — main at ${head.slice(0, 8)}, ${edited.length} edited + ${NEW_FILES.length} new`)

  const tree = []
  for (const e of edited) {
    const blob = ghPost(`repos/${OWNER}/${REPO}/git/blobs`, { content: e.content, encoding: 'utf-8' })
    tree.push({ path: e.path, mode: '100644', type: 'blob', sha: blob.sha })
    console.log(`  blob ${blob.sha.slice(0, 8)}  ${e.path}  (derived from main)`)
  }
  for (const f of NEW_FILES) {
    const content = fs.readFileSync(path.join(REPO_DIR, f), 'utf8')
    const blob = ghPost(`repos/${OWNER}/${REPO}/git/blobs`, { content, encoding: 'utf-8' })
    tree.push({ path: f, mode: '100644', type: 'blob', sha: blob.sha })
    console.log(`  blob ${blob.sha.slice(0, 8)}  ${f}`)
  }

  const baseCommit = ghGet(`repos/${OWNER}/${REPO}/git/commits/${head}`)
  const newTree = ghPost(`repos/${OWNER}/${REPO}/git/trees`, { base_tree: baseCommit.tree.sha, tree })
  const commit = ghPost(`repos/${OWNER}/${REPO}/git/commits`, {
    message: MESSAGE,
    tree: newTree.sha,
    parents: [head],
  })
  gh([
    'api', `repos/${OWNER}/${REPO}/git/refs/heads/main`,
    '--method', 'PATCH', '-f', `sha=${commit.sha}`, '-F', 'force=false',
  ])
  console.log(`\nshipped ${commit.sha.slice(0, 8)} → main`)
}

main()
