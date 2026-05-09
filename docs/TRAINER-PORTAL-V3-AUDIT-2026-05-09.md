# Trainer Portal V3 Audit — 2026-05-09

---

## 1. Executive Summary

- **Dr. Mohammed's portal is broken end-to-end** — his `trainers` record has `is_active = false` and zero groups are assigned to him (all groups belong to Rasheed). Every trainer feature silently fails: empty Cockpit, empty Student Pulse, empty Grading Queue, all Interactive Curriculum level cards disabled.
- **50 grading items are pending and untouched** — `get_trainer_grading_queue` returns 50 writing/speaking submissions for Rasheed that appear to have never been graded (trainer_notes = 0, classes = 0). This is the most urgent operational gap.
- **`get_student_activity_timeline` SQL bug** — COALESCE type mismatch (`text` vs `xp_reason`) crashes the Student 360 activity timeline for all trainers. The sub-component always errors.
- **Curriculum parity is working for Rasheed** — `/trainer/interactive-curriculum` correctly uses the shared pages, group-scopes students, and renders student answers per tab. Gap: pages are hardcoded `dir="rtl"` so Rasheed's English LTR experience is broken.
- **Most V2 features have been deprecated and redirected** — Class Prep, Live Class, My Growth, Competition, Nabih (all → `/trainer`). The nav already reflects a streamlined V3 shape (`TRAINER_NAV_V3`). V3 should **not** rebuild these deprecated features without evidence of demand.

---

## 2. Inventory

### 2.1 Files (Phase A)

#### Active Pages

| File | Category | LoC | Last Commit |
|---|---|---|---|
| `src/pages/trainer/v2/CockpitPage.jsx` | Page (v2) | 163 | 2026-05-08 |
| `src/pages/trainer/v2/GradingStationPage.jsx` | Page (v2) | 201 | 2026-05-08 |
| `src/pages/trainer/v2/ClassDebriefPage.jsx` | Page (v2) | 309 | 2026-05-08 |
| `src/pages/trainer/v2/Student360Page.jsx` | Page (v2) | 88 | 2026-05-08 |
| `src/pages/trainer/v2/HelpPage.jsx` | Page (v2) | ~100 | 2026-05-08 |
| `src/pages/trainer/TrainerSettings.jsx` | Page | 126 | 2026-05-08 |
| `src/pages/trainer/TrainerStudentView.legacy.jsx` | Page (legacy-but-active) | 1217 | 2026-04-19 |
| `src/pages/trainer/IELTSOverview.jsx` | Page | 89 | 2026-05-08 |
| `src/pages/trainer/TrainerOnboarding.jsx` | Page | ~80 | 2026-05-08 |
| `src/pages/trainer/TrainerCurriculumPreview.jsx` | Page (18L wrapper) | 18 | 2026-04-15 |
| `src/pages/shared/InteractiveCurriculumLevels.jsx` | Shared Page | 242 | 2026-05-08 |
| `src/pages/shared/InteractiveCurriculumUnits.jsx` | Shared Page | 196 | 2026-05-08 |
| `src/pages/shared/InteractiveCurriculumPage.jsx` | Shared Page | 242 | 2026-05-08 |

#### Deprecated / Legacy Pages (Present but Not Routed)

| File | Suffix | Status |
|---|---|---|
| `v2/ClassPrepPage.deprecated.jsx` | `.deprecated` | Route → /trainer |
| `v2/LiveClassPage.deprecated.jsx` | `.deprecated` | Route → /trainer |
| `v2/CompetitionCommandPage.deprecated.jsx` | `.deprecated` | Route → /trainer |
| `v2/MyGrowthPage.deprecated.jsx` | `.deprecated` | Route → /trainer |
| `v2/NabihPage.deprecated.jsx` | `.deprecated` | Route → /trainer |
| `v2/InterventionsPage.deprecated.jsx` | `.deprecated` | Route → /trainer/students |
| `v2/CockpitPage.legacy.jsx` | `.legacy` | Replaced by current CockpitPage.jsx |
| `TrainerDashboard.legacy.jsx` | `.legacy` | Abandoned |
| `TrainerCurriculum.legacy.jsx` | `.legacy` | Replaced by shared InteractiveCurriculum |
| `TrainerStudentView.legacy.jsx` | `.legacy` | **Still actively routed** — needs V3 rewrite |
| `TrainerQuickPoints.legacy.jsx` | `.legacy` | Not routed — feature lost |
| `TrainerAssignments.legacy.jsx` | `.legacy` | Not routed — feature lost |
| `TrainerAttendance.legacy.jsx` | `.legacy` | Not routed — feature lost |
| `TrainerQuickNotes.legacy.jsx` | `.legacy` | Not routed — feature lost |
| + 8 more `.legacy` / `.deprecated` files | — | — |

