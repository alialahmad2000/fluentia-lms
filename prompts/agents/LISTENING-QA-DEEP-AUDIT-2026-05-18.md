# 🎧 LISTENING QA — TRUNCATION VERIFY + VOICE DIVERSITY + TRANSCRIPT NATURALISM (2026-05-18)

> **Run AFTER the in-flight LISTENING-VOCAB-FIX prompt has completed and pushed.**
>
> **Move + execute (Mac):**
> ```bash
> mv ~/Downloads/LISTENING-QA-DEEP-AUDIT-2026-05-18.md \
>    /Users/dr.ali/Projects/fluentia-lms/prompts/agents/
> cd /Users/dr.ali/Projects/fluentia-lms
> git pull --rebase origin main
> claude
> ```
> Then in Claude Code:
> ```
> Read and execute prompts/agents/LISTENING-QA-DEEP-AUDIT-2026-05-18.md
> ```

---

## 🎯 MISSION

Listening is the most emotionally sensitive part of the curriculum — students invest real focus into hearing a full conversation play through naturally. The previous overhaul (`8159640`) plus the in-flight LISTENING-VOCAB-FIX should have ended the truncation bug. This prompt does **three deeper audits** to guarantee quality, then a small set of targeted fixes only where issues are found:

### 1. Truncation verification (deeper than decode-test)

The previous audits used `ffmpeg -v error -i FILE -f null -` which proves the file decodes locally. That doesn't prove a real student's browser plays it end-to-end. This time: stream the audio the way a browser does (with `Range` requests and partial fetches), and confirm playback can advance past the 5-second, 30-second, 60-second, and final-second marks.

### 2. Voice diversity per multi-speaker conversation

For every dialogue / interview / multi-speaker listening item, each speaker must use a **distinct ElevenLabs voice_id**. Right now, if a row has 2 speakers but the generation script accidentally used the same voice for both, the audio plays end-to-end but sounds like one person performing both sides — which destroys the realism that makes listening practice work.

### 3. Transcript naturalism check

