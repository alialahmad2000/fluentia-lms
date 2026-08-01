-- ============================================================================
-- Public level test (marketing site /level-test) — results + leads.
--
-- Writes arrive ONLY through the `level-test-submit` edge function using the
-- service role. There is deliberately no anon INSERT policy: the anon key ships
-- inside the public JS bundle, so an anon-writable table is a spam endpoint.
-- RLS is on with staff-only read, which means anon/authenticated students get
-- nothing at all.
-- ============================================================================

create table if not exists public.level_test_results (
  id uuid primary key default gen_random_uuid(),

  -- who
  name        text not null,
  phone       text,
  age         int,
  gender      text check (gender in ('male', 'female')),
  goal        text,

  -- outcome (level_index is the 0–5 Fluentia scale == students.academic_level)
  level_index int check (level_index between 0 and 5),
  level_code  text,
  cefr        text,
  level_ar    text,
  track       text,
  confidence  text check (confidence in ('high', 'medium', 'low')),
  top_prob    int,
  alt_level   text,
  alt_prob    int,
  theta       numeric,
  se          numeric,

  -- evidence
  correct         int,
  total           int,
  pct             int,
  skills          jsonb,
  listening_done  boolean default false,
  writing         text,
  writing_signals jsonb,
  minutes         int,
  left_page       int default 0,

  -- attribution
  ref_code     text,
  visitor_id   text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,

  status       text not null default 'started' check (status in ('started', 'completed')),
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.level_test_results is
  'Placement results from the public level test on fluentia.academy/level-test. Written only by the level-test-submit edge function (service role).';
comment on column public.level_test_results.level_index is
  '0=Pre-A1 … 5=C1 — the same scale as students.academic_level, so a result can be applied directly.';

create index if not exists level_test_results_created_idx on public.level_test_results (created_at desc);
create index if not exists level_test_results_status_idx  on public.level_test_results (status, created_at desc);
create index if not exists level_test_results_phone_idx   on public.level_test_results (phone);

alter table public.level_test_results enable row level security;

drop policy if exists level_test_results_staff_read on public.level_test_results;
create policy level_test_results_staff_read
  on public.level_test_results
  for select
  to authenticated
  using (is_staff());
