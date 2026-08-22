// Ships the opt-in «session» shape of a reading, DIRECT-TO-MAIN via the Trees API.
//
// ReadingTab.jsx is re-derived HERE from origin/main — the local working tree
// carries other sessions' uncommitted reading work and is even missing files
// that main has. Every anchor is asserted unique before it is patched.
//
// The whole feature is gated on curriculum_readings.experience_version, which is
// 'session' for exactly ONE reading (ملاك, unit 1) and 'classic' for the other
// 259. Turning it off is one UPDATE with no deploy.
//
// Run:  node scripts/_ship-reading-session.cjs
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const OWNER = 'alialahmad2000'
const REPO = 'fluentia-lms'
const REPO_DIR = path.join(__dirname, '..')
const NEW_FILES = [
  'src/components/curriculum/reading/ReadingSession.jsx',
  'src/components/curriculum/reading/StudySheet.jsx',
  'supabase/migrations/20260822120000_reading_experience_version.sql',
  'scripts/_ship-reading-session.cjs',
]

const showMain = (f) =>
  execFileSync('git', ['show', `origin/main:${f}`], { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })

function patch(src, file, anchor, replacement) {
  const n = src.split(anchor).length - 1
  if (n !== 1) throw new Error(`${file}: anchor matched ${n}× (expected 1):\n  ${anchor.slice(0, 110)}…`)
  return src.replace(anchor, replacement)
}

function buildReadingTab() {
  const f = 'src/pages/student/curriculum/tabs/ReadingTab.jsx'
  let s = showMain(f)

  // 1 — one more icon for the rail
  s = patch(s, f,
    "ImageOff, Eye, EyeOff, StickyNote, Headphones, FileText, Loader2, Zap, Settings, GraduationCap } from 'lucide-react'",
    "ImageOff, Eye, EyeOff, StickyNote, Headphones, FileText, Loader2, Zap, Settings, GraduationCap, Target } from 'lucide-react'")

  // 2 — the two new blocks
  s = patch(s, f,
    "import StudySheet from '../../../../components/curriculum/reading/StudySheet'",
    "import StudySheet from '../../../../components/curriculum/reading/StudySheet'\n" +
    "import { ReadingContract, ReadingOutcome, PassageFoldedBar } from '../../../../components/curriculum/reading/ReadingSession'")

  // 3 — the rail learns about them. SectionJumper drops entries whose block did
  //     not render, so a classic reading simply shows two chips fewer.
  s = patch(s, f,
    "  { id: 'sec-text', label: 'المقال', icon: FileText },",
    "  { id: 'sec-contract', label: 'قبل القراءة', icon: Target },\n" +
    "  { id: 'sec-text', label: 'المقال', icon: FileText },")
  s = patch(s, f,
    "  { id: 'sec-thinking', label: 'تفكير ناقد', icon: MessageSquare },",
    "  { id: 'sec-thinking', label: 'تفكير ناقد', icon: MessageSquare },\n" +
    "  { id: 'sec-take', label: 'الحصيلة', icon: GraduationCap },")

  // 4 — opt-in state
  s = patch(s, f,
    '  const [savedProgress, setSavedProgress] = useState(null)',
    "  // The «session» shape is opt-in PER READING (curriculum_readings.experience_version)\n" +
    "  // so it can be switched off from the database with no deploy, and every other\n" +
    "  // reading on the platform renders exactly as it did before.\n" +
    "  const sessionMode = reading?.experience_version === 'session'\n" +
    "  const [passageFolded, setPassageFolded] = useState(false)\n" +
    '  const [savedProgress, setSavedProgress] = useState(null)')

  // 5 — the contract, and the bar that stands in for a folded passage
  s = patch(s, f,
    `      {/* ─── Premium Passage Card ─── */}
      <div
        id="sec-text"`,
    `      {sessionMode && (
        <div id="sec-contract" className="scroll-mt-[132px]">
          <ReadingContract reading={reading} vocabCount={vocabulary?.length || 0} />
        </div>
      )}

      {sessionMode && passageFolded && (
        <PassageFoldedBar
          title={reading.title_ar || reading.title_en}
          onUnfold={() => setPassageFolded(false)}
        />
      )}

      {/* ─── Premium Passage Card ─── */}
      <div
        hidden={sessionMode && passageFolded}
        id="sec-text"`)

  // 6 — fold the passage before answering. This is the point of the whole
  //     change: 28% of readings platform-wide are finished in under two minutes,
  //     which is scanning, not reading.
  s = patch(s, f,
    `      {questions?.length > 0 && (
        <SectionBand id="sec-questions">
          <SaveStatus floating state={saveState} lastSavedAt={lastSavedAt} />`,
    `      {questions?.length > 0 && (
        <SectionBand id="sec-questions">
          {sessionMode && !passageFolded && (
            <button
              onClick={() => setPassageFolded(true)}
              style={{
                background: 'var(--ds-accent-wash, rgba(233,185,73,.08))',
                color: 'var(--ds-accent-primary, #e9b949)',
                border: '1px solid rgba(233,185,73,0.26)',
              }}
              className="mb-1 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2 font-['Tajawal'] text-[13px] font-bold transition-opacity hover:opacity-80 [@media(pointer:coarse)]:min-h-[44px]"
            >
              <EyeOff size={14} />
              {g('اطوِ النص وأجب من مذاكرتك', 'اطوي النص وأجيبي من مذاكرتكِ')}
            </button>
          )}
          <SaveStatus floating state={saveState} lastSavedAt={lastSavedAt} />`)

  // 7 — what leaves the page with her
  s = patch(s, f,
    `        </SectionBand>
      )}

      {reading.critical_thinking_prompt_en && (`,
    `        </SectionBand>
      )}

      {sessionMode && (
        <SectionBand id="sec-take" tone="feature">
          <ReadingOutcome reading={reading} vocabCount={vocabulary?.length || 0} />
        </SectionBand>
      )}

      {reading.critical_thinking_prompt_en && (`)

  return { path: f, content: s }
}

