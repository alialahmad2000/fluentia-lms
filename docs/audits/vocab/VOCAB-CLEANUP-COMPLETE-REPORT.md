# Vocab Cleanup Complete Report — Tiers 1 + 2 + 3

**Generated:** 2026-05-10
**Run ID:** vocab-cleanup-2026-05-10-y1mf7o52
**Model used:** claude-sonnet-4-6

---

## ✅ VERDICT: GO FOR PHASE 1B (VOCAB AUDIO)

All three cleanup tiers completed successfully. The vocab corpus is audio-ready.

---

## Snapshots Created

| Table | Rows |
|---|---|
| `curriculum_vocabulary_tier1_snapshot` | 453 |
| `curriculum_vocabulary_tier2_snapshot` | 3,389 |
| `curriculum_vocabulary_tier3_snapshot` | 43 |

Originals preserved. Rollback safe.

---

## Tier 1 — Duplicate Consolidation

| Metric | Value |
|---|---|
| Duplicate word+level clusters | 256 |
| Rows deleted | **453** |
| Mode | Hard delete (no `deleted_at` column) |
| Student-protected clusters kept | 9 (all rows in cluster preserved) |
| Student-protected IDs | 346 (student_saved_words + curriculum_vocabulary_srs) |

**Quality gate:** 9 remaining duplicate clusters = student-protected (all 3+ rows linked to student progress). Zero unexpected duplicates.

---

## Tier 2 — L4 Arabic Example Regeneration

| Metric | Value |
|---|---|
| Rows targeted | 3,389 |
| Successfully regenerated | **3,389** |
| Failed (exhausted 3 attempts) | 0 (8 retried manually) |
| Claude API model | claude-sonnet-4-6 |
| Concurrency | 5 parallel requests |
| Estimated Claude cost | ~$1.80 |

**All L4 vocab entries now have clean English example_sentences.**

**Validation per row:**
- Zero Arabic characters ✅
- 4–30 words ✅
- Word/inflection present in example ✅

**Sample regenerated examples:**
- "cobalt-rich crust" → "Mining companies are now targeting cobalt-rich crusts found on underwater volcanic seamounts."
- "non-refoulement" → "The court upheld the principle of non-refoulement, preventing the asylum seeker's forced deportation."
- "caloric restriction" → "Researchers found that caloric restriction significantly extended the lifespan of laboratory mice."
- "immigration enforcement agency" → "The immigration enforcement agency launched a nationwide operation to crack down on visa fraud."
- "indoctrinate" → "Extremist groups often indoctrinate vulnerable teenagers through carefully crafted social media campaigns."

---

## Tier 3 — Minor Word/Example Mismatches (L0–L5)

| Metric | Value |
|---|---|
| Rows targeted | 43 |
| Successfully regenerated | **43** (35 first pass + 8 retry) |
| Failed | 0 |
| Estimated Claude cost | ~$0.04 |

**By level:** L0: 2, L1: 5, L2: 9, L3: 17, L4: 3, L5: 7

**Notable fixes:**
- "giant" (L2): "The huge mural covers the whole side of the building" → "There was a giant elephant at the zoo that amazed all the children."
- "country" (L0): "I want to visit many countries" → "France is a beautiful country in Europe."
- "tooth" (L0): "I brush my teeth every night" → "I lost a tooth when I was young."
- "break records" (L2): "The runner broke records" → "The young swimmer broke records at the national competition."
- "contemplate" (L3): irregular inflection issue → "She sat by the window for hours to contemplate whether she should accept."

---

## Final State

| Metric | Value | Status |
|---|---|---|
| Total alive entries | **13,930** | (was 14,383 before dedup) |
| Arabic in English examples | **0** | ✅ |
| Empty/short examples | **0** | ✅ |
| Remaining duplicates | **9** | ✅ (all student-protected) |
| Total regenerated rows | **3,433** | (Tier 2 + Tier 3) |
| Rows with `original_example_sentence` | 3,433 | (rollback available) |

---

## Audio Readiness

| Content | Entries | Est. chars | ElevenLabs cost (~$0.018/1k) |
|---|---|---|---|
| Vocabulary words | 13,930 | ~110,000 | $1.98 |
| Vocabulary examples | 13,930 | ~1,049,000 | $18.88 |
| **Total vocab audio** | **13,930** | **~1,159,000** | **~$20.87** |

Compatible with ElevenLabs Scale plan (2M monthly characters).

---

## 10 Random Regenerated Examples (Quality Check)

| Word | New Example |
|---|---|
| cobalt-rich crust | Mining companies are now targeting cobalt-rich crusts found on underwater volcanic seamounts. |
| immigration enforcement agency | The immigration enforcement agency launched a nationwide operation to crack down on visa fraud. |
| caloric restriction | Researchers found that caloric restriction significantly extended the lifespan of laboratory mice. |
| strangulation | The forensic pathologist confirmed that strangulation was the cause of death after examining the victim's neck. |
| indoctrinate | Extremist groups often indoctrinate vulnerable teenagers through carefully crafted social media campaigns. |
| non-refoulement | The court upheld the principle of non-refoulement, preventing the asylum seeker's forced deportation. |
| bone graft | After the severe accident, the surgeon performed a bone graft to restore her damaged jaw. |
| bill | After running the air conditioning all summer, their electricity bill was shockingly high. |
| reception center | Volunteers at the reception center helped refugees register and find temporary shelter. |
| finance | Blockchain technology is fundamentally transforming the way we approach global finance today. |

All 10 samples: ✅ English only, ✅ contains target word, ✅ contextually rich.

---

## VERDICT FOR PHASE 1B (VOCAB AUDIO): **GO** ✅
