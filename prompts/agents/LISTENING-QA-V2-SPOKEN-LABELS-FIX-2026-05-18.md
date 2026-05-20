# 🎧 LISTENING QA v2 — SPOKEN LABELS FIX + TRUNCATION + VOICE DIVERSITY (2026-05-18)

> **THIS REPLACES** the earlier `LISTENING-QA-DEEP-AUDIT-2026-05-18.md`. The earlier version misdiagnosed Phase C. This one fixes the real bug.
>
> **Run AFTER the in-flight LISTENING-VOCAB-FIX and the personalization revert have completed and pushed.**
>
> **Move + execute (Mac):**
> ```bash
> mv ~/Downloads/LISTENING-QA-V2-SPOKEN-LABELS-FIX-2026-05-18.md \
>    /Users/dr.ali/Projects/fluentia-lms/prompts/agents/
> cd /Users/dr.ali/Projects/fluentia-lms
> git pull --rebase origin main
> claude
> ```
> Then in Claude Code:
> ```
> Read and execute prompts/agents/LISTENING-QA-V2-SPOKEN-LABELS-FIX-2026-05-18.md
> ```

---

## 🎯 MISSION

Listening is the most emotionally sensitive part of the curriculum. Students invest real focus and one disrupted experience destroys the trust we've built. This prompt does three audits + targeted fixes:

### 1. Truncation verification (browser-style stream test)

The previous overhauls used `ffmpeg -v error -i FILE -f null -` which proves the file decodes locally. That doesn't prove a student's browser plays it end-to-end. Stream-test with `Range` requests like a real browser does, and verify playback actually reaches the final second.

### 2. Voice diversity per multi-speaker row

For every dialogue / interview / multi-speaker listening item, each speaker must use a **distinct ElevenLabs voice_id**. If a row has 2 speakers but the same voice was used for both, the audio plays end-to-end but sounds like one person performing both sides — which kills realism.

### 3. ⚡ Spoken speaker labels (THE CRITICAL BUG)

In some listening audio, the TTS is **reading the speaker labels out loud**. The student hears:

> *"Doctor Ali. Hey Mohammed, how are you? Mohammed. I am good doctor Ali, what about you?"*

…instead of just hearing the two voices alternate the actual lines. This happens because the generator passed text like `"Dr. Ali: Hey Mohammed, how are you?"` into ElevenLabs, including the `"Dr. Ali: "` prefix. The speaker name is metadata — it should drive `voice_id` selection, not be synthesized as audio.

**Fix permanently:**
- Sanitize every segment's text BEFORE it hits ElevenLabs — strip leading speaker labels
- Add a test that proves the sanitizer works
- Audit existing audio files for this bug
- Regenerate only the affected rows
- Verify (with Whisper transcription of the first 3 seconds) that no spoken labels remain

---

## 📁 ENVIRONMENT

- **Working dir:** `/Users/dr.ali/Projects/fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md` — load and obey
- **DB:** Supabase prod via `mcp__supabase__*` tools
- **Storage bucket:** `curriculum-audio`
- **Required tools:** `ffmpeg`, `ffprobe`, `curl`. Verify before Phase A.
- **Branch:** `main`. Pull-rebase before starting.
- **Prerequisite:** The LISTENING-VOCAB-FIX and PERSONALIZATION-REVERT prompts must have completed and pushed. Confirm with `git log --oneline -5` showing both fixes from 2026-05-18.
- **Node env (mandatory for ElevenLabs calls):**
  ```bash
  export NODE_OPTIONS="--dns-result-order=ipv4first"
  ```

---

## ⚠️ STRICT RULES

