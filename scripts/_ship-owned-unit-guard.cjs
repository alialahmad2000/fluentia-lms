// Ships the owned-unit level-guard fix DIRECT-TO-MAIN via the GitHub Git Trees API.
// The local branch is shared with parallel sessions and stale vs main, so every blob
// is read from an isolated worktree checked out AT origin/main (WT below).
// Run:  GH_TOKEN=$(gh auth token) node scripts/_ship-owned-unit-guard.cjs
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OWNER = 'alialahmad2000', REPO = 'fluentia-lms';
const REPO_DIR = path.join(__dirname, '..');
const WT = '/private/tmp/claude-501/-Users-dr-ali/e9e84ca4-3180-4fbc-b3ad-031f40ff7bda/scratchpad/wt';

function gh(args, input) {
  const opts = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  if (input !== undefined) opts.input = input;
  return execFileSync('gh', args, opts);
}
function ghApi(endpoint, payload) {
  return JSON.parse(gh(['api', endpoint, '--method', 'POST', '--input', '-'], JSON.stringify(payload)));
}

const FILES = [
  'src/pages/student/curriculum/UnitContent.jsx',
  'src/pages/student/curriculum/UnitContentRouter.jsx',
  'public/version.json',
];
const FROM_REPO = ['scripts/_ship-owned-unit-guard.cjs'];

(async () => {
  // ── pre-flight: the worktree must still be exactly origin/main + my edits ──
  const wtBase = execFileSync('git', ['-C', WT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const originMain = execFileSync('git', ['-C', REPO_DIR, 'rev-parse', 'origin/main'], { encoding: 'utf8' }).trim();
  if (wtBase !== originMain) {
    throw new Error(`worktree base ${wtBase.slice(0, 8)} != origin/main ${originMain.slice(0, 8)} — rebase before shipping`);
  }

  const read = (p) => fs.readFileSync(path.join(WT, p), 'utf8');
  const uc = read('src/pages/student/curriculum/UnitContent.jsx');
  const ur = read('src/pages/student/curriculum/UnitContentRouter.jsx');
  const anchors = [
    [uc.includes('const ownsUnit = !!profile?.id && unit?.owner_student_id === profile.id'), 'UnitContent: ownsUnit derived'],
    [uc.includes('if (!levelKnown || ownsUnit) return'), 'UnitContent: guard exempts owned unit'],
    [uc.includes('ownsUnit, basePath, navigate]'), 'UnitContent: ownsUnit in deps'],
    [ur.includes('const ownsUnit = !!profile?.id && unit?.owner_student_id === profile.id'), 'UnitContentRouter: ownsUnit derived'],
    [ur.includes('if (ownsUnit) return'), 'UnitContentRouter: guard exempts owned unit'],
    [ur.includes('ownsUnit, navigate, basePath]'), 'UnitContentRouter: ownsUnit in deps'],
    // the shared-curriculum gate must SURVIVE in both files
    [(uc.match(/level_number > currentLevel/g) || []).length === 1, 'UnitContent: level gate still present'],
    [(ur.match(/level_number > currentLevel/g) || []).length === 1, 'UnitContentRouter: level gate still present'],
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

  const newTree = ghApi(`repos/${OWNER}/${REPO}/git/trees`, { base_tree: headCommit.tree.sha, tree });
  const commit = ghApi(`repos/${OWNER}/${REPO}/git/commits`, {
    message:
      'fix(curriculum): a student could not open a unit of their own bespoke course\n\n' +
      'سعيد عارف and عبدالله عارف run clones of ملاك\'s B1 marketing course while they sit at\n' +
      'A2 and A1. The unit page gates on `unit.level.level_number > studentData.academic_level`,\n' +
      'and a cloned course keeps the level_id it was authored under — so every one of their ten\n' +
      'units evaluated 3 > 2 and 3 > 1 and bounced them straight back to the level page. They\n' +
      'saw the ten unit cards, clicked one, and landed where they started. Both had zero progress\n' +
      'rows against their own units to show for it; the course has been unusable since it shipped.\n\n' +
      'A unit the student OWNS is now never level-gated. owner_student_id IS the entitlement:\n' +
      'level_number on a bespoke unit records where the CONTENT was cloned from, not what the\n' +
      'student is allowed to reach. The gate is untouched for the shared curriculum — verified\n' +
      'that an A1 student still bounces off a generic B1 unit.\n\n' +
      'Both copies of the guard are fixed. UnitContent.jsx (v2) and UnitContentRouter.jsx (v3)\n' +
      'carry the same copy-pasted effect, and a global layout flag decides which one mounts, so\n' +
      'fixing one would have left the bug live for half the students.\n\n' +
      'Verified in a browser on a production build against real sessions: before the change\n' +
      'سعيد\'s unit redirects to /student/curriculum/level/2; after it, the unit page holds and\n' +
      'renders. Same for عبدالله. The accompanying data fix (uses_custom_curriculum was false on\n' +
      'عبدالله, so his ten units were invisible to the query entirely) is applied separately;\n' +
      'both students keep the ordinary course via uses_standard_curriculum, which matters because\n' +
      'عبدالله has 48 completed sections in it.',
    tree: newTree.sha,
    parents: [headSha],
  });
  ghApi(`repos/${OWNER}/${REPO}/git/refs/heads/main`, { sha: commit.sha, force: false });
  console.log(`\n✅ pushed to main: ${commit.sha}`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
