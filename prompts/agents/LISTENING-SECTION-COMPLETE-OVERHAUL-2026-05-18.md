# 🎧 LISTENING SECTION — COMPLETE OVERHAUL (2026-05-18)

> **Move + execute (Mac):**
> ```bash
> mv ~/Downloads/LISTENING-SECTION-COMPLETE-OVERHAUL-2026-05-18.md \
>    /Users/dr.ali/Projects/fluentia-lms/prompts/agents/
> cd /Users/dr.ali/Projects/fluentia-lms
> claude --dangerously-skip-permissions
> ```
> Then in Claude Code:
> ```
> Read and execute prompts/agents/LISTENING-SECTION-COMPLETE-OVERHAUL-2026-05-18.md
> ```

---

## 🎯 MISSION (read carefully — this has been attempted before and FAILED)

Fix the listening section end-to-end. Four problems, one autonomous run, one commit:

### Problem 1 — Audio plays first speaker's first sentence then stops dead

**ROOT CAUSE (do NOT re-investigate ElevenLabs generation — that part works):**

The concat utility uses `ffmpeg -f concat -c copy`. With `-c copy`, ffmpeg stream-copies MP3 segments from separate ElevenLabs API calls **without re-encoding**. Each ElevenLabs call carries its own encoder-delay and frame-boundary drift. When you stream-copy them together:
- The container header sums the durations → looks correct (e.g. 2:03)
- But the audio decode chain breaks at the first segment boundary
- Every previous "regeneration" produced the **identical broken file** because the bug is in **concat**, not in generation

**THE FIX:** Re-encode during concat with `libmp3lame`. Never stream-copy multi-source MP3s. And use **decode-test** (`ffmpeg -v error -i f.mp3 -f null -` exits 0) as the pass/fail gate — never trust ffprobe's header duration alone.

### Problem 2 — Duplicate listening header rendered twice

From the user's screenshot, the listening item appears TWICE on screen:
- Once as a top banner: "Conversation About a Psychology Exam and Memory" with a purple "dialogue" badge
- Once as a card below: "محادثة عن امتحان علم النفس ودراسة الذاكرة" with a cyan "محادثة" badge

This is most likely a **rendering bug** (the same row rendered as both a "current item" banner AND as the section card), but it may also be **genuine duplicate DB rows**. Phase A determines which and fixes appropriately.

### Problem 3 — Audio player looks generic and unprofessional

Current player: thin full-width bar, no character, identical to the reading player. Doesn't respect sidebar expanded/collapsed state. Doesn't feel premium.

