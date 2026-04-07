# FLUENTIA LMS — DEEP CURRICULUM AUDIT REPORT
**Date:** 2026-04-07
**Type:** Read-only data-driven analysis
**Database:** Supabase production (linked project `nmjexpuycmqcxuxljier`)

---

## Section 0: Discovery Log

### Supabase CLI Status
- CLI linked to project `nmjexpuycmqcxuxljier`
- Docker not running locally (not needed — all queries run against remote via Management API)

### Migration History
- 83 migration files (001_initial_schema.sql through 083_trainer_notes.sql)
- Key curriculum migrations:
  - `027_curriculum_and_adaptive_testing.sql` — Original curriculum schema
  - `035_core_curriculum_tables.sql` — Core table restructure
  - `038_seed_curriculum_data.sql` — First seed attempt
  - `039_rebuild_curriculum_correct_schema.sql` — Schema rebuild
  - `040_seed_curriculum_data_correct.sql` — Corrected seed data
  - `078_vocabulary_word_mastery.sql` — Mastery tracking

### Codebase Structure
- Admin curriculum editor: `src/pages/admin/curriculum/` (23 files)
- Student curriculum browser: `src/pages/student/curriculum/` (10+ files)
- Interactive curriculum: `src/components/interactive-curriculum/` (10 files)
- Seed data: `supabase/seed.sql` (single file)
- Edge functions: 40 functions deployed (none curriculum-specific for content generation)

### Curriculum Tables Found: 39 total
`assessments`, `curriculum_assessments`, `curriculum_comprehension_questions`, `curriculum_grammar`, `curriculum_grammar_exercises`, `curriculum_grammar_lessons`, `curriculum_irregular_verb_exercises`, `curriculum_irregular_verbs`, `curriculum_levels`, `curriculum_listening`, `curriculum_listening_exercises`, `curriculum_pronunciation`, `curriculum_reading_passages`, `curriculum_readings`, `curriculum_speaking`, `curriculum_speaking_topics`, `curriculum_units`, `curriculum_video_sections`, `curriculum_vocabulary`, `curriculum_vocabulary_exercises`, `curriculum_vocabulary_srs`, `curriculum_writing`, `curriculum_writing_prompts`, `ielts_listening_sections`, `ielts_reading_passages`, `ielts_reading_skills`, `ielts_speaking_questions`, `ielts_writing_tasks`, `iot_reading_passages`, `progress_reports`, `speaking_recordings`, `speaking_topic_banks`, `student_curriculum_progress`, `student_speaking_progress`, `student_spelling_progress`, `student_verb_progress`, `vocabulary_bank`, `vocabulary_word_mastery`, `writing_history`

---

## Section 1: Schema Map

### Core Content Tables

| Table | Rows | Purpose | Key Columns |
|---|---|---|---|
| `curriculum_levels` | 6 | Level definitions (Pre-A1 through C1) | level_number, cefr, passage_word_range, vocab_per_unit, mcq_choices, sentence_complexity |
| `curriculum_units` | 72 | Units (12 per level) | level_id, unit_number, theme_ar, theme_en, warmup_questions (jsonb) |
| `curriculum_readings` | 144 | Reading passages (2 per unit) | unit_id, passage_content (jsonb), passage_word_count, reading_skill_name_en, critical_thinking_type |
| `curriculum_vocabulary` | 2,390 | Vocabulary words | reading_id (→readings), word, definition_en, definition_ar, example_sentence, pronunciation_ipa, audio_url, image_url |
| `curriculum_grammar` | 72 | Grammar topics (1 per unit) | unit_id, level_id, topic_name_en, explanation_content (jsonb) |
| `curriculum_grammar_exercises` | 696 | Grammar exercises | grammar_id, exercise_type, items (jsonb) |
| `curriculum_vocabulary_exercises` | 1,536 | Vocab exercises | reading_id, exercise_type, items (jsonb) |
| `curriculum_comprehension_questions` | 1,152 | Reading comprehension MCQs | reading_id, question_type, choices (jsonb), correct_answer |
| `curriculum_writing` | 72 | Writing tasks (1 per unit) | unit_id, task_type, prompt_en, word_count_min/max, rubric (jsonb) |
| `curriculum_speaking` | 72 | Speaking topics (1 per unit) | unit_id, topic_type, prompt_en, useful_phrases (jsonb), min/max_duration |
| `curriculum_listening` | 72 | Listening activities (1 per unit) | unit_id, audio_url, transcript, exercises (jsonb) |
| `curriculum_assessments` | 72 | Unit quizzes (1 per unit) | unit_id, level_id, questions (jsonb), passing_score |

