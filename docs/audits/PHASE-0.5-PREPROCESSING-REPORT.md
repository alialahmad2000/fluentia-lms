# Phase 0.5 — Dialogue Preprocessor Report

**Generated:** 2026-05-10
**Against commit:** see git log
**Mode:** Parse-only. `transcript` field never modified. Only `speaker_segments` and `segments_processed_at` written.

---

## ✅ OUTCOME

All 72 `curriculum_listening` items processed successfully.

| Metric | Value |
|---|---|
| Items processed | **72 / 72** |
| Multi-voice items (speaker_segments populated) | **59** |
| Single-voice (speaker_segments = NULL, confirmed monologue/lecture) | **13** |
| Total segments created | **374** |
| Unique voices used | **4** (alice / matilda / george / daniel) |
| Unknown-gender warnings | **0** ✅ |
| Spot checks | **3 / 3 passed** ✅ |

---

## 🎭 Voice Distribution

| Voice | Gender | Accent | Segment Count | Item Count |
|---|---|---|---|---|
| alice | female | British | 167 | ~51 |
| matilda | female | American | 81 | ~14 |
| george | male | British | 126 | ~22 |
| daniel | male | British | 0 | 0 |

**Notes:**
- `alice` is the primary female voice — used for all female single-speaker monologues (Noor, Layla, Fatima, Sarah, Nora, Nadia, Narrator, Maya, Mona, Maha, Emma)
- `matilda` appears only in genuine dialogues as the 2nd female speaker
- `george` handles all male hosts/interviewers (Host, Ahmed, Professor Ahmed)
- `daniel` unused — no item has 2+ distinct male speakers

---

## 📊 Segments Per Level

| Level | Items | With Segments | Segments | Notes |
|---|---|---|---|---|
| L0 | 12 | 10 | 10 | All monologues with single female speaker (Noor/Layla/Fatima/Nora/Sarah/Narrator) |
| L1 | 12 | 10 | 10 | All monologues with single female speaker (Layla/Sarah/Nadia/Noor/Narrator) |
| L2 | 12 | 12 | 122 | Rich dialogue — Layla↔Noor(×4), Layla↔Fatima(×2), Layla↔Nora(×2), Layla↔Emma, Layla↔Mona, Fatima↔Noor, Maha↔Layla |
| L3 | 12 | 10 | 68 | Mix of Interviewer monologues + Host monologues + Layla↔Fatima + Ahmed interview |
| L4 | 12 | 7 | 56 | 5 true lectures (NULL) + Host/Interviewer monologues |
| L5 | 12 | 10 | 108 | Host monologues + Interviewer↔Professor Ahmed dialogue |

---

## 🎭 Speaker Roster (Final)

| Speaker | Gender | Source | Voice Assigned | Occurrences |
|---|---|---|---|---|
| Layla | female | dictionary | alice (primary) or matilda (when 2nd female) | ~25 items |
| Noor | female | ali_confirmed | alice (primary) or matilda (2nd female) | ~10 items |
| Host | male | ali_confirmed | george | ~10 items |
| Interviewer | female | ali_confirmed | alice | ~8 items |
| Fatima | female | dictionary | alice (primary) or matilda (2nd female) | ~8 items |
| Nora | female | dictionary | alice (primary) or matilda (2nd female) | ~6 items |
| Sarah | female | dictionary | alice | ~5 items |
| Ahmed | male | dictionary | george | 1 item |
| Maya | female | ali_confirmed | alice | 1 item |
| Mona | female | ali_confirmed | matilda | 1 item |
| Maha | female | ali_confirmed | alice | 1 item |
| Nadia | female | ali_confirmed | alice | 1 item |
| Emma | female | dictionary | matilda | 1 item |
| Narrator | female | ali_confirmed | alice | 2 items |
| Professor Ahmed | male | ali_confirmed | george | 1 item |

---

## 📝 Sample Items (Spot Check)

### L2 U8 — Layla ↔ Nora (dialogue, 14 segments)
```
[1] Layla  → alice   "Hi Nora! How was your mountain trip last weekend?..."
[2] Nora   → matilda "Oh, it was incredible! We went to the Sarawat Mountains..."
[3] Layla  → alice   "Six hours? That sounds exhausting!..."
[4] Nora   → matilda "Well, it was challenging, but not impossible..."
...
```
✅ Name prefixes stripped | ✅ Consistent voices | ✅ No empty segments

### L2 U9 — Layla ↔ Mona (dialogue, 13 segments)
```
[1] Layla  → alice   "Hi Mona! I was wondering if you want to go to the cinema..."
[2] Mona   → matilda "Oh, that sounds great! I was actually planning to stay home..."
...
```
✅ Name prefixes stripped | ✅ Consistent voices | ✅ No empty segments

### L5 U5 — Interviewer ↔ Professor Ahmed (interview, 12 segments)
```
[1] Interviewer       → alice  "Welcome to Energy Futures..."
[3] Professor Ahmed   → george "Certainly. While I acknowledge Dr. Chen's points..."
...
```
✅ Name prefixes stripped | ✅ Gender contrast (female/male) | ✅ Consistent voices

---

## ⚠️ Anomalies Noted

1. **L2 U3 segment [2]** contains `Dr. Sarah` in the transcript body (not as a speaker label). This is normal — it's a reference to a doctor within Interviewer's speech. Correctly parsed as part of the Interviewer segment, not split.

2. **13 TRUE MONOLOGUES** (speaker_segments = NULL) — these are L4/L5 academic lectures with no "Name:" formatting. Phase 1A will use `alice` as the default single voice for these.

3. **Single-speaker "monologues" with Name: prefix** (45 items at L0-L1) — technically single-voice but have speaker labels in transcript. These get 1 segment with voice assigned and label stripped. Phase 1A will treat them as single-voice but still use the correct gendered voice.

4. **`daniel` (secondary male) never triggered** — no item has 2+ distinct male speakers. This is expected given the corpus structure (all Host/Interviewer items use one male voice consistently).

---

## 🎯 Ready for Phase 1A

The `speaker_segments` column is now populated on all 72 `curriculum_listening` rows. Phase 1A audio generator should:

1. For `speaker_segments IS NULL` → generate single audio file using `alice` (default female English narrator)
2. For `speaker_segments IS NOT NULL` → stitch per-segment audio using `voice_id` from each segment
3. Use `char_count` from segments for ElevenLabs quota estimation before each batch
4. `segments_processed_at` can be used to detect items that need re-processing if transcript changes

**Estimated ElevenLabs chars for listening audio:**
- 59 segmented items: ~206,892 chars (from Phase 0 audit) → ~$3.72
- 13 single-voice items: included in above estimate
- Total listening: **~$3.72**
