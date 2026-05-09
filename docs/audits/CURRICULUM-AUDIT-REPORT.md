# Curriculum Integrity Audit — Phase 0 Report

**Generated:** 2026-05-09T21:54:39.255Z
**Against commit:** `b93f88229886d9c52c8b04e3842ed6c62ddc1ec2`
**Scope:** Curriculum content (L0-L5). IELTS excluded by request.
**Mode:** READ-ONLY. Zero content modified.

---

## 🚦 OVERALL VERDICT

**Recommendation:** **GO-WITH-FIXES**

**Rationale:** Reading passages (144) and listening transcripts (72) are structurally clean — zero empty content, zero template placeholders, zero encoding issues, word counts broadly match level targets. Audio generation for **readings and listening can start immediately**. The **3,389 vocabulary entries with Arabic in `example_sentence`** and the **3,461 stemming-test failures** (many false positives from irregular inflection — country/countries, tooth/teeth, break/broke) are the primary blockers for *vocabulary example audio only*, not for reading or listening. Vocabulary audio generation should wait until the Arabic example issue is diagnosed and the stemming issues are spot-checked.

**Estimated fix effort:** **M** (vocab examples — likely a DB-level batch fix; reading/listening ready now)

**Blockers for vocabulary audio generation (must-fix-first):**
1. **3,389 vocabulary entries contain Arabic in `example_sentence`** — ElevenLabs English voice will mispronounce Arabic text. Most likely cause: L4/L5 technical vocabulary was imported with Arabic example sentences embedded. Query needed: `SELECT word, example_sentence FROM curriculum_vocabulary WHERE example_sentence ~ '[\\u0600-\\u06FF]' LIMIT 10` to confirm.
2. **3,461 stemming failures in example sentences** — ~796 overlap with #1 above (Arabic examples will never contain English words). The remaining ~2,665 include genuine failures (word "giant" → example uses "huge") plus false positives from irregular inflection (country→countries, tooth→teeth, break→broke). Manual spot-check of ~50 random samples needed before deciding which to fix.
3. **Total vocab count is 14,383 vs expected ~2,183** — corpus is 6.6× larger than the original spec. Confirm this is intentional expansion before committing audio generation budget (~$30 for examples alone).

**Readings + listening are ready NOW (no blockers).**

**Non-blocking issues (can be fixed in parallel or accepted):**
1. 30 readings outside ±20% word-count target (within 2× — content quality OK, just longer/shorter than spec)
2. 256 duplicate vocabulary words per level (would waste audio credits for duplicates)
3. 64 vocab examples too short (<4 words)
4. 9 dialogue speaker names unresolved for gender (needed for Phase 0.5 voice assignment)
5. 1 irregular verb example sentence issue

---

## 📊 SUMMARY TABLE

| Phase | CRITICAL | WARNING | INFO | Status |
|---|---|---|---|---|
| B. Completeness | 0 | 0 | 0 | ✅ |
| C. Language Sanity | 3389 | 0 | 0 | ⚠️ |
| D. Length Match | 0 | 30 | 0 | ⚠️ |
| E. Q/Passage Alignment | 0 | 0 | 0 | ✅ |
| F. Dialogues | — | 0 | — | ℹ️ |
| G. Vocab Sanity | 3461 | 320 | 1 | ⚠️ |
| H. Irregular Verbs | 0 | 1 | 0 | ✅ |

**Total content scope:**
- Reading passages: **144** (target 144) ✅
- Listening transcripts: **72** (target 72) ✅
- Vocabulary entries: **14,383** (spec target ~2,183 — 6.6× larger)
- Irregular verbs: **85**
- **Estimated total chars (clean content):** 1,496,753
- **Estimated chars in flagged content:** 224,829

---

## 🔴 CRITICAL ISSUES (must fix before audio)

### B.2 — Empty Content

✅ No empty content found in readings, listening, or vocabulary.

### C.1 — Arabic Characters in English Fields

