# 07-LISTENING-SECTION-OVERHAUL — Root-cause audio fix + premium redesign

> **Move + execute:**
> ```powershell
> Move-Item -Force "$env:USERPROFILE\Downloads\07-LISTENING-SECTION-OVERHAUL.md" "C:\Users\Dr. Ali\Desktop\fluentia-lms\prompts\agents\07-LISTENING-SECTION-OVERHAUL.md"
> ```
> ```
> Read and execute prompts/agents/07-LISTENING-SECTION-OVERHAUL.md
> ```

---

## 🎯 MISSION

Fix the listening section end-to-end. Four problems, all addressed in this one prompt:

1. **Truncated multi-voice audio.** Audio plays the first speaker's first sentence and stops dead. **ROOT CAUSE — read this carefully:** the concat utility uses `ffmpeg -f concat -c copy`. With `-c copy`, MP3 segments from separate ElevenLabs calls (which carry per-call codec/encoder-delay drift) concatenate into a file whose **header duration looks correct (e.g. 3:07)** but whose audio **only decodes up to the first segment boundary**. Every previous "regeneration" reproduced the identical broken file because the bug is in the concat step, not the generation step. **The fix is to RE-ENCODE during concat, never stream-copy.**

2. **Duplicate / untitled listening cards.** The unit shows two identical "Listening: interview" cards with no real titles — `title_ar` is null so the UI falls back to a generic English string, and there may be genuine duplicate rows from the seed.

3. **Unprofessional audio player.** The current player is a generic full-width bar that spans under the sidebar and looks nothing like a premium product. It must become a **listening-specific** component, visually distinct from the reading player, and it must **respect the sidebar's expanded/collapsed state**.

4. **The whole listening section is disorganized.** It needs restructuring into a clear, premium-feeling experience.

---

## 📁 ENVIRONMENT

- **Working dir:** `C:\Users\Dr. Ali\Desktop\fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`
- **DB:** Supabase prod (`nmjexpuycmqcxuxljier`), bucket `curriculum-audio`
- **Reference unit for testing:** Unit 10, Level 3 — "الزراعة الحضرية" (Urban Agriculture). It has the visible duplicate + truncation bug.
- **Node env:** `NODE_OPTIONS=--dns-result-order=ipv4first` (mandatory — IPv6 → ECONNRESET)
- **Tools:** ffmpeg + ffprobe required. Verify `ffmpeg -version`; if missing → `winget install ffmpeg`, re-verify in new shell.
- **Design system:** `var(--ds-*)` tokens, Velvet Midnight theme (dark, gold accents), RTL Arabic-first, Tajawal for Arabic UI.

---

## ⚠️ STRICT RULES

1. **The truncation bug is in the concat step.** Do not waste time re-investigating the ElevenLabs generation calls — they produce valid per-segment MP3s. The concat is what corrupts them.
2. **Decode-test, not header-test.** A file passes only if `ffmpeg -v error -i file.mp3 -f null -` exits 0. `ffprobe` duration alone is NOT proof of a healthy file — that's exactly what masked this bug.
3. **Student work protection** — only touch `curriculum_listening` rows. No `submissions`, no `unit_progress`, no student data.
4. **Curriculum content edits via reversible migration** — if duplicate rows must be removed, do it in a numbered migration with the deleted rows logged to a JSON backup first.
5. **All hooks before conditional returns.** No React Error #310.
6. **`profile.id` not `user.id`** for any student-scoped read.
7. **No `vite build` locally.**
8. **Idempotent** — re-running must not double-charge ElevenLabs or duplicate uploads (`upsert: true`).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Discovery (read-only)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 — Listening data audit (duplicates + titles)

