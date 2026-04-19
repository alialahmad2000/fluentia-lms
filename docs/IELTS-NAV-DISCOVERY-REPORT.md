# IELTS Nav Discovery Report — PROMPT-11

## A.1 — IELTS Routes in App.jsx (lines 572-599)

28 student routes, all under `/student/ielts/...`:

| Route | Component |
|---|---|
| /student/ielts | StudentIELTSHub |
| /student/ielts/diagnostic | DiagnosticFlow |
| /student/ielts/reading | ReadingLab |
| /student/ielts/reading/skill/:questionType | ReadingSkillModule |
| /student/ielts/reading/passage/:passageId | ReadingPassagePractice |
| /student/ielts/listening | ListeningLab |
| /student/ielts/listening/section/:sectionNumber | ListeningSectionModule |
| /student/ielts/listening/section/:sectionNumber/practice/:sectionId | ListeningPractice |
| /student/ielts/writing | WritingLab |
| /student/ielts/writing/history | WritingHistory |
| /student/ielts/writing/feedback/:submissionId | WritingFeedback |
| /student/ielts/writing/:category | WritingTaskPicker |
| /student/ielts/writing/:category/task/:taskId | WritingWorkspace |
| /student/ielts/speaking | SpeakingLab |
| /student/ielts/speaking/history | SpeakingHistory |
| /student/ielts/speaking/feedback/:sessionId | SpeakingFeedback |
| /student/ielts/speaking/part/:partNum | SpeakingPartPicker |
| /student/ielts/speaking/session/:questionId | SpeakingSession |
| /student/ielts/mock | MockCenter |
| /student/ielts/mock/history | MockHistory |
| /student/ielts/mock/brief/:mockId | MockPreFlight |
| /student/ielts/mock/attempt/:attemptId | MockFlow |
| /student/ielts/mock/result/:resultId | MockResult |
| /student/ielts/plan | IELTSPlanView |
| /student/ielts/plan/edit | IELTSPlanEdit |
| /student/ielts/errors | ErrorBankHome |
| /student/ielts/errors/review | ErrorBankReview |
| /student/ielts/:section | IELTSComingSoon (wildcard) |

Also: `/admin/curriculum/ielts` → IELTSManagement (admin, separate guard, not touched)

## A.2 — Inline Gate Audit

Pages WITH inline IELTS package gate (11):
- StudentIELTSHub — uses useMemo + studentData.package/custom_access, redirects to null render
- DiagnosticFlow — package gate
- ReadingLab — NoAccessPanel inline
- ListeningLab — package gate
- ListeningSectionModule — package gate
- ListeningPractice — package gate
- WritingLab — package gate
- WritingWorkspace — package gate
- SpeakingLab — package gate
- MockCenter — package gate
- IELTSPlanView — package gate

Pages WITHOUT gate (17 — security holes today):
ReadingSkillModule, ReadingPassagePractice, WritingHistory, WritingFeedback, WritingTaskPicker,
SpeakingHistory, SpeakingFeedback, SpeakingPartPicker, SpeakingSession,
MockHistory, MockPreFlight, MockFlow, MockResult,
IELTSPlanEdit, ErrorBankHome, ErrorBankReview, IELTSComingSoon

## A.3 — Utilities

- **`hasPackageAccess`**: EXISTS at `src/components/PackageGate.jsx`
  - Signature: `hasPackageAccess(studentPackage, requiredPackage)` — rank comparison
  - Does NOT handle `custom_access` → needs `hasIELTSAccess` wrapper
- **ProtectedRoute**: EXISTS — used at line 514 with `allowedRoles` prop
- **LockedFeature**: EXISTS at `src/pages/student/LockedFeature.jsx`
  - Props: `{ requiredPackage, featureName }`
  - Uses `studentData.package` from authStore

## A.4 — Navigation Config

File: `src/config/navigation.js`
IELTS sidebar entry: **EXISTS** in `STUDENT_NAV.sections[0].items` with `requiresPackage: 'ielts'`
```js
{ id: 'ielts', label: 'IELTS', icon: Target, to: '/student/ielts', requiresPackage: 'ielts' }
```
Sidebar filtering: **WORKS** — Sidebar.jsx already filters by requiresPackage, checks `studentData.package === 'ielts' || custom_access.includes('ielts')`

drawerSections: IELTS is **MISSING** (intentionally excluded, but mobile IELTS users need access)

## A.5 — Mobile Bar

Items: 5 (dashboard, curriculum, flashcards, progress, more) — **IELTS NOT included** ✓
MobileDrawer falls back to `sections` when `drawerSections` is used, which includes IELTS. But MobileDrawer does NOT filter by `requiresPackage` — this means non-IELTS students see IELTS in the "More" drawer. **BUG fixed in this prompt.**

## A.6 — Toast System

Custom FluentiaToast at `src/components/ui/FluentiaToast.jsx`
- Module-level `toast({ type, title, description })` — Zustand-backed, no provider needed
- `import { toast } from '@/components/ui/FluentiaToast'` works anywhere

## A.7 — Profile/Package Shape

- `profile` (from `profiles` table): has `role`, `display_name` — NO package/custom_access
- `studentData` (from `students` table): has `package`, `custom_access`, `level`, `xp_total`
- `loading` state: `true` during auth init, `false` after
- Impersonation: replaces BOTH `profile` and `studentData` with impersonated user's data ✓

## A.8 — Impersonation

When admin impersonates: `profile` → impersonated user's profile, `studentData` → impersonated user's student data. IELTSGuard checks studentData.package → correctly shows locked panel for non-IELTS impersonated users.

## A.10 — Summary Table

| Check | Result |
|---|---|
| Total IELTS routes in App.jsx | 28 student routes |
| Routes with inline gate | 11 / 28 |
| Routes WITHOUT inline gate | 17 (see A.2) |
| hasPackageAccess utility exists | YES (src/components/PackageGate.jsx) |
| Knows about custom_access? | NO — hasIELTSAccess added to src/lib/packageAccess.js |
| ProtectedRoute component exists | YES (inline in App.jsx, allowedRoles prop) |
| LockedFeature component exists | YES (src/pages/student/LockedFeature.jsx, requiredPackage + featureName) |
| Sidebar nav config supports requiresPackage | YES — already working |
| Current IELTS sidebar entry state | EXISTS with requiresPackage='ielts', filtered correctly |
| Mobile bar item count | 5 (IELTS NOT present) ✓ |
| Toast library | FluentiaToast (src/components/ui/FluentiaToast.jsx) |
| Impersonation propagates package correctly | YES — studentData replaced during impersonation |
| MobileDrawer filters requiresPackage | NO — BUG: shows IELTS to all students. Fixed in this prompt. |
