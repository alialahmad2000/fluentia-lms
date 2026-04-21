# IELTS V3 Phase 1 — Discovery Report

Generated: 2026-04-21
Against commit: 149caa88b3d542b11e2e9d842ded91b76b95f888 (0f47559 — Sunset Atlas)

---

## 1. Table Inventory

21 tables checked. All 21 exist. Row counts where readable:

| Table | Rows | Notes |
|---|---|---|
| ielts_diagnostic_tests | ~exists | RLS blocks anon count |
| ielts_diagnostic_results | ~exists | RLS blocks anon count |
| **ielts_reading_passages** | **43** | Rich JSONB — questions embedded |
| ielts_reading_questions | ~exists | RLS or empty |
| **ielts_reading_skills** | **16** | Question type meta |
| **ielts_writing_tasks** | **25** | Task 1 + Task 2, model answers |
| **ielts_listening_sections** | **25** | Audio URLs live in Supabase storage |
| ielts_listening_questions | ~exists | RLS or empty |
| **ielts_speaking_questions** | **60** | Part 1/2/3, sample answers |
| ielts_speaking_topics | ~exists | RLS or empty |
| **ielts_mock_tests** | **1** | The diagnostic test (test_number=0) |
| ielts_mock_attempts | 0 | Empty — no students yet |
| ielts_student_results | 0 | Empty |
| ielts_student_progress | 0 | Empty |
| ielts_error_bank | 0 | Empty |
| ielts_adaptive_plans | 0 | Empty — **fallback plan mandatory** |
| ielts_strategy_videos | ~exists | RLS or empty |
| ielts_weekly_plans | ~exists | RLS or empty |
| ielts_trainer_notes | ~exists | RLS or empty |
| ielts_skill_sessions | 0 | Empty |
| ielts_submissions | 0 | Empty |

**Summary:** Content tables are populated (43 reading passages, 25 writing tasks, 25 listening sections, 60 speaking questions). All student-progress tables are empty — no real students on IELTS yet.

---

## 2. Column Details

### ielts_reading_passages
Questions are embedded as JSONB array directly on the passage row — no separate `ielts_reading_questions` table needed.
Key columns: `id`, `passage_number`, `title`, `content`, `word_count`, `topic_category`, `difficulty_band` (band_5_6 / band_6_7 / band_7_8), `questions` (JSONB), `answer_key` (JSONB), `time_limit_minutes`, `is_published`, `test_variant`

### ielts_reading_skills
Key columns: `id`, `question_type`, `name_ar`, `name_en`, `explanation_ar`, `strategy_steps`, `sort_order`

### ielts_writing_tasks
Key columns: `id`, `task_type` (task1/task2), `sub_type`, `title`, `prompt`, `template_structure` (JSONB), `key_phrases`, `model_answer_band6`, `model_answer_band7`, `rubric` (JSONB), `word_count_target`, `time_limit_minutes`, `difficulty_band`, `is_published`

### ielts_listening_sections
Key columns: `id`, `test_id`, `section_number` (1-4), `title`, `audio_url` (live Supabase storage URL), `audio_duration_seconds`, `transcript`, `speaker_count`, `accent`, `questions` (JSONB), `answer_key` (JSONB), `is_published`, `voice_id`

### ielts_speaking_questions
Key columns: `id`, `part` (1/2/3), `topic`, `questions` (JSONB array with sample answers), `cue_card`, `follow_up_questions`, `model_answer_text`, `useful_phrases`, `band_descriptors`, `is_published`

### ielts_mock_tests
Key columns: `id`, `test_number` (0=diagnostic), `title_ar`, `title_en`, `reading_passage_ids` (array), `listening_test_id`, `writing_task1_id`, `writing_task2_id`, `speaking_questions` (JSONB), `total_time_minutes`, `is_published`

### ielts_adaptive_plans (inferred from hooks + trainer panel)
Key columns: `student_id`, `target_band`, `target_exam_date`, `test_variant`, `current_week`, `weekly_schedule` (JSONB day-keyed: `{ sun: [{title, type, duration, completed}], mon: [...], ...}`), `next_recommended_action` (JSONB), `weak_areas` (JSONB), `strong_areas` (JSONB), `current_band_estimate`, `last_regenerated_at`, `updated_at`