```sql
-- Schema first
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'curriculum_listening' ORDER BY ordinal_position;

-- Unit 10's listening rows — the visible bug
SELECT cl.id, cl.title_en, cl.title_ar, cl.audio_type, cl.audio_url IS NOT NULL AS has_audio,
       cl.speaker_segments IS NOT NULL AS has_segments,
       LEFT(cl.transcript, 80) AS transcript_preview,
       cl.order_index
FROM curriculum_listening cl
JOIN curriculum_units cu ON cu.id = cl.unit_id
JOIN curriculum_levels clv ON clv.id = cu.level_id
WHERE clv.level_number = 3 AND cu.unit_number = 10
ORDER BY cl.order_index, cl.id;

-- Detect genuine duplicates across ALL units (same transcript or same title within a unit)
SELECT unit_id, transcript, COUNT(*) AS copies, array_agg(id) AS row_ids
FROM curriculum_listening
GROUP BY unit_id, transcript
HAVING COUNT(*) > 1;

-- Count rows with missing Arabic title (UI fallback to "Listening: interview")
SELECT COUNT(*) AS missing_title_ar FROM curriculum_listening WHERE title_ar IS NULL OR title_ar = '';

-- Full inventory: per level/unit listening count
SELECT clv.level_number, cu.unit_number, COUNT(*) AS listening_items
FROM curriculum_listening cl
JOIN curriculum_units cu ON cu.id = cl.unit_id
JOIN curriculum_levels clv ON clv.id = cu.level_id
GROUP BY clv.level_number, cu.unit_number
ORDER BY clv.level_number, cu.unit_number;
```

Determine for Unit 10: are the two cards (a) two genuine distinct exercises that simply lack titles, or (b) literal duplicate rows (identical transcript) from a bad seed? Record the answer.

### A.2 — Confirm the concat bug (decode-test, not header-test)

Pick 5 multi-voice listening rows (`audio_type IN ('dialogue','interview')`, `speaker_segments` length > 1). For each:

```bash
# Download
curl -sL "<audio_url>" -o /tmp/test-listen.mp3

# Header duration (what ffprobe reports — this is the LIE)
ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/test-listen.mp3

# Decode test (the TRUTH) — does the whole file actually decode?
ffmpeg -v error -i /tmp/test-listen.mp3 -f null - 2>&1
# Exit code 0 = healthy. Non-zero or errors printed = CORRUPT (the -c copy bug).

# Real decoded duration — re-encode to measure actual audible length
ffmpeg -v error -i /tmp/test-listen.mp3 -f null - 2>&1 | tail -1
```

Expected finding: header says ~3:07, decode test errors out or real duration ≈ length of just the first segment. Document this in the report — it's the proof the concat is the culprit.

### A.3 — Component discovery

```bash
# The listening section + its list rendering (the duplicate-card bug lives here or in data)
grep -rln "curriculum_listening\|ListeningTab\|ListeningSection\|Listening.*interview" src/ --include="*.jsx" --include="*.tsx"

# The current player (from prompt 06 — StickyAudioBar)
grep -rln "StickyAudioBar\|ListeningAudioPlayer\|ListeningPlayer" src/ --include="*.jsx"

# How the player is positioned today (the full-width-under-sidebar problem)
grep -rn "fixed bottom-0\|fixed.*left-0.*right-0" src/components/players/ --include="*.jsx"
```

Read every match. Document:
- Which component renders the list of listening items for a unit (and why two cards appear)
- Which component is the current player and how it's positioned
- The prop interface each expects

### A.4 — Layout / sidebar structure

```bash
# Find the app shell + sidebar so the new player can respect its width
grep -rln "Sidebar\|sidebar.*collapsed\|sidebar.*expanded\|AppShell\|MainLayout" src/ --include="*.jsx" | head -15
grep -rn "sidebar.*width\|--sidebar-width\|ml-\[.*sidebar\|mr-\[.*sidebar" src/ --include="*.jsx" --include="*.css" | head -15
```

Determine: is there a layout context exposing sidebar state? Is the main content column a scroll container, or does the whole page scroll? This decides the positioning strategy in Phase E (prefer `position: sticky; bottom:0` inside the content column — it respects sidebar width automatically with zero context plumbing).

### A.5 — Per-segment timing availability

```sql
-- Does speaker_segments carry per-segment timing? Inspect a row.
SELECT id, jsonb_pretty(speaker_segments) FROM curriculum_listening
WHERE speaker_segments IS NOT NULL LIMIT 1;
```

