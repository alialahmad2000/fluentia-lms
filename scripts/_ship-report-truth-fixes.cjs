// Ships the "make the daily report tell the truth" bundle DIRECT-TO-MAIN via the
// GitHub Git Trees API (the local branch is shared with parallel sessions and is
// far behind main — pushing local blobs would silently revert other sessions' work).
//
// navigation.js is read from the SESSION SCRATCHPAD: it was rebuilt by applying the
// mobile-bar patch to origin/main's content, NOT to the stale working-tree copy
// (which predates phrase-bank / dialogues / class-recaps / intake and would have
// wiped all of them).
//
// academy-digest/index.ts is read from the working tree — verified as exactly
// origin/main + only this session's edits (every deletion in the diff is mine).
//
// Run:  GH_TOKEN=$(gh auth token) node scripts/_ship-report-truth-fixes.cjs
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OWNER = 'alialahmad2000', REPO = 'fluentia-lms';
const REPO_DIR = path.join(__dirname, '..');
const SCRATCH_NAV = '/private/tmp/claude-501/-Users-dr-ali/c2cf79a5-48d2-4daa-921e-d11fdc791335/scratchpad/nav_patched.js';

function gh(args, input) {
  const opts = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  if (input !== undefined) opts.input = input;
  return execFileSync('gh', args, opts);
}
function ghApi(endpoint, payload) {
  return JSON.parse(gh(['api', endpoint, '--method', 'POST', '--input', '-'], JSON.stringify(payload)));
}

// repo-relative path -> absolute local file (null = read from the working tree)
const FILES = {
  'src/config/navigation.js': SCRATCH_NAV,
  'supabase/functions/academy-digest/index.ts': null,
  'supabase/migrations/20260811120000_rollup_all_learning_surfaces.sql': null,
  'scripts/_ship-report-truth-fixes.cjs': null,
};

(async () => {
  const navSrc = fs.readFileSync(SCRATCH_NAV, 'utf8');
  const dgSrc = fs.readFileSync(path.join(REPO_DIR, 'supabase/functions/academy-digest/index.ts'), 'utf8');
  const migSrc = fs.readFileSync(path.join(REPO_DIR, 'supabase/migrations/20260811120000_rollup_all_learning_surfaces.sql'), 'utf8');

  const anchors = [
    // ── the change itself ──
    [navSrc.includes('function withTrackInMobileBar('), 'nav: helper present'],
    [(navSrc.match(/withTrackInMobileBar\(\n/g) || []).length === 3, 'nav: all THREE injectors call it'],
    [navSrc.includes('TECH_TRACK_ITEM,\n  )'), 'nav: tech injector wired'],
    [navSrc.includes('BIZ_TRACK_ITEM,\n  )'), 'nav: biz injector wired'],
    [navSrc.includes('ENV_TRACK_ITEM,\n  )'), 'nav: env injector wired'],
    // ── proof we are on origin/main content, not the stale working tree ──
    [navSrc.includes("id: 'phrase-bank'"), 'nav: main-only «عبارات جاهزة» preserved'],
    [navSrc.includes("id: 'dialogues'"), 'nav: main-only «محادثات جاهزة» preserved'],
    [navSrc.includes("id: 'class-recaps'"), 'nav: main-only «ملخّص الحصص» preserved'],
    [navSrc.includes("id: 'intake'"), 'nav: main-only «استمارات التعارف» preserved'],
    [navSrc.includes('function retargetCurriculum('), 'nav: main-only retargetCurriculum preserved'],
    // ── digest ──
    [dgSrc.includes('const isTest = (s: any)'), 'digest: test accounts excluded'],
    [dgSrc.includes('let baseline: any = null;'), 'digest: baseline computed'],
    [dgSrc.includes('يوم أفضل من المعتاد'), 'digest: baseline rendered'],
    [dgSrc.includes('totalSpeaking'), 'digest: dead تسليم tile replaced'],
    [dgSrc.includes('ielts_reading: "آيلتس — القراءة"'), 'digest: new surfaces labelled'],
    [dgSrc.includes('let errHealth: any = null;'), 'digest: main-only platform-health block preserved'],
    // ── migration ──
    [migSrc.includes('CREATE OR REPLACE FUNCTION public.compute_student_daily_activity'), 'migration: rollup fn'],
    [migSrc.includes('source_breakdown'), 'migration: provenance column'],
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
    message:
      'fix(reporting): the daily report can finally see the whole platform\n\n' +
      'The 10 Aug digest filed الهنوف البقمي under «لم ينشطوا» with 0 minutes while she had\n' +
      'completed 12 IELTS skill sessions in 30 days (246 min — the #2 learner in the academy).\n' +
      'compute_student_daily_activity() only ever read curriculum/vocab/quiz/speaking, so IELTS,\n' +
      'Library, STEP, the labs and the games were invisible to the rollup — and therefore to the\n' +
      'teacher roster, the reports hub, the deep analysis and the parent link as well.\n\n' +
      '- rollup: unions every learning surface; adds curriculum_seconds / other_seconds /\n' +
      '  source_breakdown so an estimated minute is never mistaken for an instrumented one.\n' +
      '  Backfilled 2026-03-01 → today.\n' +
      '- digest: excludes test accounts from the denominator (3/12 → 3/11); replaces the dead\n' +
      '  «تسليم» tile (public.submissions has never held a row) with speaking recordings; adds a\n' +
      '  7/30-day baseline so a day at +114% of normal stops being described as «مقلق».\n' +
      '- nav: gated tracks (env/biz/tech) now reach the MOBILE bottom bar. نورة الدوسري, whose only\n' +
      '  entitlement is «مسار البيئة», had 3 lifetime page views on mobile Safari and never found\n' +
      '  her course — it lived behind the «المزيد» drawer.',
    tree: newTree.sha,
    parents: [headSha],
  });
  ghApi(`repos/${OWNER}/${REPO}/git/refs/heads/main`, { sha: commit.sha, force: false });
  console.log(`\n✅ pushed to main: ${commit.sha}`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
