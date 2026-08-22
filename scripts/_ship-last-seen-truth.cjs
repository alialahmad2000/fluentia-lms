// Ships the «آخر ظهور» truth pass DIRECT-TO-MAIN via the GitHub Git Trees API.
// The local checkout is a shared tree far diverged from main (it is missing
// src/pages/coordinator/* entirely) — never git-push it. All four EDITED files
// were derived from origin/main in a throwaway worktree and patched there.
// PRE-FLIGHT re-reads origin/main and aborts unless it still matches the exact
// baseline they were derived from.
//
// Run:  node scripts/_ship-last-seen-truth.cjs
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OWNER = 'alialahmad2000', REPO = 'fluentia-lms';
const REPO_DIR = path.join(__dirname, '..');
const SCRATCH = '/private/tmp/claude-501/-Users-dr-ali/cb179ffa-635b-4d5a-9160-c554973f95d9/scratchpad';
const WT = `${SCRATCH}/wt-main`;

function gh(args, input) {
  const opts = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  if (input !== undefined) opts.input = input;
  return execFileSync('gh', args, opts);
}
function ghApi(endpoint, payload) {
  return JSON.parse(gh(['api', endpoint, '--method', 'POST', '--input', '-'], JSON.stringify(payload)));
}

const EDITED = [
  { repo: 'src/pages/admin/AdminStudents.jsx',  src: `${WT}/src/pages/admin/AdminStudents.jsx`,  base: `${SCRATCH}/base/AdminStudents.jsx` },
  { repo: 'src/pages/admin/AdminTrainers.jsx',  src: `${WT}/src/pages/admin/AdminTrainers.jsx`,  base: `${SCRATCH}/base/AdminTrainers.jsx` },
  { repo: 'src/stores/authStore.js',            src: `${WT}/src/stores/authStore.js`,            base: `${SCRATCH}/base/authStore.js` },
  { repo: 'src/services/activityTracker.js',    src: `${WT}/src/services/activityTracker.js`,    base: `${SCRATCH}/base/activityTracker.js` },
];
const NEW_FILES = [
  { repo: 'supabase/migrations/20260822170000_fix_last_seen_truth.sql', src: `${SCRATCH}/20260822170000_fix_last_seen_truth.sql` },
  { repo: 'scripts/_ship-last-seen-truth.cjs', src: path.join(REPO_DIR, 'scripts/_ship-last-seen-truth.cjs') },
];

const CHANGELOG = `### 2026-08-22 — «آخر دخول» was wrong on 13/13 students — the admin roster now tells the truth
- **The bug Ali reported.** \`/admin/users\` showed «آخر دخول» from \`students.last_active_at\`, and **every single row was wrong**. Worst cases on 2026-08-22: **عبدالله 60 days shown / 2 real**, **الهنوف 48/18**, **سارة 32/11**, **ظافر «منذ ٢١ يومًا» in churn-red while he was studying that same morning** (reading passages, word lookups, audio, 11:51→13:27 Riyadh — proven from \`analytics_events\`). It read both ways: active students looked churned, and idle students looked recent.
- **Three stacked root causes.** (1) \`get_student_streak()\` returns \`last_active_date\`, but it walks activity dates DESC and keeps \`v_prev\` — the **oldest** day of the current consecutive run — so a student on a 4-day streak read as "4 days ago". (2) \`retention_daily_run()\` wrote that into \`students.last_active_at\` as \`date::timestamptz\` = **UTC midnight**, losing time-of-day and landing ~3h AHEAD of a Riyadh-evening session; it ran once a day, only for \`status='active'\`, and could **lower** the value. (3) The only evidence surface was \`unified_activity_log\`, which only records \`unit_tab_completed\` — a student **mid-unit leaves no trace at all**.
- **A fourth, separate bug froze the presence stamp.** \`tracker.init()\` was wired to the \`SIGNED_IN\` auth event only. A returning student resumes from a stored session (\`INITIAL_SESSION\`/\`TOKEN_REFRESHED\`) and never fired it, so \`profiles.last_active_at\` froze at the last time they typed their password — exactly matching \`max(user_sessions.started_at)\` for **all 13 students**. ظافر: 0 sessions in 30 days but 5 genuinely active days. Now initialised on every boot in \`initialize()\`; the heartbeat also no longer bails when the \`user_sessions\` INSERT failed (it used to drop the \`profiles\` stamp with it).
- **Fix.** New \`student_last_seen_at()\` ("was in the app": profiles, auth sign-in, sessions, analytics) and \`student_last_studied_at()\` ("did the work": activity log, self-earned XP, completions, feed — admin-awarded XP excluded). \`get_student_streak()\` corrected to return the newest day. \`sync_student_last_active()\` + a **10-minute cron** keeps the column fresh for **every** student, and a \`BEFORE UPDATE\` trigger means it can never regress again. \`admin_roster_activity()\` (admin/coach gated) feeds the roster both signals + 30-day active days. Verified: 13/13 rows now match the evidence exactly; anon → \`permission denied\`, a student JWT → \`not authorised\`; helpers revoked from \`authenticated\` so students cannot probe classmates.
- **The column is now «آخر ظهور»**, not «آخر دخول» — it never measured logins. When presence and real study diverge, a second line shows «درست قبل N أيام», and \`title=\` carries the exact Riyadh timestamp. Day counts are **Riyadh calendar days** (was \`Math.floor(ms/86_400_000)\`, i.e. 24h blocks, so 23:00 last night read «اليوم» all day). CSV now exports آخر ظهور + آخر دراسة + أيام نشطة.
- **Also corrected on the same page.** الباقة rendered the raw enum «private»/«recordings» on an Arabic page with **no price** (\`PACKAGES\` in \`lib/constants.js\` only knows asas/talaqa/tamayuz/ielts) → labelled «اشتراك فردي»/«التسجيلات» locally, deliberately NOT by adding keys to \`PACKAGES\`, because student-facing code does \`PACKAGES[pkg] || PACKAGES.asas\` and new keys would silently change those students' chatbot/writing limits. The «المدربون» chip read **5** for **3** real trainers (it counted \`role IN ('trainer','admin')\` including Ali and the seeded test trainer) → now counts non-test trainers only, and test staff cards carry a «تجريبي» badge.
- ⚠️ **Still open, reported not changed:** \`PACKAGES\` has no \`private\` entry, so student-facing billing shows a 2000–3000 ر.س private student «باقة أساس … 750 ر.س» and gives them asas limits. And the «المدربون» tab still hardcodes \`['trainer','admin']\`, so the \`coach\` (2) and \`coordinator\` (1) roles do not appear anywhere on it — the same "a new role needs every allow-list" class as before.
- Files: modified \`src/pages/admin/AdminStudents.jsx\`, \`src/pages/admin/AdminTrainers.jsx\`, \`src/stores/authStore.js\`, \`src/services/activityTracker.js\`; NEW \`supabase/migrations/20260822170000_fix_last_seen_truth.sql\`, \`scripts/_ship-last-seen-truth.cjs\`. Migration already applied to production.

`;

