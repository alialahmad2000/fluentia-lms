-- ============================================================================
-- 002_rls_policies.sql
-- Comprehensive Row Level Security (RLS) policies for Fluentia LMS
-- ============================================================================
-- ROLES:
--   student  — can only see/edit own data + group shared data
--   trainer  — can see/edit assigned groups/students, NO financial data
--   admin    — full access to everything
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Returns the current authenticated user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns TRUE if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns TRUE if the current user is a trainer or admin
CREATE OR REPLACE FUNCTION public.is_trainer()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns array of group IDs that the current trainer is assigned to
CREATE OR REPLACE FUNCTION public.get_trainer_group_ids()
RETURNS uuid[] AS $$
  SELECT COALESCE(array_agg(id), '{}') FROM public.groups WHERE trainer_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns the group ID of the current student
CREATE OR REPLACE FUNCTION public.get_student_group_id()
RETURNS uuid AS $$
  SELECT group_id FROM public.students WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================================
-- 1. PROFILES
-- Everyone can read all profiles (for names/avatars).
-- Only own profile can be updated. Admins can update any profile.
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);
  -- All authenticated users can read profiles (display names, avatars, etc.)

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());
  -- Users can only insert their own profile (usually via trigger)

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());
  -- Users update their own profile; admins can update any profile

CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  USING (is_admin());
  -- Only admins can delete profiles


-- ============================================================================
-- 2. STUDENTS
-- Students see own record. Trainers see students in their groups. Admin sees all.
-- ============================================================================
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select"
  ON public.students FOR SELECT
  USING (
    id = auth.uid()                                          -- own record
    OR (is_trainer() AND group_id = ANY(get_trainer_group_ids()))  -- trainer's groups
    OR is_admin()                                            -- admin sees all
  );

CREATE POLICY "students_insert_admin"
  ON public.students FOR INSERT
  WITH CHECK (is_admin());
  -- Only admins can create student records

CREATE POLICY "students_update"
  ON public.students FOR UPDATE
  USING (
    id = auth.uid()                                          -- student updates own
    OR (is_trainer() AND group_id = ANY(get_trainer_group_ids()))  -- trainer updates their students
    OR is_admin()
  )
  WITH CHECK (
    id = auth.uid()
    OR (is_trainer() AND group_id = ANY(get_trainer_group_ids()))
    OR is_admin()
  );

CREATE POLICY "students_delete_admin"
  ON public.students FOR DELETE
  USING (is_admin());


-- ============================================================================
-- 3. TRAINERS
-- Trainers see own record. Admin sees all.
-- ============================================================================
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainers_select"
  ON public.trainers FOR SELECT
  USING (
    id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "trainers_insert_admin"
  ON public.trainers FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "trainers_update"
  ON public.trainers FOR UPDATE
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

CREATE POLICY "trainers_delete_admin"
  ON public.trainers FOR DELETE
  USING (is_admin());


-- ============================================================================
-- 4. GROUPS
-- Group members can read. Trainer of the group can update. Admin full access.
-- ============================================================================
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_select"
  ON public.groups FOR SELECT
  USING (
    id = get_student_group_id()                              -- student is in this group
    OR trainer_id = auth.uid()                               -- trainer owns this group
    OR is_admin()
  );

CREATE POLICY "groups_insert_admin"
  ON public.groups FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "groups_update"
  ON public.groups FOR UPDATE
  USING (trainer_id = auth.uid() OR is_admin())
  WITH CHECK (trainer_id = auth.uid() OR is_admin());

CREATE POLICY "groups_delete_admin"
  ON public.groups FOR DELETE
  USING (is_admin());


-- ============================================================================
-- 5. ASSIGNMENTS
-- Students see assignments for their group. Trainer sees their assignments.
-- Admin sees all.
-- ============================================================================
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_select"
  ON public.assignments FOR SELECT
  USING (
    group_id = get_student_group_id()                        -- student's group
    OR group_id = ANY(get_trainer_group_ids())                -- trainer's groups
    OR is_admin()
  );

CREATE POLICY "assignments_insert"
  ON public.assignments FOR INSERT
  WITH CHECK (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))
    OR is_admin()
  );
  -- Trainers can create assignments for their own groups

