// Ships «محادثات جاهزة» DIRECT-TO-MAIN via the GitHub Git Trees API.
//
// The local checkout is a shared, far-diverged branch AND the four shared files
// this touches (App.jsx / navigation.js / Sidebar.jsx / MobileDrawer.jsx) already
// carry another session's uncommitted WIP — so blobbing them from the working tree
// would clobber both main and that session. Every EDITED file here was derived from
// `git show origin/main:<path>` into scratchpad/patched, and PRE-FLIGHT re-reads
// origin/main and ABORTS unless it still byte-matches the baseline in scratchpad/base.
// That is the exact step 2fcbbdcb skipped when it silently reverted the worksheet
// answer-loss guard for 16 days.
//
// Run:  node scripts/_ship-mosab-dialogues.cjs
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const OWNER = 'alialahmad2000', REPO = 'fluentia-lms'
const REPO_DIR = path.join(__dirname, '..')
const S = '/private/tmp/claude-501/-Users-dr-ali/4479b0bf-a018-4a0c-8f95-bd3f5e0225b6/scratchpad'

const gh = (args, input) => execFileSync('gh', args,
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...(input !== undefined ? { input } : {}) })
const ghApi = (endpoint, payload) =>
  JSON.parse(gh(['api', endpoint, '--method', 'POST', '--input', '-'], JSON.stringify(payload)))

const EDITED = [
  { repo: 'src/App.jsx', file: 'App.jsx' },
  { repo: 'src/config/navigation.js', file: 'navigation.js' },
  { repo: 'src/components/layout/Sidebar.jsx', file: 'Sidebar.jsx' },
  { repo: 'src/components/layout/MobileDrawer.jsx', file: 'MobileDrawer.jsx' },
]
const NEW_FILES = [
  'src/pages/student/Dialogues.jsx',
  'src/pages/student/DialogueScene.jsx',
  'src/pages/student/dialogues.css',
  'src/components/dialogues/DialoguesGuard.jsx',
  'supabase/migrations/20260806120000_dialogues.sql',
  'scripts/mosab-dialogues/dialogues.cjs',
  'scripts/seed-mosab-dialogues.cjs',
  'scripts/generate-mosab-dialogue-audio.mjs',
  'scripts/verify-mosab-dialogues-rls.cjs',
  'scripts/_ship-mosab-dialogues.cjs',
]

