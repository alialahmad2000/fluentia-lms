-- Lets a custom-curriculum student ALSO reach the ordinary level curriculum.
--
-- Until now `uses_custom_curriculum = true` short-circuited the units query for
-- every level, so a student with their own course could not open the generic
-- course at all (and, incidentally, every level number rendered the same custom
-- units). This flag is opt-in per student so nothing changes for the custom
-- students whose bespoke course deliberately REPLACED the standard one — e.g.
-- أنوار, whose A2 units were archived when she moved to a deeper B1 course.
--
-- Requested for مصعب (A2): he keeps his custom business course AND gets the
-- ordinary A2 curriculum alongside it.

alter table students
  add column if not exists uses_standard_curriculum boolean not null default false;

comment on column students.uses_standard_curriculum is
  'Custom-curriculum students only: also expose the ordinary level curriculum '
  '(reached via ?track=standard). No effect unless uses_custom_curriculum is true.';

-- Entitlement columns are admin-only. Add the new flag to Tier A of the guard so
-- a student cannot grant themselves extra curriculum from the client.
create or replace function public.guard_student_account_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text;
begin
  if auth.uid() is null then return new; end if;

  select p.role into v_role from public.profiles p where p.id = auth.uid();

  -- ── Tier A: admin-only columns (entitlements, subscription, level, billing, lifecycle) ──
  if (new.study_mode                is distinct from old.study_mode)
     or (new.specialization_id      is distinct from old.specialization_id)
     or (new.uses_biz_track         is distinct from old.uses_biz_track)
     or (new.uses_tech_track        is distinct from old.uses_tech_track)
     or (new.uses_env_track         is distinct from old.uses_env_track)
     or (new.uses_pro_desk          is distinct from old.uses_pro_desk)
     or (new.uses_custom_curriculum is distinct from old.uses_custom_curriculum)
     or (new.uses_standard_curriculum is distinct from old.uses_standard_curriculum)
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
end;
$function$;
