// Ships the reading tab's section chrome — a jump rail and real seams between
// the stacked blocks — DIRECT-TO-MAIN via the GitHub Git Trees API.
//
// ReadingTab.jsx is re-derived HERE from origin/main with only this session's
// hunks applied, because the local working tree carries another session's
// uncommitted reading work. Every anchor is asserted before it is patched.
//
// Run:  node scripts/_ship-reading-sections.cjs
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const OWNER = 'alialahmad2000'
const REPO = 'fluentia-lms'
const REPO_DIR = path.join(__dirname, '..')
const EXPECTED_BASE = process.env.EXPECTED_BASE

const NEW_FILES = [
  'src/components/curriculum/SectionJumper.jsx',
  'src/components/curriculum/SectionBand.jsx',
  'scripts/_ship-reading-sections.cjs',
]

const showMain = (f) =>
  execFileSync('git', ['show', `origin/main:${f}`], { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })

function patch(src, file, anchor, replacement) {
  const n = src.split(anchor).length - 1
  if (n !== 1) throw new Error(`${file}: anchor matched ${n}× (expected 1):\n  ${anchor.slice(0, 100)}…`)
  return src.replace(anchor, replacement)
}

function buildReadingTab() {
  const f = 'src/pages/student/curriculum/tabs/ReadingTab.jsx'
  let s = showMain(f)

  // ── 1. one more icon for the rail ────────────────────────────────────────
  s = patch(
    s, f,
    "import { BookOpen, Volume2, CheckCircle, XCircle, Lightbulb, MessageSquare, ChevronDown, RotateCcw, History, Clock, ImageOff, Eye, EyeOff, StickyNote, Headphones, FileText, Loader2, Zap, Settings } from 'lucide-react'",
    "import { BookOpen, Volume2, CheckCircle, XCircle, Lightbulb, MessageSquare, ChevronDown, RotateCcw, History, Clock, ImageOff, Eye, EyeOff, StickyNote, Headphones, FileText, Loader2, Zap, Settings, GraduationCap } from 'lucide-react'"
  )

  // ── 2. the two new primitives ────────────────────────────────────────────
  s = patch(
    s, f,
    "import StudySheet from '../../../../components/curriculum/reading/StudySheet'",
    "import StudySheet from '../../../../components/curriculum/reading/StudySheet'\n" +
      "import SectionJumper from '../../../../components/curriculum/SectionJumper'\n" +
      "import SectionBand from '../../../../components/curriculum/SectionBand'"
  )

  // ── 3. what the rail offers ──────────────────────────────────────────────
  s = patch(
    s, f,
    'const QUESTION_TYPE_LABELS = {',
    `// What the jump rail offers. SectionJumper drops any entry whose block did
// not render, so a reading with no vocabulary simply shows one chip fewer.
const SECTION_NAV = [
  { id: 'sec-text', label: 'المقال', icon: FileText },
  { id: 'sec-vocab', label: 'المفردات', icon: BookOpen },
  { id: 'sec-study', label: 'ورقة المذاكرة', icon: GraduationCap },
  { id: 'sec-questions', label: 'الأسئلة', icon: CheckCircle },
  { id: 'sec-thinking', label: 'تفكير ناقد', icon: MessageSquare },
]

const QUESTION_TYPE_LABELS = {`
  )

  // ── 4. the rail joins the existing sticky cluster ────────────────────────
  // The progress hairline is already sticky at the header offset. Two sticky
  // siblings at slightly different offsets tear as you scroll, so the rail
  // goes INSIDE that same container rather than beside it.
  s = patch(
    s, f,
    `      {/* Reading Progress Bar */}
      <div className="sticky z-20 -mx-4 px-4" style={{ top: 'var(--header-height, 64px)' }}>`,
    `      {/* Sticky section chrome: the progress hairline and the jump rail are
          ONE cluster. A student who wants the questions used to scroll past
          everything else every single time. */}
      <div className="sticky z-rise -mx-4 px-4 pb-2" style={{ top: 'var(--header-height, 64px)' }}>`
  )
  s = patch(
    s, f,
    `            animate={{ width: \`\${scrollProgress}%\` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>`,
    `            animate={{ width: \`\${scrollProgress}%\` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <SectionJumper className="mt-2" sections={SECTION_NAV} />
      </div>`
  )

  // ── 5. the article is the first jump target ──────────────────────────────
  s = patch(
    s, f,
    `      {/* ─── Premium Passage Card ─── */}
      <div
        className="relative rounded-2xl overflow-hidden transition-colors duration-300"`,
    `      {/* ─── Premium Passage Card ─── */}
      <div
        id="sec-text"
        className="relative scroll-mt-[132px] rounded-2xl overflow-hidden transition-colors duration-300"`
  )

  // ── 6. seams between the groups ──────────────────────────────────────────
  // Every card below already carries its own header, so these bands add SEAMS
  // and anchors, not more titles. The study sheet gets the 'feature' seam
  // because it is a different KIND of thing — a paper, not another info card.
  s = patch(
    s, f,
    `      {/* Vocabulary Box */}
      {vocabulary?.length > 0 && (
        <VocabularyBox vocabulary={vocabulary} />
      )}

      {/* Reading Skill */}
      {reading.reading_skill_name_en && (
        <ReadingSkillBox reading={reading} />
      )}

      {/* «ورقة المذاكرة» — the study layer distilled from this passage.
          Sits between the article and the questions so the questions now test
          something that was actually taught. Renders nothing without content. */}
      {reading.study_sheet && <StudySheet sheet={reading.study_sheet} />}

      {/* Comprehension Questions */}
      {questions?.length > 0 && <SaveStatus floating state={saveState} lastSavedAt={lastSavedAt} />}
      {questions?.length > 0 && (
        <ComprehensionSection
          key={retryKeyRef.current}
          questions={questions}
          savedAnswers={retrying ? null : savedProgress?.answers}
          isAlreadyCompleted={!retrying && savedProgress?.status === 'completed'}
          progressLoading={progressLoading}
          onAutosave={handleComprehensionAutosave}
          onComplete={handleComprehensionComplete}
        />
      )}

      {/* Critical Thinking */}
      {reading.critical_thinking_prompt_en && (
        <CriticalThinkingBox reading={reading} />
      )}`,
    `      {/* The words and the skill this passage practises. */}
      {(vocabulary?.length > 0 || reading.reading_skill_name_en) && (
        <SectionBand id="sec-vocab">
          {vocabulary?.length > 0 && <VocabularyBox vocabulary={vocabulary} />}
          {reading.reading_skill_name_en && <ReadingSkillBox reading={reading} />}
        </SectionBand>
      )}

      {/* «ورقة المذاكرة» — the study layer distilled from this passage. Sits
          between the article and the questions so the questions now test
          something that was actually taught. Renders nothing without content.
          The 'feature' seam marks it as a paper, not another info card. */}
      {reading.study_sheet && (
        <SectionBand id="sec-study" tone="feature">
          <StudySheet sheet={reading.study_sheet} />
        </SectionBand>
      )}

      {/* The graded check. */}
      {questions?.length > 0 && (
        <SectionBand id="sec-questions">
          <SaveStatus floating state={saveState} lastSavedAt={lastSavedAt} />
          <ComprehensionSection
            key={retryKeyRef.current}
            questions={questions}
            savedAnswers={retrying ? null : savedProgress?.answers}
            isAlreadyCompleted={!retrying && savedProgress?.status === 'completed'}
            progressLoading={progressLoading}
            onAutosave={handleComprehensionAutosave}
            onComplete={handleComprehensionComplete}
          />
        </SectionBand>
      )}

      {reading.critical_thinking_prompt_en && (
        <SectionBand id="sec-thinking">
          <CriticalThinkingBox reading={reading} />
        </SectionBand>
      )}`
  )

  return { path: f, content: s }
}

