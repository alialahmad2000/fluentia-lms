# Unit Movements V3.1 — Phase A Discovery (COEXIST mode)

Generated: 2026-05-21
Git HEAD at discovery: dd1abc9
Sibling sessions during discovery: 5 (logged in V3.1-COEXIST-startup-sessions.log)
Checksum integrity: ✅ V3 files unchanged during discovery

---

## 1. V3 Current State

- **V3 movement keys:** `discover`, `master`, `express`, `reflect`
- **V3 activity keys mapped today:**
  - `discover`: `['reading']`
  - `master`: `['vocabulary', 'grammar', 'listening']`
  - `express`: `['writing', 'speaking']`
  - `reflect`: `['recording']`
- **ActivityContentDispatcher keys:** `reading`, `grammar`, `vocabulary`, `listening`, `writing`, `speaking`, `recording`
- **NO `assessment` key anywhere** — the exam is NOT an activity in `useUnitData().activities`

## 2. The Unit Exam — Where It Lives

- **Component:** `src/pages/student/assessment/UnitMasteryPage.jsx` (full-screen exam) + `src/pages/student/assessment/UnitMasteryResultPage.jsx` (result)
- **Goalpost card on the unit page:** `src/pages/student/assessment/UnitMasteryCard.jsx`
- **State hook (CRITICAL):** `src/pages/student/assessment/useUnitMasteryState.js`
  - Takes `(unitId, studentId)`
  - Returns `{ assessment, state, loading }` where `state.type ∈ { 'loading', 'locked', 'ready', 'cooldown', 'locked_out', 'passed_cooling', 'retake_available', 'complete' }`
  - Already implements the 70% activity gate (`unlock_threshold_percent` per assessment via RPC `fn_can_start_unit_assessment`)
  - Already implements cooldowns, retake windows, max attempts logic
- **Route to launch exam:** `/student/unit-mastery/:assessmentId` (App.jsx:696)
- **Surfacing today in V2 (and V3):** `UnitMasteryCard` rendered ABOVE MissionGrid as a goalpost card (UnitContent.jsx:524, UnitContentRouter.jsx:328)
- **Pass/fail logic:** in `useUnitMasteryState.computeState()` — `assessment.pass_score_percent` threshold
- **DB tables:**
  - `unit_mastery_assessments` (per-unit row: `pass_score_percent`, `unlock_threshold_percent`, `total_questions`, `max_attempts`, `retake_cooldown_minutes`, etc.)
  - `unit_mastery_attempts` (per-attempt row: `passed`, `percentage`, `started_at`, `status`, `attempt_number`)

**This is exam case B from the prompt's decision tree** — exam is NOT in activities[]. But V3.1's planned `useExamGateState` hook is REDUNDANT because `useUnitMasteryState` already does all the gate work, and per-assessment configurable threshold. ExamGatePanel will use `useUnitMasteryState` directly.

## 3. The Class Recording — Data Shape

- **Source table:** `class_recordings` (per-unit, can have multiple recordings: Part A, Part B)
- **URL columns:** `google_drive_url` (NOT NULL), `google_drive_file_id`
- **Duration:** `duration_seconds` INT NULL, `duration_minutes` INT NULL — **both already exist**
- **Thumbnail:** `thumbnail_url` TEXT NULL — **already exists** (no first-frame extraction needed)
- **Watch state:** `recording_progress` table EXISTS with:
  - `student_id`, `recording_id` (FK to class_recordings.id)
  - `position` REAL (current playback seconds)
  - `watched_percent` REAL (0-100)
  - `speed` REAL
  - `completed_at` (set when fully watched)
  - `xp_awarded` boolean

**Phase E migration NOT needed.** Watch state is fully tracked.

## 4. Activity Object Shape From useUnitData

Each entry in `activities[]`:

```
{
  key: 'reading' | 'grammar' | 'vocabulary' | 'listening' | 'writing' | 'speaking' | 'recording',
  label: '<arabic>',
  labelEn: '<english>',
  icon: '<lucide-name>',
  color: '#hex',
  status: 'not_started' | 'in_progress' | 'completed',
  progress: 0..1,
  locked: false,
  estimatedMinutes: 10
}
```

Recording-specific properties are NOT in this object — they need a parallel fetch (Phase E enrichment hook).

## 5. Decision Tree

### 5.1 Movement IV exam — Case B (synthetic; no activities[] entry)

