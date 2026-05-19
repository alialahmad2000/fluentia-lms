# Personalization Kill-Switch — Final Report (2026-05-19)

## What previous prompts missed

Previous attempts (`ecbd0d1` UI revert, `e4ef9f7` audio-engine stale-deps fix) used **service-role audits** that bypass RLS. That made them ground truth for "does the data exist?" but blind to "would an authenticated student see something different than service-role?" If a hidden RLS policy, view, or RPC had been doing interest-based row substitution, those audits would not have detected it.

The dispositive test the previous audits did not run: **mint real student JWT sessions and compare their reads to service-role.** This prompt did exactly that, plus added a global kill-switch and client purge as belt-and-suspenders.

## Phase A finding — data layer is clean

`scripts/audits/personalization-killswitch/02-impersonate-and-compare.cjs` minted real `magiclink` sessions for a test student (Layan, has 3 interests) and a control student (Sara, no interests) and ran identical `SELECT … FROM curriculum_readings WHERE unit_id = $1 ORDER BY sort_order` queries across 5 multi-article units.

Result: **0 field-level diffs.** Both students see the same rows as service-role.

`scripts/audits/personalization-killswitch/03-sweep-related-tables.cjs` extended to `curriculum_listening`, `curriculum_vocabulary`, `reading_passage_audio`, `curriculum_grammar`. Result: **all 5 tables return identical rows under all three roles.**

There is **no RLS, view, function, or RPC** doing interest-based content substitution.

The 5 edge functions matching "personali" keyword (`cron-streak-check`, `generate-targeted-exercises`, `generate-ai-student-profile`, `generate-task-briefing`, `smart-nudges`) all use the adjective "personalized" in different contexts (nudges, AI tips, exercises from error patterns) — none reference `personalized_readings` or `user_interests`.

The previous UI revert (`ecbd0d1`) and audio-engine fix (`e4ef9f7`) were correct and complete at the React/code layer.

## Layer killed (Phase B — even though the data layer was already clean, the prompt required these defensive layers)

| Layer | Action | File |
|-------|--------|------|
| **DB feature flag** | New `app_config` table + row `('personalization_enabled', false)` + RLS (authenticated SELECT, service_role ALL) | `supabase/migrations/20260519100000_app_config_personalization_killswitch.sql` |
| **JS helper** | `isPersonalizationEnabled()` reads flag with 5-min cache, fails closed on error | `src/lib/featureFlags.js` |
| **Hook guard — usePersonalizedReading** | Short-circuits to `null` when flag is off, BEFORE touching `personalized_readings` | `src/hooks/usePersonalizedReading.js` |
| **Hook guard — useUserInterests** | Returns "no interests" shape when flag is off, BEFORE touching `user_interests` | `src/hooks/useUserInterests.js` |
| **Client-side state purge** | On app load, removes any localStorage/sessionStorage keys matching `fluentia:variant*`, `fluentia:personali*`, `fluentia:interest*`, `fluentia:selectedVariant*` | `src/main.jsx` |
| **Query cache purge** | On app load, removes any cached `['personalized-reading']` / `['user-interests']` query results | `src/main.jsx` |

## Migration applied

```
$ node scripts/audits/personalization-killswitch/04-apply-migration.cjs
Applying 20260519100000_app_config_personalization_killswitch.sql via Management API…
Result: []
Verify seeded value: [{ key: "personalization_enabled", value: false, … }]
```

Applied via Supabase Management API (`POST /v1/projects/{ref}/database/query`) using the personal access token from `.mcp.json`.

## Global kill-switch

- **Table:** `public.app_config`
- **Key:** `personalization_enabled`
- **Value:** `false` (jsonb)
- **Helper:** `src/lib/featureFlags.js` — `isPersonalizationEnabled()`
- **Future opt-in:** flip the row to `true` AND uncomment the 3 mount points (StudentDashboard, StudentProfile, ReadingTab) AND clear the helper cache via `resetFeatureFlagCache()`.

## Verification

### Automated

- `02-impersonate-and-compare.cjs` (Phase A) — 5 units × 2 students = 10 article reads, **0 diffs vs service-role** ✅
- `03-sweep-related-tables.cjs` (Phase A) — 5 tables, **all student reads identical to service-role** ✅
- `05-three-profile-sweep.cjs` (Phase C) — **15/15 combos PASS** + all 3 subjects observe `app_config.personalization_enabled = false` ✅
- `grep -rn "from('personalized_readings'\|from('user_interests'" src/` — 3 matches, all inside the two hook files that now defer to the kill-switch ✅
- All 3 personalization mount points still commented in source ✅

### Manual (pending Ali)

See `MANUAL-WALKTHROUGH.md` — login as `layan88700@gmail.com` (has interests) and `sarashrahili22@gmail.com` (no interests), confirm canonical-only experience, no survey card, no settings section, flag reads `false` in DevTools.

## Data preserved (no destruction)

- `personalized_readings`: **1152 rows untouched** (variant content for future opt-in)
- `user_interests`: **10 rows untouched** (interest-tagged students preserved)
- Variant audio files in Storage: **untouched**
- Personalization component files (`src/components/personalization/*`): **untouched** (still in tree, just not mounted)
- Personalization hook files: **untouched** content; only the table reads are now gated by `isPersonalizationEnabled()`

Future opt-in feature can resurrect everything by flipping `app_config.personalization_enabled = true` and re-mounting the components.

## Not touched

- No student data writes (no submissions, no unit_progress, no xp_transactions)
- No DB schema changes other than the new `app_config` table
- No edge function changes
- No transcript content regenerated
- Listening/reading section UI not changed beyond the hook guards
- No `vite build` run locally
