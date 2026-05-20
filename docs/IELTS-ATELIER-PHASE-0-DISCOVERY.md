# IELTS Atelier Phase 0 — Discovery Report

_Generated 2026-05-20. Phase A is read-only — no source files or DB rows were modified._
_Disk changes from Phase A: this report + `scripts/discover-ielts-atelier-phase0.cjs` only._

---

## V1 surface area

- **V1 pages directory:** `src/pages/student/ielts/`
- **V1 page files (37 total):**
  - `IELTSLockedPanel.jsx`, `StudentIELTSHub.jsx`, `IELTSComingSoon.jsx`
  - `diagnostic/`: `DiagnosticFlow.jsx`, `DiagnosticReading.jsx`, `DiagnosticListening.jsx`, `DiagnosticWriting.jsx`, `DiagnosticSpeaking.jsx`, `DiagnosticSubmitting.jsx`, `DiagnosticResults.jsx`, `DiagnosticWelcome.jsx`, `DiagnosticError.jsx`, `DiagnosticSkeleton.jsx`
  - `reading/`: `ReadingLab.jsx`, `ReadingSkillModule.jsx`, `ReadingPassagePractice.jsx`
  - `listening/`: `ListeningLab.jsx`, `ListeningSectionModule.jsx`, `ListeningPractice.jsx`
  - `writing/`: `WritingLab.jsx`, `WritingTaskPicker.jsx`, `WritingWorkspace.jsx`, `WritingFeedback.jsx`, `WritingHistory.jsx`
  - `speaking/`: `SpeakingLab.jsx`, `SpeakingPartPicker.jsx`, `SpeakingSession.jsx`, `SpeakingFeedback.jsx`, `SpeakingHistory.jsx`
  - `mock/`: `MockCenter.jsx`, `MockPreFlight.jsx`, `MockFlow.jsx`, `MockResult.jsx`, `MockHistory.jsx`
  - `plan/`: `IELTSPlanView.jsx`, `IELTSPlanEdit.jsx`
  - `errors/`: `ErrorBankHome.jsx`, `ErrorBankReview.jsx`
- **V1 routes registered (`src/App.jsx`):** 28 routes, all under `<Route path="/student/ielts" element={IELTSGuard}>` block at lines 689–719.
  - Imports as `lazyRetry` at lines 88–115.
- **V1 page imports from outside the V1 pages directory:**
  - `src/components/ielts/IELTSGuard.jsx:4` → `import IELTSLockedPanel from '@/pages/student/ielts/IELTSLockedPanel'`. **This is the only cross-import of a V1 page component.** IELTSGuard is shared between V1 and V3 (V3 routes nest IELTSGuard via the V2Gate). When `IELTSLockedPanel` is renamed to `.legacy.jsx`, IELTSGuard's import must be updated to `.legacy` (or another suitable lockout panel must replace it).

---

## V3 surface area

- **V3 directory tree (28 files under `src/pages/student/ielts-v2/`):**
  ```
  Diagnostic.jsx  DiagnosticResults.jsx  Home.jsx  Journey.jsx  Listening.jsx
  Readiness.jsx  Reading.jsx  Speaking.jsx  Trainer.jsx  Writing.jsx
  Errors/{index,ReviewSession,Insights}.jsx + useErrorBank.js
  Mock/{index,MockSession,MockResults}.jsx + useMockSession.js
  Mock/segments/{MockReading,MockListening,MockWriting,MockSpeaking}.jsx
  _helpers/{resolveStudentId,todayFocus,weekPhase}.js
  _layout/{IELTSV2Gate,IELTSMasterclassLayout,PlaceholderPage}.jsx
  ```
