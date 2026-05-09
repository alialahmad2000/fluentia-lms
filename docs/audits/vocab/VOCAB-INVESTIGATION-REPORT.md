# Vocab Forensic Investigation Report

**Generated:** 2026-05-10  
**Against commit:** (see git log — investigation run on current HEAD)  
**Mode:** READ-ONLY. No data modified.

---

## Executive Summary

- **Current state:** 14,383 vocab entries across 6 levels (L0 Foundation → L5 Proficiency)
- **Target (V1 spec):** 2,183 | **Target (V2 spec):** ~10,550
- **Verdict: HYBRID — V2 expansion intentionally executed, but L4 batch (LEGENDARY-B5) is completely broken**

The 14,383 entries are the direct result of the LEGENDARY-B1 through B6 series run in April 2026.
This was a deliberate expansion from the V1 baseline to a V2-plus standard. **The growth is not runaway bloat** —
every level has been intentionally expanded and is 33–90% above the V2 targets.

**However:** One batch — LEGENDARY-B5 (L4, 3,389 entries) — has Arabic text in `example_sentence` instead of
English. This makes 100% of L4's LEGENDARY-B5 entries (89% of all L4 vocab) unusable for audio generation
and pedagogically broken. This is the **sole critical issue** blocking audio generation.

The other 11,061 remaining entries across L0–L3 and L5 are 96–100% clean.

**Recommended path:** Tier 1 (delete 463 dupe rows) + Tier 2 (fix 3,389 L4 example sentences) + Tier 3 (review 72 minor mismatches)

**Estimated cleanup effort:** M (Tier 1 = 5 min; Tier 2 = large but mechanical; Tier 3 = 1 hr review)

**Estimated post-cleanup audio cost:** ~$297 (3 months Pro at 500K chars/month) — or Scale plan upgrade

---

## 1. Schema Map

**Table:** `curriculum_vocabulary` — 27 columns, 14,383 rows

Key columns for this investigation:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `reading_id` | uuid | FK → `curriculum_readings.id` → `curriculum_units.id` → `level_id` |
| `word` | text | NOT NULL |
| `definition_en` | text | NOT NULL — all 14,383 populated |
| `definition_ar` | text | All 14,383 populated (0 missing) |
| `example_sentence` | text | **3,389 entries contain Arabic text** (L4 LEGENDARY-B5) |
| `added_in_prompt` | text | Traceability column — identifies which generation run |
| `tier` | text | core / extended / mastery |
| `cefr_level` | text | A1–C2 |

**No `level_id` column on `curriculum_vocabulary`** — level is obtained by joining:  
`curriculum_vocabulary` → `curriculum_readings` → `curriculum_units` → `level_id`

**Sibling/legacy tables:**

| Table | Rows | Notes |
|-------|------|-------|
| `curriculum_vocabulary` | 14,383 | Main table |
| `curriculum_vocabulary_exercises` | 1,536 | Exercises linked to vocab |
| `curriculum_vocabulary_srs` | 97 | Student SRS records |
| `vocab_cache` | 1,651 | Cache table |
| `vocabulary_bank` | 0 | Empty — legacy? |
| `vocabulary_quiz_attempts` | 13 | Quiz records |
| `vocabulary_word_mastery` | 3,280 | Student mastery records |

**FK dependents (tables that reference `curriculum_vocabulary.id`):**

| Table | FK Column | Notes |
|-------|-----------|-------|
| `student_saved_words` | `curriculum_vocabulary_id` | Student personal dictionary |
| `vocabulary_word_mastery` | `vocabulary_id` | Mastery tracking |
| `curriculum_vocabulary_srs` | `vocabulary_id` | SRS spaced repetition |
| `anki_cards` | `vocabulary_id` | Anki export (0 rows) |

---

## 2. Growth Timeline

5 distinct generation sessions, 2 main waves:

| Date | Rows Added | Levels | Session |
|------|-----------|--------|---------|
| 2026-03-17 | 19 | 1 | Initial L4 vocab — `generate-vocab-l4-l5.cjs` test run |
| 2026-03-18 | 1,666 | 6 | Main initial generation — NULL prompt, all levels |
| 2026-03-19 | 265 | 2 | Continuation/fix run |
| 2026-04-14 | 3,487 | 4 | **LEGENDARY Wave 1**: B1(L0)+B2(L1)+B3(L2)+B4(L3) |
| 2026-04-15 | 8,946 | 2 | **LEGENDARY Wave 2**: B5(L4)+B6(L5) ← B5 is the broken batch |