Some transcripts have AI-flavored phrasing — e.g. "Dr. Mohammed: I agree with you. Dr. Claude: Thank you for agreeing." This is unnatural and breaks immersion. Audit every transcript for AI-style markers (over-polite turn-taking, name-vocatives in every line, robotic acknowledgments, "As an AI" leaks) and produce a **flagged list** for human content review — **do NOT auto-rewrite the transcripts** (that's a content decision, not a code decision).

---

## 📁 ENVIRONMENT

- **Working dir:** `/Users/dr.ali/Projects/fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md` — load and obey
- **DB:** Supabase prod via `mcp__supabase__*` tools
- **Storage bucket:** `curriculum-audio`
- **Required tools:** `ffmpeg`, `ffprobe`, `curl`. Verify before Phase A.
- **Branch:** `main`. Pull-rebase before starting.
- **Prerequisite:** The LISTENING-VOCAB-FIX (or whatever was running in the listening player + vocab card) must have completed and pushed. Verify with `git log -1 --format=%s` mentioning listening/vocab fixes from 2026-05-18.

---

## ⚠️ STRICT RULES

1. **No transcript rewrites.** Phase C produces a flagged list only. Auto-rewriting transcripts is forbidden — content quality is a human-review decision.
2. **No bulk regeneration without explicit per-row evidence.** If voice diversity is broken on 3 rows, regenerate those 3 — not all 72.
3. **No student data writes.**
4. **No DB schema changes.**
5. **Hooks before guards.**
6. **`.select()` after every `.update()` / `.upsert()`.**
7. **Idempotent.** Re-runnable. Audit reports should overwrite (not duplicate).
8. **ElevenLabs char budget.** Check available chars BEFORE any regeneration. Stop before exhausting quota.
9. **Mac shell.**
10. **`NODE_OPTIONS="--dns-result-order=ipv4first"`** before any ElevenLabs call (IPv6 ECONNRESET against their API).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Truncation verification (real-browser style)
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
  fs.mkdirSync('docs/audits/listening-qa', { recursive: true });
  fs.writeFileSync('docs/audits/listening-qa/inventory.json', JSON.stringify(data, null, 2));
  console.log(`Inventoried ${data.length} listening rows`);
})();
```

Run it. Confirm row count matches expectation.

### A.2 — Browser-style stream test

For each row, simulate the way Chrome/Safari actually fetch an `<audio>` source — `Range` requests for chunked download — and confirm the audio is fully streamable, not just decodable in isolation:

```javascript
// scripts/audits/listening-qa/02-stream-test.cjs
// For each audio_url:
// 1. HEAD request — confirm 200, Content-Type=audio/mpeg, Accept-Ranges=bytes, Content-Length present
// 2. Range request 0-65535 (first 64KB) — confirm 206 Partial Content
// 3. Range request <Content-Length - 65536>-<Content-Length - 1> (last 64KB) — confirm 206
// 4. Full GET, write to /tmp/listening-qa/<id>.mp3
// 5. ffprobe — get container duration
// 6. Decode-test — ffmpeg -v error -i FILE -f null - 2>&1 capture stderr, parse "time=HH:MM:SS.MS"
// 7. Compare decoded duration vs container duration
// 8. Verdict: OK / TRUNCATED / NO_RANGE / WRONG_MIME / FETCH_FAIL
```

Implement this fully. Output `docs/audits/listening-qa/stream-test.json` with per-row results:

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

Definitions:
- `truncation_ratio = decoded_duration_s / container_duration_s`
- `TRUNCATED` if `truncation_ratio < 0.95`
- `NO_RANGE` if Range requests don't return 206
- `WRONG_MIME` if Content-Type isn't `audio/mpeg`
- `FETCH_FAIL` if HEAD or GET doesn't return 200

### A.3 — Test in actual browser context if possible

For 3 rows verdict-tagged OK, additionally use `puppeteer` or `playwright` headlessly to load a tiny test page that plays the audio for 5 seconds and reports `audio.currentTime` after that period. (Skip this if puppeteer/playwright isn't already installed — don't add new heavy deps for this audit. Run the stream test only in that case.)

### A.4 — If truncations found, fix only those

If Phase A finds any `TRUNCATED` rows: regenerate those specific rows using the same canonical generation path the previous overhaul established (re-encoded concat via `scripts/audio-v2/lib/concat.cjs` from commit `8159640`). Decode-verify each regenerated file before declaring it fixed.

If Phase A finds `NO_RANGE` or `WRONG_MIME`: that's a Supabase Storage bucket config issue, not a per-file issue. Fix at bucket level:

```sql
UPDATE storage.buckets SET public = true WHERE id = 'curriculum-audio';
```

For MIME, the fix is in the upload script — confirm `contentType: 'audio/mpeg'` is passed on upload. Existing files with wrong MIME need re-upload (only if A.2 actually finds this — don't speculatively re-upload).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Voice diversity audit
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### B.1 — Identify multi-speaker rows

```sql
SELECT id, title_ar, audio_type,
       jsonb_array_length(speaker_segments::jsonb) AS segment_count
FROM curriculum_listening
WHERE audio_type IN ('dialogue', 'interview', 'conversation')
  AND speaker_segments IS NOT NULL
