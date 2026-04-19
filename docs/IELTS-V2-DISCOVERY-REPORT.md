# IELTS V2 Discovery Report
Generated: 2026-04-17

---

## 1. Database Tables

### Tables that EXIST (15/15 probed — all exist in some form)

| Table | Rows | Status |
|---|---|---|
| ielts_diagnostic | 0 | Empty |
| ielts_reading_passages | 43 | Has content |
| ielts_reading_questions | null (RLS/count blocked) | Exists, count blocked |
| ielts_reading_skills | 16 | Has content |
| ielts_writing_tasks | 25 | Has content |
| ielts_listening_sections | 25 | Has content |
| ielts_listening_questions | null (RLS/count blocked) | Exists, count blocked |
| ielts_speaking_questions | 60 | Has content |
| ielts_speaking_topics | null (RLS/count blocked) | Exists, count blocked |
| ielts_mock_tests | 1 | Diagnostic only |
| ielts_student_results | 0 | Empty |
| ielts_student_progress | null (RLS/count blocked) | Exists, count blocked |
| ielts_error_bank | null (RLS/count blocked) | Exists, count blocked |
| ielts_adaptive_plans | null (RLS/count blocked) | Exists, count blocked |
| ielts_mock_attempts | null (RLS/count blocked) | Exists, count blocked |

### Table Column Details

#### ielts_reading_passages (43 rows)
Columns: `id, passage_number, title, content, word_count, topic_category, difficulty_band, questions (JSON), answer_key (JSON), time_limit_minutes, is_published, created_at`

**⚠️ IMPORTANT:** Questions are stored as a JSON array inside the passage itself — no separate normalized questions table in use. `ielts_reading_questions` table exists but seems unused/empty.

Difficulty band breakdown:
- band_5_6: 14
- band_6_7: 14
- band_7_8: 14
- 5-6: 1 (**⚠️ inconsistent naming — "5-6" vs "band_5_6"**)

#### ielts_reading_skills (16 rows)
Columns: `id, question_type, name_ar, name_en, explanation_ar, strategy_steps, common_mistakes_ar, worked_example, practice_items, timed_practice_items, sort_order, created_at`

All 16 question types catalogued (e.g. table_completion, multiple_choice, etc.)

#### ielts_writing_tasks (25 rows)
Columns: `id, task_type, sub_type, title, prompt, image_url, chart_data, template_structure, key_phrases, model_answer_band6, model_answer_band7, model_answer_band8, rubric, word_count_target, time_limit_minutes, difficulty_band, is_published, sort_order, created_at`

task_type breakdown: task1: 12, task2: 13  
difficulty_band breakdown: 5-6: 1, 5.5-6.5: 5, 6.0-7.0: 12, 6.5-7.5: 7

#### ielts_listening_sections (25 rows)
Columns: `id, test_id, section_number, title, audio_url, audio_duration_seconds, transcript, speaker_count, accent, context_description, questions (JSON), answer_key (JSON), is_published, sort_order, created_at, audio_generated_at, voice_id`

section_number breakdown: Section 1: 7, Section 2: 6, Section 3: 6, Section 4: 6  
Audio URLs point to `curriculum-audio` storage bucket (already generated via ElevenLabs).

#### ielts_speaking_questions (60 rows)
Columns: `id, part, topic, questions (JSON), cue_card, follow_up_questions, model_answer_audio_url, model_answer_text, useful_phrases, band_descriptors, is_published, sort_order, created_at`

part breakdown: Part 1: 20, Part 2: 20, Part 3: 20

#### ielts_mock_tests (1 row)
Columns: `id, test_number, title_ar, title_en, reading_passage_ids (JSON array), listening_test_id, writing_task1_id, writing_task2_id, speaking_questions (JSON), total_time_minutes, is_published, created_at`

Only row is test_number=0: "IELTS Diagnostic — Placement Test" / "اختبار تشخيصي — تحديد المستوى"  
**No full mock tests (tests 1–5) exist yet.**

