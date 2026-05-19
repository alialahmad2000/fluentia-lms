# 🎧 LISTENING — AUDIO FIX + PLAYER REDESIGN + DRIFT PROTECTION (2026-05-19)

> **Move + execute (Mac):**
> ```bash
> mv ~/Downloads/LISTENING-AUDIO-PLAYER-DRIFT-PROTECTION-2026-05-19.md \
>    /Users/dr.ali/Projects/fluentia-lms/prompts/agents/
> cd /Users/dr.ali/Projects/fluentia-lms
> git pull --rebase origin main
> claude
> ```
> Then in Claude Code:
> ```
> Read and execute prompts/agents/LISTENING-AUDIO-PLAYER-DRIFT-PROTECTION-2026-05-19.md
> ```

---

## 🎯 MISSION

Three things in one autonomous run. **All three must ship in the same commit.**

### 1. Listening audio doesn't play

Ali viewed-as-student, opened a listening section, pressed play — heard nothing. Find which listening rows actually fail in the browser, find why, fix.

### 2. Redesign the listening player

The current sticky-bar audio player is unliked. Replace with a **simple, premium player purpose-built for listening** — fundamentally different from the reading player.

**Design principle (must obey):**
- **Reading section:** text is primary. Audio is a supporting layer (karaoke ties them together). Reading player can be inline / tied into the page.
- **Listening section:** **audio is the entire content.** Text (transcript) is HIDDEN by default — students should practice listening without reading the script. A "إظهار النص" / "Show transcript" toggle reveals it as an optional feature, not the default.
- The listening player is therefore the **hero element** of the listening section — prominent, self-sufficient, premium feel. Not a reading-player variant.

### 3. Drift-protection foundation

The L1 reading bug from earlier today (audio drift after text rewrite, commit `f911750`) cost ElevenLabs char budget and student trust. **Never again.** This prompt installs the pattern that prevents it for listening — and lays the foundation to retrofit reading and vocab later.

The pattern:
- Every audio row stores a `source_text_hash` (SHA-256 of the transcript/text at generation time)
- The generator computes the hash on every TTS call and writes it to the row
- A standalone drift-audit script (`scripts/audits/audio-drift-check.cjs`) takes ZERO arguments, runs in <30 seconds, and reports any row where `source_text_hash != current_text_hash`
- This script runs as part of CI / pre-deploy gate — fails the build if drift exists without explicit exception
- UI optionally surfaces a `is_drifted` badge for admin-impersonation views (so Ali/team catch it early)

---

## 📁 ENVIRONMENT

- **Working dir:** `/Users/dr.ali/Projects/fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md` — load and obey
- **DB:** Supabase prod via `mcp__supabase__*`
- **Branch:** `main`. Pull-rebase before starting.
- **ElevenLabs budget at last check:** ~682K used / 1.81M limit → 1.13M remaining. STAY WELL UNDER. Only regenerate listening audio if Phase B finds specific rows that are actually broken.
- **NODE_OPTIONS:** `export NODE_OPTIONS="--dns-result-order=ipv4first"`
- **Existing infrastructure to build on (not revert):**
  - `scripts/audio-v2/lib/strip-speaker-label.cjs` — sanitizer (commit `456f12a`)
  - Concat utility with re-encode (no `-c copy`) (commit `8159640`)
  - 72/72 listening rows previously passed truncation decode-test
- **Previous unshipped prompt context:** `LISTENING-COMPLETE-COVERAGE-AND-PLAYER-POLISH-2026-05-18.md` may or may not have been executed. Check `git log --grep=listening` to know what's actually shipped vs. what isn't.

---

## ⚠️ STRICT RULES

1. **Diagnose before assuming.** Do NOT regenerate audio without per-row evidence that THAT row is broken. ElevenLabs budget is precious.
2. **Test in the player code path, not just in isolation.** A row's audio file decoding via `ffmpeg` doesn't prove a student's browser plays it. Test the actual player code path.
3. **Listening player must NOT inherit from reading player.** Even if there's a shared base. Build a separate file. Different design language. Different priorities.
4. **Transcript is HIDDEN by default in listening.** Show-text is a toggle, not the default state.
5. **`source_text_hash` is mandatory** on every listening audio row going forward. Backfill all existing rows in this run.
6. **No browser checks asked of Ali.** Verify programmatically.
7. **No student data writes.**
8. **`profile?.id` not `user?.id`.**
9. **Hooks before guards.**
10. **`.select()` after every `.update()` / `.upsert()`.**
11. **No `vite build` locally.**
12. **Mac shell.**
13. **Loop until clean.** Re-run verification after each fix. Commit only when the all-rows test exits 0.
14. **The commit must include all three deliverables** — audio fix, player redesign, drift-protection. Don't ship two and defer one.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Diagnose why listening audio doesn't play
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 — Inventory every listening row

