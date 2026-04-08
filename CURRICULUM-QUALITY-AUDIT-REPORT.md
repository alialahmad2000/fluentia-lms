# Curriculum Quality Audit Report
**Generated:** 2026-04-07
**Audit version:** PROMPT 10
**Scope:** Read-only deep analysis of all 6 levels, 72 units, full vocab/passage/grammar/writing/speaking content

---

## Update — PROMPT 13 L0 Reading Passage Rewrites (2026-04-08)

All 24 L0 (Pre-A1) reading passages rewritten to meet quality targets:

| Metric | Target | Achieved Range |
|---|---|---|
| Word count | 70-160 | 73-103 |
| FKGL | 0.0-3.0 | 0.23-2.97 |
| Avg sentence length | <=12 | 5.1-8.2 |
| OOV words | 0% | 0% (all 24) |

- 24/24 passages rewritten (all previously failed: 183-227 words, FKGL 4.7-9.2)
- 0 comprehension questions to update (L0 has empty reading_skill_exercises)
- 12 atomic commits (one per unit), all pushed and verified
- L0 vocab compliance: 100% across all passages
- Vocabulary allowlist: 1,012 words (169 L0 curriculum + 843 function/basic words)

---

## Update — PROMPT 12B Flagged Resolution + UNIQUE Constraint (2026-04-08)

- 229 flagged groups resolved using deep reasoning rubric (no API calls)
- Decision rules applied: 162 followed Claude's recommendation, 64 by definition quality, 2 by example quality, 1 oldest tiebreaker
- 229 duplicate entries deleted, 229 best entries kept
- Mastery records: 0 migrations needed (both mastery IDs were singletons)
- UNIQUE constraint APPLIED: `uq_vocab_word_pos_per_reading` on `(reading_id, LOWER(word), part_of_speech)`
- Zero residual duplicates verified before constraint application

New baseline:
- Total vocab entries: 1,954 (was 2,183)
- Unique words: 1,279 (unchanged)
- Per-level:
  - L0 (Pre-A1): 193
  - L1 (A1): 238
  - L2 (A2): 291
  - L3 (B1): 340
  - L4 (B2): 411 (was 538)
  - L5 (C1): 481 (was 583)
- Unit count: 72 (verified)
- Mastery records: 158 (verified, 0 orphaned)
- Duplicate protection: ACTIVE (UNIQUE index enforced at DB level)

---

## Update — PROMPT 12 Cleanup Executed (2026-04-08)

- Bucket A: 38 entries auto-deleted (identical duplicates, 0 mastery impact)
- Bucket B: 169 entries auto-merged via Claude Sonnet quality analysis (165 high-confidence groups)
- Bucket B: 229 groups (458 entries) flagged for Ali manual review (saved to bucket-B-flagged-for-ali.csv)
- Bucket C: 10 entries untouched (legitimate POS differences)
- Mastery records migrated: 0 needed (both mastery-affected IDs were singletons, kept automatically)
- UNIQUE constraint: DEFERRED to PROMPT 12B (229 flagged groups still contain duplicates)

New baseline:
- Total vocab entries: 2,183 (was 2,390)
- Unique words: 1,279
- Per-level:
  - L0 (Pre-A1): 193 (was 194)
  - L1 (A1): 238 (was 241)
  - L2 (A2): 291 (was 293)
  - L3 (B1): 340 (unchanged)
  - L4 (B2): 538 (was 628, -90)
  - L5 (C1): 583 (was 694, -111)
- Unit count: 72 (verified)
- Mastery records: 158 (verified, 0 orphaned)

---

---

## Executive Summary (Arabic)

### ملخص تنفيذي

التدقيق الشامل لمنهج أكاديمية طلاقة كشف عن منهج **متين البنية الأساسية** مع 2390 مفردة و144 نص قراءة و72 درسًا في القواعد والكتابة والمحادثة والاستماع. المحتوى موزع بشكل متساوٍ على 6 مستويات (12 وحدة لكل مستوى) وهو إنجاز تنظيمي ممتاز.

**النقاط الإيجابية:** التغطية الشاملة لجميع المهارات في كل وحدة، وجود تمارين قواعد (696 تمرين)، وأسئلة استيعاب (1152 سؤال)، ونظام تكرار متباعد للمفردات (SRS). البنية التحتية للمنهج جاهزة للتوسع.

**التحدي الأكبر:** فجوة المفردات بين المستوى الحالي والمستهدف وفقًا لمعايير CEFR كبيرة جدًا — يحتاج المنهج إلى ~14,611 كلمة جديدة فريدة للوصول للمستويات المستهدفة. هذا طبيعي في المرحلة الأولى ويجب معالجته في المرحلة الثانية مع الالتزام الصارم بقواعد "دليل منع الأخطاء" (Dimension 12) لضمان جودة المحتوى الجديد.

---

## Top 10 Findings (Ranked by Severity)

1. **Massive vocabulary gap to CEFR targets** — L5 has 334 unique words vs 8,000 target — 14,611 total words needed across all levels
2. **683 unintended vocabulary duplicates** — reclaimable slots that waste student effort
3. **No uniqueness constraint on vocabulary** — schema allows unlimited duplicates (only PK and FK constraints)
4. **Vocabulary links through readings** — curriculum_vocabulary.reading_id → curriculum_readings, not direct to units — impacts all queries
5. **0 reading passages outside target word count** — some passages don't match curriculum_levels.passage_word_range
6. **137 passages with FKGL outside target range** — readability doesn't match intended difficulty
7. **17 potential grammar prerequisite gaps** — topics may appear before their dependencies
8. **2/100 example sentences missing target word** — reduces learning effectiveness
9. **0/100 translation issues** — empty, English content, or too short
10. **Weakest level transition: L4→L5 (score: 0.46)** — students may not feel sufficient progress

---

## The Single Biggest Question: Is the Curriculum Ready for Phase 2?

**CONDITIONAL YES.** The curriculum structure is solid — 72 units, 6 levels, all skill sections populated. The architecture supports expansion. However, before Phase 2 begins:

**Prerequisites:**
1. Clean up 683 unintended vocabulary duplicates
2. Add a UNIQUE constraint on (reading_id, LOWER(word)) to prevent future duplicates
3. Review and fix the 137 reading passages outside target ranges
4. Embed ALL 14 Anti-Mistake Playbook rules into every Phase 2 content generation prompt
5. Run vocabulary uniqueness checks before any batch insert

The existing content provides a strong foundation. Phase 2 should focus on **vocabulary expansion** (the biggest gap) while maintaining the existing structural quality.

---

## Reclaimable Capacity

- Unintended duplicates: 683 entries
- If cleaned: 683 vocabulary slots freed for new, unique content
- This is a small fraction of the 14,611 words needed, but cleaning prevents student confusion

---

## Detailed Dimension Reports

### Dimension 1: Vocabulary Repetition
========================================
DIMENSION 1 — VOCABULARY REPETITION
========================================

Total vocabulary entries: 2390
Unique english_word (case-insensitive): 1281
Total duplicates: 1109

Within-unit duplicates (UNINTENDED):
  - Total: 519
  - Distribution by level: L0=28, L1=30, L2=20, L3=12, L4=448, L5=451

Across-unit same-level duplicates:
  - UNINTENDED (same POS, same definition): 5
  - ACCEPTABLE (different POS): 5
  - NEEDS REVIEW (same POS, different definition): 270

