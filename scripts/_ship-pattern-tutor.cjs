// «ورقة المذاكرة» — English-first pattern cards + a tutor you can actually talk
// to about ONE pattern, DIRECT-TO-MAIN via the Trees API.
//
// ReadingTab.jsx is re-derived from origin/main (this tree carries other
// sessions' work); the three component files ship whole and were each verified
// against origin/main before editing.
//
// Run:  node scripts/_ship-pattern-tutor.cjs
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const OWNER = 'alialahmad2000', REPO = 'fluentia-lms'
const REPO_DIR = path.join(__dirname, '..')
const NEW_FILES = [
  'src/components/curriculum/reading/StudySheet.jsx',
  'src/components/coach/AICoachPanel.jsx',
  'supabase/functions/coach-chat/index.ts',
  'supabase/migrations/20260822140000_coach_reading_pattern.sql',
  'scripts/_ship-pattern-tutor.cjs',
]
const show = (f) => execFileSync('git', ['show', `origin/main:${f}`], { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32e6 })
function patch(s, f, a, r) {
  const n = s.split(a).length - 1
  if (n !== 1) throw new Error(`${f}: anchor ${n}× (expected 1)`)
  return s.replace(a, r)
}

function buildReadingTab() {
  const f = 'src/pages/student/curriculum/tabs/ReadingTab.jsx'
  return {
    path: f,
    content: patch(show(f), f,
      `          <StudySheet sheet={reading.study_sheet} />`,
      `          <StudySheet sheet={reading.study_sheet} readingId={reading.id} studentId={studentId} />`),
  }
}

const ENTRY = `### 2026-08-22 (later 3) — «ورقة المذاكرة»: English first, more examples, and a tutor you can argue with
- Owner on a pattern card: *"make it easier to read… the explanation needs more examples and proper put… should be in English then Arabic in small or sub thing… add an AI thing the student can actually use… and save all such convos to understand how much hard work the student did and which things he learnt actively."*
- **The card was upside down.** It led with a dense Arabic paragraph with English words buried inside it, and the examples — the part a learner actually copies from — were at the BOTTOM under two more Arabic blocks. New order: the rule in **English** (title_en promoted to the headline, title_ar demoted to a small sub-line) → the line it came from → **the examples, in their own cards at 15.5px** → and only then the Arabic, set at 13.5px inside a quiet «الشرح بالعربية» block. Arabic is support now, not the headline.
- **More examples: 2 → 5 per pattern** on the live reading, all from working life. (Content pass for the other 115 sheets still owed — the card renders any number.)
- **The tutor is the existing coach, extended — not a second system.** \`coach_conversations\` / \`coach_messages\`, cost tracking and \`/admin/coach-activity\` already existed for writing and speaking, so reading rides on them and the owner's "how much hard work did she do / what did she learn actively" reporting works with no extra wiring. New \`task_type='reading_pattern'\` + a nullable \`pattern_id\`, and the unique key becomes \`(student, task, type, coalesce(pattern_id,''))\` so **one thread per pattern** instead of one muddled thread per reading. All 30 existing conversations and 162 messages untouched.
- **A tutor is not a coach.** The coach's first rule is *never write the student's answer*; here explaining fully IS the job — the sheet's check is a private self-check graded in the browser and saved nowhere, so there is no answer to protect. The new \`TUTOR_SYSTEM_PROMPT\` instead enforces what the owner asked for: **English first, always**; **at least two NEW examples every time**, with the sheet's own examples passed in context and explicitly forbidden from being reused; concrete work situations only; and when she says she understood, ask her one question only someone who understood could answer.
- Quick-action chips are per task type — the writing coach's «خطة/توسيع/بدايات» are meaningless here, replaced with «أمثلة أكثر · اشرح أبسط · ما الفرق؟ · ليش هنا؟ · صحّح جملتي · اختبرني». The inline shell also gained a \`tone="gold"\` so a violet panel is not dropped into the gold reading section.
- **Verified end-to-end against production** with a real student JWT: HTTP 200, streamed a reply that led in English and gave genuinely new work examples ("Our report has 12 pages" → confirmed vs "We expect to cut costs by 15% next quarter" → expected) without reusing the sheet's. Conversation + 4 messages persisted against \`pattern_id='p2'\`, cost **0.0718 SAR** for two exchanges. Test rows then deleted — back to exactly 30/162. Card re-checked at 1000px and 390px: 0 console errors, 0 horizontal overflow, 0 buttons under the 44px touch floor.
- Files: \`src/components/curriculum/reading/StudySheet.jsx\`, \`src/components/coach/AICoachPanel.jsx\`, \`src/pages/student/curriculum/tabs/ReadingTab.jsx\`, \`supabase/functions/coach-chat/index.ts\` (deployed v5), \`supabase/migrations/20260822140000_coach_reading_pattern.sql\` (applied).

`
function buildClaudeMd() {
  const f = 'CLAUDE.md'
  const a = '## CHANGE LOG (Claude Code: update this after EVERY task — newest first)\n\n'
  return { path: f, content: patch(show(f), f, a, a + ENTRY) }
}

