# Unit Movements V3 — Rollout Playbook

**Current status (2026-05-20):** V3 is built and reachable behind the feature flag. Global default is `v2` for every user. Ali's personal preference is set to `v3` so opening any unit URL on his admin account shows the Movements layout.

---

## Architecture in one minute

- DB flag: `app_config[unit_layout]` (JSONB value: `"v2"` or `"v3"`)
- Per-user override: `profiles.unit_layout_preference` (TEXT, `NULL` = follow global)
- Resolver: `src/hooks/useUnitLayoutVersion.js` — URL param `?layout=` (admins only) > user pref > global > `'v2'` fallback
- Router: `src/pages/student/curriculum/UnitContentRouter.jsx` — mounted at `/student/curriculum/unit/:unitId` (also trainer + admin preview routes). Renders V2's `UnitContent` or the V3 `UnitContentV3Wrapper`.
- V3 surface lives entirely in `src/pages/student/curriculum/unit-v3/`. Nothing under `unit-v2/` was modified.

---

## To preview V3 as admin (any unit)

Append `?layout=v3` to the unit URL.

```
https://fluentia-lms.vercel.app/student/curriculum/unit/<unit-id>?layout=v3
```

The URL-param override only respects admin role — students typing the same URL get whatever their preference resolves to (default V2).

## To preview V3 as a specific student

```sql
UPDATE profiles SET unit_layout_preference = 'v3' WHERE id = '<student-uuid>';
```

That student sees V3 on their next page load. They can still type `?layout=v3` or `?layout=v2` on their URL — but only admins get the URL-param honor; students see whatever their `unit_layout_preference` (or global) resolves to.

## To flip V3 globally

```sql
UPDATE app_config 
SET value = '"v3"'::jsonb, updated_at = now() 
WHERE key = 'unit_layout';
```

Every user without an explicit per-user override switches to V3 on their next page load. The `useUnitLayoutVersion` hook session-caches the value, so already-loaded sessions keep their current layout until they refresh.

## To roll back globally (10 seconds)

```sql
UPDATE app_config 
SET value = '"v2"'::jsonb, updated_at = now() 
WHERE key = 'unit_layout';
```

Every student instantly back to Mission Grid V2 on next refresh. Their progress, XP, completions, vocabulary mastery — all untouched. Only the visual layout changes.

## To force a single user back to V2 (e.g. complaint)

```sql
UPDATE profiles SET unit_layout_preference = 'v2' WHERE id = '<student-uuid>';
```

## To clear a user's override (let them follow global)

```sql
UPDATE profiles SET unit_layout_preference = NULL WHERE id = '<student-uuid>';
```

## To check who currently sees V3

```sql
-- Direct user overrides
SELECT id, email, role, unit_layout_preference 
FROM profiles 
WHERE unit_layout_preference = 'v3';

-- Global state
SELECT key, value, updated_at FROM app_config WHERE key = 'unit_layout';
```

If global is `"v3"` AND a user has no override (`unit_layout_preference IS NULL`), they see V3.

## To remove V3 permanently

1. Make sure no users depend on it: `UPDATE app_config SET value = '"v2"' WHERE key = 'unit_layout';`
2. `git revert <Phase D commit SHA>` — the route handler swap. After revert, `UnitContent` is mounted directly and V3 code on disk is unreachable.
3. (Optional — after a quiet period) Delete `src/pages/student/curriculum/unit-v3/`, `src/pages/student/curriculum/UnitContentRouter.jsx`, `src/hooks/useUnitLayoutVersion.js`, and write a cleanup migration to drop the `app_config[unit_layout]` row and `profiles.unit_layout_preference` column.

---

## What V3 does NOT change

V3 is a pure presentation upgrade. Toggling it changes only how the unit page looks. None of the following are affected:

- Student progress (`student_curriculum_progress`)
- XP transactions (`xp_transactions`, `xp_award_log`)
- Vocabulary mastery (`vocabulary_word_mastery`)
- Trophy / star ranking data
- Brief, Debrief, Context Ribbon, Learning Shadow, Vocab Gain Ticker
- ActivityContent components and their behavior (Reading/Grammar/Vocabulary/Listening/Writing/Speaking/Recording tabs are unchanged)
- Activity-complete event bus (`fluentia:activity:complete`, `fluentia:vocab-added`, `fluentia:celebration`)
- DB schema beyond the two flag fields added in the Phase C migration

V3 shares 100% of V2's data hooks, side effects, and component dependencies. Only the central grid of the unit page changes.

---

## Commit reference

| Phase | Commit | What |
|---|---|---|
| A | (in B's commit) | Discovery report `docs/UNIT-MOVEMENTS-V3-DISCOVERY.md` |
| B | `5169710` | V3 component library — `src/pages/student/curriculum/unit-v3/` (16 files) |
| C | `a251823` | Feature flag — migration + `src/hooks/useUnitLayoutVersion.js` |
| D | `a3e8c7d` | Route handler — `UnitContentRouter.jsx` + 3 route swaps in `App.jsx` |
| E | `d965629` | Phase E QA report appended to discovery doc |
| F | (this commit) | Rollout playbook |

To revert any single phase: `git revert <SHA>`. Phases C and D depend on B; reverting B alone will break C+D. Phases C and D are independent.

## Rollback fast paths

- **Visual rollback only:** `UPDATE app_config SET value = '"v2"' WHERE key = 'unit_layout';` — instant, no code change.
- **Full rollback:** `git revert a3e8c7d` (Phase D commit). Reverts the route swap. V3 code stays on disk but is unreachable.
- **Nuclear rollback:** `git revert d965629 a3e8c7d a251823 5169710` (4 commits). Deletes all V3 references from history; revert the migration in a follow-up.