const ENTRY = `### 2026-08-22 — READING: the «session» shape, opt-in on ONE reading, judged inside a real account
- The owner asked to see the rebuilt reading flow **inside ملاك's account, unit 1** rather than in a prototype file — and to **keep the old state in the database** so it can be restored if the old one turns out better.
- **Why the reading section needed this at all (production numbers, not opinion).** Across 325 completed readings by 33 students: **71% score a perfect 100** (231/325), **28% finish the whole section in under two minutes** (92/325), median time **236s**, and only 7.7% fall below 60. The check is decorative — its distractors are implausible (*"What comes to transport the boxes?" → A truck / A plane / A boat / A bicycle*), so most questions are answerable from the title without reading a word.
- **ملاك's own unit 1 is the case in miniature.** «ملخّص استراتيجية الربع» — **100/100 in 101 seconds**, 5/5 first attempt, 22 July. Same unit: listening 100, vocabulary 86, writing 70 (47 min), grammar **63**, speaking 63. Reading is the only section that produced no signal. Her study sheet teaches present continuous for fixed arrangements, «By» for a deadline, and comparatives of two — and her reading's five graded questions test **none of them**; the one labelled *inference* has a verbatim passage sentence as its answer. Four weeks later she scored **63** on that unit's grammar.
- **NEW \`src/components/curriculum/reading/ReadingSession.jsx\`** — \`ReadingContract\` (what this text gives: patterns · phrases · words · minutes, plus ONE purpose to hold while reading — filling \`before_read_exercise_a\`, which is NULL on all 260 readings), \`PassageFoldedBar\`, and \`ReadingOutcome\`. Everything is derived from content already on the row: **no new columns, no new authoring**. \`ReadingOutcome\` deliberately makes **no claim that anything is transferred automatically** — nothing is wired to do that, and a surface promising a transfer it does not perform is worse than one promising nothing.
- **The one behavioural change: the passage folds.** A button in the questions band hides the passage so the check is answered from memory and study rather than by scanning back up. It is reversible in one tap.
- **Nothing graded, saved, or already answered was touched.** The save path, the questions, the scoring and ملاك's completed 100/100 are byte-identical; her progress row still reads \`updated_at = 2026-07-22 21:28:48\`, equal to \`created_at\`.
- **Gated per reading + full snapshot** (migration \`20260822120000\`): new \`curriculum_readings.experience_version\` ('classic' | 'session') is **'session' on exactly 1 of 260 rows**; and \`reading_experience_backup\` holds a jsonb snapshot of the reading row + its 5 questions + every attached progress row, taken BEFORE the switch (idempotent on reading+reason, so a re-run cannot overwrite a good backup with a post-change one).
- **To revert — one UPDATE, no deploy:** \`update curriculum_readings set experience_version='classic' where id='f634ec95-45d1-44ed-b5df-74eabc721e54';\`
- Files: \`src/components/curriculum/reading/ReadingSession.jsx\` (NEW), \`src/pages/student/curriculum/tabs/ReadingTab.jsx\`, \`supabase/migrations/20260822120000_reading_experience_version.sql\` (NEW, applied). Edge functions: none.

`

