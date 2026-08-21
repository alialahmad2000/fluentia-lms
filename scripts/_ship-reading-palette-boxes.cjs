// Second half of the reading-section palette pass: the three info cards that sit
// beside «ورقة المذاكرة», plus the shared question-card ground.
//
// ReadingTab.jsx and questionCards.css are BOTH re-derived here from origin/main,
// because this working tree carries other sessions' uncommitted edits to the
// reading area (it is even missing SubmitReminderBar, which main has). Every
// anchor is asserted unique before it is patched.
//
// Run:  node scripts/_ship-reading-palette-boxes.cjs
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const OWNER = 'alialahmad2000'
const REPO = 'fluentia-lms'
const REPO_DIR = path.join(__dirname, '..')

const showMain = (f) =>
  execFileSync('git', ['show', `origin/main:${f}`], { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })

function patch(src, file, anchor, replacement) {
  const n = src.split(anchor).length - 1
  if (n !== 1) throw new Error(`${file}: anchor matched ${n}× (expected 1):\n  ${anchor.slice(0, 90)}…`)
  return src.replace(anchor, replacement)
}

const rd = (p) => fs.readFileSync(p, 'utf8')

function buildReadingTab() {
  const f = 'src/pages/student/curriculum/tabs/ReadingTab.jsx'
  let s = showMain(f)
  s = patch(s, f, rd('/tmp/orig-vocab.txt'), rd('/tmp/new-vocab.txt'))
  s = patch(s, f, rd('/tmp/orig-skill.txt'), rd('/tmp/new-skill.txt'))
  s = patch(s, f, rd('/tmp/orig-crit.txt'), rd('/tmp/new-crit.txt'))
  // The saved-vocabulary quiz (cold slate + a VIOLET accent, which is
  // listening's colour cross-wired into reading) and the loading skeleton —
  // the first thing a student sees on every reading load.
  s = patch(s, f, rd('/tmp/orig-quiz.txt'), rd('/tmp/new-quiz.txt'))
  s = patch(s, f, rd('/tmp/orig-skel.txt'), rd('/tmp/new-skel.txt'))
  return { path: f, content: s }
}

function buildQuestionCss() {
  const f = 'src/components/curriculum/questions/questionCards.css'
  const s = showMain(f)
  return {
    path: f,
    content: patch(
      s, f,
`  background:
    linear-gradient(172deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.012) 36%, rgba(0, 0, 0, 0.14) 100%),
    rgba(9, 15, 30, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.09);`,
`  /* The ground was a hardcoded COLD navy while the app's token layer is warm on
     the default theme, so every question card sat a few degrees cooler than the
     page around it. Only the ground and the edge follow the theme now — the
     gradient sheen, the accent rail and each section's accent (violet for
     listening, sky for reading) are deliberately untouched. */
  background:
    linear-gradient(172deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.012) 36%, rgba(0, 0, 0, 0.14) 100%),
    var(--ds-bg-elevated, #0b0f18);
  border: 1px solid var(--ds-border-subtle, rgba(255, 255, 255, 0.09));`
    ),
  }
}

