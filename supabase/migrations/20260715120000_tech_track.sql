-- Tech Track «مسار التقنية» — a gated, level-independent, self-contained IT/CS English course
-- that lives ALONGSIDE the normal curriculum. Global content, per-student progress (RPC-only writes).

-- gate flag (flows to studentData via authStore select('*'))
alter table public.students add column if not exists uses_tech_track boolean not null default false;

-- ── stages (global content) ──
create table if not exists public.tech_track_stages (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null,
  slug text unique not null,
  title_en text not null,
  title_ar text not null,
  subtitle_ar text,
  cefr text,
  accent text not null default '#38bdf8',
  icon text not null default 'Cpu',
  created_at timestamptz not null default now()
);

-- ── lessons (global content; rich body in JSONB) ──
create table if not exists public.tech_track_lessons (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.tech_track_stages(id) on delete cascade,
  sort_order int not null,
  slug text unique not null,
  title_en text not null,
  title_ar text not null,
  cefr text,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_ttl_stage on public.tech_track_lessons(stage_id, sort_order);

-- ── per-student progress ──
create table if not exists public.tech_track_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_id uuid not null references public.tech_track_lessons(id) on delete cascade,
  status text not null default 'completed' check (status in ('in_progress','completed')),
  score int,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(student_id, lesson_id)
);
create index if not exists idx_ttp_student on public.tech_track_progress(student_id);

-- ── RLS ──
alter table public.tech_track_stages   enable row level security;
alter table public.tech_track_lessons  enable row level security;
alter table public.tech_track_progress enable row level security;

-- content: readable by any authenticated user (nav + route guard control who SEES the section)
drop policy if exists tts_read on public.tech_track_stages;
create policy tts_read on public.tech_track_stages for select to authenticated using (true);
drop policy if exists ttl_read on public.tech_track_lessons;
create policy ttl_read on public.tech_track_lessons for select to authenticated using (true);

-- progress: student reads own; staff read all; NO direct write policy → only the SECURITY DEFINER RPC / service_role can write
drop policy if exists ttp_select_own on public.tech_track_progress;
create policy ttp_select_own on public.tech_track_progress for select to authenticated
  using (student_id = auth.uid() or is_admin() or is_trainer());

-- ── RPC: complete a lesson (derives student from auth.uid(), keeps best score) ──
create or replace function public.tech_track_complete_lesson(p_lesson_id uuid, p_score int default null)
returns public.tech_track_progress
language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := auth.uid();
  v_row public.tech_track_progress;
begin
  if v_student is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from students s where s.id = v_student) then
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
grant execute on function public.tech_track_complete_lesson(uuid, int) to authenticated;