### ielts_student_results (inferred from hooks)
Key columns: `id`, `student_id`, `result_type` (diagnostic/mock), `overall_band`, `reading_score`, `listening_score`, `writing_score`, `speaking_score`, `completed_at`, `test_variant`, `mock_test_id`

### ielts_student_progress (inferred from hooks)
Key columns: `student_id`, `skill_type`, `question_type`, `attempts_count`, `correct_count`, `estimated_band`

### ielts_skill_sessions (inferred from hooks)
Key columns: `id`, `student_id`, `skill_type`, `question_type`, `band_score`, `correct_count`, `incorrect_count`, `duration_seconds`, `started_at`, `completed_at`

### ielts_submissions (inferred from trainer hook)
Key columns: `id`, `student_id`, `submission_type`, `text_content`, `audio_url`, `transcript`, `word_count`, `band_score`, `ai_feedback`, `submitted_at`, `trainer_reviewed_at`, `trainer_feedback`, `trainer_overridden_band`, `trainer_id`

---

## 3. Sample Data

### ielts_reading_passages (key facts)
- 43 passages, questions embedded as JSONB (10-12 questions each, all multiple_choice in sample)
- difficulty_band values seen: `band_6_7` (sample row)
- `is_published: true` confirmed
- `test_variant: "academic"` confirmed

### ielts_writing_tasks (key facts)
- 25 tasks — Task 1 and Task 2 both present
- `model_answer_band6` and `model_answer_band7` populated
- `rubric` includes `diagnostic_scoring` with band descriptors
- Diagnostic task2 confirmed (title includes "Diagnostic")

### ielts_listening_sections (key facts)
- 25 sections; audio hosted at `nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/curriculum-audio/ielts/listening/`
- `is_published: false` on sample — **check how many are published before building MockFlow**
- `voice_id` populated → generated via ElevenLabs

### ielts_speaking_questions (key facts)
- 60 questions across Part 1/2/3
- Sample answers + `band_descriptors.arabic_tip` = coaching in Arabic
- `model_answer_audio_url: null` on sample → no pre-recorded audio

### ielts_mock_tests (key facts)
- 1 row: diagnostic (test_number=0), `is_published: true`
- Only 1 reading_passage_id referenced — diagnostic uses 1 passage not 3
- `writing_task1_id: null` (diagnostic has no Task 1)

---

## 4. IELTS Students on the Platform

**Count: 0** — no profiles have `package = 'ielts'` or `custom_access` containing `'ielts'`

Implications:
- All student-side tables (results, progress, error_bank, mock_attempts, adaptive_plans, skill_sessions) are empty
- Phase 1 must render gracefully with zero data — every component needs a "no data" / "take diagnostic first" state
- Admin preview is the only path to see real V2 pages until Ali onboards first student

---

## 5. Storage Buckets

IELTS-related buckets:
| Bucket | Public | Purpose |
|---|---|---|
| `ielts-audio` | false | Listening audio (private delivery) |
| `ielts-speaking-submissions` | false | Student speaking recordings |
| `ielts-writing-images` | true | Task 1 images/charts |

Other buckets: `submissions`, `materials`, `recordings`, `reports`, `avatars`, `backups`, `curriculum-audio`, `curriculum-images`, `voice-notes`, `recording-thumbnails`, `affiliate-materials`

Note: Listening audio also found in `curriculum-audio/ielts/listening/` (public bucket) — URL format confirmed in sample data.

---

## 6. Edge Functions

IELTS-specific functions:
| Function | Purpose |
|---|---|
| `complete-ielts-diagnostic` | Grades R+L objectively, calls Claude for Writing + Speaking eval, writes results + generates adaptive plan |
| `complete-ielts-mock` | Same as diagnostic but for full mock tests; also refreshes adaptive plan |
| `evaluate-ielts-speaking` | Standalone speaking eval: Whisper transcription → Claude band scoring. Monthly limits per package |

