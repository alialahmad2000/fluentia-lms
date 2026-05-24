# Retention System — Decisions Log

Each decision = assumption made + alternative considered + when to revisit.

---

## D1 — Streak data model lives on `students`, not `profiles`

**Decision:** Use `students.current_streak` + `students.last_active_at` (existing) as the canonical streak surface. Do NOT create `profiles.streak_days` or `profiles.retention_streak` as the prompt's §2.4 example suggests.

**Rationale:** The prompt assumed `profiles.streak` / `profiles.streak_days`. Live code in `cron-streak-check` and `xpManager.js` already reads/writes `students.current_streak`. Creating a second column would be the exact "parallel system" §2.2 forbids.

**Alternative considered:** Add `students.retention_streak` separate from `current_streak`. Rejected — same data, two columns, ongoing sync risk.

**How to apply:** Module 4 widgets read `students.current_streak`. The 30-day heat-map computes filled cells from union of (any `xp_transactions` row, any `retention_dialogue_attempts` row, any `retention_homework_attempts` row, any submission, any saved word). The existing `check_streaks` RPC's activity predicate may need an additive update to include retention activities — that change goes in Phase A diagnosis output `streak-diagnosis.md`.

---

## D2 — `cron-streak-check` edge function reused, not duplicated

**Decision:** Module 4's "daily streak update" responsibility stays inside the existing `cron-streak-check` edge fn (extended if needed). New `retention-daily-cron` handles ONLY the weekly-challenge assignment + progress + reward path.

**Rationale:** `cron-streak-check` already (a) calls `check_streaks` RPC, (b) sends streak-warning notifications, (c) sends push notifications. Duplicating it would risk double-decrementing streaks or sending warnings twice.

**How to apply:** Phase A diagnosis confirms whether `cron-streak-check` has a working pg_cron schedule. If yes, leave it. If no, add the schedule. If `check_streaks` predicates need to include retention-activity tables to keep streaks alive, that's a CREATE OR REPLACE FUNCTION (additive — function body change, no schema change).

---

## D3 — Supabase branch `retention-build` for all writes; production read-only

**Decision:** All migrations + content seeds + edge-function deploys for this build target Supabase branch `retention-build` (id `dxpkissdfuioibefozvc`). Production database stays untouched. Ali promotes after review.

**Rationale:** Ali's explicit instruction. Matches the "no feature exposed in same session it was built" post-mock-exam rule on the data side. The `.mcp.json` MCP runs read-only intentionally.

**How to apply:** Set `SUPABASE_DB_URL` in scripts to the branch connection string (fetched once branch is ACTIVE). All `supabase db push` and seed scripts target the branch. After Ali's review, he runs `supabase branches merge retention-build` (or copies migrations + re-applies to prod).

---

## D4 — Build on git branch `retention-system`, never push to main

**Decision:** All commits go to branch `retention-system`. Vercel preview deploys per commit. Ali opens a PR himself and merges.

**Rationale:** Post-mock-exam-incident standard — see `feedback_deploy_policy` memory.

---

## D5 — Audio generation cap at 80% of ElevenLabs Creator quota; L1+L3 first

**Decision:** Module 1 dialogues + Module 5 lesson briefs share a single audio-gen budget. Generate in order: Module 1 L1 → Module 1 L3 → Module 5 L1 prep → Module 5 L1 review → Module 5 L3 prep → Module 5 L3 review → Module 1 L0/L2 → Module 1 L4/L5 → Module 5 L0/L2/L4/L5. Hard stop at 80% cap (~88K chars used). Log every deferred item in `blockers.md` with exact regen command.

**Rationale:** Active students live in المجموعة 4 (L1) and المجموعة 2 (L3). L0/L2/L4/L5 have no urgent demand. Buffer protects Ali's other mid-cycle audio needs.