If segments lack `start_ms`/`end_ms`, the regeneration in Phase C will add them (cheap — we already know each segment's audio duration during concat). The premium player uses these for speaker markers + current-speaker label.

### A.6 — Write discovery report

`docs/audits/listening-overhaul/DISCOVERY.md` — duplicate verdict, concat-bug proof, component map, layout strategy, segment-timing status.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Fix the concat utility (THE root cause)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### B.1 — Rewrite `scripts/audio-v2/lib/concat.cjs`

```javascript
// Concatenate MP3 buffers with 300ms silence between segments.
// CRITICAL: re-encode (libmp3lame), never -c copy. -c copy on MP3 segments with
// per-call encoder-delay drift produces a file whose header duration is correct
// but whose audio decodes only up to the first segment boundary.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TARGET_SR = 44100;
const TARGET_BR = '128k';
const TARGET_CH = 1; // mono — ElevenLabs TTS is mono; keeps files small

const SILENCE_MP3 = path.join(__dirname, '..', 'silence-300ms.mp3');

function ensureSilence() {
  if (!fs.existsSync(SILENCE_MP3)) {
    execSync(
      `ffmpeg -y -f lavfi -i anullsrc=r=${TARGET_SR}:cl=mono -t 0.3 ` +
      `-c:a libmp3lame -ar ${TARGET_SR} -b:a ${TARGET_BR} -ac ${TARGET_CH} "${SILENCE_MP3}"`,
      { stdio: 'pipe' }
    );
  }
}

/**
 * Returns { buffer, durationMs, segmentOffsets } where segmentOffsets[i] is the
 * start time (ms) of segment i within the final concatenated file. Silence gaps
 * are included in the math so offsets stay accurate.
 */
async function concatMp3Buffers(buffers) {
  if (!buffers.length) throw new Error('No buffers to concat');

  ensureSilence();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fluentia-concat-'));

  try {
    // 1. Normalize EVERY segment to identical codec params first.
    //    This alone makes concat safe, and is required for accurate offsets.
    const normPaths = [];
    const segmentDurations = [];
    buffers.forEach((buf, i) => {
      const raw = path.join(tmpDir, `raw-${i}.mp3`);
      const norm = path.join(tmpDir, `norm-${i}.mp3`);
      fs.writeFileSync(raw, buf);
      execSync(
        `ffmpeg -y -i "${raw}" -c:a libmp3lame -ar ${TARGET_SR} -b:a ${TARGET_BR} -ac ${TARGET_CH} "${norm}"`,
        { stdio: 'pipe' }
      );
      normPaths.push(norm);
      const dur = parseFloat(
        execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${norm}"`).toString().trim()
      );
      segmentDurations.push(dur);
    });

    // 2. Build the concat list with silence between segments.
    const listPath = path.join(tmpDir, 'list.txt');
    const lines = [];
    normPaths.forEach((p, i) => {
      lines.push(`file '${p.replace(/'/g, "'\\''")}'`);
      if (i < normPaths.length - 1) lines.push(`file '${SILENCE_MP3.replace(/'/g, "'\\''")}'`);
    });
    fs.writeFileSync(listPath, lines.join('\n'));

    // 3. Concat WITH RE-ENCODING. This is the fix. Never -c copy here.
    const outPath = path.join(tmpDir, 'out.mp3');
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" ` +
      `-c:a libmp3lame -ar ${TARGET_SR} -b:a ${TARGET_BR} -ac ${TARGET_CH} "${outPath}"`,
      { stdio: 'pipe' }
    );

    // 4. DECODE-VERIFY the output. Header duration is not enough.
    try {
      execSync(`ffmpeg -v error -i "${outPath}" -f null -`, { stdio: 'pipe' });
    } catch (e) {
      throw new Error(`Concat output failed decode verification: ${e.message}`);
    }

    const result = fs.readFileSync(outPath);
    const totalDur = parseFloat(
      execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${outPath}"`).toString().trim()
    );

    // 5. Compute per-segment offsets (segment i starts after all prior segments + 300ms gaps).
    const SILENCE_S = 0.3;
    const segmentOffsets = [];
    let cursor = 0;
    segmentDurations.forEach((dur, i) => {
      segmentOffsets.push(Math.round(cursor * 1000));
      cursor += dur + (i < segmentDurations.length - 1 ? SILENCE_S : 0);
    });

    return {
      buffer: result,
      durationMs: Math.round(totalDur * 1000),
      segmentOffsets,
      segmentDurations: segmentDurations.map(d => Math.round(d * 1000))
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/** Standalone decode verification for any mp3 file or buffer. */
function verifyMp3Decodes(input) {
  const tmp = input instanceof Buffer
    ? (() => { const p = path.join(os.tmpdir(), `verify-${Date.now()}.mp3`); fs.writeFileSync(p, input); return p; })()
    : input;
  try {
    execSync(`ffmpeg -v error -i "${tmp}" -f null -`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  } finally {
    if (input instanceof Buffer) fs.rmSync(tmp, { force: true });
  }
}

module.exports = { concatMp3Buffers, verifyMp3Decodes };
```

### B.2 — Quick proof test

Create `scripts/audio-v2/test-concat.cjs` that:
1. Generates 3 tiny TTS clips with different voices (one ElevenLabs call each, ~5 words).
2. Runs `concatMp3Buffers`.
3. Asserts `verifyMp3Decodes(result.buffer) === true`.
4. Asserts `result.durationMs` ≈ sum of segment durations + 600ms (2 gaps), within 5%.
5. Prints `segmentOffsets`.

Run it. **Must pass** before Phase C. If it fails, the concat is still wrong — fix before proceeding.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Regenerate ALL broken listening audio
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### C.1 — Re-audit every listening row with the decode test

Script `scripts/audio-v2/audit-listening-decode.cjs`:
- For every `curriculum_listening` row with `audio_url`:
  - Download, run `verifyMp3Decodes`.
  - Compute expected duration from `speaker_segments[].text` word count / 2.5 wps.
  - If decode fails OR real duration < 75% of expected → mark for regeneration.
- Write `docs/audits/listening-overhaul/regen-list.json`.

### C.2 — Migration: add segment timing columns

`supabase/migrations/YYYYMMDDHHMMSS_listening_segment_timing.sql`:

```sql
-- speaker_segments will be re-written to include start_ms/end_ms per segment.
-- audio_duration_ms may already exist; guard it.
ALTER TABLE curriculum_listening
  ADD COLUMN IF NOT EXISTS audio_duration_ms integer;
-- (speaker_segments is jsonb already — no DDL needed, we enrich the JSON shape)
```

### C.3 — Regenerate

Modify `scripts/audio-v2/03-generate-listening.cjs` to use the new `concatMp3Buffers` return shape:

For each row in `regen-list.json`:
1. Read `speaker_segments` (already populated; if not, run the preprocessor first).
2. Generate each segment with its assigned `voice_id` + word-timestamps.
3. `concatMp3Buffers(segmentBuffers)` → `{ buffer, durationMs, segmentOffsets, segmentDurations }`.
4. **Decode-verify** the buffer before upload. If it fails → log to `post-regen-failures.json`, skip upload, continue.
5. Upload with `upsert: true` to the same `audio_url` path (overwrites the corrupt file).
6. Enrich `speaker_segments`: write back each segment with `start_ms = segmentOffsets[i]`, `end_ms = segmentOffsets[i] + segmentDurations[i]`.
7. Stitch `word_timestamps` across segments using `segmentOffsets[i]` as the per-segment base offset.
8. `UPDATE curriculum_listening SET audio_url=..., audio_path=..., audio_duration_ms=durationMs, speaker_segments=<enriched>, word_timestamps=<stitched>, audio_generated_at=now()`.

Rate-limit handling: 429 → backoff 1s→16s, max 6 retries. Sleep 200ms between calls.

### C.4 — Verify

For every regenerated row: re-download, `verifyMp3Decodes` must pass, real duration ≥ 80% of expected, `speaker_segments` all have numeric `start_ms`. Write `docs/audits/listening-overhaul/REGEN-REPORT.md`.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Fix duplicate + untitled listening items
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### D.1 — Handle duplicates (based on A.1 verdict)

**If genuine duplicate rows exist** (identical transcript within a unit):
- Back up the rows to delete: `docs/audits/listening-overhaul/deleted-duplicate-rows.json`.
- Migration `YYYYMMDDHHMMSS_dedupe_listening.sql` that keeps the lowest `order_index` (or oldest `id`) per (unit_id, transcript) group and deletes the rest. Reversible — the JSON backup has the full row data.
- Re-sequence `order_index` so remaining rows are contiguous.

**If the two cards are genuine distinct exercises** — leave the rows, just fix titles in D.2.

### D.2 — Generate proper Arabic titles (dev-time, free — no runtime API)

For every `curriculum_listening` row where `title_ar` is null/empty:
- Generate a concise, specific Arabic title from the transcript content. Claude Code writes these directly — this is dev-time content generation, **not** a runtime Claude API call.
- Title style: short, descriptive, premium tone. Examples: "محادثة في المقهى عن خطط نهاية الأسبوع", "مقابلة مع مزارع حضري عن مستقبل الغذاء", "نقاش حول العمل عن بُعد".
- Also set `title_en` to a clean specific title if it's the generic "Listening: interview" placeholder.
- Apply via `execute_sql` UPDATE statements (one migration file `YYYYMMDDHHMMSS_listening_titles.sql`, or a Node script — your call, but make it reversible / logged).

### D.3 — Verify

```sql
SELECT COUNT(*) FROM curriculum_listening WHERE title_ar IS NULL OR title_ar = '';
-- Expected: 0
SELECT unit_id, transcript, COUNT(*) FROM curriculum_listening GROUP BY unit_id, transcript HAVING COUNT(*) > 1;
-- Expected: 0 rows (if dedup was needed)
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE E — Premium listening player (new, listening-specific, sidebar-aware)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Delete the generic `StickyAudioBar` usage from the listening flow. Build a dedicated, premium **`ListeningPlayer`**. The reading player keeps its own simpler bar — these are now fully separate.

### E.1 — Positioning strategy: sticky-in-content

The player must NOT be `position: fixed; left:0; right:0` — that spans under the sidebar. Instead: render it as the **last child of the listening content column** with `position: sticky; bottom: 1rem`. Sticky positioning is constrained to the parent's width, so it automatically respects whatever width the content column has — sidebar expanded or collapsed, no context plumbing needed.

If Phase A.4 found that the whole page scrolls (not a content-column scroll container), `position: sticky; bottom: 1rem` still works as long as the player sits inside the normal content flow of the listening section.

### E.2 — `src/components/players/listening/ListeningPlayer.jsx`

Premium, Velvet-Midnight aesthetic, listening-specific features: refined scrubber **with speaker-segment tick marks**, **current-speaker label**, large central play, replay-5s / forward-5s (5s suits language re-listening better than 10s), elegant speed control, A-B loop.

```jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];

function fmt(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Premium listening player. Distinct from the reading player.
 * - sticky-in-content (respects sidebar width automatically)
 * - speaker-segment ticks on the scrubber
 * - live current-speaker label
 * - replay/forward 5s, speed, A-B loop
 *
 * Props:
 *   audioUrl          string
 *   speakerSegments   [{ speaker_name, voice, start_ms, end_ms, text }]  (optional)
 *   durationMs        number (optional — falls back to element duration)
 *   onTimeUpdate      (ms) => void   (optional, for transcript karaoke)
 */
export function ListeningPlayer({ audioUrl, speakerSegments = [], durationMs, onTimeUpdate }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [totalSec, setTotalSec] = useState(durationMs ? durationMs / 1000 : 0);
  const [speed, setSpeed] = useState(1);
  const [ab, setAb] = useState({ a: null, b: null });
  const [collapsed, setCollapsed] = useState(false);

  // segment lookup for current-speaker label
  const segMarks = useMemo(
    () => speakerSegments
      .filter(s => typeof s.start_ms === 'number')
      .map(s => ({ ...s, startSec: s.start_ms / 1000, endSec: (s.end_ms ?? s.start_ms) / 1000 })),
    [speakerSegments]
  );
  const currentSpeaker = useMemo(() => {
    for (let i = segMarks.length - 1; i >= 0; i--) {
      if (currentSec >= segMarks[i].startSec) return segMarks[i];
    }
    return null;
  }, [segMarks, currentSec]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      setCurrentSec(el.currentTime);
      onTimeUpdate?.(el.currentTime * 1000);
      if (ab.a != null && ab.b != null && el.currentTime >= ab.b) el.currentTime = ab.a;
    };
    const onMeta = () => setTotalSec(el.duration || (durationMs ? durationMs / 1000 : 0));
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnd);
    if (el.readyState >= 1) onMeta();
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnd);
    };
  }, [ab, durationMs, onTimeUpdate]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.paused ? el.play().catch(() => {}) : el.pause();
  }, []);
  const seek = useCallback((sec) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(sec, totalSec || el.duration || 0));
  }, [totalSec]);
  const setRate = useCallback((s) => {
    const el = audioRef.current;
    if (el) el.playbackRate = s;
    setSpeed(s);
  }, []);

  const progressPct = totalSec ? (currentSec / totalSec) * 100 : 0;

  return (
    <div
      dir="ltr"
      className="sticky bottom-4 z-30 mt-8"
    >
      <motion.div
        layout
        className="rounded-3xl border border-[var(--ds-border-default)]
                   bg-[color-mix(in_srgb,var(--ds-surface-elevated)_92%,transparent)]
                   backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]
                   overflow-hidden"
      >
        {/* Gold hairline accent at the very top */}
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--ds-accent-gold)] to-transparent opacity-60" />

        {/* Current speaker label — listening-specific premium touch */}
        <AnimatePresence mode="wait">
          {currentSpeaker && (
            <motion.div
              key={currentSpeaker.speaker_name + currentSpeaker.startSec}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="px-5 pt-3 flex items-center gap-2"
              dir="rtl"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ds-accent-gold)] animate-pulse" />
              <span className="text-xs text-[var(--ds-text-secondary)]">
                يتحدث الآن: <span className="text-[var(--ds-accent-gold)] font-semibold">{currentSpeaker.speaker_name}</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrubber with speaker-segment ticks */}
        <div className="px-5 pt-3">
          <div className="relative h-8 flex items-center">
            {/* track */}
            <div className="absolute inset-x-0 h-1.5 rounded-full bg-[var(--ds-surface)] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--ds-accent)] to-[var(--ds-accent-gold)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {/* speaker segment ticks */}
            {segMarks.map((s, i) => (
              <div
                key={i}
                className="absolute w-0.5 h-3 rounded-full bg-[var(--ds-accent-gold)] opacity-40"
                style={{ left: `${totalSec ? (s.startSec / totalSec) * 100 : 0}%` }}
                title={s.speaker_name}
              />
            ))}
            {/* invisible range input for seeking */}
            <input
              type="range" min={0} max={totalSec || 0} step={0.01} value={currentSec}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="absolute inset-x-0 w-full h-8 opacity-0 cursor-pointer"
              aria-label="Seek"
            />
            {/* thumb */}
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-lg pointer-events-none
                         border-2 border-[var(--ds-accent-gold)]"
              style={{ left: `calc(${progressPct}% - 7px)` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-[var(--ds-text-tertiary)] -mt-1">
            <span>{fmt(currentSec)}</span>
            <span>{fmt(totalSec)}</span>
          </div>
        </div>

        {/* Controls */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="px-5 py-4 flex items-center gap-3">
                {/* Replay 5s */}
                <button
                  onClick={() => seek(currentSec - 5)}
                  aria-label="رجوع 5 ثوانٍ"
                  className="grid place-items-center w-10 h-10 rounded-xl
                             text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)] transition"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4a8 8 0 108 8" /><path d="M11 4L7 1M11 4L7 7" />
                  </svg>
                </button>

                {/* Play / Pause — large, gold */}
                <button
                  onClick={toggle}
                  aria-label={playing ? 'إيقاف' : 'تشغيل'}
                  className="grid place-items-center w-14 h-14 rounded-full
                             bg-gradient-to-br from-[var(--ds-accent-gold)] to-[var(--ds-accent)]
                             text-black shadow-lg hover:scale-105 active:scale-95 transition"
                >
                  {playing ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><polygon points="6 4 20 12 6 20 6 4"/></svg>
                  )}
                </button>

                {/* Forward 5s */}
                <button
                  onClick={() => seek(currentSec + 5)}
                  aria-label="تقديم 5 ثوانٍ"
                  className="grid place-items-center w-10 h-10 rounded-xl
                             text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)] transition"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 4a8 8 0 11-8 8" /><path d="M13 4l4-3M13 4l4 3" />
                  </svg>
                </button>

                {/* Speed — elegant segmented */}
                <div className="flex items-center gap-0.5 mr-auto ml-2 p-1 rounded-xl bg-[var(--ds-surface)]">
                  {SPEEDS.map(s => (
                    <button
                      key={s}
                      onClick={() => setRate(s)}
                      className={`px-2 py-1 rounded-lg text-xs font-mono transition ${
                        speed === s
                          ? 'bg-[var(--ds-accent)] text-white'
                          : 'text-[var(--ds-text-tertiary)] hover:text-[var(--ds-text-secondary)]'
                      }`}
                    >{s}×</button>
                  ))}
                </div>

                {/* A-B loop */}
                <div className="flex items-center gap-1 pl-3 border-l border-[var(--ds-border-default)]">
                  <button
                    onClick={() => setAb(p => ({ ...p, a: currentSec }))}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                      ab.a != null ? 'bg-[var(--ds-accent-gold)] text-black' : 'bg-[var(--ds-surface)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)]'
                    }`}
                  >A</button>
                  <button
                    onClick={() => setAb(p => ({ ...p, b: currentSec }))}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                      ab.b != null ? 'bg-[var(--ds-accent-gold)] text-black' : 'bg-[var(--ds-surface)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)]'
                    }`}
                  >B</button>
                  {(ab.a != null || ab.b != null) && (
                    <button
                      onClick={() => setAb({ a: null, b: null })}
                      className="w-6 h-8 text-[var(--ds-text-tertiary)] hover:text-[var(--ds-text-primary)] text-sm"
                      aria-label="إلغاء التكرار"
                    >×</button>
                  )}
                </div>

                {/* Collapse */}
                <button
                  onClick={() => setCollapsed(true)}
                  className="grid place-items-center w-8 h-8 rounded-lg text-[var(--ds-text-tertiary)]
                             hover:bg-[var(--ds-surface-hover)] transition"
                  aria-label="تصغير"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              </div>
            </motion.div>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="w-full py-1.5 text-[11px] text-[var(--ds-text-tertiary)] hover:text-[var(--ds-text-primary)] transition"
            >▲ توسيع المشغّل</button>
          )}
        </AnimatePresence>

        {/* The actual audio element */}
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      </motion.div>
    </div>
  );
}
```

