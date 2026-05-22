# Phase B Report — Migration + Test Students

## Migrations applied (via Supabase Management API)

- `supabase/migrations/20260522020000_mock_exam_system.sql` (8,126 chars) → OK
- `supabase/migrations/20260522020001_mock_exam_rpcs.sql` (12,459 chars) → OK

## Smoke verification

- 5 mock_exam tables present: `mock_exams`, `mock_exam_questions`, `mock_exam_attempts`, `mock_exam_answers`, `mock_exam_audit_log`
- 4 RPCs present: `mock_exam_start`, `mock_exam_save_answer`, `mock_exam_save_writing`, `mock_exam_submit` (all `SECURITY DEFINER`, granted to `authenticated`)
- `profiles.is_test_account` column exists (default false)
- Row counts on all 5 tables: 0

## RLS confirmed (from migration file)

- `mock_exams`: SELECT for any authenticated user where `is_active=true`; ALL for admin.
- `mock_exam_questions`: SELECT for admin+trainer only (students read questions via RPC return value, not direct SELECT); ALL for admin.
- `mock_exam_attempts`: SELECT for own student + admin/trainer; ALL writes go through SECURITY DEFINER RPCs; direct ALL only for admin.
- `mock_exam_answers`: SELECT scoped through the attempt's RLS; writes via RPC.
- `mock_exam_audit_log`: SELECT for staff only.

## Test student accounts (idempotent seeder, password reset on every run)

| email | password | profile.id | academic_level | group | is_test_account |
|---|---|---|---|---|---|
| `mock-test-a1@fluentia.academy` | `MockTest2025!` | `a82486b6-9472-4aba-b902-a0ec354ca170` | 1 | `bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb` (المجموعة 2) | true |
| `mock-test-b1@fluentia.academy` | `MockTest2025!` | `1a22e648-a129-4002-94ec-492fddbe3cca` | 3 | `aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa` (المجموعة 4) | true |

Auto-continuing to Phase C.