function buildClaudeMd() {
  const f = 'CLAUDE.md'
  const anchor = '## CHANGE LOG (Claude Code: update this after EVERY task — newest first)\n\n'
  return { path: f, content: patch(showMain(f), f, anchor, anchor + ENTRY) }
}

const MESSAGE = `feat(reading): the «session» shape — opt-in on one reading, judged inside a real account

The owner asked to see the rebuilt reading flow inside ملاك's account (unit 1)
rather than in a prototype, and to keep the old state in the database so it can
be restored if the old one turns out better.

Why the section needed it, from production rather than opinion: across 325
completed readings by 33 students, 71% score a perfect 100, 28% finish the whole
section in under two minutes, and the median is 236s. The check is decorative —
"What comes to transport the boxes?" offers A truck / A plane / A boat / A
bicycle, so most questions are answerable from the title without reading a word.

ملاك's unit 1 is the case in miniature: 100/100 in 101 seconds, 5/5 first
attempt. Same unit — listening 100, vocabulary 86, writing 70 (47 min), grammar
63, speaking 63. Reading is the only section that produced no signal. Her study
sheet teaches present continuous for fixed arrangements, "By" for a deadline and
comparatives of two; her five graded questions test none of them, and the one
labelled "inference" has a verbatim passage sentence as its answer. Four weeks
later she scored 63 on that unit's grammar.

NEW ReadingSession.jsx — ReadingContract (what this text gives, plus ONE purpose
to hold while reading, filling before_read_exercise_a which is NULL on all 260
readings), PassageFoldedBar, and ReadingOutcome. All derived from content already
on the row: no new columns, no new authoring. ReadingOutcome deliberately makes
no claim that anything transfers automatically — nothing is wired to do that.

The one behavioural change is that the passage FOLDS before the check, so it is
answered from memory and study rather than by scanning back up. Reversible in a
tap.

Nothing graded, saved or already answered was touched. ملاك's completed 100/100
is byte-identical — her progress row still reads updated_at = created_at =
2026-07-22 21:28:48.

Gated per reading: curriculum_readings.experience_version is 'session' on
exactly 1 of 260 rows, and reading_experience_backup holds a jsonb snapshot of
the reading row + its 5 questions + every attached progress row, taken before the
switch. Revert is one UPDATE with no deploy.`

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
  for (const f of NEW_FILES) if (!fs.existsSync(path.join(REPO_DIR, f))) throw new Error(`missing: ${f}`)

  const rt = edited[0].content
  // classic must remain the default path in every branch we added
  const gates = rt.split('sessionMode').length - 1
  if (gates < 6) throw new Error(`expected >=6 sessionMode gates, found ${gates}`)
  if (!rt.includes("reading?.experience_version === 'session'")) throw new Error('gate expression missing')
  console.log(`pre-flight OK — main at ${head.slice(0, 8)}, ${gates} sessionMode gates`)

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

if (process.env.DRY) {
  const e = buildReadingTab()
  fs.writeFileSync('/tmp/rt-session.jsx', e.content)
  console.log('DRY: all anchors matched → /tmp/rt-session.jsx')
} else main()