1. **No bulk regeneration without per-row evidence.** Regenerate only rows that an audit identified as broken. Never "regenerate everything to be safe" — burns quota and risks introducing new bugs.
2. **No transcript content rewrites.** This prompt fixes the *audio rendering* of transcripts. The transcript text itself (what was scripted as dialogue) is not edited.
3. **Whisper STT verification on the spoken-labels fix is mandatory.** Decode-test isn't enough. Sample at least 5 regenerated files via Whisper and confirm the first 3 seconds don't contain any spoken speaker name.
4. **ElevenLabs char budget.** Check available chars BEFORE any regeneration. Stop if exhausting quota.
5. **No student data writes.**
6. **No DB schema changes.**
7. **Hooks before guards.**
8. **`.select()` after every `.update()` / `.upsert()`.**
9. **Idempotent.** Re-runnable.
10. **Mac shell.**

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Truncation verification (browser-style stream test)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 — Inventory every listening row

```javascript
// scripts/audits/listening-qa/01-inventory.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

(async () => {
  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await sb
    .from('curriculum_listening')
    .select('id, level_id, unit_id, audio_url, audio_path, audio_duration_ms, audio_type, speaker_segments, title_ar, transcript')
    .not('audio_url', 'is', null)
    .order('level_id, unit_id');
  if (error) throw error;
  fs.mkdirSync('docs/audits/listening-qa-v2', { recursive: true });
  fs.writeFileSync('docs/audits/listening-qa-v2/inventory.json', JSON.stringify(data, null, 2));
  console.log(`Inventoried ${data.length} listening rows`);
})();
```

### A.2 — Browser-style stream test

For each row, simulate the way browsers fetch `<audio>` sources — chunked `Range` requests — and prove the audio is fully streamable:

```javascript
// scripts/audits/listening-qa-v2/02-stream-test.cjs
// For each audio_url:
//   1. HEAD request — confirm 200, Content-Type=audio/mpeg, Accept-Ranges=bytes, Content-Length present
//   2. Range request 0-65535 (first 64KB) — confirm 206 Partial Content
//   3. Range request <Content-Length - 65536>-<Content-Length - 1> (last 64KB) — confirm 206
//   4. Full GET → write to /tmp/listening-qa-v2/<id>.mp3
//   5. ffprobe → container duration
//   6. Decode-test → ffmpeg -v error -i FILE -f null - 2>&1; parse "time=HH:MM:SS.MS"
//   7. Compare decoded_duration vs container_duration
//   8. Verdict: OK / TRUNCATED / NO_RANGE / WRONG_MIME / FETCH_FAIL
```

Output `docs/audits/listening-qa-v2/stream-test.json`:

```json
{
  "id": "...",
  "title_ar": "...",
  "head_status": 200,
  "content_type": "audio/mpeg",
  "accept_ranges": "bytes",
  "content_length": 123456,
  "range_first_64k_status": 206,
  "range_last_64k_status": 206,
  "container_duration_s": 123.4,
  "decoded_duration_s": 123.3,
  "truncation_ratio": 0.999,
  "verdict": "OK"
}
```

`TRUNCATED` if `truncation_ratio < 0.95`. `NO_RANGE` if Range doesn't return 206. `WRONG_MIME` if Content-Type isn't `audio/mpeg`.

### A.3 — Fix truncations (if any)

Per-row evidence required:
- `TRUNCATED`: regenerate the specific row using the existing fixed concat utility from commit `8159640`, decode-verify
- `NO_RANGE`: bucket config issue → `UPDATE storage.buckets SET public = true WHERE id = 'curriculum-audio';` via MCP
- `WRONG_MIME`: re-upload the file with explicit `contentType: 'audio/mpeg'`

If Phase A shows zero issues — note that explicitly in the final report and move on. Don't manufacture work.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Voice diversity audit
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### B.1 — Identify multi-speaker rows + extract voice mapping

```sql
SELECT id, title_ar, audio_type,
       jsonb_array_length(speaker_segments::jsonb) AS segment_count
FROM curriculum_listening
WHERE audio_type IN ('dialogue', 'interview', 'conversation')
  AND speaker_segments IS NOT NULL
ORDER BY segment_count DESC;
```

For each, extract distinct speaker identities and the voice_id assigned to each:

```javascript
// scripts/audits/listening-qa-v2/03-voice-diversity.cjs
// For each multi-speaker row:
//   distinct_speakers: count of unique speaker_name (or speaker_id) values
//   distinct_voices_assigned: count of unique voice_id values used
//   voice_id_per_speaker: { speaker_name: voice_id, ... }
//   verdict: OK if distinct_voices_assigned >= distinct_speakers, else SINGLE_VOICE_COLLISION
```