**How to apply:** Pre-flight check via ElevenLabs `/v1/user` to read current `character_count`/`character_limit`. Compute budget. Pre-sort batch. Stop cleanly when 80% reached; persist a "next pickup" file.

---

## D6 — Pronunciation, personalization, deprecated features stay off

**Decision:** Do NOT re-enable `personalized_readings` UI, do NOT surface `curriculum_pronunciation` standalone tab/activity, do NOT recreate `StudentConversation` / `StudentChallenges` / `SmartNudgesWidget` / `StudentWowMoments` etc.

**Rationale:** Each was an explicit product decision Ali made (kill-switch / revert / drop). Retention is a NEW layer, not a revival.

**How to apply:** Module 1's "Daily Practice Partner" route lives at `/student/retention/daily-partner` — never at `/student/conversation`. Vocabulary-internal pronunciation alerts (which ARE still active inside the vocab card) can be referenced by Module 5 review briefs, but the standalone surface stays shelved.

---

## D7 — Retention modules default OFF per student; admin gradual enable

**Decision:** `retention_modules` table with `(student_id, module_key, enabled boolean default false)`. Every new student row defaults to all modules `false`. Ali enables per-student or per-group via `/admin/retention` after review.

**Rationale:** Matches §2.7 "no feature exposed in same session" rule on the UX side. Lets us ship code + content + migrations to prod (after Ali promotes) with zero student-visible change until Ali decides.

**How to apply:** Hook `useRetentionModuleEnabled(moduleKey)` returns `false` if no row exists, treats absence as default-off. Every route guards on the hook. Every dashboard card mounts gated.

---

## D8 — Reuse `xp_transactions` reason `'challenge'` for retention XP

**Decision:** All retention XP awards (dialogue completion, homework set completion, weekly challenge completion) use existing `xp_transactions.reason = 'challenge'` rather than introducing a new enum value.

**Rationale:** Adding a new enum value within a transaction is a PostgreSQL limitation (see `vocabulary_quiz_attempts` precedent from 2026-04-10). `'challenge'` is semantically accurate. Description column carries the specific subtype (e.g. "تحدي أسبوعي — أكمل 5 محادثات", "محادثة يومية — Sarah البارستا").

**How to apply:** Use `xpManager.awardPracticeXP` for dialogue + homework. For weekly challenge reward, write direct `xp_transactions` insert with `reason='challenge'` (RPC `award_curriculum_xp` fallback covers RLS edge cases).

---

## D9 — Mistake tagging via background SQL job, not real-time triggers

**Decision:** `retention_student_mistake_tags` populated by a daily SQL job (run inside `retention-daily-cron`) that scans the last 24h of `writing_submissions`/`speaking_submissions`/wrong `submissions` answers and inserts new tag rows. NOT via PostgreSQL triggers on those source tables.

**Rationale:** Adding triggers to existing high-traffic tables is structural risk. The 24h freshness window is fine for homework selection. Recovery + re-run is trivial.

**How to apply:** SQL function `retention_tag_recent_mistakes()` SECURITY DEFINER, called once per day by `retention-daily-cron`. Uses regex heuristics for common Arabic-speaker errors. Idempotent (`ON CONFLICT DO NOTHING` on `(student_id, source_table, source_id, mistake_tag)` natural key).

---

## D10 — Discovery DB-schema appendix deferred to after branch is ready

**Decision:** This Discovery commit ships with the schema appendix in `repo-inventory.md` marked PENDING. A follow-up commit appends the live introspection once Supabase branch `retention-build` reaches ACTIVE state.

**Rationale:** Branch is still in `CREATING_PROJECT`. Blocking the entire build on a 3–8 minute branch provision is wasteful. The introspection findings will inform Block 1 migration shape but don't affect the Block 0 plan above.

**How to apply:** Once branch is ACTIVE, run a small Node script (or Bash via `supabase db query`) for each of the 7 introspection queries listed in `repo-inventory.md` §9, write results into an appendix section, commit.