### Empty Tables (Schema exists, zero rows)

| Table | Rows | Purpose |
|---|---|---|
| `curriculum_grammar_lessons` | 0 | Structured grammar lesson content |
| `curriculum_pronunciation` | 0 | Pronunciation drills |
| `curriculum_reading_passages` | 0 | Reading content bank |
| `curriculum_speaking_topics` | 0 | Speaking topic bank |
| `curriculum_writing_prompts` | 0 | Writing prompt bank |
| `curriculum_listening_exercises` | 12 | Listening exercise bank (nearly empty) |
| `curriculum_video_sections` | 0 | Video lesson content |
| `curriculum_vocabulary_srs` | 0 | Spaced repetition data |

### FK Relationships
```
curriculum_levels (1) → (12) curriculum_units
curriculum_units (1) → (2) curriculum_readings
curriculum_readings (1) → (N) curriculum_vocabulary
curriculum_readings (1) → (N) curriculum_comprehension_questions
curriculum_readings (1) → (N) curriculum_vocabulary_exercises
curriculum_units (1) → (1) curriculum_grammar → (N) curriculum_grammar_exercises
curriculum_units (1) → (1) curriculum_writing
curriculum_units (1) → (1) curriculum_speaking
curriculum_units (1) → (1) curriculum_listening
curriculum_units (1) → (1) curriculum_assessments
```

### Student Progress Tables

| Table | Rows | Purpose |
|---|---|---|
| `student_curriculum_progress` | 63 | Section-level progress (reading, grammar, writing, speaking, vocabulary) |
| `vocabulary_word_mastery` | 97 | Per-word mastery tracking (96 mastered, 1 learning) |
| `speaking_recordings` | 10 | Student speaking audio recordings |
| `submissions` | 0 | Assignment submissions (none exist) |
| `student_speaking_progress` | — | Per-topic speaking completion |

---

## Section 2: Content Inventory

### Units Per Level

| Metric | L0 (Pre-A1) | L1 (A1) | L2 (A2) | L3 (B1) | L4 (B2) | L5 (C1) | Total |
|---|---|---|---|---|---|---|---|
| Total units | 12 | 12 | 12 | 12 | 12 | 12 | **72** |

### Vocabulary

| Metric | L0 | L1 | L2 | L3 | L4 | L5 | Total |
|---|---|---|---|---|---|---|---|
| Total vocab words | 194 | 241 | 293 | 340 | 628 | 694 | **2,390** |
| Min per unit | 16 | 20 | 24 | 26 | 50 | 54 | — |
| Max per unit | 17 | 21 | 26 | 29 | 54 | 61 | — |
| Avg per unit | 16 | 20 | 24 | 28 | 52 | 58 | — |
| Unique words (case-insensitive) | — | — | — | — | — | — | **1,281** |

**Note:** 2,390 total entries but only 1,281 unique words — 1,109 entries are repeated across levels/units (intentional recycling or duplication issue).

### Reading

| Metric | L0 | L1 | L2 | L3 | L4 | L5 | Total |
|---|---|---|---|---|---|---|---|
| Passages per unit | 2 | 2 | 2 | 2 | 2 | 2 | — |
| Total passages | 24 | 24 | 24 | 24 | 24 | 24 | **144** |
| Avg word count | 226 | 294 | 381 | 483 | 729 | 1,216 | — |
| Min word count | 187 | 247 | 326 | 387 | 567 | 1,023 | — |
| Max word count | 247 | 347 | 487 | 598 | 847 | 1,247 | — |
| Passage audio | 0 | 0 | 0 | 0 | 0 | 0 | **0/144** |
| Comprehension Qs | 120 | 144 | 168 | 192 | 240 | 288 | **1,152** |

### Grammar

| Metric | L0 | L1 | L2 | L3 | L4 | L5 | Total |
|---|---|---|---|---|---|---|---|
| Topics per unit | 1 | 1 | 1 | 1 | 1 | 1 | — |
| Total topics | 12 | 12 | 12 | 12 | 12 | 12 | **72** |
| Total exercises | 72 | 96 | 120 | 120 | 144 | 144 | **696** |