Also relevant (not IELTS-specific but used):
- `evaluate-writing` / `correct-writing` — writing grading
- `ai-writing-assistant` — writing help
- `send-email` — notifications

---

## 7. Existing V1 Hooks

### `src/hooks/ielts/useIELTSHub.js` — 7 exports

| Hook | Query | V2 Tier |
|---|---|---|
| `useIELTSMeta(studentId)` | `students` table — package, ielts_phase, track | **Reuse as-is** |
| `useAdaptivePlan(studentId)` | `ielts_adaptive_plans` — full plan row | **Reuse as-is** |
| `useSkillProgress(studentId)` | `ielts_student_progress` — aggregates to `{reading,listening,writing,speaking}.band` | **Reuse as-is** |
| `useRecentSessions(studentId, limit)` | `ielts_skill_sessions` — last N sessions | **Reuse as-is** |
| `useErrorBankCount(studentId)` | `ielts_error_bank` — unmastered error count | **Reuse as-is** |
| `useMockAttempts(studentId)` | `ielts_mock_attempts` — returns `{inProgress, completed, total}` | **Reuse as-is** |
| `useLatestResult(studentId)` | `ielts_student_results` — last result with all 4 skill scores | **Reuse as-is** |

### `src/hooks/ielts/useAdaptivePlan.js` — 4 exports

| Hook | Purpose | V2 Tier |
|---|---|---|
| `useAdaptivePlan(studentId)` | Duplicate of above (from useIELTSHub) | Use the one from useIELTSHub |
| `useUpdatePlanMeta()` | Mutation: update target_band, exam_date | **Reuse as-is** |
| `useRegeneratePlan()` | Mutation: gather context → `generatePlan()` → upsert | **Reuse as-is** |
| `useMarkWeeklyTaskComplete()` | Mutation: toggle task.completed in weekly_schedule JSONB | **Reuse as-is** |

### `src/hooks/trainer/useTrainerIELTSStudents.js` — 3 exports

| Hook | Purpose | V2 Tier |
|---|---|---|
| `useIELTSRoster()` | Trainer: all IELTS students with risk signals | Admin/trainer only — skip for V2 student page |
| `useStudentIELTSDetail(studentId)` | Trainer: full student detail for plan panel | Skip |
| `useIELTSGradingQueueExtension()` | Trainer: ungraded submissions | Skip |

### `src/hooks/ielts/useMockCenter.js` — 8+ exports

All mock-related. Not needed for Home/Journey — skip for Phase 1.

---

## 8. Existing V1 Pages — Query Shapes

### `StudentIELTSHub.jsx` (V1 equivalent of V2 Home)
Uses: `useAdaptivePlan`, `useSkillProgress`, `useRecentSessions`, `useErrorBankCount`, `useMockAttempts`, `useLatestResult`

Access gate logic: `studentData.package === 'ielts' || custom_access.includes('ielts')`

Shows:
- Current band + target band (from plan + latest result)
- 4 skill cards with individual bands
- Weekly schedule grid (day letters: ح ن ث ر خ ج س)
- Next recommended action (from plan)
- Recent sessions list
- Error bank count

V2 Home reuses ALL these hooks — no new DB queries needed for the base data layer.

---

## 9. Adaptive Plan Reality

- **Table exists:** yes
- **Rows:** 0
- **Structure:** Single row per student, upserted on `student_id`. Key fields:
  - `weekly_schedule`: JSONB keyed by day (sun/mon/tue/wed/thu/fri/sat), each day = array of `{title, type, duration_minutes, completed}`
  - `next_recommended_action`: JSONB `{type, label_ar, route, urgency}`
  - `weak_areas` / `strong_areas`: JSONB arrays `[{skill, band}]`
  - `current_band_estimate`: float
  - `current_week`: int (1-12)
  - `target_band`: float
  - `target_exam_date`: date
