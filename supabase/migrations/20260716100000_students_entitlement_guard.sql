-- ============================================================
-- Students entitlement guard + track-RPC hardening (2026-07-16)
-- From the biz-track RLS audit:
--  MED  — students_update RLS + full-column UPDATE grant let a student PATCH his own
--         entitlement/subscription columns (uses_* gates, access_expires_at,
--         academic_level, package …) → self-grant paid surfaces / self-extend access.
--         Fix: extend the existing guard_student_account_columns() trigger (house
--         pattern already protecting study_mode/specialization_id) to a full
--         protected-column list. Column-level GRANTs can't be used here because
--         admin client-side writes (placement queue «اعتماد المستوى», AdminStudents)
--         share the `authenticated` role with students.
--  LOW  — tech/biz complete-lesson RPCs ignored soft-delete and the track gate.
--  INFO — RPC EXECUTE was still granted to PUBLIC/anon (harmless, revoked anyway).
-- Verified-safe legitimate writers:
--  • student-side: ref_code/affiliate_id, streak_freeze_available, show_in_leaderboard,
--    temp_password, goals/interests/onboarding/anki/theme — NONE protected here.
--  • admin client-side: passes the is-admin check.
--  • trainer: group moves via trainer_move_student (SECURITY DEFINER) or staff tier below.
--  • service paths (edge fns, mgmt scripts, provision scripts): auth.uid() IS NULL → pass.
-- ============================================================

create or replace function public.guard_student_account_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_role text;
begin
  -- service paths (edge fns, mgmt scripts) have no auth.uid(); they always pass
  if auth.uid() is null then return new; end if;

  select p.role into v_role from public.profiles p where p.id = auth.uid();

  -- ── Tier A: admin-only columns (entitlements, subscription, level, billing, lifecycle) ──
  if (new.study_mode                is distinct from old.study_mode)
     or (new.specialization_id      is distinct from old.specialization_id)
     or (new.uses_biz_track         is distinct from old.uses_biz_track)
     or (new.uses_tech_track        is distinct from old.uses_tech_track)
     or (new.uses_pro_desk          is distinct from old.uses_pro_desk)
     or (new.uses_custom_curriculum is distinct from old.uses_custom_curriculum)
     or (new.uses_ielts_home        is distinct from old.uses_ielts_home)
     or (new.uses_speaking_track    is distinct from old.uses_speaking_track)
     or (new.extra_curriculum_levels is distinct from old.extra_curriculum_levels)
     or (new.can_access_lower_levels is distinct from old.can_access_lower_levels)
     or (new.keep_academy_access    is distinct from old.keep_academy_access)
     or (new.access_expires_at      is distinct from old.access_expires_at)
     or (new.academic_level         is distinct from old.academic_level)
     or (new.ielts_phase            is distinct from old.ielts_phase)
     or (new.track                  is distinct from old.track)
     or (new.package                is distinct from old.package)
     or (new.custom_price           is distinct from old.custom_price)
     or (new.payment_day            is distinct from old.payment_day)
     or (new.payment_link           is distinct from old.payment_link)
     or (new.status                 is distinct from old.status)
     or (new.deleted_at             is distinct from old.deleted_at)
     or (new.writing_limit_override is distinct from old.writing_limit_override)
     or (new.custom_access          is distinct from old.custom_access)
     or (new.custom_mission_ar      is distinct from old.custom_mission_ar)
  then
    if v_role is distinct from 'admin' then
      raise exception 'account/entitlement changes are admin-only';
    end if;
  end if;

  -- ── Tier B: staff columns (admin or trainer) ──
  if (new.group_id            is distinct from old.group_id)
     or (new.assigned_trainer_id is distinct from old.assigned_trainer_id)
  then
    if v_role not in ('admin', 'trainer') then
      raise exception 'group/trainer assignment is staff-only';
    end if;
  end if;

  return new;
end $$;

-- (trigger trg_guard_student_account already exists on public.students — function replaced in place)

-- ── biz_track_complete_lesson: require an ACTIVE, non-deleted, GATED student ──
create or replace function public.biz_track_complete_lesson(p_lesson_id uuid, p_score int default null)
returns public.biz_track_progress
language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := auth.uid();
  v_row public.biz_track_progress;
begin
  if v_student is null then raise exception 'not authenticated'; end if;
  if not exists (
    select 1 from students s
    where s.id = v_student and s.deleted_at is null and s.uses_biz_track = true
  ) then
    raise exception 'not a student';
  end if;
  if not exists (select 1 from biz_track_lessons l where l.id = p_lesson_id) then
    raise exception 'lesson not found';
  end if;
  insert into biz_track_progress(student_id, lesson_id, status, score, completed_at, updated_at)
  values (v_student, p_lesson_id, 'completed', greatest(0, least(100, coalesce(p_score, 0))), now(), now())
  on conflict (student_id, lesson_id) do update
    set status='completed',
        score = greatest(coalesce(biz_track_progress.score, 0), greatest(0, least(100, coalesce(excluded.score, 0)))),
        completed_at = coalesce(biz_track_progress.completed_at, now()),
        updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;
revoke execute on function public.biz_track_complete_lesson(uuid, int) from public, anon;
grant execute on function public.biz_track_complete_lesson(uuid, int) to authenticated;

-- ── tech_track_complete_lesson: same hardening (soft-delete + gate) ──
create or replace function public.tech_track_complete_lesson(p_lesson_id uuid, p_score int default null)
returns public.tech_track_progress
language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := auth.uid();
  v_row public.tech_track_progress;
begin
  if v_student is null then raise exception 'not authenticated'; end if;
  if not exists (
    select 1 from students s
    where s.id = v_student and s.deleted_at is null and s.uses_tech_track = true
  ) then
    raise exception 'not a student';
  end if;
  if not exists (select 1 from tech_track_lessons l where l.id = p_lesson_id) then
    raise exception 'lesson not found';
  end if;
  insert into tech_track_progress(student_id, lesson_id, status, score, completed_at, updated_at)
  values (v_student, p_lesson_id, 'completed', greatest(0, least(100, coalesce(p_score, 0))), now(), now())
  on conflict (student_id, lesson_id) do update
    set status='completed',
        score = greatest(coalesce(tech_track_progress.score, 0), greatest(0, least(100, coalesce(excluded.score, 0)))),
        completed_at = coalesce(tech_track_progress.completed_at, now()),
        updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;
revoke execute on function public.tech_track_complete_lesson(uuid, int) from public, anon;
grant execute on function public.tech_track_complete_lesson(uuid, int) to authenticated;