const MESSAGE = `feat(reading): a jump rail and real seams — the section stops being one undifferentiated scroll

Owner, looking at the live reading tab: the blocks "look too much thing above
each other", the study paper should sit in its own separated section, and every
unit section needs a way to reach what you want — the questions especially —
"instead of always having to scroll down manually each time".

Both complaints have the same root. The tab was a stack of identically-weighted
rounded cards — article, vocabulary, reading skill, study sheet, questions,
critical thinking — separated by nothing but equal gaps, with no way to skip
ahead. Nothing told the eye where one thing ended and the next began.

SectionJumper (NEW, deliberately generic — nothing in it is reading-specific,
so listening/grammar/writing can mount it as-is):
  • a rail of chips that jumps straight to a block, so the questions are one tap
    away from the top of the section
  • it also answers "what is even in here?" at a glance
  • entries whose block did not render are dropped, so a reading with no
    vocabulary shows one chip fewer rather than a dead link
  • the active chip tracks scroll via IntersectionObserver and scrolls itself
    into view on a narrow screen

SectionBand (NEW) supplies the seam, the breathing room and the scroll anchor.
Note what it deliberately does NOT do: add a title. Every card already carries
its own header («مفردات القراءة»، «ورقة المذاكرة»، «أسئلة الفهم»), so a band
label would print the same thing twice — the problem was never missing labels,
it was missing seams. The study sheet gets the 'feature' seam (a warmer rule
with a centred dot and a wider gap) because it is a different KIND of object.

Two layout facts this had to respect, both previously bugs here:
  • the rail joins the progress hairline INSIDE its existing sticky container
    rather than sitting beside it — two sticky siblings at slightly different
    offsets tear as you scroll.
  • the rail's height is MEASURED at jump time, never assumed. The chips grow
    to clear the 44px touch floor under (pointer: coarse), so the hardcoded
    constant this started with was 10px wrong on every phone — verified 62px on
    an iPhone profile vs 54 on desktop.

Verified against the real components in a throwaway harness (deleted) at 900px
and on an iPhone 13 profile: 0 console errors, 0 horizontal overflow, the rail
discovers all four blocks, a jump to الأسئلة lands the heading 5px clear of the
chrome instead of underneath it, the active chip follows the scroll, and tap
targets measure 44px on touch / 38px on desktop.`

