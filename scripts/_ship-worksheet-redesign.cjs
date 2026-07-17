// Ships the «تمارين مخصّصة» warm-worksheet redesign DIRECT-TO-MAIN via the GitHub Git
// Trees API (the local branch is a shared tree with parallel-session WIP — never git-push it).
// One atomic commit. CLAUDE.md changelog is based on origin/main's CURRENT content (fetched
// fresh) so parallel-session changelog edits are not clobbered.
// Run:  node scripts/_ship-worksheet-redesign.cjs
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OWNER = 'alialahmad2000', REPO = 'fluentia-lms';
const REPO_DIR = path.join(__dirname, '..');

function gh(args, input) {
  const opts = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  if (input !== undefined) opts.input = input;
  return execFileSync('gh', args, opts);
}
function ghApi(endpoint, payload) {
  return JSON.parse(gh(['api', endpoint, '--method', 'POST', '--input', '-'], JSON.stringify(payload)));
}

// code files pushed as-is from the local tree (fully self-contained rewrites / new files)
const CODE_FILES = [
  'src/pages/student/StudentExercises.jsx',
  'src/pages/student/studentExercises.css',
  'src/pages/student/exercises/WorksheetView.jsx',
  'src/pages/student/exercises/generalExercises.js',
  'scripts/seed-dhafer-worksheet.cjs',
  'scripts/_ship-worksheet-redesign.cjs',
];

const CHANGELOG = `### 2026-07-17 — «تمارين مخصّصة» → warm "worksheet" surface (Ali's artifact aesthetic) + task-as-worksheet
- Ali rejected the dark violet "Intelligence Lab" listing (row of zeros + thin task strip) and pointed at his cream «ورقة تحويل الأزمنة» artifact as the bar. Rebuilt the whole surface warm/editorial (paper #f4ecdd · card #fffdf8 · amber #b26a1b · teal #2f7d72, Georgia serif + SF Arabic, warm radial-bloom bg; palette PINNED on .pw-root so it renders identically under any app theme).
- LISTING (\`StudentExercises.jsx\` rewrite): masthead «طلاقة · Fluentia» + serif title + teal EN subtitle; progress ledger = 4 floating tiles (ring + «لم تُقيَّم بعد» ghost chip instead of a naked em-dash, number-as-hero); big worksheet task card with a real mini-worksheet thumbnail; completed rows + warm empty-state. General-practice bank extracted to \`exercises/generalExercises.js\`; a compact warm ExerciseRunner covers the (dormant) MC fallback.
- WORKSHEET (NEW \`exercises/WorksheetView.jsx\`, routed by \`content.render==='worksheet'\`): faithful port of the artifact — brand masthead, «طريقة الحل» + «مثال محلول», numbered tense sections as a 4-col transformation table (Given→Aff/Neg/Q/Wh) where the GIVEN cell VARIES per row (Ali's ask: randomised so the student derives the other three); grade-on-submit → score/XP + per-blank ✓ model reveal; print/PDF (@media print). Grades via the existing submitMutation (validateAnswer over accepted_answers) — no new grade path, NO AI.
- CONTENT: ظافر's «الأزمنة الأربعة — تحويل الجُمل» task (targeted_exercises cc35b725) re-authored to the worksheet schema — automotive-business themed (engine / spare parts / invoice / brakes), 4 tenses × 3 rows, given form balanced 3-each across aff/neg/q/wh, 36 gradable blanks. Idempotent + pending-only guard: \`scripts/seed-dhafer-worksheet.cjs\` (already applied to prod DB).
- Verified: design-loop (premium-ui-critic 6.5 → rebuilt ledger + unified badges + real thumbnail), real-app screenshots (desktop + mobile, cohesive with the app shell), full fill→submit→grade→reveal→XP flow on the mock account (cleaned up), arabic-copy-reviewer SHIP after wrapping every shared-chrome 2nd-person imperative in gender-aware \`g()\` pairs, esbuild bundle-resolution clean.
- Files: \`src/pages/student/StudentExercises.jsx\` (rewrite), \`src/pages/student/studentExercises.css\` (rewrite → warm), NEW \`src/pages/student/exercises/{WorksheetView.jsx,generalExercises.js}\`, \`scripts/seed-dhafer-worksheet.cjs\` (NEW). DB: targeted_exercises cc35b725 content updated. No schema / edge / nav changes.

`;

(async () => {
  // 1) fresh main SHA + tree
  const parentSha = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/ref/heads/main`])).object.sha;
  const parentCommit = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/commits/${parentSha}`]));

  // 2) CLAUDE.md based on origin/main (prepend changelog under the CHANGE LOG header)
  const claudeMeta = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/contents/CLAUDE.md?ref=${parentSha}`]));
  const claudeMain = Buffer.from(claudeMeta.content, 'base64').toString('utf8');
  const marker = '## CHANGE LOG (Claude Code: update this after EVERY task — newest first)';
  let claudeNew;
  if (claudeMain.includes(marker)) {
    claudeNew = claudeMain.replace(marker, `${marker}\n\n${CHANGELOG.trimEnd()}`);
  } else {
    claudeNew = claudeMain + `\n\n${CHANGELOG}`;
  }

  // 3) build tree
  const tree = [];
  for (const repoPath of CODE_FILES) {
    const blob = ghApi(`repos/${OWNER}/${REPO}/git/blobs`, {
      content: fs.readFileSync(path.join(REPO_DIR, repoPath)).toString('base64'), encoding: 'base64',
    });
    tree.push({ path: repoPath, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const claudeBlob = ghApi(`repos/${OWNER}/${REPO}/git/blobs`, { content: Buffer.from(claudeNew).toString('base64'), encoding: 'base64' });
  tree.push({ path: 'CLAUDE.md', mode: '100644', type: 'blob', sha: claudeBlob.sha });

  const newTree = ghApi(`repos/${OWNER}/${REPO}/git/trees`, { base_tree: parentCommit.tree.sha, tree });
  const message = 'feat(exercises): warm "worksheet" redesign of تمارين مخصّصة + tense-transformation worksheet\n\n' +
    'Rebuilds the per-student assigned-task surface in the approved cream editorial aesthetic.\n' +
    'Four-tenses task now opens as an interactive worksheet (given cell varies per row, grade+reveal, print).';
  const commit = ghApi(`repos/${OWNER}/${REPO}/git/commits`, { message, tree: newTree.sha, parents: [parentSha] });
  ghApi(`repos/${OWNER}/${REPO}/git/refs/heads/main`, { sha: commit.sha, force: false });
  console.log(`✅ pushed ${commit.sha.slice(0, 10)} to main (${tree.length} files) — ${message.split('\n')[0]}`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
