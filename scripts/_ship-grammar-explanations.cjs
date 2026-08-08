// Ships the grammar «الشرح» renderer fix + the personalised-track content
// restructure DIRECT-TO-MAIN via the GitHub Git Trees API.
//
// The local checkout is a shared tree with other live sessions and its HEAD is
// behind main, so it must never be git-pushed. Every EDITED file below was
// verified to be origin/main's content plus this session's edits (git diff
// origin/main showed only those hunks), and the pre-flight aborts if main has
// moved since — that is exactly the check whose absence once shipped a stale
// blob and silently reverted another session's work.
//
// Run:  node scripts/_ship-grammar-explanations.cjs
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const OWNER = 'alialahmad2000'
const REPO = 'fluentia-lms'
const REPO_DIR = path.join(__dirname, '..')

// The origin/main commit this session's edits were derived from and diffed against.
const EXPECTED_BASE = 'f28bd51407dba40057207cefa40c5cb333e6178b'

const EDITED = [
  'src/components/grammar/LessonCard.jsx',
  'src/components/grammar/CommonMistakesCard.jsx',
  'src/components/grammar/grammar.css',
  'src/components/interactive-curriculum/InteractiveGrammarTab.jsx',
]
const NEW_FILES = [
  'src/components/grammar/RichText.jsx',
  'scripts/grammar-restructure/apply.cjs',
  'scripts/grammar-restructure/content-yusra.cjs',
  'scripts/grammar-restructure/content-sara.cjs',
  'scripts/_ship-grammar-explanations.cjs',
]

const MESSAGE = `fix(grammar): «الشرح» renders structure instead of collapsing it, + restructure 18 personalised lessons

The renderer was destroying the structure authors had written:

• content_ar was rendered as a bare {string} in a <p>, so every newline
  collapsed — 38 sections of the personalised tracks (يسرا's were up to
  1,226 characters) arrived as one unbroken Arabic wall, and the two
  canonical rows that used <br> printed the tag as literal text.
• FormulaBlock rendered {section.content} as plain text, so 52 of the 106
  formula boxes on the platform showed literal <b> and <br> to students.
• .grammar-html, the class both explanation renderers hang their HTML on,
  had NO CSS anywhere in the repo — all 144 lessons use <b>/<br>/<i> and
  none of it had any rhythm or emphasis.
• .grammar-heading applied letter-spacing + uppercase, which severs Arabic.

New RichText.jsx parses both shapes (light HTML and plain-text paragraphs /
bullets) into real paragraphs, lines and lists without dangerouslySetInnerHTML,
and is bidi-aware: a mostly-Latin line inside an Arabic block renders LTR, and
multi-word Latin runs are wrapped in <bdi> with their bracket pair kept intact
so "(Reported Speech)" can no longer reorder into ")Reported Speech)".

Adds a 'table' section type for rules that ARE a mapping (backshift, tense
contrasts) — .grammar-table was already styled but nothing ever rendered it.
Wide tables scroll inside their own box, and fit without scrolling ≤460px.

Contrast: the Arabic gloss under each example and each mistake used
--text-tertiary, which measures 2.54:1 on the student's parchment theme —
under AA, on the line an Arabic reader actually reads. Now --text-secondary
at 5.30:1, 13px.

Content: يسرا's 10 lessons and سارة's 8 were each a SINGLE explanation
section with no formula, no examples and no common-mistakes card. Rebuilt to
the structure the rest of the curriculum already uses, keeping their own
analyst / service-desk context. Applied to the DB by
scripts/grammar-restructure/apply.cjs (backed up + read back, 18/18).

Verified in a real browser: all 90 grammar lessons (18 rewritten + 72
canonical) swept at 1280 and 390 — 0 raw tags, 0 unescaped entities, 0
horizontal overflow, 0 console errors.`

function gh(args, input) {
  const opts = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  if (input !== undefined) opts.input = input
  return execFileSync('gh', args, opts)
}
const ghGet = (endpoint) => JSON.parse(gh(['api', endpoint]))
const ghPost = (endpoint, payload) =>
  JSON.parse(gh(['api', endpoint, '--method', 'POST', '--input', '-'], JSON.stringify(payload)))

function main() {
  // ── Pre-flight ──────────────────────────────────────────────────────────
  const ref = ghGet(`repos/${OWNER}/${REPO}/git/ref/heads/main`)
  const head = ref.object.sha
  if (head !== EXPECTED_BASE) {
    throw new Error(
      `main has moved: ${head} != ${EXPECTED_BASE}\n` +
        `Re-derive the edited files from the new main before shipping — do NOT force this.`
    )
  }
  for (const f of EDITED) {
    const local = path.join(REPO_DIR, f)
    if (!fs.existsSync(local)) throw new Error(`missing edited file: ${f}`)
    const onMain = execFileSync('git', ['show', `origin/main:${f}`], { cwd: REPO_DIR, encoding: 'utf8' })
    if (onMain === fs.readFileSync(local, 'utf8')) throw new Error(`${f} is identical to main — nothing to ship`)
  }
  for (const f of NEW_FILES) {
    if (!fs.existsSync(path.join(REPO_DIR, f))) throw new Error(`missing new file: ${f}`)
  }
  console.log(`pre-flight OK — main at ${head.slice(0, 8)}, ${EDITED.length} edited + ${NEW_FILES.length} new`)

  // ── Blobs ───────────────────────────────────────────────────────────────
  const tree = []
  for (const f of [...EDITED, ...NEW_FILES]) {
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