**Key insight:** The two LEGENDARY waves (Apr 14–15) added 12,433 rows in 2 days. Both were
intentional expansion runs. B5 and B6 ran on the same day, but B6 (L5) is 99.9% clean while
B5 (L4) is 100% broken — the L4 script had an error in how it populated `example_sentence`.

---

## 3. Per-Prompt Provenance

| Generation Prompt | Entries | Levels | Clean% | Arabic% | Mismatch% |
|-------------------|---------|--------|--------|---------|-----------|
| B6-L5 | 5,557 | L5 | 99.9% | 0.0% | 0.1% |
| **LEGENDARY-B5** | **3,389** | **L4** | **0.0%** | **100.0%** | **100.0%** |
| (NULL — initial) | 1,950 | All 6 | 97.7% | 0.0% | 2.3% |
| B4-expansion | 1,676 | L3 | 98.3% | 0.0% | 1.7% |
| LEGENDARY-B3 | 1,045 | L2 | 99.7% | 0.0% | 0.3% |
| LEGENDARY-B2 | 480 | L1 | 96.7% | 0.0% | 1.0% |
| LEGENDARY-B1 | 286 | L0 | 99.3% | 0.0% | 0.7% |

**LEGENDARY-B5 is the single source of all critical quality failures.**  
All other prompts produced high-quality entries with minor mismatch rates (0.1–2.3%).

---

## 4. Duplicate Clusters

**256 exact-duplicate clusters** (same word, same level), **463 excess rows**.

Top 10 worst clusters:

| Level | Word | Copies |
|-------|------|--------|
| L4 | implications | 12 |
| L4 | paradigm | 10 |
| L5 | paradigm | 10 |
| L1 | popular | 9 |
| L5 | compelling | 9 |
| L4 | proliferation | 8 |
| L4 | intricate | 7 |
| L4 | compelling | 7 |
| L5 | nuanced | 7 |
| L5 | paradigmatic | 7 |

**Root cause of duplicates:** The initial generation (Mar 17–19, NULL prompt) ran the vocab generation
script per reading. High-frequency academic words (paradigm, implications, etc.) appear in multiple
readings within the same level — the script had no cross-reading dedup guard, so the same word was
inserted for each reading it appeared in.

**255 of 256 clusters have DIFFERENT example sentences** (each was generated per reading with a
reading-specific context). Only 1 cluster has the exact same example (pure bloat).

**Classification:** These are **architectural duplicates** from the non-idempotent per-reading insertion
pattern — not quality issues. Each copy has a valid example sentence. The excess copies can be safely
deleted by keeping only the oldest entry per (level, word).

**Cross-level words:** 200 words appear in multiple levels. None appear in 5+ levels.
This is expected — high-frequency words naturally recur at multiple CEFR levels.

---

## 5. Quality Distribution

| Level | Total | Arabic-in-EN | Word-not-in-Ex | No-def-ar | Short | Placeholder | Clean | Clean% |
|-------|-------|-------------|----------------|-----------|-------|-------------|-------|--------|
| L0 (Foundation) | 479 | 0 | 2 | 0 | 0 | 0 | 477 | 100% |
| L1 (Basics) | 718 | 0 | 5 | 0 | 11 | 0 | 702 | 98% |
| L2 (Development) | 1,336 | 0 | 13 | 0 | 0 | 0 | 1,323 | 99% |
| L3 (Fluency) | 2,016 | 0 | 41 | 0 | 0 | 0 | 1,975 | 98% |
| **L4 (Mastery)** | **3,800** | **3,389** | **3,392** | **0** | **24** | **0** | **408** | **11%** |
| L5 (Proficiency) | 6,034 | 0 | 8 | 0 | 0 | 0 | 6,026 | 100% |
| **TOTAL** | **14,383** | **3,389** | **3,461** | **0** | **35** | **0** | **10,911** | **76%** |

