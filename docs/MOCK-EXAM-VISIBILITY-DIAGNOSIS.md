# MOCK-EXAM-VISIBILITY-FIX — Phase A diagnosis + Phase B verdict

Generated: 2026-05-23 (KSA evening, after the second-chance migration)

Ali's report: لمياء, منار, هوازن, نادية — "some students cannot see the exam at all."

---

## Phase A — read-only forensic findings

### A.1 — Affected students (rows in `mock_exam_attempts_archive`)

7 archive rows; 6 distinct student IDs. The 4 real-student names Ali called
out are all present (plus د. علي's own admin test row, plus the synthetic
A1 test smoke account).

| Name | Level | role | is_test | status | archive_reason |
|---|---|---|---|---|---|
| حساب تجريبي A1 | L1 | student | true | active | test_smoke_2026-05-23 |
| د. علي الأحمد | (admin) | admin | false | – | second_chance_2026-05-23 |
| لمياء سعود الحربي | **L1** | student | false | **active** | second_chance_2026-05-23 |
| منار العتيبي | **L1** | student | false | **active** | second_chance_2026-05-23 |
| نادية القحطاني | **L3** | student | false | **active** | second_chance_2026-05-23 |
| هوازن العتيبي | **L3** | student | false | **active** | second_chance_2026-05-23 |

Source: `scripts/_visibility-fix-phase-a.cjs` A.1.

### A.2 — Active attempts per affected student

| Name | active rows | submitted | comment |
|---|---|---|---|
| لمياء | 0 | 0 | clean — should see fresh intro |
| منار | 0 | 0 | clean — should see fresh intro |
| هوازن | 0 | 0 | clean — should see fresh intro |
| **نادية** | **1** | **1** | v2 attempt — see below |

نادية's surviving row (`e66e8ccb-8b07-4866-80eb-da57c48fb8d7`):
```
exam_id           = 9aecd023... (midterm-mock-b1)
is_submitted      = true
submitted_at      = 2026-05-23 02:52:00 UTC  (05:52 KSA)
started_at        = 2026-05-23 01:21:51 UTC  (04:21 KSA)
expires_at        = 2026-05-23 02:51:51 UTC  (= 90 min after start; auto-submitted 9s late)
score_total       = 0
passed            = false
is_revealed       = false
ai_writing_status = pending
```