### B.2 — Acoustic fallback (only if voice_id not stored)

If the codebase doesn't store voice_id per segment, audit acoustically — split the audio at segment boundaries, compute mean F0 + spectral centroid per segment, cluster. If 2 declared speakers produce 2 distinct clusters → OK. If 2 speakers cluster as 1 → SINGLE_VOICE_COLLISION.

Skip B.2 if voice_id is stored.

### B.3 — Fix only flagged rows

For each `SINGLE_VOICE_COLLISION`:
1. Pull the project's ElevenLabs voice roster (should have ≥2 voices configured)
2. Map each distinct speaker to a distinct voice_id
3. Regenerate audio via the existing generator
4. Decode-verify, upload with `upsert: true`, `.update({...}).select()` the row

ElevenLabs quota check before regeneration:

```bash
curl -sH "xi-api-key: $ELEVENLABS_API_KEY" \
  https://api.elevenlabs.io/v1/user/subscription | jq '.character_count, .character_limit'
```

If `(limit - count - estimated_chars_needed) < 0` → STOP and report.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — SPOKEN SPEAKER LABELS FIX (the critical bug)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### C.1 — Find the generator + understand the data flow

```bash
ls scripts/audio-v2/
cat scripts/audio-v2/03-generate-listening.cjs 2>/dev/null || \
cat scripts/audio-v2/generate-listening.cjs 2>/dev/null || \
echo "Locate the generator: find scripts -name '*generate*listening*'"
```

Trace: how does each segment's `text` get to the ElevenLabs `/v1/text-to-speech/<voice_id>` call?

Look for patterns like:
```javascript
// BAD — sends the label as part of synthesis
const response = await elevenlabs.tts({
  text: `${segment.speaker_name}: ${segment.text}`,   // ← labels get spoken
  voice_id: voiceMap[segment.speaker_id],
});

// ALSO BAD — `segment.text` itself already contains the label
const response = await elevenlabs.tts({
  text: segment.text,   // "Dr. Ali: Hey Mohammed..."
  voice_id: voiceMap[segment.speaker_id],
});
```

The bug is in either:
- The generator concatenating the name in front of the text, OR
- The transcript stored with the label baked into `segment.text` and the generator passing it through verbatim

### C.2 — Build a robust sanitizer

Create `scripts/audio-v2/lib/strip-speaker-label.cjs`:

```javascript
/**
 * Remove leading speaker labels from a line of dialogue.
 * Handles:
 *   English:  "Dr. Ali: Hey Mohammed"  →  "Hey Mohammed"
 *             "Mohammed: I am good"     →  "I am good"
 *             "Speaker A: ..."          →  "..."
 *             "Doctor Mohammed Sharbat: ..." → "..."
 *             "[Mohammed]: ..."         →  "..."
 *             "(Dr. Ali) Hey there"     →  "Hey there"
 *   Arabic:   "د. علي: مرحبا"         →  "مرحبا"
 *             "محمد: أنا بخير"          →  "أنا بخير"
 *             "الدكتور علي: ..."        →  "..."
 *   Mixed:    "Dr. علي: ..."           →  "..."
 *
 * Conservative: only strips an obvious leading label followed by ":" or "]".
 * Does NOT strip mid-sentence colons (e.g., "I have three options:").
 */
function stripSpeakerLabel(text) {
  if (!text || typeof text !== 'string') return text;
  let s = text;

  // Drop a leading bracketed/parenthesized speaker tag
  s = s.replace(/^\s*[\[\(][^\]\)]{1,60}[\]\)]\s*[:\-–]?\s*/, '');

  // English label: optional title (Dr./Doctor/Mr./Mrs./Ms./Prof.), name (1-3 words), colon
  s = s.replace(
    /^\s*(?:Dr\.?|Doctor|Mr\.?|Mrs\.?|Ms\.?|Prof\.?|Professor|Speaker|Person)?\s*[A-Z][A-Za-z\-']{1,30}(?:\s+[A-Z][A-Za-z\-']{1,30}){0,2}\s*:\s*/,
    ''
  );

  // Arabic label: optional title (د./الدكتور), Arabic name, colon
  s = s.replace(
    /^\s*(?:د\.?|الدكتور|الأستاذ|أ\.?|السيد|السيدة|الآنسة)?\s*[\u0621-\u064A]{2,}(?:\s+[\u0621-\u064A]{2,}){0,2}\s*:\s*/,
    ''
  );

  // Last-resort generic: any short prefix followed by colon at the very start (≤ 40 chars before the colon, no internal punctuation that would suggest mid-sentence)
  s = s.replace(/^\s*([^:.,!?\n]{1,40})\s*:\s*(?=\S)/, (match, prefix) => {
    // Only strip if prefix looks name-like (mostly letters, no digits)
    if (/\d/.test(prefix)) return match;
    if (prefix.split(/\s+/).length > 4) return match;  // too many words → probably not a label
    return '';
  });

  return s.trim();
}

module.exports = { stripSpeakerLabel };
```