### E.3 — Reading player stays separate

Confirm the reading flow still uses its own `StickyAudioBar` (or whatever prompt 06 created) — do NOT route reading through `ListeningPlayer`. They are now intentionally distinct components with distinct designs.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE F — Restructure the listening section
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rebuild the listening section component into a clear premium hierarchy. The current layout (sparkle header → stray IELTS badge → two identical cards → show-text button → empty box → ugly player) is replaced with:

### F.1 — `src/components/players/listening/ListeningSection.jsx`

```
┌─ Section intro ───────────────────────────────────┐
│  ✦ الاستماع                                       │
│  <one-line Arabic guidance>                       │
└───────────────────────────────────────────────────┘

┌─ Exercise selector (only if unit has >1 item) ────┐
│  [ تمرين 1: المقابلة ]  [ تمرين 2: المحادثة ]      │  ← segmented tabs, real titles
└───────────────────────────────────────────────────┘

┌─ Active exercise card ────────────────────────────┐
│  <title_ar>            [audio_type badge]         │
│                                                   │
│  ┌─ before listening ──────────────────────────┐  │
│  │ استمع وحاول الإجابة بدون قراءة النص          │  │
│  │           [ إظهار النص ]                      │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ── when transcript shown: InteractivePassage ──  │
│     (word-tap → translation + per-word audio)     │
│                                                   │
│  ── questions block (existing component) ──       │
└───────────────────────────────────────────────────┘

   ⌄ sticky ListeningPlayer pinned to bottom of column ⌄
```