CREATE POLICY "assignments_update"
  ON public.assignments FOR UPDATE
  USING (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))
    OR is_admin()
  )
  WITH CHECK (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))
    OR is_admin()
  );

CREATE POLICY "assignments_delete"
  ON public.assignments FOR DELETE
  USING (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))
    OR is_admin()
  );


-- ============================================================================
-- 6. SUBMISSIONS
-- Students see own + group members' (social proof). Trainers see their groups'.
-- Admin sees all. Only student can INSERT own. Only trainer can UPDATE grade.
-- ============================================================================
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions_select"
  ON public.submissions FOR SELECT
  USING (
    student_id = auth.uid()                                  -- own submissions
    OR (
      -- Group members' submissions (social proof)
      get_user_role() = 'student'
      AND student_id IN (
        SELECT s.id FROM public.students s
        WHERE s.group_id = get_student_group_id()
      )
    )
    OR (is_trainer() AND assignment_id IN (
        SELECT a.id FROM public.assignments a
        WHERE a.group_id = ANY(get_trainer_group_ids())
      ))
    OR is_admin()
  );

CREATE POLICY "submissions_insert_student"
  ON public.submissions FOR INSERT
  WITH CHECK (
    student_id = auth.uid()                                  -- students submit their own work only
  );

CREATE POLICY "submissions_update_trainer"
  ON public.submissions FOR UPDATE
  USING (
    -- Trainers grade/give feedback on submissions in their groups
    (is_trainer() AND assignment_id IN (
      SELECT a.id FROM public.assignments a
      WHERE a.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  )
  WITH CHECK (
    (is_trainer() AND assignment_id IN (
      SELECT a.id FROM public.assignments a
      WHERE a.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  );

CREATE POLICY "submissions_delete_admin"
  ON public.submissions FOR DELETE
  USING (is_admin());


-- ============================================================================
-- 7. GROUP_MESSAGES
-- Group members can read and insert. Trainers can update (pin) and delete.
-- ============================================================================
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_messages_select"
  ON public.group_messages FOR SELECT
  USING (
    group_id = get_student_group_id()                        -- student is in this group
    OR group_id = ANY(get_trainer_group_ids())                -- trainer of this group
    OR is_admin()
  );

CREATE POLICY "group_messages_insert"
  ON public.group_messages FOR INSERT
  WITH CHECK (
    (group_id = get_student_group_id() AND sender_id = auth.uid())  -- student in group
    OR (group_id = ANY(get_trainer_group_ids()) AND sender_id = auth.uid()) -- trainer of group
    OR is_admin()
  );
  -- Members can post messages in their group

CREATE POLICY "group_messages_update"
  ON public.group_messages FOR UPDATE
  USING (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))  -- trainer can pin/edit
    OR is_admin()
  )
  WITH CHECK (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))
    OR is_admin()
  );

CREATE POLICY "group_messages_delete"
  ON public.group_messages FOR DELETE
  USING (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))  -- trainer can delete messages
    OR is_admin()
  );


-- ============================================================================
-- 8. DIRECT_MESSAGES
-- Only sender and receiver can see their messages.
-- ============================================================================
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "direct_messages_select"
  ON public.direct_messages FOR SELECT
  USING (
    from_id = auth.uid()
    OR to_id = auth.uid()
  );
  -- Only participants can read DMs

CREATE POLICY "direct_messages_insert"
  ON public.direct_messages FOR INSERT
  WITH CHECK (from_id = auth.uid());
  -- Can only send messages as yourself

CREATE POLICY "direct_messages_update"
  ON public.direct_messages FOR UPDATE
  USING (from_id = auth.uid() OR is_admin())
  WITH CHECK (from_id = auth.uid() OR is_admin());
  -- Sender can edit their own message

CREATE POLICY "direct_messages_delete"
  ON public.direct_messages FOR DELETE
  USING (from_id = auth.uid() OR is_admin());
  -- Sender can delete their own message


-- ============================================================================
-- 9. NOTIFICATIONS
-- Only the target user can see and update their notifications.
-- ============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (is_admin() OR is_trainer());
  -- System/admin/trainers create notifications; students receive them

CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
  -- Users can mark their own notifications as read

CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid() OR is_admin());