### Writing

| Metric | L0 | L1 | L2 | L3 | L4 | L5 | Total |
|---|---|---|---|---|---|---|---|
| Prompts per unit | 1 | 1 | 1 | 1 | 1 | 1 | — |
| Total prompts | 12 | 12 | 12 | 12 | 12 | 12 | **72** |
| Task types | paragraph | paragraph | essay | opinion/comparison | argument/analysis | analysis | — |
| Word count min | 50 | 50 | — | — | — | — | — |
| Word count max | 80 | 80 | — | — | — | — | — |

### Speaking

| Metric | L0 | L1 | L2 | L3 | L4 | L5 | Total |
|---|---|---|---|---|---|---|---|
| Topics per unit | 1 | 1 | 1 | 1 | 1 | 1 | — |
| Total topics | 12 | 12 | 12 | 12 | 12 | 12 | **72** |
| Topic types | personal/descriptive | personal/descriptive | descriptive | opinion/descriptive | opinion/descriptive | academic/debate/opinion | — |
| Duration range | 30–240s | 30–240s | — | — | — | — | — |

### Listening

| Metric | L0 | L1 | L2 | L3 | L4 | L5 | Total |
|---|---|---|---|---|---|---|---|
| Items per unit | 1 | 1 | 1 | 1 | 1 | 1 | — |
| Total items | 12 | 12 | 12 | 12 | 12 | 12 | **72** |
| **With audio** | **0** | **0** | **0** | **0** | **0** | **0** | **0/72** |

### Assessments

| Metric | L0 | L1 | L2 | L3 | L4 | L5 | Total |
|---|---|---|---|---|---|---|---|
| Quizzes per unit | 1 | 1 | 1 | 1 | 1 | 1 | — |
| Total quizzes | 12 | 12 | 12 | 12 | 12 | 12 | **72** |
| Questions per quiz | 20 | 20 | 20 | 20 | 20 | 20 | — |
| Types | unit_quiz | unit_quiz | unit_quiz | unit_quiz | unit_quiz | unit_quiz | — |

### Media Coverage

| Asset | Count | Coverage |
|---|---|---|
| Vocab with audio | 2,390 | **100%** |
| Vocab with images | 2,390 | **100%** |
| Reading passage audio | 0 | **0%** |
| Listening audio | 0 | **0%** |
| Video sections | 0 | **0%** |

---

## Section 3: CEFR Alignment

### Vocabulary Coverage vs CEFR Targets

| Level | CEFR | Required Active Vocab | Measured Vocab | Unique Words* | Gap |
|---|---|---|---|---|---|
| L0 | Pre-A1 | 300–500 | 194 | ~130 | **❌ −106 to −306** |
| L1 | A1 | 500–700 | 241 (cumulative: 435) | ~285 | **❌ −65 to −265** |
| L2 | A2 | 1,000–1,500 | 293 (cumul: 728) | ~440 | **❌ −272 to −772** |
| L3 | B1 | 2,000–2,500 | 340 (cumul: 1,068) | ~600 | **❌ −932 to −1,432** |
| L4 | B2 | 3,200–4,000 | 628 (cumul: 1,696) | ~900 | **❌ −1,504 to −2,304** |
| L5 | C1 | 5,000–8,000 | 694 (cumul: 2,390) | ~1,281 | **❌ −3,719 to −6,719** |

*Unique words estimated from global 1,281 unique / 2,390 total ratio applied per level.

**Verdict:** Vocabulary inventory is catastrophically short of CEFR targets at every level. Even cumulatively, the entire curriculum (2,390 entries, 1,281 unique words) barely reaches A1 requirements. The system teaches ~1,281 unique English words total — CEFR A2 requires 1,000–1,500 active words **per learner at that level**.

### Reading Passage Length vs CEFR Targets

