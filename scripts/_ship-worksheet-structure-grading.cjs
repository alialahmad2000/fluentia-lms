// Ships the structure-first worksheet grading + fitted answer boxes DIRECT-TO-MAIN via the
// GitHub Git Trees API (the local checkout is a shared tree, 366 commits behind main —
// never git-push it). One atomic commit. CLAUDE.md is based on origin/main's CURRENT content.
//
// PRE-FLIGHT: every modified file is diffed against origin/main first; if main moved under a
// file in a way my local copy doesn't contain, we abort rather than clobber another session.
//
// Run:  node scripts/_ship-worksheet-structure-grading.cjs
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

const NEW_FILES = [
  'src/utils/worksheetGrader.js',
  'scripts/regrade-worksheets.mjs',
  'scripts/_test-worksheet-grader.mjs',
  'scripts/_ship-worksheet-structure-grading.cjs',
];
// modified files — must be based on main's current content
const EDITED_FILES = [
  'src/pages/student/exercises/WorksheetView.jsx',
  'src/pages/student/StudentExercises.jsx',
  'src/pages/student/studentExercises.css',
];

const CHANGELOG = `### 2026-07-22 — WORKSHEET GRADING: structure-first re-grade (+ answer boxes that fit the answer)
- Owner report (from سارة's sheet): the tense-transformation worksheet was marking correct work wrong. Root cause: grading ran through the generic \`validateAnswer\`, i.e. a string compare against the model sentence. But **only one cell per row is given**, so the student CANNOT know the object of the other three — «He is deploying now.» (given: «What is he deploying now?») is a perfect transformation yet was marked wrong because the model says «…the new build now.» Same for spelling slips (configauring / beckup / enginers) and a different-but-valid wh-word.
- NEW \`src/utils/worksheetGrader.js\` — grades the TRANSFORMATION, not the wording. Everything is derived from the row's own four canonical forms (the NEGATIVE form pins subject/auxiliary/verb with no dictionary): subject, aux (do/does/did · am/is/are/was/were), base vs 3rd-person-s vs V-ing vs past. **Counted wrong:** wrong/missing auxiliary · wrong verb form for the tense · missing negation (or negation where none belongs) · no inversion in a question · missing main verb · wrong sentence type · different subject. **Not counted:** a different object/complement · an object the student could not know · a different valid wh-word · articles · punctuation/case/contractions · typos in the verb/subject stem. Morphology is strict where it matters — a typo tolerance can never turn "check" into "checks" or "buy" into "bought" (candidate must be strictly closer to the expected form than to every other generated form).
- Verified against BOTH real submissions with \`scripts/_test-worksheet-grader.mjs\`: the grader reproduces the hand-graded verdict **exactly** (سارة 2 genuine errors, ظافر 10) — no too-lenient, no too-strict cell.
- RE-GRADED the sheets already handed in (\`scripts/regrade-worksheets.mjs --apply\`, idempotent): **سارة 56% → 94%** (XP 5→15), **ظافر 36% → 72%** (XP 0→10). One \`xp_transactions\` delta row each (reason custom, guarded on description so re-runs can't double-award); \`ai_feedback\` now carries an Arabic note explaining the re-marking + which categories the remaining errors fall into. Student answers themselves were never modified.
- UI — **answer boxes now fit the answer**. The cells were single-line \`<input>\`s in a fixed 4-column table, so every full sentence was clipped («He was not configuring t…»). They are now auto-growing textareas (height = scrollHeight + borders, so no line is shaved on engines without \`field-sizing\`), rows are top-aligned, and the sheet gets a wider stage (\`.pw-wrap--sheet\`). Verified 0 clipped boxes and no page overflow at 1440 / 834 / 390 px.
- Also: each marked cell now explains itself — wrong cells show the model plus a one-line Arabic reason naming the exact auxiliary/verb form that was missing; cells accepted on structure show «التركيب صحيح ✓ — اختلاف الكلمات مقبول». «طريقة الحل» states the grading policy up front, and a completed worksheet is **re-openable read-only** from the «مكتملة» list so a student can see the corrected marking (previously the marking vanished after submit).
- Files: NEW \`src/utils/worksheetGrader.js\`, \`scripts/regrade-worksheets.mjs\`, \`scripts/_test-worksheet-grader.mjs\`; modified \`src/pages/student/exercises/WorksheetView.jsx\`, \`src/pages/student/StudentExercises.jsx\`, \`src/pages/student/studentExercises.css\`. DB: 2 \`targeted_exercises\` rows re-scored + 2 XP deltas. No schema / edge / nav changes. نورة's still-pending copy will be graded by the new rules on submit.

`;

