// Ships أنوار's adjectives worksheet tooling + the restored submit-confirm guard
// DIRECT-TO-MAIN via the GitHub Git Trees API. The local checkout is a shared tree far
// diverged from main — never git-push it.
//
// The two EDITED frontend files are read from the scratchpad, where they were derived
// from origin/main and patched. PRE-FLIGHT re-reads origin/main and aborts unless it
// still matches the exact baseline they were derived from — this is precisely the step
// 2fcbbdcb skipped when it shipped a stale StudentExercises.jsx and silently clobbered
// the answer-loss guard from 6b52b677.
//
// Run:  node scripts/_ship-anwar-adjectives.cjs
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OWNER = 'alialahmad2000', REPO = 'fluentia-lms';
const REPO_DIR = path.join(__dirname, '..');
const SCRATCH = '/private/tmp/claude-501/-Users-dr-ali/e5bd45ae-a9b9-4b96-a2ed-103fc36e5c82/scratchpad';

function gh(args, input) {
  const opts = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  if (input !== undefined) opts.input = input;
  return execFileSync('gh', args, opts);
}
function ghApi(endpoint, payload) {
  return JSON.parse(gh(['api', endpoint, '--method', 'POST', '--input', '-'], JSON.stringify(payload)));
}

// repo path → the patched file on disk, plus the origin/main baseline it was derived from
const EDITED = [
  { repo: 'src/pages/student/StudentExercises.jsx',
    src: `${SCRATCH}/main-StudentExercises.jsx`, base: `${SCRATCH}/base/StudentExercises.jsx` },
  { repo: 'src/pages/student/exercises/WorksheetView.jsx',
    src: `${SCRATCH}/main-WorksheetView.jsx`, base: `${SCRATCH}/base/WorksheetView.jsx` },
];
// new files, taken straight from the working tree (they exist nowhere on main)
const NEW_FILES = [
  'scripts/seed-anwar-adjectives-worksheet.cjs',
  'scripts/_test-anwar-adjectives.mjs',
  'scripts/_ship-anwar-adjectives.cjs',
];

const CHANGELOG = `### 2026-08-05 — أنوار: «العائلات الأربع للصفات» worksheet + RESTORED the worksheet answer-loss guard
- **أنوار's adjectives worksheet is live** — \`targeted_exercises\` row \`ea604a89\`, built from the printed Grammar Lab sheet «The Architecture of Adjectives» (\`~/Downloads/Fluentia-Adjectives-Worksheet.pdf\`). Pages 2–6 become \`content.learn\` (8 blocks: the four-family map, Base, Derived + the 8-suffix table, the one \`-ing\`/\`-ed\` rule, the "I am boring" trap, 16 common pairs, Compound, 7 traps); pages 7–9 become **54 questions**; page 10's answer key is the source of truth for every \`correct_answer\`. Surfaces on the existing «تمارين مخصّصة» nav (gated \`visibleWhen:'targeted-exercises-count'\`) — she had 0 targeted rows, so the item appears for her now with **no nav change**. All Arabic is FEMININE (اقرئي/صنّفي/حوّلي). Seed: \`scripts/seed-anwar-adjectives-worksheet.cjs\` (idempotent, keyed on \`content->>'variant'='adjective-families'\`).
- **Grading is rule-based on the client** (\`validateAnswer\`) — no AI, so it cannot fail or cost. Every item is MCQ or a ONE-WORD blank on purpose (the ظافر full-sentence-rewrite trap). The only free-writing items are Ex 6, whose own key says "Answers vary" — those use the validator's \`(sample answer)\` escape hatch, which accepts any substantive attempt. Verified by \`scripts/_test-anwar-adjectives.mjs\`: **412 checks, 0 failures** — every key answer accepted (incl. stray caps/space), every wrong MCQ option rejected, and every blank rejects the OPPOSITE \`-ing\`/\`-ed\` form (the whole point of the sheet). NOTE the test grades against \`git show origin/main:src/utils/answerValidator.js\`, not the working tree — this branch's copy is stale and missing the sample-answer + slash-alternative branches, which would have given a false pass.
- **RESTORED: the worksheet submit no longer loses answers.** The confirm-the-write guard shipped in \`6b52b677\` ("never lose worksheet answers on submit") was **clobbered by \`2fcbbdcb\`**, which was authored off a stale base — so from 2026-07-20 until today the submit was back to an unchecked \`update()\` with no \`.select()\`, no error check and no \`onError\`. A silently rejected persist (RLS / offline / network) again looked like success: \`onSuccess\` cleared the draft and showed a real score while \`student_answers\` stayed NULL. That is the exact bug ظافر hit. Re-applied onto main's CURRENT content: \`.select('id')\` + \`if (upErr) throw\` + \`if (!saved.length) throw 'save_not_persisted'\`, XP insert demoted to best-effort (a failed XP write must not eat saved answers), \`onError\` + a gender-aware Arabic save-failure notice rendered in BOTH \`ExerciseRunner\` and \`WorksheetView\` (answers stay on screen, she can retry). Guarded with an inline regression note naming both commits.
- Verified: bundle-resolution check via esbuild \`--bundle --packages=external --format=esm\` against a clean \`origin/main\` worktree (exit 0), and the guard + both Arabic gender variants confirmed present in the emitted bundle. RLS re-checked with live JWT claims: أنوار reads her 1 row, مصعب reads 0 of hers.
- Files: NEW \`scripts/seed-anwar-adjectives-worksheet.cjs\`, \`scripts/_test-anwar-adjectives.mjs\`, \`scripts/_ship-anwar-adjectives.cjs\`; modified \`src/pages/student/StudentExercises.jsx\`, \`src/pages/student/exercises/WorksheetView.jsx\`. No schema / edge / nav changes.

`;

