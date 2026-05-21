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

---

# Phase H — QA + Final Summary (COEXIST run)

Generated: 2026-05-21

## H1 Test Matrix (static + flagged-for-Ali)

| # | Test | Mode | Result | Notes |
|---|---|---|---|---|
| H1.1 | Unit with < 70% activity completion → LOCKED panel | static | PASS | ExamGatePanel's LockedView reads `examGate.progress.{current_pct, required_pct}` and shows the progress bar + 'أكملي 70٪…' headline. Threshold comes from per-assessment `unlock_threshold_percent` via useUnitMasteryState. |
| H1.2 | Unit with ≥ 70% → READY panel + gold button | static | PASS | ReadyView with breathing gold ring, Sparkles icon, 'ابدئي اختبار الوحدة' oversized button. Question count + time + attempt-number hint underneath. |
| H1.3 | Exam passed → trophy seal + 'وحدة مُتقَنة' | static | PASS | PassedView with rotated trophy seal top-end, score badge ({bestScore}٪) + secondary line ('انتظري قليلًا' / 'إعادة الاختبار متاحة') as appropriate. |
| H1.4 | Click READY button → exam loads | static | PASS | onLaunch navigates to `/student/unit-mastery/{assessment.id}`. Route already wired in App.jsx (line 696). Existing V2 UnitMasteryPage renders unchanged. |
| H1.5 | Compass inner ring matches gate state | static | PASS | ExamInnerRing renders gray-dashed (locked) / pulsing gold (ready) / solid gold (passed). Center pip Lock/Sparkles/Trophy + Arabic label below the percentage. |
| H1.6 | Recording station thumbnail or placeholder | static | PASS | RecordingStation renders 16:9 thumbnail from class_recordings.thumbnail_url, or velvet placeholder + Play icon if NULL. Duration badge (mm:ss), part tag ('الجزء A'/'B'), watch-progress bar (partial state). |
| H1.7 | Recommended Path threads visibly through stations | static | PASS | RecommendedPath uses `[data-v3-station-id]` selectors to find 7 candidate stations (recording, reading, vocabulary, grammar, listening, writing, speaking) + assessment buttons. Catmull-Rom spline + animated dot. |
| H1.8 | Reduce-motion preference honored | static | PASS | 9 components import `useReducedMotion`. All breathing/pulsing animations swap to static end-state. RecommendedPath: foreground path renders fully drawn, dot is static (no breathing). Compass ExamInnerRing: ready state renders solid gold (no opacity pulse). |
| H1.9 | Mobile 320px width — movements stack, button full-width | static | PASS | ExamGatePanel button: `width: min(320px, calc(100% - 32px))` — caps at 320 desktop, fills minus 32px on narrow viewports. Movement panel: grid `repeat(auto-fit, minmax(220px, 1fr))` already wraps cleanly. |
| H1.10 | Light theme — velvet adjusts to aubergine | static | PASS | `paletteLight` for `the_test` movement uses `rgba(74, 47, 79, 0.92)` → `rgba(46, 29, 50, 0.96)` (deep aubergine), `accent: #D4A017`. ExamInnerRing uses gold/aubergine variants per theme. Score badge uses palette.accent. |
| H1.11 | Progress numbers refresh on activity completion (no hard reload) | static | PASS | useUnitMasteryState uses TanStack Query with `refetchInterval: 30000` on the can-start RPC + `refetchInterval: 60000` on attempts. Plus the wrapper's `fluentia:activity:complete` listener invalidates 'unit-progress-comprehensive' which the gate hook indirectly reads. |

**Static-verifiable: 11/11 PASS.** Browser-required verification on Vercel preview (visual polish, palette contrast, keyboard tab order) is still recommended before the global flag flip.

## H2 Lighthouse

Cannot run from agent context. V3.1 expected impact vs V3 baseline:
- **New chunks:** ExamGatePanel (~5 KB gz), RecordingStation (~3.5 KB gz), useExamGate (~0.5 KB gz), useRecordingDataEnrichment (~0.8 KB gz). All lazy-loaded through the existing UnitContentRouter route lazyRetry.
- **Additional fetches on V3 unit page load:**
  - 1 GET on `unit_mastery_assessments` (cached 5 min via TanStack Query)
  - 1 GET on `unit_mastery_attempts` (per studentId/assessmentId — refetched 60s)
  - 1 RPC `fn_can_start_unit_assessment` (refetched 30s)
  - If movement I contains recording: 1 GET on `class_recordings` (cached 5 min) + 1 GET on `recording_progress` (cached 30s)