```javascript
// scripts/audits/listening-fix/01-inventory.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

(async () => {
  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  fs.mkdirSync('docs/audits/listening-fix', { recursive: true });

  // NO audio_url filter — get every row
  const { data, error } = await sb
    .from('curriculum_listening')
    .select('id, level_id, unit_id, audio_url, audio_path, audio_duration_ms, audio_type, speaker_segments, title_ar, transcript, audio_generated_at')
    .order('level_id, unit_id');
  if (error) throw error;

  const stats = {
    total: data.length,
    has_audio_url: data.filter(r => r.audio_url).length,
    missing_audio_url: data.filter(r => !r.audio_url).length,
    has_transcript: data.filter(r => r.transcript).length,
    missing_transcript: data.filter(r => !r.transcript).length,
  };

  fs.writeFileSync('docs/audits/listening-fix/inventory.json', JSON.stringify({stats, rows: data}, null, 2));
  console.log(JSON.stringify(stats, null, 2));
})();
```

### A.2 — Categorize each row

| Category | Condition | Action |
|----------|-----------|--------|
| HEALTHY | audio_url present, HEAD returns 200, audio/mpeg, decodes, transcript matches | None |
| MISSING_AUDIO | audio_url is null/empty AND transcript exists | UI must show "audio coming soon" — never a dead play button. Generate if budget allows. |
| BROKEN_URL | audio_url set, HEAD ≠ 200 | Regenerate |
| WRONG_MIME | HEAD 200, Content-Type ≠ audio/mpeg | Re-upload with correct contentType |
| NO_RANGE | HEAD 200 but Range request returns 200 (not 206) | Bucket config fix |
| TRUNCATED | decoded_duration < 0.95 × container_duration | Regenerate |
| DRIFTED | source_text_hash ≠ current_text_hash (Phase C will populate hash; for this audit, compute transcript hash and compare against any stored marker; if no stored marker, flag as DRIFT_UNKNOWN) | Regenerate |
| INCOMPLETE_DATA | audio_url null AND transcript null | UI fallback only, no regen |

Write `scripts/audits/listening-fix/02-categorize.cjs` that runs these checks and outputs `docs/audits/listening-fix/categorized.json`.

### A.3 — Find a specific broken row Ali might have hit

Without knowing which exact listening row Ali tried, identify the most-likely-broken ones:
- Sort by `level_id, unit_id` ascending — student would hit early ones first
- Pick the first row in the BROKEN_URL or MISSING_AUDIO category
- Verify the row is truly broken by curl-testing the audio_url

### A.4 — Audit the player code path (independent from file-level audit)

The previous audits confirmed audio FILES decode fine. The browser failure mode is therefore in the player code path. Trace:

```bash
# Find the listening player component(s)
find src -name "*.jsx" -path "*listening*" | xargs grep -l "audio\|Audio"

# Read the current ListeningPlayer or equivalent
cat src/components/players/listening/ListeningPlayer.jsx 2>/dev/null
cat src/components/listening/ListeningPlayer.jsx 2>/dev/null
cat src/components/audio/ListeningPlayer.jsx 2>/dev/null

# Find what passes audioUrl to it
grep -rn "ListeningPlayer\|<ListeningPlayer" src/pages/student 2>/dev/null
```

Look specifically for:
- `<audio>` element initialization — is `src` set BEFORE event listeners attach?
- `useEffect` deps — does it react to `audioUrl` changes, or only run once?
- Error handler — is the `error` event captured and surfaced visibly?
- `play()` call — wrapped in try/catch? Called from a synchronous click handler (iOS Safari requirement)?
- `playsInline` — set on the `<audio>` element?
- Conditional render of the player — does it render even when `audio_url` is null? (Should NOT)

### A.5 — Phase A report

Write `docs/audits/listening-fix/PHASE-A-REPORT.md`:

```markdown
# Phase A — Listening Audio Diagnosis

## Inventory
- Total rows: N
- HEALTHY: N
- MISSING_AUDIO: N
- BROKEN_URL: N
- WRONG_MIME: N
- NO_RANGE: N
- TRUNCATED: N
- DRIFT_UNKNOWN: N
- INCOMPLETE_DATA: N

## Suspected row Ali hit
- ID: <id>
- Title: <title>
- Verdict: <category>
- Root cause: <one-line>

## Player code path issues
- File: <path>
- Issues found: <list>
- Specifically broken pattern: <e.g., src set after listeners attach, missing playsInline, no error handler>

## Fix plan
<exact changes>
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Fix the audio
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### B.1 — Bucket-level fixes (FREE, no regen)

If WRONG_MIME or NO_RANGE category has rows:

```sql
-- Ensure bucket public
UPDATE storage.buckets SET public = true WHERE id = 'curriculum-audio';
```

For WRONG_MIME: identify the upload script and add `contentType: 'audio/mpeg'`. Re-upload the existing files with correct contentType (no regen — file content is fine, just header is wrong).

### B.2 — Player code path fixes (FREE)

Apply the canonical pattern to the ListeningPlayer. Hold this exact code path as the reference:

```jsx
const audioRef = useRef(null);
const [loadError, setLoadError] = useState(null);
const [isPlaying, setIsPlaying] = useState(false);
const [currentMs, setCurrentMs] = useState(0);
const [actualDurationMs, setActualDurationMs] = useState(durationMs || 0);

useEffect(() => {
  const audio = audioRef.current;
  if (!audio || !audioUrl) return;

  setLoadError(null);
  setIsPlaying(false);
  setCurrentMs(0);

  const onError = () => {
    const code = audio.error?.code;
    const map = { 1: 'تم إلغاء التحميل', 2: 'خطأ في الشبكة', 3: 'خطأ في فك الترميز', 4: 'الملف غير مدعوم' };
    setLoadError(map[code] || 'تعذّر تحميل الصوت');
    console.error('[ListeningPlayer] audio error', code, audioUrl);
  };
  const onLoadedMetadata = () => {
    setLoadError(null);
    setActualDurationMs(Math.round(audio.duration * 1000));
  };
  const onTimeUpdate = () => setCurrentMs(Math.round(audio.currentTime * 1000));
  const onEnded = () => setIsPlaying(false);

  audio.addEventListener('error', onError);
  audio.addEventListener('loadedmetadata', onLoadedMetadata);
  audio.addEventListener('timeupdate', onTimeUpdate);
  audio.addEventListener('ended', onEnded);

  audio.src = audioUrl;
  audio.load();

  return () => {
    audio.removeEventListener('error', onError);
    audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    audio.removeEventListener('timeupdate', onTimeUpdate);
    audio.removeEventListener('ended', onEnded);
  };
}, [audioUrl]);

const togglePlay = async () => {
  const audio = audioRef.current;
  if (!audio) return;
  try {
    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  } catch (err) {
    console.error('[ListeningPlayer] play rejected', err);
    setLoadError('فشل التشغيل — حاول النقر مرة أخرى');
  }
};

// <audio> element:
<audio ref={audioRef} preload="metadata" playsInline style={{display: 'none'}} />
```

### B.3 — Conditional render fix

In `ListeningSection` (or whichever parent renders the player):

```jsx
{listening.audio_url ? (
  <ListeningPlayer
    key={listening.id}  // force remount on listening item switch
    audioUrl={listening.audio_url}
    durationMs={listening.audio_duration_ms}
    speakerSegments={listening.speaker_segments}
    audioType={listening.audio_type}
  />
) : (
  <ListeningAudioComingSoon listening={listening} />
)}
```

Where `ListeningAudioComingSoon` is a clean fallback card — never a dead play button:

```jsx
const ListeningAudioComingSoon = ({ listening }) => (
  <div className="rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 px-6 py-5 text-center">
    <div className="text-amber-200/90 text-sm font-medium mb-1">🎧 الصوت قيد التحضير</div>
    <div className="text-white/50 text-xs">هذه المحادثة ستكون متاحة للاستماع قريباً.</div>
  </div>
);
```

### B.4 — Regenerate truly broken rows (BUDGETED)

Pre-flight quota check:

```bash
curl -sH "xi-api-key: $ELEVENLABS_API_KEY" \
  https://api.elevenlabs.io/v1/user/subscription | jq '{count: .character_count, limit: .character_limit, remaining: (.character_limit - .character_count)}'
```

Compute `chars_needed = sum(transcript.length for rows in BROKEN_URL + TRUNCATED + DRIFT_KNOWN)`. If `remaining < chars_needed × 1.2` → STOP and report what was skipped. Prioritize lowest level_id first.

For each row to regenerate, use the existing generator (`scripts/audio-v2/03-generate-listening.mjs` from commit `456f12a` which uses `stripSpeakerLabel`). The same pipeline. Make sure it now ALSO writes `source_text_hash` (Phase C work — implement that first, then use it here).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Drift-protection foundation (THE STRATEGIC WORK)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is what stops us from ever regenerating audio reactively again. Build it on listening first; the same pattern retrofits to reading and vocab in future prompts.

### C.1 — Schema: add `source_text_hash`

Migration `supabase/migrations/<NNN>_add_source_text_hash_to_curriculum_listening.sql`:

```sql
-- Idempotent
ALTER TABLE curriculum_listening
  ADD COLUMN IF NOT EXISTS source_text_hash TEXT,
  ADD COLUMN IF NOT EXISTS source_text_hash_at TIMESTAMPTZ;