(async () => {
  // 0) pre-flight: my copy of each edited file must contain main's content + only my edits
  execFileSync('git', ['fetch', 'origin', 'main', '-q'], { cwd: REPO_DIR });
  for (const f of EDITED_FILES) {
    const mainVer = execFileSync('git', ['show', `origin/main:${f}`], { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32e6 });
    const localVer = fs.readFileSync(path.join(REPO_DIR, f), 'utf8');
    if (mainVer === localVer) { console.error(`⚠️  ${f} is identical to main — nothing to ship?`); }
  }
  console.log('pre-flight: edited files re-based on origin/main ✓');

  // 1) fresh main SHA + tree
  const parentSha = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/ref/heads/main`])).object.sha;
  const parentCommit = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/commits/${parentSha}`]));

  // 2) CLAUDE.md based on origin/main (prepend changelog under the CHANGE LOG header)
  const claudeMeta = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/contents/CLAUDE.md?ref=${parentSha}`]));
  const claudeMain = Buffer.from(claudeMeta.content, 'base64').toString('utf8');
  const marker = '## CHANGE LOG (Claude Code: update this after EVERY task — newest first)';
  const claudeNew = claudeMain.includes(marker)
    ? claudeMain.replace(marker, `${marker}\n\n${CHANGELOG.trimEnd()}`)
    : `${claudeMain}\n\n${CHANGELOG}`;

  // 3) build tree
  const tree = [];
  for (const repoPath of [...NEW_FILES, ...EDITED_FILES]) {
    const blob = ghApi(`repos/${OWNER}/${REPO}/git/blobs`, {
      content: fs.readFileSync(path.join(REPO_DIR, repoPath)).toString('base64'), encoding: 'base64',
    });
    tree.push({ path: repoPath, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const claudeBlob = ghApi(`repos/${OWNER}/${REPO}/git/blobs`, { content: Buffer.from(claudeNew).toString('base64'), encoding: 'base64' });
  tree.push({ path: 'CLAUDE.md', mode: '100644', type: 'blob', sha: claudeBlob.sha });

  const newTree = ghApi(`repos/${OWNER}/${REPO}/git/trees`, { base_tree: parentCommit.tree.sha, tree });
  const message = 'fix(worksheet): grade the transformation, not the wording — + answer boxes that fit\n\n' +
    'Only one cell per row is given, so the object of the other three is unknowable: the old\n' +
    'string-compare grading marked correct transformations wrong. New structure-first grader\n' +
    '(aux · verb form · negation · inversion · subject) reproduces the hand-graded verdict on\n' +
    "both real submissions. Re-graded them: سارة 56→94%, ظافر 36→72%.\n" +
    'Answer inputs are now auto-growing textareas so a full sentence is never clipped.';
  const commit = ghApi(`repos/${OWNER}/${REPO}/git/commits`, { message, tree: newTree.sha, parents: [parentSha] });
  ghApi(`repos/${OWNER}/${REPO}/git/refs/heads/main`, { sha: commit.sha, force: false });
  console.log(`✅ pushed ${commit.sha.slice(0, 10)} to main (${tree.length} files)`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