const ENTRY = `### 2026-08-21 (later 3) — READING: the rest of the section joins the token layer (four colour systems → one)
- Follow-through on the same complaint (*"I didn't like the colors of the backgrounds and so on"*). Retoning «ورقة المذاكرة» fixed the sheet, but the cards stacked around it were still raw Tailwind — so the section still showed **four different colour systems in one scroll**: \`VocabularyBox\` and \`ReadingSkillBox\` on a COLD slate ground (\`bg-slate-900/50\` + \`border-slate-800/60\`) with an **emerald** icon and an **amber** icon respectively, \`CriticalThinkingBox\` on a **purple→sky gradient** (\`rgba(168,85,247,.06)\` → \`rgba(56,189,248,.06)\`) with purple text, and the question cards on a hardcoded cold navy \`rgba(9,15,30,.72)\`. Cold grounds under a warm page is the same defect the sheet had.\n\nTwo more surfaces were caught by this script's own guard rather than by eye:\nthe saved-vocabulary quiz carried a FIFTH accent (violet — listening's colour,\ncross-wired into reading) on the same cold slate, and ReadingSkeleton, the first\nthing a student sees on every reading load, was cold slate with slate-800\nshimmers flashing in front of a warm page. Both now use the section's material.
- **Now one ground for the whole section.** All three info cards use \`--ds-bg-elevated\` + \`--ds-border-subtle\` with \`--ds-text-*\` type, so they match the passage card and the study sheet and follow the student's theme. Wayfinding is kept but quietened to tokens: vocabulary \`--ds-accent-success\`, reading skill \`--ds-accent-primary\` (gold — the token-correct version of the amber it had), critical thinking \`--ds-accent-secondary\`. The vocab audio button moves off \`sky-500\` onto the section's gold.
- **Two more surfaces the first sweep missed, caught by the ship script's own guard rather than by eye:** the **saved-vocabulary quiz** carried a fifth accent — **violet**, which is *listening's* colour cross-wired into reading — on the same cold slate ground; and \`ReadingSkeleton\`, the **first thing a student sees on every reading load**, was cold slate with \`slate-800\` shimmers flashing in front of a warm page. Both now use the section's ground and accent.\n- **\`.qx-card\` ground tokenised too** — \`rgba(9,15,30,.72)\` → \`var(--ds-bg-elevated)\`. This file is SHARED with listening, so that section's question cards warm up identically; the gradient sheen, the accent rail and each section's accent (violet listening / sky reading) are deliberately **unchanged**, since the per-skill accent is a deliberate system the owner has not objected to.
- **Content findings the design cannot fix** (all verified against production, 260 readings):
  - \`reading_skill_explanation\` is **NULL on all 260** — «مهارة القراءة» renders as a bare heading line with no explanation, on every reading in the platform.
  - \`critical_thinking_prompt_ar\` is **NULL on all 260** while 144 have the English — so «تفكير ناقد» shows English only, in an Arabic-first product.
  - \`reading_skill_name_ar\` is present on only **116 / 260**.
  - **Zero readings have BOTH a \`study_sheet\` and a \`critical_thinking_prompt\`** — the 116 sheets and the 144 prompts sit on disjoint sets, so no student ever sees the two together.
- Verified by slicing the three patched components out of the derived ReadingTab **byte-identically** into a throwaway harness (this tree cannot import the real tab — it is missing \`SubmitReminderBar\`, which main has) and rendering them with REAL production vocabulary rows and the real null-ness of the optional fields: 0 console errors, 0 horizontal overflow. Harness deleted.
- **Deliberately left alone:** the correctness greens (completed banner, correct answer, score) and \`QUESTION_TYPE_COLORS\` — a per-question-type legend where emerald means *vocabulary* and purple means *inference*. Those carry meaning; flattening them to one accent would destroy information rather than tidy a palette.\n- Files: \`src/pages/student/curriculum/tabs/ReadingTab.jsx\`, \`src/components/curriculum/questions/questionCards.css\`. DB: none. Edge functions: none.

`

function buildClaudeMd() {
  const f = 'CLAUDE.md'
  const s = showMain(f)
  const anchor = '## CHANGE LOG (Claude Code: update this after EVERY task — newest first)\n\n'
  return { path: f, content: patch(s, f, anchor, anchor + ENTRY) }
}