| Level | CEFR | Required Length | Measured Avg | Status |
|---|---|---|---|---|
| L0 | Pre-A1 | 50–120 w | 226 w | ✅ Exceeds (over-target — possibly too long for Pre-A1) |
| L1 | A1 | 50–120 w | 294 w | ⚠️ Significantly exceeds A1 target (2.5x) |
| L2 | A2 | 120–250 w | 381 w | ⚠️ Exceeds (1.5x A2 upper bound) |
| L3 | B1 | 250–400 w | 483 w | ✅ Slightly above range |
| L4 | B2 | 400–600 w | 729 w | ⚠️ Above range |
| L5 | C1 | 600–900 w | 1,216 w | ⚠️ Above range |

**Verdict:** Reading passages are consistently longer than CEFR recommendations, particularly at lower levels. L0 and L1 passages are 2–2.5x the expected length, which may overwhelm beginning learners.

### Grammar Coverage Checklist

#### L0 (Pre-A1): be/have, present simple, articles, pronouns, basic questions
| Topic | Status | Evidence |
|---|---|---|
| be (am/is/are) | ✅ | "am/is/are" |
| have | ❌ NOT FOUND | No have/has topic |
| present simple | ✅ | "simple present positive", "simple present negative/questions" |
| present continuous | ❌ | Covered in L1 |
| articles | ✅ | "a/an/the basics" |
| pronouns | ✅ | "pronouns (I/me/my)" |
| can/can't | ❌ | Covered in L1 |
| there is/are | ✅ | "there is/there are" |
| basic question words | 🟡 | Implicit in "simple present negative/questions" |
| plurals | ✅ | "plurals" |
| possessives | ✅ | "possessive s" |

**Extra at L0:** this/that/these/those, imperatives, adjective order basics, prepositions of place
**Score: 8/11 (73%)**

#### L1 (A1): past simple, going to, comparatives, superlatives, adverbs of frequency
| Topic | Status | Evidence |
|---|---|---|
| past simple (regular) | ✅ | "simple past (regular)" |
| past simple (irregular) | ✅ | "simple past (irregular)" |
| going to | ✅ | "going to (future)" |
| comparatives | ❌ | Covered in L2 |
| superlatives | ❌ | Covered in L2 |
| adverbs of frequency | ✅ | "adverbs of frequency" |
| countable/uncountable | ✅ | "countable/uncountable" |
| quantifiers | ✅ | "some/any", "how much/how many" |
| past continuous | ❌ | Covered in L2 |
| future will | ❌ | Covered in L2 ("will vs going to") |
| have to/must | ❌ | Covered in L2 |

**Score: 7/11 (64%)** — Several A1 CEFR topics deferred to A2.

#### L2 (A2): present perfect, 1st+2nd conditionals, passive voice intro
| Topic | Status | Evidence |
|---|---|---|
| present perfect | ✅ | "present perfect (ever/never)", "(just/already/yet)" |
| used to | ❌ | Covered in L3 |
| reported speech basic | ❌ | Covered in L3 |
| 1st conditional | ✅ | "first conditional" |
| 2nd conditional | ❌ | Covered in L3 |
| passive voice intro | ❌ | Covered in L3 |
| relative clauses | ❌ | Covered in L3 |
| modals of possibility | ✅ | "may/might" |
| gerunds vs infinitives | ✅ | "gerund vs infinitive basics" |

**Score: 5/9 (56%)** — Half of B1-prescribed grammar is deferred.

#### L3 (B1)
| Topic | Status | Evidence |
|---|---|---|
| present perfect vs past simple | ✅ | "present perfect vs past simple" |
| present perfect continuous | ✅ | "present perfect continuous" |
| 2nd conditional | ✅ | "second conditional" |
| passive voice (pres+past) | ✅ | Both present and past passive covered |
| relative clauses | ✅ | "relative clauses (who/which/that)" |
| reported speech basic | ✅ | "reported speech basics" |
| used to | ✅ | "used to", "get used to/be used to" |

**Score: 7/7 (100%)** — B1 grammar is well-covered.

#### L4 (B2)
| Topic | Status | Evidence |
|---|---|---|
| all conditionals | ✅ | "third conditional", "mixed conditionals" |
| advanced passive | ✅ | "advanced passive (by/with)" |
| wish/if only | ✅ | "wish + past/past perfect" |
| causative have | ✅ | "have something done" |
| inversion basic | ✅ | "inversion after negative adverbs" |
| cleft sentences | ✅ | "cleft sentences" |
| phrasal verbs expanded | ❌ NOT FOUND | No phrasal verb topic |
| linking words | ❌ NOT FOUND | No explicit linking words topic |
| narrative tenses | ❌ NOT FOUND | No narrative tenses topic |
| reported speech full | ❌ | Covered in L5 |