V3.1 will treat Movement IV specially. The grouping hook (`useMovementGrouping`) returns groups built from `activities[]`, so Movement IV (`activityKeys: ['assessment']`) will end up empty since no activity has key `'assessment'`. **Two options:**

- **Option A (synthetic activity):** Inject a synthetic activity object `{ key: 'assessment', label: 'الاختبار', status: <derived from useUnitMasteryState> }` into activities[] before grouping. Movement IV then contains it normally.
- **Option B (skip grouping for IV):** Render Movement IV's ExamGatePanel directly in UnitContentV3 regardless of whether `'assessment'` is in groupedMovements. Don't synthesize.

**Decision: Option B** — cleaner. Phase B will:
1. Update `_v3Mappings.groupActivitiesByMovement` to filter OUT empty exam-movements like other empty movements (existing behavior)
2. `UnitContentV3` will check `movement.isExamGate === true` and render ExamGatePanel regardless of whether the grouping returned that movement
3. The ExamGatePanel sources state from `useUnitMasteryState(unitId, studentId)` — independent of the grouped activities array

This avoids polluting `activities[]` with synthetic entries that other code (e.g. `useUnitData` consumers downstream) might mishandle.

### 5.2 Recording — already-tracked, no migration

Phase E ships:
- A new `useRecordingDataEnrichment(unitId, studentId)` hook that fetches `class_recordings` + `recording_progress` rows for the unit. Returns the consolidated shape: `{ recordings: [{id, google_drive_url, thumbnail_url, duration_seconds, title, recorded_date, part, watched_percent, position_seconds, completed_at}, ...], primary }`.
- `RecordingStation.jsx` consumes this and renders the media-aware tile. If a unit has multiple recordings (Part A + Part B), the station shows the most-relevant one (next-unwatched, then last-watched, then any).
- No DB migration.

### 5.3 Movements remap

Per the V3.1 spec:

| Movement | id | titleAr | titleEn | activityKeys | isExamGate |
|---|---|---|---|---|---|
| I | the_class | الفصل | The Class | `['recording', 'reading']` | — |
| II | master | الإتقان | Master | `['vocabulary', 'grammar', 'listening']` | — |
| III | express | التعبير | Express | `['writing', 'speaking']` | — |
| IV | the_test | الاختبار | The Test | `[]` (sourced via useUnitMasteryState) | true |

**Subtitles:** I `ما حدث في الصف`, II `أتقني الأنماط`, III `عبّري عن نفسك`, IV `أثبتي ما تعلّمتِ`.

**Palettes:**
- I: warm amber (same as current "discover")
- II: cool azure (unchanged)
- III: blush rose (unchanged)
- IV: NEW deep velvet (dark violet → near-black) per V3.1 spec, with gold accent

## 6. Stop-Condition Checklist

- [x] V3 still on disk and unchanged (16 files checksum-verified)
- [x] V2 still on disk and unchanged (not touched during discovery)
- [x] Exam component found — `UnitMasteryPage` + `useUnitMasteryState` (case B)
- [x] Recording URL field identified (`class_recordings.google_drive_url` + `thumbnail_url` + `duration_seconds`)
- [x] `app_config[unit_layout]` still has value `"v2"` (verified pre-run)
- [x] Ali's `profiles.unit_layout_preference` still `'v3'` (verified pre-run)
- [x] Concurrent sessions logged (5) — COEXIST mode in effect

All boxes pass. Proceeding to Phase B.

## 7. Reduce-motion compliance audit

7 V3 components import `useReducedMotion`:
- `UnitContentV3.jsx`, `UnitCompass`, `MovementPanel`, `ActivityStation`, `RecommendedPath`, `NextSuggestionPulse`, `MovementProgressOrb`

`EmptyMovementGuard`, `MovementHeroNumeral` don't import it because they don't animate.

V3.1 new components (`ExamGatePanel`, `RecordingStation`, the rewritten `RecommendedPath`, optional `MovementAmbient`) must all honor reduce-motion.

## 8. Sibling-session activity during Phase A

5 sibling sessions logged at startup. PID 20266 was at 99% CPU during discovery (active autonomous work). Checksum integrity confirms no V3 files changed during my discovery — siblings are working in other paths (vocab-enrich, IELTS, etc.) and stayed isolated.

The COEXIST safeguards (small commits, pull-rebase, post-commit verify, protective tags) are engaged for all subsequent phases.
