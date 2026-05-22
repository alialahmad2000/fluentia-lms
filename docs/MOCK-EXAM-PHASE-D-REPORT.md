# Phase D Report — Routes + Sidebar (covers Phases D–H frontend work)

## New files created

| Path | Purpose |
|---|---|
| `src/pages/student/mock-exam/MockExamGate.jsx` | Route wrapper. Reads `studentData.academic_level`, fetches active mock_exams (level join), gates on visibility + level. Renders `<Outlet/>` or redirects to `/student`. |
| `src/pages/student/mock-exam/MockExamHub.jsx` | Intro screen. 4 visual states: `locked` (live countdown), `intro`, `resume`, `submitted`. Premium GlassPanel + AuroraBackground. |
| `src/pages/student/mock-exam/MockExamAttempt.jsx` | Bulletproof exam page. All hooks at top, server-authoritative timer, debounced autosave (800ms answers, 1500ms writing), idempotent submit, auto-submit on timer expiry, confirmation dialog, sticky top + bottom bars. |
| `src/pages/student/mock-exam/MockExamResult.jsx` | Result page. Animated count-up score, pass/fail badge, 5 section breakdown cards with mini progress bars, mock notice, CTA. |
| `src/pages/trainer/MockExamResults.jsx` | Shared trainer + admin read-only results table. Filter by exam (A1/B1), 4 stat boxes, expandable writing review. |

## Routes wired (in `src/App.jsx`)

- `lazyRetry` imports added (block at line ~225)
- Student routes (nested under `MockExamGate`):
  ```
  /student/mock-exam              → MockExamGate → MockExamHub (index)
  /student/mock-exam/attempt      → MockExamAttempt
  /student/mock-exam/result       → MockExamResult
  ```
- Trainer route: `/trainer/mock-exam-results` → `MockExamResults`
- Admin route: `/admin/mock-exam-results` → `MockExamResults`

## Sidebar (in `src/config/navigation.js` + `src/components/layout/Sidebar.jsx`)

- New `STUDENT_NAV` section `"الاختبارات"` between `"التعلّم"` and `"المجتمع"`, with a single item `{ id: 'mock-exam', label: 'الاختبار التجريبي', requiresMockExamAccess: true }`.
- New `TRAINER_NAV` item under `"الأدوات"`: `نتائج الاختبار التجريبي` → `/trainer/mock-exam-results`.
- New `ADMIN_NAV` item under `"نظرة عامة"`: `نتائج الاختبار التجريبي` → `/admin/mock-exam-results`.
- Sidebar.jsx adds:
  - TanStack Query `'mock-exam-visibility'` (60s staleTime) fetching `mock_exams` with `level:curriculum_levels(level_number)` foreign-table select.
  - `canSeeMockExam` boolean derived from: visibility `'live'` (level match for students; always for staff) OR visibility `'preview'` + (test account at matching level OR staff).
  - Filter: `item.requiresMockExamAccess` → `canSeeMockExam`.

## Sanity checks

- All 8 touched files parse OK under `@babel/parser` (jsx plugin)
- No `vite build` run locally (per project rules)
- Hooks rule: every page declares all `useState`/`useEffect`/`useMemo`/`useCallback`/`useQuery`/`useNavigate` BEFORE any conditional return
- `profile?.id` used everywhere (no `user?.id`)
- Reading passages share `passage_text` + `passage_title` per question (denormalized in DB, repeated client-side fine)

## Behaviour against the spec

| Spec rule | How honored |
|---|---|
| Server-authoritative timer | `expires_at` from `mock_exam_start` RPC. Client ticks 1s; auto-submit at 0; server rejects with `time_expired` on save_answer past `expires_at`. |
| One attempt per student | DB `UNIQUE (exam_id, student_id)` + RPC re-uses existing in-flight attempt or rejects on `already_submitted`. |
| Refresh-safe resume | Every answer debounced into DB; on refresh, `mock_exam_start` returns `saved_answers` + remaining `expires_at`. |
| Idempotent submit | `mock_exam_submit` returns same scores with `idempotent: true` on second call. |
| RLS — students only own data | Migration policy `me_attempts_student_select` (`student_id = auth.uid()`). Direct write blocked unless admin; all writes flow through SECURITY DEFINER RPCs. |
| Premium intro + result, minimal attempt | Attempt page uses solid `var(--ds-background)`, no AuroraBackground, no backdrop-filter on animated elements, only transform/opacity transitions. |
| Visibility preview | Default `'preview'` in seed; RPC rejects non-staff non-test accounts with `exam_in_preview_mode`. Sidebar filter mirrors logic so the menu item also hides. |