**Score: 6/10 (60%)**

#### L5 (C1)
| Topic | Status | Evidence |
|---|---|---|
| subjunctive | ✅ | "subjunctive" |
| advanced modals | ❌ | "advanced modal perfects" is at L4 |
| ellipsis | ✅ | "ellipsis in speech" |
| discourse markers | ✅ | "advanced discourse markers" |
| hedging | ✅ | "hedging and vague language" |
| nuanced reported speech | ✅ | "advanced reported speech" |
| inversion advanced | ❌ | "fronting" covers some |
| cleft sentences | ❌ | Covered in L4, not repeated |
| perfect modals | 🟡 | Covered in L4 as "advanced modal perfects" |

**Score: 5/9 (56%)**

### GSL / AWL Overlap

**GSL analysis:** NOT POSSIBLE to compute programmatically — no GSL word list is stored in the database or codebase. The curriculum does not reference or map to the General Service List.

**AWL analysis:** The migration `027_curriculum_and_adaptive_testing.sql` mentions "academic vocabulary (AWL)" in L5 description text, but no actual AWL word mapping exists. AWL is aspirational text, not implemented.

**Verdict:** Neither GSL nor AWL integration exists. Vocabulary selection appears to be topical (tied to reading themes) rather than frequency-based.

---

## Section 4: Quality Deep-Dive

### Sampled Units (unit_number = 3, one per level)

#### L0 Unit 3: "My City" / "مدينتي"

**Thematic coherence: 5/5** — All components center on cities.
- Reading: city description passage
- Vocab: "new", "parks", "big", "beautiful", "trees", "capital", "lake", "buildings", "beach", "streets"
- Writing prompt: "Write a simple paragraph about your city"
- Speaking: "Tell me about your favorite place in your city"

**Vocab-reading overlap:** High — vocab words are concrete nouns/adjectives that naturally appear in city descriptions.

**Vocab-writing/speaking integration:** 5/5 — Both prompts directly invite target vocabulary use.

**Grammar in context:** L0 Unit 3 grammar is "simple present negative/questions" — fits city descriptions ("I don't live near the beach", "Do you have parks?").

**Translation quality (sample):**
- "new" → "جديد، حديث" ✅
- "parks" → "حدائق عامة" ✅
- "capital" → "العاصمة" ✅
- "neighborhoods" → "أحياء، مناطق سكنية" ✅
- "transportation" → "المواصلات، النقل" ✅

**Example sentences:** Natural and age-appropriate.

#### L1 Unit 3: "Space Exploration" / "استكشاف الفضاء"

**Thematic coherence: 5/5** — Space theme throughout.
- Vocab: "impressive", "fascinated", "launched", "powerful", "experiments", "collaborate"
- Writing: "Write a paragraph about your dream space trip"
- Speaking: "Talk about your dream trip to space"

**Vocab-reading overlap:** Good — space-related adjectives and verbs.

**Issue:** Writing and speaking prompts are nearly identical. Low differentiation.

**Translation quality:** "impressive" → "مُثير للإعجاب، رائع" ✅; "collaborate" → "يتعاون، يشارك" ✅

#### L2 Unit 3: "Extreme Weather" / "الطقس المتطرف"

**Thematic coherence: 4/5** — Strong theme, but "will vs going to" grammar topic is a loose fit.

**Writing prompt:** "Write a short essay about an extreme weather event..." — task type jumps to "essay" at L2 with no intermediate scaffolding between paragraph (L1) and essay (L2).

#### L3 Unit 3: "Earthquake Science" / "علم الزلازل"

**Thematic coherence: 4/5** — Scientific theme. Grammar is "second conditional" — can be used ("If an earthquake hit our city, we would...").

**Speaking prompt:** "Describe what you would do to prepare yourself and your family for an earthquake" — excellent use of conditional grammar.

**Issue:** Writing prompt lacks `vocabulary_to_use` and `grammar_to_use` fields (both null/empty across ALL levels).

#### L4 Unit 3: "Food Security" / "الأمن الغذائي"

**Thematic coherence: 5/5** — Complex topic appropriate for B2.