-- ============================================================================
-- 10. PAYMENTS
-- Only admin can see/manage. Students see ONLY their own payments.
-- Trainers have NO access to financial data.
-- ============================================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select"
  ON public.payments FOR SELECT
  USING (
    student_id = auth.uid()                                  -- student sees own payments
    OR is_admin()                                            -- admin sees all
    -- NOTE: trainers intentionally excluded from financial data
  );

CREATE POLICY "payments_insert_admin"
  ON public.payments FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "payments_update_admin"
  ON public.payments FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "payments_delete_admin"
  ON public.payments FOR DELETE
  USING (is_admin());


-- ============================================================================
-- 11. XP_TRANSACTIONS
-- Students see own. Trainers see students in their groups. Admin sees all.
-- ============================================================================
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_transactions_select"
  ON public.xp_transactions FOR SELECT
  USING (
    student_id = auth.uid()
    OR (is_trainer() AND student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  );

CREATE POLICY "xp_transactions_insert"
  ON public.xp_transactions FOR INSERT
  WITH CHECK (is_trainer() OR is_admin());
  -- Trainers and admins can award XP

CREATE POLICY "xp_transactions_update_admin"
  ON public.xp_transactions FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "xp_transactions_delete_admin"
  ON public.xp_transactions FOR DELETE
  USING (is_admin());


-- ============================================================================
-- 12. ATTENDANCE
-- Students see own. Trainers see their classes. Admin sees all.
-- ============================================================================
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_select"
  ON public.attendance FOR SELECT
  USING (
    student_id = auth.uid()
    OR (is_trainer() AND class_id IN (
      SELECT c.id FROM public.classes c
      WHERE c.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  );

CREATE POLICY "attendance_insert"
  ON public.attendance FOR INSERT
  WITH CHECK (
    (is_trainer() AND class_id IN (
      SELECT c.id FROM public.classes c
      WHERE c.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  );
  -- Trainers record attendance for their classes

CREATE POLICY "attendance_update"
  ON public.attendance FOR UPDATE
  USING (
    (is_trainer() AND class_id IN (
      SELECT c.id FROM public.classes c
      WHERE c.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  )
  WITH CHECK (
    (is_trainer() AND class_id IN (
      SELECT c.id FROM public.classes c
      WHERE c.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  );

CREATE POLICY "attendance_delete_admin"
  ON public.attendance FOR DELETE
  USING (is_admin());


-- ============================================================================
-- 13. ACHIEVEMENTS & STUDENT_ACHIEVEMENTS
-- Everyone can read achievements catalog. Students see own earned.
-- Admin manages.
-- ============================================================================
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_select_all"
  ON public.achievements FOR SELECT
  USING (true);
  -- Everyone can browse the achievements catalog

CREATE POLICY "achievements_insert_admin"
  ON public.achievements FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "achievements_update_admin"
  ON public.achievements FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "achievements_delete_admin"
  ON public.achievements FOR DELETE
  USING (is_admin());

ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_achievements_select"
  ON public.student_achievements FOR SELECT
  USING (
    student_id = auth.uid()                                  -- students see own earned
    OR is_admin()
  );

CREATE POLICY "student_achievements_insert"
  ON public.student_achievements FOR INSERT
  WITH CHECK (is_admin() OR is_trainer());
  -- System/admin/trainers award achievements

CREATE POLICY "student_achievements_update_admin"
  ON public.student_achievements FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "student_achievements_delete_admin"
  ON public.student_achievements FOR DELETE
  USING (is_admin());


-- ============================================================================
-- 14. CLASSES
-- Group members can read. Trainer can manage their classes. Admin full access.
-- ============================================================================
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classes_select"
  ON public.classes FOR SELECT
  USING (
    group_id = get_student_group_id()                        -- student in this group
    OR group_id = ANY(get_trainer_group_ids())                -- trainer of this group
    OR is_admin()
  );

CREATE POLICY "classes_insert"
  ON public.classes FOR INSERT
  WITH CHECK (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))
    OR is_admin()
  );

CREATE POLICY "classes_update"
  ON public.classes FOR UPDATE
  USING (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))
    OR is_admin()
  )
  WITH CHECK (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))
    OR is_admin()
  );

CREATE POLICY "classes_delete"
  ON public.classes FOR DELETE
  USING (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))
    OR is_admin()
  );


-- ============================================================================
-- 15. SETTINGS
-- Only admin can read/write.
-- ============================================================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_admin"
  ON public.settings FOR SELECT
  USING (is_admin());

CREATE POLICY "settings_insert_admin"
  ON public.settings FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "settings_update_admin"
  ON public.settings FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "settings_delete_admin"
  ON public.settings FOR DELETE
  USING (is_admin());


-- ============================================================================
-- 16. SYSTEM TABLES: system_errors, ai_usage, analytics_events, audit_log
-- Only admin can read. System (service role) inserts.
-- ============================================================================

-- SYSTEM_ERRORS
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_errors_select_admin"
  ON public.system_errors FOR SELECT
  USING (is_admin());
  -- Only admin can view system errors; inserts via service role bypass RLS

CREATE POLICY "system_errors_insert_admin"
  ON public.system_errors FOR INSERT
  WITH CHECK (is_admin());
  -- Fallback insert policy; primary inserts use service role (bypasses RLS)

-- AI_USAGE
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_select_admin"
  ON public.ai_usage FOR SELECT
  USING (is_admin());

CREATE POLICY "ai_usage_insert_admin"
  ON public.ai_usage FOR INSERT
  WITH CHECK (is_admin());
  -- Primary inserts use service role

-- ANALYTICS_EVENTS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_events_select_admin"
  ON public.analytics_events FOR SELECT
  USING (is_admin());

CREATE POLICY "analytics_events_insert_admin"
  ON public.analytics_events FOR INSERT
  WITH CHECK (is_admin());
  -- Primary inserts use service role

-- AUDIT_LOG
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_admin"
  ON public.audit_log FOR SELECT
  USING (is_admin());

CREATE POLICY "audit_log_insert_admin"
  ON public.audit_log FOR INSERT
  WITH CHECK (is_admin());
  -- Primary inserts use service role


-- ============================================================================
-- 17. VOCABULARY_BANK
-- Only the owning student can see/manage their vocabulary.
-- ============================================================================
ALTER TABLE public.vocabulary_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vocabulary_bank_select"
  ON public.vocabulary_bank FOR SELECT
  USING (student_id = auth.uid() OR is_admin());

CREATE POLICY "vocabulary_bank_insert"
  ON public.vocabulary_bank FOR INSERT
  WITH CHECK (student_id = auth.uid());
  -- Students add their own vocabulary

CREATE POLICY "vocabulary_bank_update"
  ON public.vocabulary_bank FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "vocabulary_bank_delete"
  ON public.vocabulary_bank FOR DELETE
  USING (student_id = auth.uid() OR is_admin());


-- ============================================================================
-- 18. PROGRESS_REPORTS
-- Student sees own published reports. Trainer sees their students'.
-- Admin sees all.
-- ============================================================================
ALTER TABLE public.progress_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_reports_select"
  ON public.progress_reports FOR SELECT
  USING (
    (student_id = auth.uid() AND status = 'published')       -- student sees own published
    OR (is_trainer() AND student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  );

CREATE POLICY "progress_reports_insert"
  ON public.progress_reports FOR INSERT
  WITH CHECK (
    (is_trainer() AND student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  );
  -- Trainers create reports for their students

CREATE POLICY "progress_reports_update"
  ON public.progress_reports FOR UPDATE
  USING (
    (is_trainer() AND student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  )
  WITH CHECK (
    (is_trainer() AND student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  );

CREATE POLICY "progress_reports_delete_admin"
  ON public.progress_reports FOR DELETE
  USING (is_admin());


-- ============================================================================
-- 19. QUIZZES & QUIZ_QUESTIONS
-- Group members see published quizzes. Trainer manages. Admin full access.
-- ============================================================================
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quizzes_select"
  ON public.quizzes FOR SELECT
  USING (
    (group_id = get_student_group_id() AND status = 'published') -- students see published
    OR group_id = ANY(get_trainer_group_ids())                -- trainer sees all (drafts too)
    OR is_admin()
  );

CREATE POLICY "quizzes_insert"
  ON public.quizzes FOR INSERT
  WITH CHECK (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))
    OR is_admin()
  );

CREATE POLICY "quizzes_update"
  ON public.quizzes FOR UPDATE
  USING (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))
    OR is_admin()
  )
  WITH CHECK (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))
    OR is_admin()
  );