- **Readings/Listening affected:** 0 (BLOCKING for those specific items)
- **Vocabulary affected:** 3,389 entries have Arabic in `example_sentence` or `word`

✅ **Zero Arabic in reading passages or listening transcripts.** (Audio generation for readings/listening can proceed.)


**Vocabulary Arabic examples — sample:**

| Level | Word | Issue |
|---|---|---|
| L4 |  | Arabic in example (L4, word: "3D artifact scanning") |
| L4 |  | Arabic in example (L4, word: "abnormality") |
| L4 |  | Arabic in example (L4, word: "abrasion") |
| L4 |  | Arabic in example (L4, word: "abrasive") |
| L4 |  | Arabic in example (L4, word: "absorbent") |
| L4 |  | Arabic in example (L4, word: "absorption chiller") |
| L4 |  | Arabic in example (L4, word: "abyss") |
| L4 |  | Arabic in example (L4, word: "abyssal") |
| L4 |  | Arabic in example (L4, word: "accelerate") |
| L4 |  | Arabic in example (L4, word: "accelerated procedure") |
| L4 |  | Arabic in example (L4, word: "acceleration") |
| L4 |  | Arabic in example (L4, word: "accomplice") |
| L4 |  | Arabic in example (L4, word: "account abstraction wallet") |
| L4 |  | Arabic in example (L4, word: "accreditation") |
| L4 |  | Arabic in example (L4, word: "accretion") |

_(+3374 more — see raw-flags.json)_

### G.1 — Vocab Examples Not Containing Target Word

3,461 vocabulary entries have an `example_sentence` that doesn't contain the target word (by crude stemming check).