(async () => {
  execFileSync('git', ['fetch', 'origin', 'main', '-q'], { cwd: REPO_DIR });
  for (const f of EDITED) {
    const mainNow = execFileSync('git', ['show', `origin/main:${f.repo}`], { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32e6 });
    if (mainNow !== fs.readFileSync(f.base, 'utf8')) {
      throw new Error(`main moved under ${f.repo} — re-derive from origin/main before shipping (refusing to clobber)`);
    }
    if (fs.readFileSync(f.src, 'utf8') === fs.readFileSync(f.base, 'utf8')) {
      throw new Error(`${f.repo} is identical to main — nothing to ship?`);
    }
  }
  console.log(`pre-flight: all ${EDITED.length} edited files still based on main's current content ✓`);

  const parentSha = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/ref/heads/main`])).object.sha;
  const parentCommit = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/commits/${parentSha}`]));

  const claudeMeta = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/contents/CLAUDE.md?ref=${parentSha}`]));
  const claudeMain = Buffer.from(claudeMeta.content, 'base64').toString('utf8');
  const marker = '## CHANGE LOG (Claude Code: update this after EVERY task — newest first)';
  const claudeNew = claudeMain.includes(marker)
    ? claudeMain.replace(marker, `${marker}\n\n${CHANGELOG.trimEnd()}`)
    : `${claudeMain}\n\n${CHANGELOG}`;

  const tree = [];
  for (const f of [...EDITED, ...NEW_FILES]) {
    const blob = ghApi(`repos/${OWNER}/${REPO}/git/blobs`, {
      content: fs.readFileSync(f.src).toString('base64'), encoding: 'base64',
    });
    tree.push({ path: f.repo, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const claudeBlob = ghApi(`repos/${OWNER}/${REPO}/git/blobs`, { content: Buffer.from(claudeNew).toString('base64'), encoding: 'base64' });
  tree.push({ path: 'CLAUDE.md', mode: '100644', type: 'blob', sha: claudeBlob.sha });

  const newTree = ghApi(`repos/${OWNER}/${REPO}/git/trees`, { base_tree: parentCommit.tree.sha, tree });
  const message = "fix(admin): «آخر دخول» was wrong on 13/13 students — roster now shows real «آخر ظهور»\n\n"
    + "students.last_active_at came from get_student_streak(), which returns the OLDEST\n"
    + "day of the current streak run, written as a UTC-midnight date once a day for\n"
    + "active students only — and derived solely from unit_tab_completed, so a student\n"
    + "mid-unit left no trace. ظافر read «منذ ٢١ يومًا» in churn-red while studying that\n"
    + "morning; عبدالله showed 60 days against 2 real.\n\n"
    + "Adds student_last_seen_at()/student_last_studied_at() spanning every surface, a\n"
    + "10-minute sync + a never-regress trigger, and admin_roster_activity() for the\n"
    + "roster. Also fixes tracker.init() firing only on SIGNED_IN, which froze\n"
    + "profiles.last_active_at for every returning student.";
  const commit = ghApi(`repos/${OWNER}/${REPO}/git/commits`, { message, tree: newTree.sha, parents: [parentSha] });
  ghApi(`repos/${OWNER}/${REPO}/git/refs/heads/main`, { sha: commit.sha, force: false });
  console.log(`✅ pushed ${commit.sha.slice(0, 10)} to main (${tree.length} files, parent ${parentSha.slice(0, 10)})`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
