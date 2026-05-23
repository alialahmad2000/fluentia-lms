# MOCK EXAM — Diagnosis: Exam Not Visible for Students Who Took It Before

## Context

After the second-chance migration (commit `e0e980e`) archived all prior attempts and reopened the exam for everyone, Ali is now reporting that **some students cannot see the exam at all** — specifically the students who took it before the migration (لمياء, منار, هوازن, نادية, and possibly others). The exam should appear for them with a fresh attempt, but it's hidden or inaccessible.

This is a **separate problem** from the save-chain issue. The save chain affects what happens WHILE taking the exam. This issue prevents students from STARTING the exam at all.

Per the new debug methodology (memory entry #17): Phase A is read-only diagnosis, no resilience layers, no premature fixes. Find the root cause with evidence, then apply a surgical fix.

---

## Working context

- **Repo:** `alialahmad2000/fluentia-lms`, branch `main`
- **Supabase ref:** `nmjexpuycmqcxuxljier`
- **Last commit:** whatever was most recent after the save-chain fix
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`

---

## Absolute rules

1. **Phase A is read-only.** Find evidence before changing anything.
2. **Audit fundamentals first**: RPC behavior, RLS policies, frontend gating, cache invalidation. Don't jump to "add more resilience."
3. **Identify the affected students by name with proof** before applying any fix.
4. **`visibility='live'` stays.** Cron stays. Existing RPCs stay.
5. **Atomic commit at end.**
6. **No vite build locally.**

---

## PHASE A — Read-only forensic diagnosis

Write findings to `docs/MOCK-EXAM-VISIBILITY-DIAGNOSIS.md` and print to terminal.

### A.1 — Identify the specific affected students

The students Ali mentioned (took the exam before, no longer see it):
- لمياء سعود الحربي (almooshhh11@gmail.com)
- منار العتيبي (manar126712@gmail.com)
- هوازن العتيبي
- نادية (find by name pattern)
- Any other student with a row in `mock_exam_attempts_archive` (reason='second_chance_2026-05-23')

```sql
-- All students who had an archived attempt
SELECT DISTINCT
  p.id,
  p.full_name,
  u.email,
  cl.level_number,
  p.role,
  p.is_test_account,
  ar.archive_reason,
  ar.archived_at AT TIME ZONE 'Asia/Riyadh' AS archived_ksa
FROM mock_exam_attempts_archive ar
JOIN profiles p ON p.id = (ar.attempt_snapshot->>'student_id')::uuid
JOIN auth.users u ON u.id = p.id
LEFT JOIN curriculum_levels cl ON cl.id = p.academic_level
ORDER BY p.full_name;
```

Print every row. Note the level_number, role, and is_test_account values.

### A.2 — Verify each affected student has NO current active attempt

```sql
WITH affected AS (
  SELECT DISTINCT (ar.attempt_snapshot->>'student_id')::uuid AS student_id
  FROM mock_exam_attempts_archive ar
  WHERE ar.archive_reason LIKE 'second_chance%' OR ar.archive_reason LIKE 'save_chain%'
)
SELECT
  p.full_name,
  u.email,
  (SELECT COUNT(*) FROM mock_exam_attempts a WHERE a.student_id = p.id) AS active_attempts,
  (SELECT a.id FROM mock_exam_attempts a WHERE a.student_id = p.id LIMIT 1) AS active_attempt_id
FROM affected af
JOIN profiles p ON p.id = af.student_id
JOIN auth.users u ON u.id = p.id
ORDER BY p.full_name;
```

Expected: every affected student should show `active_attempts = 0`. If anyone shows > 0, that's a clue — the archive may not have fully wiped them.

### A.3 — Read the mock_exam_start RPC source

```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'mock_exam_start'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

Look for gates that might block re-entry:
- `SELECT FROM mock_exam_attempts WHERE student_id = ... LIMIT 1` — does it block if ANY row exists?
- Does it check `mock_exam_attempts_archive`? (it shouldn't, but verify)
- Does it check `is_submitted` from any historical row?
- Does it have a "once per student per exam" guard?
- Does it require the student to have a specific `academic_level` matching the exam's `level_id`? If the lookup logic is wrong, level mismatch would silently block.

Print the full function body. Annotate any line that could prevent the affected students from starting a new attempt.

### A.4 — Read the frontend gating

Find where the student sidebar decides to show "الاختبار التجريبي":

```bash
grep -rn "mock-exam\|mock_exam\|الاختبار التجريبي" src/components/student/ src/layouts/ src/pages/student/ 2>/dev/null | head -50
```

Find the file that controls sidebar visibility for the mock exam entry. Read it. Look for:
- Is the entry conditional on `mockExamData.visibility === 'live'`?
- Is it conditional on the student NOT having submitted?
- Is it conditional on a level check (only level 1 or 3)?
- Is there a `useQuery` that fetches the available mock exam, and what's its `staleTime` / `cacheTime`?

The exam page itself:

```bash
grep -rn "mock_exam_start\|already_submitted\|MockExam" src/pages/student/mock-exam/ 2>/dev/null | head -50
```

Read `src/pages/student/mock-exam/` files. Look for the visibility logic:
- What does it show when there's no current attempt? "Start exam" intro screen, or "no exam available" empty state?
- What does it show when there's an archived/historical reference somewhere?

### A.5 — Check the actual data the frontend would receive for an affected student

Simulate what the frontend sees by running the same query the frontend likely runs:

```sql
-- What does a student's mock-exam landing page query?
-- Typically: get current attempts + get exam metadata
WITH lamya AS (
  SELECT id FROM auth.users WHERE email = 'almooshhh11@gmail.com'
)
SELECT
  e.id AS exam_id,
  e.code,
  e.visibility,
  e.is_active,
  e.open_at,
  e.close_at,
  e.level_id,
  cl.level_number AS exam_level,
  p.academic_level AS student_level_id,
  p_cl.level_number AS student_level,
  CASE WHEN cl.id = p.academic_level THEN 'MATCH' ELSE 'MISMATCH' END AS level_check,
  (SELECT COUNT(*) FROM mock_exam_attempts a WHERE a.exam_id = e.id AND a.student_id = (SELECT id FROM lamya)) AS attempts_for_lamya
FROM mock_exams e
LEFT JOIN curriculum_levels cl ON cl.id = e.level_id
CROSS JOIN profiles p
LEFT JOIN curriculum_levels p_cl ON p_cl.id = p.academic_level
WHERE p.id = (SELECT id FROM lamya)
ORDER BY e.code;
```

Critical: check `level_check`. If لمياء's `academic_level` resolves to level_number=1, only the `midterm-mock-a1` exam should match. If neither matches, **the exam is invisible because of a level mismatch — possibly a column name confusion from earlier migrations** (`profiles.academic_level` vs some other field).

### A.6 — Spot-check: try mock_exam_start as لمياء from SQL

```sql
-- Impersonate لمياء to test the RPC directly
SELECT set_config('request.jwt.claim.sub',
  (SELECT id::text FROM auth.users WHERE email = 'almooshhh11@gmail.com'),
  true);

SELECT mock_exam_start('midterm-mock-a1'::text);
-- What does it return? Success? Error? Empty?
```

If it errors with 'already_started' or similar gate-related message, that's the bug. If it succeeds, the backend is fine and the issue is frontend-only.

### A.7 — Check the notifications they received (was it correctly targeted?)

```sql
-- Did لمياء actually receive the second-chance notification?
SELECT
  n.title,
  n.body,
  n.data->>'kind' AS kind,
  n.data->>'action_route' AS route,
  n.created_at AT TIME ZONE 'Asia/Riyadh' AS created_ksa,
  n.is_read
FROM notifications n
WHERE n.user_id = (SELECT id FROM auth.users WHERE email = 'almooshhh11@gmail.com')
  AND n.data->>'kind' LIKE 'mock-exam%'
ORDER BY n.created_at DESC;
```

If the notification points to `/student/mock-exam` but the page shows "no exam available" or 404, that confirms the bug is between notification and page.

### A.8 — Browser cache hypothesis check

The simplest explanation: the affected students opened the exam page earlier in the day (or yesterday), the React Query cache has `staleTime: Infinity` or similar, and their browsers still see the stale "you already submitted" state.

Verify by reading the queries in `src/pages/student/mock-exam/`:

```bash
grep -B2 -A10 "useQuery\|staleTime" src/pages/student/mock-exam/MockExamLanding.jsx 2>/dev/null
grep -B2 -A10 "useQuery\|staleTime" src/pages/student/mock-exam/MockExamAttempt.jsx 2>/dev/null
```

Look for `staleTime` values. If anything is > 5 minutes or `Infinity`, the cache is the likely culprit.

---

## PHASE B — Declare root cause with evidence

After Phase A, classify the issue:

| Evidence | Root cause | Fix |
|---|---|---|
| `mock_exam_start` blocks if archive row exists | RPC gate bug | Remove the archive check from the gate |
| `mock_exam_start` succeeds in SQL but frontend doesn't call it | Frontend logic gate | Fix the frontend condition |
| Level mismatch in A.5 | Schema/data drift | Repair the affected students' academic_level OR fix the level resolution logic |
| React Query stale cache | Frontend cache invalidation missing | Force invalidation OR document hard-refresh requirement |
| Notification points to wrong route | Notification template bug | Fix the route |
| No notification received | Email/in-app missed the affected students | Re-send to specific students |
| Multiple causes | Apply fixes in order | Document each |

Document the evidence + declared root cause.

---

## PHASE C — Targeted fix (whichever applies)

### If C.1: mock_exam_start has a stale gate

Edit the RPC. The gate should only check `mock_exam_attempts` (not the archive). It should allow a fresh attempt as long as no current attempt exists for that student × exam combination.

If the RPC was correctly designed but has a bug like checking historical data, surgically remove that check. Re-apply via migration.

### If C.2: Frontend has stale cache

Add cache invalidation when the student lands on the mock-exam page:

```javascript
// In MockExamLanding.jsx or equivalent
useEffect(() => {
  queryClient.invalidateQueries({ queryKey: ['mock-exam'] });
}, []);
```

OR set `staleTime: 0` on the exam-fetching queries. The exam landing page should always fetch fresh state.

### If C.3: Level mismatch

If A.5 shows a mismatch, the affected students may have their `profiles.academic_level` set to a value that doesn't resolve to the expected level_number. Check if there was any recent column rename or data migration that affected this.

Fix path: either (a) update the affected students' academic_level to the correct value, or (b) fix the level resolution query.

### If C.4: Notification route is wrong

Update the notification's `action_route` to point to a route that exists and handles the case correctly. If the notification points to `/student/mock-exam` but the actual route is `/student/exam/mock` or `/student/mock-exam/landing`, fix it.

### If C.5: Hard refresh would solve it

If the issue is purely cache-side and the backend + frontend code are correct, the fix is operational:

1. Add a small banner: "إذا واجهتِ مشكلة في رؤية الاختبار، اضغطي Ctrl+Shift+R أو سجّلي خروج ودخول من جديد."
2. Send affected students a personal message asking them to log out and log in.

Plus add the cache invalidation from C.2 to prevent recurrence.

---

## PHASE D — Verification

After the fix:

1. For each affected student, verify in DB that the exam should be visible:
   - Active mock_exam_attempts: 0
   - mock_exams.visibility = 'live'
   - Student's level_number matches the exam's level

2. Simulate as one affected student (e.g., via Supabase admin impersonation OR by asking Ali to log in as one):
   - Open `/student/mock-exam`
   - Should see the intro screen with "ابدئي الاختبار"
   - Should NOT see "already submitted" or "no exam available"

3. If you can't simulate, output a clear list:
   ```
   The exam should now be visible for:
   - لمياء سعود الحربي — verified backend state
   - منار العتيبي — verified
   - هوازن العتيبي — verified
   - نادية — verified
   - [any others discovered in Phase A]
   ```

---

## PHASE E — WhatsApp messages

For each affected student, draft a brief Arabic WhatsApp message:

```
السلام عليكم [الاسم] 💛

تم إصلاح المشكلة التي منعتكِ من رؤية الاختبار التجريبي. الآن يظهر لكِ في القائمة الجانبية بمحاولة جديدة فريش.

إذا لم تشاهديه فوراً، اضغطي F5 أو سجّلي خروج ودخول من جديد.

النافذة مفتوحة حتى ١٠م الأحد بإذن الله.

د. علي
```

Customize per student based on whether they had an archived attempt or had a different issue.

---

## PHASE F — Atomic commit

```bash
git add -A
git commit -m "fix(mock-exam): repair visibility for students with archived attempts

Root cause (Phase B evidence): <one-line declaration>

- <specific fix description>
- Verified backend state for <N> affected students: لمياء, منار, هوازن, نادية, ...
- <if applicable> Added cache invalidation on mock-exam landing page mount
- <if applicable> Fixed mock_exam_start gate to allow fresh attempts after archive

Affected students notified via WhatsApp (drafts in docs/MOCK-EXAM-VISIBILITY-DIAGNOSIS.md).
visibility='live' preserved. Cron + RPCs preserved.
Follows post-mortem methodology: Phase A read-only diagnosis first,
fundamentals audit before any resilience layer."
git push origin main
```

---

## PHASE G — Final handoff

```
=== VISIBILITY ISSUE RESOLVED ===
Commit: <sha>

Root cause: <evidence-backed declaration>
Fix applied: <C.x summary>

Affected students (now able to see the exam):
  - لمياء سعود الحربي
  - منار العتيبي
  - هوازن العتيبي
  - نادية [last name]
  - [any others discovered]

>>> WHATSAPP MESSAGES (one per affected student) <<<
[Arabic messages by name, customized]

>>> ALI'S IMMEDIATE STEPS <<<
1. Send the WhatsApp messages above
2. If a student says she still doesn't see the exam after refreshing:
   - Have her log out + log back in
   - Or open admin → impersonate her → confirm the exam shows there
3. The system continues normally — Sunday 22:00 KSA close
```

Go.
