# 🔍 Trainer Portal — Forensic Audit Report
Generated: 2026-04-20 — Commit base: `de29eae`

---

## ملخص تنفيذي

- **Active trainers in DB:** 2 (د. محمد شربط + مدرب تجريبي)
- **Trainer assignment mismatch:** YES — see Section A
- **Broken routes:** 1 (GradingStation — RPC SQL error)
- **Empty-state routes despite populated data:** 1 (StudentPulse heatmap — wrong column name)
- **Hang/freeze suspects:** 0 critical, 1 minor
- **Missing edge functions:** 0 (all referenced functions are ACTIVE)

**Top 5 most urgent fixes (ranked):**
1. 🔴 **`get_trainer_grading_queue` RPC broken** — `column cu.title does not exist` → entire GradingStation page errors out
2. 🔴 **`activity_feed.user_id` wrong column** — useStudentPulse queries non-existent column; should be `student_id`, `xp_amount` not `xp_earned` → 7-day heatmap always blank
3. 🟠 **`GradingPreviewStrip` has no trainer filter** — shows academy-wide pending writing count, not Mohammed's students'
4. 🟠 **Ali is assigned as `trainer_id` on inactive groups but as admin role** — if Ali visits `/trainer` as admin, no groups found; RLS or role mismatch needs clarification
5. 🟡 **All V2 XP/streak/ritual tables empty** — `trainer_xp_events=0`, `trainer_streaks=0`, `trainer_daily_rituals=0`, `class_debriefs=0`, `grading_events=0` → MyGrowth, MorningRitual, TrainerXpTicker all show zeros (data gap, not code bug)

---

## Section A — DB State

### A.1 — Trainers (profiles.role = 'trainer')

| id | email | full_name | role |
|----|-------|-----------|------|
| e8e64b7c-... | goldmohmmed@gmail.com | د. محمد شربط | trainer |
| c21d8204-... | trainer@fluentia.academy | مدرب تجريبي | trainer |

### A.2 — trainers table (separate table)

| id | per_session_rate | is_active | onboarding_completed |
|----|-----------------|-----------|----------------------|
| c21d8204-... (مدرب تجريبي) | 100 | true | false |
| e5528ced-... **(Ali admin — no matching trainer profile!)** | 150 | true | true |
| e8e64b7c-... (د. محمد) | 75 | true | true |

**⚠️ FINDING:** `trainers` table contains `e5528ced-b3e2-45bb-8c89-9368dc9b5b96` which is Ali's **admin** profile. This ID has no `role='trainer'` entry in `profiles`. It appears on inactive groups as `trainer_id`.

### A.3 — Groups

| name | level | trainer_id | is_active |
|------|-------|------------|-----------|
| **المجموعة 2** | 1 | e8e64b7c (محمد) | ✅ true |
| Level 1 - Group A | 1 | e5528ced (Ali-admin, no trainer profile) | ❌ false |
| Level 1 - Group B | 1 | null | ❌ false |
| Level 2 - Group A | 2 | c21d8204 (مدرب تجريبي) | ❌ false |
| Level 2 - Group B | 2 | e5528ced (Ali-admin) | ❌ false |
| Level 3 - Group B | 3 | null | ❌ false |
| **المجموعة 4** | 3 | e8e64b7c (محمد) | ✅ true |
| Level 3 - Group A | 3 | null | ❌ false |

**Assignment verdict:**
- EXPECTED: A1 → Dr. Mohammed, B1 → Ali
- ACTUAL: Mohammed has two active groups (المجموعة 2 + المجموعة 4). Ali's admin profile_id appears as trainer_id on 2 inactive groups only. There is no B1 group with Ali as active trainer.
- Mismatch: PARTIAL — Mohammed's assignment is correct. Ali has no active trainer group.

### A.4 — Student Counts

- **14 active students** across Mohammed's 2 groups (confirmed via `status='active'` + `deleted_at IS NULL` + group_id filter)
- `students.is_active` column does NOT exist — any code using `.eq('is_active', true)` returns 0 rows
- `المجموعة 2`: populated, `المجموعة 4`: populated

### A.5 — V2 Table Row Counts

| Table | Count | Notes |
|-------|-------|-------|
| trainer_xp_events | 0 | No XP earned yet — expected for new trainer |
| trainer_streaks | 0 | No streak tracked yet |
| student_interventions | **47** | Populated ✅ |
| trainer_daily_rituals | 0 | None completed yet |
| nabih_conversations | 0 | Fresh start ✅ |
| nabih_messages | 0 | Fresh start ✅ |
| class_debriefs | 0 | No classes held via V2 yet |
| attendance | 0 | No V2 class sessions yet |
| grading_events | 0 | No grading done via V2 yet |
| trainer_onboarding | 0 | Tour not taken yet (correct — will auto-fire) |