- **Generation logic:** **Rule-based, pure function** (`src/lib/ielts/plan-generator.js`). Uses JSON schedule templates + motivational notes + next-action rules. Zero API calls. Deterministic. Fast (<50ms).
- **Decision:** Build a **"default starter plan" fallback** for when `ielts_adaptive_plans` is empty. The plan-generator already handles this case (returns a no-diagnostic template when `hasDiagnostic=false`). Phase 1 Home should call `useAdaptivePlan` and if `data === null`, call `generatePlan()` client-side with empty context to render a starter plan inline (without persisting).

---

## 10. Skill Progress Canonical Source

**Two tiers:**

1. **Latest result bands** (preferred when exists): `ielts_student_results` → `reading_score, listening_score, writing_score, speaking_score` from diagnostic or mock. This is the authoritative band per skill after a graded test.

2. **Aggregated practice progress** (fallback): `ielts_student_progress` → `estimated_band` averaged by skill. Populated by skill lab sessions. Less accurate but continuous.

**V1 Hub logic (confirmed):**
```js
currentBand = resultQ.data?.overall_band || plan?.current_band_estimate || null
```

**Decision:** For V2 Home, use `useLatestResult` for per-skill bands when available, fall back to `useSkillProgress` aggregated bands. Show "not yet assessed" if both null.

---

## 11. Trainer Feedback Source

No dedicated `ielts_trainer_notes` / `trainer_feedback` table is populated or used in V1.

The `ielts_submissions` table has `trainer_feedback` (text) and `trainer_overridden_band` columns, set when a trainer reviews a writing or speaking submission.

The `ielts_trainer_notes` table exists but has 0 rows and is not referenced in any V1 hook.

**Decision for Phase 1 Home:** Skip "latest trainer comment" section entirely for now. Show it only when `ielts_submissions` has a row with `trainer_feedback IS NOT NULL`. Wire as a conditional section — hidden when empty. Add a note in the component for Phase 2 to expand this.

---

## 12. Audio Greetings

No audio greeting mechanism found anywhere in the codebase. No ElevenLabs pre-recorded greetings. No audio greeting component.

**Decision:** Phase 1 Home uses **text-only greeting** from trainer name (`"د. علي"` hardcoded for now, or from `useAuthStore profile.trainer_name` if available). Add as Phase 1.5 enhancement once content is finalized.

---

## 13. V1 Component Reuse Map

| V1 Asset | Tier | V2 Decision |
|---|---|---|
| `useIELTSHub.js` — all 7 hooks | **Reuse as-is** | Import directly in V2 Home/Journey |
| `useAdaptivePlan.js` — useRegeneratePlan, useMarkWeeklyTaskComplete | **Reuse as-is** | Import in V2 Home for plan interactions |
| `plan-generator.js` | **Reuse as-is** | Use for client-side fallback plan generation |
| `StudentIELTSHub.jsx` — access gate logic | **Reuse with adapter** | Copy the `hasAccess` useMemo pattern |
| `BandDisplay` component (`@/design-system/components/masterclass/BandDisplay`) | **Reuse as-is** | Already imported in V2 Home.jsx scaffold |
| `StrategyModule` component | **Reuse as-is** | Already imported in V2 Reading.jsx scaffold |
| `StudentIELTSHub` — weekly schedule day-letter grid | **Lift and adapt** | Build `WeekScheduleGrid` in V2 Home — same day-letter logic, Sunset Atlas palette |
| Skill card pattern from Hub | **Lift and adapt** | Build `SkillBandCard` component — warm palette |
| `TrainerPresence` in layout header | **Reuse as-is** | Already in IELTSMasterclassLayout |
| Plan view / weekly task toggles | **Reuse with adapter** | Journey.jsx can use useMarkWeeklyTaskComplete |

---

## 14. Phase 1 Build Plan (concrete)

### Home.jsx build plan

**Purpose:** Student's command center — see current band, skill gaps, this week's tasks, next action.