COMMENT ON COLUMN curriculum_listening.source_text_hash IS
  'SHA-256 (hex) of the transcript text that was used to generate audio_url. If transcript changes and this hash isn''t updated by a fresh audio generation, the audio is DRIFTED and the UI should show a warning to admins.';

COMMENT ON COLUMN curriculum_listening.source_text_hash_at IS
  'Timestamp when source_text_hash was last computed and audio was last generated against this hash.';

CREATE INDEX IF NOT EXISTS idx_curriculum_listening_source_text_hash
  ON curriculum_listening (source_text_hash) WHERE source_text_hash IS NOT NULL;
```

Apply via `mcp__supabase__apply_migration`.

### C.2 — Hash utility

Create `scripts/lib/text-hash.cjs`:

```javascript
const crypto = require('crypto');

/**
 * Compute the canonical source-text hash for a listening or reading row.
 * The input is normalized so trivial whitespace / encoding changes don't trigger false drift.
 *
 * @param {string} text  The transcript or body text
 * @returns {string}     64-char hex SHA-256
 */
function sourceTextHash(text) {
  if (!text || typeof text !== 'string') return null;
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .normalize('NFC');
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

module.exports = { sourceTextHash };
```

Also export from a TypeScript-compatible path for frontend use: `src/lib/textHash.js` (same implementation, ES module export).

### C.3 — Patch the generator

In `scripts/audio-v2/03-generate-listening.mjs` (or `.cjs`), after a successful TTS + upload + `.update`, compute and store the hash:

```javascript
import { sourceTextHash } from '../lib/text-hash.cjs';
// OR if .cjs: const { sourceTextHash } = require('../lib/text-hash.cjs');

// ...after successful audio upload, before / inside the .update call:
const hash = sourceTextHash(row.transcript);

const { data: updated, error: updateErr } = await supabase
  .from('curriculum_listening')
  .update({
    audio_url: publicUrl,
    audio_path: uploadedPath,
    audio_duration_ms: durationMs,
    audio_generated_at: new Date().toISOString(),
    source_text_hash: hash,
    source_text_hash_at: new Date().toISOString(),
  })
  .eq('id', row.id)
  .select();

if (updateErr || !updated || updated.length !== 1) {
  throw new Error(`Update failed for row ${row.id}: ${updateErr?.message || 'rowcount mismatch'}`);
}
```

### C.4 — Backfill existing rows

Write `scripts/audits/listening-fix/03-backfill-hashes.cjs`:

For every existing row with `audio_url IS NOT NULL`:

```javascript
const currentHash = sourceTextHash(row.transcript);
const dbHash = row.source_text_hash;

if (!dbHash) {
  // Never had a hash — populate it. This is the BASELINE: we assume current audio matches current transcript.
  // If it doesn't, the drift will surface in a future audit if transcript is rewritten WITHOUT regeneration.
  await supabase.from('curriculum_listening').update({
    source_text_hash: currentHash,
    source_text_hash_at: row.audio_generated_at || new Date().toISOString(),
  }).eq('id', row.id).select();
}
```

For the L1 rows just regenerated in commit `f911750` (if they exist in listening — likely not, that was reading-only): the regeneration script will populate the hash naturally going forward, so backfill is safe.

### C.5 — The drift-audit script (the kill-switch we needed)

Create `scripts/audits/audio-drift-check.cjs`:

```javascript
#!/usr/bin/env node
/**
 * Audio Drift Check — runs in <30s, exits non-zero if any row's stored
 * source_text_hash differs from the hash of the current transcript text.
 *
 * Used as a pre-deploy gate. If transcript was rewritten without regenerating
 * audio, this script catches it BEFORE students hit it in production.
 *
 * Usage:
 *   node scripts/audits/audio-drift-check.cjs            # check all tables
 *   node scripts/audits/audio-drift-check.cjs --listening # listening only
 *   node scripts/audits/audio-drift-check.cjs --json     # machine-readable output
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { sourceTextHash } = require('../lib/text-hash.cjs');

(async () => {
  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const tables = [
    { table: 'curriculum_listening', text_field: 'transcript', label: 'listening' },
    // Future: { table: 'curriculum_reading', text_field: 'body_ar', label: 'reading' },
  ];

  let totalDrifted = 0;
  const driftedRows = [];

  for (const t of tables) {
    const { data, error } = await sb
      .from(t.table)
      .select(`id, level_id, unit_id, title_ar, ${t.text_field}, source_text_hash, audio_url, audio_generated_at`)
      .not('audio_url', 'is', null);
    if (error) throw error;

    for (const row of data) {
      const current = sourceTextHash(row[t.text_field]);
      const stored = row.source_text_hash;
      if (stored && current && stored !== current) {
        totalDrifted++;
        driftedRows.push({
          table: t.label,
          id: row.id,
          level: row.level_id,
          unit: row.unit_id,
          title: row.title_ar,
          audio_generated_at: row.audio_generated_at,
          stored_hash: stored.slice(0, 12),
          current_hash: current.slice(0, 12),
        });
      } else if (!stored) {
        // Row has no baseline hash yet — treat as DRIFT_UNKNOWN, not a hard failure
        // (Phase C.4 backfills these on first run)
      }
    }
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ drifted_count: totalDrifted, rows: driftedRows }, null, 2));
  } else {
    if (totalDrifted === 0) {
      console.log('✅ No audio drift detected.');
    } else {
      console.log(`❌ ${totalDrifted} row(s) have audio that doesn't match current text:`);
      console.table(driftedRows);
      console.log('\nTo fix: regenerate the audio for these rows via the generator script.');
      console.log('To accept and update the hash (only if you\'re sure the audio is fine):');
      console.log('  node scripts/audits/audio-drift-check.cjs --accept <row_id>');
    }
  }

  process.exit(totalDrifted > 0 ? 1 : 0);
})();
```

### C.6 — Wire the drift-check into the deploy gate

Add to `package.json` scripts:

```json
{
  "scripts": {
    "predeploy:audio-drift": "node scripts/audits/audio-drift-check.cjs"
  }
}
```

Then add a GitHub Action (or Vercel build hook) that runs this before deploys. If no CI infra exists, document the script in `docs/RUNBOOKS.md` and tell Ali to run it before any major content change.

Optional follow-up (don't ship in this prompt, just write a TODO): a Supabase trigger on `curriculum_listening` UPDATE that fires when `transcript` changes — sets `audio_status = 'DRIFTED'` automatically. Saves running the drift script manually.

### C.7 — Surface drift to admins (light touch)

When admin/teacher is impersonating a student and a listening row is DRIFTED, show a small chip in the UI: `⚠️ صوت قديم (drifted)`. Students never see this. Implementation: read `source_text_hash` from the listening row, compute current transcript hash client-side, compare. If different AND viewing as admin/impersonation → render the chip.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Redesign the listening player
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### D.1 — Design principles

| Rule | Why |
|------|-----|
| Listening player is its own file. No code inheritance from ReadingPlayer or SmartAudioPlayer | They serve fundamentally different purposes |
| Audio is the hero. Player visually anchors the section. Generous padding, prominent play button | Listening = audio is the content |
| Transcript is HIDDEN by default. Toggle button "إظهار النص" reveals it | Students should practice listening before reading |
| Simple. No more than 3 visible "rows" of controls. No clutter | Premium feels like restraint, not features |
| Speaker indication is subtle — color dot + name, not loud | Multi-speaker shouldn't shout |
| Distinct from the reading player visually | They're different products |

### D.2 — Layout spec (RTL)

```
┌─────────────────────────────────────────────────────────────────┐
│  ●  د. علي  ←  current speaker (pill, color-coded, soft amber)  │
│                                                                   │
│  ━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ▲ scrubber with subtle gold ticks for speaker turns             │
│                                                                   │
│  ⟲5      ▶ (HERO 64px)      5⟳        0:45 / 2:03      1× ▾    │
│  ▲ skip   ▲ play             ▲ skip    ▲ time          ▲ speed   │
│                                                                   │
│  [إظهار النص] ←  ghost button, opens transcript drawer            │
└─────────────────────────────────────────────────────────────────┘
```

### D.3 — Visual treatment

```jsx
<div
  data-listening-player
  dir="rtl"
  className="
    relative
    rounded-[28px]
    bg-gradient-to-b from-slate-900/80 via-slate-950/85 to-slate-950/90
    backdrop-blur-2xl
    border border-amber-500/10
    shadow-[0_24px_64px_-20px_rgba(0,0,0,0.6),0_0_0_1px_rgba(212,175,55,0.04)]
    px-6 pt-5 pb-4
    overflow-hidden
  "
>
  {/* Decorative glow behind the play button — subtle, audio-feel */}
  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-32 bg-amber-500/[0.03] blur-3xl pointer-events-none" />

  {/* Row 1 — Current speaker (soft, top-center on mobile, right-aligned RTL on desktop) */}
  <div className="flex items-center justify-start mb-4">
    <SpeakerPill speakerName={currentSpeakerName} speakerColor={currentSpeakerColor} />
  </div>

  {/* Row 2 — Scrubber (full width, larger touch area than reading player) */}
  <div className="relative h-2.5 mb-5 group">
    <div className="absolute inset-y-0 left-0 right-0 bg-white/[0.05] rounded-full" />
    <div
      className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-amber-200 rounded-full"
      style={{ width: `${progressPercent}%` }}
    />
    {speakerSegments?.map((seg, i) => (
      <div
        key={i}
        className="absolute top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full opacity-60"
        style={{
          left: `${(seg.start_ms / (actualDurationMs || durationMs)) * 100}%`,
          background: speakerColorFor(seg.speaker_id),
        }}
        title={seg.speaker_name_ar}
      />
    ))}
    <input
      type="range"
      min={0}
      max={actualDurationMs || durationMs}
      value={currentMs}
      onChange={(e) => seekTo(Number(e.target.value))}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      aria-label="موضع التشغيل"
    />
  </div>

  {/* Row 3 — Controls + time + speed */}
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <button onClick={() => seekBy(-5000)} className="text-white/60 hover:text-white text-sm w-10 h-10 rounded-full hover:bg-white/[0.04] transition flex items-center justify-center" aria-label="رجوع 5 ثوان">
        <span className="text-xs">⟲</span>
        <span className="ms-0.5 font-medium">5</span>
      </button>
      <button
        onClick={togglePlay}
        className="
          w-16 h-16 rounded-full
          bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500
          text-slate-950 font-bold text-2xl
          shadow-[0_12px_32px_-6px_rgba(251,191,36,0.5),inset_0_2px_0_rgba(255,255,255,0.4)]
          hover:scale-105 active:scale-95
          transition-transform
          flex items-center justify-center
        "
        aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
      >
        {isPlaying ? '❚❚' : <span className="ms-1">▶</span>}
      </button>
      <button onClick={() => seekBy(5000)} className="text-white/60 hover:text-white text-sm w-10 h-10 rounded-full hover:bg-white/[0.04] transition flex items-center justify-center" aria-label="تقدم 5 ثوان">
        <span className="font-medium">5</span>
        <span className="ms-0.5 text-xs">⟳</span>
      </button>
    </div>

    <div className="flex items-center gap-3">
      <span className="font-mono text-xs tabular-nums text-white/50">
        {formatTime(currentMs)} <span className="text-white/30">/</span> {formatTime(actualDurationMs || durationMs)}
      </span>
      <SpeedSelector speed={speed} onChange={setSpeed} />
    </div>
  </div>

  {/* Row 4 — Transcript toggle (ghost, secondary action) */}
  <div className="flex items-center justify-center mt-4 pt-3 border-t border-white/[0.04]">
    <button
      onClick={() => setShowTranscript(s => !s)}
      className="text-xs text-white/45 hover:text-white/80 transition flex items-center gap-1.5"
    >
      <span>{showTranscript ? '🙈' : '👁'}</span>
      <span>{showTranscript ? 'إخفاء النص' : 'إظهار النص'}</span>
    </button>
  </div>

  {/* Error surface */}
  {loadError && (
    <div className="mt-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-center justify-between gap-2">
      <span>⚠️ {loadError}</span>
      <button onClick={() => audioRef.current?.load()} className="text-red-200/80 underline">إعادة المحاولة</button>
    </div>
  )}

  {/* Hidden audio */}
  <audio ref={audioRef} preload="metadata" playsInline style={{display: 'none'}} />