#### ielts_student_results (0 rows)
Exists, schema unknown (empty).

### Tables missing from V2 spec (not in DB at all)
None — all 15 candidate tables exist. However, many have 0 or null rows and some have blocked counts.

---

## 2. Content Inventory

### Reading
- Passages: **43 total**
  - band_5_6: 14 | band_6_7: 14 | band_7_8: 14 | 5-6 (mislabeled): 1
  - Questions embedded as JSON in `questions` column per passage
- Reading skills: **16 question types** catalogued

### Writing
- Tasks: **25 total**
  - Task 1: 12 | Task 2: 13
  - difficulty: 5-6: 1 | 5.5-6.5: 5 | 6.0-7.0: 12 | 6.5-7.5: 7
  - Model answers for bands 6, 7, 8 stored per task

### Listening
- Sections: **25 total** across sections 1–4
  - Section 1: 7 | Section 2: 6 | Section 3: 6 | Section 4: 6
  - Audio: generated via ElevenLabs, stored in `curriculum-audio` bucket
  - Questions embedded as JSON per section

### Speaking
- Questions: **60 total**
  - Part 1: 20 | Part 2: 20 | Part 3: 20

### Diagnostic
- Mock tests: **1 total** (diagnostic/placement only, test_number=0)
- Full mock tests (1–5): **0**

---

## 3. Code Inventory

### Routes

| Path | Component | Gated? | File |
|---|---|---|---|
| /admin/curriculum/ielts | IELTSManagement | Admin only | src/pages/admin/curriculum/IELTSManagement.jsx |

**No student-facing IELTS routes exist.** No reading lab, listening lab, speaking lab, mock test, or adaptive plan route.

### Student pages
No dedicated IELTS student pages. The only IELTS student-facing code is inside:
- `src/pages/student/StudentWritingLab.jsx` — IELTS Task 1 & Task 2 tabs (access-gated)

### Admin pages

| File | LOC | Purpose |
|---|---|---|
| src/pages/admin/curriculum/IELTSManagement.jsx | 229 | Tab router for the 5 sub-managers |
| src/pages/admin/curriculum/components/IELTSReadingManager.jsx | 138 | Manage reading passages |
| src/pages/admin/curriculum/components/IELTSWritingManager.jsx | 178 | Manage writing tasks |
| src/pages/admin/curriculum/components/IELTSListeningManager.jsx | 145 | Manage listening sections |
| src/pages/admin/curriculum/components/IELTSSpeakingManager.jsx | 155 | Manage speaking questions |
| src/pages/admin/curriculum/components/IELTSMockTestManager.jsx | 174 | Manage mock tests |
| **TOTAL** | **1019** | |

### Components
No IELTS-specific components in `src/components/`. All IELTS logic is embedded in admin manager components and the writing lab.

### Edge Functions

| Function | IELTS-relevant? | Notes |
|---|---|---|
| evaluate-writing | ✅ Partial | Used by writing lab for IELTS Task 1 & 2; CEFR rubric |
| evaluate-speaking | ✅ Partial | Used by curriculum speaking lab; can be adapted |
| whisper-transcribe | ✅ Partial | Standalone Whisper edge function |
| ai-submission-feedback | ✅ Partial | Uses Whisper + OpenAI internally |

**No IELTS-specific edge functions exist** (`evaluate-ielts-writing`, `evaluate-ielts-speaking`, `generate-ielts-report` — all absent).

---

## 4. Navigation

- **Student nav:** No IELTS entry anywhere (sidebar, drawer, or mobile bar)
- **Trainer nav:** No IELTS entry
- **Admin nav:** `/admin/curriculum` route exists (links to general curriculum page); IELTS sub-route `/admin/curriculum/ielts` exists but is NOT listed in admin nav config — reachable by direct URL only

---

## 5. Gating

### Current gating logic for IELTS
```js
// In StudentWritingLab.jsx
const hasIELTSAccess =
  studentData.package === 'ielts' ||
  (Array.isArray(studentData.custom_access) && studentData.custom_access.includes('ielts_writing'))
```