- **V3 routes registered (`src/App.jsx` lines 722–743):** 16 routes nested under `/student/ielts-v2` → `IELTSV2Gate` → `IELTSGuard` → `IELTSMasterclassLayout` → individual pages.
- **`ielts-v2` references in the codebase:** 95 total occurrences in 24 files. 51 outside the renamed directory itself. Locations:
  - `src/App.jsx` — 19 occurrences (18 imports + 1 route).
  - `src/config/navigation.js:156` — admin nav entry `id: 'ielts-v2-preview'` with `to: '/admin/ielts-v2-preview'`.
  - `src/hooks/ielts/useDiagnosticResultV2.js:19` — React Query key `'ielts-v2-diagnostic-result'`.
  - `src/lib/ieltsV2Flag.js` — feature flag utility (5 mentions, including localStorage key).
  - `src/pages/admin/curriculum/components/IELTSMasterclassV2Preview.jsx` — UNUSED file with 12 path references (see Risks).
  - `src/pages/admin/ielts-preview/ieltsSacredPages.js` — 11 imports from `@/pages/student/ielts-v2/*`.
  - V3 pages cross-import `useIELTSPreview` from `@/pages/admin/ielts-preview/IELTSPreviewContext` (3 sites: `Home.jsx:9`, `Journey.jsx:9`, `_helpers/resolveStudentId.js:2`).
  - V3 internal `/student/ielts-v2/*` route strings (`navigate(...)`, `<Link to=...>`) — Home, Journey, DiagnosticResults, Errors/Insights, Mock/* etc.
- **Hooks the V3 uses (with paths):**
  - `@/pages/admin/ielts-preview/IELTSPreviewContext` → `useIELTSPreview` (admin-preview impersonation context)
  - `@/hooks/ielts/useDiagnosticStateV2`, `useDiagnosticResultV2`, `useReadingLab`, `useListeningLab`, `useWritingLab`, `useSpeakingLab`, `useAdaptivePlan`, `useDiagnostic`, `useMockCenter`, `useErrorBank` (these are shared with V1)
  - `src/pages/student/ielts-v2/Errors/useErrorBank.js` and `src/pages/student/ielts-v2/Mock/useMockSession.js` are V3-local hooks

---

## Feature flag + guard + admin preview

- **Feature flag utility:** `src/lib/ieltsV2Flag.js` (single file, 75 lines). Exports `isIELTSV2Enabled(profile)`. Storage key `'fluentia.ielts-v2'`. URL param `?ielts-v2=1` / `?ielts-v2=0`. Allowlist contains `ali@fluentia.academy`. Also installs `window.__enableIELTSV2()` and `window.__disableIELTSV2()` helpers.
- **Feature-flag-gated entry point:** `src/pages/student/ielts-v2/_layout/IELTSV2Gate.jsx` — calls `isIELTSV2Enabled(profile)`; redirects to `/student/ielts` if false.
- **`IELTSGuard`:** `src/components/ielts/IELTSGuard.jsx`. Logic: loading → blank skeleton; no profile → `/login`; non-student → `/`; `!hasIELTSAccess(studentData)` → renders `<IELTSLockedPanel />` (the V1 lockout panel). Otherwise renders `<Outlet />`. This guard is shared by V1 and V3.
- **`hasIELTSAccess`:** `src/lib/packageAccess.js` — returns `studentData.package === 'ielts' || (Array.isArray(custom_access) && custom_access.includes('ielts'))`. **Does NOT currently allow `tamayuz`** — see Risks + Confirmations.
- **Admin preview pages — TWO files exist; only one is wired:**
  - **WIRED (active):** `src/pages/admin/IELTSPreview.jsx` — exported as `IELTSPreview`, routed at `/admin/ielts-v2-preview` (App.jsx:850). Imports support files from `src/pages/admin/ielts-preview/`: `ieltsSacredPages.js`, `IELTSPreviewProvider`/`useIELTSPreview` context, `PhaseTimeline.jsx`, `SacredPageCard.jsx`. The `ieltsSacredPages.js` file imports all 11 V3 page components directly. The V3 pages reciprocally import `useIELTSPreview` so admin preview can impersonate a target student.
  - **UNWIRED (orphan):** `src/pages/admin/curriculum/components/IELTSMasterclassV2Preview.jsx` — defines `export default function IELTSMasterclassV2Preview()` but has zero importers. Contains 12 hardcoded `/student/ielts-v2/...?ielts-v2=1` href strings. Dead code; should be renamed to `.legacy.jsx`.

---

## Router + sidebar

- **Router file:** `src/App.jsx` (single file, ~1000 lines). All routes are declared inline.
- **Sidebar file:** `src/components/layout/Sidebar.jsx` (active). `src/components/layout/Sidebar.legacy.jsx` is an old archived version.
- **Mobile UI:** `src/components/layout/MobileBar.jsx` (bottom tab bar, 5 fixed slots, IELTS excluded by policy comment), `src/components/layout/MobileDrawer.jsx` (the "More" overflow drawer; also applies package gating).
- **Navigation config file:** `src/config/navigation.js`.
- **Current package-gating pattern (the convention to follow):**
  ```js
  // navigation.js (V1 entries — both desktop sidebar and drawer)
  { id: 'ielts', label: 'IELTS', icon: Target, to: '/student/ielts', requiresPackage: 'ielts' }
  ```
  Handled in `src/components/layout/Sidebar.jsx:68-74` and `src/components/layout/MobileDrawer.jsx:97-101`:
  ```js
  visibleItems = section.items.filter(item => {
    if (item.requiresIELTSStudents) return hasIELTSStudents
    if (!item.requiresPackage) return true
    if (item.requiresPackage === 'ielts') {
      return studentData?.package === 'ielts' ||
        (Array.isArray(studentData?.custom_access) && studentData?.custom_access.includes('ielts'))
    }
    return true
  })
  ```
  The drawer filter is the same shape but calls `hasIELTSAccess(studentData)` instead of inlining the check.

---

## Masterclass design system

- **Sacred component directory (the one actually used by V3):** `src/design-system/components/masterclass/` — **all 5 prompt-listed components are present**:
  - `BandDisplay.jsx`, `NarrativeReveal.jsx`, `TrainerPresence.jsx`, `ExamCountdown.jsx`, `ChapterTransition.jsx`
  - Plus: `ErrorLesson.jsx`, `JourneyTimeline.jsx`, `RecallPrompt.jsx`, `WeekReveal.jsx`, `StrategyModule.jsx`, `_motion.js`, `index.js`
- **Separate (background-only) directory:** `src/design-system/masterclass/` — contains only `IELTSSunsetBackground.jsx` + `.css`. Different purpose; not the "sacred 5" prompt anchored to.
- **Missing components from the locked set:** none.
- **Note:** the Phase A.5 grep commands in the prompt search `src/design-system/masterclass` only — they would falsely report "missing" without checking `src/design-system/components/masterclass`. The components ARE present; the prompt's search path was a level too shallow.

---

## DB state

- **Distinct `package` values (source-of-truth is `students.package`, NOT `profiles.package` — see Risks):**
  ```
  asas:       9
  tamayuz:    5
  talaqa:     4
  private:    3
  recordings: 1
  ```
  **No students currently have `package='ielts'`.** No students have `custom_access` containing `'ielts'`.
- **IELTS-eligible students (`package IN ('ielts','tamayuz')` AND `students.deleted_at IS NULL` AND `profiles.role='student'`): 5 students, all tamayuz:**
  - ابتسام النجيدي — group `aaaaaaaa-4444-…`
  - سارة شراحيلي — group `bbbbbbbb-2222-…`
  - علي سعيد القحطاني — group `bbbbbbbb-2222-…`
  - ليان عبدالله العنزي — group `bbbbbbbb-2222-…`
  - وعد العمران — group `null`
- **`ielts_*` tables in `public` schema (14 total):**
  `ielts_adaptive_plans`, `ielts_diagnostic`, `ielts_error_bank`, `ielts_listening_sections`, `ielts_mock_attempts`, `ielts_mock_tests`, `ielts_reading_passages`, `ielts_reading_skills`, `ielts_skill_sessions`, `ielts_speaking_questions`, `ielts_student_progress`, `ielts_student_results`, `ielts_submissions`, `ielts_writing_tasks`.
- **Critical V3 table rowcounts (all empty — no student has used V3 yet):**
  - `ielts_skill_sessions`: 0
  - `ielts_adaptive_plans`: 0
  - `ielts_student_progress`: 0
  - `ielts_mock_attempts`: 0
  - `ielts_error_bank`: 0

---

## Risks / surprises found

1. **The prompt's `profile.package` assumption is wrong for this codebase.** `profiles` has no `package` column. Package + `custom_access` both live on `students`. The auth store exposes them as `useAuthStore.studentData`, and that's what every existing gate uses. The new sidebar entry must gate on `studentData?.package`, not `profile?.package`. This is consistent with how `requiresPackage: 'ielts'` already works.
2. **`hasIELTSAccess` does NOT include tamayuz today.** All 5 IELTS-eligible students in production are tamayuz. Right now, the V1 IELTS sidebar entry is effectively invisible to all of them (no `package='ielts'` students exist, no `custom_access` populated). The prompt's mission says "package = ielts or package = tamayuz" — if we honor that, `hasIELTSAccess` must be expanded to also accept tamayuz, otherwise the new sidebar entry leads to `IELTSLockedPanel` for every actual user. See Confirmations.
3. **IELTSGuard imports a V1 page (`IELTSLockedPanel`).** Renaming the V1 file to `.legacy.jsx` per Phase B will break IELTSGuard unless its import is updated to `.legacy` too. The locked-panel content is V1-era (mentions packages, pricing), so we should update the import target rather than re-author content. Phase B should include this one extra import update; flagging here so it's not a surprise.
4. **Two admin preview files exist; one is dead.** The wired preview is `src/pages/admin/IELTSPreview.jsx` (component name `IELTSPreview`, NOT `IELTSMasterclassV2Preview` as the prompt's C.5 example assumed). The orphan file `src/pages/admin/curriculum/components/IELTSMasterclassV2Preview.jsx` has no importers but contains 12 V2 path strings. We should rename it to `.legacy.jsx` so the final `ielts-v2` grep in C.8 is clean.
5. **The active admin preview is cross-imported by V3.** `Home.jsx`, `Journey.jsx`, and `_helpers/resolveStudentId.js` import `useIELTSPreview` from `@/pages/admin/ielts-preview/IELTSPreviewContext`. So when Phase C renames the admin preview directory, those 3 V3 import paths must update in lockstep, or we leave the admin preview directory at its current path (`src/pages/admin/ielts-preview/`) and rename only the wrapper file `IELTSPreview.jsx` → `IELTSAtelierPreview.jsx`. The path `ielts-preview` is already version-neutral, so the lighter rename is preferable. See Confirmations.
6. **No tracking remains of who uses `?ielts-v2=1`.** Removing the flag is safe — the localStorage key `'fluentia.ielts-v2'` will linger on tester devices but `isIELTSV2Enabled` will be unreferenced after C.4. No cleanup required beyond the rename.
7. **The full `ielts_*` schema is 14 tables, not 5.** The prompt's A.6 lists 5 "critical V3 tables"; the others (`ielts_diagnostic`, `ielts_listening_sections`, `ielts_mock_tests`, `ielts_reading_passages`, `ielts_reading_skills`, `ielts_speaking_questions`, `ielts_student_results`, `ielts_submissions`, `ielts_writing_tasks`) exist too. Not a problem — just heads-up that Phase 0 touches none of these.

---

## Proposed redirect map (V1 → Atelier)

V1 routes are 28 in total. The Atelier has fewer surface pages because V3 collapsed sub-skill / per-passage / per-task routes into the parent skill page. Mapping below:

| V1 path | Target |
|---|---|
| `/student/ielts` | `/student/ielts-atelier` |
| `/student/ielts/diagnostic` | `/student/ielts-atelier/diagnostic` |
| `/student/ielts/reading` | `/student/ielts-atelier/reading` |
| `/student/ielts/reading/skill/:questionType` | `/student/ielts-atelier/reading` |
| `/student/ielts/reading/passage/:passageId` | `/student/ielts-atelier/reading` |
| `/student/ielts/listening` | `/student/ielts-atelier/listening` |
| `/student/ielts/listening/section/:sectionNumber` | `/student/ielts-atelier/listening` |
| `/student/ielts/listening/section/:n/practice/:sectionId` | `/student/ielts-atelier/listening` |
| `/student/ielts/writing` | `/student/ielts-atelier/writing` |
| `/student/ielts/writing/history` | `/student/ielts-atelier/writing` |
| `/student/ielts/writing/feedback/:submissionId` | `/student/ielts-atelier/writing` |
| `/student/ielts/writing/:category` | `/student/ielts-atelier/writing` |
| `/student/ielts/writing/:category/task/:taskId` | `/student/ielts-atelier/writing` |
| `/student/ielts/speaking` | `/student/ielts-atelier/speaking` |
| `/student/ielts/speaking/history` | `/student/ielts-atelier/speaking` |
| `/student/ielts/speaking/feedback/:sessionId` | `/student/ielts-atelier/speaking` |
| `/student/ielts/speaking/part/:partNum` | `/student/ielts-atelier/speaking` |
| `/student/ielts/speaking/session/:questionId` | `/student/ielts-atelier/speaking` |
| `/student/ielts/mock` | `/student/ielts-atelier/mock` |
| `/student/ielts/mock/history` | `/student/ielts-atelier/mock` |
| `/student/ielts/mock/brief/:mockId` | `/student/ielts-atelier/mock` |
| `/student/ielts/mock/attempt/:attemptId` | `/student/ielts-atelier/mock/:attemptId` (param preserved) |
| `/student/ielts/mock/result/:resultId` | `/student/ielts-atelier/mock` (V3 param name differs — drop to hub) |
| `/student/ielts/plan` | `/student/ielts-atelier/journey` |
| `/student/ielts/plan/edit` | `/student/ielts-atelier/journey` |
| `/student/ielts/errors` | `/student/ielts-atelier/errors` |
| `/student/ielts/errors/review` | `/student/ielts-atelier/errors/review` |
| `/student/ielts/:section` (catch-all `IELTSComingSoon`) | `/student/ielts-atelier` |

**Legacy V3 redirects** (per prompt C.6):
- `/student/ielts-v2` → `/student/ielts-atelier`
- `/student/ielts-v2/*` → `/student/ielts-atelier` (or matching subpath; React Router's `<Navigate>` supports literal-mapping via `useParams` if we want subpath preservation, but the prompt suggests a single bucket-to-home redirect for legacy v2 — keeping it simple).

---

## Confirmations needed before Phase B

1. **Expand `hasIELTSAccess` to accept `tamayuz`?** All 5 IELTS-eligible students in production are tamayuz, and the prompt's mission text says "package = ielts or package = tamayuz". Without this change, the new Atelier sidebar entry will be invisible (and the route locked) for every actual user. Proposed change in Phase C: `src/lib/packageAccess.js`:
   ```js
   export function hasIELTSAccess(studentData) {
     if (!studentData) return false
     const pkg = studentData.package
     const custom = Array.isArray(studentData.custom_access) ? studentData.custom_access : []
     return pkg === 'ielts' || pkg === 'tamayuz' || custom.includes('ielts')
   }
   ```
   Confirm before Phase C.7 + Phase C also updates the inline filter in Sidebar.jsx + MobileDrawer.jsx (currently hardcoded to `=== 'ielts'`).

2. **Admin preview rename scope.** The active preview is `IELTSPreview` (not `IELTSMasterclassV2Preview` as the prompt assumed). Two options:
   - **(a) Minimal rename** — rename only the wrapper file `src/pages/admin/IELTSPreview.jsx` → `IELTSAtelierPreview.jsx`, rename the route `/admin/ielts-v2-preview` → `/admin/ielts-atelier-preview`, and rename the orphan `IELTSMasterclassV2Preview.jsx` → `.legacy.jsx`. Leave the support directory at `src/pages/admin/ielts-preview/` (it's already version-neutral).
   - **(b) Full rename** — same as (a) plus also rename the support directory to `src/pages/admin/ielts-atelier-preview/`, which requires updating 3 cross-imports from V3 pages.
   Recommend **(a)** — less churn, fewer touchpoints, the directory name `ielts-preview` is not version-leaky.

3. **Sidebar gating field shape.** The existing pattern is `requiresPackage: 'ielts'`. To extend it for the new Atelier entry to include tamayuz, the cleanest path is to update `hasIELTSAccess` per confirmation #1 and reuse the same `requiresPackage: 'ielts'` field on the new entry (so behavior stays one place). Confirm we're not introducing a new field like `requiresPackages: ['ielts','tamayuz']` or `visibleFor: fn`.

4. **`useDiagnosticResultV2.js:19` query key `'ielts-v2-diagnostic-result'`.** This is a React Query cache key, not a route. Keeping it as-is means the final `ielts-v2` sweep in C.8 will return 1 hit. Options: (a) leave it (stable cache key, not user-visible — acceptable), (b) rename to `'ielts-atelier-diagnostic-result'` for consistency. Recommend **(a)** to avoid a same-day cache miss for any in-flight queries; flag for cleanup later. Confirm.

5. **Legacy V3 subpath redirects.** Prompt C.6 example uses two routes: `ielts-v2` (exact) and `ielts-v2/*` (catch-all). React Router v6 routing requires careful nesting under the student layout. Confirm the prompt is OK with us inserting these as standalone routes inside the `/student` block, both pointing to the Atelier home (no per-subpath fan-out — V1 already has its own per-subpath redirects in B.2).

---

## Phase A summary

- Phase A is read-only and complete.
- Disk changes from Phase A: ONLY `docs/IELTS-ATELIER-PHASE-0-DISCOVERY.md` (this file) + `scripts/discover-ielts-atelier-phase0.cjs`.
- DB changes: none.
- Git changes: none.
- 5 confirmation items above need answers from Ali before Phase B can be safely executed.
