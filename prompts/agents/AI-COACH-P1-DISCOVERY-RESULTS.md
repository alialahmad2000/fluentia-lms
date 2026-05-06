# AI Coach Phase 1 — Discovery Results

> Generated: 2026-05-06 | Branch: main | Supabase ref: nmjexpuycmqcxuxljier
> READ-ONLY — no schema changes, no edge function calls, no UI modifications

---

## 1. Foundation Writing Tasks

### Tables

| Table | Rows | Used for |
|---|---|---|
| `curriculum_writing` | 72 | Foundation writing task definitions (1 per unit per level) |
| `curriculum_writing_prompts` | unknown | Legacy free-form prompt bank (level-based, not unit-linked) |
| `student_curriculum_progress` (section_type='writing') | 49+ with draft | Student writing submissions + AI feedback storage |
| `writing_history` | 3 | Legacy sentence_building evaluations (very early feature, mostly unused) |
| `ielts_writing_tasks` | — | IELTS Lab only — NOT touched in this phase |

### Columns of `curriculum_writing`

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| unit_id | uuid | NO |
| task_number | integer | YES |
| task_type | text | NO |
| title_en | text | NO |
| title_ar | text | YES |
| prompt_en | text | NO |
| prompt_ar | text | YES |
| **hints** | **jsonb** | **YES** — pre-written hints already in DB |
| word_count_min | integer | YES |
| word_count_max | integer | YES |
| **vocabulary_to_use** | **jsonb** | **YES** — target vocab list per task |
| **grammar_to_use** | **jsonb** | **YES** — grammar pattern list per task |
| **model_answer** | **text** | **YES** — model answer available |
| **rubric** | **jsonb** | **YES** — scoring rubric per task |
| difficulty | text | YES |
| is_published | boolean | YES |
| sort_order | integer | YES |

> **Key insight:** `curriculum_writing` is already rich. `hints`, `vocabulary_to_use`, `grammar_to_use`, `model_answer`, and `rubric` are all populated — the pre-task briefing can be built almost entirely from existing data with minimal AI generation.

### Columns of `student_curriculum_progress` (writing-relevant)

Stored in `answers` jsonb: `{ "draft": "<student text>", "wordCount": N, "lastSavedAt": "..." }`
AI feedback stored in `ai_feedback` jsonb. Evaluation tracked via `evaluation_status`, `evaluation_attempts`, `evaluation_last_attempt_at`, `evaluation_last_error`, `evaluation_completed_at`, `escalated_to_trainer_at`.

### Last 30 days activity
- **Total writing tasks defined:** 72 (12 per level × 6 levels: L0–L5)
- **Total submissions (completed_at set):** 42
- **Rows with draft text > 10 chars:** 49 (includes in-progress)

### Sample student trace
Student: [REDACTED, id=de70db0c-…] — most active writer

| # | unit_id | status | score | has_feedback | eval_status | completed_at |
|---|---|---|---|---|---|---|
| 1 | 1de8e161-… | completed | null | ✅ | completed | 2026-04-12 |
| 2 | 79f8500f-… | completed | null | ✅ | completed | 2026-04-05 |
| 3 | aa6e8325-… | completed | null | ✅ | completed | 2026-03-30 |
| 4 | 55d40057-… | completed | null | ✅ | completed | 2026-03-22 |
| 5 | 542c8884-… | completed | null | ✅ | completed | 2026-03-16 |

> Note: `score` column null on all — `ai_feedback.fluency_score` is the used value, but it's not being written back to `score`. This is a pre-existing quirk, not a blocker.

---

## 2. Foundation Speaking Tasks

### Tables

| Table | Rows | Used for |
|---|---|---|
| `curriculum_speaking` | 72 | Foundation speaking topic definitions |
| `speaking_recordings` | 36 (last 30d: 35) | Student recordings + AI evaluation |

### Columns of `curriculum_speaking`

| Column | Type | Key content |
|---|---|---|
| id, unit_id | uuid | — |
| topic_type | text | personal, descriptive, narrative, opinion, discussion |
| title_en/ar | text | Task title |
| prompt_en/ar | text | The speaking prompt |
| **preparation_notes** | **jsonb** | **Pre-written prep notes — already populated** |
| **useful_phrases** | **jsonb** | **Useful phrases list — already populated** |
| **evaluation_criteria** | **jsonb** | **Scoring rubric per task** |
| min/max_duration_seconds | integer | Expected recording length |
| model_audio_url | text | Model audio (currently null) |

> **Key insight:** `preparation_notes` and `useful_phrases` are pre-written for every task — the pre-task briefing for speaking also needs minimal new AI work.