#### Hooks (all in `src/hooks/trainer/`)

| Hook | LoC | Queries | Works? |
|---|---|---|---|
| `useTrainerCockpit` | 43 | 4 parallel (groups, get_trainer_totals, rituals, get_active_competition) | ✅ (empty for Dr.) |
| `useStudentPulse` | 100 | 3 sequential (groups→students→activity_feed) | ✅ |
| `useInterventionPreview` | 23 | 1 RPC (get_intervention_queue) | ✅ |
| `useGradingQueue` | 22 | 1 RPC (get_trainer_grading_queue) | ✅ |
| `useStudent360Overview` | — | 1 RPC (get_student_360_overview) | ✅ |
| `useStudentTimeline` | — | 1 RPC (get_student_activity_timeline) | ❌ SQL BUG |
| `useStudentInsight` | — | 1 edge function (student-insight-ai) | ✅ |
| `useStudent360 notes` | — | 1 direct query (trainer_notes) | ✅ (empty) |
| `useClassPrep` | 36 | 1 query (classes) | ⚠️ No classes in DB |
| `useGenerateSummary` | — | Edge fn (class-summary-ai) | Unknown |
| `usePublishClassSummary` | 23 | 1 RPC (publish_class_summary) | Unknown |
| `useCompetitionView` | 58 | RPC (deprecated route) | — |
| `useMyGrowth` | 54 | RPC (deprecated route) | — |
| `useNabih` | 133 | RPC (deprecated route) | — |
| `useTrainerIELTSStudents` | 211 | Multiple queries | ✅ |
| `useTrainerOnboarding` | 28 | 1 query | ✅ |
| `useCloseClassSession` | 25 | Mutation | — |

#### Config Files

| File | Purpose |
|---|---|
| `src/config/trainerNavigation.js` | `TRAINER_NAV_V3` (6 items) + `TRAINER_NAV_V2` (legacy) + mobile bar |
| `src/config/trainerCompensation.js` | Per-session rate logic |

#### Edge Functions (Trainer-Relevant)

`ai-trainer-assistant`, `class-prep-analysis`, `class-summary-ai`, `coach-chat`, `detect-student-signals`, `draft-intervention-message`, `generate-trainer-insights`, `nabih-chat`, `student-insight-ai`, `trainer-weekly-report`

Total: 10 trainer-relevant edge functions (several for deprecated features).

---

### 2.2 Database (Phase B)

#### Tables with Row Counts

| Table | Rows | Notes |
|---|---|---|
| `profiles` | 30 | All users |
| `students` | 21 | Active: 17 (10 in group 2, 7 in group 4) |
| `groups` | 8 | Active: 2 (both under Rasheed) |
| `student_curriculum_progress` | 453 | Most-used trainer table |
| `student_interventions` | 542 | All for Rasheed (system-generated) |
| `trainer_xp_events` | 1 | 🧊 Cold |
| `trainer_streaks` | 1 | 🧊 Cold |
| `trainer_daily_rituals` | 1 | 🧊 Cold |
| `nabih_conversations` | 0 | ❄️ Never used |
| `nabih_messages` | 0 | ❄️ Never used |
| `class_debriefs` | 0 | ❄️ Never used |
| `peer_recognitions` | 0 | ❄️ Never used |
| `trainer_notes` | 0 | ❄️ Never used |
| `competition_rounds` | 0 | ❄️ Never used |
| `competition_participants` | 0 | ❄️ Never used |
| `grading_queue` | N/A | ❌ Table does not exist in schema |
| `curriculum_submissions` | N/A | ❌ Table does not exist in schema |

#### Trainer Records (Critical)