const CHANGELOG = `### 2026-08-06 — مصعب: «محادثات جاهزة» — 15 two-voice scenes he can walk into
- **The layer above the phrase bank.** «عبارات جاهزة» gives him one line he can say; a dialogue gives him a whole exchange he can walk into. Owner's ask: ready conversations across applicable scenarios that he MEMORISES, so he learns not just what to say but **how to reply when someone says it to him**. Gated on new \`students.uses_dialogues\` (مصعب only) behind \`DialoguesGuard\`; nav item added to BOTH \`Sidebar.jsx\` and \`MobileDrawer.jsx\` — **the drawer does not inherit sidebar gates, always add both**.
- **15 scenes / 184 lines / 59 expressions**, authored to A2 and to HIS world: الجامعة (new classmate · asking the professor · splitting a group project · the registration office), العمل (internship interview · first team meeting · a customer call · asking your manager for more time · disagreeing politely), الحياة اليومية (café · airport check-in · doctor · returning an item · small talk · directions). Every scene deliberately re-uses phrases already in his phrase bank, so he SEES the lines he memorised actually being said. Content + validator: \`scripts/mosab-dialogues/dialogues.cjs\` + \`scripts/seed-mosab-dialogues.cjs\` (idempotent — re-seeding updates lines in place so audio URLs survive).
- **Four steps per scene, and the 4th is the point.** استمع (the whole scene plays, lines light up as they are spoken, ٠٫٧٥× toggle, translation OFF by default so the ear works first) → افهم (every line with its meaning + a «لماذا هكذا؟» note on each of HIS lines + the scene's key expressions) → احفظ (his own lines rebuilt from shuffled word chips, graded by exact match after normalisation) → **دورك** (the other side speaks by itself, then he picks his reply from 3 options — the wrong two are AUTHORED per line, natural English that is wrong *here*, so the drill tests *when to say it*, not translation). «أتقنتها» needs recall ≥ 80 **and** roleplay ≥ 80.
- **TWO VOICES, $0.** edge-tts (Microsoft Edge Neural, free) — his own side is always the same male voice, the other speaker gets a voice chosen per scene (professor / barista / customer). Per-line mp3 **and** a stitched scene track with exact per-line start/end, built with the ffmpeg concat FILTER (never \`-c copy\` — mp3 padding drifts) at uniform mono 24k. Verified per-frame channel-UNIFORM mono: that mixed-channel shape is what played in Chrome and went SILENT in Safari on 2026-06-03. Line files exist so tapping one line never needs a seek. Script: \`scripts/generate-mosab-dialogue-audio.mjs\`.
- **Security shape copied from the phrase bank**: content + progress are SELECT-only for the owner (+ staff); there is deliberately **no insert/update policy on progress at all** — the sole write path is \`dialogue_record_progress()\`, SECURITY DEFINER, gated POSITIVELY on ownership (\`auth.uid()\` is also null for anon, so "no uid" is never treated as service-role), REVOKEd from public/anon, with the stage whitelisted and the score clamped server-side. \`uses_dialogues\` added to **Tier A** of \`guard_student_account_columns()\` — RLS alone does NOT stop a student PATCHing his own students row. Verified with REAL magiclink sessions, not service-role: **23/23** — he reads 15/184/59, forged progress INSERT → \`42501\`, direct UPDATE → 0 rows, content rewrite → 0 rows, unknown stage rejected, score 900 clamped to 100, self-granting the flag → \`P0001\`; another student reads 0/0/0/0 and his RPC call → "scenario not yours"; anon reads nothing and cannot execute the function.
- **Design**: a warm lit stage (\`dialogues.css\`) — amber = your voice, steel-blue = theirs, and that one decision carries every bubble, avatar, drill and verdict so he always knows whose line he is looking at. Living background (drifting warm/cool blooms + stage cone + grain), never a flat black card. Headings are pinned to the page's own ink (the global \`h1..h6\` rule would otherwise make them invisible under one of the two themes — the ClassRecaps/PhraseBank bug class), Arabic headings use an Arabic display face (an English serif there falls back to the OS Arabic font), and the two hero stats are separated by a CSS border, never a text character between Arabic-Indic numerals.
- **Reviews.** premium-ui-critic **6.5/10 → every finding applied**: the panels had a measured **1.09:1** separation from the page (a hairline holding up a rectangle) → real elevation system (\`--d-lit\` top-light + a 3-stop \`--d-elev\`) on every surface; **19 type declarations under the 12px floor** → all floored at .75rem; **9 \`letter-spacing\` rules severing connected Arabic** → stripped (kept only on Latin-only classes); \`.dlg-mini\` 30→44px (the most-tapped control on the surface) + \`:active\` states everywhere; \`.dlg-card__go\` was absolutely positioned onto the first progress dash in RTL → now a flex sibling; the player was a display-only 4px bar → a **seekable scrubber with one tick per turn, amber = you / steel = them**, plus auto-scroll to the line being spoken; \`useReducedMotion\` + \`(pointer:coarse)\` gating; and a genuine contradiction — a **red ✗ panel painted on top of the CORRECT answer** — now neutral with «ليس هذا — الردّ الصحيح هو». arabic-copy-reviewer: **16 hard + 21 soft, all applied** — Arabic number–noun agreement helpers (\`linesAr\`/\`minutesAr\`/\`turnsAr\`: «١٠ أسطر» not «١٠ سطرًا», «دقيقتان» not «٢ دقيقة», «٥ أدوار» not «٥ دورًا»), «كاونتر»→«مكتب تسجيل الوصول», a female character described with a masculine verb, «ردّ عليه» hardcoding a male interlocutor on 8 female-B scenes, and two placeholder names ('Agent'/'Passer-by') that were rendering to the student as a person's name + avatar letter.
- **A bug worth remembering:** I had keyed the drill components on \`progress.attempts\`. Recording the score invalidates the query → the key changes → the drill REMOUNTS and the student is thrown back to question 1 instead of seeing the result he just earned. Never key an in-progress drill on data its own mutation changes.
- Verified: used-vs-imported icon audit clean on all 3 new components (the \`Cpu\`/\`ArrowLeft\` white-screen class), and an esbuild \`--bundle --packages=external\` resolve check of the WHOLE app entry against a clean \`git archive origin/main\` tree + these files — exit 0, dialogues.css present in the emitted bundle. **Main moved under \`App.jsx\` mid-build (\`5ff60c82\`) and the pre-flight caught it — re-derived rather than clobbered.**
- **Driven in the REAL app, not a harness** (DB rows + RLS proof are not proof the student can see it): served a clean \`git archive origin/main\` tree + these files under vite, injected a magiclink session for مصعب, and walked all four steps — the 47.3s scene played (readyState 4, no media error), \`listened\` recorded through RLS, recall 6/6 → ١٠٠٪, roleplay 5/6 (one deliberate wrong answer) → ٨٣٪ → status \`mastered\`; nav item confirmed in BOTH the sidebar and the mobile «المزيد» drawer; a DIFFERENT student is redirected off \`/student/dialogues\` with no nav item. Test progress rows deleted afterwards — his account starts clean.
- Files: NEW \`src/pages/student/Dialogues.jsx\`, \`DialogueScene.jsx\`, \`dialogues.css\`, \`src/components/dialogues/DialoguesGuard.jsx\`, migration \`20260806120000_dialogues.sql\`, \`scripts/mosab-dialogues/dialogues.cjs\`, \`scripts/seed-mosab-dialogues.cjs\`, \`scripts/generate-mosab-dialogue-audio.mjs\`, \`scripts/verify-mosab-dialogues-rls.cjs\`; modified \`src/App.jsx\`, \`src/config/navigation.js\`, \`src/components/layout/Sidebar.jsx\`, \`src/components/layout/MobileDrawer.jsx\`. DB: \`students.uses_dialogues\` + 4 tables + 1 RPC + guard Tier A. Edge functions: none.

`