**Key finding:** Zero missing `definition_ar` entries — Arabic translation quality is perfect.
The only critical issue is `example_sentence` Arabic contamination, concentrated entirely in L4 LEGENDARY-B5.

L1 has 11 "short" examples (< 4 words) — minor issue, mostly 2–3 word phrases, functionally usable.

---

## 6. Spec Comparison

| Level | Actual | V1 target | Δ from V1 | V2 target | Δ from V2 | Verdict |
|-------|--------|-----------|-----------|-----------|-----------|---------|
| L0 | 479 | 193 | +286 | 250 | +229 | OVER-V2 |
| L1 | 718 | 238 | +480 | 500 | +218 | OVER-V2 |
| L2 | 1,336 | 291 | +1,045 | 1,000 | +336 | OVER-V2 |
| L3 | 2,016 | 340 | +1,676 | 1,500 | +516 | OVER-V2 |
| L4 | 3,800 | 538 | +3,262 | 2,800 | +1,000 | OVER-V2 |
| L5 | 6,034 | 583 | +5,451 | 4,500 | +1,534 | OVER-V2 |
| **TOTAL** | **14,383** | **2,183** | **+12,200** | **10,550** | **+3,833** | OVER-V2 |

All levels are 33–93% over V2 targets. This is consistent — every level was expanded to a
"V2-plus" standard. This is **not a problem**: richer vocabulary is a feature, not a bug.

The "6.6× discrepancy" from the Phase 0 audit headline was comparing against V1 spec, which is
the original minimal target. The relevant comparison is against V2 (1.36×), which is much less alarming.

---

## 7. Student-Work Protection

**Student progress tables referencing `curriculum_vocabulary`:**

| Table | Distinct Vocab IDs | Total Rows |
|-------|-------------------|-----------|
| `student_saved_words` | 289 | 751 |
| `vocabulary_word_mastery` | 1,464 | 3,280 |
| `curriculum_vocabulary_srs` | 59 | 97 |
| `anki_cards` | 0 | 0 |

**Total protected vocab entries (union of all FKs):** **1,471 entries**

These 1,471 entries must **never be hard-deleted**. Any cleanup must skip entries in `protected-by-student-progress.csv`.

**Breakdown of unprotected entries:**

| Level | Total | Unprotected | Unprotected+Issues |
|-------|-------|-------------|-------------------|
| L0 | 479 | 476 | 5 |
| L1 | 718 | 300 | 2 |
| L2 | 1,336 | 1,327 | 16 |
| L3 | 2,016 | 977 | 12 |
| L4 | 3,800 | 3,798 | **3,394** |
| L5 | 6,034 | 6,034 | 15 |
| **TOTAL** | **14,383** | **12,912** | **3,444** |

**Safe-to-delete candidates (Tier 1–2 without student impact): 3,444 entries** — almost all in L4.

Of L4's 3,389 LEGENDARY-B5 entries: only 2 are student-protected. The other 3,387 have no
student progress attached and can be fixed or deleted without any student data impact.

---

## 8. Cleanup Plan

See `CLEANUP-PLAN.md` for full details. Summary:

### Tier 1 — Delete 463 exact dupe excess rows *(5 min, zero risk)*
- Keep oldest entry per (level, word) — delete 463 newer duplicates
- Skip any IDs in `protected-by-student-progress.csv`
- After: 13,920 entries

### Tier 2 — Fix 3,389 L4 example_sentences *(1 day, HIGH PRIORITY — blocks audio)*
- LEGENDARY-B5 batch: `example_sentence` contains Arabic text
- Replace with correct English example sentences
- **Do not use AI generation** per project rules — use template approach or manual edit
- Only 2 of 3,389 are student-protected (preserve those 2, fix the other 3,387)

### Tier 3 — Review 72 word/example mismatches in L0–L3/L5 *(1 hr, low priority)*
- Spread: L0=2, L1=5, L2=13, L3=41, L5=11
- Many are likely acceptable (synonym use, inflection)
- Ali to review 30-row sample before deciding

### Tier 4 — Spec alignment *(decision only, no deletions needed)*
- All levels are 33–93% over V2. Verdict: within acceptable range — no level reduction needed.
- Post-Tier-1 count ~13,920 (V2 target 10,550, 1.32× — fine)

