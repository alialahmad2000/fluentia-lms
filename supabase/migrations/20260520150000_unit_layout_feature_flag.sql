-- Unit Movements V3 — feature flag infrastructure
-- Substitutes the V3 prompt's reference to `system_settings` with the
-- project's existing `app_config` table (key TEXT PRIMARY KEY, value JSONB).
-- Rationale documented in docs/UNIT-MOVEMENTS-V3-DISCOVERY.md §10.1.

-- 1. Global default flag
INSERT INTO public.app_config (key, value, description, updated_at)
VALUES (
  'unit_layout',
  '"v2"'::jsonb,
  'Which unit page layout is active globally. Values: "v2" (Mission Grid, current default), "v3" (Movements). Per-user overrides live in profiles.unit_layout_preference.',
  now()
)
ON CONFLICT (key) DO NOTHING;

-- 2. Per-user override column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS unit_layout_preference TEXT;

-- 3. Constraint: only allowed values (idempotent guard)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_unit_layout_preference_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_unit_layout_preference_check
  CHECK (unit_layout_preference IS NULL OR unit_layout_preference IN ('v2', 'v3'));

-- 4. Documentation
COMMENT ON COLUMN public.profiles.unit_layout_preference IS
  'Override for app_config[unit_layout]. NULL = follow global. v2 = force Mission Grid. v3 = force Movements.';