### C.3 — Test the sanitizer

Create `scripts/audio-v2/lib/strip-speaker-label.test.cjs`:

```javascript
const { stripSpeakerLabel } = require('./strip-speaker-label.cjs');

const cases = [
  // [input, expected]
  ['Dr. Ali: Hey Mohammed, how are you?', 'Hey Mohammed, how are you?'],
  ['Mohammed: I am good doctor Ali, what about you?', 'I am good doctor Ali, what about you?'],
  ['Speaker A: This is a test.', 'This is a test.'],
  ['Doctor Mohammed Sharbat: Welcome to class.', 'Welcome to class.'],
  ['[Mohammed]: I agree.', 'I agree.'],
  ['(Dr. Ali) Hey there', 'Hey there'],
  ['د. علي: مرحبا', 'مرحبا'],
  ['محمد: أنا بخير', 'أنا بخير'],
  ['الدكتور علي: كيف حالك', 'كيف حالك'],
  // Should NOT strip:
  ['I have three options: red, blue, and green.', 'I have three options: red, blue, and green.'],
  ['The time is 3:45 PM.', 'The time is 3:45 PM.'],
  ['No label here at all.', 'No label here at all.'],
  ['', ''],
];

let pass = 0, fail = 0;
for (const [input, expected] of cases) {
  const actual = stripSpeakerLabel(input);
  if (actual === expected) { pass++; console.log(`✓ "${input}" → "${actual}"`); }
  else { fail++; console.log(`✗ "${input}"\n  expected: "${expected}"\n  actual:   "${actual}"`); }
}
console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);
```

Run:
```bash
node scripts/audio-v2/lib/strip-speaker-label.test.cjs
```

All cases MUST pass before proceeding. Iterate the regex if any fail.

### C.4 — Patch the generator to use the sanitizer

In the generator (likely `scripts/audio-v2/03-generate-listening.cjs`), import the sanitizer and apply it to every segment's text immediately before the ElevenLabs call:

```javascript
const { stripSpeakerLabel } = require('./lib/strip-speaker-label.cjs');

// ...inside the per-segment loop:
const cleanText = stripSpeakerLabel(segment.text);
if (cleanText !== segment.text) {
  console.log(`  Stripped label from segment ${i}: "${segment.text.slice(0, 50)}..." → "${cleanText.slice(0, 50)}..."`);
}

const response = await elevenlabs.tts({
  text: cleanText,
  voice_id: voiceMap[segment.speaker_id],
  model_id: 'eleven_multilingual_v2',
  voice_settings: { stability: 0.5, similarity_boost: 0.75, use_speaker_boost: true },
});
```

### C.5 — Detect existing affected rows (text-level scan)

