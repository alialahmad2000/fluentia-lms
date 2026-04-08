# PROMPT 11 — Phase 2.0a Investigation Report
**Generated:** 2026-04-08
**Scope:** Read-only investigation of vocabulary duplicates across all 6 levels

---

## Schema confirmation

- **curriculum_vocabulary columns verified:** id (uuid PK), reading_id (uuid FK → curriculum_readings), word (text NOT NULL), definition_en (text NOT NULL), definition_ar (text), example_sentence (text), part_of_speech (text), pronunciation_ipa (text), audio_url (text), image_url (text), difficulty_tier (text), sort_order (int), created_at (timestamptz), audio_generated_at (timestamptz)
- **Link path:** vocabulary.reading_id → readings.id → readings.unit_id → units.id → units.level_id → levels.id ✓
- **Existing constraints:** PK only + FK to readings + idx_vocab_reading (btree on reading_id). **NO uniqueness constraint on (reading_id, word)** — duplicates are permitted by the schema.
- **Indexes:** curriculum_vocabulary_pkey (id), idx_vocab_reading (reading_id)

---

## Per-level vocabulary counts

| Level | Name | Total | Unique | Within-level Dupes |
|-------|------|-------|--------|--------------------|
| L0 | Foundation (Pre-A1) | 194 | 169 | 25 |
| L1 | Basics (A1) | 241 | 177 | 64 |
| L2 | Development (A2) | 293 | 255 | 38 |
| L3 | Fluency (B1) | 340 | 280 | 60 |
| L4 | Mastery (B2) | 628 | 274 | 354 |
| L5 | Proficiency (C1) | 694 | 334 | 360 |
| **TOTAL** | | **2,390** | **1,281** | **1,109** |

**L4 and L5 combined = 714 within-level duplicates** (64% of all duplicates concentrated in 2 levels). This is anomalous.

---

## Anomaly root cause (L4/L5)

### Finding

The script `scripts/generate-vocab-l4-l5.cjs` was executed **approximately 2-3 times** without any deduplication check, causing each reading's vocabulary to be generated and inserted multiple times by Claude API. Since Claude produced **different Arabic definitions and example sentences** on each run (for the same English word), the duplicates are not identical copies but rather multiple AI-generated variants of the same word.

### Evidence

1. **The script:** `scripts/generate-vocab-l4-l5.cjs` (committed 2026-03-19, hash `82c820c`)
   - Iterates over all L4/L5 readings
   - Calls Claude API to extract 10 vocabulary words per reading
   - Inserts directly with `sb.from('curriculum_vocabulary').insert(rows)` — **no dedup check**
   - No `ON CONFLICT` clause
   - No pre-insert SELECT to check if words already exist

2. **Duplication pattern:**
   - L4: 192 words appear exactly 2x, 8 words 3x, 10 words 4x → script ran ~2-3 times
   - L5: 199 words appear exactly 2x, 11 words 3x, 5 words 4x → same pattern
   - Words per reading: 24-33 instead of expected 10 (confirms ~2.5-3.3x the intended count)

3. **Content analysis (395 of 428 within-reading duplicates):**
   - Same word + same POS + **DIFFERENT Arabic definitions** = 395 (92%)
   - Same word + same def + different example = 31 (7%)
   - Identical copies = only 2 (0.5%)
   - This proves Claude generated **new content each run**, not that the DB duplicated rows

4. **The bug in the script (line 162):**
   ```javascript
   const { error } = await sb.from('curriculum_vocabulary').insert(rows);
   ```
   Should have been:
   ```javascript
   const { error } = await sb.from('curriculum_vocabulary').upsert(rows, {
     onConflict: 'reading_id,word',
     ignoreDuplicates: true
   });
   ```
   Or at minimum, should have done a SELECT check before INSERT.

### Lesson for Phase 2.2

- **Add RULE 15** to the Anti-Mistake Playbook: every generation script must be idempotent (safe to re-run)
- **Add a UNIQUE index** on `(reading_id, LOWER(word))` to prevent at the DB level
- **Pre-check before insert** in all future scripts

---

## Deletion plan summary

| Bucket | Count | Description |
|--------|-------|-------------|
| **A — Safe to delete** | 38 | Same word + same POS + same Arabic definition within same unit |
| **B — Needs review** | 476 | Same word + same POS + DIFFERENT Arabic definitions within same unit |
| **C — Legitimate** | 10 | Same word but different POS (e.g., noun vs verb) |
| **TOTAL classified** | **524** | Within-unit duplicates across all levels |

### Why Bucket B is so large

Because the script ran multiple times and Claude produced different Arabic translations each time, 92% of the duplicates have **different definitions for the same word**. Ali must review which definition is best before deletion. However, a pragmatic approach is possible:

**Recommended shortcut for Bucket B:** For each word, keep the entry with the longest/most detailed Arabic definition. This can be automated in PROMPT 12 with human spot-check on a random sample of 50.

### By level

| Level | Bucket A | Bucket B | Bucket C |
|-------|----------|----------|----------|
| L0 | 1 | 12 | 1 |
| L1 | 3 | 12 | 2 |
| L2 | 2 | 8 | 3 |
| L3 | 0 | 6 | 0 |
| L4 | 21 | 217 | 3 |
| L5 | 11 | 221 | 1 |

---

## Student work impact

- **Total vocabulary_word_mastery records:** 158
- **Unique vocab IDs with mastery:** 78
- **Students affected:** 6
- **Mastery distribution:** L1 = 63 records (21 vocab IDs), L3 = 95 records (57 vocab IDs)
- **L4/L5 mastery records: ZERO** — the bulk cleanup is entirely safe

### Overlap with deletion plan

- **Bucket A ∩ Mastery: 0** — no mastery records affected by safe deletes
- **Bucket B ∩ Mastery: 2 vocab IDs** — if Ali approves deletion, mastery records must be migrated to the kept duplicate first
- **Impact:** Minimal. Only 2 of 476 Bucket B entries have student work attached.

---

## Files generated

| File | Rows | Description |
|------|------|-------------|
| `bucket-A-safe-to-delete.csv` | 38 | Pure duplicates — auto-approve deletion |
| `bucket-B-needs-review.csv` | 476 | Same word, different definitions — Ali decides |
| `bucket-C-legitimate.csv` | 10 | Different POS — keep, no action |
| `student-work-migration-plan.csv` | 2 | Bucket B entries with mastery records |
| `anti-mistake-playbook.md` | — | Canonical 15-rule reference for Phase 2.2+ |

---

## Verification

- Total vocab entries before: **2,390**
- After Bucket A cleanup: 2,390 - 38 = **2,352**
- After Bucket A + B cleanup: 2,390 - 38 - 476 = **1,876**
- After A + B cleanup, unique words: **~1,281** (unchanged — we're removing duplicates, not unique words)
- Unit count: still **72** ✓
- No data modified: ✓
- No commits made: ✓

---

## Next step

Ali to review:

1. **Read the root cause finding** (Section "Anomaly root cause") — understand why L4/L5 have ~2.7x the intended vocabulary
2. **Decide on Bucket B strategy:**
   - **Option 1 (recommended):** Auto-keep the entry with the best Arabic definition (longest + most detailed). Spot-check 50 random samples. Delete rest.
   - **Option 2:** Manually review all 476 entries in `bucket-B-needs-review.csv`
   - **Option 3:** Keep all variants and only delete Bucket A (38 entries) — minimal cleanup
3. **Confirm student work plan** — 2 mastery records need migration before Bucket B deletion
4. **Approve PROMPT 12** (cleanup execution) with chosen strategy