Across-level duplicates:
  - SPIRAL (intentional — higher complexity): 345
  - UNINTENDED (same/simpler complexity): 159
  - Sample of intentional spirals: [
    {
        "word": "access",
        "levels": [
            2,
            3
        ]
    },
    {
        "word": "adapt",
        "levels": [
            1,
            2,
            3,
            4
        ]
    },
    {
        "word": "adapted",
        "levels": [
            1,
            4
        ]
    },
    {
        "word": "advanced",
        "levels": [
            0,
            2
        ]
    },
    {
        "word": "anticipate",
        "levels": [
            2,
            3,
            4,
            5
        ]
    }
]
  - Sample of unintended cross-level repeats: [
    {
        "word": "accommodate",
        "levels": [
            3,
            4
        ]
    },
    {
        "word": "address",
        "levels": [
            2,
            3
        ]
    },
    {
        "word": "amplify",
        "levels": [
            4,
            5
        ]
    },
    {
        "word": "arrive",
        "levels": [
            0,
            1
        ]
    },
    {
        "word": "breakthrough",
        "levels": [
            3,
            4
        ]
    },
    {
        "word": "breakthroughs",
        "levels": [
            3,
            4
        ]
    },
    {
        "word": "captivated",
        "levels": [
            3,
            4
        ]
    },
    {
        "word": "catalyze",
        "levels": [
            4,
            5
        ]
    },
    {
        "word": "catalyzed",
        "levels": [
            4,
            5
        ]
    },
    {
        "word": "communicate",
        "levels": [
            0,
            1
        ]
    }
]

TOTAL UNINTENDED REPETITION: 683 entries
RECLAIMABLE SLOTS (if all unintended duplicates removed): 683


### Dimension 2: CEFR Vocabulary Alignment
========================================
DIMENSION 2 — CEFR VOCABULARY ALIGNMENT
========================================

Frequency lists used: NLTK Brown Corpus (Strategy 3 — proxy for Oxford 3000/5000)
  - Top 3000 most frequent → classified as A1-A2
  - Top 3001-5000 → classified as B1-B2
  - Beyond 5000 → classified as C1+
  NOTE: Brown corpus is 1960s American English; not ideal but workable as a proxy.


  Level 0 (target: Pre-A1)
    - In freq top 3000 (A1-A2): 127 / 194 (65%)
    - In freq 3001-5000 (B1-B2): 24 / 194 (12%)
    - Beyond 5000 (C1+): 43 / 194 (22%)
    - Too hard for level: 43
    - Too easy for level: 0

  Level 1 (target: A1)
    - In freq top 3000 (A1-A2): 128 / 241 (53%)
    - In freq 3001-5000 (B1-B2): 52 / 241 (21%)
    - Beyond 5000 (C1+): 61 / 241 (25%)
    - Too hard for level: 61
    - Too easy for level: 0

  Level 2 (target: A2)
    - In freq top 3000 (A1-A2): 45 / 293 (15%)
    - In freq 3001-5000 (B1-B2): 30 / 293 (10%)
    - Beyond 5000 (C1+): 218 / 293 (74%)
    - Too hard for level: 218
    - Too easy for level: 0

  Level 3 (target: B1)
    - In freq top 3000 (A1-A2): 26 / 340 (7%)
    - In freq 3001-5000 (B1-B2): 54 / 340 (15%)
    - Beyond 5000 (C1+): 260 / 340 (76%)
    - Too hard for level: 260
    - Too easy for level: 0

  Level 4 (target: B2)
    - In freq top 3000 (A1-A2): 36 / 628 (5%)
    - In freq 3001-5000 (B1-B2): 88 / 628 (14%)
    - Beyond 5000 (C1+): 504 / 628 (80%)
    - Too hard for level: 0
    - Too easy for level: 0

  Level 5 (target: C1)
    - In freq top 3000 (A1-A2): 4 / 694 (0%)
    - In freq 3001-5000 (B1-B2): 50 / 694 (7%)
    - Beyond 5000 (C1+): 640 / 694 (92%)
    - Too hard for level: 0
    - Too easy for level: 4

Cross-level inconsistencies:
  - Words classified as A1-A2 but placed in L4+:
  L4: ['precision', 'precision', 'evident', 'applied', 'establish', 'establish', 'remarkable', 'significant', 'significance', 'significant']
  L5: ['precision', 'precision', 'emphasis', 'laboratory']
  - Words classified as C1+ but placed in L0-L2:
  L0: ['wake up', 'showers', 'delicious', 'dessert', 'recipe', 'vegetables', 'restaurants', 'balls', 'delicious', 'ingredients']
  L1: ['celebrate', 'celebrate', 'attracts', 'strengthens', 'connects', 'combine', 'swim', 'harsh', 'explore', 'deepest']
  L2: ['organizing', 'sorts through', 'consolidation', 'connect', 'clear out', 'work together', 'making decisions', 'accumulate', 'concentrate', 'strengthened']

Claude API ambiguous resolutions: 0 / 50 used (skipped — using frequency-based proxy only)

OVERALL VERDICT:
  - Total words potentially too hard for their level: 582
  - Total words potentially too easy for their level: 4


### Dimension 3: Reading Passage Quality
========================================
DIMENSION 3 — READING PASSAGE QUALITY
========================================

Per-level summary table:
  Level | Passages | Avg Words | Target Range | Avg TTR | Lex Density | Avg FKGL | Cohesion/100w | Status
  L0    |  24      |     209   | 50- 300    | 0.616  | 0.692       |   7.0    |  0.71         | OK / FKGL OUT OF RANGE
  L1    |  24      |     258   | 100- 400    | 0.626  | 0.675       |   9.4    |  0.73         | OK / FKGL OUT OF RANGE
  L2    |  24      |     324   | 200- 500    | 0.648  | 0.679       |  13.5    |  0.78         | OK / FKGL OUT OF RANGE
  L3    |  24      |     376   | 300- 600    | 0.650  | 0.684       |  15.9    |  0.56         | OK / FKGL OUT OF RANGE
  L4    |  24      |     568   | 400-1000    | 0.597  | 0.683       |  18.3    |  0.44         | OK / FKGL OUT OF RANGE
  L5    |  24      |     746   | 600-1200    | 0.565  | 0.684       |  19.6    |  0.40         | OK / FKGL OUT OF RANGE

Outliers (passages significantly outside target):