| Trainer | Profile ID | `is_active` | Groups | Students |
|---|---|---|---|---|
| Dr. Mohammed Sharbat | `e8e64b7c-...` | **false** ❌ | 0 | 0 |
| Rasheed Osman | `561d26e7-...` | true ✅ | 2 (A1 + B1) | 17 |

**Note on schema:** The `trainers` table uses `id = profiles.id` (same UUID — it's a 1:1 extension). There is no separate FK column. `profile_id` is not a column in `trainers`.

#### `groups` Schema (Relevant Columns)

`id, name, code, level (int), trainer_id, max_students, google_meet_link, schedule (jsonb), is_active, created_at, current_unit_id`

---

### 2.3 RPCs (Phase C)

| RPC Name | Parameters | Works? | Rows (Rasheed) | Notes |
|---|---|---|---|---|
| `get_trainer_grading_queue` | p_trainer_id, p_limit | ✅ | 50 | Returns writing+speaking pending submissions |
| `get_intervention_queue` | p_trainer_id, p_limit? | ✅ | 20 (capped) | Full queue: 542 pending |
| `get_trainer_totals` | p_trainer_id | ✅ | 1 | Returns streak, xp, weekly, monthly |
| `get_student_360_overview` | p_student_id | ✅ | 1 | Returns group, metrics, student |
| `get_active_competition` | none | ✅ | 0 | No active competition |
| `get_student_activity_timeline` | p_student_id, p_days, p_limit | ❌ | — | **SQL BUG: COALESCE types text and xp_reason cannot be matched** |
| `get_intervention_queue` for Dr. Mohammed | p_trainer_id | ✅ | 20 | Returns data (signals are Rasheed's - data isolation bug?) |
| `get_trainer_grading_queue` for Dr. Mohammed | p_trainer_id | ✅ | 0 | Correctly returns 0 |

**RPCs from old V2 spec that do NOT exist:** `get_trainer_cockpit`, `get_student_pulse`, `get_class_prep`, `get_trainer_growth`, `get_nabih_conversations`, `get_competition_view`, `get_class_debrief_summary`.

---

## 3. Live Page Test: Dr. Mohammed (Phase D)

Dr. Mohammed (`e8e64b7c`): `trainers.is_active = false`, 0 groups, 0 students.

| # | Route | Expected | Actual Status | Root Cause |
|---|---|---|---|---|
| 1 | `/trainer` (Cockpit) | Daily dashboard | ❌ Empty — all widgets blank | 0 groups → no students, no pulse, no grading |
| 2 | `/trainer/interventions` | Intervention queue | ⚠️ Redirect to /trainer/students | Deprecated feature |
| 3 | `/trainer/class-prep` | Class preparation | ⚠️ Redirect to /trainer | Deprecated feature |
| 4 | `/trainer/live` | Live class panel | ⚠️ Redirect to /trainer | Deprecated feature |
| 5 | `/trainer/grading` | Pending grading | ⚠️ Empty — 0 items | No students → no submissions |
| 6 | `/trainer/debrief/:id` | Class debrief | ⚠️ Empty — 0 debriefs | Never created (no classes) |
| 7 | `/trainer/students` | Student list | ⚠️ Empty — 0 students | No groups assigned |
| 8 | `/trainer/students/:id` | Student detail | ⚠️ Empty | No students |
| 9 | `/trainer/curriculum` | Redirect | ✅ Redirects to /interactive-curriculum | Works |
| 10 | `/trainer/interactive-curriculum` | Level cards | ❌ All cards disabled | 0 groups → no levels unlocked |
| 11 | `/trainer/interactive-curriculum/:l/:u` | Unit with answers | ⚠️ Empty students | No students |
| 12 | `/trainer/my-growth` | My Growth | ⚠️ Redirect to /trainer | Deprecated |
| 13 | `/trainer/competition` | Competition | ⚠️ Redirect to /trainer | Deprecated |
| 14 | `/trainer/nabih` | Nabih AI | ⚠️ Redirect to /trainer | Deprecated |
| 15 | `/trainer/settings` | Settings | ✅ Works | UI language toggle functional |

**Also found:** `/trainer/student/:studentId` → Student360Page (separate from legacy students view)
**Summary for Dr. Mohammed:** 1 ✅ / 9 ⚠️ (redirects + empty) / 2 ❌ (broken or disabled)

---

### 3.1 Curriculum Parity Deep-dive (Phase D.4 + Phase I)

#### Wiring Proof

```
/trainer/curriculum  →  Navigate to /trainer/interactive-curriculum  (App.jsx:713)
/trainer/interactive-curriculum  →  <InteractiveCurriculumLevels />  (App.jsx:732)
/trainer/interactive-curriculum/:levelId  →  <InteractiveCurriculumUnits />  (App.jsx:733)
/trainer/interactive-curriculum/:levelId/:unitId  →  <InteractiveCurriculumPage />  (App.jsx:734)
```

All three routes render from `src/pages/shared/` — same components as `/admin/interactive-curriculum*`. ✅

#### Role Detection

No `viewerRole` prop is passed. The shared pages call `useAuthStore((s) => s.profile)` and read `profile?.role`. When a trainer is logged in, `role === 'trainer'` branches activate automatically. ✅

#### Group Scoping

`InteractiveCurriculumLevels` fires:
```js
supabase.from('groups').select('id, name, level').eq('trainer_id', trainerData?.id)
// enabled: role === 'trainer' && !!trainerData?.id
```
Level cards are disabled if `!trainerLevels.includes(level.level_number)`. For Rasheed, levels 1 and 3 are enabled. All other levels are grayed out. ✅

`InteractiveCurriculumPage` fires:
```js
supabase.from('groups').select('id, name, level').eq('level', levelNumber).eq('trainer_id', trainerData.id)
// when role === 'trainer'
```
Students are then fetched from those group IDs only. Rasheed sees only his students. ✅

#### Student Answer Rendering

`InteractiveReadingTab` receives the scoped `students` array and fires one batch query:
```js
supabase.from('student_curriculum_progress')
  .select('student_id, answers, score, status, completed_at')
  .eq('reading_id', reading.id).eq('section_type', 'reading')
  .in('student_id', studentIds)
```
For Rasheed's top unit (Unit 1, "المهرجانات الثقافية", Basics L1):
- Reading: **8 students with answers** (score=100, status=completed) ✅
- Grammar: **13 progress entries** ✅
- Writing: **7 entries** (some with null score — pending grading) ✅

The `StudentAnswersOverlay` component exists and is imported. Each question shows per-student correct/wrong status.

#### Permission Model

The trainer cannot edit unit content — the tab components receive only `unitId` + `students` (no edit controls passed). `role` is checked in `InteractiveCurriculumPage` only for group scoping, not for enabling edit UI. The page is structurally read-only for both admin and trainer at the tab level.

#### Visual Chrome

The shared pages use the same header/breadcrumb/tab structure as admin. The chrome is **identical** — there is no special trainer header. However:
- **`dir="rtl"` is hardcoded** in both `InteractiveCurriculumLevels` and `InteractiveCurriculumPage` (`<div ... dir="rtl">`)
- For Rasheed's English UI, the curriculum pages will still render RTL

**Verdict: Curriculum parity is WORKING for group scoping and student answers. The one gap is hardcoded RTL direction.**

---

## 4. Live Page Test: Rasheed (Phase E)

Rasheed (`561d26e7`): `is_active = true`, groups: المجموعة 2 (A1, level 1, 10 students) + المجموعة 4 (B1, level 3, 7 students).

| # | Route | Status | Notes |
|---|---|---|---|
| 1 | `/trainer` (Cockpit) | ✅ Data present | 17 students in pulse, 10 interventions, grading section loads |
| 2 | `/trainer/interventions` | ⚠️ Redirect | → /trainer/students |
| 3 | `/trainer/class-prep` | ⚠️ Redirect | → /trainer |
| 4 | `/trainer/live` | ⚠️ Redirect | → /trainer |
| 5 | `/trainer/grading` | ✅ 50 items | Writing + speaking + IELTS queue working |
| 6 | `/trainer/debrief/:id` | ❌ Unreachable | 0 debriefs in DB; no entry point from nav |
| 7 | `/trainer/students` | ✅ 17 students | Via TrainerStudentView.legacy — works but legacy code |
| 8 | `/trainer/student/:id` | ⚠️ Partial | Overview loads; activity timeline ❌ broken (SQL bug) |
| 9 | `/trainer/curriculum` | ✅ Redirect works | → /interactive-curriculum |
| 10 | `/trainer/interactive-curriculum` | ✅ 2 levels active | Levels 1 + 3 enabled, others greyed out |
| 11 | `/trainer/interactive-curriculum/:l/:u` | ✅ Student answers visible | 8/13/7 answers in reading/grammar/writing |
| 12 | `/trainer/my-growth` | ⚠️ Redirect | → /trainer |
| 13 | `/trainer/competition` | ⚠️ Redirect | → /trainer |
| 14 | `/trainer/nabih` | ⚠️ Redirect | → /trainer |
| 15 | `/trainer/settings` | ✅ Works | `ui_language = 'ar'` (not yet 'en' in DB) |

**Summary for Rasheed:** 6 ✅ / 7 ⚠️ (redirects) / 2 ❌ (student timeline broken, debrief unreachable)

### 4.1 Multi-Group Handling

The Cockpit and Student list correctly aggregate both groups (المجموعة 2 + المجموعة 4) without a manual group selector — students from both groups appear in one combined list. The Interactive Curriculum unlocks levels from both groups (1 and 3). ✅

### 4.2 i18n Coverage

Rasheed's `ui_language` is currently `'ar'` in the DB (not 'en'). However:
- **392 AR + 392 EN trainer keys** — perfect JSON parity, 0 missing translations
- **224 keys used in source** — all 224 defined in both JSON files
- **17 hardcoded Arabic strings** in `InteractiveReadingTab.jsx` (question type labels: `الفكرة الرئيسية`, `تفاصيل`, `مفردات`, `استنتاج`) — will not translate
- **4 hardcoded Arabic strings** in `ClassDebriefPage.jsx` (`placeholder="لحظة مميزة (اختياري)"`)
- **2 hardcoded Arabic strings** in `GradingStationPage.jsx` (`يوم`, `٣٦٠` button label)
- **Hardcoded `dir="rtl"`** in `InteractiveCurriculumLevels.jsx` and `InteractiveCurriculumPage.jsx` — layout won't flip to LTR

---

## 5. Performance (Phase F)

| Page | Hooks | Queries on Load | Parallelized? | Next-Class Widget | Prefetch? | Concern |
|---|---|---|---|---|---|---|
| Cockpit | 6 hooks | ~11 | Partial — useStudentPulse is 3-step sequential | Always null (no classes in DB) | Unknown | 3-step waterfall in StudentPulse |
| GradingStation | 2 hooks | 2 RPCs | Yes (parallel) | — | — | None significant |
| Student360 | 3 hooks | 3 (overview + timeline + edge fn) | All parallel | — | — | Timeline always errors; edge fn is slow |
| InteractiveCurriculumLevels | 3 queries | 3 | Yes (parallel) | — | — | None |
| InteractiveCurriculumPage | 4 queries | 4 | Yes (parallel) | — | — | tab stats require students to resolve first |
| ClassDebriefPage | 1 query | 1 | n/a | — | — | Unreachable without summaryId |
| TrainerStudentView.legacy | Unknown | Unknown | — | — | — | 1217 lines, pre-hook architecture |

#### useStudentPulse Waterfall Detail
```
Step 1: groups query (1 round trip)
  ↓ groups resolved
Step 2: students query (1 round trip)
  ↓ students resolved
Step 3: activity_feed last 7 days (1 round trip)
```
3 sequential round-trips on every Cockpit load. Low priority since Supabase latency is <200ms, but for mobile/slow connections this adds 600ms+ before pulse is visible.

---

## 6. Visual/UX Heuristic Scores (Phase G)

Scoring: 1=poor, 5=production-grade. Evidence from JSX source reading.

| Page | Chrome | Empty States | Skeletons | Action Affordance | Info Density | Mobile | i18n Flip | Polish | **Total/40** |
|---|---|---|---|---|---|---|---|---|---|
| CockpitPage | 5 — TrainerErrorBoundary + CockpitSkeleton | 4 — graceful silent blanks | 5 — CockpitSkeleton component | 4 — tour button, clear sections | 4 — well-structured | 4 — `dir="rtl"` respected | 4 — t() throughout | 4 — cohesive v3 design | **34** |
| GradingStationPage | 4 — CSS module, CommandCard, dir="rtl" | 5 — CheckCircle empty state with clear copy | 5 — QueueSkeleton 4 rows | 4 — "review_cta" visible | 4 — well-structured | 4 — filters scroll | 3 — hardcoded يوم/٣٦٠ | 4 — clean queue UX | **33** |
| Student360Page | 4 — s360-page layout, CSS module | 3 — sub-components own empty states | 3 — no skeleton in page file itself | 4 — QuickActionsBar, refresh | 5 — dense but organized | 3 — unknown (88L wrapper) | 4 — t() used | 3 — AI Insight slow | **29** |
| ClassDebriefPage | 4 — cd-skeleton, CommandCard | 3 — basic skeleton, no empty state copy | 4 — cd-skeleton present | 4 — Publish button | 4 — clear form flow | 3 — unknown responsive | 3 — 4 hardcoded AR strings | 3 — functional but unsexy | **28** |
| InteractiveCurriculumPage | 4 — breadcrumb, tab bar | 3 — empty tab message exists | 4 — skeleton in levels/units | 5 — tabs + student count badge | 5 — excellent density | 3 — dir="rtl" hardcoded | 2 — hardcoded RTL + 17 AR strings | 4 — polished shared design | **30** |
| TrainerSettings | 3 — basic layout | 1 — 2 placeholder sections exposed to user | 2 — no skeletons | 2 — save button buried | 2 — mostly empty | 3 — unknown | 4 — t() used | 1 — shows "placeholder" sections | **18** |
| TrainerStudentView.legacy | 2 — pre-design-system | 2 — unclear | 2 — pre-SWR | 3 — some buttons | 3 — functional | 2 — legacy code | 2 — unknown | 1 — needs full rewrite | **17** |

**Highest-scoring:** CockpitPage (34/40)
**Lowest-scoring:** TrainerStudentView.legacy (17/40) — flagged "primitive"
**Pages flagged "primitive" (≤20):** TrainerSettings (18), TrainerStudentView.legacy (17)

---

## 7. i18n Status (Phase H)

| Metric | Value |
|---|---|
| Total AR keys | 592 |
| Total EN keys | 592 |
| AR trainer-namespaced keys | 392 |
| EN trainer-namespaced keys | 392 |
| Keys in AR not in EN | **0** ✅ |
| Keys in EN not in AR | **0** ✅ |
| Used keys in trainer source | 224 |
| Missing in ar.json | **0** ✅ |
| Missing in en.json | **0** ✅ |

**JSON translation coverage is perfect.** The gaps are hardcoded strings bypassing the i18n system:

| File | Count | Examples |
|---|---|---|
| `InteractiveReadingTab.jsx` | 17 | `'الفكرة الرئيسية'`, `'تفاصيل'`, `'مفردات'`, `'استنتاج'` (QUESTION_TYPE_LABELS object) |
| `ClassDebriefPage.jsx` | 4 | `placeholder="لحظة مميزة (اختياري)"` |
| `GradingStationPage.jsx` | 2 | `'يوم'` (day), `'٣٦٠'` (button label) |

**RTL direction:**
- `InteractiveCurriculumLevels.jsx:108` — `<div className="..." dir="rtl">` (hardcoded)
- `InteractiveCurriculumPage.jsx:152` — `<div className="..." dir="rtl">` (hardcoded)

These two files do NOT respond to the `ui_language` setting. For Rasheed's English UI, these pages will always render RTL.

---

## 8. Curriculum Parity — The Proof (Phase I)

### Wiring

```jsx
// App.jsx:713
<Route path="/trainer/curriculum" element={<Navigate to="/trainer/interactive-curriculum" replace />} />

// App.jsx:732-734
<Route path="/trainer/interactive-curriculum" element={<Page><InteractiveCurriculumLevels /></Page>} />
<Route path="/trainer/interactive-curriculum/:levelId" element={<Page><InteractiveCurriculumUnits /></Page>} />
<Route path="/trainer/interactive-curriculum/:levelId/:unitId" element={<Page><InteractiveCurriculumPage /></Page>} />

// App.jsx:806-808 (admin — identical components)
<Route path="/admin/interactive-curriculum" element={<Page><InteractiveCurriculumLevels /></Page>} />
```

**Verdict: Trainer and admin use 100% identical component files.** ✅

### Prop Branches (`role === 'trainer'`)

```
InteractiveCurriculumLevels.jsx:30  — role = profile?.role
InteractiveCurriculumLevels.jsx:43  — enabled: role === 'trainer' && !!trainerData?.id
InteractiveCurriculumLevels.jsx:125 — const isTrainerLevel = role !== 'trainer' || trainerLevels.includes(level.level_number)
InteractiveCurriculumPage.jsx:41    — role = profile?.role
InteractiveCurriculumPage.jsx:73    — if (role === 'trainer' && trainerData?.id) { q = q.eq('trainer_id', trainerData.id) }
```

Group scoping is only applied when `role === 'trainer'` — admin sees all students. ✅

### Live Data Test (Top Unit: "المهرجانات الثقافية", Unit 1, Basics L1)

| Tab | Students with Data | Sample |
|---|---|---|
| Reading | 8 of 17 (47%) | score=100, status=completed, 6 answer keys |
| Grammar | 13 entries | Multiple students |
| Writing | 7 entries | Some with null score (need grading) |
| Speaking | Active (from grading queue data) | Scores 58-80 |

**Student answers ARE being captured and ARE visible to trainers via the shared curriculum pages.** ✅

---

## 9. Gap Analysis (Phase J)

### 9.1 Trainer Needs Map

| # | Need | Status | Evidence |
|---|---|---|---|
| 1 | Daily dashboard | ✅ Built | CockpitPage — works for Rasheed |
| 2 | Curriculum browser with student answers | ✅ Built | /trainer/interactive-curriculum — parity verified |
| 3 | Quick points panel | ❌ Lost | `TrainerQuickPoints.legacy.jsx` exists but not routed |
| 4 | Grading inbox | ✅ Built | GradingStationPage — 50 items pending |
| 5 | Assignment creation | ❌ Not built | `TrainerAssignments.legacy.jsx` — not routed |
| 6 | Quick notes | ⚠️ Weak | trainer_notes table exists, 0 rows, UI in Student360 |
| 7 | Student profile | ⚠️ Partial | Student360Page built but activity timeline broken |
| 8 | Group management + schedule | ❌ Not built | No group mgmt UI; classes table empty |
| 9 | Class summary/debrief | ⚠️ Built but unreachable | ClassDebriefPage exists; 0 debriefs; no creation entry point |

### 9.2 Cold Features (Built but Underused)

| Feature | Table | Rows | Verdict |
|---|---|---|---|
| Trainer XP system | `trainer_xp_events` | 1 | ❄️ Never used in practice |
| Trainer Streaks | `trainer_streaks` | 1 | ❄️ Seeded, never updated |
| Daily Rituals | `trainer_daily_rituals` | 1 | ❄️ One-off entry |
| Nabih AI Coach | `nabih_conversations` | 0 | ❄️ Never used; page redirected |
| Nabih Messages | `nabih_messages` | 0 | ❄️ Same |
| Class Debriefs | `class_debriefs` | 0 | ❄️ Never used |
| Peer Recognitions | `peer_recognitions` | 0 | ❄️ Never used |
| Trainer Notes | `trainer_notes` | 0 | ❄️ Never used |
| Competition | `competition_rounds` | 0 | ❄️ Never used |
| Quick Points (legacy) | n/a | — | ❄️ Not accessible |

**Live features by activity:**
| Feature | Signal | Activity Level |
|---|---|---|
| Student Interventions | 542 rows (auto-generated) | 🔴 Active generation, 0 acted_at — being generated but not acted upon |
| Grading Queue | 50 pending items | 🔴 Backlog accumulating |
| Curriculum Progress | 453 rows | 🟢 Students actively completing units |
| Student 360 | ~10 sessions per student | 🟡 Data present, trainer may not visit |

---

## 10. V3 Recommendations

| Priority | Recommendation | Why | Scope |
|---|---|---|---|
| P0 | **Fix Dr. Mohammed's account** — set `trainers.is_active = true`, assign groups | His portal is entirely broken; he has no student visibility | 1 SQL migration + data assignment |
| P0 | **Fix `get_student_activity_timeline` SQL bug** — COALESCE type mismatch | Student 360 activity tab errors for ALL trainers | Fix SQL function (1 RPC edit) |
| P1 | **Create a debrief entry point** — link from Cockpit or after class ends | ClassDebriefPage is built but unreachable (requires summaryId with no creation flow) | Add "Start Debrief" button + generation flow |
| P1 | **Make curriculum pages direction-aware** — replace hardcoded `dir="rtl"` | Rasheed's English UI gets RTL layout in the curriculum; 17 hardcoded AR strings | Edit 2 shared pages + InteractiveReadingTab constants |
| P1 | **Rewrite TrainerStudentView.legacy.jsx** | 1217-line legacy file; lowest UX score (17/40); no skeleton, pre-hook architecture | Full rewrite — V3 priority |
| P2 | **Add group management + class scheduling** | `classes` table has 0 rows; Cockpit "Next Class" widget always null; debrief flow requires classes | New page or modal |
| P2 | **Wire Quick Points panel** | Lost feature — `TrainerQuickPoints.legacy.jsx` exists but not routed; one of the 9 core needs | Restore or rebuild (medium scope) |
| P2 | **Add assignment creation** | Not built at all; one of the 9 core needs | New feature (significant scope) |
| P3 | **Complete TrainerSettings** — remove Notifications/Security placeholder sections | Shows placeholder text to real trainers | Remove or implement the 2 sections |
| P3 | **Surface intervention actions** — 542 interventions generated, 0 acted_at | Trainers are NOT acting on system-generated signals; need UI nudge or inbox | Improve interventions UX |

---

## 11. Errors Encountered During Audit

1. **`exec_sql` RPC not available** — Phase B used direct table queries as fallback; schema dump incomplete (no column-level types from information_schema).
2. **`/tmp/` path not available on Windows** — i18n key file written inline via Node.js instead. No data loss.
3. **`grading_queue` and `curriculum_submissions` tables not found** — These table names referenced in audit spec do not exist. GradingStation uses `get_trainer_grading_queue` RPC which aggregates from `student_curriculum_progress`.
4. **`get_student_activity_timeline` SQL bug** — `COALESCE types text and xp_reason cannot be matched` — this is a live production bug affecting all Student360 page loads.
5. **`add_trainer_note` permission denied** — Service role key tested against RPC with auth check; expected behaviour in test context.
6. **Dr. Mohammed intervention queue returns 20 rows** — Unexpected. The `get_intervention_queue` RPC returned 20 rows even for Dr. Mohammed (who has no groups). These may be system-wide data visible to all trainers, or the RPC doesn't enforce trainer scoping. **Possible data isolation bug.**
7. **`get_student_360_overview` with fake student ID returns "Student not found"** — Expected; used real IDs for subsequent tests.

---

## 12. Methodology + Limitations

**What was tested:**
- File inventory: full scan of `src/pages/trainer/`, `src/pages/shared/`, `src/hooks/trainer/`, `src/components/trainer/`, `src/components/interactive-curriculum/`, `src/config/` — by file listing and grep
- Database: Direct Supabase JS client queries (service role) for row counts, schema sampling, and live data tests
- RPCs: Called with real trainer IDs (Rasheed: `561d26e7`, Dr. Mohammed: `e8e64b7c`), measured response times
- Live page data: Simulated all data fetches the pages would perform (hooks read, queries replicated in scripts)
- i18n: Programmatic key extraction from all trainer source files, compared against ar.json/en.json
- UX heuristics: JSX source reading — no browser rendering

**What was NOT tested:**
- Browser rendering / actual screenshots (no `vite build` or `vite dev` due to OOM constraint)
- Mobile 380px layout (would require browser)
- Auth flow and session handling
- PWA/push notification behavior
- Edge function cold start times
- Realtime subscription behavior
- RLS policy correctness (exec_sql not available; couldn't dump pg_policies)

**Assumptions:**
- `trainers.id = profiles.id` confirmed from data sample
- `ui_language` for Rasheed is currently `'ar'` in DB (the English toggle hasn't been saved yet)
- Intervention data isolation (point 6 in Errors) requires further investigation