CREATE POLICY "quizzes_delete"
  ON public.quizzes FOR DELETE
  USING (
    (is_trainer() AND group_id = ANY(get_trainer_group_ids()))
    OR is_admin()
  );

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_questions_select"
  ON public.quiz_questions FOR SELECT
  USING (
    quiz_id IN (
      SELECT q.id FROM public.quizzes q
      WHERE (q.group_id = get_student_group_id() AND q.status = 'published')
        OR q.group_id = ANY(get_trainer_group_ids())
        OR is_admin()
    )
  );

CREATE POLICY "quiz_questions_insert"
  ON public.quiz_questions FOR INSERT
  WITH CHECK (
    quiz_id IN (
      SELECT q.id FROM public.quizzes q
      WHERE (is_trainer() AND q.group_id = ANY(get_trainer_group_ids()))
        OR is_admin()
    )
  );

CREATE POLICY "quiz_questions_update"
  ON public.quiz_questions FOR UPDATE
  USING (
    quiz_id IN (
      SELECT q.id FROM public.quizzes q
      WHERE (is_trainer() AND q.group_id = ANY(get_trainer_group_ids()))
        OR is_admin()
    )
  )
  WITH CHECK (
    quiz_id IN (
      SELECT q.id FROM public.quizzes q
      WHERE (is_trainer() AND q.group_id = ANY(get_trainer_group_ids()))
        OR is_admin()
    )
  );

