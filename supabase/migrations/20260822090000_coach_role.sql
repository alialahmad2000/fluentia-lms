-- The Learning Coach role.
--
-- Alone in its own migration on purpose: ALTER TYPE ... ADD VALUE cannot be
-- used in the same transaction that later references the new value, so nothing
-- else may share this file.
--
-- Verified in Phase A (2026-08-22): the enum type is public.user_role and its
-- values were student, trainer, admin, affiliate, agent, coordinator — no
-- 'coach'. `coordinator` stays exactly as it is; it belongs to the Arabic
-- class-scheduling workspace (هاجر) and is a different job.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'coach';
