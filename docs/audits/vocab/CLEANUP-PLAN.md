# Vocab Cleanup Plan — Tiered

**Generated:** 2026-05-10  
**Based on:** Forensic investigation of 14,383 vocab entries  
**Mode:** Read-only investigation output — no data modified

---

## Context

The 14,383 entries are the result of six intentional LEGENDARY-series expansion runs (B1–B6).
The V2 spec targets ~10,550 words total. Current count is 1.36× V2 — moderately over, but not runaway.

**The single most important finding:** LEGENDARY-B5 (L4, 3,389 entries) was inserted with Arabic text
in `example_sentence` instead of English sentences. This single batch causes 100% of the Arabic-in-example
issue and ~98% of the word-not-in-example issue. Every other level is 96–100% clean.

---

## Tier 1 — Safe Deletions (zero student refs + clear bloat)

**Target: 463 excess duplicate rows**

- 256 exact-duplicate clusters (same word, same level) with 463 excess rows
- 255 of 256 clusters have DIFFERENT example sentences (likely inserted via different readings of the same word)
- 1 cluster has the exact same example sentence (pure bloat — delete)
- For the 255 with different examples: keep the oldest entry (lowest `created_at`) per word per level
- **Candidate rows:** 463 excess rows
- **Student-protected within these clusters:** check `protected-by-student-progress.csv` before deleting
  (IDs in that file must never be hard-deleted — soft-delete or preserve)

**Execution:** Single SQL DELETE with subquery selecting non-oldest rows from duplicate clusters.
Estimated: ~5 minutes.

---

## Tier 2 — Fix-in-place: L4 Arabic-in-example (LEGENDARY-B5 batch)

**Target: 3,389 L4 vocab entries where `example_sentence` contains Arabic text**

Root cause: LEGENDARY-B5 script inserted Arabic definition text into `example_sentence`.
The `definition_ar` field is correctly populated on all 3,389 entries.
Only 2 of 3,389 are student-protected (in `vocabulary_word_mastery`).

**Options (choose one):**

### Option A — Replace example_sentence manually/via script (Preferred per project rules)
- Source: The `definition_en` field is correct for all entries
- Write an English example sentence for each word manually or via deterministic generation
- Recommended approach: batch replace using a word list + template ("_word_ is commonly used in academic writing.")
- **Effort:** Large — 3,389 rows
- **Cost:** $0 (no API)

### Option B — One-time Claude API script (NOT recommended per project memory)
- Generate new English example sentences for each word via Claude API
- Per project rules, AI must not be used to generate curriculum content
- **Effort:** Medium (script ~2h)
- **Cost:** ~$3–5 in API tokens

### Recommended: Option A — but consider phased approach:
1. First: bulk-replace with template `"The word [word] is often used in formal academic contexts."` to unblock audio
2. Then: hand-edit the highest-frequency / most important words with real sentences
3. The ~400 existing clean L4 entries (non-LEGENDARY-B5) need no changes

**Audio cost impact:** 3,389 × ~50 chars/sentence = ~170K chars. Pro plan covers 500K → fits.

---

## Tier 3 — Manual Review: Genuine word/example mismatches (non-Arabic)

**Target: 72 rows across L0–L3, L5 where word is not in the example sentence**

Breakdown:
- L0: 2 rows
- L1: 5 rows
- L2: 13 rows
- L3: 41 rows
- L5: 8 rows (3 mismatches beyond the 5 already counted elsewhere)

These are cases where the example sentence exists, is in English, but doesn't contain the target word
(e.g., uses a synonym or the sentence is about a related concept). Some may be acceptable pedagogically.

**Recommended action:**
1. Sample 30 rows (see Section 9 of the investigation report)
2. Ali reviews and decides per entry: fix / delete / accept
3. Likely outcome: most are acceptable — possibly just different inflection or synonym use

**Effort:** Small (< 1 hour of review)

---

## Tier 4 — Spec Alignment

**Current state after Tier 1 cleanup (projections):**

| Level | After-Tier-1 | V1 target | V2 target | Verdict |
|-------|-------------|-----------|-----------|---------|
| L0    | ~476        | 193       | 250       | Over V2 by 90% — rich, acceptable |
| L1    | ~716        | 238       | 500       | Over V2 by 43% — rich, acceptable |
| L2    | ~1,334      | 291       | 1,000     | Over V2 by 33% — acceptable |
| L3    | ~2,014      | 340       | 1,500     | Over V2 by 34% — acceptable |
| L4    | ~3,800      | 538       | 2,800     | Over V2 by 36% — acceptable after Tier 2 fix |
| L5    | ~6,034      | 583       | 4,500     | Over V2 by 34% — acceptable |

**Verdict:** After Tier 1, total ≈ 14,374. This is consistently 33–90% over V2 across all levels.
The system was intentionally built to a "V2-plus" standard. **No level-reduction needed.**

---

## Audio Cost Projection After Cleanup

Scenario: Tier 1 + Tier 2 (template sentences) + Tier 3 review done

| Metric | Value |
|--------|-------|
| Post-cleanup vocab count | ~14,374 |
| Characters per entry (word ~7 + example ~60 + def_en ~40) | ~107 chars |
| Total characters | ~1,538,000 |
| Pro plan TTS quota | 500,000 chars/month |
| Months of Pro needed | **3 months × $99 = ~$297** |
| OR Scale plan (2M chars) | ~$99–$149/month |

**Note:** Track A (readings/dialogues) audio is a separate character budget.
Combined with Track B vocab, total may push 2M+ chars. Scale plan recommended.

---

## Recommended Execution Order

1. **Now (Tier 1):** Delete 463 excess duplicate rows — 5 min, zero risk
2. **Before audio run (Tier 2):** Fix 3,389 L4 example_sentences with template text — 1 day
3. **Async (Tier 3):** Review 72 mismatch entries — 1 hour, can be done any time
4. **Decision (Tier 4):** Confirm no level-size reduction needed — likely yes
5. **Then:** Run audio generation on clean vocab
