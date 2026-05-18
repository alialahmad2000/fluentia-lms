# 01-AUDIT-AUDIO-CONTENT — Read-only Discovery

> **Move + execute:**
> ```powershell
> Move-Item -Force "$env:USERPROFILE\Downloads\01-AUDIT-AUDIO-CONTENT.md" "C:\Users\Dr. Ali\Desktop\fluentia-lms\prompts\agents\01-AUDIT-AUDIO-CONTENT.md"
> ```
> ```
> Read and execute prompts/agents/01-AUDIT-AUDIO-CONTENT.md
> ```

---

## 🎯 MISSION

**READ-ONLY** comprehensive audit of every audio asset in the LMS to identify:

1. **Truncated audio** — listening clips that cut off before the transcript ends
2. **Single-voice-when-should-be-multi** — dialogue/interview rows with only one voice in the audio
3. **Speaker labels read aloud** — audio that contains the words "Sara:", "Ahmed:", "Speaker A:" etc. embedded in the spoken output
4. **Reading vs Listening confusion** — reading passages that use the listening player UX (e.g. hide-text toggle)
5. **Missing word-level timestamps** — reading passages without `word_timestamps` populated, blocking single-word audio playback

**No fixes in this prompt.** Output is a JSON inventory + Markdown report that the next prompts (02, 03) will consume.

---

## 📁 ENVIRONMENT

- **Working dir:** `C:\Users\Dr. Ali\Desktop\fluentia-lms`
- **DB:** Supabase prod (`nmjexpuycmqcxuxljier`)
- **Storage bucket:** `curriculum-audio` (public)
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`
- **Node env:** `NODE_OPTIONS=--dns-result-order=ipv4first` (mandatory)
- **Tools required:** `ffprobe` (part of ffmpeg). If missing → `winget install ffmpeg` then re-verify in new shell.

---

## ⚠️ STRICT RULES

1. **READ-ONLY.** No DB writes, no storage writes, no audio regeneration.
2. **Discovery via `information_schema.columns`** before any query.
3. **No `vite build`.**
4. **All output written under `docs/audits/audio-issues/`** (create if missing).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Schema verification (5 min)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Query columns for: `curriculum_listening`, `curriculum_reading_passages`, `reading_passage_audio`, `curriculum_irregular_verbs`.

Confirm existence of: `audio_url`, `audio_path`, `audio_duration_ms`, `word_timestamps`, `speaker_segments`, `transcript`, `content`, `audio_type`, `paragraph_audio`.

Output Phase A summary to console.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Listening audio audit
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For every row in `curriculum_listening` where `audio_url IS NOT NULL`:

### B.1 — Download to temp and measure with ffprobe

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 "<audio_url>"
```

Get actual playback duration in seconds.

### B.2 — Compute expected duration

Expected duration estimate from transcript:
- Strip speaker labels (`/^[A-Z][a-zA-Z\s]{0,30}?:\s*/m`)
- Count words: `text.trim().split(/\s+/).length`
- Estimate seconds: `words / 2.5` (average TTS pace ≈ 150 wpm = 2.5 wps)
- Tolerance: actual duration must be ≥ 75% of expected. Below 75% → **flag as TRUNCATED**.

### B.3 — Multi-voice check

Per row:
- Read `speaker_segments` (if NULL → already flagged).
- If `audio_type IN ('dialogue', 'interview')`:
  - `speaker_segments` should have `length > 1` AND have at least 2 unique `voice_id` values.
  - If only 1 unique voice → **flag as SINGLE_VOICE_WRONG**.
- If `audio_type IN ('monologue', 'lecture')`:
  - `speaker_segments` should have `length = 1`. Anything else → flag as METADATA_MISMATCH.

### B.4 — Speaker-label-in-audio check (heuristic, no transcription needed)

Per row in dialogue/interview category:
- Inspect `speaker_segments[].text`. If any segment's text starts with a word followed by `:` (e.g. `"Sara: How are you?"`) → the parser failed to strip the label and TTS is reading it aloud. **Flag as LABEL_IN_TEXT**.
- Also check for embedded labels mid-text: `/\b[A-Z][a-z]+:\s/` matching anywhere → flag the same.

### B.5 — Per-row inventory entry

Write to `docs/audits/audio-issues/listening-audit.json`:

```json
{
  "audited_at": "<iso>",
  "total_items": N,
  "items": [
    {
      "id": "<uuid>",
      "level": 1,
      "unit": 3,
      "title_en": "...",
      "audio_type": "dialogue",
      "audio_url": "...",
      "expected_duration_s": 87.6,
      "actual_duration_s": 32.1,
      "duration_ratio": 0.366,
      "speaker_segments_count": 1,
      "unique_voices": 1,
      "has_label_in_text": true,
      "flags": ["TRUNCATED", "SINGLE_VOICE_WRONG", "LABEL_IN_TEXT"]
    }
  ]
}
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Reading audio audit
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For every row in `reading_passage_audio` joined with `curriculum_reading_passages`:

### C.1 — Truncation check

Same method as B.1–B.2 on `full_audio_url`.

### C.2 — Word timestamps completeness

- Word count of passage `content`: `content.trim().split(/\s+/).length`
- Words in `word_timestamps.paragraphs[].words` (sum across paragraphs)
- Difference > 15% → **flag as TIMESTAMPS_INCOMPLETE**

### C.3 — Per-paragraph clip presence

- Count paragraphs in `content` (split by `\n\n`)
- Count entries in `paragraph_audio`
- Mismatch → **flag as PARAGRAPH_AUDIO_MISMATCH**

### C.4 — Per-row inventory entry

Write to `docs/audits/audio-issues/reading-audit.json` with same shape as B.5.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — UI component audit (reading vs listening confusion)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### D.1 — Locate all player-related components

```bash
# Find every component that renders audio for reading or listening
grep -rln "audio.*passage\|ReadingTab\|ListeningTab\|reading_passage_audio\|curriculum_listening" src/ --include="*.jsx" --include="*.tsx"

# Find every hide-text / transcript toggle
grep -rn "transcript.*hidden\|hide.*text\|إخفاء.*النص\|إظهار.*النص\|transcriptHidden" src/ --include="*.jsx"
```

### D.2 — Determine which component each tab uses

For each match, read the file and record:
- File path
- Which DB table it reads (`curriculum_listening` vs `curriculum_reading_passages`)
- Does it render a hide-text toggle? (yes/no)
- Does it render per-word click handlers? (yes/no)
- Component prop interface (what data it expects)

### D.3 — Identify the bug

The Reading tab should NOT render a hide-text toggle (the passage IS the content the student needs to read). If a Reading tab component renders one → log to inventory.

Write to `docs/audits/audio-issues/ui-component-audit.md` (Markdown, human-readable):

```markdown
# UI Component Audit

## Reading Tab
- File: src/path/to/ReadingTab.jsx
- DB source: curriculum_reading_passages ✓
- Renders hide-text toggle: YES ❌ (should be NO)
- Renders per-word click: NO ❌ (should be YES)
- Notes: ...

## Listening Tab
- File: src/path/to/ListeningTab.jsx
- DB source: curriculum_listening ✓
- Renders hide-text toggle: YES ✓ (expected)
- Renders per-word click: NO ❌ (students want this too)
- Notes: ...

## Shared Player Component
- File: src/components/AudioPlayer.jsx (or similar)
- Used by: ReadingTab, ListeningTab
- Conclusion: Single shared component → bleed-over. Recommend split.
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE E — Word-level pronunciation availability
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For every reading passage (and listening item):
- Does `word_timestamps` exist and parse as valid JSON with words[]?
- If YES → per-word audio is possible via `audio.currentTime = word.start_ms / 1000` + stop at `word.end_ms / 1000`.
- If NO → per-word audio requires either (a) regeneration with timestamps or (b) Web Speech API fallback.

Write counts to the final report.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE F — Master report
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write `docs/audits/audio-issues/MASTER-REPORT.md`:

```markdown
# Audio Issues — Master Audit Report
Generated: <iso>

## Summary

### Listening (N items audited)
- Truncated: N items (list IDs)
- Single-voice when should be multi: N items
- Speaker labels in audio text: N items
- Metadata mismatch: N items
- Healthy: N items

### Reading (N items audited)
- Truncated: N
- Timestamps incomplete: N
- Paragraph audio mismatch: N
- Healthy: N

### UI components
- Reading tab uses listening UX: YES / NO
- Per-word click absent: <list of components>

### Word-level pronunciation feasibility
- Reading with valid word_timestamps: N / N
- Listening with valid word_timestamps: N / N
- Fallback to Web Speech API needed for: N items

## Per-item details

### Items needing audio REGENERATION (Prompt 02 input)
<table: id, level, unit, audio_type, flags>

### Items needing UI rebuild (Prompt 03 input)
<list of component files>

### Total ElevenLabs budget needed for regeneration
- Characters to regenerate: ~X
- Current remaining quota: Y
- Headroom: Z%
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE G — Commit (audit artifacts only)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```bash
git add docs/audits/audio-issues/
git commit -m "audit(audio): comprehensive audio + UI issues inventory

- Listening: identified truncated, single-voice-wrong, label-in-text rows
- Reading: identified truncation + timestamp gaps + paragraph mismatches
- UI: documented reading-vs-listening component bleed
- Word-level: feasibility per passage logged
- Output: docs/audits/audio-issues/MASTER-REPORT.md
- No content changes, no audio regeneration"
git push origin main
git fetch origin
git log --oneline -1 HEAD
git log --oneline -1 origin/main
```

---

## ⛔ DO NOT

- ❌ Generate any audio
- ❌ Modify any DB row
- ❌ Modify any storage object
- ❌ Modify any component
- ❌ Run vite build
- ❌ Touch ielts_* tables

## ✅ FINISH LINE

`docs/audits/audio-issues/MASTER-REPORT.md` exists, JSON inventories saved, commit pushed. The report directly drives Prompts 02 and 03.

End of prompt.
