// Ships the Business Track «مسار الأعمال» + ظافر provisioning artifacts DIRECT-TO-MAIN
// via the GitHub Git Trees API (local tree is shared with parallel sessions + stale vs main).
// Edited files (App.jsx / navigation.js / CourseVocabulary.jsx / CLAUDE.md) were ported onto
// origin/main content in the session scratchpad — this script reads them from SCRATCH.
// Run:  GH_TOKEN=$(gh auth token) node scripts/_ship-biz-track.cjs
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OWNER = 'alialahmad2000', REPO = 'fluentia-lms';
const REPO_DIR = path.join(__dirname, '..');
const SCRATCH = '/private/tmp/claude-501/-Users-dr-ali/01e1f9dc-b087-4844-a651-c08fa6fac786/scratchpad/main-base';

function gh(args, input) {
  const opts = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  if (input !== undefined) opts.input = input;
  return execFileSync('gh', args, opts);
}
function ghApi(endpoint, payload) {
  return JSON.parse(gh(['api', endpoint, '--method', 'POST', '--input', '-'], JSON.stringify(payload)));
}

// repo-relative path -> absolute local file to read
const FILES = {
  // ── new: biz-track frontend module ──
  'src/components/biz-track/BizTrackGuard.jsx': null,
  'src/pages/student/biz-track/BizTrackHome.jsx': null,
  'src/pages/student/biz-track/BizLessonPage.jsx': null,
  'src/pages/student/biz-track/BizPassage.jsx': null,
  'src/pages/student/biz-track/BizQuiz.jsx': null,
  'src/pages/student/biz-track/useBizTrack.js': null,
  'src/pages/student/biz-track/bizTrack.css': null,
  // ── new: DB + scripts + content ──
  'supabase/migrations/20260716090000_biz_track.sql': null,
  'supabase/migrations/20260716100000_students_entitlement_guard.sql': null,
  'scripts/provision-dhafer-alquhidan.cjs': null,
  'scripts/insert-biz-track.cjs': null,
  'scripts/_verify-biz-track.cjs': null,
  'scripts/_verify-entitlement-guard.cjs': null,
  'scripts/_verify-guard-admin-path.cjs': null,
  'scripts/_ship-biz-track.cjs': null,
  // ── edited (ported onto origin/main in scratchpad) ──
  'src/App.jsx': `${SCRATCH}/App.jsx`,
  'src/config/navigation.js': `${SCRATCH}/navigation.js`,
  'src/pages/student/CourseVocabulary.jsx': `${SCRATCH}/CourseVocabulary.jsx`,
  'CLAUDE.md': `${SCRATCH}/CLAUDE.md`,
};
// content dirs (biz authored + tech preservation)
for (let n = 1; n <= 10; n++) FILES[`scripts/biz-track-content/stage-${n}.json`] = null;
FILES['scripts/biz-track-content/SPEC.md'] = null;
for (const f of fs.readdirSync(path.join(REPO_DIR, 'scripts/tech-track-content'))) {
  FILES[`scripts/tech-track-content/${f}`] = null;
}

(async () => {
  // anchors: assert the scratchpad ports actually contain the additions
  const appSrc = fs.readFileSync(`${SCRATCH}/App.jsx`, 'utf8');
  const navSrc = fs.readFileSync(`${SCRATCH}/navigation.js`, 'utf8');
  const cvSrc = fs.readFileSync(`${SCRATCH}/CourseVocabulary.jsx`, 'utf8');
  const anchors = [
    [appSrc.includes("import BizTrackGuard from './components/biz-track/BizTrackGuard'"), 'App: guard import'],
    [appSrc.includes('path="/biz/:lessonSlug"'), 'App: biz routes'],
    [appSrc.includes('TechTrackGuard'), 'App: tech routes preserved'],
    [navSrc.includes("id: 'biz-track', label: 'مسار الأعمال'"), 'nav: BIZ_TRACK_ITEM'],
    [navSrc.includes('uses_biz_track === true'), 'nav: gate check'],
    [navSrc.includes('injectTechTrack(nav)'), 'nav: tech injection preserved'],
    [cvSrc.includes("source: 'uni:AUTO-CARS'"), 'CourseVocab: ظافر entries'],
    [cvSrc.includes("source: 'uni:CS-PROG'"), 'CourseVocab: أطياف entries preserved'],
  ];
  for (const [ok, name] of anchors) { if (!ok) throw new Error(`ANCHOR FAILED: ${name}`); }
  console.log(`✅ ${anchors.length}/8 anchors match`);

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
    message: 'feat(biz-track): «مسار الأعمال» gated business track (10 stages/30 lessons) + provision ظافر آل قهيدان\n\n' +
      'New private student (automotive business + finance + business growth). Gated /biz surface\n' +
      'mirrors the tech-track architecture (biz_track_* tables, RPC-only progress writes, masculine\n' +
      'Arabic via useG). Nav «مسار الأعمال» + 4 course-vocab catalog entries. Also preserves the\n' +
      'tech-track SPEC/content JSONs into the repo (were only in a volatile /tmp scratchpad).',
    tree: newTree.sha,
    parents: [headSha],
  });
  ghApi(`repos/${OWNER}/${REPO}/git/refs/heads/main`, { sha: commit.sha, force: false });
  console.log(`\n✅ pushed to main: ${commit.sha}`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