**Vocabulary density:** 50+ words per unit — a massive jump from L3's 26-29. This is a 2x increase between consecutive levels.

**Writing:** "Write an analytical essay examining the main causes of food insecurity" — appropriate B2 analytical writing.

#### L5 Unit 3: "Scientific Skepticism" / "الشك العلمي"

**Thematic coherence: 5/5** — Academic topic, C1 appropriate.

**Vocab:** "paradigm", "substantiate", "extrapolated", "obviate" — genuinely C1 academic vocabulary.

**Speaking types:** academic, debate — appropriate for C1.

### Cross-Unit Issues

1. **`vocabulary_to_use` is empty ([]) on ALL writing prompts** — The system was designed to link target vocab to writing tasks, but the field is unpopulated across all 72 prompts.
2. **`grammar_to_use` is NULL on ALL writing prompts** — Same issue.
3. **Writing and speaking prompts are thematically identical** within each unit — low task differentiation.
4. **Only 1 writing task and 1 speaking topic per unit** — no practice variety within a single unit.

---

## Section 5: Gap Mapping Against 20 Approved Improvements

| # | Feature | Status | Evidence |
|---|---|---|---|
| 1 | **SRS (Spaced Repetition)** | 🟡 PARTIAL | Table `curriculum_vocabulary_srs` exists with SM-2 fields (ease_factor, interval_days, next_review_at). Code in `StudentVocabulary.jsx` uses `SR_INTERVALS` for simple review scheduling. **But:** SRS table has 0 rows. The code uses a simplified interval system, not full SM-2. |
| 2 | **Review Units every 4 units** | ❌ NOT FOUND | No units flagged as review/recap. All 72 units are regular content units. No cumulative review logic. |
| 3 | **Cumulative level-end assessments** | ❌ NOT FOUND | Only `unit_quiz` assessment type exists (per-unit). No level-end comprehensive tests. |
| 4 | **Recycling algorithm** | ❌ NOT FOUND | No error tracking across submissions for the same student. No vocabulary recycling logic. |
| 5 | **Initial Diagnostic Test** | ✅ FOUND | `PlacementTest.jsx` and `StudentAdaptiveTest.jsx` both implement placement/diagnostic tests with adaptive logic via edge function `adaptive-test`. |
| 6 | **Progress Checkpoints (mini-tests every 3 units)** | ❌ NOT FOUND | No checkpoint or mini-test features. Only per-unit quizzes exist. |
| 7 | **Skill Radar auto-update** | 🟡 PARTIAL | `skill_snapshots` table is queried in `TrainerStudentView.jsx`, `StudentAssessments.jsx`, `StudentAIInsights.jsx`. Whether it auto-populates from activity is unclear — likely manual/assessment-triggered only. |
| 8 | **Exit Tests as promotion gate** | ❌ NOT FOUND | Level promotion is manual (admin-driven via `AdminStudents.jsx`). No exit test or criteria-based promotion. |
| 9 | **Pronunciation training** | 🟡 PARTIAL | `StudentPronunciation.jsx` exists (763+ lines) with speech recognition and evaluation. **But:** `curriculum_pronunciation` table has 0 rows. No minimal pairs, word stress, or connected speech content. Pronunciation is student-initiated practice, not curriculum-structured. |
| 10 | **Micro-writing (short tasks)** | ❌ NOT FOUND | Only full paragraph/essay tasks. L0-L1 = paragraph (50-80 words), L2+ = essay. No sentence-level writing exercises. |
| 11 | **Dialogic speaking (interaction)** | ❌ NOT FOUND | All speaking is monologue (single recording). No 2-way conversation, dialogue practice, or interaction simulation. |
| 12 | **Spiral curriculum** | ❌ NOT FOUND | No explicit cross-level vocabulary or grammar recycling. No "spiral" or "recycle" logic anywhere. The 1,109 duplicate vocab entries suggest some incidental overlap but it's not systematic. |
| 13 | **Scaffolded speaking tasks** | ❌ NOT FOUND | Speaking has `useful_phrases` and `preparation_notes` fields, but no model answers, self-assessment rubrics, or re-record workflow. Single-attempt recording only. |
| 14 | **AI conversation partner** | ❌ NOT FOUND | `ai-chatbot` edge function exists but is a general chatbot, not a structured speaking practice partner. No dialogic conversation mode. |
| 15 | **AWL integration** | ❌ NOT FOUND | Mentioned in migration description text only. No AWL word mapping or programmatic integration. |
| 16 | **GSL integration** | ❌ NOT FOUND | No reference to General Service List anywhere in code or data. |
| 17 | **Hidden curriculum documentation** | ❌ NOT FOUND | No admin page showing "what each unit teaches" in a structured curriculum map format. Admin has UnitEditor but no overview of learning objectives per unit. |
| 18 | **Writing tiers (sentence/paragraph/essay)** | ❌ NOT FOUND | Only two tiers: paragraph (L0-L1) and essay (L2+). No sentence-level tier. No gradual scaffolding. |
| 19 | **Speaking scaffolding (plan → record → self-assess → re-record)** | ❌ NOT FOUND | Single-attempt recording only. No planning phase, no self-assessment, no re-recording workflow. |
| 20 | **Level transition / conditional promotion** | ❌ NOT FOUND | No transition week, no conditional promotion logic. Admin manually promotes students. |