ORDER BY segment_count DESC;
```

For each row, extract the distinct speaker identities used:

```javascript
// scripts/audits/listening-qa/03-voice-diversity.cjs
// For each multi-speaker row, parse speaker_segments and produce:
//   distinct_speakers: number of unique speaker_name or speaker_id values
//   distinct_voices_assigned: number of unique voice_id values used
//   voice_id_per_speaker: { speakerA: voice_id1, speakerB: voice_id2, ... }
//   verdict: OK if distinct_voices_assigned >= distinct_speakers, else SINGLE_VOICE_COLLISION
```

The `voice_id` for each speaker should be stored either:
- Inside `speaker_segments[i].voice_id`, OR
- In a separate `speakers` field, OR
- In a generation log / audit table

Find whichever the codebase uses. If voice_id isn't stored anywhere — that's the bug: we can't verify because we can't tell what voice was used. In that case, the audit downgrades to "manual listen-through required" for multi-speaker rows.

### B.2 — Acoustic fingerprint fallback (if voice_id not stored)

If voice_id wasn't stored at generation time, audit acoustically: for each multi-speaker row, split the audio at `speaker_segments[i].start_ms` boundaries, run a basic audio fingerprint (mean F0, spectral centroid) on each segment, and cluster. If 2 speakers produce 2 distinct clusters → OK. If 2 speakers produce 1 cluster → flagged as single-voice-collision.

This is more involved than the voice_id check; do it only as a fallback. If voice_id IS stored, skip B.2.

### B.3 — Fix only flagged rows

For each row with verdict `SINGLE_VOICE_COLLISION`:
1. Map each distinct speaker in the row to a distinct voice_id from the project's voice roster (ElevenLabs voices already configured in the codebase — there should be at least 2-3)
2. Regenerate the audio with the corrected voice mapping using the existing generation path
3. Re-upload (`upsert: true`) and decode-verify
4. `.update({...}).select()` the row's `audio_url`, `audio_path`, `audio_duration_ms`, `speaker_segments` (with corrected voice_id per segment)

ElevenLabs quota check before regeneration:

```bash
curl -sH "xi-api-key: $ELEVENLABS_API_KEY" \
  https://api.elevenlabs.io/v1/user/subscription | jq '.character_count, .character_limit'
```

If `(limit - count - estimated_chars_needed) < 0`, stop and report.

### B.4 — Phase B report

`docs/audits/listening-qa/voice-diversity.json`:

```json
{
  "rows_audited": N,
  "single_voice_collisions": [
    {"id": "...", "title_ar": "...", "speakers": 2, "distinct_voices": 1, "fixed": true}
  ],
  "voice_id_not_stored": [...],
  "ok": [...]
}
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Transcript naturalism flagged list (NO auto-rewrites)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### C.1 — Heuristic markers of AI-flavored writing

Score each transcript with these signals. Higher score = more likely AI-flavored:

| Signal | Pattern | Weight |
|--------|---------|--------|
| Excessive vocatives | every line opens with addressee's name ("Dr. Mohammed, ...", "Claude, ...") | 3 |
| Acknowledgment chains | "Thank you for...", "I agree with you", "That's a great point" | 2 |
| Robotic turn-taking | speakers never interrupt, overlap, or use disfluencies (uh, um, well, you know) | 2 |
| Disclaimer leaks | "As an AI", "I'm here to help", "according to my training" | 5 |
| Over-explanation | speakers spell out subtext that real speakers leave implicit | 1 |
| Hedge stacking | "I think that, perhaps, maybe, possibly" | 1 |
| Title-name overuse | "Doctor X" used 3+ times in the same exchange | 2 |
| Symmetric exchanges | each speaker uses similar sentence length / structure (real conversations are lopsided) | 1 |
| Absent contractions | "I am" / "do not" / "will not" instead of "I'm" / "don't" / "won't" | 1 |
| Reciprocal gratitude | "Thank you" → "You're welcome" → "Thank you for your help" | 2 |

Implement a script that produces a per-row score and the markers it triggered:

```javascript
// scripts/audits/listening-qa/04-transcript-naturalism.cjs
// For each curriculum_listening row:
//   1. Tokenize transcript by speaker turn (use speaker_segments to split)
//   2. Run regex/heuristic checks for each signal
//   3. Compute total score
//   4. Verdict:
//        OK              score 0-3
//        REVIEW          score 4-7
//        REGENERATE      score 8+
//   5. Output per-row markers triggered
```

Output `docs/audits/listening-qa/transcript-naturalism.json`:

```json
{
  "total_rows": N,
  "ok": N,
  "review": N,
  "regenerate": N,
  "flagged": [
    {
      "id": "...",
      "title_ar": "...",
      "audio_type": "dialogue",
      "score": 9,
      "markers": ["excessive_vocatives", "acknowledgment_chains", "reciprocal_gratitude"],
      "transcript_excerpt": "<first 200 chars>"
    }
  ]
}
```