</div>

{/* Transcript drawer — RENDERED OUTSIDE THE PLAYER, expands below it */}
{showTranscript && (
  <div className="mt-4 rounded-2xl bg-slate-900/40 border border-white/[0.04] p-5 max-h-[40vh] overflow-y-auto">
    <TranscriptView segments={speakerSegments} currentMs={currentMs} speakerColorFor={speakerColorFor} />
  </div>
)}
```

### D.4 — Helper components

```jsx
const SPEAKER_COLORS = ['#FBBF24', '#A78BFA', '#34D399', '#F472B6', '#60A5FA'];
function speakerColorFor(speakerId) {
  if (!speakerId) return SPEAKER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < speakerId.length; i++) hash = (hash * 31 + speakerId.charCodeAt(i)) | 0;
  return SPEAKER_COLORS[Math.abs(hash) % SPEAKER_COLORS.length];
}

const SpeakerPill = ({ speakerName, speakerColor }) => {
  if (!speakerName) {
    return <span className="text-xs text-white/40">🎧 الاستماع</span>;
  }
  return (
    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.05] text-xs font-medium text-white/85">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: speakerColor }} />
      <span>يتحدث الآن: {speakerName}</span>
    </span>
  );
};

const SpeedSelector = ({ speed, onChange }) => {
  const [open, setOpen] = useState(false);
  const speeds = [0.5, 0.75, 1, 1.25, 1.5];
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.05] text-xs text-white/85 hover:bg-white/[0.08] transition font-mono">
        {speed}× <span className="text-white/40 text-[10px] ms-0.5">▾</span>
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 bg-slate-900 border border-white/[0.08] rounded-xl shadow-2xl p-1 min-w-[72px] z-10">
          {speeds.map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }} className={`block w-full text-right px-3 py-1.5 rounded-lg text-xs font-mono transition ${s === speed ? 'bg-amber-400/20 text-amber-200' : 'text-white/70 hover:bg-white/[0.06]'}`}>
              {s}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const TranscriptView = ({ segments, currentMs, speakerColorFor }) => (
  <div className="space-y-3" dir="rtl">
    {segments?.map((seg, i) => {
      const active = currentMs >= seg.start_ms && currentMs < seg.end_ms;
      const color = speakerColorFor(seg.speaker_id);
      return (
        <div key={i} className={`p-3 rounded-xl border-r-2 transition ${active ? 'bg-white/[0.04]' : 'bg-transparent'}`} style={{ borderRightColor: active ? color : 'transparent' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <span className="text-xs font-medium text-white/70">{seg.speaker_name_ar || seg.speaker_name}</span>
          </div>
          <p className={`text-sm leading-relaxed ${active ? 'text-white' : 'text-white/65'}`}>{seg.text}</p>
        </div>
      );
    })}
  </div>
);
```

### D.5 — Section layout

`ListeningSection.jsx`:

```jsx
export default function ListeningSection({ listening, unit }) {
  const [showTranscript, setShowTranscript] = useState(false);

  if (!listening) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="text-lg font-medium text-white/90 mb-1">{listening.title_ar}</h2>
        {listening.title_en && (
          <p className="text-xs text-white/40">{listening.title_en}</p>
        )}
      </div>

      {/* The player — hero element */}
      {listening.audio_url ? (
        <ListeningPlayer
          key={listening.id}
          audioUrl={listening.audio_url}
          durationMs={listening.audio_duration_ms}
          speakerSegments={listening.speaker_segments}
          audioType={listening.audio_type}
          showTranscript={showTranscript}
          setShowTranscript={setShowTranscript}
        />
      ) : (
        <ListeningAudioComingSoon listening={listening} />
      )}

      {/* Questions / exercises */}
      <ListeningQuestions listening={listening} unit={unit} />
    </div>
  );
}
```

### D.6 — Mobile responsiveness

At `< 480px`:
- Play button: 60px (slightly smaller, still hero)
- Speed selector: hide the `▾` chevron, keep just the number
- Skip buttons: `w-9 h-9`
- Padding reduces: `px-4 pt-4 pb-3`

Use Tailwind responsive variants.

### D.7 — Sticky positioning

Keep whatever sticky pattern the codebase already uses. Don't switch architectures. Just polish the surface.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE E — Verify (REAL TESTS, NOT ASSUMPTIONS)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### E.1 — Re-categorize after Phase B

```bash
node scripts/audits/listening-fix/02-categorize.cjs
```

Expected: BROKEN_URL=0, TRUNCATED=0, WRONG_MIME=0, NO_RANGE=0. MISSING_AUDIO may remain (those become "audio coming soon" UI fallbacks).

### E.2 — Drift audit

```bash
node scripts/audits/audio-drift-check.cjs
```

Expected: exit 0, "No audio drift detected."

### E.3 — Headless reach for the actual player

Use the existing impersonation pattern + lightweight JSDOM or Node-level simulation:

```javascript
// scripts/audits/listening-fix/04-player-reachability.cjs
// For 3 sample students:
//   For each unit they have access to:
//     Get the listening rows the page would render
//     For each row with audio_url:
//       Confirm the audio_url HEAD returns 200, audio/mpeg, Accept-Ranges
//       Confirm the player conditional render path takes the player-render branch (NOT the coming-soon branch)
//     For each row WITHOUT audio_url:
//       Confirm the player conditional render path takes the coming-soon branch
// Assert: 0 rows where a player would render with audio_url that doesn't HEAD-pass
```

### E.4 — ESLint + manual hook-order check on touched files

```bash
npx eslint src/components/players/listening/ src/components/listening/ src/pages/student/curriculum/ --max-warnings=0
```

### E.5 — Confirm sourceTextHash backfill complete

```sql
SELECT COUNT(*) AS rows_with_audio, COUNT(source_text_hash) AS rows_with_hash
FROM curriculum_listening WHERE audio_url IS NOT NULL;
```

Both numbers must be equal.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE F — Commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### F.1 — Final report

`docs/audits/listening-fix/FINAL-REPORT.md`:

```markdown
# Listening — Audio Fix + Player Redesign + Drift Protection — Final Report

## Phase A — Diagnosis
- Inventory: N total, N healthy, N broken, N missing
- Player code path issues found: <list>

## Phase B — Audio fixes
- Bucket-level fixes: <list>
- Player code path fixes: <list of patterns applied>
- Conditional render: ListeningAudioComingSoon for null audio_url ✅
- Rows regenerated: N
- ElevenLabs chars consumed: N
- Quota remaining: N

## Phase C — Drift protection (the architectural win)
- Schema: source_text_hash column added to curriculum_listening
- Hash utility: scripts/lib/text-hash.cjs
- Generator updated to write hash on every TTS run
- Backfill: N rows received their baseline hash
- Drift-check script: scripts/audits/audio-drift-check.cjs (exits non-zero on drift)
- Admin drift chip in UI: shipped (visible only during admin impersonation)

## Phase D — Player redesign
- New file: src/components/players/listening/ListeningPlayer.jsx (independent from reading)
- Hero play button (64px), subtle speaker pill, color-coded segment ticks
- Transcript hidden by default — toggle reveals it
- Mobile responsive
- Sticky positioning unchanged from prior architecture

## Phase E — Verification
- Categorization re-run: 0 broken
- Drift audit: 0 drifted
- Player reachability: 0 dead-button cases
- ESLint clean
- Hash backfill: complete (rows_with_audio == rows_with_hash)

## Commit
- SHA: <filled>
```

### F.2 — Commit + push

```bash
git add src/ supabase/migrations/ scripts/ docs/

git commit -m "fix(listening): audio playback + premium player redesign + drift-protection foundation

THREE WINS IN ONE:

1. AUDIO PLAYBACK FIXED
   - <root cause from FINAL-REPORT>
   - Player conditional render: <ListeningAudioComingSoon> for null audio_url
   - Player code path: canonical pattern (event listeners before src, try/catch
     on play(), error surface, playsInline)
   - Rows regenerated: N (ElevenLabs chars: N, quota remaining: N)

2. PLAYER REDESIGN — purpose-built for listening
   - New file, independent from reading player (different product, different UX)
   - Audio is the hero: 64px play button, generous spacing, audio-tinted glow
   - Transcript HIDDEN by default (listening practice ≠ reading along)
   - Show-transcript toggle reveals it as optional feature
   - Color-coded speaker ticks on scrubber
   - Speed popover (replaces always-visible row)
   - Mobile responsive

3. DRIFT-PROTECTION FOUNDATION — never regenerate reactively again
   - source_text_hash column on curriculum_listening
   - sourceTextHash() utility computes SHA-256 of normalized text
   - Generator writes hash on every TTS run
   - audio-drift-check.cjs script: pre-deploy gate, exits non-zero on drift
   - N existing rows backfilled with baseline hash
   - Admin-only drift chip in UI (impersonation view)

WHY THIS MATTERS:
The L1 reading regeneration (commit f911750) cost ElevenLabs budget because
text was rewritten without regenerating audio — and there was no system to
detect it. From now on, the drift check catches this BEFORE students see it.

NOT TOUCHED:
- Reading flow (unchanged — pattern retrofits in a future prompt)
- Vocab flow
- Student data
- Personalization data (variant tables, interest tags preserved)"

git push origin main
git fetch origin
git log --oneline -3 HEAD
git log --oneline -3 origin/main
```

Confirm HEAD == origin/main.

---

## ⛔ DO NOT

- ❌ Inherit the listening player from the reading player
- ❌ Show the transcript by default
- ❌ Regenerate audio without per-row evidence
- ❌ Skip the drift-protection work — it's the architectural win
- ❌ Backfill source_text_hash for rows where the audio is already known to be drifted (those should regenerate, not get a false-good hash)
- ❌ Ask Ali to do browser checks
- ❌ Run `vite build` locally
- ❌ Touch student data tables

## ✅ FINISH LINE

- All three deliverables in one commit
- Drift-check exits 0
- Re-categorize shows 0 broken rows (excluding intentional MISSING_AUDIO with coming-soon UI)
- Player reachability test shows 0 dead-button cases
- One commit pushed to `origin/main`
- `docs/audits/listening-fix/FINAL-REPORT.md` exists with concrete findings

End of prompt.