```javascript
// scripts/audits/listening-qa-v2/04-spoken-labels-scan.cjs
// For each curriculum_listening row with speaker_segments:
//   For each segment, check if segment.text starts with a label pattern (use stripSpeakerLabel; if output differs from input → suspect)
//   Verdict per row:
//     CLEAN: no segment has a strippable label
//     SUSPECT: ≥1 segment had a strippable label → audio probably has spoken labels
//   Output: docs/audits/listening-qa-v2/spoken-labels-scan.json
```

### C.6 — Verify acoustically with Whisper (sample-based)

For every SUSPECT row from C.5, AND a random sample of 5 CLEAN rows (control group), download the first 5 seconds of audio and transcribe via Whisper:

```javascript
// scripts/audits/listening-qa-v2/05-whisper-verify.cjs
// For each row to verify:
//   ffmpeg -ss 0 -t 5 -i <audio_url> -ar 16000 -ac 1 -c:a libmp3lame /tmp/audit-<id>-first5.mp3
//   POST to OpenAI/Anthropic Whisper API (whichever the project uses)
//   Compare transcript against speaker_segments[0].speaker_name (if available)
//   Flag if Whisper text contains:
//     - The speaker's name as a standalone word in the first 2 seconds
//     - "Doctor" or "د." or other titles followed by a name
//   Output: docs/audits/listening-qa-v2/whisper-verify.json
```

If the project doesn't have Whisper access wired up here, fall back to:
- Manual: write the first 5 seconds of each SUSPECT row to `/tmp/audit-*.mp3` and produce a markdown list with file paths for the user (Ali) to spot-listen. Don't block progress on STT setup.

### C.7 — Regenerate only affected rows

For every row that's SUSPECT (text-level) OR confirmed spoken-label (Whisper-level):
1. The fixed generator (C.4) will now strip labels by default
2. Regenerate that specific row
3. Decode-verify the new file
4. Upload with `upsert: true`
5. `.update({audio_url, audio_path, audio_duration_ms, audio_generated_at}).select()` — assert rowcount = 1
6. Re-run a Whisper check on the new file's first 5 seconds — assert NO speaker name appears

Per-row evidence required. No bulk regeneration.

### C.8 — Future-proofing

Add a CI-style assertion in the generator: after generating each segment, run the new file's first 3 seconds through a lightweight detection (Whisper if available, or a manual TODO log entry) and fail loudly if a speaker name is detected in the output. This catches regressions before they ship.

Also: add a comment block at the top of the generator file:

```javascript
// IMPORTANT: Speaker labels (e.g., "Dr. Ali:", "Mohammed:") MUST be stripped from
// segment text BEFORE the ElevenLabs API call. The speaker name is metadata that
// drives voice_id selection — it must never be synthesized as spoken audio.
// See: stripSpeakerLabel in ./lib/strip-speaker-label.cjs
// Regression test: scripts/audio-v2/lib/strip-speaker-label.test.cjs
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Consolidate findings
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write `docs/audits/listening-qa-v2/FINAL-REPORT.md`:

```markdown
# Listening QA v2 — Final Report (2026-05-18)

## Phase A — Truncation (browser-style stream test)
- Rows audited: N
- OK: N
- Truncated (regenerated): N
- No-range (bucket fix applied): N
- Wrong-mime: N
- Verdict: <ALL-CLEAR | FIXES-APPLIED | OPEN-ISSUES>

## Phase B — Voice diversity
- Multi-speaker rows audited: N
- Single-voice collisions (regenerated): N
- Voice_id-not-stored rows: N (acoustic fallback used / manual review queued)
- Verdict: <ALL-CLEAR | FIXES-APPLIED | OPEN-ISSUES>

## Phase C — Spoken speaker labels (THE CRITICAL BUG)
- Generator patched: YES — uses stripSpeakerLabel() before every ElevenLabs call
- Sanitizer tests: 13/13 PASS
- Rows scanned (text-level): N
- SUSPECT rows: N
- Whisper-verified affected rows: N
- Rows regenerated: N
- Post-regen Whisper re-check: <PASS/FAIL count>

### Sample before/after
| Row id | Before (Whisper of first 5s) | After (Whisper of first 5s) |
|--------|------------------------------|----------------------------|
| ... | "Doctor Ali, hey Mohammed..." | "Hey Mohammed, how are you" |