---

## Section B — Route Audit

### `/trainer` — CockpitPage
**File:** `src/pages/trainer/v2/CockpitPage.jsx` ✅ exists

**Hooks:** `useTrainerCockpit`, `useStudentPulse`, `useTrainerOnboarding`, `[tourActive, searchParams]`

**Queries (as Mohammed):**
- `groups WHERE trainer_id = mohammed` → **2 rows** ✅
- `get_trainer_totals(mohammed)` → 0 rows (empty — no XP events yet, shows 0 not error) ✅
- `trainer_daily_rituals WHERE trainer_id=mohammed AND day_of=today` → 0 rows (none completed) ✅
- `get_active_competition()` → 0 rows (no competition — shows empty state) ✅

**useEffect deps:** 1 effect `[onboarding, searchParams]` — deps complete ✅

---

### `/trainer` → StudentPulseMap widget
**File:** `src/pages/trainer/v2/cockpit/widgets/StudentPulseMap.jsx`

**Student list query:**
```
students WHERE group_id IN [...] AND status='active' AND deleted_at IS NULL
JOIN profiles!inner(id, full_name, avatar_url, last_active_at)
```
→ **14 rows** ✅ Students DO show up.

**Activity heatmap query — BUG:**
```js
supabase.from('activity_feed')
  .select('user_id, created_at, xp_earned')  // ❌ WRONG COLUMNS
  .in('user_id', profileIds)                 // ❌ column doesn't exist
  .gte('created_at', since)
```
**Actual `activity_feed` columns:** `id, group_id, student_id, type, title, description, data, created_at, event_text_ar, xp_amount`

**Fix needed:** `user_id` → `student_id`, `xp_earned` → `xp_amount`

**Visible impact:** All heatmap cells show empty (no activity dots) even if students are active. Students themselves list correctly — the "no students" report is NOT the student list, it's the heatmap being blank.

---

### `/trainer/interventions` — InterventionsPage
**File:** `src/pages/trainer/v2/InterventionsPage.jsx` ✅ exists

**Query:** `get_intervention_queue(p_trainer_id, p_limit)` → **10 rows** ✅
**Empty states:** Defined for all filter types ✅
**Status:** WORKING ✅

---

### `/trainer/grading` — GradingStationPage
**File:** `src/pages/trainer/v2/GradingStationPage.jsx` ✅ exists

**Main query:** `get_trainer_grading_queue(p_trainer_id, p_limit)`
→ **❌ ERROR: "column cu.title does not exist"**

The RPC itself has a broken SQL reference. The entire grading queue returns empty and an error is thrown. The page renders `QueueSkeleton` forever or shows blank.

**Secondary query (`GradingPreviewStrip` widget on Cockpit):**
```js
supabase.from('student_curriculum_progress')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'completed')
  .eq('section_type', 'writing')
  .is('trainer_graded_at', null)
```
**No trainer_id filter** → counts ALL ungraded writing across ALL groups academy-wide. Shows wrong count for Mohammed.

**Fix needed:**
1. Fix `get_trainer_grading_queue` RPC SQL (find and fix the `cu.title` reference)
2. Add trainer-scoped filter to `GradingPreviewStrip`

---

### `/trainer/debrief/:summaryId` — ClassDebriefPage
**File:** `src/pages/trainer/v2/ClassDebriefPage.jsx` ✅ exists
**Data:** `class_debriefs` table = 0 rows — only reachable after a live class closes; won't be tested in isolation.

---

### `/trainer/students` and `/trainer/student/:studentId`
**Files:** `src/pages/trainer/v2/Student360Page.jsx` ✅, `TrainerStudentView` (legacy file)

**`get_student_360_overview(p_student_id)` RPC:** Returns data ✅ (sample response includes group, metrics)
**`student-insight-ai` edge function:** ACTIVE ✅
**Status:** WORKING ✅

---

### `/trainer/curriculum` — TrainerCurriculum
**File:** `src/pages/trainer/TrainerCurriculum.jsx` ✅ exists (legacy location, not V2)
**Status:** Not V2; read-only curriculum view.

---

### `/trainer/competition` — CompetitionCommandPage
**File:** `src/pages/trainer/v2/CompetitionCommandPage.jsx` ✅ exists
**Query:** `get_active_competition()` → 0 rows (no active competition)
**Empty state renders correctly** ✅

---

### `/trainer/my-growth` — MyGrowthPage
**File:** `src/pages/trainer/v2/MyGrowthPage.jsx` ✅ exists

**Queries:**
- `get_trainer_growth_dashboard(mohammed)` → 0 rows (no XP events yet — data gap, not bug) ✅
- `get_trainer_xp_timeline(mohammed, 30)` → 0 rows (same) ✅
- `trainers WHERE id=mohammed → per_session_rate: 75` ✅