- **Animation cost:** Breathing box-shadow on ExamGatePanel ready/locked states (CPU-cheap, one element each). Pulsing Compass inner ring (one circle, SVG). Animated path dot in RecommendedPath (one circle, SVG). All disabled on reduce-motion.
- **Expected delta vs V3:** Performance score within ~2 points, LCP unchanged (no new render-blocking chunks), CLS unchanged (no layout-shifters added).

Verify via DevTools Lighthouse on `https://fluentia-lms.vercel.app/student/curriculum/unit/<id>?layout=v3` once Vercel finishes deploying.

## H3 Phase G status

**SKIPPED.** Rationale: the prompt's G3 condition requires a Lighthouse perf comparison before shipping, which I cannot run from agent context. Rather than ship motion that might cost paint without measurement, Phase G is deferred. Ali can request it as a separate follow-up if the V3.1 page reads too static — the spec (per-movement motion personality) is already documented in the V3.1 prompt for future reference.

## H4 COEXIST safeguard report

- **Sibling sessions during this run:** 5 (started 2026-05-20, still active throughout V3.1)
- **Files I wrote that were cleaned by a sibling session:** 0
- **Files auto-restored from commit (Safeguard 3):** 0
- **Rebase conflicts encountered:** 0 — Phase A,B (after first attempt error), C, D, E, F all rebased cleanly because V3 paths stayed isolated from sibling work
- **Pull-rebase failures (acceptable, non-conflict):** 2 — both were "index has uncommitted changes" because my staged file conflicted with `git pull --rebase`'s expectation. Resolved by committing first, then pushing (push handled fast-forward cleanly each time).
- **Protective tags created:** `v3.1-phase-c-checkpoint`, `v3.1-phase-e-checkpoint`, `v3.1-phase-f-checkpoint` — all pushed to origin
- **Checksum integrity (Phase A):** PASS — no V3 files drifted during read-only discovery
- **Total commits this run:** 11 (Phase A docs + 10 feat commits across B/C/D/E/F)

## H5 Final Summary

```
═══════════════════════════════════════════════════════════════
UNIT MOVEMENTS V3.1 COEXIST — RUN COMPLETE
═══════════════════════════════════════════════════════════════

Coexist mode: ran alongside 5 sibling claude sessions
Sibling-induced incidents: 0
Files auto-restored from commits: none
Rebase conflicts encountered: 0

What shipped:
  ✅ Phase A — Discovery (checksum-protected) → docs/UNIT-MOVEMENTS-V3.1-DISCOVERY.md
  ✅ Phase B — Movements remapped: I.الفصل · II.الإتقان · III.التعبير · IV.الاختبار
  ✅ Phase C — ExamGatePanel with locked/ready/passed states + useExamGate
                hook (adapter over useUnitMasteryState — no redundant gate logic)
                tagged: v3.1-phase-c-checkpoint
  ✅ Phase D — Compass inner ring + center pip for exam gate state
  ✅ Phase E — RecordingStation media variant with thumbnail/duration/watch
                state + useRecordingDataEnrichment hook (no DB migration —
                recording_progress already exists)
                tagged: v3.1-phase-e-checkpoint
  ✅ Phase F — Real RecommendedPath SVG (Catmull-Rom + animated dot)
                tagged: v3.1-phase-f-checkpoint
  ⏭ Phase G — Ambient motion SKIPPED (cannot measure Lighthouse delta from
                agent context)
  ✅ Phase H — Quality gates: 11/11 static PASS, 0 blockers

Total commits: 11 (small + atomic — coexist-safe granularity)
Protective tags created: v3.1-phase-c-checkpoint, v3.1-phase-e-checkpoint,
                          v3.1-phase-f-checkpoint

Current state for users:
  Mission Grid (V2) — every student, every unit page, exactly as yesterday.
  V3.1 visible only to Ali (preference='v3') and via ?layout=v3.

Recovery commands if anything looks wrong on Ali's preview:
  git reset --hard v3.1-phase-f-checkpoint   # back to before any Phase G work (n/a here)
  git reset --hard v3.1-phase-e-checkpoint   # back to before Phase F (RecommendedPath)
  git reset --hard v3.1-phase-c-checkpoint   # back to before Phase D/E/F (exam gate only)

Soft rollback (flag flip):
  UPDATE app_config SET value='"v2"'::jsonb WHERE key='unit_layout';

Recommended next: Ali opens any unit URL with ?layout=v3 on his admin account
and inspects:
  - Movement IV exam gate (locked / ready / passed) — the page's destination
  - Compass inner ring matches gate state
  - Recording station thumbnail + 'تابعي من mm:ss' if partial watch progress
  - Recommended-path glowing dot tracking the next-recommended station

═══════════════════════════════════════════════════════════════
```