CREATE POLICY "quiz_questions_delete"
  ON public.quiz_questions FOR DELETE
  USING (
    quiz_id IN (
      SELECT q.id FROM public.quizzes q
      WHERE (is_trainer() AND q.group_id = ANY(get_trainer_group_ids()))
        OR is_admin()
    )
  );


-- ============================================================================
-- 20. QUIZ_ATTEMPTS & QUIZ_ANSWERS
-- Student sees own. Trainer sees their students'. Admin sees all.
-- ============================================================================
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_attempts_select"
  ON public.quiz_attempts FOR SELECT
  USING (
    student_id = auth.uid()
    OR (is_trainer() AND student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  );

CREATE POLICY "quiz_attempts_insert"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (student_id = auth.uid());
  -- Students can only start their own quiz attempts

CREATE POLICY "quiz_attempts_update"
  ON public.quiz_attempts FOR UPDATE
  USING (
    student_id = auth.uid()                                  -- student can finish attempt
    OR (is_trainer() AND student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  )
  WITH CHECK (
    student_id = auth.uid()
    OR (is_trainer() AND student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  );

CREATE POLICY "quiz_attempts_delete_admin"
  ON public.quiz_attempts FOR DELETE
  USING (is_admin());

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_answers_select"
  ON public.quiz_answers FOR SELECT
  USING (
    attempt_id IN (
      SELECT qa.id FROM public.quiz_attempts qa
      WHERE qa.student_id = auth.uid()
    )
    OR (is_trainer() AND attempt_id IN (
      SELECT qa.id FROM public.quiz_attempts qa
      JOIN public.students s ON s.id = qa.student_id
      WHERE s.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  );

CREATE POLICY "quiz_answers_insert"
  ON public.quiz_answers FOR INSERT
  WITH CHECK (
    attempt_id IN (
      SELECT qa.id FROM public.quiz_attempts qa
      WHERE qa.student_id = auth.uid()
    )
  );
  -- Students can only submit answers for their own attempts

CREATE POLICY "quiz_answers_update"
  ON public.quiz_answers FOR UPDATE
  USING (
    (is_trainer() AND attempt_id IN (
      SELECT qa.id FROM public.quiz_attempts qa
      JOIN public.students s ON s.id = qa.student_id
      WHERE s.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  )
  WITH CHECK (
    (is_trainer() AND attempt_id IN (
      SELECT qa.id FROM public.quiz_attempts qa
      JOIN public.students s ON s.id = qa.student_id
      WHERE s.group_id = ANY(get_trainer_group_ids())
    ))
    OR is_admin()
  );

CREATE POLICY "quiz_answers_delete_admin"
  ON public.quiz_answers FOR DELETE
  USING (is_admin());


-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================
