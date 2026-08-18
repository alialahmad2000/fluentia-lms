// Ships the single-write-path pass DIRECT-TO-MAIN via the GitHub Git Trees API.
// The local branch is shared with parallel sessions and stale vs main, so every
// blob is read from an isolated worktree checked out AT origin/main (WT below).
// Run:  GH_TOKEN=$(gh auth token) node scripts/_ship-save-path.cjs
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OWNER = 'alialahmad2000', REPO = 'fluentia-lms';
const REPO_DIR = path.join(__dirname, '..');
const WT = '/private/tmp/claude-501/-Users-dr-ali/1f4f426d-0cd9-4cfc-ad96-2a8db247fe09/scratchpad/save-wt';

function gh(args, input) {
  const opts = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  if (input !== undefined) opts.input = input;
  return execFileSync('gh', args, opts);
}
function ghApi(endpoint, payload) {
  return JSON.parse(gh(['api', endpoint, '--method', 'POST', '--input', '-'], JSON.stringify(payload)));
}

// repo-relative path -> absolute source (WT unless noted)
const FILES = [
  // ── the contract ──
  'supabase/migrations/20260818170000_save_activity_attempt.sql',
  // ── new client primitives ──
  'src/lib/saveOutbox.js',
  'src/hooks/useActivitySave.js',
  'src/components/ui/SaveStatus.jsx',
  // ── the seven save paths, now one ──
  'src/lib/activitySave.js',
  'src/components/grammar/ExerciseSection.jsx',
  'src/pages/student/curriculum/tabs/ReadingTab.jsx',
  'src/pages/student/curriculum/tabs/ListeningTab.jsx',
  'src/pages/student/curriculum/tabs/VocabularyExercises.jsx',
  'src/pages/student/curriculum/tabs/VocabularyTab.jsx',
  'src/pages/student/curriculum/tabs/WritingTab.jsx',
  'src/pages/student/curriculum/tabs/SpeakingTab.jsx',
  'src/components/curriculum/PronunciationActivity.jsx',
  // ── outbox replay installed at boot ──
  'src/main.jsx',
  // ── live client errors نورة's session threw ──
  'src/components/gamification/GamificationProvider.jsx',
  'src/lib/prefetchRegistry.js',
  'src/components/ai/StudentWowMoments.jsx',
  'src/pages/student/StudentAssignments.jsx',
  'src/pages/student/StudentDashboardOriginal.jsx',
  'src/pages/student/StudentDashboard.legacy.jsx',
  // ── PWA refresh so phones pick the new save path up ──
  'public/version.json',
];

// regression tests live in the main checkout, not the worktree
const FROM_REPO = [
  'scripts/_smoke-save-path.mjs',
  'scripts/_smoke-save-offline.mjs',
  'scripts/_ship-save-path.cjs',
];

// dead code: imported by zero files since before this pass
const DELETE = ['src/hooks/useResilientActivitySubmit.js'];