;(async () => {
  // 0) PRE-FLIGHT — abort if main moved under ANY edited file.
  execFileSync('git', ['fetch', 'origin', 'main', '-q'], { cwd: REPO_DIR })
  for (const f of EDITED) {
    const mainNow = execFileSync('git', ['show', `origin/main:${f.repo}`],
      { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 32e6 })
    const base = fs.readFileSync(`${S}/base/${f.file}`, 'utf8')
    if (mainNow !== base) throw new Error(`main moved under ${f.repo} — re-derive from origin/main (refusing to clobber)`)
    const patched = fs.readFileSync(`${S}/patched/${f.file}`, 'utf8')
    if (patched === base) throw new Error(`${f.repo} is identical to main — the patch did not apply`)
    if (!patched.includes('ialogue')) throw new Error(`${f.repo} patch lost its dialogues edit`)
  }
  console.log(`pre-flight: all ${EDITED.length} edited files still based on main's current content ✓`)
  for (const p of NEW_FILES) {
    if (!fs.existsSync(path.join(REPO_DIR, p))) throw new Error(`missing new file ${p}`)
  }

  const parentSha = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/ref/heads/main`])).object.sha
  const parentCommit = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/git/commits/${parentSha}`]))

  // CLAUDE.md changelog, based on main's CURRENT copy
  const claudeMeta = JSON.parse(gh(['api', `repos/${OWNER}/${REPO}/contents/CLAUDE.md?ref=${parentSha}`]))
  const claudeMain = Buffer.from(claudeMeta.content, 'base64').toString('utf8')
  const marker = '## CHANGE LOG (Claude Code: update this after EVERY task — newest first)'
  if (!claudeMain.includes(marker)) throw new Error('CLAUDE.md change-log marker not found on main')
  const claudeNew = claudeMain.replace(marker, `${marker}\n\n${CHANGELOG.trimEnd()}`)

  const blob = (content) => ghApi(`repos/${OWNER}/${REPO}/git/blobs`,
    { content: content.toString('base64'), encoding: 'base64' }).sha

  const tree = []
  for (const f of EDITED) tree.push({ path: f.repo, mode: '100644', type: 'blob', sha: blob(fs.readFileSync(`${S}/patched/${f.file}`)) })
  for (const p of NEW_FILES) tree.push({ path: p, mode: '100644', type: 'blob', sha: blob(fs.readFileSync(path.join(REPO_DIR, p))) })
  tree.push({ path: 'CLAUDE.md', mode: '100644', type: 'blob', sha: blob(Buffer.from(claudeNew)) })

  const newTree = ghApi(`repos/${OWNER}/${REPO}/git/trees`, { base_tree: parentCommit.tree.sha, tree })
  const message = 'feat(mosab): «محادثات جاهزة» — 15 two-voice scenes he can walk into\n\n'
    + 'The layer above the phrase bank: a phrase is one line you can say, a dialogue is a\n'
    + 'whole exchange you can enter. 15 authored A2 scenes (184 lines, 59 expressions) across\n'
    + 'university / work / everyday life, voiced with TWO distinct edge-tts voices at $0.\n\n'
    + 'Four steps per scene: listen to the real scene, understand every line and why it is\n'
    + 'phrased that way, rebuild your own lines from word chips, then take your role while the\n'
    + 'other side talks to you and pick your reply from three authored options — so he learns\n'
    + 'WHEN to say it, not just what it means.\n\n'
    + 'Reads are SELECT-only; progress has no insert/update policy at all — the sole write path\n'
    + 'is dialogue_record_progress(), SECURITY DEFINER gated positively on ownership. 23/23 RLS\n'
    + 'checks pass with real student sessions.'
  const commit = ghApi(`repos/${OWNER}/${REPO}/git/commits`, { message, tree: newTree.sha, parents: [parentSha] })
  ghApi(`repos/${OWNER}/${REPO}/git/refs/heads/main`, { sha: commit.sha, force: false })
  console.log(`✅ pushed ${commit.sha.slice(0, 10)} to main (${tree.length} files, parent ${parentSha.slice(0, 10)})`)
})().catch((e) => { console.error('💥', e.message); process.exit(1) })
