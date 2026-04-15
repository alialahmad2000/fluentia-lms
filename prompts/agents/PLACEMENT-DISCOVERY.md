# Placement Test Discovery Report

**Date:** 2026-04-15

## 0.1 Existing placement/quiz/assessment tables

No `placement_*` tables exist. Safe to create.

Existing related tables (DO NOT TOUCH):
- assessments, quizzes, quiz_questions, quiz_attempts, quiz_answers
- curriculum_assessments, vocabulary_quiz_attempts, student_level_assessment_attempts

## 0.2 profiles table

Key columns: id (uuid), full_name, email, role (text), avatar_url, phone, created_at, preferred_language, is_active, onboarding_completed, gender, date_of_birth, nationality, emergency_contact_name, emergency_contact_phone, bio, last_active_at, timezone

**Missing:** No `group_id` or `cefr_level` columns. Student-group link is via `active_students` table.

## 0.3 groups table

Columns: id (uuid), name (text), code (text), level (integer), trainer_id (uuid), max_students (integer), is_active (boolean), created_at, current_unit_id (uuid)

## 0.4 Group capacity

- المجموعة 2 | level:1 | 8/10
- المجموعة 4 | level:3 | 8/10
- Others: empty placeholder groups

## 0.5 RLS on profiles

- select_all (SELECT)
- insert_own (INSERT)
- update_own (UPDATE)
- delete_admin (DELETE)

## File inspection

### Design system components (src/design-system/components/)
- **AuroraBackground** ✓ (prompt calls it CinematicBackground — same component, using AuroraBackground)
- **GlassPanel** ✓
- **PremiumCard** ✓
- **CinematicTransition** ✓
- **StaggeredList** ✓
- **SectionHeader** ✓

### Routes
- `/test` → public PlacementTest (landing page version, DO NOT TOUCH)
- `/student/placement-test` → DOES NOT EXIST (safe to create)

### Existing placement references in src/
- ReadingTab.jsx, StudentCertificate.jsx, CertificateVerification.jsx, constants.js, StudentAIInsights.jsx, StudentAssessments.jsx, PlacementTest.jsx (public), StudentAdaptiveTest.jsx

## Decision: CinematicBackground

The prompt references `CinematicBackground` but the actual design system component is `AuroraBackground`. It provides identical functionality (aurora blobs, stars, noise grain, vignette). Will use `AuroraBackground` directly.

## Blockers

**NONE** — proceed to Phase 1.