### Last 30 days activity
- **Total speaking tasks defined:** 72 (12 per level × 6 levels)
- **Total recordings last 30d:** 35 (all 35 have AI evaluation — 100% completion rate)
- **Audio format in use:** `audio/wav` (RecordRTC + Safari. NOT webm for this student cohort)

### Sample student trace
Student: [REDACTED, id=de70db0c-…]

| # | unit | q_idx | audio_format | duration(s) | overall_score | eval_status | created |
|---|---|---|---|---|---|---|---|
| 1 | aa6e83-… | 0 | audio/wav | 32 | 7.0 | completed | 2026-05-05 |
| 2 | 79f850-… | 0 | audio/wav | 40 | 6.3 | completed | 2026-04-26 |
| 3 | 738ff2-… | 0 | audio/wav | 50 | 5.9 | completed | 2026-04-22 |
| 4 | 85aabe-… | 0 | audio/wav | 46 | 6.0 | completed | 2026-04-16 |
| 5 | 55d400-… | 0 | audio/wav | 43 | 6.4 | completed | 2026-04-13 |

> Note: `speaking_recordings` has NO `transcript` column. Transcripts are stored inside `ai_evaluation` jsonb as `ai_evaluation.transcript`. Keep this in mind for Practice Mode — partial transcripts can't be stored as a dedicated column without a migration.

---

## 3. ai_student_profiles

- **Exists?** YES — table exists with correct schema
- **Rows:** **0** — the table has never been populated for any student
- **Schema:**

| Column | Type |
|---|---|
| id | uuid |
| student_id | uuid |
| **skills** | **jsonb** — `{ grammar, vocabulary, fluency, speaking, ... }` |
| **strengths** | **text[]** |
| **weaknesses** | **text[]** |
| **tips** | **text[]** |
| summary_ar | text |
| summary_en | text |
| raw_analysis | jsonb |
| generated_at | timestamptz |

- **No `is_latest` column** — single profile per student (overwritten on regeneration, `generated_at` is the freshness marker)
- **Coverage:** 0 students out of 18 active have a profile
- **Generator:** `generate-ai-student-profile` edge function exists (collects ALL student data → Claude → upserts profile). It has NOT been triggered in production.
- **Alternative fallback for pre-task briefing:** `students.ai_insight_cache` (jsonb) + `ai_insight_generated_at` — populated for some students by `student-insight-ai` function. This is a lighter alternative if full profiling is too slow.

---

## 4. Submission Tables Deep-Dive

### `student_curriculum_progress` (writing)

**Full schema:** 40 columns — see Section 1. Key eval-related: `evaluation_status` (pending/evaluating/completed/failed/escalated), `evaluation_attempts`, `evaluation_last_attempt_at`, `evaluation_last_error`, `evaluation_completed_at`, `escalated_to_trainer_at`.

**Indexes:**
`idx_writing_pending_eval`, `scp_unique_writing`, `scp_unique_unit_section`, `idx_progress_student`, `idx_progress_unit`

**RLS policies:**
- `students_own_progress` — ALL for authenticated students on their own rows
- `service_progress` — ALL for public (service role)
- `staff_read_progress` — SELECT for trainers/admins
- `Trainers can grade student progress` — UPDATE for authenticated trainers
- `students_same_group_progress_select` — SELECT peer visibility within group

**Sample row:** `answers.draft = "My favorite sea animal is the dolphin because..."` (82 words), `ai_feedback` has `errors[]`, `vocabulary_upgrades[]`, `corrected_text`, `overall_comment_ar`, `improvement_tip`, scores.

### `speaking_recordings`

**Full schema:** 30 columns. Key: `audio_path` (storage path), `audio_format` (wav/webm/mp4), `ai_evaluation` (full jsonb), `evaluation_status` (pending/evaluating/completed/failed_retrying/failed_manual), `evaluation_attempts`, `last_attempt_at`, `last_error`. NO `transcript` column.

**Indexes:** `idx_speaking_eval_sweep`, plus standard pkey and student/unit indexes.

**RLS policies:**
- `students_insert_own_recordings`, `students_select_own_recordings`, `students_update_own_recordings`
- `students_same_group_recordings_select` — peer visibility
- `trainers_select_group_recordings`, `trainers_update_group_recordings`
- `admin_all_recordings` — ALL for admins

---

## 5. UI Components

### Foundation Writing

- **Primary student component:** `src/pages/student/curriculum/tabs/WritingTab.jsx`
  - Calls `ai-writing-feedback` edge function (queue mode via `progress_id`)
  - Has `WritingAssistant` sub-component already mounted (`assistantOpen` state toggle)
  - Has `WritingFeedback` for displaying returned evaluation
  - Tracks `evalStatus` (`pending|evaluating|completed|failed|escalated`) in local state
  - Realtime-aware: uses `evaluation_status` from SCP row