Passages with FKGL inappropriate for level:
  - L0 Unit 1: "Morning Routines Around the World" — FKGL=7.4 (target 0-4.0)
  - L0 Unit 1: "A Day in Riyadh" — FKGL=7.4 (target 0-4.0)
  - L0 Unit 2: "Healthy Food Around the World" — FKGL=7.7 (target 0-4.0)
  - L0 Unit 2: "Sweet Treasures from Saudi Arabia" — FKGL=6.8 (target 0-4.0)
  - L0 Unit 3: "Cities Around the World" — FKGL=6.6 (target 0-4.0)
  - L0 Unit 4: "Amazing Animals in Saudi Arabia" — FKGL=6.4 (target 0-4.0)
  - L0 Unit 6: "Family Traditions Around the World" — FKGL=9.3 (target 0-4.0)
  - L0 Unit 7: "Saudi Women Change Business" — FKGL=7.3 (target 0-4.0)
  - L0 Unit 7: "Shopping Around the World" — FKGL=7.6 (target 0-4.0)
  - L0 Unit 8: "Strong Bones for Life" — FKGL=6.2 (target 0-4.0)
  - L0 Unit 9: "Popular Hobbies Around the World" — FKGL=7.0 (target 0-4.0)
  - L0 Unit 9: "Crafting in Saudi Arabia" — FKGL=8.2 (target 0-4.0)
  - L0 Unit 10: "Your First International Trip" — FKGL=6.9 (target 0-4.0)
  - L0 Unit 10: "Smart Apps for Easy Travel" — FKGL=7.5 (target 0-4.0)
  - L0 Unit 11: "Smart Phones Change Our Lives" — FKGL=7.0 (target 0-4.0)
  - L0 Unit 11: "Robots Help Saudi Cities" — FKGL=8.9 (target 0-4.0)
  - L0 Unit 12: "New Jobs for Tomorrow" — FKGL=7.7 (target 0-4.0)
  - L0 Unit 12: "Dream Jobs Around the World" — FKGL=8.5 (target 0-4.0)
  - L1 Unit 1: "Colors That Tell Stories" — FKGL=11.3 (target 1.0-5.0)
  - L1 Unit 1: "Colors and Joy Around the World" — FKGL=11.8 (target 1.0-5.0)
  - L1 Unit 2: "The Deep Sea Mystery" — FKGL=7.8 (target 1.0-5.0)
  - L1 Unit 3: "Saudi Arabia Reaches for the Stars" — FKGL=9.0 (target 1.0-5.0)
  - L1 Unit 3: "Journey to the Stars" — FKGL=9.3 (target 1.0-5.0)
  - L1 Unit 4: "Digital Art Changes Everything" — FKGL=9.8 (target 1.0-5.0)
  - L1 Unit 4: "Art Speaks Every Language" — FKGL=10.0 (target 1.0-5.0)
  - L1 Unit 5: "Amazing Places Around the World" — FKGL=8.4 (target 1.0-5.0)
  - L1 Unit 5: "The Magic of Light Festivals" — FKGL=11.6 (target 1.0-5.0)
  - L1 Unit 6: "Simple Ideas That Changed Everything" — FKGL=8.5 (target 1.0-5.0)
  - L1 Unit 6: "Ancient Arab Inventions That Changed Medicine" — FKGL=9.8 (target 1.0-5.0)
  - L1 Unit 7: "Saudi Arabia's Rising Sports Stars" — FKGL=9.0 (target 1.0-5.0)
  - L1 Unit 7: "Breaking Barriers in Sports" — FKGL=8.3 (target 1.0-5.0)
  - L1 Unit 8: "The Amazing Pyramids of Egypt" — FKGL=10.6 (target 1.0-5.0)
  - L1 Unit 8: "Lost Cities Tell Ancient Stories" — FKGL=9.4 (target 1.0-5.0)
  - L1 Unit 9: "Capturing Life Through Photography" — FKGL=10.5 (target 1.0-5.0)
  - L1 Unit 9: "Desert Photography Magic" — FKGL=10.1 (target 1.0-5.0)
  - L1 Unit 10: "Food Brings the World Together" — FKGL=8.7 (target 1.0-5.0)
  - L1 Unit 10: "The Ancient Spice Routes" — FKGL=7.4 (target 1.0-5.0)
  - L1 Unit 11: "Digital Detox Around the World" — FKGL=9.3 (target 1.0-5.0)
  - L1 Unit 11: "Social Media Around the World" — FKGL=8.4 (target 1.0-5.0)
  - L1 Unit 12: "Saudi Arabia Goes Green" — FKGL=8.6 (target 1.0-5.0)
  - L1 Unit 12: "Saudi Arabia's Solar Revolution" — FKGL=11.6 (target 1.0-5.0)
  - L2 Unit 1: "The Amazing Sleeping Brain" — FKGL=11.4 (target 2.0-6.0)
  - L2 Unit 1: "Your Amazing Memory Palace" — FKGL=12.9 (target 2.0-6.0)
  - L2 Unit 2: "Racing Against Time: Saving Earth's Wildlife" — FKGL=12.9 (target 2.0-6.0)
  - L2 Unit 2: "Hope in the Desert Sands" — FKGL=14.8 (target 2.0-6.0)
  - L2 Unit 3: "When Sand Meets Sky" — FKGL=12.6 (target 2.0-6.0)
  - L2 Unit 3: "When Nature Shows Its Power" — FKGL=12.1 (target 2.0-6.0)
  - L2 Unit 4: "Digital Fashion Revolution" — FKGL=15.1 (target 2.0-6.0)
  - L2 Unit 4: "Fashion Tells Our Stories" — FKGL=14.6 (target 2.0-6.0)
  - L2 Unit 5: "Lost Cities Beneath the Sand" — FKGL=15.5 (target 2.0-6.0)
  - L2 Unit 5: "Voices from the Sand" — FKGL=15.2 (target 2.0-6.0)
  - L2 Unit 6: "Tomorrow's Cities Today" — FKGL=14.8 (target 2.0-6.0)
  - L2 Unit 6: "Smart Homes, Smarter Future" — FKGL=10.9 (target 2.0-6.0)
  - L2 Unit 7: "Finding Balance in a Digital World" — FKGL=11.5 (target 2.0-6.0)
  - L2 Unit 7: "Finding Balance in the Desert" — FKGL=12.8 (target 2.0-6.0)
  - L2 Unit 8: "Saudi Arabia's Hidden Mountain Treasures" — FKGL=13.9 (target 2.0-6.0)
  - L2 Unit 8: "Saudi Arabia's Hidden Mountain Treasures" — FKGL=13.8 (target 2.0-6.0)
  - L2 Unit 9: "Movies That Change the World" — FKGL=13.4 (target 2.0-6.0)
  - L2 Unit 9: "How Movies Shape Our World" — FKGL=14.8 (target 2.0-6.0)
  - L2 Unit 10: "When Wells Run Dry" — FKGL=11.7 (target 2.0-6.0)
  - L2 Unit 10: "Desert Cities Fighting for Water" — FKGL=15.3 (target 2.0-6.0)
  - L2 Unit 11: "Digital Walls Transform Ancient Cities" — FKGL=15.4 (target 2.0-6.0)
  - L2 Unit 11: "Colors on City Walls" — FKGL=13.1 (target 2.0-6.0)
  - L2 Unit 12: "The Great Polar Adventure" — FKGL=12.3 (target 2.0-6.0)
  - L2 Unit 12: "The Digital Nomad Revolution" — FKGL=12.9 (target 2.0-6.0)
  - L3 Unit 1: "AI Transforms Daily Life" — FKGL=17.8 (target 3.5-7.0)
  - L3 Unit 1: "AI Doctors in Your Pocket" — FKGL=14.1 (target 3.5-7.0)
  - L3 Unit 2: "The Coral Reef Scientists of Tomorrow" — FKGL=12.3 (target 3.5-7.0)
  - L3 Unit 2: "Ocean Gardens Under Threat" — FKGL=15.4 (target 3.5-7.0)
  - L3 Unit 3: "When Buildings Dance with Earth" — FKGL=15.2 (target 3.5-7.0)
  - L3 Unit 3: "When the Earth Shakes" — FKGL=14.0 (target 3.5-7.0)
  - L3 Unit 4: "The Global Coffee Journey" — FKGL=17.0 (target 3.5-7.0)
  - L3 Unit 4: "Coffee's Journey from Bean to Cup" — FKGL=15.5 (target 3.5-7.0)
  - L3 Unit 5: "Saudi Arabia's Solar Revolution" — FKGL=17.9 (target 3.5-7.0)
  - L3 Unit 5: "Saudi Arabia's Solar Revolution" — FKGL=16.9 (target 3.5-7.0)
  - L3 Unit 6: "Virtual Worlds Transforming Our Reality" — FKGL=17.5 (target 3.5-7.0)
  - L3 Unit 6: "Virtual Hospitals Transform Patient Care" — FKGL=17.7 (target 3.5-7.0)
  - L3 Unit 7: "When Fear Becomes Healing" — FKGL=18.6 (target 3.5-7.0)
  - L3 Unit 7: "When Fear Takes Control" — FKGL=13.7 (target 3.5-7.0)
  - L3 Unit 8: "Water Wonders of Ancient Persia" — FKGL=16.3 (target 3.5-7.0)
  - L3 Unit 8: "Engineering Marvels of the Ancient World" — FKGL=13.9 (target 3.5-7.0)
  - L3 Unit 9: "Desert Genes Hold Medical Secrets" — FKGL=16.6 (target 3.5-7.0)
  - L3 Unit 9: "Unlocking Nature's Blueprint" — FKGL=17.1 (target 3.5-7.0)
  - L3 Unit 10: "Growing Up: Vertical Farming Revolution" — FKGL=15.6 (target 3.5-7.0)
  - L3 Unit 10: "Gardens in the Sky" — FKGL=16.6 (target 3.5-7.0)
  - L3 Unit 11: "The Hidden Data Collectors" — FKGL=16.0 (target 3.5-7.0)
  - L3 Unit 11: "Your Digital Shadow" — FKGL=15.2 (target 3.5-7.0)
  - L3 Unit 12: "The Red Planet Beckons" — FKGL=15.5 (target 3.5-7.0)
  - L3 Unit 12: "Living on the Red Planet" — FKGL=15.0 (target 3.5-7.0)
  - L4 Unit 1: "When Science Meets Conscience" — FKGL=17.3 (target 5.0-9.0)
  - L4 Unit 1: "Designer Genes: The CRISPR Revolution" — FKGL=17.9 (target 5.0-9.0)
  - L4 Unit 2: "Secrets of the Abyss Unveiled" — FKGL=16.8 (target 5.0-9.0)
  - L4 Unit 2: "The Ocean's Hidden Architects" — FKGL=18.5 (target 5.0-9.0)
  - L4 Unit 3: "Desert Bloom: Technology's Promise" — FKGL=18.3 (target 5.0-9.0)
  - L4 Unit 3: "Feeding Tomorrow's World" — FKGL=17.7 (target 5.0-9.0)
  - L4 Unit 4: "Nature's Blueprint for Innovation" — FKGL=17.0 (target 5.0-9.0)
  - L4 Unit 4: "Nature's Blueprint for Revolutionary Medicine" — FKGL=18.7 (target 5.0-9.0)
  - L4 Unit 5: "The Great Human Journey" — FKGL=17.4 (target 5.0-9.0)
  - L4 Unit 5: "The Digital Nomad Revolution" — FKGL=20.0 (target 5.0-9.0)
  - L4 Unit 6: "The Green Revolution in Digital Finance" — FKGL=20.5 (target 5.0-9.0)
  - L4 Unit 6: "The Digital Gold Rush" — FKGL=19.3 (target 5.0-9.0)
  - L4 Unit 7: "The Digital Crowd Revolution" — FKGL=18.9 (target 5.0-9.0)
  - L4 Unit 7: "The Psychology of Collective Behavior" — FKGL=17.9 (target 5.0-9.0)
  - L4 Unit 8: "Silent Witnesses Speak" — FKGL=18.0 (target 5.0-9.0)
  - L4 Unit 8: "Digital Detectives Solving Ancient Mysteries" — FKGL=19.1 (target 5.0-9.0)
  - L4 Unit 9: "The Digital Archaeological Revolution" — FKGL=20.1 (target 5.0-9.0)
  - L4 Unit 9: "Secrets Beneath the Sands" — FKGL=19.7 (target 5.0-9.0)
  - L4 Unit 10: "The Quest for Extended Life" — FKGL=16.2 (target 5.0-9.0)
  - L4 Unit 10: "The Longevity Paradox of Japan" — FKGL=18.5 (target 5.0-9.0)
  - L4 Unit 11: "Living Buildings that Breathe" — FKGL=18.0 (target 5.0-9.0)
  - L4 Unit 11: "Building Tomorrow's Cities Today" — FKGL=20.4 (target 5.0-9.0)
  - L4 Unit 12: "The Hunt for Earth's Twin" — FKGL=16.9 (target 5.0-9.0)
  - L4 Unit 12: "Beyond Our Solar System" — FKGL=17.3 (target 5.0-9.0)
  - L5 Unit 1: "When Civilizations Crumble" — FKGL=19.7 (target 7.0-12.0)
  - L5 Unit 1: "The Silent Collapse of Maya Cities" — FKGL=19.5 (target 7.0-12.0)
  - L5 Unit 2: "Breaking Barriers in STEM" — FKGL=19.0 (target 7.0-12.0)
  - L5 Unit 2: "Breaking Barriers Beyond Earth" — FKGL=18.4 (target 7.0-12.0)
  - L5 Unit 3: "When Ancient Wisdom Meets Modern Medicine" — FKGL=17.5 (target 7.0-12.0)
  - L5 Unit 3: "When Science Meets Ancient Wisdom" — FKGL=18.9 (target 7.0-12.0)
  - L5 Unit 4: "Surviving Tomorrow's Heat" — FKGL=18.8 (target 7.0-12.0)
  - L5 Unit 4: "Desert Innovators Lead Climate Solutions" — FKGL=19.0 (target 7.0-12.0)
  - L5 Unit 5: "The Nuclear Renaissance" — FKGL=20.4 (target 7.0-12.0)
  - L5 Unit 5: "The Nuclear Renaissance Paradox" — FKGL=18.9 (target 7.0-12.0)
  - L5 Unit 6: "When Giants Fall Silent" — FKGL=18.5 (target 7.0-12.0)
  - L5 Unit 6: "The Silent Catastrophe" — FKGL=18.5 (target 7.0-12.0)
  - L5 Unit 7: "Healing the Mind's Architecture" — FKGL=19.1 (target 7.0-12.0)
  - L5 Unit 7: "Mapping the Mind's Hidden Networks" — FKGL=19.6 (target 7.0-12.0)
  - L5 Unit 8: "Nature's Hidden Networks" — FKGL=20.1 (target 7.0-12.0)
  - L5 Unit 8: "Nature's Architects of Innovation" — FKGL=19.6 (target 7.0-12.0)
  - L5 Unit 9: "The Neuroscience of Creative Genius" — FKGL=20.5 (target 7.0-12.0)
  - L5 Unit 9: "The Science of Sudden Inspiration" — FKGL=19.2 (target 7.0-12.0)
  - L5 Unit 10: "Quantum Frontiers Unveiled" — FKGL=20.1 (target 7.0-12.0)
  - L5 Unit 10: "Quantum Medicine's Revolutionary Promise" — FKGL=20.3 (target 7.0-12.0)
  - L5 Unit 11: "Bridges Beyond Borders" — FKGL=21.8 (target 7.0-12.0)
  - L5 Unit 11: "Digital Nomads Redefining Cultural Exchange" — FKGL=20.8 (target 7.0-12.0)
  - L5 Unit 12: "The Water-Energy Nexus Revolution" — FKGL=20.7 (target 7.0-12.0)
  - L5 Unit 12: "The Water-Energy Nexus Challenge" — FKGL=21.4 (target 7.0-12.0)

