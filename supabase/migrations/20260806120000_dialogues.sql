-- «محادثات جاهزة» — per-student ready-made conversations.
--
-- The layer ABOVE the phrase bank: a phrase is one line you can say; a dialogue
-- is a whole exchange you can walk into. The student listens to a real two-voice
-- scene, understands it line by line, memorises his own lines, and finally takes
-- his role while the other side talks to him — so he learns not just what to say
-- but WHEN to say it and how to answer back.
--
-- Security shape copied from phrase_bank (20260728120000): reads are select-only
-- for the owning student (+ staff), and there is deliberately NO insert/update
-- policy on progress — the single write path is dialogue_record_progress(),
-- SECURITY DEFINER, gated POSITIVELY on ownership (auth.uid() is also null for
-- anon, so "no uid" is never treated as service-role).

alter table students add column if not exists uses_dialogues boolean not null default false;

-- ── content ────────────────────────────────────────────────────────────────
create table if not exists dialogue_scenarios (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  scenario_key text not null,
  group_key text not null,
  group_label_ar text not null,
  group_label_en text,
  title_ar text not null,
  title_en text not null,
  place_ar text,
  situation_ar text not null,
  goal_ar text not null,
  -- which side the student plays (his lines are the ones he memorises + performs)
  your_speaker text not null default 'A' check (your_speaker in ('A', 'B')),
  a_name text not null,
  a_role_ar text not null,
  b_name text not null,
  b_role_ar text not null,
  level text not null default 'A2',
  full_audio_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (student_id, scenario_key)
);
create index if not exists dialogue_scenarios_student_idx
  on dialogue_scenarios(student_id, group_key, sort_order);

create table if not exists dialogue_lines (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references dialogue_scenarios(id) on delete cascade,
  idx int not null,
  speaker text not null check (speaker in ('A', 'B')),
  text_en text not null,
  text_ar text not null,
  note_ar text,                    -- why it is phrased this way (shown in «افهم»)
  distractors jsonb,               -- authored wrong replies for the «دورك» drill
  audio_url text,
  start_ms int,                    -- offset inside full_audio_url
  end_ms int,
  unique (scenario_id, idx)
);
create index if not exists dialogue_lines_scenario_idx on dialogue_lines(scenario_id, idx);

create table if not exists dialogue_expressions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references dialogue_scenarios(id) on delete cascade,
  phrase_en text not null,
  meaning_ar text not null,
  when_to_use_ar text not null,
  sort_order int not null default 0
);
create index if not exists dialogue_expressions_scenario_idx on dialogue_expressions(scenario_id, sort_order);

-- ── progress ───────────────────────────────────────────────────────────────
create table if not exists dialogue_progress (
  student_id uuid not null references profiles(id) on delete cascade,
  scenario_id uuid not null references dialogue_scenarios(id) on delete cascade,
  listened boolean not null default false,
  studied boolean not null default false,
  recall_best int not null default 0 check (recall_best between 0 and 100),
  roleplay_best int not null default 0 check (roleplay_best between 0 and 100),
  status text not null default 'learning' check (status in ('learning', 'mastered')),
  attempts int not null default 0,
  last_seen_at timestamptz not null default now(),
  primary key (student_id, scenario_id)
);

alter table dialogue_scenarios   enable row level security;
alter table dialogue_lines       enable row level security;
alter table dialogue_expressions enable row level security;
alter table dialogue_progress    enable row level security;

create or replace function _dialogue_owner_or_staff(p_scenario_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from dialogue_scenarios s
    where s.id = p_scenario_id
      and (s.student_id = auth.uid()
           or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'trainer')))
  );
$$;
revoke all on function _dialogue_owner_or_staff(uuid) from public, anon;
grant execute on function _dialogue_owner_or_staff(uuid) to authenticated;

drop policy if exists dsc_select_own on dialogue_scenarios;
create policy dsc_select_own on dialogue_scenarios for select to authenticated
  using (student_id = auth.uid()
         or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'trainer')));

drop policy if exists dln_select_own on dialogue_lines;
create policy dln_select_own on dialogue_lines for select to authenticated
  using (_dialogue_owner_or_staff(scenario_id));

drop policy if exists dex_select_own on dialogue_expressions;
create policy dex_select_own on dialogue_expressions for select to authenticated
  using (_dialogue_owner_or_staff(scenario_id));

drop policy if exists dpr_select_own on dialogue_progress;
create policy dpr_select_own on dialogue_progress for select to authenticated
  using (student_id = auth.uid()
         or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'trainer')));

-- ── the ONLY write path ────────────────────────────────────────────────────
create or replace function dialogue_record_progress(
  p_scenario_id uuid,
  p_stage text,
  p_score int default null
)
returns table (listened boolean, studied boolean, recall_best int, roleplay_best int, status text)
language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := auth.uid();
  v_owner uuid;
  v_score int := greatest(0, least(100, coalesce(p_score, 0)));
begin
  if v_student is null then raise exception 'not authenticated'; end if;
  if p_stage not in ('listened', 'studied', 'recall', 'roleplay') then
    raise exception 'unknown stage %', p_stage;
  end if;

  -- positively gate on ownership; never infer service-role from a null uid.
  select s.student_id into v_owner from dialogue_scenarios s where s.id = p_scenario_id;
  if v_owner is null or v_owner <> v_student then raise exception 'scenario not yours'; end if;

  insert into dialogue_progress as g (student_id, scenario_id, listened, studied, recall_best, roleplay_best, attempts, last_seen_at)
  values (
    v_student, p_scenario_id,
    p_stage = 'listened',
    p_stage = 'studied',
    case when p_stage = 'recall'   then v_score else 0 end,
    case when p_stage = 'roleplay' then v_score else 0 end,
    1, now()
  )
  on conflict (student_id, scenario_id) do update set
    listened      = g.listened or p_stage = 'listened',
    studied       = g.studied  or p_stage = 'studied',
    recall_best   = greatest(g.recall_best,   case when p_stage = 'recall'   then v_score else 0 end),
    roleplay_best = greatest(g.roleplay_best, case when p_stage = 'roleplay' then v_score else 0 end),
    attempts      = g.attempts + 1,
    last_seen_at  = now();

  -- «أتقنتها» only when he can both reproduce his lines and answer in role.
  update dialogue_progress g set status =
    case when g.recall_best >= 80 and g.roleplay_best >= 80 then 'mastered' else 'learning' end
  where g.student_id = v_student and g.scenario_id = p_scenario_id;

  return query
    select g.listened, g.studied, g.recall_best, g.roleplay_best, g.status
    from dialogue_progress g
    where g.student_id = v_student and g.scenario_id = p_scenario_id;
end $$;

revoke all on function dialogue_record_progress(uuid, text, int) from public, anon;
grant execute on function dialogue_record_progress(uuid, text, int) to authenticated;

-- ── entitlement guard: uses_dialogues is admin-only (Tier A) ───────────────
-- Adding an entitlement column WITHOUT this leaves it PATCH-able by the student
-- himself (students_update policy allows id = auth.uid()). See 20260716100000.
create or replace function guard_student_account_columns()
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
     or (new.uses_step_track        is distinct from old.uses_step_track)
     or (new.uses_pro_desk          is distinct from old.uses_pro_desk)
     or (new.home_surface           is distinct from old.home_surface)
     or (new.uses_class_notes       is distinct from old.uses_class_notes)
     or (new.uses_phrase_bank       is distinct from old.uses_phrase_bank)
     or (new.uses_dialogues         is distinct from old.uses_dialogues)
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