(async () => {
  // 0) PRE-FLIGHT — refuse to ship if main moved under either edited file.
  execFileSync('git', ['fetch', 'origin', 'main', '-q'], { cwd: REPO_DIR });
  for (const f of EDITED) {
    const mainNow = execFileSync('git', ['show', `origin/main:${f.repo}`], { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32e6 });
    const base = fs.readFileSync(f.base, 'utf8');
    if (mainNow !== base) {
      throw new Error(`main moved under ${f.repo} — re-derive from origin/main before shipping (refusing to clobber)`);
    }
    const patched = fs.readFileSync(f.src, 'utf8');
    if (patched === base) throw new Error(`${f.repo} is identical to main — nothing to ship?`);
  }
  console.log('pre-flight: both edited files still based on main\'s current content ✓');

  // 1) fresh main SHA + tree
  const parentSha = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/ref/heads/main`])).object.sha;
  const parentCommit = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/commits/${parentSha}`]));

  // 2) CLAUDE.md based on origin/main
  const claudeMeta = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/contents/CLAUDE.md?ref=${parentSha}`]));
  const claudeMain = Buffer.from(claudeMeta.content, 'base64').toString('utf8');
  const marker = '## CHANGE LOG (Claude Code: update this after EVERY task — newest first)';
  const claudeNew = claudeMain.includes(marker)
    ? claudeMain.replace(marker, `${marker}\n\n${CHANGELOG.trimEnd()}`)
    : `${claudeMain}\n\n${CHANGELOG}`;

  // 3) build tree
  const tree = [];
  for (const f of EDITED) {
    const blob = ghApi(`repos/${OWNER}/${REPO}/git/blobs`, {
      content: fs.readFileSync(f.src).toString('base64'), encoding: 'base64',
    });
    tree.push({ path: f.repo, mode: '100644', type: 'blob', sha: blob.sha });
  }
  for (const repoPath of NEW_FILES) {
    const blob = ghApi(`repos/${OWNER}/${REPO}/git/blobs`, {
      content: fs.readFileSync(path.join(REPO_DIR, repoPath)).toString('base64'), encoding: 'base64',
    });
    tree.push({ path: repoPath, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const claudeBlob = ghApi(`repos/${OWNER}/${REPO}/git/blobs`, { content: Buffer.from(claudeNew).toString('base64'), encoding: 'base64' });
  tree.push({ path: 'CLAUDE.md', mode: '100644', type: 'blob', sha: claudeBlob.sha });

  const newTree = ghApi(`repos/${OWNER}/${REPO}/git/trees`, { base_tree: parentCommit.tree.sha, tree });
  const message = "feat(anwar): «العائلات الأربع للصفات» worksheet + restore the answer-loss guard\n\n"
    + 'Builds her printed Grammar Lab sheet into targeted_exercises: 8 teach-first lesson\n'
    + 'blocks + 54 rule-graded questions (MCQ / one-word blanks; Ex 6 free-writing uses the\n'
    + 'validator sample-answer path). 412 offline grading checks pass against the DEPLOYED\n'
    + 'validator.\n\n'
    + 'Also restores the submit-confirm guard from 6b52b677, which 2fcbbdcb clobbered off a\n'
    + 'stale base: since 2026-07-20 a silently rejected persist looked like success and wiped\n'
    + "the draft — the exact bug ظافر hit. Re-applied onto main's current content.";
  const commit = ghApi(`repos/${OWNER}/${REPO}/git/commits`, { message, tree: newTree.sha, parents: [parentSha] });
  ghApi(`repos/${OWNER}/${REPO}/git/refs/heads/main`, { sha: commit.sha, force: false });
  console.log(`✅ pushed ${commit.sha.slice(0, 10)} to main (${tree.length} files, parent ${parentSha.slice(0, 10)})`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