function gh(args, input) {
  const opts = { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  if (input !== undefined) opts.input = input
  return execFileSync('gh', args, opts)
}
const ghGet = (e) => JSON.parse(gh(['api', e]))
const ghPost = (e, p) => JSON.parse(gh(['api', e, '--method', 'POST', '--input', '-'], JSON.stringify(p)))

function main() {
  const head = ghGet(`repos/${OWNER}/${REPO}/git/ref/heads/main`).object.sha
  if (EXPECTED_BASE && head !== EXPECTED_BASE) {
    throw new Error(`main has moved: ${head} != ${EXPECTED_BASE} — re-derive, do NOT force`)
  }
  const edited = [buildReadingTab()]
  for (const e of edited) {
    if (e.content === showMain(e.path)) throw new Error(`${e.path}: patch produced no change`)
  }
  for (const f of NEW_FILES) {
    if (!fs.existsSync(path.join(REPO_DIR, f))) throw new Error(`missing new file: ${f}`)
  }
  console.log(`pre-flight OK — main at ${head.slice(0, 8)}`)

  const tree = []
  for (const e of edited) {
    const blob = ghPost(`repos/${OWNER}/${REPO}/git/blobs`, { content: e.content, encoding: 'utf-8' })
    tree.push({ path: e.path, mode: '100644', type: 'blob', sha: blob.sha })
    console.log(`  blob ${blob.sha.slice(0, 8)}  ${e.path}  (derived from main)`)
  }
  for (const f of NEW_FILES) {
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

if (process.env.DRY) {
  const e = buildReadingTab()
  fs.writeFileSync('/tmp/rt-patched.jsx', e.content)
  console.log('DRY: all anchors matched — patched file at /tmp/rt-patched.jsx')
} else {
  main()
}