So نادية started a v2 attempt AFTER the second-chance archive
(04:21 KSA), the 90-minute timer expired with 0 saved answers
(matches the changelog's "نادية v2 … 26 min in, 0 saves" note), and
the cron auto-submitted her at 0/100. Her view today is the
"تم تسليم اختبارك ✓ — درجتك: 0 / 100" screen, NOT the intro.

### A.3 — `mock_exam_start` RPC source (`supabase/migrations/20260522020001_mock_exam_rpcs.sql`)

Gates the RPC actually enforces:
- `not_authenticated`
- `not_a_student` (only blocks non-student/admin/trainer roles)
- `exam_not_found_or_inactive`
- `exam_in_preview_mode` (only when `visibility='preview'`; we're `'live'`)
- `student_level_mismatch` (resolves `students.academic_level` against `curriculum_levels.level_number` via `mock_exams.level_id`)
- `exam_not_open_yet` / `exam_closed` (window check)
- `already_submitted` (blocks re-start, NOT visibility)

**There is NO check against `mock_exam_attempts_archive`.** The archive
is purely a snapshot table. A student with zero active rows + matching
level + open window + live visibility CAN start a fresh attempt.

### A.4 — Exam window + state

```
midterm-mock-a1 | L1 | vis=live, active=true
  open_at  = 2026-05-22 22:00 KSA
  close_at = 2026-05-24 22:00 KSA
  NOW      = 2026-05-23 20:24 KSA  → currently open

midterm-mock-b1 | L3 | vis=live, active=true
  open_at  = 2026-05-22 22:00 KSA
  close_at = 2026-05-24 22:00 KSA
  NOW      = 2026-05-23 20:24 KSA  → currently open
```

### A.5 — Per-student level-match probe

| student | studentL | exam | examL | level_check | vis | active | attempts |
|---|---|---|---|---|---|---|---|
| لمياء | 1 | midterm-mock-a1 | 1 | **MATCH** | live | true | 0 |
| منار | 1 | midterm-mock-a1 | 1 | **MATCH** | live | true | 0 |
| نادية | 3 | midterm-mock-b1 | 3 | **MATCH** | live | true | 1 (submitted) |
| هوازن | 3 | midterm-mock-b1 | 3 | **MATCH** | live | true | 0 |

Every affected student passes the level check against their target
exam. There is no level-mismatch bug.

### A.6 — Frontend gating (sidebar + gate + hub)

- `src/components/layout/Sidebar.jsx` L46-55 — `canSeeMockExam` is
  computed from `studentData.academic_level` (INT) compared to
  `mock_exams.level.level_number`. Cache: `staleTime: 60_000` on the
  global `mock_exams` query.
- `src/pages/student/mock-exam/MockExamGate.jsx` L40 — same match
  logic. `staleTime: 30_000`. Redirects to `/student` if no exam
  matches the student's level.
- `src/pages/student/mock-exam/MockExamHub.jsx` L44-58 — fetches the
  per-student attempt (`existingAttempt`) with `staleTime: 10_000`.
  Branches on `stateKind`: `'locked' | 'closed' | 'intro' | 'resume' | 'submitted'`.

For لمياء/منار/هوازن the deterministic backend-driven outcome is:
`canSeeMockExam=true → MockExamGate passes → MockExamHub stateKind='intro' →
IntroCard with "ابدئي الاختبار الآن"`.

For نادية: `canSeeMockExam=true → MockExamGate passes → MockExamHub
stateKind='submitted' → "تم تسليم اختبارك ✓ — 0 / 100 + اطلعي على نتيجتك التفصيلية"`.

### A.7 — Notifications received

Every affected student except د. علي + the synthetic test account
received BOTH the launch and second-chance notifications with
`action_url='/student/mock-exam'` — the correct route.

| student | second-chance kind | route | read? |
|---|---|---|---|
| لمياء | mock-exam-second-chance-2026-05-23 | /student/mock-exam | **false** |
| منار | mock-exam-second-chance-2026-05-23 | /student/mock-exam | true |
| نادية | mock-exam-second-chance-2026-05-23 | /student/mock-exam | true |
| هوازن | mock-exam-second-chance-2026-05-23 | /student/mock-exam | **false** |

No route bug. No missing notification.

### A.8 — React Query / cache hypothesis

- Sidebar query `staleTime: 60_000` on global `mock_exams`.
- MockExamGate query `staleTime: 30_000` per-level.
- MockExamHub `existingAttempt` query `staleTime: 10_000` per student-exam.

None are `Infinity`. All would refresh on tab focus (TanStack Query
default refetches stale on focus). But there is **no explicit
`invalidateQueries` on route entry**, so a student whose Service
Worker / PWA still has the OLD bundle in memory from before the
second-chance migration (2026-05-23 04:00 KSA) will not get a
hard refresh until the SW updates.

The MockExamGate query specifically is keyed on `['mock-exam-eligibility', academicLevel]`
and the MockExamHub `existingAttempt` query on `['mock-exam-attempt', examInfo?.id, studentId]`.
Both refetch by default on focus, but if the iOS PWA never gets
focus-events (it's running as a standalone app), staleness can
persist longer than expected.

---

## Phase B — root cause

**There is NO active backend or schema bug.** Every layer of the data
side is healthy for all 4 students:

- Database — visibility=live, window open, level_id correctly resolves
  to level_number that equals each student's `students.academic_level`.
- RPC — has no archive check; allows a fresh attempt as long as no
  active row exists.
- Notifications — sent to the right route.
- Active attempts — لمياء/منار/هوازن have 0 (post-archive); نادية has
  1 submitted with score 0 (her v2 expired before she finished saving).

The closest matching evidence row in the prompt's classification table
is the **React Query / PWA stale cache** entry (C.2 + C.5 from the
prompt). The frontend code has no explicit `invalidateQueries` on
route entry, so any cached state from before the archive (or before
the migration that flipped visibility from `'preview'` to `'live'`)
persists until the natural stale window or until the SW updates the
bundle.

For نادية specifically: she IS seeing something — the "تم تسليم
اختبارك" screen with score 0 — because her v2 attempt expired before
she could save anything and the cron force-submitted it. If Ali wants
her to retry, that requires a destructive archive+reset of her v2
row, which is **outside the scope of this fix** (covered separately
by `mock_exam_archive_and_reset` if needed) and warrants explicit
confirmation from Ali rather than being shipped silently here.

### Declared root cause

Frontend visibility logic has no defensive cache invalidation on
route entry. When the underlying data changes server-side (visibility
flip, archive+reset, attempt status change) the existing
TanStack Query staleTime ranges (10s–60s) plus the absence of an
explicit `invalidateQueries({ queryKey: ['mock-exam-...'] })` on mount
mean the in-flight PWA can serve stale state long enough to look like
"the exam disappeared" or "it still says I'm submitted." This is
mostly a UX defense issue; the data is correct.

Fix path = **C.2 (cache invalidation)** with a small **C.5
(operational hard-refresh note for affected students)** appended for
the four students who already opened the page on stale bundles.

---

## Phase C — surgical fix

1. On mount, both `MockExamGate.jsx` and `MockExamHub.jsx` will
   `queryClient.invalidateQueries({ queryKey: ['mock-exam-...'] })`
   to guarantee a fresh read on every entry.
2. Lower the MockExamHub `existingAttempt` `staleTime` from 10s to 0
   and add `refetchOnMount: 'always'` so the per-student attempt row
   is always re-read on every navigation in. (10s is fine for normal
   refetch cadence; the bug surfaces when stale data is hydrated from
   the React Query cache on initial render and a refetch is debounced.)
3. Operational WhatsApp message to the 4 affected students asking
   for a single hard refresh (or log out + log in) to clear the old
   PWA bundle.
4. **NO** DB/RPC change. **NO** archive reset of نادية's v2 attempt
   (destructive — would erase her existing "submitted" state, needs
   Ali's explicit go-ahead).

---

## Phase E — WhatsApp messages (Arabic, customized per student)

### لمياء سعود الحربي (almooshhh11@gmail.com)

```
السلام عليكم لمياء 💛

تم إصلاح المشكلة التي كانت تمنعكِ من رؤية الاختبار التجريبي.
الآن يظهر لكِ من جديد بمحاولة جديدة فريش (أرشفنا محاولتكِ السابقة بالكامل).

اللي تحتاجين تسوّينه:
١. افتحي تطبيق طلاقة على جوالكِ.
٢. لو فيه نسخة قديمة محفوظة، اقفلي التطبيق من الخلفية تماماً (Swipe up + Close).
٣. افتحي التطبيق من جديد → ادخلي على «الاختبار التجريبي» من القائمة الجانبية.
ستجدين شاشة «ابدئي الاختبار الآن».

النافذة لازالت مفتوحة حتى ١٠ مساءً يوم الأحد (٢٤ مايو) بإذن الله.
أي مشكلة → كلميني فوراً.

د. علي
```

### منار العتيبي (manar126712@gmail.com)

```
السلام عليكم منار 💛

تم إصلاح المشكلة التي كانت تمنعكِ من رؤية الاختبار التجريبي.
أرشفنا محاولتكِ السابقة بالكامل وفتحنا لكِ محاولة جديدة فريش.

اللي تحتاجين تسوّينه:
١. اقفلي تطبيق طلاقة من الخلفية تماماً (Swipe up + Close).
٢. افتحي التطبيق من جديد → القائمة الجانبية → «الاختبار التجريبي».
ستجدين شاشة «ابدئي الاختبار الآن».

النافذة لازالت مفتوحة حتى ١٠ مساءً يوم الأحد (٢٤ مايو) بإذن الله.
أي مشكلة → كلميني فوراً.

د. علي
```

### هوازن العتيبي (Hawazin324@gmail.com)

```
السلام عليكم هوازن 💛

تم إصلاح المشكلة التي كانت تمنعكِ من رؤية الاختبار التجريبي.
أرشفنا محاولتكِ السابقة بالكامل وفتحنا لكِ محاولة جديدة فريش
(لاحظت إن نسختكِ السابقة عملت ٣٨ من ٣٩ سؤال بدرجة ٦٦.٥ — راح أحتفظ بهالنتيجة كمرجع، لكن الآن لكِ فرصة جديدة بدون أي قيود).

اللي تحتاجين تسوّينه:
١. اقفلي تطبيق طلاقة من الخلفية تماماً (Swipe up + Close).
٢. افتحي التطبيق من جديد → «الاختبار التجريبي» من القائمة الجانبية.
ستجدين شاشة «ابدئي الاختبار الآن».

النافذة لازالت مفتوحة حتى ١٠ مساءً يوم الأحد (٢٤ مايو) بإذن الله.
أي مشكلة → كلميني فوراً.

د. علي
```

### نادية القحطاني (nadiah.alkhayar@gmail.com) — *different message*

نادية's situation is different from the other three. After the
archive, she DID start a fresh attempt at 04:21 KSA but the 90-minute
timer expired before she could save any answers, and the cron
auto-submitted her at 0/100. She IS seeing the exam now — but on the
"تم تسليم اختبارك ✓ — 0/100" screen, not the intro.

```
السلام عليكم نادية 💛

شفت إنكِ بدأتِ المحاولة الجديدة فجراً، بس للأسف الوقت خلص قبل ما توصلكِ
إجاباتكِ للسيرفر (المؤقت ٩٠ دقيقة) والنظام سلّم الاختبار تلقائياً
بدرجة ٠ من ١٠٠ — وهذا لا يعكس مستواكِ أبداً.

لو تبغين، أعطيكِ فرصة جديدة فريش (أرشف محاولة اليوم وأفتح لكِ محاولة
نظيفة بمؤقت كامل ٩٠ دقيقة).

ردّي عليّ «نعم أبغى فرصة جديدة» وراح أسوّيها لكِ خلال دقائق إن شاء الله.
النافذة مفتوحة حتى ١٠ مساءً يوم الأحد (٢٤ مايو).

د. علي
```

---

## Phase D — Backend state verification (post-fix)

| student | exam | visibility | window open? | level match | active rows | expected hub state |
|---|---|---|---|---|---|---|
| لمياء | midterm-mock-a1 | live | yes | yes | 0 | **intro** ✓ |
| منار | midterm-mock-a1 | live | yes | yes | 0 | **intro** ✓ |
| هوازن | midterm-mock-b1 | live | yes | yes | 0 | **intro** ✓ |
| نادية | midterm-mock-b1 | live | yes | yes | 1 (submitted, 0/100) | **submitted** ✓ (different message) |

No mutation needed on any backend table for the three "can't see" cases.
نادية's reset is **opt-in** — gated on her explicit reply to the
WhatsApp message; not done automatically.

---

## Final verified state per student (post-fix)

| student | what they will see after refresh |
|---|---|
| لمياء سعود الحربي | IntroCard for `midterm-mock-a1` ("ابدئي الاختبار الآن") |
| منار العتيبي | IntroCard for `midterm-mock-a1` |
| هوازن العتيبي | IntroCard for `midterm-mock-b1` |
| نادية القحطاني | "تم تسليم اختبارك ✓ — 0/100" + button to result. **If she wants to retake:** Ali must run `select mock_exam_archive_and_reset('e66e8ccb-8b07-4866-80eb-da57c48fb8d7', 'visibility_retry_2026-05-23')` manually. |