Only the writing lab has any IELTS gating. No other student IELTS features exist to gate.

### Package enum — current values
Observed in production: `private`, `asas`, `talaqa`, `tamayuz`

**⚠️ CRITICAL GAP:** `ielts` is NOT a valid package enum value. Adding a student with `package='ielts'` will fail at the DB level. The enum must be extended.

### fardi (VIP) package
`fardi` does not exist — VIP is called `private`. No IELTS access implied by any package currently.

---

## 6. Students

- **IELTS students (package='ielts' OR track='ielts'):** 0
- Students table has columns: `ielts_phase` (nullable), `track` (text, currently "foundation" etc.)
- No student has been enrolled in IELTS yet

---

## 7. Dependencies

| Dependency | Status |
|---|---|
| ElevenLabs API key | ✅ Configured (ELEVENLABS_API_KEY in .env) |
| Whisper / OpenAI API key | ✅ Configured (used in ai-submission-feedback + whisper-transcribe) |
| IELTS audio storage bucket | ❌ None — curriculum-audio bucket used instead |
| IELTS speaking submissions bucket | ❌ None |
| ai_usage rows | 169 (tracking writing/speaking eval costs) |

---

## 8. Gaps (what's missing for V2)

### Schema / Data
1. `ielts` package value missing from DB enum — **blocker**
2. `ielts_mock_tests`: only 1 diagnostic; no full mock tests (1–5)
3. `ielts_student_results` / `ielts_student_progress` / `ielts_mock_attempts` / `ielts_error_bank` / `ielts_adaptive_plans` — all exist but empty / unverified columns
4. Difficulty band naming inconsistency in reading passages (`band_5_6` vs `5-6`)
5. No IELTS-specific storage buckets (ielts-audio, ielts-speaking-submissions, ielts-writing-images)

### Code
6. Zero student-facing IELTS pages — entire student experience is missing:
   - IELTS Dashboard
   - Reading Lab
   - Listening Lab
   - Speaking Lab (dedicated IELTS)
   - Full Mock Test player
   - Adaptive Study Plan
   - Error Bank
   - Band Score Tracker
7. No trainer portal for IELTS students (grading speaking/writing, band feedback)
8. No IELTS entries in student, trainer, or admin navigation
9. No IELTS-specific edge functions (evaluate-ielts-writing, evaluate-ielts-speaking, generate-ielts-report)

---

## 9. Risks / Notes

1. **Package enum blocker:** `ielts` is not in the DB enum. This is the first migration needed before any student can be assigned IELTS.

2. **Reading questions architecture:** Passages store questions as embedded JSON (`questions` column). `ielts_reading_questions` table exists but appears unused/empty. V2 needs to decide: keep embedded JSON or normalize. Embedded JSON works for current admin tools.

3. **Listening questions same issue:** `ielts_listening_questions` table exists but `questions` are embedded as JSON per section in `ielts_listening_sections`. Same decision needed.

4. **curriculum-audio bucket holds IELTS listening audio** — it's mixed with curriculum audio. May want a dedicated `ielts-audio` bucket for separation.

5. **evaluate-writing already supports IELTS** (the StudentWritingLab sends IELTS-scored writing there). This edge function can be extended/reused, not rebuilt.

6. **AdminRecordings.jsx** already has 'ielts' as a filter option — shows someone anticipated IELTS recordings.

7. **AdminStudents.jsx** has special handling for `package !== 'ielts'` — shows conditional UI was planned.

8. **0 IELTS students enrolled** — all V2 work is greenfield on the student side. No migration risk for existing student data.

9. **`ielts_reading_questions`, `ielts_listening_questions`, `ielts_speaking_topics`, `ielts_student_progress`, `ielts_error_bank`, `ielts_adaptive_plans`, `ielts_mock_attempts`** return null row counts (not 0). This could mean: (a) RLS policies blocking the service-role count, or (b) these tables exist with different schema than expected. Verify column structure before building on them.
