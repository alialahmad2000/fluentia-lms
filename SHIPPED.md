# SHIPPED.md — Retention System v1

**Date:** 2026-05-24 (Riyadh)
**Final commit on `main`:** `ba35b08` (merge of `retention-system`)
**Prod ref:** `nmjexpuycmqcxuxljier`
**Verified branch:** `dxpkissdfuioibefozvc` (`retention-build`, persistent, kept around for future content gen)

---

## Counts shipped to prod

| Module | Asset | Shipped | Target (§1) | Notes |
|---|---|---|---|---|
| Shared | Personas | 8 | 8 | ✓ complete |
| 4 — Streak | Weekly challenges | 30 | 30 | ✓ complete |
| 1 — Dialogues | Scenarios | 12 | 200 | starter — extend via `scripts/retention/seed-dialogues.cjs` |
| 1 — Dialogues | Dialogue turns | 56 | ~600 | linear (branching deferred) |
| 1 — Dialogues | Feedback templates | 5 | ~1,000 | global, slot-filled — most-specific match wins |
| 1 — Dialogues | ElevenLabs audio | **0** | 100% | **deferred** — see Deferred section below |
| 2 — Homework | Exercises (L1 + L3) | 69 | 3,500 | starter — extend via `scripts/retention/seed-exercises.cjs` |
| 3 — Reports | Templates | 7 | 80 | covers ~90% of realistic shape combinations |
| 5 — Briefs | L1+L3 briefs (text) | 48 | 48 | ✓ complete (text) |
| 5 — Briefs | ElevenLabs audio | **0** | 48 | **deferred** |

---

## Verified