(async () => {
  // ── pre-flight: the worktree must still be exactly origin/main + my edits ──
  const wtBase = execFileSync('git', ['-C', WT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const originMain = execFileSync('git', ['-C', WT, 'rev-parse', 'origin/main'], { encoding: 'utf8' }).trim();
  if (wtBase !== originMain) {
    throw new Error(`worktree base ${wtBase.slice(0, 8)} != origin/main ${originMain.slice(0, 8)} — rebase before shipping`);
  }

  const read = (p) => fs.readFileSync(path.join(WT, p), 'utf8');
  const anchors = [
    [read('supabase/migrations/20260818170000_save_activity_attempt.sql').includes('create unique index if not exists scp_unique_attempt'), 'migration: unique attempt key'],
    [read('supabase/migrations/20260818170000_save_activity_attempt.sql').includes('v_is_service is not true'), 'migration: NULL-safe auth gate'],
    [read('src/lib/activitySave.js').includes('export async function saveAttempt'), 'lib: saveAttempt'],
    [read('src/lib/activitySave.js').includes('installSaveRecovery'), 'lib: outbox recovery'],
    [read('src/hooks/useActivitySave.js').includes('useCurriculumPreview'), 'hook: readOnly read inside the hook'],
    [read('src/main.jsx').includes('installSaveRecovery(supabase)'), 'boot: replay installed'],
    // the legacy shape must be gone from every migrated section
    ...['src/components/grammar/ExerciseSection.jsx',
        'src/pages/student/curriculum/tabs/ReadingTab.jsx',
        'src/pages/student/curriculum/tabs/ListeningTab.jsx',
        'src/pages/student/curriculum/tabs/VocabularyExercises.jsx',
        'src/pages/student/curriculum/tabs/VocabularyTab.jsx',
       ].map((f) => [!read(f).includes('updateRowVerified') && !read(f).includes('createSaveQueue'),
                     `${path.basename(f)}: legacy save primitives removed`]),
    [read('src/pages/student/curriculum/tabs/ReadingTab.jsx').includes('useActivitySave'), 'reading: on the hook'],
    [read('src/pages/student/curriculum/tabs/WritingTab.jsx').includes('useActivitySave'), 'writing: on the hook'],
    [read('src/components/gamification/GamificationProvider.jsx').includes("content_voice_url"), 'fix: submissions column'],
    [read('src/lib/prefetchRegistry.js').includes("order('generated_at'"), 'fix: weekly_task_sets ordering'],
  ];
  for (const [ok, name] of anchors) { if (!ok) throw new Error(`ANCHOR FAILED: ${name}`); }
  console.log(`✅ ${anchors.length}/${anchors.length} anchors match`);

  const head = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/ref/heads/main`]));
  const headSha = head.object.sha;
  if (headSha !== originMain) {
    throw new Error(`remote main moved to ${headSha.slice(0, 8)} — re-fetch and re-verify before shipping`);
  }
  const headCommit = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/commits/${headSha}`]));
  console.log(`base: main @ ${headSha.slice(0, 8)}`);

  const tree = [];
  const put = (repoPath, absDir) => {
    const content = fs.readFileSync(path.join(absDir, repoPath));
    const blob = ghApi(`repos/${OWNER}/${REPO}/git/blobs`, { content: content.toString('base64'), encoding: 'base64' });
    tree.push({ path: repoPath, mode: '100644', type: 'blob', sha: blob.sha });
    console.log(`  blob ${blob.sha.slice(0, 8)} ${repoPath}`);
  };
  for (const p of FILES) put(p, WT);
  for (const p of FROM_REPO) put(p, REPO_DIR);
  for (const p of DELETE) {
    tree.push({ path: p, mode: '100644', type: 'blob', sha: null });
    console.log(`  DELETE            ${p}`);
  }

  const newTree = ghApi(`repos/${OWNER}/${REPO}/git/trees`, { base_tree: headCommit.tree.sha, tree });
  const commit = ghApi(`repos/${OWNER}/${REPO}/git/commits`, {
    message:
      'fix(progress): one write path for student work — the app can no longer lose an answer silently\n\n' +
      'نورة reported finishing unit-2 grammar and finding it empty. The gateway logs settle that\n' +
      'one: on her only real session her device sent 16 GETs and ZERO writes to\n' +
      'student_curriculum_progress, and every per-activity load that day was reading_id — the\n' +
      'grammar section never mounted. Nothing was lost. But the investigation took gateway logs\n' +
      'that expire in days, because the platform could not tell a lost answer from an answer\n' +
      'never given. That is the actual bug, and it is what this fixes.\n\n' +
      'The contract moves into the database. save_activity_attempt() is idempotent (keyed on\n' +
      'student+section+activity+attempt), never shrinks a payload, never reopens a submitted\n' +
      'attempt, recomputes is_best/is_latest in the same transaction, and RETURNS the stored row\n' +
      'so the client verifies against reality instead of trusting HTTP 200. Duplicate attempt rows\n' +
      'are now impossible rather than merely unlikely: scp_unique_attempt. Admin impersonation is\n' +
      'refused by the database, so "view as student" can no longer write to a student record.\n\n' +
      'Seven hand-rolled save paths become one useActivitySave hook. Each of them reimplemented\n' +
      'if(rowId) UPDATE else INSERT plus its own order-dependent is_best recompute, and each had\n' +
      'to be fixed separately every time that shape produced a bug. readOnly is now read INSIDE\n' +
      'the hook, so the parent-scoped ReferenceError that silently killed listening saves for\n' +
      'three days is no longer expressible.\n\n' +
      'Work is durable before it is sent: every save lands in an IndexedDB outbox first and\n' +
      'replays on reconnect, and SaveStatus tells the student whether her work is on the server —\n' +
      'the silence is what let four rounds of fixes go unnoticed.\n\n' +
      'Also fixed, all found in her session: updated_at was never maintained (no trigger, so every\n' +
      '"last active" report was wrong), activity_feed had RLS on with zero policies (reads empty,\n' +
      'writes 403), weekly_task_sets was ordered by a column that does not exist, and submissions\n' +
      'was queried for voice_url instead of content_voice_url.\n\n' +
      'Verified: 16/16 behavioural tests against the live RPC as a student JWT, and 9/9 browser\n' +
      'tests on a production build — including answering 16 questions offline, seeing the amber\n' +
      '"saved on your device" pill, and watching the work replay by itself on reload.',
    tree: newTree.sha,
    parents: [headSha],
  });
  ghApi(`repos/${OWNER}/${REPO}/git/refs/heads/main`, { sha: commit.sha, force: false });
  console.log(`\n✅ pushed to main: ${commit.sha}`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