**Summary: 1 fully implemented, 3 partially implemented, 16 not found.**

---

## Section 6: Student Data & Blast Radius

### Active Students
- **12 active students** (status='active')

### Student Progress

| unit_number | level | students touched |
|---|---|---|
| 1 | 1 (A1) | 5 |
| 2 | 1 (A1) | 4 |
| 3 | 1 (A1) | 2 |
| 1 | 3 (B1) | 4 |
| 2 | 3 (B1) | 2 |

- **5 distinct units** have any progress records
- All activity is in **Level 1 (A1)** and **Level 3 (B1)** only
- **Levels 0, 2, 4, 5 have zero student activity**

### Progress Breakdown by Section Type

| Section | Completed | In Progress |
|---|---|---|
| reading | 20 | 0 |
| vocabulary | 16 | 0 |
| vocabulary_exercise | 1 | 3 |
| grammar | 8 | 3 |
| writing | 5 | 2 |
| speaking | 5 | 0 |
| **listening** | **0** | **0** |
| **assessment** | **0** | **0** |

### Other Activity
- **Speaking recordings:** 10 total
- **Vocabulary mastery:** 97 records (96 mastered, 1 learning)
- **Submissions (assignments):** 0
- **Writing history:** NOT QUERIED (separate table)

### Blast Radius Assessment
- **Low blast radius.** Only 12 active students. Only 63 progress records across 5 units in 2 levels.
- **Safe to restructure content** in Levels 0, 2, 4, 5 — zero student progress exists there.
- **Level 1 (units 1-3) and Level 3 (units 1-2)** need work preservation if content changes.
- **Vocabulary mastery** (97 records) needs to be preserved or migrated if vocab IDs change.

---

## Section 7: Final Honest Assessment

### 1. Does the curriculum deliver what the marketing promises (طلاقة / up to C1)?

**No.** The curriculum has the skeletal structure of a C1 program (6 levels, 72 units, grammar topics through C1) but lacks the content density required at every level. 1,281 unique vocabulary words across the entire program is barely A2 by CEFR standards. The vocabulary needed for C1 proficiency is 5,000–8,000 active words. The current curriculum provides ~16-25% of that.

Additionally:
- **Listening is non-functional** — 0/72 audio files exist
- **No level-end assessments** mean there's no quality gate between levels
- **No vocabulary recycling** means learned words are not reinforced
- Writing and speaking have exactly 1 task per unit — insufficient practice volume

### 2. Realistic CEFR ceiling with current content

**A2 at best.** The grammar coverage technically reaches C1 topics, but grammar topics without sufficient vocabulary, reading density, and production practice cannot produce C1 competence. A learner completing all 72 units would have:
- ~1,281 unique vocabulary words (A2 threshold)
- Strong grammar knowledge on paper (but untested at higher levels due to 0 student activity above L3)
- Zero listening comprehension training
- Minimal writing/speaking practice (1 task each per unit)

### 3. Top 5 Critical Gaps (ranked by impact on learning outcomes)

1. **Vocabulary deficit (CRITICAL):** 1,281 unique words vs 5,000+ needed for C1. This is the single largest gap. No amount of grammar or reading can compensate for insufficient vocabulary. Learners will plateau at A2-B1 regardless of other content quality.