**Build a NEW listening-specific player** that:
- Is **sticky inside the section's content column** (not `fixed bottom-0 left-0 right-0`), so it automatically respects whatever the sidebar width is — no context plumbing
- Has a **premium glass card** treatment matching Velvet Midnight (the project's design language)
- Shows **speaker-segment ticks** on the scrubber (gold marks where each speaker starts)
- Shows a **"يتحدث الآن: <name>"** live label that updates with playback
- Uses **5-second skip** (linguistically better than the standard 10s for language learners)
- Is visually distinct from the reading player

### Problem 4 — Section has no hierarchy or premium feel

The current section is a flat dump of instruction text, audio, and questions. Rebuild it with a clear premium hierarchy and Velvet Midnight styling.

---

## 📁 ENVIRONMENT

- **Working dir:** `/Users/dr.ali/Projects/fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md` — load and obey
- **DB:** Supabase prod (`nmjexpuycmqcxuxljier`, Frankfurt Pro) via `mcp__supabase__*` tools
- **Storage bucket:** `curriculum-audio`
- **Node env (mandatory — IPv6 → ECONNRESET against ElevenLabs):**
  ```bash
  export NODE_OPTIONS="--dns-result-order=ipv4first"
  ```
- **Tools required:** `ffmpeg`, `ffprobe`. Verify both BEFORE Phase B with `ffmpeg -version` and `ffprobe -version`. If missing → `brew install ffmpeg`, re-verify in a new shell.
- **Design system:** `var(--ds-*)` tokens, Velvet Midnight theme, RTL Arabic-first, Tajawal for Arabic UI, Playfair Display for English titles.
- **Reference unit for visual testing:** Level 2, the unit containing "Conversation About a Psychology Exam and Memory" (Arabic: "محادثة عن امتحان علم النفس ودراسة الذاكرة"). This is the unit shown in the user's screenshot with the visible bugs.

---

## ⚠️ STRICT RULES (non-negotiable)

1. **The truncation bug is in concat, not generation.** Do not re-investigate ElevenLabs API calls. The per-segment MP3s ElevenLabs returns are valid. The concat step is what corrupts them.
2. **Decode-test, NOT header-test.** A file passes only if `ffmpeg -v error -i <file> -f null -` exits 0. `ffprobe` duration alone is NOT proof of health — that's exactly what masked this bug for weeks.
3. **Student data protection.** Only touch `curriculum_listening` rows. No `submissions`, no `unit_progress`, no `student_*` tables. Ever.
4. **Curriculum edits via reversible migration.** If duplicate rows must be deleted, write a numbered migration that first writes a JSON backup of deleted rows to `docs/backups/listening-dedupe-<timestamp>.json`, then deletes.
5. **All hooks before conditional returns.** No React Error #310. Role guards / loading guards go AFTER every `useState`, `useEffect`, `useCallback`, `useMemo`, `useQuery`, `useMutation`.
6. **`profile?.id` not `user?.id`** for any student-scoped query (impersonation-safe).
7. **Always `.select()` after `.update()` / `.upsert()`** to catch silent RLS failures (per skill rules).
8. **No `vite build` locally.** Vercel handles all builds. Self-check with `npx eslint` only.
9. **Idempotent.** Re-running this prompt must NOT double-charge ElevenLabs, NOT duplicate uploads (use `upsert: true`), NOT re-delete already-deleted rows.
10. **Mac-native shell.** Use `mv`, `export`, `/Users/dr.ali/Projects/fluentia-lms/...`. Do not emit Windows commands (`winget`, `Move-Item`, `$env:`, `C:\...`).
11. **No `.catch()` on Supabase queries** (per skill rules — destructure `{ data, error }` and check `error`).
12. **`isMounted` guard on every useEffect with an async operation** (per skill rules).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Discovery + verification (read-only, no commits)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 — Verify environment

```bash
ffmpeg -version | head -1
ffprobe -version | head -1
node --version
echo "NODE_OPTIONS=$NODE_OPTIONS"
```

Confirm ffmpeg ≥ 6.x, ffprobe present, Node ≥ 18, `NODE_OPTIONS` contains `--dns-result-order=ipv4first`. If `NODE_OPTIONS` is empty, export it inline for the duration of this run.

### A.2 — Map the current code

Find every file that touches the listening section. Save a list to `docs/audits/listening-overhaul/file-inventory.md`:

```bash
# Listening UI components
find src -type f \( -name "*.jsx" -o -name "*.tsx" \) | xargs grep -l -i "listening\|curriculum_listening\|ListeningTab\|ListeningSection\|ListeningPlayer" 2>/dev/null

# Audio generation scripts
find scripts -type f -name "*.cjs" -o -name "*.mjs" -o -name "*.js" | xargs grep -l -i "listening\|concat\|elevenlabs" 2>/dev/null

# Concat utility specifically — look for ALL variants
grep -rn "ffmpeg.*concat" scripts/ 2>/dev/null
grep -rn "\-c copy" scripts/ 2>/dev/null
```

For each found component, record: full path, line count, last commit touching it (`git log -1 --format=%h\ %s\ %ar -- <file>`).

### A.3 — Prove or disprove the concat bug is still present

Open the concat utility (most likely `scripts/audio-v2/lib/concat.cjs` or similar). If `-c copy` appears ANYWHERE in a concat command → the bug is live. Record the file path and line number.

Then prove it empirically with a decode test on 5 random listening files:

```bash
mkdir -p /tmp/listening-audit
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
(async () => {
  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await sb
    .from('curriculum_listening')
    .select('id, title_ar, title_en, audio_url, audio_type, speaker_segments')
    .not('audio_url', 'is', null)
    .limit(5);
  if (error) { console.error(error); process.exit(1); }
  console.log(JSON.stringify(data, null, 2));
})();
" > /tmp/listening-audit/sample.json
```

For each sampled file:
```bash
# Download
curl -sL "<audio_url>" -o /tmp/listening-audit/<id>.mp3
# Header duration (what ffprobe claims)
HDR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 /tmp/listening-audit/<id>.mp3)
# Real decode duration (decode every sample, count actual playable seconds)
REAL=$(ffmpeg -v error -i /tmp/listening-audit/<id>.mp3 -f null - 2>&1 | tail -1)
# Decode-error check
ffmpeg -v error -i /tmp/listening-audit/<id>.mp3 -f null - ; echo "exit=$?"
```

Tabulate header duration vs real decode duration vs expected duration (from transcript word count / 2.5 words/sec). Any file where `real_decode < 0.7 * header_duration` OR `decode exit != 0` is BROKEN.

### A.4 — Diagnose the "duplicate header" rendering

Look at the student-facing listening section component (most likely `src/pages/student/curriculum/ListeningTab.jsx` or a `ListeningSection` component referenced from a unit page). Find:

- Does it render the listening item's title in **two places** in the same render tree? (e.g., a "current topic" banner at the top AND a card with the same title?)
- Or are there **two DB rows** with the same/similar content? Check:

```sql
SELECT level_id, unit_id, audio_type, title_ar, title_en, COUNT(*) AS n
FROM curriculum_listening
GROUP BY level_id, unit_id, audio_type, title_ar, title_en
HAVING COUNT(*) > 1;
```

Also check for **untitled** rows (causes the UI to fall back to a generic English string and look like a duplicate):

```sql
SELECT id, level_id, unit_id, audio_type, title_ar, title_en
FROM curriculum_listening
WHERE title_ar IS NULL OR title_ar = '' OR title_en IS NULL OR title_en = '';
```

Record which case applies (rendering-only / DB-duplicate / null-title / combination) — Phase D acts on whatever Phase A finds.

### A.5 — Map current player + section

Read the current `ListeningPlayer` (or whatever audio bar is used in the listening flow) and the current `ListeningSection` / `ListeningTab` end-to-end. Note:

- How positioning is done (fixed? sticky? static?)
- Whether the same player component is reused on the reading flow
- How `speaker_segments` is consumed (or whether it is at all)
- What the question-rendering logic looks like (so Phase F preserves it)

### A.6 — Phase A report

Write `docs/audits/listening-overhaul/PHASE-A-REPORT.md`:

```markdown
# Phase A — Listening Overhaul Discovery

## Environment
- ffmpeg: <version>
- ffprobe: <version>
- node: <version>
- NODE_OPTIONS: <value>

## File inventory
<table of components + scripts found>

## Concat bug status
- File: <path>
- Line: <n>
- Contains `-c copy`: YES / NO
- Decode-test results (sample of 5):
  | id | header_dur | real_dur | ratio | decode_exit | verdict |
  |----|------------|----------|-------|-------------|---------|
  | ... | ... | ... | ... | ... | OK / BROKEN |

## Duplicate header diagnosis
- DB duplicates: <count or NONE>
- Null titles: <count>
- Rendering duplicate: YES / NO — explanation
- Verdict: <RENDERING_ONLY | DB_DUPLICATES | NULL_TITLES | COMBINATION>

## Current player + section
- Player file: <path>, lines
- Player positioning: <fixed | sticky | static>
- Reused on reading: YES / NO
- speaker_segments consumed: YES / NO
- Question rendering location: <path:line>

## Estimated regeneration scope
- Listening rows total: N
- Rows flagged BROKEN by decode-test (extrapolated): ~N
- ElevenLabs char budget needed: ~N
- Current ElevenLabs quota remaining: <fetch via /v1/user>
```

**This is NOT a stop gate.** Write the report, then continue automatically to Phase B.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Fix the concat utility (the actual bug)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### B.1 — Rewrite concat to re-encode

Locate the concat utility identified in Phase A (likely `scripts/audio-v2/lib/concat.cjs` — if it lives somewhere else, edit it there). Replace the concat logic with a TWO-STAGE process:

**Stage 1 — Normalize every segment** to identical codec parameters in a temp directory:

```bash
ffmpeg -y -i <segment_in> -ar 44100 -ac 1 -b:a 128k -c:a libmp3lame <segment_normalized>
```

**Stage 2 — Concat normalized segments WITH re-encode** (NOT `-c copy`):

```bash
ffmpeg -y -f concat -safe 0 -i <concat_list.txt> -ar 44100 -ac 1 -b:a 128k -c:a libmp3lame <final.mp3>
```

After concat, **decode-verify**:

```bash
ffmpeg -v error -i <final.mp3> -f null - || throw new Error('concat output failed decode')
```

The new `concat.cjs` exports a function with this contract:

```javascript
/**
 * Concatenate per-speaker MP3 segments into a single MP3, re-encoding
 * to a uniform codec to prevent decode-truncation across segment boundaries.
 *
 * @param {string[]} segmentPaths  Ordered list of segment file paths
 * @param {string}   outPath       Final concatenated MP3 path
 * @param {number}   silenceMs     Silence between segments (default 300)
 * @returns {{ outPath, durationMs, segmentOffsetsMs }}
 *          segmentOffsetsMs[i] = ms timestamp where segment i starts in final.mp3
 *          (used by Phase C to populate speaker_segments timing)
 * @throws  if decode-verify fails
 */
function concatSegments(segmentPaths, outPath, silenceMs = 300) { ... }

module.exports = { concatSegments };
```

The function MUST:
- Generate a silent gap segment with `ffmpeg -f lavfi -i anullsrc=channel_layout=mono:sample_rate=44100 -t <silenceMs/1000>` between each speaker segment
- Compute `segmentOffsetsMs` by ffprobe-ing each normalized segment cumulatively (segments + silences)
- Decode-verify the final file with `ffmpeg -v error ... -f null -` before returning
- Throw a descriptive error if verification fails (do NOT return a broken file silently)

### B.2 — Add a standalone test

Create `scripts/audio-v2/test-concat.cjs`:

```javascript
// Standalone smoke test for the concat utility.
// Generates 3 tiny tone segments at different frequencies, concats them,
// asserts the output decodes cleanly and has the expected duration.
// Run: node scripts/audio-v2/test-concat.cjs
```

The test:
1. Uses ffmpeg's `sine` filter to generate 3 × 1.5s tone segments at 440/660/880 Hz
2. Calls `concatSegments([t1, t2, t3], '/tmp/test-concat-out.mp3')`
3. Asserts the returned `durationMs` is within ±5% of expected (3 × 1500 + 2 × 300 = 5100 ms)
4. Runs `ffmpeg -v error -i /tmp/test-concat-out.mp3 -f null -` and asserts exit 0
5. Prints PASS or FAIL

Run the test and confirm it passes BEFORE moving to Phase C:

```bash
node scripts/audio-v2/test-concat.cjs
```

### B.3 — Audit every concat caller

Grep for callers of the old concat utility:

```bash
grep -rn "require.*concat\|from.*concat" scripts/audio-v2/
```

For each caller, confirm it uses the new exported signature `concatSegments`. Fix any that don't.

### B.4 — Forbid `-c copy` regression

Add a check that grepping for `c copy` in `scripts/audio-v2/lib/concat.cjs` returns ZERO matches. This is asserted in Phase G's self-check.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Audit + regenerate broken audio
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### C.1 — Decode-test every listening file

Write `scripts/audio-v2/audit-listening-decode.cjs` that:
1. Queries every `curriculum_listening` row with `audio_url IS NOT NULL`
2. For each: downloads the file to `/tmp/listening-audit/<id>.mp3`, runs `ffprobe` for header duration, runs `ffmpeg -v error -i ... -f null -` for decode test
3. Computes expected duration from transcript word count ÷ 2.5 words/sec (English/dialogue) or 2.0 (slower content)
4. Flags BROKEN if: `decode_exit != 0` OR `real_decode_seconds < 0.7 * expected_seconds`
5. Writes `docs/audits/listening-overhaul/decode-audit.json` with per-row results

Run it:

```bash
node scripts/audio-v2/audit-listening-decode.cjs
```

### C.2 — Regenerate broken rows

Write `scripts/audio-v2/03-generate-listening.cjs` (or update if it exists). For each row flagged BROKEN by C.1:

1. Read `transcript` + `speaker_segments` from DB
2. For each segment: call ElevenLabs `/v1/text-to-speech/<voice_id>` with `model_id: 'eleven_multilingual_v2'`, settings `{ stability: 0.5, similarity_boost: 0.75, use_speaker_boost: true }`
3. Save per-segment MP3s to `/tmp/listening-gen/<id>/seg-<i>.mp3`
4. Call `concatSegments(segmentPaths, finalPath, 300)` — uses the new fixed concat
5. Upload final to `curriculum-audio/listening/level-<N>/unit-<M>.mp3` with `upsert: true`
6. **`.update({ ... }).select()`** the row with:
   - `audio_url`, `audio_path`
   - `audio_duration_ms` = ffprobe of final
   - `speaker_segments` = original segments enriched with `start_ms` and `end_ms` from the returned `segmentOffsetsMs`
   - `audio_generated_at` = now()
7. Assert `.select()` returned exactly 1 row — if 0, throw (RLS silent failure)
8. Decode-verify the uploaded file by re-downloading it and running `ffmpeg -v error ... -f null -`. If verify fails, log and continue but increment a `failed_verify` counter.

Rate limiting:
- 1.5s between rows
- 500ms between segments within a row
- On 429: backoff exponentially 2s → 4s → 8s → 16s → 32s, max 6 attempts then skip and log

Track ElevenLabs usage:
- Before starting: `curl -H "xi-api-key: $ELEVENLABS_API_KEY" https://api.elevenlabs.io/v1/user/subscription | jq '.character_count, .character_limit'`
- Check `(limit - count - estimated_chars) > 0` before each row; if not, stop and report
- After completion: re-fetch and report consumed chars

### C.3 — Final summary

Write `docs/audits/listening-overhaul/regeneration-report.md`:

| Stat | Value |
|------|-------|
| Total rows | N |
| Broken (Phase C.1) | N |
| Regenerated successfully | N |
| Failed verify after regen | N |
| ElevenLabs chars consumed | N |
| ElevenLabs quota remaining | N |

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Fix duplicate rendering + null titles
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on Phase A's verdict:

### D.1 — If DB_DUPLICATES present

Write a numbered migration `supabase/migrations/<NNN>_dedupe_curriculum_listening.sql`:

1. **First**, write a JSON backup of the rows to be deleted to `docs/backups/listening-dedupe-<YYYYMMDD-HHMM>.json` via a Node helper (NOT in the migration — outside it, so the data exists before the destructive change runs)
2. The migration uses a CTE to identify duplicates by `(unit_id, audio_type, COALESCE(title_ar, ''), COALESCE(title_en, ''), LEFT(transcript, 200))`
3. Keeps the row with the lowest `id` (or earliest `created_at`), deletes the rest
4. Includes a row-count assertion: `RAISE NOTICE 'Deleted N duplicates'` and an explicit `IF deleted = 0 AND expected > 0 THEN RAISE EXCEPTION` check
5. Apply via `mcp__supabase__apply_migration`

### D.2 — If NULL_TITLES present

For each row with null/empty `title_ar` or `title_en`, generate a real Arabic + English title from the transcript content. **Generate dev-time, in this script, NOT at runtime via API:**

```javascript
// For each row with null title:
// 1. Take first 300 chars of transcript
// 2. Locally infer a 4-7 word topical title from keywords
//    (e.g., transcript mentions "memory", "exam", "psychology" → "Conversation About Memory and Psychology Exams")
// 3. Translate to Arabic using a deterministic mapping or, if needed, a one-off Claude Code call
//    that produces both at once
// 4. UPDATE the row with .select() and assert rowcount = 1
```

Acceptable fallback if topical inference is hard: use `<audio_type> + unit_topic` pattern (e.g., "محادثة عن الذاكرة" / "Dialogue about memory") — but ONLY as a fallback, prefer a real topical title.

### D.3 — Fix the rendering duplication (always do this regardless of A's verdict)

In the listening section component identified in A.5: ensure the listening item's title is rendered **exactly once** per render tree. The pattern visible in the screenshot — a "you're studying X" banner at the top AND a section card below with the same title — must collapse to ONE clear header.

Recommended structure for the section (implemented fully in Phase F):

```
[Section header: "🎧 الاستماع" + level-2 instruction (italic muted)]
[Listening item card: title (Arabic + English) + audio_type badge + IELTS badge if applicable]
[Audio player — premium glass card]
[Tabs: النص | الأسئلة (default: الأسئلة)]
[Questions list]
```

No top banner. No duplicate title. One source of truth per render.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE E — Build the new premium ListeningPlayer
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create `src/components/players/listening/ListeningPlayer.jsx`. **DO NOT modify the reading player** — this is a separate component.

### E.1 — Positioning strategy

The player must respect the sidebar's expanded/collapsed state **without any context plumbing**. Achieve this by being **sticky inside the section's content column**:

```jsx
// Wrapper inside ListeningSection (Phase F):
<div className="sticky top-4 z-20">
  <ListeningPlayer ... />
</div>
```

The section sits inside the main content area, which is already laid out next to (and constrained by) the sidebar. A sticky element inside the content column inherits the column's width automatically. No `fixed`. No `left-0 right-0`. No conditional class based on sidebar state.

If a different positioning serves the design better (e.g., sticky at the bottom of the section instead of the top), use that — but it must be `sticky`, not `fixed`.

### E.2 — Premium visual treatment

- Glass card: `background: rgba(255, 255, 255, 0.04)`, `border: 1px solid rgba(255, 255, 255, 0.08)`, `backdrop-filter: blur(24px)`, `border-radius: 20px`, generous padding (28-32px)
- Subtle gold accent on the **play button** (Velvet gold) — primary affordance
- Speaker-segment ticks: small gold marks (`var(--ds-gold)`) overlaid on the scrubber at each `segment.start_ms / durationMs * 100` percent. Tooltip on hover: speaker name.
- Live label below scrubber: **"يتحدث الآن: <name>"** in Tajawal medium. The name reads from `speaker_segments` filtered by current `audio.currentTime`. Smooth fade between speakers (200ms opacity transition).
- Speed: segmented control `[0.5×] [0.75×] [1×] [1.25×] [1.5×]`, active speed pill-styled with gold fill
- Skip buttons: ⟲5 and 5⟳ (5-second skips, not 10s — better for language learners on short utterances)
- Time readout: `0:00 / 2:03` in Tajawal regular, muted
- A-B loop affordance: optional, label "تكرار مقطع" — if too complex for this pass, skip and add a TODO comment
- NO custom scrollbars, NO inline styles for color values (use `var(--ds-*)` tokens only)

### E.3 — Component contract

```jsx
/**
 * @param {string}  audioUrl          Public URL to the listening MP3
 * @param {number}  durationMs        Authoritative duration from DB (not <audio>.duration, which can lie if file is broken)
 * @param {Array}   speakerSegments   [{ speaker_id, speaker_name_ar, start_ms, end_ms, text }, ...]
 * @param {string?} audioType         "dialogue" | "monologue" | "interview" | ... (drives label tone)
 */
```

Internals:
- `useRef` for the `<audio>` element
- `useState` for: `isPlaying`, `currentMs`, `speed`, `currentSpeakerId`
- `useEffect` to attach `timeupdate` / `play` / `pause` / `ended` listeners — cleanup on unmount
- All hooks at top of file, NO conditional returns above them
- Compute current speaker via `speakerSegments.find(s => currentMs >= s.start_ms && currentMs < s.end_ms)`
- Error handling: if `<audio>` fires `error`, render a friendly Arabic message "تعذّر تحميل الصوت — حاول التحديث" with a retry button. Never crash the parent.

### E.4 — Accessibility

- All controls have `aria-label` in Arabic
- Play/pause is `<button type="button">`, not a div
- Scrubber is `<input type="range">` styled, with `aria-valuetext` reading the current speaker name
- Focus rings visible (`focus-visible:ring-2 ring-[var(--ds-gold)]`)

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE F — Rebuild ListeningSection
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create `src/components/players/listening/ListeningSection.jsx`. This replaces whatever listening rendering happens in the unit page today.

### F.1 — Layout

```
┌─ Section header ────────────────────────────────────────────┐
│  🎧 الاستماع                                                │
│  استمع للمقطع وحاول الإجابة بدون قراءة النص. يمكنك إظهار   │
│  النص في أي وقت من الزر أدناه.                              │
└─────────────────────────────────────────────────────────────┘

┌─ Listening item card ───────────────────────────────────────┐
│  [audio_type badge]  [IELTS badge if applicable]            │
│                                                              │
│  محادثة عن امتحان علم النفس ودراسة الذاكرة                │
│  Conversation About a Psychology Exam and Memory            │
└─────────────────────────────────────────────────────────────┘

┌─ Sticky player (Phase E) ──────────────────────────────────┐
│  [play] ████░░░░ 0:45 / 2:03   [0.5×][0.75×][●1×][1.25×]   │
│  يتحدث الآن: سارة                                          │
└─────────────────────────────────────────────────────────────┘

┌─ Tabs ──────────────────────────────────────────────────────┐
│  [● الأسئلة]  [○ النص]                                     │
└─────────────────────────────────────────────────────────────┘

┌─ Active tab content ────────────────────────────────────────┐
│  (questions list — preserve all existing question logic    │
│   verbatim from the current implementation)                │
│                                                              │
│  OR                                                          │
│                                                              │
│  (transcript view — show speaker-formatted transcript      │
│   from speaker_segments, highlighting the active speaker)  │
└─────────────────────────────────────────────────────────────┘
```

### F.2 — Defaults and behaviors

- Default active tab: **الأسئلة** (questions). The audio is to be listened to FIRST, then answered. The transcript is a helper, not the primary content.
- Transcript tab: render `speakerSegments` as a chat-style stack of bubbles, color-coded per speaker. The bubble whose `start_ms <= currentMs < end_ms` gets a gold left-border (in RTL: right-border) to indicate "now speaking".
- The questions tab content **must preserve every behavior of the current implementation** — submission handling, validation, progress tracking, scoring. Phase F only changes the surrounding chrome, not the question logic. Read the current questions code, lift it into a child component (e.g., `<ListeningQuestions unit={unit} listeningId={...} />`), and render it inside the questions tab.

### F.3 — Component contract

```jsx
/**
 * @param {object} listening   curriculum_listening row with audio_url, audio_duration_ms, transcript,
 *                             speaker_segments, title_ar, title_en, audio_type, etc.
 * @param {object} unit        parent unit (for question lookup / progress context)
 */
export default function ListeningSection({ listening, unit }) { ... }
```

### F.4 — Wire it in

Find the parent unit page that previously rendered the broken listening UI (likely `src/pages/student/curriculum/UnitPage.jsx` or similar, identified in Phase A). Replace the old listening rendering with:

```jsx
{unit.listening?.map(item => (
  <ListeningSection key={item.id} listening={item} unit={unit} />
))}
```

Remove the old top "current item" banner that caused the duplicate-header bug. Remove any `StickyAudioBar`-style fixed-bottom player import from the listening path (the reading flow can keep using its own player — don't touch it).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE G — Self-check + commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### G.1 — Self-check (every assertion must pass)

1. `grep -n "c copy" scripts/audio-v2/lib/concat.cjs` → **ZERO matches**
2. `node scripts/audio-v2/test-concat.cjs` → exits 0 with PASS line
3. Re-download 3 random REGENERATED listening files, run `ffmpeg -v error -i f.mp3 -f null -` on each → all exit 0
4. SQL:
   ```sql
   SELECT COUNT(*) FROM curriculum_listening WHERE title_ar IS NULL OR title_ar = '';
   ```
   → 0
5. SQL (duplicate check from Phase A.4) → 0 rows
6. `grep -rn "fixed bottom-0" src/components/players/listening/` → **ZERO** (player is sticky, not fixed)
7. `grep -rn "import.*ListeningPlayer" src/components/players/listening/ListeningSection.jsx` → present
8. `grep -rn "import.*ListeningPlayer" src/components/players/reading/` → **ZERO** (reading does not import the listening player)
9. ESLint clean on new files:
   ```bash
   npx eslint src/components/players/listening/ --max-warnings=0
   ```
10. Manual hook-order check on both new components — every `use*` hook appears above any conditional return
11. SQL final sanity: every `curriculum_listening` row with `audio_url IS NOT NULL` also has `audio_duration_ms > 0` and a non-empty `speaker_segments`
12. `git status` shows only intended files staged (no `node_modules`, no `.env`, no `/tmp/*`)

### G.2 — Final report

Write `docs/audits/listening-overhaul/FINAL-REPORT.md` with:
- Phase A findings summary
- Concat bug: before (decode-test failures) / after (decode-test passes), with the specific commit line change
- Rows regenerated: N
- Rows deduped: N (or N/A)
- Rows titled: N (or N/A)
- ElevenLabs chars consumed
- New components shipped: ListeningPlayer + ListeningSection
- Files removed/deprecated
- Known follow-ups (e.g., A-B loop deferred, etc.)

### G.3 — Commit + push

```bash
git add scripts/audio-v2/lib/concat.cjs \
        scripts/audio-v2/test-concat.cjs \
        scripts/audio-v2/audit-listening-decode.cjs \
        scripts/audio-v2/03-generate-listening.cjs \
        supabase/migrations/ \
        docs/backups/ \
        docs/audits/listening-overhaul/ \
        src/components/players/listening/ \
        src/pages/student/curriculum/

git commit -m "fix(listening): root-cause concat truncation + premium player + section rebuild

ROOT CAUSE of truncated multi-voice audio:
- scripts/audio-v2/lib/concat.cjs used 'ffmpeg -f concat -c copy'.
  Stream-copying MP3 segments from separate ElevenLabs calls produces a
  file with a correct-looking header duration but audio that decodes only
  to the first segment boundary. Every prior regeneration reproduced the
  same broken file because the bug was in the concat step, not generation.

FIX:
- concat.cjs rewritten: normalize each segment (libmp3lame, 44.1kHz mono,
  128kbps), then concat WITH re-encoding. Decode-verify the final output
  (ffmpeg -v error ... -f null -) as the pass/fail gate. Throws on failure.
- test-concat.cjs: standalone smoke test (3 tones → concat → decode-verify).
- audit-listening-decode.cjs: ffprobe + decode-test every listening row.
- 03-generate-listening.cjs: targeted regen of decode-flagged rows, with
  .select() rowcount assertion on every update.

ALSO:
- Deduped curriculum_listening rows (JSON backup in docs/backups/).
- Filled null title_ar / title_en.
- New ListeningPlayer: sticky-in-content (respects sidebar without context
  plumbing), Velvet glass card, speaker-segment ticks, 'يتحدث الآن' label,
  5s skip, distinct from reading player.
- New ListeningSection: clear hierarchy (header → item card → sticky player
  → tabs: questions | transcript). Removed the duplicate top banner that
  rendered the same item title twice on screen.
- Reading flow untouched.
- Student submission / unit_progress logic untouched."

git push origin main
git fetch origin
git log --oneline -1 HEAD
git log --oneline -1 origin/main
```

Confirm HEAD == origin/main.

---

## ⛔ DO NOT

- ❌ Modify any `submissions` or `unit_progress` rows
- ❌ Modify the reading player or reading components
- ❌ Modify any IELTS tables or pages
- ❌ Run `vite build` locally
- ❌ Use `-c copy` anywhere in any ffmpeg invocation in this codebase
- ❌ Trust ffprobe duration alone as proof of audio health — always decode-test
- ❌ Stream-copy any multi-source MP3 ever again
- ❌ Stop after Phase A to ask for confirmation — proceed automatically through G

## ✅ FINISH LINE

- Every listening row's audio passes a decode-test (`ffmpeg ... -f null -` exit 0)
- No duplicate header rendering on the unit page
- ListeningPlayer is a separate, premium, sticky-in-content component used only by listening
- ListeningSection has a clear premium hierarchy
- `docs/audits/listening-overhaul/FINAL-REPORT.md` exists
- One commit pushed to `origin/main`, Vercel deploys it

End of prompt.
