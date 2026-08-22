-- ═══════════════════════════════════════════════════════════════════════════
-- Staff can read the AI tutor's conversations.
--
-- The owner asked for these to be saved "to understand how much hard work the
-- student did and to know which things he learnt actively". They ARE saved —
-- but until now RLS on coach_conversations / coach_messages allowed exactly one
-- reader: the student themselves. Nothing in the app could show them to a
-- trainer or to the owner, so the data existed and the question stayed
-- unanswerable. (/admin/coach-activity is the HUMAN learning-coach page —
-- touchpoints and blockers — and reads none of this.)
--
-- FOR SELECT only, deliberately. A FOR ALL policy here would let staff write
-- into a student's transcript, and a transcript you can edit is not evidence of
-- anything. Writes stay where they were: the service-role edge function.
--
-- Scope mirrors students_select exactly — admin sees all, a trainer sees only
-- their own groups.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists staff_read_coach_conversations on public.coach_conversations;
create policy staff_read_coach_conversations on public.coach_conversations
  for select to authenticated
  using (
    is_admin()
    or (is_trainer() and exists (
      select 1 from public.students s
      where s.id = coach_conversations.student_id
        and s.group_id = any (get_trainer_group_ids())
    ))
  );

drop policy if exists staff_read_coach_messages on public.coach_messages;
create policy staff_read_coach_messages on public.coach_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.coach_conversations c
      where c.id = coach_messages.conversation_id
        and (
          is_admin()
          or (is_trainer() and exists (
            select 1 from public.students s
            where s.id = c.student_id
              and s.group_id = any (get_trainer_group_ids())
          ))
        )
    )
  );