- **WritingAssistant sub-component:** `src/components/curriculum/WritingAssistant.jsx`
  - **ALREADY EXISTS and is WIRED.** Calls `ai-writing-assistant` edge function
  - 7 actions: `ideas`, `outline`, `starters`, `vocab_help`, `continue`, `expand`, `fix_grammar`
  - This IS Feature 2 (mid-task hints) — **partially built already**
  - **Missing:** usage cap enforcement (no limit on how many times it's called)

- **Trainer view:** `src/components/interactive-curriculum/InteractiveWritingTab.jsx`
  - READ-ONLY student progress view for trainer — no AI calls

- **Route:** Mounted via `src/pages/student/curriculum/UnitContent.jsx` under the 'writing' tab switch at `/student/curriculum/unit/:unitId`

- **IELTS writing — SEPARATE:** `src/pages/student/StudentWritingLab.jsx` + `src/hooks/ielts/useWritingLab.js` call `evaluate-writing`. **Do NOT touch these.**

### Foundation Speaking

- **Primary student component:** `src/pages/student/curriculum/tabs/SpeakingTab.jsx`
  - Uses `VoiceRecorder.jsx` which calls `evaluate-speaking` (Layer 1 retry + Realtime subscription added 2026-05-05)
  - Shows `AIEvaluationCard` with full feedback (grammar/vocab/fluency/task scores + errors)

- **Route:** Also mounted via `UnitContent.jsx` at `/student/curriculum/unit/:unitId` under 'speaking' tab

- **IELTS speaking — SEPARATE:** `evaluate-ielts-speaking` edge function. **Do NOT touch.**

---

## 6. Edge Functions Current State

### `ai-writing-feedback` (Foundation writing evaluator)
- **Model:** `claude-sonnet-4-20250514`
- **max_tokens:** 4096
- **Temperature:** not set (default ~1.0) — ⚠️ no temperature control
- **AbortController timeout:** 55s on Claude call
- **Input (queue mode):** `{ progress_id: uuid }` — reads `answers.draft` from SCP
- **Input (frontend mode):** `{ writing_text, writing_prompt?, assignment_type?, student_level?, student_name? }`
- **Output:** `{ overall_score, grammar_score, vocabulary_score, structure_score, fluency_score, corrected_text, errors[], vocabulary_upgrades[], model_sentences[], strengths_ar[], improvements_ar[], strengths, improvement_tip, overall_comment_ar, overall_comment_en }`
- **Student context passed?** Level only (from `students.academic_level`). No past performance. No ai_student_profile.
- **Quota check:** YES — rate-limited per package (asas:2, talaqa:4, tamayuz:8, ielts:8 per month) + monthly budget cap
- **Student notification on completion:** YES — `writing_evaluated` notification (added 2026-05-06)

### `evaluate-speaking` (Foundation speaking evaluator)
- **Model:** `claude-sonnet-4-6` (Whisper-1 for transcription)
- **max_tokens:** 4096
- **Temperature:** 0.2
- **AbortController timeout:** 60s each on Whisper + Claude
- **Input:** `{ recording_id: uuid, source?: 'sweeper' }`
- **Output:** `{ overall_score, grammar_score, vocabulary_score, fluency_score, task_completion_score, analysis{ strengths[], weaknesses[] }, score_justification, corrected_transcript, errors[], better_expressions[], fluency_tips[], model_answer, strengths, improvement_tip, feedback_ar, feedback_en }`
- **Student context passed?** `academic_level` derived from `students.academic_level` OR `groups.level`. CEFR rubric per level included in prompt. No ai_student_profile.
- **Quota check:** NO explicit per-student quota — only the monthly budget cap via `ai_usage` table

### `evaluate-writing` (IELTS Writing Lab only — DO NOT USE FOR FOUNDATION)
- **Model:** Claude (CLAUDE_API_KEY)
- **Rate limits:** asas:5, talaqa:10, tamayuz:20, ielts:30 per month
- **Task types handled:** sentence_building, ielts_task1, ielts_task2
- **Input:** `{ text, task_type, student_level? }` — user JWT required (no service role bypass)
- **Output:** IELTS band scores (1-9), paragraph feedback, IELTS-specific tips

### `ai-writing-assistant` (writing mid-task helper — ALREADY EXISTS)
- Called by `WritingAssistant.jsx` with 7 action types
- **This is essentially Feature 2 already built** — needs only cap enforcement

---

## 7. Quota System

**Columns found:**

| Table | Column | Purpose |
|---|---|---|
| `students` | `writing_limit_override` | Per-student monthly writing eval override |

**Default limits per package** (from `ai-writing-feedback` source):
```
asas: 2, talaqa: 4, tamayuz: 8, ielts: 8  (monthly writing_feedback calls)
```

**Override mechanism:** `students.writing_limit_override` — set via admin UI (not verified in code but column exists).

**Speaking:** No per-student quota. Monthly system budget cap only.

**`ai-writing-assistant` (hint function):** No call limit tracked. `ai_usage` inserts per call but no enforcement cap checked before execution. **This must be added for Feature 2.**

---

## 8. Cost Baseline (last 30 days)

| Feature | Calls | Total (SAR) | Avg per call (SAR) |
|---|---|---|---|
| Speaking evaluation (claude-sonnet-4-6) | 63 | 10.12 | 0.161 |
| Writing evaluation (ai-writing-feedback) | 62 | 6.23 | 0.100 |
| Speaking evaluation (claude-sonnet, older) | 38 | 5.06 | 0.133 |
| Whisper transcription | 104 | 2.11 | 0.020 |
| AI chatbot | 4 | 0.02 | 0.004 |
| **TOTAL** | **271** | **23.53** | — |

**Derived per-evaluation costs:**
- Writing evaluation: **~0.10 SAR**
- Speaking evaluation (Claude + Whisper combined): **~0.17 SAR**
- Writing assistant action: estimated **~0.04–0.07 SAR** (shorter prompt)

---

## 9. Pre-task / hint infrastructure

**Existing relevant infrastructure:**

1. **`WritingAssistant` component** (`src/components/curriculum/WritingAssistant.jsx`) — **LIVE and wired in WritingTab.jsx**. Calls `ai-writing-assistant` edge function with 7 action types. This IS Feature 2 in embryonic form. Missing: usage cap enforcement server-side.

2. **`curriculum_units.brief_questions`** — **ALL 72 units have pre-generated brief questions** (generated 2026-04-19). These are Arabic discussion-starter questions (2 per unit) that could be repurposed for the pre-task briefing. Example: *"من أهم شخص في حياتكِ؟ كيف ستصفينه لشخص لا يعرفه؟"*

3. **`curriculum_units.activity_ribbons`** — all 72 populated. Likely used for unit summary banners.

4. **`curriculum_units.warmup_questions`** — all 72 have this column but values are empty arrays `[]`.

5. **`ai_student_profiles` table** — exists with correct schema but **0 rows**. `generate-ai-student-profile` function exists and works — just never triggered in production. Profile data (skills, strengths, weaknesses, tips, summary_ar) would feed perfectly into pre-task briefing.

6. **`students.ai_insight_cache`** — populated for some students via `student-insight-ai` function. Lighter alternative to full profile.

**No partial implementation found** for pre-task briefing as a feature, speaking practice mode, or hint caps. Clean slate except WritingAssistant.

---

## 10. Risks & Open Questions for Phase B

### Blockers / Risks

| Risk | Severity | Notes |
|---|---|---|
| `ai_student_profiles` has 0 rows | HIGH | Feature 1 pre-task personalization requires profiles. Must either trigger `generate-ai-student-profile` for all active students before launch, or fall back to level-only context (no personalization) |
| No `transcript` column on `speaking_recordings` | MEDIUM | Practice Mode recordings need somewhere to store partial transcripts. Options: (a) add column in migration, (b) store in a new `speaking_practice_attempts` table, (c) store inside the evaluation jsonb |
| `ai-writing-assistant` has no usage cap | MEDIUM | WritingAssistant is live but uncapped. Any hint cap for Feature 2 must be enforced in the edge function, not just the UI |
| `evaluate-writing` vs `ai-writing-feedback` naming confusion | LOW | Foundation = `ai-writing-feedback`. IELTS = `evaluate-writing`. Phase B must never call `evaluate-writing` for Foundation students |
| `temperature` not set on `ai-writing-feedback` | LOW | Default ~1.0 may cause score variance. Consider setting temperature: 0.3 for the pre-task briefing call |
| `score` column not written back on SCP writing rows | LOW | All writing rows have `score = null`. `ai_feedback.fluency_score` is the live data. Mention to Ali — may need a backfill or fix in the eval function |

### Ambiguities for Ali to resolve before Phase B

1. **Pre-task briefing — personalized or generic?**
   - Option A (fast): Use `curriculum_writing.hints + vocabulary_to_use + grammar_to_use + brief_questions` with no AI generation. Zero extra cost. 
   - Option B (personalized): Trigger `generate-ai-student-profile` for all 18 students first, then generate a dynamic briefing per student per task using their profile.
   - **Recommended: Option A first, Option B as a v2 upgrade.**

2. **WritingAssistant (Feature 2) — usage cap?**
   - Current WritingAssistant has 7 action types with no limit. "ساعدني بفكرة" implies a simpler 3-hint-cap model.
   - Is the intent to REPLACE the existing WritingAssistant with a capped version, or ADD a simpler hint button alongside?
   - **Recommended: Add a `hints_used` counter to the SCP row (no new table needed). Cap the `ideas`/`outline`/`starters` actions at 3 per task.**

3. **Speaking Practice Mode — storage?**
   - Practice recordings are NOT the final submission. They should NOT go into `speaking_recordings` (mixed with real evaluations).
   - **Recommended: New table `speaking_practice_attempts` (student_id, speaking_id, audio_path, transcript, micro_feedback jsonb, created_at).**

4. **Speaking Practice Mode — which evaluator?**
   - Option A: Call `evaluate-speaking` directly for each sentence (expensive — 0.17 SAR per sentence).
   - Option B: Whisper only for transcript, lightweight Claude call for micro-feedback (grammar + 1 tip only — cheaper, ~0.05 SAR).
   - **Recommended: Option B — new lightweight `coach-speaking-practice` edge function.**

---

## 11. Recommended Phase B Architecture (proposal, not built)

### New tables needed

```sql
-- 1. Cache pre-task briefings per student+task (avoid re-generating)
CREATE TABLE coach_pretask_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id),
  writing_id uuid REFERENCES curriculum_writing(id),   -- nullable
  speaking_id uuid REFERENCES curriculum_speaking(id), -- nullable
  briefing_data jsonb NOT NULL,   -- { focus_areas[], tips[], reminder_from_past, vocab_highlight[] }
  generated_at timestamptz DEFAULT NOW(),
  UNIQUE (student_id, writing_id),
  UNIQUE (student_id, speaking_id)
);

-- 2. Track hint usage per student+task (for the 3-hint cap)
-- ALTERNATIVE: add hints_used integer column to student_curriculum_progress instead (simpler)
-- ALTER TABLE student_curriculum_progress ADD COLUMN IF NOT EXISTS hints_used integer DEFAULT 0;

-- 3. Practice recording attempts (separate from final recordings)
CREATE TABLE speaking_practice_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id),
  speaking_id uuid REFERENCES curriculum_speaking(id),
  unit_id uuid REFERENCES curriculum_units(id),
  audio_path text NOT NULL,
  audio_duration_seconds integer,
  transcript text,
  micro_feedback jsonb,  -- { corrected, grammar_note_ar, fluency_score, tip_ar }
  attempt_number integer DEFAULT 1,
  created_at timestamptz DEFAULT NOW()
);
```

### Edge functions

| Function | Action | New vs Reuse |
|---|---|---|
| `coach-pretask` | Generates pre-task briefing | **NEW** — different prompt: past performance summary + task-specific focus areas |
| `ai-writing-assistant` (existing) | Mid-task hints | **REUSE** — add `hints_used` cap check at entry (3 max per task) |
| `coach-speaking-practice` | Micro-feedback per practice sentence | **NEW** — Whisper + lightweight Claude (grammar + 1 tip only) |

### Cost projection at 50 active students × 8 tasks/month

| Feature | Calls/month | Cost/call (SAR) | Monthly SAR |
|---|---|---|---|
| Pre-task briefing (writing) | 400 | 0.10 | 40 |
| Pre-task briefing (speaking) | 400 | 0.10 | 40 |
| Mid-task hints (avg 2/task) | 800 | 0.06 | 48 |
| Practice sentences (avg 3/task) Whisper | 1,200 | 0.02 | 24 |
| Practice sentences (avg 3/task) Claude micro | 1,200 | 0.05 | 60 |
| **Total new features** | **4,000** | — | **~212 SAR** |
| Current baseline | — | — | 23.53 SAR |
| **Projected total** | — | — | **~235 SAR/month** |

**Cost control levers:**
1. Cache pre-task briefings — only regenerate if student profile changes (cuts briefing cost 80%+)
2. Generic briefing fallback (no Claude call) for students without `ai_student_profiles` row
3. Enforce 3-hint cap server-side — saves ~30% of hint cost vs uncapped
4. Practice mode: Whisper-only transcription + heuristic micro-feedback below 20 words (no Claude call)

**With caching enabled:** estimated **~80–100 SAR/month** total (4x current, manageable).

---

*End of discovery. No schema changes, no edge functions deployed, no UI modifications made.*