Cohesion score by level (higher = more sophisticated text):
  L0: 0.71
  L1: 0.73
  L2: 0.78
  L3: 0.56
  L4: 0.44
  L5: 0.40

Average TTR by level (expected: increase with level):
  L0: 0.616
  L1: 0.626
  L2: 0.648
  L3: 0.650
  L4: 0.597
  L5: 0.565

VERDICT: 6 levels may need passage adjustments: ['L0', 'L1', 'L2', 'L3', 'L4', 'L5']
Total passages outside target range: 0
Total passages with FKGL issues: 137

### Dimension 4: Grammar Progression Integrity
========================================
DIMENSION 4 — GRAMMAR PROGRESSION INTEGRITY
========================================

Grammar topics per level:

  Level 0 (12 topics):
    - Unit 1: am/is/are [grammar]
    - Unit 2: simple present positive [grammar]
    - Unit 3: simple present negative/questions [grammar]
    - Unit 4: this/that/these/those [grammar]
    - Unit 5: plurals [grammar]
    - Unit 6: a/an/the basics [grammar]
    - Unit 7: there is/there are [grammar]
    - Unit 8: possessive s [grammar]
    - Unit 9: pronouns (I/me/my) [grammar]
    - Unit 10: imperatives [grammar]
    - Unit 11: adjective order basics [grammar]
    - Unit 12: prepositions of place [grammar]

  Level 1 (12 topics):
    - Unit 1: simple past (regular) [grammar]
    - Unit 2: simple past (irregular) [grammar]
    - Unit 3: past negative/questions [grammar]
    - Unit 4: present continuous [grammar]
    - Unit 5: can/cant [grammar]
    - Unit 6: countable/uncountable [grammar]
    - Unit 7: some/any [grammar]
    - Unit 8: how much/how many [grammar]
    - Unit 9: prepositions of time [grammar]
    - Unit 10: adverbs of frequency [grammar]
    - Unit 11: going to (future) [grammar]
    - Unit 12: want/would like [grammar]

  Level 2 (12 topics):
    - Unit 1: will vs going to [grammar]
    - Unit 2: present perfect (ever/never) [grammar]
    - Unit 3: present perfect (just/already/yet) [grammar]
    - Unit 4: comparatives [grammar]
    - Unit 5: superlatives [grammar]
    - Unit 6: should/shouldnt [grammar]
    - Unit 7: must/have to [grammar]
    - Unit 8: may/might [grammar]
    - Unit 9: too/enough [grammar]
    - Unit 10: gerund vs infinitive basics [grammar]
    - Unit 11: first conditional [grammar]
    - Unit 12: past continuous [grammar]

  Level 3 (12 topics):
    - Unit 1: present perfect vs past simple [grammar]
    - Unit 2: present perfect continuous [grammar]
    - Unit 3: second conditional [grammar]
    - Unit 4: passive voice (present) [grammar]
    - Unit 5: passive voice (past) [grammar]
    - Unit 6: relative clauses (who/which/that) [grammar]
    - Unit 7: reported speech basics [grammar]
    - Unit 8: used to [grammar]
    - Unit 9: get used to/be used to [grammar]
    - Unit 10: both/either/neither [grammar]
    - Unit 11: so/such [grammar]
    - Unit 12: unless/as long as [grammar]

  Level 4 (12 topics):
    - Unit 1: third conditional [grammar]
    - Unit 2: mixed conditionals [grammar]
    - Unit 3: wish + past/past perfect [grammar]
    - Unit 4: advanced passive (by/with) [grammar]
    - Unit 5: have something done [grammar]
    - Unit 6: relative clauses (advanced) [grammar]
    - Unit 7: participle clauses [grammar]
    - Unit 8: inversion after negative adverbs [grammar]
    - Unit 9: cleft sentences [grammar]
    - Unit 10: future perfect [grammar]
    - Unit 11: future continuous [grammar]
    - Unit 12: advanced modal perfects [grammar]

  Level 5 (12 topics):
    - Unit 1: subjunctive [grammar]
    - Unit 2: fronting [grammar]
    - Unit 3: ellipsis in speech [grammar]
    - Unit 4: nominalization [grammar]
    - Unit 5: advanced discourse markers [grammar]
    - Unit 6: hedging and vague language [grammar]
    - Unit 7: formal vs informal register [grammar]
    - Unit 8: advanced reported speech [grammar]
    - Unit 9: complex noun phrases [grammar]
    - Unit 10: advanced linking devices [grammar]
    - Unit 11: rhetorical questions [grammar]
    - Unit 12: emphatic structures [grammar]