**Status:** Page works, shows 0s because trainer_xp_events is empty. This is expected for a trainer who hasn't used the portal yet.

---

### `/trainer/nabih` and `/trainer/nabih/:conversationId` — NabihPage
**File:** `src/pages/trainer/v2/NabihPage.jsx` ✅ exists
**Edge function:** `nabih-chat` ACTIVE ✅
**End-to-end smoke test:** PASSED ✅ (Nabih returned Arabic reply with real student names, auto-title generated)
**nabih_conversations count:** 0 (fresh start — correct)

---

### `/trainer/prep` — ClassPrepPage
**File:** `src/pages/trainer/v2/ClassPrepPage.jsx` ✅ exists
**Edge function:** `class-prep-analysis` ACTIVE ✅
**Note:** `useClassPrep(groupId)` only fires when groupId is selected. First render shows group picker. Correct behavior.

---

### `/trainer/live` — LiveClassPage
**File:** `src/pages/trainer/v2/LiveClassPage.jsx` ✅ exists
**Guards:** Redirects to `/trainer` if `!isClassMode` (correct — LiveClass only accessible during active class session)
**Student count query:** `students WHERE group_id = currentGroupId AND status='active' AND deleted_at IS NULL` → will work ✅

---

### `/trainer/help` — HelpPage
**File:** `src/pages/trainer/v2/HelpPage.jsx` ✅ exists
**Status:** Static FAQ + search. No DB queries. ✅

---

## Section C — Cockpit Deep Dive

### C.1 — Widget Inventory

| Widget | Rail | Order | Data State (prod) | Empty UX | Notes |
|--------|------|-------|-------------------|----------|-------|
| MorningRitualCard | Right | 1 | Empty (0 rituals) | Shows greeting + "ابدأ يومك" button | Calls `start_morning_ritual` RPC |
| AgendaStrip | Right | 2 | Unknown (no classes table data probed) | Shows "لا كلاسات مجدولة" | 30s clock interval ✅ cleaned up |
| NabihBriefingCard | Right | 3 | Partial (47 interventions loaded) | — | Calls `useInterventionPreview(50)` — heavy load |
| StudentPulseMap | Center | 1 | **Students: ✅ 14 rows / Heatmap: ❌ always empty** | Shows student names with blank heatmap | BUG: wrong column names in activity_feed query |
| GroupHealthOrbs | Center | 2 | Should populate (uses profiles.last_active_at) | — | Independent query, unaffected by heatmap bug |
| GradingPreviewStrip | Center | 3 | Shows wrong count (no trainer filter) | Link to /trainer/grading | BUG: academy-wide count not trainer-scoped |
| TrainerXpTicker | Left | 1 | Empty (0 XP events) | Shows 0 XP, 0 streak | Expected — no V2 XP earned yet |
| CompetitionMini | Left | 2 | Empty (no active competition) | "لا توجد مسابقة نشطة" + setup link | Correct ✅ |
| InterventionPreview | Left | 3 | **Populated ✅ (10 interventions)** | — | Working correctly |

### C.2 — Page Layout

- **Grid:** CSS grid `tr-cockpit__grid` with 3 rails: `--right (220px)`, `--center (1fr)`, `--left (220px)`
- **Max width:** Full viewport width
- **Mobile:** Rails stack at 900px breakpoint
- **Topbar:** New header with "غرفة القيادة" title + "جولة تعريفية" CTA
- **Background:** `var(--tr-bg, #f3f4f6)` — no Islamic geometric pattern currently
- **Gold accent usage:** 4 places (`--tr-gold` / `#f59e0b`): topbar border, tour button, intervention pill, XpTicker streak

### C.3 — Interaction Map

| Widget | Click Action |
|--------|-------------|
| MorningRitualCard | RPC call to `start_morning_ritual` |
| AgendaStrip | Expands class details |
| NabihBriefingCard | Links to `/trainer/nabih` |
| StudentPulseMap | Click student → `/trainer/student/:id` |
| GradingPreviewStrip | Link to `/trainer/grading` |
| InterventionPreview | Opens InterventionModal |
| CompetitionMini | Link to `/trainer/competition` |
| TrainerXpTicker | Link to `/trainer/my-growth` |

**Total CTAs on Cockpit:** ~8 distinct actions
**Clear "main action":** NO — all 8 CTAs are visually equal weight; no obvious primary action hierarchy

**Design flaws observed:**
- All 3 rails have equal visual weight — center rail (main data) doesn't visually dominate
- GradingPreviewStrip wrong count creates false urgency
- NabihBriefingCard loads 50 interventions (heavy) just for a count badge
- Missing: "what should I do RIGHT NOW" single-focus CTA

---

## Section D — Hang / Freeze Suspects