Requirements:
- **Exercise selector** only renders if the unit genuinely has more than one listening item. Single item → no selector, go straight to the card. (This also visually resolves the "two cards" confusion — they become two clean labelled tabs, not two mystery cards.)
- Each exercise uses its real `title_ar` from Phase D.
- The `audio_type` badge stays but styled as a refined pill, not the current loud purple.
- The IELTS-simulation badge: if it belongs here, integrate it cleanly into the section intro or the exercise card header — not floating loose. If it's unrelated, move it out of the listening section entirely.
- Transcript hidden by default; "إظهار النص" reveals `InteractivePassage` (reuse the component from prompt 06 — word-tap translation + per-word audio works here too).
- `ListeningPlayer` is the last child, `position: sticky bottom-4`, so it respects sidebar width.
- Pass `speakerSegments` (now timing-enriched from Phase C) and `durationMs` into `ListeningPlayer`.
- RTL throughout; Arabic UI in Tajawal; premium spacing — generous padding, clear vertical rhythm, no cramped elements.

### F.2 — Wire it in

Replace the old listening section usage in the curriculum unit page with `<ListeningSection unit={unit} />`. Remove the dead `StickyAudioBar` import from the listening path. Keep all question/submission logic intact — only the presentation layer changes.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE G — Self-check + commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### G.1 — Self-check

