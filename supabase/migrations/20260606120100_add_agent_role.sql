-- Fluentia CS Ops — B2: add the 'agent' role to the user_role enum.
-- This MUST be its own committed step: Postgres cannot use a freshly-added
-- enum value in the same transaction that adds it. Applied standalone.
alter type public.user_role add value if not exists 'agent';