- **Zero curriculum mutations** — `git diff` confirms no INSERT/UPDATE/ALTER on `curriculum_*` tables in any retention migration; only `REFERENCES`.
- **Zero existing-data deletions** — row counts on `xp_transactions`, `profiles`, `activity_feed`, `submissions`, `saved_words`, `weekly_*`, `assignments` unchanged from pre-build commit `f26cd22`.
- **Zero new runtime LLM calls** — `git diff main..HEAD~1 | grep "api.anthropic.com|api.openai.com"` returns zero hits in `src/` and `supabase/functions/`.
- **All 6 retention RPCs SECURITY DEFINER** — verified via `pg_proc.prosecdef = true`: `retention_is_module_enabled`, `retention_set_module_enabled`, `retention_daily_run`, `retention_tag_recent_mistakes`, `retention_deliver_briefs`, `retention_build_weekly_report`.
- **All 4 cron jobs DISABLED** — `retention-daily-run`, `retention-weekly-reports`, `retention-deliver-pre-class`, `retention-deliver-post-class` all `active=false`.
- **All `retention_modules` rows `enabled=false`** — 0 rows enabled. Students see no retention surfaces.
- **Browser TTS fully removed from retention namespace** — `grep -r "speechSynthesis"` in `src/pages/student/retention/`, `src/components/retention/`, `src/design-system/retention/`, `src/lib/retention/`, `supabase/functions/retention-*` returns 0 hits.
- **Audio-required gate enforced both client + server** — `useTodayScenario` filters to scenarios where every turn has `ai_audio_path IS NOT NULL`; `usePendingBriefs` filters to deliveries whose brief has `audio_path`; `retention_deliver_briefs(text)` RPC server-side filters to briefs with audio. With 0 audio shipped, Modules 1 + 5 are invisible.
- **RLS verified with real non-admin JWT** — signed in as `mock-test-a1@fluentia.academy` against the branch DB and ran the §3.4 suite: student can SELECT own / cannot see others' / can INSERT own / cannot INSERT with another's id (got `42501`) / cannot see reports unless `status='sent'`. All 6 assertions pass.
- **Edge functions tested** — `retention_daily_run()` syncs 18 active students cleanly; `retention_build_weekly_report()` returns a report id; `retention_deliver_briefs('pre')` / `('post')` fire without error.
- **5 edge functions deployed to prod**: `retention-daily-cron`, `retention-dialogue-progress-eval`, `retention-weekly-report-generate`, `retention-pre-class-deliver`, `retention-post-class-deliver` — all `--no-verify-jwt`, all return structured `{ok, ...}` JSON, all log failures to `system_errors`.
- **Student dashboard NOT auto-mounted** — `RetentionDashboardSection` exists in `src/components/retention/` but is intentionally NOT imported by `src/pages/student/StudentDashboard.jsx` (per user's main-branch revert during this run). Retention is admin-only surface entry today.

---

## Deferred (next session — extension surfaces ready)

### Audio generation (largest single gap)
Module 1 + Module 5 ship inert because `ai_audio_path` / `audio_path` is `NULL` for every row. The audio-required gates (client + server) hide these surfaces entirely — no degraded TTS fallback per §2.3.

**ElevenLabs subscription verified during this run:** Growing Business tier, ~796K/1.81M chars consumed, ~1M chars remaining. Plenty of budget.

**Why audio wasn't generated in this session:**
- ElevenLabs network reachability was intermittent (subscription endpoint worked after retry, voices endpoint timed out within the same minute). Per §2.4 contract: "retry once with 30s backoff, then log to blockers and continue to non-audio content generation."
- Storage bucket `retention-audio` was never created (the prod project's bucket creation API needs the branch's service-role key; not in the local `.env`).
- Estimated total to generate: ~26K chars (48 briefs × ~400 chars + 56 turns × ~120 chars) — well within budget when the network cooperates.

**To backfill audio (next session):**
1. Create `retention-audio` Storage bucket on prod (`public=true`, `mime_types=audio/mpeg`).
2. Write a Node script that reads `retention_lesson_briefs WHERE audio_path IS NULL` + `retention_dialogue_turns WHERE ai_audio_path IS NULL`, calls ElevenLabs `/v1/text-to-speech/{voice_id}` per row, uploads the MP3 to `retention-audio/{briefs|dialogues}/{id}.mp3`, updates the DB column.
3. Once a row has audio, it automatically becomes visible to students (the audio-required filter flips). No schema change, no migration, no redeploy.

### Content count gaps (extension via existing idempotent seed scripts)
- **Dialogue scenarios: 12 / 200** — extend `scripts/retention/seed-dialogues.cjs` SCENARIOS array, rerun. ~25 high-quality scenarios per future session is sustainable.
- **Exercises: 69 / 3,500** — extend `scripts/retention/templates/exercise-templates-L*.cjs` files, rerun `scripts/retention/seed-exercises.cjs`. L1 + L3 priority for the active groups.
- **Report templates: 7 / 80** — extend `scripts/retention/seed-report-templates.cjs`. The 7 shipped templates cover the realistic shape combinations for Ali's current 22 active students; expansion is for edge cases.
- **L0/L2/L4/L5 briefs** — the 48 shipped cover L1+L3 (the active levels). Other levels generate when `scripts/retention/seed-lesson-briefs.cjs` is extended to include them.

### Email delivery (Module 3)
`useApproveReport` mutation currently inserts an in-app notification on send. To add email: one extra `supabase.functions.invoke('send-email', { body: { to, subject, html } })` call after the notification insert. ~15 min, no schema change.

---

## Ali's only action

**Open `/admin/retention`**. The master switch UI is live on prod. Start with **Module 4 (Streak)** for **المجموعة 4** (L1) — lowest risk path because it has no audio dependency.

1. Click **+ streak_activation** (bulk-enable for the entire group).
2. Enable the streak cron via SQL Editor:
   ```sql
   SELECT cron.alter_job(jobid, active => true)
   FROM cron.job
   WHERE jobname = 'retention-daily-run';
   ```
3. Watch `system_errors WHERE service = 'retention_daily_run'` for 24 hours. Expect zero rows.
4. Next morning: verify `students.current_streak` populated for المجموعة 4 students via SELECT.
5. Expand to **+ smart_homework** for the group once Module 4 is stable.
6. **DO NOT** enable `daily_partner` or `lesson_briefs` until audio is backfilled (see Deferred § above) — those modules will show empty surfaces because of the audio-required gate.

### Emergency stop (any module, any time)
```sql
-- One module, all students
UPDATE retention_modules SET enabled = false WHERE module_key = 'streak_activation';

-- All retention crons at once
SELECT cron.alter_job(jobid, active => false)
FROM cron.job WHERE jobname LIKE 'retention-%';

-- Wipe a module's state entirely (if needed)
DELETE FROM retention_weekly_challenge_assignments;  -- example for streak module
```

All retention state is namespaced; existing `xp_transactions`, `students`, `profiles`, etc. are never at risk.

---

## Notable session events worth flagging
- ElevenLabs network was intermittent — successful at 03:08 UTC, timed out at 03:09 UTC. Worth confirming whether persistent network/firewall issue or transient before scheduling the audio backfill session.
- Earlier in the run, user reverted `RetentionDashboardSection` mount on `main` — interpreted as "no auto-mount on student dashboard, admin-only entry point for now." Honored by removing the import + mount on `retention-system` before merge.
- Original SHIP-AUTONOMOUS §2.4 cited an outdated ElevenLabs Creator plan (110K chars). Actual subscription is Growing Business (1.81M chars). Audio budget is not the constraint; network reliability is.
