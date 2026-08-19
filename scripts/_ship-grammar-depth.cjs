// Ships the grammar depth layer («شرح أعمق») + the examination-mechanics fixes
// DIRECT-TO-MAIN via the GitHub Git Trees API.
//
// This local checkout is a SHARED tree and is far behind main, so its copies of
// untouched files are stale. Every EDITED file below was re-derived from
// origin/main with asserted anchors — an earlier draft of this change would
// have reverted `useEffectiveStudentId` (the impersonation fix), the VerdictPanel
// wiring, an improved accepted_answers guard, and another session's
// CommonMistakesCard rewrite. The pre-flight below re-checks main and refuses to
// ship if it moved.
//
// Run:  node scripts/_ship-grammar-depth.cjs
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const OWNER = 'alialahmad2000'
const REPO = 'fluentia-lms'
const REPO_DIR = path.join(__dirname, '..')
const EXPECTED_BASE = '138bc70a39d340632b0fbbc3c43cdaf347269908'

const EDITED = [
  'src/components/grammar/LessonCard.jsx',
  'src/components/grammar/ExerciseCard.jsx',
  'src/components/grammar/ExerciseSection.jsx',
  'src/components/grammar/exercise-types/MCQQuestion.jsx',
  'src/pages/student/curriculum/tabs/GrammarTab.jsx',
]
const NEW_FILES = [
  'src/components/grammar/GrammarSections.jsx',
  'src/components/grammar/DeepPanel.jsx',
  'scripts/grammar-depth/paradigms.cjs',
  'scripts/grammar-depth/spelling.cjs',
  'scripts/grammar-depth/contrasts.cjs',
  'scripts/grammar-depth/map.cjs',
  'scripts/grammar-depth/generate.cjs',
  'scripts/grammar-depth/difficulty.cjs',
  'scripts/_ship-grammar-depth.cjs',
]

const MESSAGE = `feat(grammar): «شرح أعمق» — the depth layer, + the examination mechanics

The explanation answered WHAT the rule is and WHEN to use it, then stopped.
Measured across all 154 lessons: the negative form appeared in 33% of standard
lessons, the question form in 24%, short answers in 0%, spelling changes in 1%,
and a contrast with the structure students actually confuse it with in 14%.
The standard-curriculum Arabic explanation averaged 142 characters — about 25
words — and 94% of them were under 200. That is a reference card, not a lesson,
which is why a student can finish a unit and still not feel sure.

TIER 2 — a collapsed «شرح أعمق» panel under the explanation, so the lesson stays
short for the student who understood it and opens for the one who did not.
127 of 154 lessons now carry one, averaging 7.3 sections.

Built to cost nothing to run: most of what was missing is SYSTEMATIC, so instead
of authoring 154 forms tables there are 31 form paradigms, 6 spelling rule sets
and 28 contrast cards, mapped onto lessons and generated. Zero API calls, and
regenerating the whole curriculum is one script run.
  • forms table (مثبت / منفي / سؤال / إجابة قصيرة) — 116 lessons
  • spelling and form-change rules — attached by paradigm
  • contrast card + a quick decision test — 97 lessons (was 14%)
An empty paradigm is a deliberate answer: prepositions, discourse markers and
register have no verb paradigm, and generating a forms table for them would be
fabricated teaching content.

EXAMINATION MECHANICS
  • MCQ options were never shuffled and the generator always wrote the answer
    first: 74.6% of four-option items and 68% of three-option ones kept it in
    slot A. Always tapping the first choice scored ~72% of the multiple-choice
    third of the bank. Seeded shuffle (stable per question, graded by TEXT not
    index) takes position A from 72.1% to 28.9%, measured over all 987 items.
    Reading got this fix in e41544d4 and listening in the 2026-06-08 pass;
    grammar was never swept.
  • Difficulty: ZERO of 2,356 items carried a tier. All now do (1-5, spread
    7/37/28/16/12%), derived from task type + CEFR + stem length, and tier 5 is
    flagged 🔥 rather than silently numbered.
  • Hints: reading and listening carry them on 1,656 questions, grammar on none.
    Rather than author 2,356, «تلميح» surfaces the paradigm's golden rule from
    the depth layer — points at the rule, never reveals the answer, hidden once
    she has answered, and fires the same question_hint_opened event so grammar
    stops being invisible in the analytics.

Section renderers moved to GrammarSections so the explanation and the depth
panel share ONE implementation and cannot drift.

Verified in a real browser, not asserted: all 127 depth panels opened at 1280
and 390 — 0 raw tags, 0 unescaped entities, 0 horizontal overflow, 0 console
errors — plus the exercise card with its hint, badge and shuffled options.
Every shipped file was re-verified to compile against a clean checkout of main.

DB: curriculum_grammar.deep_content / paradigm_id / deep_generated_at (127 rows),
and difficulty on all 2,356 exercise items.`

function gh(args, input) {
  const opts = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  if (input !== undefined) opts.input = input
  return execFileSync('gh', args, opts)
}
const ghGet = (e) => JSON.parse(gh(['api', e]))
const ghPost = (e, p) => JSON.parse(gh(['api', e, '--method', 'POST', '--input', '-'], JSON.stringify(p)))

function main() {
  const head = ghGet(`repos/${OWNER}/${REPO}/git/ref/heads/main`).object.sha
  if (head !== EXPECTED_BASE) {
    throw new Error(`main moved: ${head} != ${EXPECTED_BASE}\nRe-derive the edited files from the new main — do NOT force.`)
  }
  for (const f of EDITED) {
    const local = path.join(REPO_DIR, f)
    if (!fs.existsSync(local)) throw new Error(`missing: ${f}`)
    const onMain = execFileSync('git', ['show', `origin/main:${f}`], { cwd: REPO_DIR, encoding: 'utf8' })
    if (onMain === fs.readFileSync(local, 'utf8')) throw new Error(`${f} is identical to main — nothing to ship`)
  }
  for (const f of NEW_FILES) if (!fs.existsSync(path.join(REPO_DIR, f))) throw new Error(`missing new file: ${f}`)
  console.log(`pre-flight OK — main at ${head.slice(0, 8)}, ${EDITED.length} edited + ${NEW_FILES.length} new`)

  const tree = []
  for (const f of [...EDITED, ...NEW_FILES]) {
    const content = fs.readFileSync(path.join(REPO_DIR, f), 'utf8')
    const blob = ghPost(`repos/${OWNER}/${REPO}/git/blobs`, { content, encoding: 'utf-8' })
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
