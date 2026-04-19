# IELTS Trainer Discovery Report — PROMPT-12

## Summary

| Check | Result |
|-------|--------|
| ielts_submissions trainer SELECT | ✅ ALLOWED (`staff_read_submissions`) |
| ielts_mock_attempts trainer SELECT | ✅ ALLOWED (`staff_read_attempts`) |
| ielts_student_results trainer SELECT | ✅ ALLOWED (`staff_read_results`) |
| ielts_error_bank trainer SELECT | ✅ ALLOWED (`staff_read_errors`) |
| ielts_adaptive_plans trainer SELECT | ✅ ALLOWED (`staff_read_plans`) |
| ielts_skill_sessions trainer SELECT | ✅ ALLOWED (`staff_read_sessions`) |
| ielts_student_progress trainer SELECT | ✅ ALLOWED (`staff_read_progress`) |
| ielts_submissions trainer UPDATE | ✅ ALLOWED (`staff_write_submissions`) |
| Trainer→Student link path | `groups.trainer_id → students.group_id` |
| Grading queue source | RPC: `get_trainer_grading_queue` |
| Submission card / modal | `src/components/trainer/grading/SubmissionReviewModal.jsx` |
| Student detail tabs | 6 tabs in inline `TABS` array; add 7th conditionally |
| Trainer sidebar conditional support | NO — implement via `useIELTSRoster` filter in Sidebar |
| `ielts_submissions` trainer cols | All exist (`trainer_feedback`, `trainer_overridden_band`, `trainer_reviewed_at`, `trainer_id`) |
| Trainers with IELTS students today | 0 |
| **Migration needed** | **NO — all policies + columns already in migration 136** |

## A.1 — RLS State

All IELTS tables have `staff_read_*` SELECT policies using `role IN ('admin','trainer')`. This grants any trainer read access to all IELTS data (not scoped per assigned students — existing design decision). `ielts_submissions` also has `staff_write_submissions` UPDATE policy for trainers.

## A.2 — Trainer-Student Link

`groups.trainer_id → students.group_id`. Confirmed in `useTrainerCockpit.js` and `useStudentPulse.js`.

Query pattern:
```js
const { data: groups } = await supabase.from('groups').select('id').eq('trainer_id', trainerId)
const { data: students } = await supabase.from('students').select('...').in('group_id', groupIds)
```

## A.3 — Grading Queue

- Hook: `src/hooks/trainer/useGradingQueue.js` → calls RPC `get_trainer_grading_queue`
- Modal: `src/components/trainer/grading/SubmissionReviewModal.jsx`
- Approve mutation: `src/hooks/trainer/useApproveSubmission.js` → RPC `approve_submission`
- IELTS extension: parallel query on `ielts_submissions` + client-side merge (no RPC change)
- IELTS approve: direct `supabase.from('ielts_submissions').update(...)` (not the `approve_submission` RPC)

## A.4 — Student Detail Tabs

File: `src/pages/trainer/StudentProgressDetail.jsx`
- `TABS` array defined inline at render time (6 items)
- Add 7th tab: `{ key: 'ielts', label: 'IELTS' }` with conditional render

## A.5 — Trainer Sidebar

`TRAINER_NAV` in `src/config/navigation.js`. Sidebar.jsx renders `nav.sections` with no conditional support. Strategy: add `Award` icon entry to nav config, conditionally hide in Sidebar using `useIELTSRoster()`.

## A.6 — ielts_submissions Column Name Mapping

| Prompt spec | Actual column |
|------------|---------------|
| `trainer_grade` | `trainer_overridden_band` |
| `trainer_graded_at` | `trainer_reviewed_at` |
| `trainer_graded_by` | `trainer_id` |
| `trainer_feedback` | `trainer_feedback` ✅ |
| `ai_band` | `band_score` |
| `ai_criteria` / `ai_feedback_ar` | `ai_feedback JSONB` |
| `content_text` | `text_content` |
| `audio_urls` | `audio_url` |
| `transcripts` | `transcript` |

## A.7 — Impersonation

`startImpersonation(userId, role, name)` replaces the auth store's `profile` and `studentData`, then navigates to `/student`. `IELTSGuard` reads the new profile → works correctly.

## A.8 — IELTS Students Today

0 (no students with `package='ielts'` or `custom_access` containing `'ielts'` in production).

## Deviation from Prompt

**No migration file needed.** All trainer RLS policies and trainer feedback columns were already added in `supabase/migrations/136_ielts_v2_foundation.sql`. Creating an empty migration is cleaner than a no-op. A thin documentation-only migration is provided as `138_ielts_trainer_rls.sql` for audit completeness.