## ElevenLabs char budget
- Pre-run: <chars used / limit>
- Post-run: <chars used / limit>
- Consumed: N

## Action items for Ali
1. <e.g., Manual spot-listen on N rows where Whisper wasn't available>
2. <any open issues that need product decision>
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE E — Self-check + commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### E.1 — Self-check

1. `scripts/audio-v2/lib/strip-speaker-label.test.cjs` passes 13/13
2. The generator file imports and calls `stripSpeakerLabel` on every segment before TTS
3. Every row regenerated in Phase A / B / C passes decode-test (`ffmpeg -v error -i FILE -f null -` exit 0)
4. Every row regenerated in Phase C passes Whisper re-check (no speaker name in first 5 seconds)
5. `FINAL-REPORT.md` exists and is comprehensive
6. `git status` — only `docs/audits/listening-qa-v2/`, `scripts/audits/listening-qa-v2/`, `scripts/audio-v2/lib/strip-speaker-label*.cjs`, and the generator patch staged
7. ESLint clean on any new JS
8. ElevenLabs quota not exhausted

### E.2 — Commit + push

```bash
git add scripts/audio-v2/lib/strip-speaker-label.cjs \
        scripts/audio-v2/lib/strip-speaker-label.test.cjs \
        scripts/audio-v2/03-generate-listening.cjs \
        scripts/audits/listening-qa-v2/ \
        docs/audits/listening-qa-v2/

git commit -m "fix(listening): strip spoken speaker labels from TTS + verify truncation + verify voice diversity

THE CRITICAL BUG (Phase C):
- ElevenLabs was synthesizing speaker labels (\"Dr. Ali: \", \"Mohammed: \") as
  spoken audio because the generator passed segment text verbatim to TTS.
  Students heard \"Doctor Ali, hey Mohammed how are you\" instead of just
  hearing voice 1 say \"Hey Mohammed, how are you?\"
- Fix: scripts/audio-v2/lib/strip-speaker-label.cjs — robust sanitizer that
  strips leading speaker labels (English + Arabic + mixed) from segment
  text before every ElevenLabs API call.
- Test suite: 13/13 cases pass — strips real labels, preserves mid-sentence
  colons (\"three options: red, blue\") and times (\"3:45 PM\").
- Generator patched to import and use stripSpeakerLabel on every segment.
- N rows identified as affected (text scan + Whisper verification).
- All N affected rows regenerated with the patched pipeline.
- Whisper re-check confirms no speaker name in first 5 seconds.

PHASE A — Truncation verify:
- Browser-style Range request audit on N rows.
- <result summary>

PHASE B — Voice diversity:
- Audited N multi-speaker rows for single-voice collisions.
- <result summary>

NOT TOUCHED:
- No transcript content rewritten (only the audio rendering pipeline).
- No bulk regenerations.
- No student data.
- No DB schema changes."

git push origin main
git fetch origin
git log --oneline -3 HEAD
git log --oneline -3 origin/main
```

Confirm HEAD == origin/main.

---

## ⛔ DO NOT

- ❌ Rewrite any transcript content (only audio rendering is fixed)
- ❌ Bulk-regenerate audio without per-row evidence
- ❌ Skip the Whisper verification step on the spoken-labels fix
- ❌ Exhaust ElevenLabs quota — check before, stop if exceeded
- ❌ Apply DB schema migrations
- ❌ Touch student data
- ❌ Strip mid-sentence colons or times (test cases enforce this — never weaken the sanitizer to be more aggressive)
- ❌ Run `vite build` locally

## ✅ FINISH LINE

- Truncation: ALL-CLEAR OR small targeted regen list, all post-regen pass
- Voice diversity: ALL-CLEAR OR small targeted regen list, all post-regen pass
- Spoken labels: generator patched + sanitizer tested + affected rows regenerated + Whisper-verified clean
- `docs/audits/listening-qa-v2/FINAL-REPORT.md` exists
- One commit pushed to `origin/main`

End of prompt.