const MESSAGE = `feat(reading): English-first pattern cards + a tutor scoped to one pattern

The owner on a pattern card: make it easier to read, the explanation needs more
examples and proper layout, it should be English then Arabic as a small sub, add
an AI the student can actually use, and save every one of those conversations so
we can see how much work she did and what she learnt actively.

The card was upside down. It led with a dense Arabic paragraph with English
words buried inside it, and the examples — the part a learner copies from — sat
at the bottom under two more Arabic blocks. New order: the rule in English
(title_en promoted to headline, title_ar demoted to a sub-line), the line it came
from, the examples in their own cards at 15.5px, then the Arabic at 13.5px in a
quiet «الشرح بالعربية» block. Examples went 2 -> 5 on the live reading.

The tutor is the EXISTING coach extended, not a second system. coach_conversations
/ coach_messages, cost tracking and /admin/coach-activity already existed for
writing and speaking, so reading rides on them and the effort reporting works with
no new wiring. New task_type='reading_pattern' plus a nullable pattern_id, and the
unique key becomes (student, task, type, coalesce(pattern_id,'')) so there is one
thread per pattern rather than one muddled thread per reading. All 30 existing
conversations and 162 messages are untouched.

A tutor is not a coach: the coach must never write the student's answer, but here
explaining fully IS the job — the sheet's check is a private self-check graded in
the browser and saved nowhere. TUTOR_SYSTEM_PROMPT enforces English first, at
least two NEW examples every time (the sheet's own examples are passed in context
and explicitly forbidden from reuse), concrete work situations, and a
comprehension question when she claims she understood.

Verified end-to-end against production with a real student JWT: 200, an
English-first reply with genuinely new work examples, conversation + 4 messages
persisted against pattern_id='p2', 0.0718 SAR for two exchanges. Test rows
deleted afterwards. Card re-checked at 1000px and 390px: no console errors, no
overflow, nothing under the 44px touch floor.`

const gh = (a, i) => execFileSync('gh', a, { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32e6, ...(i !== undefined ? { input: i } : {}) })
const get = (e) => JSON.parse(gh(['api', e]))
const post = (e, p) => JSON.parse(gh(['api', e, '--method', 'POST', '--input', '-'], JSON.stringify(p)))

function main() {
  const head = get(`repos/${OWNER}/${REPO}/git/ref/heads/main`).object.sha
  const edited = [buildReadingTab(), buildClaudeMd()]
  for (const e of edited) if (e.content === show(e.path)) throw new Error(`${e.path}: no change`)
  const ss = fs.readFileSync(path.join(REPO_DIR, 'src/components/curriculum/reading/StudySheet.jsx'), 'utf8')
  if (!ss.includes('reading_pattern')) throw new Error('StudySheet: tutor not wired')
  if (!ss.includes('الشرح بالعربية')) throw new Error('StudySheet: Arabic sub-block missing')
  const cp = fs.readFileSync(path.join(REPO_DIR, 'src/components/coach/AICoachPanel.jsx'), 'utf8')
  if (!cp.includes('pattern_id')) throw new Error('AICoachPanel: pattern_id not sent')
  console.log(`pre-flight OK — main at ${head.slice(0, 8)}`)

  const tree = []
  for (const e of edited) {
    const b = post(`repos/${OWNER}/${REPO}/git/blobs`, { content: e.content, encoding: 'utf-8' })
    tree.push({ path: e.path, mode: '100644', type: 'blob', sha: b.sha })
    console.log(`  blob ${b.sha.slice(0, 8)}  ${e.path}  (derived from main)`)
  }
  for (const f of NEW_FILES) {
    const b = post(`repos/${OWNER}/${REPO}/git/blobs`, { content: fs.readFileSync(path.join(REPO_DIR, f), 'utf8'), encoding: 'utf-8' })
    tree.push({ path: f, mode: '100644', type: 'blob', sha: b.sha })
    console.log(`  blob ${b.sha.slice(0, 8)}  ${f}`)
  }
  const base = get(`repos/${OWNER}/${REPO}/git/commits/${head}`)
  const nt = post(`repos/${OWNER}/${REPO}/git/trees`, { base_tree: base.tree.sha, tree })
  const c = post(`repos/${OWNER}/${REPO}/git/commits`, { message: MESSAGE, tree: nt.sha, parents: [head] })
  gh(['api', `repos/${OWNER}/${REPO}/git/refs/heads/main`, '--method', 'PATCH', '-f', `sha=${c.sha}`, '-F', 'force=false'])
  console.log(`\nshipped ${c.sha.slice(0, 8)} → main`)
}
main()