### C.2 — Markdown summary for human review

Also produce `docs/audits/listening-qa/transcript-naturalism.md` — human-readable summary grouped by severity, with the worst 10 transcripts excerpted in full so the user can decide regeneration priority.

### C.3 — DO NOT auto-rewrite

Even for the worst-scoring rows, do not generate new transcripts. Decision belongs to the user (Ali) — he'll either:
- Bulk-regenerate flagged rows with a curated prompt
- Hand-edit a few high-impact rows
- Accept some current state

Phase C produces evidence, not edits.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Consolidate findings
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write `docs/audits/listening-qa/FINAL-REPORT.md`:

```markdown
# Listening QA — Final Report (2026-05-18)

## Phase A — Truncation
- Rows audited: N
- OK: N
- Truncated (regenerated): N
- No-range (bucket fix): N
- Wrong-mime: N
- Verdict: <ALL-CLEAR | FIXES-APPLIED | OPEN-ISSUES>

## Phase B — Voice diversity
- Multi-speaker rows audited: N
- Single-voice collisions (regenerated): N
- Voice_id-not-stored rows: N (acoustic fallback used / manual review needed)
- Verdict: <ALL-CLEAR | FIXES-APPLIED | OPEN-ISSUES>

## Phase C — Transcript naturalism
- Total rows scored: N
- OK: N
- Review (4-7): N
- Regenerate (8+): N
- Top 10 worst rows: <list with ids, titles, scores>

## Action required from Ali
1. <e.g., decide whether to bulk-regenerate the N rows with score 8+>
2. <e.g., review the M rows with score 4-7 individually>
3. <any open-issues that need product decision>

## ElevenLabs char budget
- Pre-run: <chars used / limit>
- Post-run: <chars used / limit>
- Consumed this run: N
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE E — Commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### E.1 — Self-check

1. `docs/audits/listening-qa/FINAL-REPORT.md` exists and is comprehensive
2. All per-phase JSON outputs exist
3. Any audio regenerations done in Phase A or B pass `ffmpeg -v error -i FILE -f null -` decode-test
4. `git status` shows new files in `docs/audits/listening-qa/` and `scripts/audits/listening-qa/`, plus any audio metadata updates in DB (via MCP, not migration)
5. ESLint clean on any new JS

### E.2 — Commit

```bash
git add scripts/audits/listening-qa/ docs/audits/listening-qa/

# If any audio was regenerated, also include any related code touched
git add src/components/players/listening/ scripts/audio-v2/ 2>/dev/null

git commit -m "audit(listening): truncation verify + voice diversity + transcript naturalism

PHASE A — Truncation verify (browser-style stream test):
- Audited N rows via Range requests + decode comparison
- <result summary>

PHASE B — Voice diversity:
- Audited N multi-speaker rows
- <result summary>

PHASE C — Transcript naturalism (FLAGGING ONLY, no auto-rewrites):
- Scored N transcripts against AI-flavored heuristics
- N flagged for human review at docs/audits/listening-qa/transcript-naturalism.md

NOT TOUCHED:
- No transcripts rewritten (content decision belongs to user)
- No bulk regenerations (only per-row evidence-backed regens)
- No student data
- No DB schema changes"

git push origin main
git fetch origin
git log --oneline -3 HEAD
git log --oneline -3 origin/main
```

---

## ⛔ DO NOT

- ❌ Auto-rewrite any transcript
- ❌ Bulk-regenerate audio without per-row evidence from Phase A or B
- ❌ Exhaust ElevenLabs quota — check before, stop if exceeded
- ❌ Apply DB schema migrations
- ❌ Touch student data
- ❌ Run `vite build` locally

## ✅ FINISH LINE

- Truncation: ALL-CLEAR verdict OR a small list of regenerated rows that now pass
- Voice diversity: ALL-CLEAR verdict OR a small list of regenerated rows
- Transcript naturalism: flagged list produced, decision items handed back to Ali
- `docs/audits/listening-qa/FINAL-REPORT.md` exists
- One commit pushed to `origin/main`

End of prompt.