Hidden prerequisite gaps detected:
  - L1 Unit 4: "present continuous" may require "present simple" which was not found in L0-L1
  - L2 Unit 2: "present perfect (ever/never)" may require "present simple" which was not found in L0-L2
  - L2 Unit 2: "present perfect (ever/never)" may require "past simple" which was not found in L0-L2
  - L2 Unit 3: "present perfect (just/already/yet)" may require "present simple" which was not found in L0-L2
  - L2 Unit 3: "present perfect (just/already/yet)" may require "past simple" which was not found in L0-L2
  - L2 Unit 12: "past continuous" may require "past simple" which was not found in L0-L2
  - L3 Unit 1: "present perfect vs past simple" may require "present simple" which was not found in L0-L3
  - L3 Unit 2: "present perfect continuous" may require "present simple" which was not found in L0-L3
  - L3 Unit 4: "passive voice (present)" may require "active voice" which was not found in L0-L3
  - L3 Unit 4: "passive voice (present)" may require "present simple" which was not found in L0-L3
  - L3 Unit 5: "passive voice (past)" may require "active voice" which was not found in L0-L3
  - L3 Unit 5: "passive voice (past)" may require "present simple" which was not found in L0-L3
  - L3 Unit 7: "reported speech basics" may require "direct speech" which was not found in L0-L3
  - L4 Unit 10: "future perfect" may require "will future" which was not found in L0-L4
  - L4 Unit 11: "future continuous" may require "will future" which was not found in L0-L4
  - L4 Unit 11: "future continuous" may require "going to future" which was not found in L0-L4
  - L5 Unit 8: "advanced reported speech" may require "direct speech" which was not found in L0-L5

Repeated grammar topics across levels:

Grammar vs CEFR coverage per level:
  - L0: 2/8 CEFR target topics covered (25%)
  - L1: 2/9 CEFR target topics covered (22%)
  - L2: 3/8 CEFR target topics covered (37%)
  - L3: 3/7 CEFR target topics covered (42%)
  - L4: 1/7 CEFR target topics covered (14%)
  - L5: 1/7 CEFR target topics covered (14%)

VERDICT: 17 potential prerequisite gaps found

### Dimension 5: Writing / Speaking Progression
========================================
DIMENSION 5 — WRITING / SPEAKING PROGRESSION
========================================

Writing min/max word counts by level:
  L0: avg_min=50, avg_max=80 (12 prompts)
  L1: avg_min=80, avg_max=120 (12 prompts)
  L2: avg_min=120, avg_max=180 (12 prompts)
  L3: avg_min=180, avg_max=250 (12 prompts)
  L4: avg_min=250, avg_max=350 (12 prompts)
  L5: avg_min=350, avg_max=500 (12 prompts)

