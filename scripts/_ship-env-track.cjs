// Ships the Environment Track «مسار البيئة» + نورة provisioning artifacts DIRECT-TO-MAIN
// via the GitHub Git Trees API (local branch is shared with parallel sessions + stale vs main).
// App.jsx was ported onto origin/main content in the session scratchpad — read from SCRATCH.
// navigation.js in the working tree == origin/main + ONLY the env additions (verified clean diff).
// Run:  GH_TOKEN=$(gh auth token) node scripts/_ship-env-track.cjs
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OWNER = 'alialahmad2000', REPO = 'fluentia-lms';
const REPO_DIR = path.join(__dirname, '..');
const SCRATCH_APP = '/private/tmp/claude-501/-Users-dr-ali/a9401cea-7f3a-4fc8-91b3-51eab41f0bb1/scratchpad/mainsrc/App.jsx';

function gh(args, input) {
  const opts = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  if (input !== undefined) opts.input = input;
  return execFileSync('gh', args, opts);
}
function ghApi(endpoint, payload) {
  return JSON.parse(gh(['api', endpoint, '--method', 'POST', '--input', '-'], JSON.stringify(payload)));
}

// repo-relative path -> absolute local file (null = read from REPO_DIR/working tree)
const FILES = {
  // ── new: env-track frontend module ──
  'src/components/env-track/EnvTrackGuard.jsx': null,
  'src/pages/student/env-track/EnvTrackHome.jsx': null,
  'src/pages/student/env-track/EnvLessonPage.jsx': null,
  'src/pages/student/env-track/EnvPassage.jsx': null,
  'src/pages/student/env-track/EnvQuiz.jsx': null,
  'src/pages/student/env-track/useEnvTrack.js': null,
  'src/pages/student/env-track/envTrack.css': null,
  // ── new: DB migration + scripts + content ──
  'supabase/migrations/20260720120000_env_track.sql': null,
  'scripts/provision-noura-aldosari.cjs': null,
  'scripts/insert-env-track.cjs': null,
  'scripts/seed-noura-worksheet.cjs': null,
  'scripts/_verify-env-track.cjs': null,
  'scripts/_ship-env-track.cjs': null,
  'scripts/env-track-content/SPEC.md': null,
  // ── edited: navigation.js (working tree = origin/main + only env additions, verified) ──
  'src/config/navigation.js': null,
  // ── edited: App.jsx (ported onto origin/main in scratchpad) ──
  'src/App.jsx': SCRATCH_APP,
};
for (let n = 1; n <= 10; n++) FILES[`scripts/env-track-content/stage-${n}.json`] = null;

(async () => {
  // anchors
  const appSrc = fs.readFileSync(SCRATCH_APP, 'utf8');
  const navSrc = fs.readFileSync(path.join(REPO_DIR, 'src/config/navigation.js'), 'utf8');
  const anchors = [
    [appSrc.includes("import EnvTrackGuard from './components/env-track/EnvTrackGuard'"), 'App: env guard import'],
    [appSrc.includes('path="/env/:lessonSlug"'), 'App: env routes'],
    [appSrc.includes('BizTrackGuard'), 'App: biz routes preserved'],
    [appSrc.includes('TechTrackGuard'), 'App: tech routes preserved'],
    [navSrc.includes("id: 'env-track', label: 'مسار البيئة'"), 'nav: ENV_TRACK_ITEM'],
    [navSrc.includes('uses_env_track === true'), 'nav: gate check'],
    [navSrc.includes('injectBizTrack(nav)'), 'nav: biz injection preserved'],
    [navSrc.includes('injectTechTrack(nav)'), 'nav: tech injection preserved'],
  ];
  for (const [ok, name] of anchors) { if (!ok) throw new Error(`ANCHOR FAILED: ${name}`); }
  console.log(`✅ ${anchors.length}/${anchors.length} anchors match`);

  const head = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/ref/heads/main`]));
  const headSha = head.object.sha;
  const headCommit = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/commits/${headSha}`]));
  console.log(`base: main @ ${headSha.slice(0, 8)}`);

  const tree = [];
  for (const [repoPath, local] of Object.entries(FILES)) {
    const abs = local || path.join(REPO_DIR, repoPath);
    const content = fs.readFileSync(abs);
    const blob = ghApi(`repos/${OWNER}/${REPO}/git/blobs`, { content: content.toString('base64'), encoding: 'base64' });
    tree.push({ path: repoPath, mode: '100644', type: 'blob', sha: blob.sha });
    console.log(`  blob ${blob.sha.slice(0, 8)} ${repoPath}`);
  }

  const newTree = ghApi(`repos/${OWNER}/${REPO}/git/trees`, { base_tree: headCommit.tree.sha, tree });
  const commit = ghApi(`repos/${OWNER}/${REPO}/git/commits`, {
    message: 'feat(env-track): «مسار البيئة» gated environment track (10 stages/30 lessons) + provision نورة خالد الدوسري\n\n' +
      'New private A2 student (wildlife, environment & ecotourism — National Center for Wildlife).\n' +
      'Gated /env surface mirrors the tech/biz-track architecture (env_track_* tables, RPC-only\n' +
      'progress writes, FEMININE Arabic via useG). Nav «مسار البيئة» (Leaf). She also gets the\n' +
      'normal A2 curriculum + a field-themed «تمارين مخصّصة» worksheet + 4 course-vocab collections.\n' +
      'uses_env_track added to the entitlement guard Tier A.',
    tree: newTree.sha,
    parents: [headSha],
  });
  ghApi(`repos/${OWNER}/${REPO}/git/refs/heads/main`, { sha: commit.sha, force: false });
  console.log(`\n✅ pushed to main: ${commit.sha}`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
