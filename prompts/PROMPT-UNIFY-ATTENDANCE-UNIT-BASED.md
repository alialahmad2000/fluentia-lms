# PROMPT: Unify Attendance to Unit-Based System (Remove Legacy Date-Based)

## Working dir
`C:\Users\Dr. Ali\Desktop\fluentia-lms`

## Context
The attendance system was originally date-based (pick a date → mark students). The current correct model is **unit-based**: each curriculum unit has exactly **2 classes** (Class 1, Class 2), and attendance is recorded per (unit, class_number, student). The unit-based model is already partially implemented on the trainer side, but several pages/components still render the legacy date-based UI (e.g. `/attendance` showing a date picker with "لا توجد حصة لهذا التاريخ"). This causes duplicate truth sources and confused data.

## Required outcome
ONE attendance system everywhere — unit-based. The date-based UI and any date-only attendance rows are removed. All admin, trainer, and student views read/write through the unit model.

## Phase 1 — DISCOVERY (report findings BEFORE coding)
```
grep -rni "تسجيل الحضور\|سجّل حضور\|لا توجد حصة" src/
grep -rn "attendance" src/ --include="*.jsx" --include="*.js" -l
find src/pages -iname "*attendance*" -o -iname "*حضور*"
grep -rn "attendance_date\|class_date\|session_date" src/
grep -rn "unit_id.*class_number\|class_number.*unit_id" src/
```
Also query DB schema:
```
\d attendance
\d class_attendance
\d unit_attendance
-- whichever exist
```
Report:
- (a) All files/routes that render date-based attendance UI (legacy)
- (b) All files/routes that render unit-based attendance (new)
- (c) Every attendance-related table + its columns + row count
- (d) Every place in code that INSERTs/UPDATEs attendance, and which model it uses
- (e) Whether RLS policies reference `attendance_date` (legacy signal)

**STOP and show findings before Phase 2.**

## Phase 2 — Canonical schema (verify / adjust, don't recreate if already correct)
Target table (keep whichever exists and matches — adapt if needed):
```
attendance
├── id uuid PK
├── student_id uuid FK profiles(id)
├── group_id uuid FK groups(id)
├── unit_id uuid FK units(id)         ← REQUIRED
├── class_number smallint CHECK (class_number IN (1,2))  ← REQUIRED
├── status text CHECK (status IN ('present','absent','late','excused'))
├── recorded_by uuid FK profiles(id)
├── recorded_at timestamptz DEFAULT now()
└── UNIQUE (student_id, unit_id, class_number)
```
Migration plan:
1. If legacy `attendance_date` column exists → map rows to (unit_id, class_number) where possible using group's unit schedule; rows that can't be mapped → export to `legacy_attendance_orphans` table for Ali to review. **Do not delete** until Ali confirms.
2. Drop `attendance_date` column only after orphan export + rowcount assertion.
3. Add UNIQUE constraint.
4. Apply via `npx supabase db push --linked`. Include rowcount before/after.

## Phase 3 — Single canonical UI component
Create/consolidate: `src/components/attendance/UnitAttendancePanel.jsx`
Props: `groupId`, `unitId`, `classNumber` (1 or 2).
Behavior:
- Header shows: group name, unit name, "الحصة الأولى" / "الحصة الثانية"
- List of students in group with checkboxes: حاضر / غائب / متأخر / بعذر
- "تحديد الكل حاضر" button
- Save → UPSERT rows (onConflict: student_id,unit_id,class_number)
- Must `.select()` after `.upsert()` to catch RLS silent failures
- Realtime: subscribe to changes so two trainers on same unit see live updates

## Phase 4 — Replace ALL entry points
For every legacy location found in Phase 1(a):
- Remove the date picker entirely
- Replace with: group selector → unit selector (from group's current unit schedule) → class 1 / class 2 tabs → `<UnitAttendancePanel/>`
- Delete legacy route files after migration (not just hide them)
- Update sidebar links in trainer + admin portals to point to the unified route

Unified route: `/attendance/:groupId/:unitId/:classNumber` (trainer + admin), with a landing page at `/attendance` that shows the trainer's groups → pick → pick unit → pick class.

## Phase 5 — Admin visibility
Admin attendance page: matrix view per group → rows = students, columns = (unit 1 class 1, unit 1 class 2, unit 2 class 1, …). Cell = status badge. Click cell → edit. Remove any legacy date-based admin page.

## Phase 6 — Student visibility
On student profile / progress page, attendance stat should count `present` rows / total class slots for their group's completed units. Remove any display that says "حضور بتاريخ X" — replace with "الوحدة X — الحصة 1" labels.

## Integration test (trace in PR description)
1. د. محمد شربط opens `/attendance` → picks المجموعة 2 → picks current unit → Class 1 tab.
2. Marks 4 students present, 3 absent, Save.
3. DB: 7 rows in `attendance` with correct `unit_id` + `class_number=1`. No row in any legacy column/table.
4. Opens Class 2 tab → empty form (not pre-filled from Class 1).
5. Admin `/admin/attendance/:groupId` → matrix shows Class 1 column filled, Class 2 empty.
6. Student sees "الوحدة X — الحصة 1: حاضر" on their progress page.
7. Search codebase: zero references to `attendance_date`, zero date-picker attendance UIs remain.

## RLS verification
- Trainer can upsert attendance only for students in their own groups
- Student can SELECT own attendance only
- Admin full access
- Verify with actual test queries before merge

## What NOT to change
- The `units` table schema and curriculum unit structure
- Existing class schedule / Google Meet link fields
- XP rules tied to attendance (if any) — they should keep working since they point to the same `attendance` table; just verify
- Do NOT run `vite build` / `npm run build` locally

## Failure handling
- Unit has no scheduled classes → show empty state "هذه المجموعة ما بدأت الوحدة بعد" (no crash)
- Two trainers editing same unit simultaneously → last-write-wins with toast "تم تحديث السجل من جهاز آخر"
- Legacy orphan rows that couldn't be mapped → surface in admin under "سجلات حضور قديمة تحتاج مراجعة"

## Commit & push
```bash
git add -A
git commit -m "refactor(attendance): unify on unit+class_number model, remove legacy date-based system"
git push origin main
git fetch origin && git log --oneline -1 HEAD && git log --oneline -1 origin/main
```
Verify HEAD == origin/main before reporting done. Report: files deleted, files changed, migration rowcounts, orphan count.