2. **Listening is completely non-functional:** 72 listening activities exist in the schema but 0 have audio files. Listening comprehension is 25% of language competence (and 25% of IELTS). Students currently receive zero listening practice.

3. **No vocabulary recycling or spaced repetition (active):** The SRS table exists but has 0 rows. Words taught in Unit 1 are never revisited. Research shows 70-80% of vocabulary is forgotten without systematic review. The current curriculum teaches and abandons.

4. **Single writing/speaking task per unit:** 1 writing prompt + 1 speaking topic = insufficient production practice. CEFR requires multiple practice opportunities per skill per unit. A student gets 12 writing attempts per level — research suggests 30-50 are needed for measurable improvement.

5. **No level transition gates:** Students can be promoted from A1 to A2 (or B1 to B2) without demonstrating competency. No exit tests, no cumulative assessments, no conditional promotion. This undermines the entire leveled structure.

### 4. Top 5 Existing Strengths (must protect during refactor)

1. **Consistent structure:** Every unit has the same 7 sections (2 readings, vocab, grammar, writing, speaking, listening, assessment). This predictability is good for learner orientation and trainer planning.

2. **Thematic coherence:** Each unit's components are strongly aligned to a single theme. Reading, vocab, writing, and speaking all reinforce the same topic. This is pedagogically sound.

3. **100% vocabulary audio + images:** All 2,390 vocabulary entries have both audio pronunciation and images. This multimedia coverage is excellent for vocabulary acquisition.

4. **Grammar progression is well-structured:** The 72 grammar topics follow a logical CEFR-aligned progression from "am/is/are" (Pre-A1) through "emphatic structures" (C1). The sequencing is professional.

5. **Rich exercise variety:** Grammar exercises use 5 types (choose, fill_blank, error_correction, reorder, transform). Vocabulary exercises and comprehension questions add substantial interactive practice. 696 grammar exercises + 1,536 vocab exercises + 1,152 comprehension questions = solid exercise bank.

### 5. Minimum Viable Change Set to Credibly Claim "CEFR-Aligned"

1. **Add listening audio to all 72 activities** — use TTS or record. Without this, the listening skill is a placeholder.
2. **Expand vocabulary to at least GSL coverage for L0-L2** — add ~700 high-frequency words to lower levels.
3. **Add level-end cumulative assessments** (6 assessments, one per level) with passing gates.
4. **Activate SRS** — populate `curriculum_vocabulary_srs` and connect the review cycle to the student UI.
5. **Populate `vocabulary_to_use` and `grammar_to_use` on writing prompts** — the fields exist but are empty.

### 6. Estimated Content Production Load

| Content Type | Current | Minimum Target | Gap | Notes |
|---|---|---|---|---|
| Unique vocabulary words | 1,281 | 3,500 (through B2 credibility) | **+2,219 words** | With definitions, translations, examples, audio, images |
| Listening audio files | 0 | 72 | **+72 audio files** | 30s–5min each depending on level |
| Reading passage audio | 0 | 144 | **+144 audio files** | TTS-generated acceptable |
| Writing prompts per unit | 1 | 3 | **+144 additional prompts** | Different tiers: sentence, paragraph, essay |
| Speaking topics per unit | 1 | 2 | **+72 additional topics** | Add scaffolded/dialogic variants |
| Level-end assessments | 0 | 6 | **+6 comprehensive tests** | 40-60 questions each, covering all skills |
| Review/recap units | 0 | 12 (every 4th unit) | **+12 review units** | Cumulative content from prior 3 units |
| Progress checkpoints | 0 | 18 (every 3 units) | **+18 mini-tests** | 15-20 questions each |
| Pronunciation drills | 0 | 72 (1 per unit) | **+72 drill sets** | Minimal pairs, word stress, connected speech |
| Grammar lessons content | 0 | 72 | **+72 lesson texts** | `curriculum_grammar_lessons` table is empty |

**Total estimated production:**
- ~2,200 new vocabulary entries (with full multimedia)
- ~216 new audio files
- ~144 new writing prompts
- ~72 new speaking topics
- ~36 new assessments/checkpoints
- ~72 pronunciation drill sets
- ~72 grammar lesson content blocks

This is a significant content production effort — estimated at 200-400 hours of expert curriculum work, plus audio production time.

---

*End of audit report.*