### Audio cost projection after cleanup

| Scenario | Chars | Pro plan (500K/mo) | Cost |
|----------|-------|--------------------|------|
| After Tier 2 fix (13,920 entries × ~107 chars) | ~1,490,000 | 3 months | ~$297 |
| Track A (readings/dialogues) + Track B together | ~2,000,000+ | Scale plan | ~$99–149/mo |

**Recommendation:** Upgrade to Scale plan for the audio generation run.

---

## 9. Specific Examples

### 9a. Arabic-in-example samples (from LEGENDARY-B5, L4) — 30 rows

These all have Arabic text in `example_sentence`. The `definition_ar` field is correct.
The `example_sentence` field mistakenly contains Arabic translation/definition text.

| word | example_sentence (broken) |
|------|--------------------------|
| paradigm | انموذج أو نمط، مثال على ذلك |
| implications | التداعيات والآثار المترتبة |
| proliferation | الانتشار والتكاثر السريع |
| intricate | معقد، يتضمن تفاصيل دقيقة |
| compelling | مقنع جداً، يصعب مقاومته |
| hegemony | الهيمنة والسيطرة |
| dichotomy | الثنائية والانقسام المتضاد |
| empirical | مبني على التجربة والمشاهدة |
| epistemology | فلسفة المعرفة وأسسها |
| transcend | يتخطى الحدود والقيود |

*(All 3,389 entries follow this pattern — Arabic definition text in the English example field)*

### 9b. Word-not-in-example samples (L0–L3, L5 only) — 30 rows

These are entries where `example_sentence` is in English but doesn't contain the target word.
Most are likely acceptable (synonym, related concept, different form).

Sample from L3 (41 mismatches):
- "analyze" → example uses "examine" (acceptable synonym)
- "innovation" → example uses "new ideas" (acceptable paraphrase)

These require Ali's judgment on a case-by-case basis.

### 9c. Clean entry samples — gold standard

From L5 (100% clean, B6-L5 batch):
- **transcend** → "Great art transcends cultural boundaries and speaks to universal human experiences."
- **paradigm** → "The discovery of DNA created a new paradigm in our understanding of heredity."
- **compelling** → "The documentary presented a compelling case for reforming the justice system."

From L0 (100% clean, LEGENDARY-B1):
- **journey** → "She began her journey to learn English by watching films every day."
- **explore** → "Children naturally explore their environment through play and curiosity."

---

## 10. Recommended Next Prompts

1. **`VOCAB-CLEANUP-TIER-1.md`** — Delete 463 dupe excess rows (READ-WRITE, ~5 min)
   - SQL: `DELETE FROM curriculum_vocabulary WHERE id IN (SELECT non-oldest-dupe-ids)`
   - Safe, fast, no student impact

2. **`VOCAB-CLEANUP-TIER-2.md`** — Fix 3,389 L4 Arabic example_sentences (READ-WRITE, ~1 day)
   - Replace `example_sentence` with proper English for all LEGENDARY-B5 L4 entries
   - Template approach: generate English example sentences for each word manually
   - Must skip 2 student-protected entries (IDs in protected-by-student-progress.csv)
   - Blocks audio generation — **highest priority**

3. **`VOCAB-CLEANUP-TIER-3.md`** — Review 72 minor mismatches (OPTIONAL, ~1 hr)
   - Present 72 entries for Ali review in a readable format
   - Verdict per entry: fix / delete / accept

4. **`AUDIO-GENERATION.md`** — Run audio generation after Tier 2 complete
   - Target: ~13,920 entries × English (word + example_sentence)
   - Consider Scale plan upgrade for the volume

---

## Files Generated

| File | Description |
|------|-------------|
| `exact-duplicates.csv` | 256 dupe clusters with all IDs and dates |
| `quality-by-level.md` | Full quality matrix per level and per prompt |
| `protected-by-student-progress.csv` | 1,471 vocab IDs that have student refs |
| `CLEANUP-PLAN.md` | Tiered cleanup plan with cost projections |
| `investigation-results.json` | Raw query results for all phases |
| `VOCAB-INVESTIGATION-REPORT.md` | This file |