Smooth ramp check (max word count progression):
  L0→L1: 80 → 120 (ratio: 1.50) — SMOOTH
  L1→L2: 120 → 180 (ratio: 1.50) — SMOOTH
  L2→L3: 180 → 250 (ratio: 1.39) — SMOOTH
  L3→L4: 250 → 350 (ratio: 1.40) — SMOOTH
  L4→L5: 350 → 500 (ratio: 1.43) — SMOOTH

Writing prompt complexity (avg FKGL of prompt text):
  L0: 5.4
  L1: 6.0
  L2: 7.9
  L3: 11.0
  L4: 14.7
  L5: 17.5

Vocabulary requirement count per prompt (avg):
  L0: 8.0
  L1: 8.0
  L2: 10.0
  L3: 10.0
  L4: 12.0
  L5: 12.0

Speaking topic analysis:
  L0: prompt FKGL=3.2, duration=30-240s (12 topics)
  L1: prompt FKGL=4.6, duration=30-240s (12 topics)
  L2: prompt FKGL=5.5, duration=30-240s (12 topics)
  L3: prompt FKGL=8.1, duration=30-240s (12 topics)
  L4: prompt FKGL=10.7, duration=30-240s (12 topics)
  L5: prompt FKGL=14.0, duration=30-240s (12 topics)

VERDICT: Progression appears smooth

### Dimension 6: The Leap Test
========================================
DIMENSION 6 — THE LEAP TEST
========================================

Per-level raw metrics:
  L0: FKGL=7.0, AvgWords=209, UniqueVocab=169, GrammarTopics=12, WritingMax=80, TTR=0.616
  L1: FKGL=9.4, AvgWords=258, UniqueVocab=177, GrammarTopics=12, WritingMax=120, TTR=0.626
  L2: FKGL=13.5, AvgWords=324, UniqueVocab=255, GrammarTopics=12, WritingMax=180, TTR=0.648
  L3: FKGL=15.9, AvgWords=376, UniqueVocab=280, GrammarTopics=12, WritingMax=250, TTR=0.650
  L4: FKGL=18.3, AvgWords=568, UniqueVocab=274, GrammarTopics=12, WritingMax=350, TTR=0.597
  L5: FKGL=19.6, AvgWords=746, UniqueVocab=334, GrammarTopics=12, WritingMax=500, TTR=0.565

Per-transition leap scores:
  L0→L1: 0.68  ← WEAK — students may not feel progress
  L1→L2: 1.24  ← STRONG — good level differentiation
  L2→L3: 0.63  ← WEAK — students may not feel progress
  L3→L4: 0.52  ← WEAK — students may not feel progress
  L4→L5: 0.46  ← WEAK — students may not feel progress

Component breakdown for weakest transition (L4→L5):
  FKGL=0.83, Words=0.63, Vocab=0.63, Grammar=0.00, Writing=1.07, TTR=-1.06

VERDICT:
  - Strong leaps (>= 0.9): ['L1→L2']
  - Weak leaps (< 0.7): ['L0→L1', 'L2→L3', 'L3→L4', 'L4→L5']
  - Excessive leaps (> 1.5): NONE

### Dimension 7: Translation Quality (Sample 100)
========================================
DIMENSION 7 — TRANSLATION QUALITY
========================================

Sample size: 100 random entries

Issues found:
  - Empty translations: 0
  - Translations containing English: 0
  - Suspiciously short (≤2 chars): 0
  - Good translations: 100

Issue details (first 20):

20 random examples (Word / Arabic / Level):
  Word                      Arabic Translation                       Level
  ------------------------- ----------------------------------------   ---
  conduits                  قنوات أو وسائل لنقل أو إيصال شيء معين    L4
  facilitate                يسهل، ييسر، يساعد على                    L4
  taking place              يحدث، يقع، يجري                          L2
  establish                 إنشاء أو تأسيس شيء جديد مثل مؤسسة أو نظام L2
  dark                      مظلم، معتم، بلا ضوء                      L1
  species                   فصيلة، نوع من الكائنات الحية             L2
  incredible                لا يصدق، مدهش جداً                       L1
  methodology               منهجية، أسلوب، طريقة علمية               L4
  correlate                 يرتبط، يتناسب، له علاقة                  L4
  democratization           الدمقرطة، جعل الشيء متاحاً للجميع، إزالة الحواجز L5
  reframe                   يعيد صياغة، يغير منظور، يقدم بطريقة مختلفة L5
  bright                    مشرق، واعد، مضيء                         L1
  signify                   يدل على، يعني، يشير إلى                  L3
  undergoing                يخضع لـ، يمر بـ، يتعرض لـ                L3
  unravel                   يكشف، يحل، يفك (لغز أو مشكلة)            L3
  advanced                  متقدم، متطور                             L0
  catalyst                  محفز، عامل مساعد، باعث                   L4
  epitomize                 يجسد، يمثل، يكون مثالاً مثالياً على شيء ما L5
  render                    يجعل، يحول إلى، يصير                     L3
  sophisticated             متطور، معقد، راقي                        L5

Claude API quality scores: SKIPPED (budget reserved)

### Dimension 8: Example Sentence Quality (Sample 100)
========================================
DIMENSION 8 — EXAMPLE SENTENCE QUALITY
========================================

Sample size: 100

Issues:
  - Examples with no sentence: 0
  - Examples missing the target word: 2
  - Examples too short (<5 words): 1
  - Examples too long for level (>25 words at A1-A2): 0
  - Examples with FKGL too high for level: 41
  - Good examples: 97

First 20 issue details:
  MISSING WORD: "parks" not in "I like to walk in the park every morning...."
  MISSING WORD: "aligns" not in "Our company's goals align with what our customers want...."

20 random examples with assessment:
  [4] "substantial" → "The company made substantial improvements to its customer service." (contains word: YES)
  [4] "compelling" → "The documentary presented compelling evidence about climate change." (contains word: YES)
  [5] "inherent" → "There are inherent risks in any investment that potential buyers should carefull" (contains word: YES)
  [4] "impetus" → "The new government policy provided the impetus for renewable energy development." (contains word: YES)
  [3] "harnessing" → "Solar panels are harnessing sunlight to produce electricity for the village." (contains word: YES)
  [5] "neurological" → "The patient underwent extensive neurological testing to diagnose the cause of he" (contains word: YES)
  [3] "implications" → "The new law will have serious implications for small businesses." (contains word: YES)
  [5] "intrinsic" → "Music has intrinsic value beyond its commercial potential." (contains word: YES)
  [4] "paradigm" → "The discovery challenged the existing scientific paradigm about how diseases spr" (contains word: YES)
  [4] "implemented" → "The new safety policy will be implemented across all departments next month." (contains word: YES)
  [1] "detailed" → "The teacher gave us a detailed explanation of the lesson." (contains word: YES)
  [5] "paradigmatic" → "The professor used Shakespeare's work as paradigmatic of Renaissance literature." (contains word: YES)
  [3] "comprehend" → "The students struggled to comprehend the difficult math problem." (contains word: YES)
  [3] "embraced" → "Many students have embraced online learning during the pandemic." (contains word: YES)
  [4] "catalyze" → "The economic crisis catalyzed major changes in government policy." (contains word: YES)
  [4] "implementation" → "The implementation of the new software system will take three months to complete" (contains word: YES)
  [4] "extraction" → "The extraction of oil from the ground requires special equipment." (contains word: YES)
  [1] "popular" → "Pizza is very popular with children." (contains word: YES)
  [5] "confluence" → "The company's success was due to a confluence of good timing, skilled leadership" (contains word: YES)
  [5] "perfunctory" → "His perfunctory apology showed he wasn't really sorry for his mistake." (contains word: YES)