| File:Line | Pattern | Severity | Fix approach |
|-----------|---------|----------|--------------|
| `useStudentPulse.js` | `activity_feed.user_id` doesn't exist → PostgREST error caught by try/catch, falls back to no-filter query | MEDIUM | Fix column names: `student_id`, `xp_amount` |
| `TrainerXpTicker.jsx` | `useCountUp` missing `display` dep (intentional, eslint-disable) | LOW | No fix needed — RAF animation, not setState loop |
| `NabihBriefingCard.jsx` | `useInterventionPreview(50)` loads 50 interventions on every cockpit mount | LOW | Reduce to 5 or use cockpit data |
| `GradingPreviewStrip.jsx` | `student_curriculum_progress` full scan (no trainer filter) | LOW | Add trainer-scoped join |

**Query avalanche potential:** NO
- `refetchOnWindowFocus: false` ✅
- `staleTime: 5min` global default ✅
- Each widget has its own staleTime: 30s–60s ✅
- No unbounded realtime subscriptions in trainer pages ✅

**Realtime channels:** Only `useNabih.js` uses `supabase.channel()` with matching `removeChannel` in cleanup ✅

**All setIntervals cleaned up:** ✅ (AgendaStrip, LiveClassPage, TimerBadge, TimerPopup — all have `clearInterval` in return)

---

## Section E — Edge Functions

| Function | Deployed | Referenced by | Status |
|----------|----------|---------------|--------|
| `nabih-chat` | ✅ ACTIVE | NabihPage | OK |
| `class-prep-analysis` | ✅ ACTIVE | ClassPrepPage | OK |
| `student-insight-ai` | ✅ ACTIVE | Student360Page | OK |
| `detect-student-signals` | ✅ ACTIVE | intervention background | OK |
| `draft-intervention-message` | ✅ ACTIVE | InterventionModal | OK |
| `class-summary-ai` | ✅ ACTIVE | ClassDebriefPage | OK |
| `evaluate-speaking` | ✅ ACTIVE | grading flow | OK |
| `evaluate-ielts-speaking` | ✅ ACTIVE | IELTS grading | OK |

**Missing edge functions:** 0 — all UI-referenced functions are deployed.

---

## Section F — Bug: "لا يوجد طلاب بعد" trace

**Root cause is NOT a missing students bug.** The 14 students exist and load correctly.

The "empty" experience comes from **two separate issues**:

**Issue 1 — Heatmap always blank (StudentPulseMap)**
```js
// useStudentPulse.js — WRONG:
supabase.from('activity_feed')
  .select('user_id, created_at, xp_earned')
  .in('user_id', profileIds)
```
`activity_feed` has no `user_id` or `xp_earned` columns.
Actual columns: `student_id`, `xp_amount`.
Result: PostgREST error → caught by try/catch → falls back → matrix stays `{}` → all cells render as `.tr-pulse__cell--empty`.

**The student NAME ROWS appear correctly. Only the 7 heatmap dots per student are blank.**

**Issue 2 — GradingStation completely broken**
```sql
-- get_trainer_grading_queue RPC internal error:
column cu.title does not exist
```
The RPC references `cu.title` but the `curriculum_units` table alias doesn't have that column (likely renamed). GradingStation shows nothing.

---

## Section G — Recommended Fix Prompts

### Fix 1 — TRAINER-FIX-GRADING (Critical, fix before launch)
- Fix `get_trainer_grading_queue` RPC: find the `cu.title` reference and replace with the actual column name (likely `cu.unit_title` or `cu.name` — probe `curriculum_units` columns)
- Fix `GradingPreviewStrip`: add trainer-scoped join so count is for Mohammed's students only
- **Files:** Supabase migration + `GradingPreviewStrip.jsx`

### Fix 2 — TRAINER-FIX-PULSE-HEATMAP (High, fix before launch)
- Fix `useStudentPulse.js` activity_feed query: `user_id` → `student_id`, `xp_earned` → `xp_amount`
- **File:** `src/hooks/trainer/useStudentPulse.js` lines ~60-68

### Fix 3 — TRAINER-FIX-COCKPIT-DESIGN (Medium, before or shortly after launch)
- Redesign Cockpit: establish clear visual hierarchy — center rail should dominate, one primary CTA per visit
- Reduce NabihBriefingCard's intervention load from 50 → 5
- Add "main action today" logic: if interventions exist → highlight them; otherwise → highlight Nabih
- **Files:** `CockpitPage.jsx`, `CockpitPage.css`, widget CSS files

### Data Gap (not a bug — trainer needs to use the portal to generate data)
- `trainer_xp_events`, `trainer_streaks`, `trainer_daily_rituals`, `class_debriefs`, `attendance`, `grading_events` all empty
- These fill up as Mohammed uses the portal: grades submissions, marks attendance, runs classes
- MyGrowth and MorningRitual will populate naturally