**Note:** ~796 of these likely overlap with the Arabic-in-example issue above (Arabic examples won't contain English words by definition). After fixing Arabic examples, true G.1 failures may be ~2,665.

**Sample:**

| Level | Word | Example (truncated) |
|---|---|---|
| L0 | country | Example "i want to visit many countries...." doesn't contain word "country" (L0) |
| L0 | tooth | Example "i brush my teeth every night...." doesn't contain word "tooth" (L0) |
| L1 | bury | Example "they buried the treasure...." doesn't contain word "bury" (L1) |
| L1 | fry | Example "she fried the chicken...." doesn't contain word "fry" (L1) |
| L1 | lose | Example "they lost the game...." doesn't contain word "lose" (L1) |
| L1 | overcome | Example "she overcame many challenges...." doesn't contain word "overcome" (L1) |
| L1 | throw | Example "she threw the ball far...." doesn't contain word "throw" (L1) |
| L2 | boundary | Example "set clear boundaries for your phone use...." doesn't contain word "boundary" (L2) |
| L2 | break records | Example "the runner broke records in the race yesterday...." doesn't contain word "break r |
| L2 | broaden my horizons | Example "reading books from different cultures helps broaden your hor..." doesn't contain  |
| L2 | cast a role | Example "the director cast her in the lead role...." doesn't contain word "cast a role" (L |
| L2 | cutting down on | Example "the doctor told me to cut down on sugar and salt...." doesn't contain word "cutti |
| L2 | date back | Example "this old church dates back to the 15th century...." doesn't contain word "date ba |
| L2 | expressing their identity | Example "many teenagers express their identity through the music they..." doesn't contain  |
| L2 | giant | Example "the huge mural covers the whole side of the building...." doesn't contain word "g |

_(+3446 more — see raw-flags.json)_

---

## 🟡 WARNINGS (should fix or accept)

### D — Word Count Outside ±20% Target

30 reading passages or listening transcripts are outside the ±20% word count variance for their level (but within 2× — not critical).

| Phase | ID | Issue |
|---|---|---|
| D | `3bb6f744…` | Word count 209 outside ±20% [64-180] for L0 U1 A (target 80-150) |
| D | `fea17f39…` | Word count 212 outside ±20% [64-180] for L0 U1 B (target 80-150) |
| D | `800500c4…` | Word count 192 outside ±20% [64-180] for L0 U2 A (target 80-150) |
| D | `ddb73f42…` | Word count 198 outside ±20% [64-180] for L0 U2 B (target 80-150) |
| D | `0587adb9…` | Word count 227 outside ±20% [64-180] for L0 U3 A (target 80-150) |
| D | `65cfb7be…` | Word count 216 outside ±20% [64-180] for L0 U3 B (target 80-150) |
| D | `2e187013…` | Word count 220 outside ±20% [64-180] for L0 U4 A (target 80-150) |
| D | `74bd1592…` | Word count 183 outside ±20% [64-180] for L0 U4 B (target 80-150) |
| D | `1f0e71fe…` | Word count 215 outside ±20% [64-180] for L0 U5 A (target 80-150) |
| D | `909216a9…` | Word count 218 outside ±20% [64-180] for L0 U5 B (target 80-150) |
| D | `13869905…` | Word count 199 outside ±20% [64-180] for L0 U6 A (target 80-150) |
| D | `97e8ad3c…` | Word count 193 outside ±20% [64-180] for L0 U6 B (target 80-150) |
| D | `a9445639…` | Word count 209 outside ±20% [64-180] for L0 U7 A (target 80-150) |
| D | `02b53dec…` | Word count 224 outside ±20% [64-180] for L0 U7 B (target 80-150) |
| D | `3fd7003c…` | Word count 227 outside ±20% [64-180] for L0 U8 A (target 80-150) |
| D | `121fd543…` | Word count 218 outside ±20% [64-180] for L0 U8 B (target 80-150) |
| D | `7bfd2f5b…` | Word count 201 outside ±20% [64-180] for L0 U9 A (target 80-150) |
| D | `44bba98f…` | Word count 220 outside ±20% [64-180] for L0 U9 B (target 80-150) |
| D | `39044e40…` | Word count 216 outside ±20% [64-180] for L0 U10 A (target 80-150) |
| D | `2135eace…` | Word count 222 outside ±20% [64-180] for L0 U10 B (target 80-150) |
_(+10 more)_

### G.2 — Short Vocabulary Examples

64 examples are fewer than 4 words or 20 characters.

### G.3 — Duplicate Words Per Level

256 duplicate words detected within the same level. Generating audio for duplicates would waste credits.

**Sample duplicates:**
| Level | Word | Count |
|---|---|---|
| L0 | advanced | 2× |
| L0 | apps | 3× |
| L0 | buy | 2× |
| L0 | coffee | 2× |
| L0 | delicious | 2× |
| L0 | earn | 2× |
| L0 | enjoy | 2× |
| L0 | exercise | 3× |
| L0 | family | 3× |
| L0 | food | 3× |
| L0 | hot | 2× |
| L0 | morning | 2× |
| L0 | sell | 2× |
| L0 | share | 2× |
| L0 | sleep | 2× |
_(+241 more)_

### C.4 — Possible Truncation

0 passages/transcripts end without terminal punctuation.

### H — Irregular Verb Example

1 irregular verb example sentences don't clearly contain the target verb forms.

---

## ℹ️ INFO

### G.4 — Words with Special Characters

1 vocabulary words contain `/`, `,`, `(`, or similar. These may be "word/synonym" compound entries needing special handling in the audio pipeline.

---

## 🎭 DIALOGUE INVENTORY (For Phase 0.5)

### Statistics

| Metric | Value |
|---|---|
| Total items with dialogue | **59** |
| — In curriculum_readings | 0 |
| — In curriculum_listening | 59 |
| Total unique speakers | **15** |
| Speakers with confirmed gender | 6 (Fatima ♀, Layla ♀, Nora ♀, Sarah ♀, Emma ♀, Ahmed ♂) |
| **Speakers needing manual confirmation** | **9** ⬅ Ali to confirm |

### Speakers Needing Manual Confirmation

> **Action for Ali:** Please reply with gender (M/F) for each name below before Phase 0.5 runs.

| Name | Occurrences | Sample line |
|---|---|---|
| **Noor** | 36 | Noor: Hi! My name is Noor. I want to tell you about my day. I wake up at seven o |
| **Narrator** | 2 | Narrator: Hello! Let me tell you about animals around us. There are many animals |
| **Nadia** | 1 | Nadia: Hi everyone! My name is Nadia and I want to tell you about my favorite fe |
| **Maha** | 7 | Maha: Layla, I love your new outfit! Where did you get that beautiful scarf?  La |
| **Mona** | 6 |   Mona: Oh, that sounds great! I was actually planning to stay home and watch Ne |
| **Interviewer** | 48 | Interviewer: Welcome to Tech Today. I'm here with Dr. Sarah Chen, who's been res |
| **Host** | 113 | Host: Welcome to Science Today. I'm here with Dr. Sarah Chen, who's been studyin |
| **Maya** | 8 | Maya: Good morning, Dr. Hassan. Thank you for joining us today to discuss global |
| **Professor Ahmed** | 5 |   Professor Ahmed: Certainly. While I acknowledge Dr. Chen's points about capaci |

### All Detected Speakers (Confirmed Gender)

| Name | Gender | Source | Occurrences |
|---|---|---|---|
| Fatima | female | dictionary | high |
| Layla | female | dictionary | high |
| Nora | female | dictionary | high |
| Sarah | female | dictionary | high |
| Emma | female | dictionary | moderate |
| Ahmed | male | dictionary | moderate |

### audio_type Mismatches in curriculum_listening

✅ No audio_type mismatches detected.

---

## 💰 COST IMPACT PROJECTION

| Scenario | Estimated chars | ElevenLabs cost (~$0.018/1k chars) |
|---|---|---|
| Readings only (clean) | 433,829 | $7.81 |
| Listening only (clean) | 206,892 | $3.72 |
| Vocab examples (all, incl. flagged) | 873,994 | $15.73 |
| Irregular verbs (all forms) | 3,846 | $0.07 |
| **Total (estimated)** | **1,721,582** | **$30.99** |
| Chars in flagged items | 224,829 | $4.05 wasted if generated now |

**If readings + listening audio is generated today:** $11.53 — SAFE TO PROCEED.

---

## 🎯 RECOMMENDED NEXT STEPS

### Immediate (before vocab audio generation):

1. **Investigate Arabic in vocab examples** — Run: `SELECT id, word, example_sentence FROM curriculum_vocabulary WHERE example_sentence ~ '[\u0600-\u06FF]' LIMIT 20;` to see what the actual Arabic content looks like. Determine if it's: (a) Arabic translation appended to English example, (b) intentionally Arabic example sentence, or (c) data entry error.

2. **Deduplicate vocabulary** — 256 duplicate words waste audio credits. Decide which duplicate to keep per level.

3. **Confirm speaker genders** — Ali to reply M/F for the 9 names listed in the dialogue section above.

### Proceed now (no fixes needed):

4. **Reading passage audio** — 144 passages are clean. Proceed to Phase 1 for readings.
5. **Listening transcript audio** — 72 transcripts are clean. Proceed to Phase 1 for listening.
6. **Irregular verb audio** — 85 verbs, minimal issues. Proceed after fixing the 1 example.

### After vocab fixes:

7. Run Phase 0.5 (dialogue pre-processor) using `docs/audits/dialogue-inventory.json`.
8. Then Phase 1 (full audio generation).

---

## 📂 ARTIFACTS PRODUCED

- `docs/audits/CURRICULUM-AUDIT-REPORT.md` (this file)
- `docs/audits/audit-schema-discovery.md`
- `docs/audits/dialogue-inventory.json`
- `docs/audits/raw-flags.json` (7203 flagged rows, machine-readable)
- `scripts/audits/phase-a-schema.cjs`
- `scripts/audits/run-all.cjs`
- `scripts/audits/generate-report.cjs`