const MESSAGE = `fix(reading): the rest of the section joins the token layer — four colour systems become one

Follow-through on "I didn't like the colors of the backgrounds and so on".
Retoning the study sheet fixed the sheet, but the cards stacked around it were
still raw Tailwind, so one scroll still showed four colour systems:

  • VocabularyBox + ReadingSkillBox — cold slate ground (bg-slate-900/50 +
    border-slate-800/60), emerald icon and amber icon respectively
  • CriticalThinkingBox — a purple->sky gradient with purple text
  • the question cards — a hardcoded cold navy rgba(9,15,30,.72)

Cold grounds under a warm page is the same defect the sheet had.\n\nTwo more surfaces were caught by this script's own guard rather than by eye:\nthe saved-vocabulary quiz carried a FIFTH accent (violet — listening's colour,\ncross-wired into reading) on the same cold slate, and ReadingSkeleton, the first\nthing a student sees on every reading load, was cold slate with slate-800\nshimmers flashing in front of a warm page. Both now use the section's material.

All three info cards now use --ds-bg-elevated + --ds-border-subtle with
--ds-text-* type, so they match the passage card and the study sheet and follow
the student's theme. Wayfinding is kept but quietened to tokens: vocabulary
--ds-accent-success, reading skill --ds-accent-primary (gold — the token-correct
version of the amber it had), critical thinking --ds-accent-secondary. The vocab
audio button moves off sky-500 onto the section's gold.

.qx-card's ground is tokenised too. That file is SHARED with listening, so those
question cards warm up identically — but the gradient sheen, the accent rail and
each section's accent (violet listening / sky reading) are deliberately
unchanged, since the per-skill accent is a system the owner has not objected to.

Content findings the design cannot fix (verified against production, 260 rows):
reading_skill_explanation is NULL on ALL 260, so «مهارة القراءة» is a bare
heading everywhere; critical_thinking_prompt_ar is NULL on all 260 while 144
have the English, so «تفكير ناقد» is English-only in an Arabic-first product;
reading_skill_name_ar exists on only 116/260; and NO reading has both a
study_sheet and a critical_thinking_prompt — the two sets are disjoint.

Verified by slicing the three patched components out of the derived ReadingTab
byte-identically into a throwaway harness (this tree cannot import the real tab —
it is missing SubmitReminderBar, which main has) and rendering them against real
production vocabulary rows: 0 console errors, 0 horizontal overflow.`

function gh(args, input) {
  const opts = { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  if (input !== undefined) opts.input = input
  return execFileSync('gh', args, opts)
}
const ghGet = (e) => JSON.parse(gh(['api', e]))
const ghPost = (e, p) => JSON.parse(gh(['api', e, '--method', 'POST', '--input', '-'], JSON.stringify(p)))

function main() {
  const head = ghGet(`repos/${OWNER}/${REPO}/git/ref/heads/main`).object.sha
  const edited = [buildReadingTab(), buildQuestionCss(), buildClaudeMd()]
  for (const e of edited) {
    if (e.content === showMain(e.path)) throw new Error(`${e.path}: patch produced no change`)
  }
  const rt = edited[0].content
  // Assert the cold GROUNDS and the cross-wired accent are gone. Deliberately
  // NOT asserted: the correctness greens (completed banner, right answer, score)
  // and QUESTION_TYPE_COLORS — a per-question-type legend where emerald means
  // "vocabulary" and purple means "inference". Those are semantic, not chrome,
  // and flattening them would destroy meaning rather than tidy a palette.
  for (const bad of ['bg-slate-900/50 border border-slate-800/60', 'rgba(168,85,247,0.06)', 'text-violet-400']) {
    if (rt.includes(bad)) throw new Error(`ReadingTab still contains: ${bad}`)
  }
  const groundUses = rt.split('var(--ds-bg-elevated, #0d111b)').length - 1
  if (groundUses < 4) throw new Error(`expected >=4 tokenised grounds, found ${groundUses}`)
  const shipScript = 'scripts/_ship-reading-palette-boxes.cjs'
  console.log(`pre-flight OK — main at ${head.slice(0, 8)}`)

  const tree = []
  for (const e of edited) {
    const blob = ghPost(`repos/${OWNER}/${REPO}/git/blobs`, { content: e.content, encoding: 'utf-8' })
    tree.push({ path: e.path, mode: '100644', type: 'blob', sha: blob.sha })
    console.log(`  blob ${blob.sha.slice(0, 8)}  ${e.path}  (derived from main)`)
  }
  const sb = ghPost(`repos/${OWNER}/${REPO}/git/blobs`, { content: fs.readFileSync(path.join(REPO_DIR, shipScript), 'utf8'), encoding: 'utf-8' })
  tree.push({ path: shipScript, mode: '100644', type: 'blob', sha: sb.sha })

  const base = ghGet(`repos/${OWNER}/${REPO}/git/commits/${head}`)
  const newTree = ghPost(`repos/${OWNER}/${REPO}/git/trees`, { base_tree: base.tree.sha, tree })
  const commit = ghPost(`repos/${OWNER}/${REPO}/git/commits`, { message: MESSAGE, tree: newTree.sha, parents: [head] })
  gh(['api', `repos/${OWNER}/${REPO}/git/refs/heads/main`, '--method', 'PATCH', '-f', `sha=${commit.sha}`, '-F', 'force=false'])
  console.log(`\nshipped ${commit.sha.slice(0, 8)} → main`)
}
main()
