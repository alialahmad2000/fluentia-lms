-- ============================================================
-- «مسار البيئة» Environment Track — gated, level-independent course
-- English for wildlife, the environment & ecotourism.
-- Mirrors 20260716090000_biz_track.sql (the proven track shape).
-- Gate: students.uses_env_track (flows to studentData via authStore select('*')).
-- First learner: نورة خالد الدوسري (National Center for Wildlife). Content is FEMININE.
-- ============================================================

alter table public.students add column if not exists uses_env_track boolean not null default false;

-- ── stages (global content) ──
create table if not exists public.env_track_stages (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null,
  slug text unique not null,
  title_en text not null,
  title_ar text not null,
  subtitle_ar text,
  cefr text,
  accent text not null default '#22c55e',
  icon text not null default 'Leaf',
  created_at timestamptz not null default now()
);

-- ── lessons (global content; rich body in JSONB) ──
create table if not exists public.env_track_lessons (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.env_track_stages(id) on delete cascade,
  sort_order int not null,
  slug text unique not null,
  title_en text not null,
  title_ar text not null,
  cefr text,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_etl_stage on public.env_track_lessons(stage_id, sort_order);

-- ── per-student progress ──
create table if not exists public.env_track_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_id uuid not null references public.env_track_lessons(id) on delete cascade,
  status text not null default 'completed' check (status in ('in_progress','completed')),
  score int,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(student_id, lesson_id)
);
create index if not exists idx_etp_student on public.env_track_progress(student_id);

alter table public.env_track_stages   enable row level security;
alter table public.env_track_lessons  enable row level security;
alter table public.env_track_progress enable row level security;

-- content: readable by any authenticated user (nav + route guard control who SEES the section)
drop policy if exists ets_read on public.env_track_stages;
create policy ets_read on public.env_track_stages for select to authenticated using (true);
drop policy if exists etl_read on public.env_track_lessons;
create policy etl_read on public.env_track_lessons for select to authenticated using (true);

-- progress: student reads own; staff read all; NO direct write policy → only the SECURITY DEFINER RPC / service_role can write
drop policy if exists etp_select_own on public.env_track_progress;
create policy etp_select_own on public.env_track_progress for select to authenticated
  using (student_id = auth.uid() or is_admin() or is_trainer());

-- ── completion RPC (the ONLY write path for students) — gated on an ACTIVE, non-deleted, granted student ──
create or replace function public.env_track_complete_lesson(p_lesson_id uuid, p_score int default null)
returns public.env_track_progress
language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := auth.uid();
  v_row public.env_track_progress;
begin
  if v_student is null then raise exception 'not authenticated'; end if;
  if not exists (
    select 1 from students s
    where s.id = v_student and s.deleted_at is null and s.uses_env_track = true
  ) then
    raise exception 'not a student';
  end if;
  if not exists (select 1 from env_track_lessons l where l.id = p_lesson_id) then
    raise exception 'lesson not found';
  end if;
  insert into env_track_progress(student_id, lesson_id, status, score, completed_at, updated_at)
  values (v_student, p_lesson_id, 'completed', greatest(0, least(100, coalesce(p_score, 0))), now(), now())
  on conflict (student_id, lesson_id) do update
    set status='completed',
        score = greatest(coalesce(env_track_progress.score, 0), greatest(0, least(100, coalesce(excluded.score, 0)))),
        completed_at = coalesce(env_track_progress.completed_at, now()),
        updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;
revoke execute on function public.env_track_complete_lesson(uuid, int) from public, anon;
grant execute on function public.env_track_complete_lesson(uuid, int) to authenticated;

-- ── entitlement guard: add uses_env_track to Tier A (admin-only) ──
-- (extends guard_student_account_columns() from 20260716100000_students_entitlement_guard.sql;
--  a student must NOT be able to self-grant this paid gate via PATCH on her own row.)
create or replace function public.guard_student_account_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
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