**Data hooks needed (all exist, no new hooks required):**
- `useLatestResult(studentId)` — overall_band + skill scores
- `useAdaptivePlan(studentId)` — weekly_schedule, next_recommended_action, target_band, current_week
- `useSkillProgress(studentId)` — fallback bands from practice history
- `useErrorBankCount(studentId)` — unmastered errors count
- `useMockAttempts(studentId)` — in-progress mock (resume CTA)
- `useAuthStore` — studentId, profile (for name)

**DB queries (via hooks above):**
```sql
-- useLatestResult:
SELECT id, result_type, overall_band, reading_score, listening_score, writing_score, speaking_score, created_at
FROM ielts_student_results WHERE student_id=$1 ORDER BY created_at DESC LIMIT 1

-- useAdaptivePlan:
SELECT * FROM ielts_adaptive_plans WHERE student_id=$1

-- useSkillProgress:
SELECT skill_type, question_type, attempts_count, correct_count, estimated_band
FROM ielts_student_progress WHERE student_id=$1

-- useErrorBankCount:
SELECT count(*) FROM ielts_error_bank WHERE student_id=$1 AND mastered=false

-- useMockAttempts:
SELECT id, mock_test_id, status, started_at, completed_at
FROM ielts_mock_attempts WHERE student_id=$1 ORDER BY started_at DESC
```

**Components to build:**
- `HeroGreeting` — warm greeting, current band pill, target band
- `SkillBandRow` — 4 skill cards (reading/listening/writing/speaking) with individual bands or "—"
- `NextActionCard` — from `plan.next_recommended_action` — big amber CTA card
- `WeekScheduleStrip` — current week's daily tasks from `plan.weekly_schedule`, checkable
- `QuickStats` — error bank count, mock count, days to exam
- "Take Diagnostic" CTA — shown when `!hasTakenDiagnostic` (no result)

**Fallback states:**
- No result → show "تأكد من مستواك الحقيقي" → Diagnostic CTA
- No plan → generate default plan client-side via `generatePlan({hasDiagnostic:false})`, show it without persisting
- No skill progress → show "—" in skill cards, not an error

### Journey.jsx build plan

**Purpose:** 12-week journey view — see where the student is in the roadmap, what phases are done/upcoming, week-by-week tasks.

**Data hooks needed:**
- `useAdaptivePlan(studentId)` — current_week, target_exam_date, weekly_schedule
- `useLatestResult(studentId)` — to show "last mock band" on timeline
- `useMockAttempts(studentId)` — completed mock count for progress milestones

**DB queries:** Same as Home — no additional queries.

**Components to build:**
- `JourneyTimeline` — 12-week horizontal (or vertical) timeline; highlight current week
- `PhaseLabel` — map weeks to phases: 1-3=Foundation, 4-7=Skill Build, 8-10=Intensify, 11=Final Prep, 12=Exam Week
- `WeekCard` — each week shows title + tasks + completion status; current week is expanded
- `ExamCountdown` — days to exam_date if set
- `BandProgressChart` — simple line connecting mock results over time (hidden if < 2 mocks)

**Fallback states:**
- No plan → show "الرحلة ستبدأ بعد التشخيص" + Diagnostic CTA
- No exam_date → hide countdown, show "لم تحدد تاريخ الامتحان بعد" inline
- < 2 mock results → hide chart, show placeholder

### New hooks needed

| Name | Purpose | DB source |
|---|---|---|
| NONE | All required hooks already exist | — |

The only "new" code is client-side: a wrapper that calls `generatePlan()` when `useAdaptivePlan` returns null, to render a starter schedule without a DB write.

### Fallback strategy

- **No adaptive plan** → call `generatePlan({ hasDiagnostic: false, targetBand: 6.5 })` client-side; render the resulting `weekly_schedule` as-is with a soft banner: "خطة البداية — ستتكيّف بعد إتمام الاختبار التشخيصي"
- **No skill bands** → show "—" in skill cards + sticky CTA: "أكمل الاختبار التشخيصي لتفعيل خطتك"
- **No trainer feedback** → hide that section entirely (conditional render)
- **In-progress mock** → show "متابعة الاختبار التجريبي" banner at top of Home

---
