# PROMPT: Trainer Pending Submissions — Deep-link + Trainer Evaluation Layer

## Working dir
`C:\Users\Dr. Ali\Desktop\fluentia-lms`

## Context
On the trainer dashboard there's a section "واجبات تنتظر تصحيح". Currently it lists submissions but clicking them doesn't take the trainer to the actual submission in context, and we need to guarantee both Speaking AND Writing submissions appear there the moment a student submits.

## Required outcomes
1. **Pending list must include BOTH speaking + writing submissions** the moment they're inserted (both types, all trainer's groups, oldest first, un-reviewed-by-trainer only).
2. **Clicking a card** deep-links to the Interactive Curriculum page (same page student used), scrolled to that exact activity, with a new **Trainer Review Panel** open showing:
   - Student's submitted text or audio player
   - Existing AI feedback (read-only reference)
   - **Trainer Evaluation Form** (new): grade (A+/A/B+/B/C/D/F), trainer note textarea, quick templates ("ممتاز 👏" / "يحتاج تحسين بالقرامر" / "أعد المحاولة"), bonus XP input, "حفظ التقييم" button
   - After save: submission marked `trainer_reviewed_at`, removed from pending list, trainer feedback visible to student alongside AI feedback.

## Phase 1 — DISCOVERY (do first, report findings before coding)
```
grep -rn "واجبات تنتظر تصحيح" src/
grep -rn "pending.*submission" src/ -i
grep -rn "TrainerDashboard" src/
find src/pages/trainer -type f
find src/pages -name "*Interactive*" -o -name "*Curriculum*"
grep -rn "speaking_submissions\|writing_submissions\|submissions" src/lib/ src/hooks/
```
Report: exact file paths for (a) trainer dashboard pending section, (b) interactive curriculum page, (c) the tables/views used for speaking + writing submissions, (d) how activities are identified in URLs (activity_id? unit_id + activity_slug?).

## Phase 2 — DB
Query schema first (`\d speaking_submissions`, `\d writing_submissions` via supabase sql). Add only if missing:
- `trainer_reviewed_at timestamptz NULL`
- `trainer_grade text NULL`
- `trainer_feedback text NULL`
- `trainer_bonus_xp int DEFAULT 0`
- `trainer_reviewed_by uuid NULL REFERENCES profiles(id)`

Apply on **both** speaking and writing submission tables (whichever names discovery reveals). Migration via `npx supabase db push --linked`. Include rowcount assertion.

## Phase 3 — Unified pending feed
Create a SQL view `trainer_pending_submissions` that UNIONs speaking + writing submissions where `trainer_reviewed_at IS NULL`, joined to student name + group, filtered via RLS so trainers see only their groups. Columns: `submission_id, submission_type ('speaking'|'writing'), student_id, student_name, group_id, unit_id, activity_id, activity_slug, submitted_at, ai_feedback_summary`.

Update the trainer dashboard component to query this view, order by `submitted_at ASC`, live-refresh via Supabase Realtime subscription on both underlying tables.

## Phase 4 — Deep-link
Each pending card becomes a Link to:
```
/curriculum/interactive/{unit_id}?activity={activity_id}&review={submission_type}:{submission_id}&impersonate={student_id}
```
In the Interactive Curriculum page:
- If `review` query param present → load that student's context (impersonation pattern — use `profile.id` for all DB reads, per project rule), scroll to activity, auto-open Trainer Review Panel.
- Panel shows student submission + AI feedback (existing components, reused) + new `<TrainerReviewForm>`.

## Phase 5 — TrainerReviewForm component
Path: `src/components/trainer/TrainerReviewForm.jsx`
Fields: grade dropdown, feedback textarea, 3 quick template chips (insert into textarea), bonus XP number input (0–50), Save button.
On save:
1. UPDATE the correct submissions table (speaking or writing) setting the 5 new columns + `trainer_reviewed_at=now()`.
2. **Must include `.select()` after `.update()`** to detect RLS silent failure.
3. If `trainer_bonus_xp > 0`: `INSERT INTO xp_transactions` (reason: `'custom'`, description: `'مكافأة تقييم المدرب'`, awarded_by: trainer uuid, student_id: impersonated profile.id). **Never touch `xp_total` directly** — trigger handles it.
4. Toast "تم حفظ التقييم" → close panel → navigate back to `/trainer/dashboard`.

## Phase 6 — Student visibility
Wherever AI feedback is rendered on the student's assignment detail page, add below it a collapsible "تقييم المدرب" section (only shown if `trainer_reviewed_at IS NOT NULL`) displaying grade + feedback + bonus XP badge.

## Integration test (trace in comments of PR description)
1. Student (group 2, L1) submits a speaking activity → row in `speaking_submissions`, `trainer_reviewed_at` NULL.
2. د. محمد شربط logs in → sees new card at top of "واجبات تنتظر تصحيح".
3. Click → lands on interactive curriculum unit page, correct activity scrolled into view, Trainer Review Panel open with student's audio + AI feedback.
4. Enter grade B+ / note / 10 bonus XP → Save.
5. Card disappears from pending. `xp_transactions` has +10. Student sees "تقييم المدرب" on their assignment page.

## RLS verification
Before merge, verify:
- Trainer can SELECT/UPDATE submissions only for students in their own groups (existing policy — don't widen).
- Student can SELECT the new `trainer_*` columns on their own submissions.
- Admin sees everything.

## What NOT to change
- AI feedback generation pipeline — untouched, still runs on submit
- XP trigger logic — use `xp_transactions` INSERT only
- Existing student submission UI on curriculum page — only ADD the Trainer Review Panel conditionally
- Do NOT run `vite build` / `npm run build` locally — Vercel handles it

## Failure handling
- If view query fails → empty state "ما في تسليمات تنتظر التصحيح" (not blank screen)
- If deep-link submission_id not found / already reviewed → redirect to `/trainer/dashboard` with toast "التسليم تم تقييمه مسبقاً"
- Realtime subscription must cleanup on unmount

## Commit & push
```bash
git add -A
git commit -m "feat(trainer): unified pending submissions view + deep-link review panel + trainer evaluation layer"
git push origin main
git fetch origin && git log --oneline -1 HEAD && git log --oneline -1 origin/main
```
Verify HEAD matches origin/main before reporting done.