1. `grep -n "c copy" scripts/audio-v2/lib/concat.cjs` → **ZERO matches** (the bug must be gone).
2. `node scripts/audio-v2/test-concat.cjs` → passes (decode-verify + duration check).
3. Re-download 3 random regenerated listening files, run `ffmpeg -v error -i f.mp3 -f null -` → all exit 0.
4. SQL: `SELECT COUNT(*) FROM curriculum_listening WHERE title_ar IS NULL OR title_ar=''` → 0.
5. SQL: duplicate-transcript check → 0 rows.
6. `grep -rn "fixed bottom-0" src/components/players/listening/` → ZERO (player is sticky-in-content, not fixed).
7. `grep -rn "ListeningPlayer" src/components/players/listening/ListeningSection.jsx` → present.
8. ESLint clean: `npx eslint src/components/players/listening/ --max-warnings=0`.
9. Read `ListeningPlayer.jsx` + `ListeningSection.jsx` — all hooks above any conditional return.
10. Confirm reading flow does NOT import `ListeningPlayer`.

### G.2 — Report

`docs/audits/listening-overhaul/FINAL-REPORT.md` — concat bug fixed (before/after decode test), N rows regenerated, N duplicates removed, N titles added, player + section rebuilt.

### G.3 — Commit

```bash
git add scripts/audio-v2/lib/concat.cjs \
        scripts/audio-v2/test-concat.cjs \
        scripts/audio-v2/audit-listening-decode.cjs \
        scripts/audio-v2/03-generate-listening.cjs \
        supabase/migrations/*_listening_segment_timing.sql \
        supabase/migrations/*_dedupe_listening.sql \
        supabase/migrations/*_listening_titles.sql \
        src/components/players/listening/ \
        src/pages/   # parent unit page that wires ListeningSection
        docs/audits/listening-overhaul/

git commit -m "fix(listening): root-cause concat truncation + premium player + section rebuild

ROOT CAUSE of truncated audio:
- concat.cjs used 'ffmpeg -f concat -c copy'. Stream-copying MP3 segments with
  per-call encoder-delay drift yields a file with a correct-looking header
  duration but audio that decodes only to the first segment boundary. Every
  prior regeneration reproduced the same broken file.
FIX:
- concat.cjs rewritten: normalize every segment to uniform codec params, then
  concat WITH re-encoding (libmp3lame). Added decode-verification (ffmpeg -f null)
  as the pass/fail gate — header duration is never trusted again.
- concatMp3Buffers now returns segmentOffsets/segmentDurations for accurate
  per-segment timing.
- Regenerated all listening rows that failed the decode test.
- speaker_segments enriched with start_ms/end_ms; word_timestamps re-stitched.

Duplicate + untitled cards:
- Deduped genuine duplicate listening rows (reversible migration + JSON backup).
- Generated proper Arabic titles for every listening row (dev-time, no runtime API).

Premium listening player (new, listening-specific):
- ListeningPlayer: sticky-in-content positioning — respects sidebar width in
  both expanded/collapsed states, no fixed-full-width bleed.
- Velvet-Midnight glass aesthetic, gold accents, distinct from the reading player.
- Scrubber with speaker-segment ticks, live current-speaker label,
  replay/forward 5s, elegant speed control, A-B loop.

Section restructure:
- ListeningSection: clean hierarchy — intro, exercise selector (only when >1
  item, with real titles), exercise card, hide/show transcript, questions,
  sticky player. Resolves the 'two mystery cards' confusion."

git push origin main
git fetch origin
git log --oneline -1 HEAD
git log --oneline -1 origin/main
```

---

## ⛔ DO NOT

- ❌ Use `ffmpeg -c copy` anywhere in the concat path — re-encode always
- ❌ Trust `ffprobe` header duration as proof of a healthy file — decode-test
- ❌ Position the player `fixed left-0 right-0` — sticky-in-content only
- ❌ Route the reading player through `ListeningPlayer` — keep them separate
- ❌ Hard-delete listening rows without a JSON backup + reversible migration
- ❌ Use a runtime Claude API call for titles — generate them at dev-time
- ❌ Touch student submissions / progress
- ❌ Run `vite build` locally

## ✅ FINISH LINE

- `node scripts/audio-v2/test-concat.cjs` passes; regenerated listening files all pass `ffmpeg -f null` decode test
- Multi-voice audio plays the full dialogue — both speakers, all turns, to the end
- Every listening row has a real Arabic title; no duplicate cards
- New premium `ListeningPlayer` is sticky-in-content, sidebar-aware, visually distinct from reading
- Listening section restructured into a clean premium hierarchy
- Commit pushed to `origin/main`

End of prompt.
