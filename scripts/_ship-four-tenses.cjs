// Ships the Four-Tenses task artifacts DIRECT-TO-MAIN via the GitHub Git Trees API,
// as TWO atomic commits (per-logical-unit rule):
//   1. feat(tasks): seed + verify scripts (the task-data unit)
//   2. feat(exercises): learn/per-question-check glue + nav gating (the UI unit)
// Edited nav files were ported onto fresh origin/main copies in the session scratchpad.
// Run:  GH_TOKEN=$(gh auth token) node scripts/_ship-four-tenses.cjs
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OWNER = 'alialahmad2000', REPO = 'fluentia-lms';
const REPO_DIR = path.join(__dirname, '..');
const SCRATCH = '/private/tmp/claude-501/-Users-dr-ali/01e1f9dc-b087-4844-a651-c08fa6fac786/scratchpad/ft-base';

function gh(args, input) {
  const opts = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  if (input !== undefined) opts.input = input;
  return execFileSync('gh', args, opts);
}
function ghApi(endpoint, payload) {
  return JSON.parse(gh(['api', endpoint, '--method', 'POST', '--input', '-'], JSON.stringify(payload)));
}

const COMMITS = [
  {
    message: 'feat(tasks): Four Tenses transformation task (learn + 36 auto-graded questions), assigned to Dhafer\n\n' +
      'targeted_exercises row seeded (skill=grammar, per-student, accepted_answers variants,\n' +
      'rule-based local grading — no AI). Includes the RLS/scoping verify script.',
    files: {
      'scripts/seed-dhafer-four-tenses.cjs': null,
      'scripts/_verify-four-tenses.cjs': null,
      'scripts/_ship-four-tenses.cjs': null,
    },
  },
  {
    message: 'feat(exercises): learn-then-test + per-question check glue, single-student nav gating\n\n' +
      'StudentExercises: LearnSection renderer, check_mode=per_question instant validate (answer\n' +
      'preserved, correct shown green), seed-context cards, LTR rewrite inputs, score-templated\n' +
      'encouragement. Nav «تمارين مخصّصة» gated on targeted-exercises-count (course-vocab pattern)\n' +
      'in navigation/Sidebar/MobileDrawer. CLAUDE.md changelog.',
    files: {
      'src/pages/student/StudentExercises.jsx': null, // local file is in sync with origin/main + our edits
      'src/config/navigation.js': `${SCRATCH}/navigation.js`,
      'src/components/layout/Sidebar.jsx': `${SCRATCH}/Sidebar.jsx`,
      'src/components/layout/MobileDrawer.jsx': `${SCRATCH}/MobileDrawer.jsx`,
      'CLAUDE.md': `${SCRATCH}/CLAUDE.md`,
    },
  },
];

(async () => {
  // anchors on the ported files
  const nav = fs.readFileSync(`${SCRATCH}/navigation.js`, 'utf8');
  const side = fs.readFileSync(`${SCRATCH}/Sidebar.jsx`, 'utf8');
  const draw = fs.readFileSync(`${SCRATCH}/MobileDrawer.jsx`, 'utf8');
  const anchors = [
    [(nav.match(/custom-exercises/g) || []).length === 2, 'nav: item in sections + drawerSections'],
    [nav.includes("id: 'biz-track'"), 'nav: biz-track preserved'],
    [side.includes("targeted-exercises-count' && targetedExercisesCount <= 0"), 'Sidebar: gate'],
    [side.includes('course-vocab-count'), 'Sidebar: existing gates preserved'],
    [draw.includes("targeted-exercises-count' && targetedExercisesCount <= 0"), 'Drawer: gate'],
  ];
  for (const [ok, name] of anchors) { if (!ok) throw new Error(`ANCHOR FAILED: ${name}`); }
  console.log(`✅ ${anchors.length}/5 anchors match`);

  let parentSha = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/ref/heads/main`])).object.sha;
  for (const c of COMMITS) {
    const parentCommit = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/commits/${parentSha}`]));
    const tree = [];
    for (const [repoPath, local] of Object.entries(c.files)) {
      const abs = local || path.join(REPO_DIR, repoPath);
      const blob = ghApi(`repos/${OWNER}/${REPO}/git/blobs`, { content: fs.readFileSync(abs).toString('base64'), encoding: 'base64' });
      tree.push({ path: repoPath, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const newTree = ghApi(`repos/${OWNER}/${REPO}/git/trees`, { base_tree: parentCommit.tree.sha, tree });
    const commit = ghApi(`repos/${OWNER}/${REPO}/git/commits`, { message: c.message, tree: newTree.sha, parents: [parentSha] });
    ghApi(`repos/${OWNER}/${REPO}/git/refs/heads/main`, { sha: commit.sha, force: false });
    console.log(`✅ pushed: ${commit.sha.slice(0, 10)} — ${c.message.split('\n')[0]}`);
    parentSha = commit.sha;
  }
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
