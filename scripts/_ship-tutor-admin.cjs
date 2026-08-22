// «محادثات المدرّب الذكي» — the staff view of what the AI tutor was asked.
// DIRECT-TO-MAIN via the Trees API; App.jsx and navigation.js are re-derived
// from origin/main because this tree carries other sessions' work.
//
// Run:  node scripts/_ship-tutor-admin.cjs
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const OWNER = 'alialahmad2000', REPO = 'fluentia-lms'
const REPO_DIR = path.join(__dirname, '..')
const NEW_FILES = [
  'src/pages/admin/AITutorConversations.jsx',
  'supabase/migrations/20260822150000_coach_conversations_staff_read.sql',
  'scripts/_ship-tutor-admin.cjs',
]
const show = (f) => execFileSync('git', ['show', `origin/main:${f}`], { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32e6 })
function patch(s, f, a, r) {
  const n = s.split(a).length - 1
  if (n !== 1) throw new Error(`${f}: anchor ${n}×`)
  return s.replace(a, r)
}

function buildApp() {
  const f = 'src/App.jsx'
  let s = show(f)
  s = patch(s, f,
    `const AdminBugReports = lazyRetry(() => import('./pages/admin/AdminBugReports'))`,
    `const AdminBugReports = lazyRetry(() => import('./pages/admin/AdminBugReports'))\nconst AITutorConversations = lazyRetry(() => import('./pages/admin/AITutorConversations'))`)
  s = patch(s, f,
    `              <Route path="/admin/bug-reports" element={<Page><AdminBugReports /></Page>} />`,
    `              <Route path="/admin/bug-reports" element={<Page><AdminBugReports /></Page>} />\n              <Route path="/admin/ai-conversations" element={<Page><AITutorConversations /></Page>} />`)
  return { path: f, content: s }
}

function buildNav() {
  const f = 'src/config/navigation.js'
  return {
    path: f,
    content: patch(show(f), f,
      `        { id: 'bug-reports', label: 'بلاغات المشاكل', icon: Bug,           to: '/admin/bug-reports' },`,
      `        { id: 'bug-reports', label: 'بلاغات المشاكل', icon: Bug,           to: '/admin/bug-reports' },\n        { id: 'ai-conversations', label: 'محادثات المدرّب الذكي', icon: MessageSquare, to: '/admin/ai-conversations' },`),
  }
}

const ENTRY = `### 2026-08-22 (later 4) — the AI tutor's conversations become readable (a correction to the entry above)
- The previous entry claimed the owner's "save the conversations so we can see how much hard work she did" was satisfied for free because \`/admin/coach-activity\` already existed. **That was wrong, and worth recording as wrong.** \`/admin/coach-activity\` is the HUMAN learning-coach page — touchpoints, blockers, morale — and reads none of this. A repo-wide grep for \`coach_conversations\` in \`src/\` returned exactly one file: the panel that writes them.
- Worse, RLS made a reader impossible: the only SELECT policies were \`auth.uid() = student_id\`. **Staff could not read a single row.** The conversations had been accumulating for months (30 threads, 162 messages) with nobody able to look at them.
- **Migration \`20260822150000\`** adds \`staff_read_coach_conversations\` and \`staff_read_coach_messages\`, scoped exactly like \`students_select\` (admin everything, trainer only their own groups). **FOR SELECT only** — a FOR ALL policy would let staff write into a student's transcript, and a transcript you can edit is not evidence of anything. Writes stay with the service-role edge function.
- **NEW \`/admin/ai-conversations\` «محادثات المدرّب الذكي»** — threads newest-first with student, kind, message count, date and cost; click one for the full transcript, loaded on demand. For reading threads it resolves \`pattern_id\` against \`study_sheet->teach\` and shows **which pattern** the question was about, which is the direct answer to "which things did she learn actively": a pattern she opened a thread about is one she chose to dig into rather than skim. Headline counters include «تراكيب بُحث فيها».
- Deliberately read-only: no editing, no deleting, no moderation. Uses two flat lookups instead of PostgREST embeds — a bare \`students→profiles\` embed is what took the admin students page to zero rows on 2026-06-01.
- Files: \`src/pages/admin/AITutorConversations.jsx\` (NEW), \`src/App.jsx\`, \`src/config/navigation.js\`, \`supabase/migrations/20260822150000_coach_conversations_staff_read.sql\` (applied).

`
function buildClaudeMd() {
  const f = 'CLAUDE.md'
  const a = '## CHANGE LOG (Claude Code: update this after EVERY task — newest first)\n\n'
  return { path: f, content: patch(show(f), f, a, a + ENTRY) }
}

const MESSAGE = `feat(admin): the AI tutor's conversations become readable

Corrects the previous commit, which claimed "save the conversations so we can
see how much hard work she did" was satisfied for free by /admin/coach-activity.
It was not. That page is the HUMAN learning-coach surface — touchpoints and
blockers — and reads none of this. A grep for coach_conversations in src/
returned exactly one file: the panel that writes them.

Worse, RLS made a reader impossible: the only SELECT policies were
auth.uid() = student_id, so staff could not read a single row. 30 threads and
162 messages had been accumulating with nobody able to look at them.

Migration adds staff_read_coach_conversations / staff_read_coach_messages,
scoped exactly like students_select (admin everything, trainer own groups).
FOR SELECT only — a FOR ALL policy would let staff write into a student's
transcript, and a transcript you can edit is not evidence of anything.

New /admin/ai-conversations shows threads newest-first with student, kind,
message count, date and cost, and the full transcript on demand. For reading
threads it resolves pattern_id against study_sheet->teach and names WHICH
pattern the question was about — the direct answer to "which things did she
learn actively", since a pattern she opened a thread about is one she chose to
dig into rather than skim.

Read-only by design. Uses two flat lookups rather than PostgREST embeds, since a
bare students->profiles embed is what took the admin students page to zero rows
on 2026-06-01.`

const gh = (a, i) => execFileSync('gh', a, { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32e6, ...(i !== undefined ? { input: i } : {}) })
const get = (e) => JSON.parse(gh(['api', e]))
const post = (e, p) => JSON.parse(gh(['api', e, '--method', 'POST', '--input', '-'], JSON.stringify(p)))

const head = get(`repos/${OWNER}/${REPO}/git/ref/heads/main`).object.sha
const edited = [buildApp(), buildNav(), buildClaudeMd()]
for (const e of edited) if (e.content === show(e.path)) throw new Error(`${e.path}: no change`)
// MessageSquare must already be imported in navigation.js or the nav will crash
if (!edited[1].content.includes('MessageSquare')) throw new Error('navigation.js: MessageSquare icon missing')
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