### Dimension 9: Topic Diversity
========================================
DIMENSION 9 — TOPIC DIVERSITY
========================================

Per level:

  L0: 13 unique categories — ['city', 'daily life', 'family', 'food', 'health', 'hobbies', 'other', 'shopping', 'social', 'technology', 'travel', 'weather', 'work']
    Unit 1: Daily Life → ['daily life']
    Unit 2: Food & Cooking → ['food', 'health']
    Unit 3: My City → ['city']
    Unit 4: Animals Around Us → ['other']
    Unit 5: Weather & Seasons → ['food', 'weather']
    Unit 6: Family & Friends → ['family', 'social']
    Unit 7: Shopping & Money → ['shopping']
    Unit 8: Health & Body → ['health']
    Unit 9: Hobbies & Free Time → ['hobbies']
    Unit 10: Travel Basics → ['travel']
    Unit 11: Technology Today → ['technology', 'daily life']
    Unit 12: Jobs & Careers → ['work']

  L1: 7 unique categories — ['culture', 'environment', 'media', 'other', 'social', 'sports', 'weather']
    Unit 1: Cultural Festivals → ['culture']
    Unit 2: Ocean Life → ['other']
    Unit 3: Space Exploration → ['other']
    Unit 4: Music & Art → ['culture']
    Unit 5: Famous Places → ['other']
    Unit 6: Inventions → ['other']
    Unit 7: Sports Stars → ['sports']
    Unit 8: Ancient Civilizations → ['other']
    Unit 9: Photography → ['weather']
    Unit 10: World Cuisines → ['other']
    Unit 11: Social Media → ['social', 'media']
    Unit 12: Green Living → ['environment']
    ⚠ "other" appears in 6 units — possibly overrepresented

  L2: 8 unique categories — ['city', 'culture', 'food', 'media', 'other', 'technology', 'travel', 'weather']
    Unit 1: Brain & Memory → ['weather']
    Unit 2: Endangered Species → ['other']
    Unit 3: Extreme Weather → ['food', 'weather']
    Unit 4: Fashion & Identity → ['other']
    Unit 5: Hidden History → ['other']
    Unit 6: Future Cities → ['other']
    Unit 7: Digital Detox → ['technology']
    Unit 8: Mountain Adventures → ['other']
    Unit 9: Film & Cinema → ['media']
    Unit 10: Water Crisis → ['other']
    Unit 11: Street Art → ['culture', 'city']
    Unit 12: Remarkable Journeys → ['travel']
    ⚠ "other" appears in 6 units — possibly overrepresented

  L3: 5 unique categories — ['city', 'culture', 'other', 'science', 'technology']
    Unit 1: Artificial Intelligence → ['culture']
    Unit 2: Coral Reefs → ['other']
    Unit 3: Earthquake Science → ['culture', 'science']
    Unit 4: Global Coffee Culture → ['culture']
    Unit 5: Renewable Energy → ['other']
    Unit 6: Virtual Reality → ['other']
    Unit 7: Psychology of Fear → ['science']
    Unit 8: Ancient Engineering → ['other']
    Unit 9: Genetic Science → ['science']
    Unit 10: Urban Farming → ['city']
    Unit 11: Digital Privacy → ['technology']
    Unit 12: Mars Exploration → ['other']
    ⚠ "other" appears in 5 units — possibly overrepresented

  L4: 6 unique categories — ['environment', 'food', 'health', 'other', 'science', 'work']
    Unit 1: Bioethics → ['science']
    Unit 2: Deep Ocean Discovery → ['science']
    Unit 3: Food Security → ['food']
    Unit 4: Biomimicry Design → ['health', 'environment']
    Unit 5: Human Migration → ['other']
    Unit 6: Cryptocurrency → ['work']
    Unit 7: Crowd Psychology → ['science']
    Unit 8: Forensic Science → ['health', 'science']
    Unit 9: Archaeological Mysteries → ['other']
    Unit 10: Longevity Science → ['science']
    Unit 11: Sustainable Architecture → ['other']
    Unit 12: Exoplanet Hunting → ['science']
    ⚠ "science" appears in 6 units — possibly overrepresented

  L5: 5 unique categories — ['culture', 'environment', 'food', 'other', 'science']
    Unit 1: Civilization Collapse → ['other']
    Unit 2: Extreme Achievement → ['other']
    Unit 3: Scientific Skepticism → ['science']
    Unit 4: Climate Adaptation → ['environment']
    Unit 5: Nuclear Energy Debate → ['other']
    Unit 6: Biodiversity Crisis → ['other']
    Unit 7: Neuroscience Frontiers → ['science']
    Unit 8: Swarm Intelligence → ['other']
    Unit 9: Creative Genius → ['food']
    Unit 10: Quantum Discovery → ['science']
    Unit 11: Cross-Cultural Exchange → ['culture']
    Unit 12: Resource Economics → ['other']
    ⚠ "other" appears in 6 units — possibly overrepresented

VERDICT: Levels with poor diversity (<4 unique categories): NONE

### Dimension 10: POS Balance
========================================
DIMENSION 10 — POS BALANCE
========================================

Healthy ranges: Nouns 40-50%, Verbs 20-30%, Adj 15-20%, Adv 5-10%, Other 5-15%

Per level:
  L0: N=56% V=25% Adj=20% Adv=0% Other=0% (total: 194)
       Raw POS values: {'noun': np.int64(108), 'verb': np.int64(48), 'adjective': np.int64(38)}
  L1: N=7% V=43% Adj=45% Adv=5% Other=0% (total: 241)
       Raw POS values: {'adjective': np.int64(108), 'verb': np.int64(104), 'noun': np.int64(16), 'adverb': np.int64(13)}
  L2: N=11% V=78% Adj=10% Adv=1% Other=0% (total: 293)
       Raw POS values: {'verb': np.int64(229), 'noun': np.int64(33), 'adjective': np.int64(28), 'adverb': np.int64(2), 'verb + adverb': np.int64(1)}
  L3: N=9% V=70% Adj=21% Adv=0% Other=0% (total: 340)
       Raw POS values: {'verb': np.int64(237), 'adjective': np.int64(70), 'noun': np.int64(32), 'adverb': np.int64(1)}
  L4: N=43% V=30% Adj=26% Adv=0% Other=0% (total: 628)
       Raw POS values: {'noun': np.int64(273), 'verb': np.int64(187), 'adjective': np.int64(164), 'adverb': np.int64(2), 'verb (past participle/adjective)': np.int64(1), 'verb/adjective': np.int64(1)}
  L5: N=33% V=31% Adj=34% Adv=0% Other=1% (total: 694)
       Raw POS values: {'adjective': np.int64(238), 'noun': np.int64(232), 'verb': np.int64(215), 'adjective/verb': np.int64(4), 'noun|verb': np.int64(2), 'adjective/noun': np.int64(1), 'noun/verb': np.int64(1), 'verb (past participle/adjective)': np.int64(1)}

Imbalances detected: ['L1: Nouns 7%, Verbs 43%, Adj 45%', 'L2: Nouns 11%, Verbs 78%', 'L3: Nouns 9%, Verbs 70%']

### Dimension 11: Reclaimable Slots
========================================
DIMENSION 11 — RECLAIMABLE SLOTS CALCULATION
========================================

Per level:
  L0: current_total=194, unique=169, reclaimable=14, target=300, need_to_add=131
  L1: current_total=241, unique=177, reclaimable=15, target=600, need_to_add=423
  L2: current_total=293, unique=255, reclaimable=10, target=1200, need_to_add=945
  L3: current_total=340, unique=280, reclaimable=6, target=2000, need_to_add=1720
  L4: current_total=628, unique=274, reclaimable=243, target=4000, need_to_add=3726
  L5: current_total=694, unique=334, reclaimable=236, target=8000, need_to_add=7666

Phase 2 vocab target additions per level:
  L0: current=169 unique, target=300, need to add: 131
  L1: current=177 unique, target=600, need to add: 423
  L2: current=255 unique, target=1200, need to add: 945
  L3: current=280 unique, target=2000, need to add: 1720
  L4: current=274 unique, target=4000, need to add: 3726
  L5: current=334 unique, target=8000, need to add: 7666

Total Phase 2 vocab target additions: ~14,611
Total reclaimable from cleanup: ~524
Net new content needed: ~14,087


---

## Anti-Mistake Playbook (MUST READ before Phase 2)

========================================
DIMENSION 12 — ANTI-MISTAKE PLAYBOOK
========================================

The following rules MUST be embedded in every Phase 2 content prompt
to prevent recurrence of the quality issues found in this audit.

RULE 1 — Vocabulary Uniqueness
  Trigger: D1 found 683 unintended duplicates
  Rule: Before inserting any new vocab word, the prompt MUST query
        curriculum_vocabulary v JOIN curriculum_readings r ON r.id = v.reading_id
        JOIN curriculum_units cu ON cu.id = r.unit_id
        WHERE LOWER(v.word) = LOWER(?) AND cu.level_id = ?
        — if exists in same level with same POS, ABORT.
  Allowed exception: Spiral repetition where new context demonstrably
        increases complexity (sentence FKGL > previous + 1.0).

RULE 2 — CEFR Vocabulary Alignment
  Trigger: D2 found 582 words potentially too hard, 4 too easy
  Rule: Every new vocab word MUST be classified against frequency lists
        before insertion. If classified above the target level
        of the unit, abort and pick a different word.

RULE 3 — Reading Passage Length
  Trigger: D3 found 0 passages outside target word count ranges
  Rule: Every new/rewritten passage MUST be within the target range
        for its level:
        L0: 200-300 words, L1: 300-400, L2: 400-500,
        L3: 500-600, L4: 700-1000, L5: 1000-1200
        (as defined in curriculum_levels.passage_word_range)

RULE 4 — Reading Passage FKGL
  Trigger: D3 found 137 passages with inappropriate FKGL
  Rule: Compute FKGL on every generated passage. Must fall within
        the target range for the level. Reject otherwise.

RULE 5 — Grammar Prerequisites
  Trigger: D4 found 17 potential prerequisite gaps
  Rule: Before inserting any grammar topic, check the dependency map.
        If prerequisites are not in the same or earlier level, abort.

RULE 6 — Writing/Speaking Smoothness
  Trigger: D5 found no abrupt jumps
  Rule: New writing prompts must follow the level's min/max word range.
        No level may have a max word count more than 1.6x the previous level.

RULE 7 — Leap Smoothness
  Trigger: D6 found weakest transition at L4→L5 (score: 0.46)
  Rule: After any Phase 2 batch, re-run the leap test. Any transition
        with leap score < 0.8 must be addressed before commit.

RULE 8 — Translation Validation
  Trigger: D7 found 0 empty, 0 with English, 0 suspiciously short
  Rule: Every generated Arabic translation must be: non-empty,
        contain no English characters, >=1 Arabic word.
        Reject otherwise and regenerate.

RULE 9 — Example Sentence Validation
  Trigger: D8 found 2 missing target word, 1 too short, 41 FKGL inappropriate
  Rule: Every example sentence MUST contain the target word
        (case-insensitive substring match), have FKGL within ±1.5 of
        the level's target, and be 5-25 words long.

RULE 10 — Topic Diversity
  Trigger: D9 found poor diversity levels: none
  Rule: When generating new units, no single theme may appear in more
        than 2 units per level.

RULE 11 — POS Balance
  Trigger: D10 found imbalances: ['L1: Nouns 7%, Verbs 43%, Adj 45%', 'L2: Nouns 11%, Verbs 78%', 'L3: Nouns 9%, Verbs 70%']
  Rule: After any Phase 2 batch, the per-level POS distribution must
        remain within healthy ranges (nouns 30-60%, verbs 10-40%, adj 5-35%).

RULE 12 — Discovery First (META RULE)
  Every Phase 2 content prompt MUST begin with a schema query
  before any INSERT. Actual column names differ from assumptions:
  - vocabulary uses 'word' not 'english_word'
  - vocabulary uses 'definition_ar' not 'arabic_translation'
  - vocabulary links via reading_id not unit_id
  - active tables: curriculum_readings (not reading_passages),
    curriculum_writing (not writing_prompts), etc.

RULE 13 — Student Work Protection
  Any modification to units with existing student progress must include
  the auto-complete pattern: query affected progress, modify content,
  auto-complete the new version for students who finished the old
  version, preserve grade/XP/timestamp, mark as "تم تلقائياً".

RULE 14 — Atomic Commits
  Each Phase 2 prompt should commit ONE level's content at a time.
  Never batch L2 + L3 + L4 in a single commit. If something is wrong,
  Ali must be able to revert one level cleanly.


---

## Phase 2 Sizing Estimate

| Level | Current Unique | CEFR Target | Net New Needed | Reclaimable | Total Phase 2 Work |
|-------|---------------|-------------|----------------|-------------|---------------------|
| L0    |           169 |         300 |            131 |           0 |                 131 |
| L1    |           177 |         600 |            423 |           0 |                 423 |
| L2    |           255 |       1,200 |            945 |           0 |                 945 |
| L3    |           280 |       2,000 |          1,720 |           0 |               1,720 |
| L4    |           274 |       4,000 |          3,726 |           0 |               3,726 |
| L5    |           334 |       8,000 |          7,666 |           0 |               7,666 |

**Total estimated Phase 2 vocab additions:** ~14,611
**Total estimated Phase 2 passage rewrites:** 137
**Total estimated Phase 2 grammar additions:** TBD (depends on CEFR gap analysis)

---

## Methodology Appendix

- **Tools used:** Python 3, pandas, nltk, textstat, supabase CLI
- **Frequency lists used:** NLTK Brown Corpus (Strategy 3 — proxy for Oxford 3000/5000). Brown corpus contains ~981,716 words from 1960s American English. Top 3000 words used as A1-A2 proxy, top 5000 as B1-B2 proxy. This is a rough approximation — Oxford 3000/5000 would be more accurate.
- **Sample sizes:** 100 for translation quality (D7), 100 for example sentence quality (D8)
- **Claude API calls used:** 0 / 50 (skipped — frequency-based classification used instead)
- **Limitations:**
  - Brown corpus is dated (1960s) and may not reflect modern English usage
  - Grammar prerequisite detection is heuristic (string matching on topic names)
  - passage_content is JSONB — text extraction may miss some content depending on structure
  - FKGL has known limitations for very short texts
  - POS classification depends on the values stored in the database, which may use inconsistent labels
  - Topic diversity categorization is keyword-based and may miss nuances
