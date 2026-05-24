# Module 1 — Pre-Launch Checklist

## Sacred constraints honored
- [x] Reuses `whisper-transcribe` edge fn (existing) for STT — no new STT path
- [x] Reuses `xp_transactions` with `reason='challenge'` (no enum extension)
- [x] No runtime Claude/OpenAI calls (the eval edge fn is purely rule-based)
- [x] No edits to existing edge functions; new `retention-dialogue-progress-eval` is additive

## RPC + edge function SECURITY DEFINER
- `retention-dialogue-progress-eval` edge fn — auth-gated via `supabase.auth.getUser(bearer)`; updates `retention_dialogue_attempts` with `student_id = user.id` filter (RLS enforces the same)
- No new PL/pgSQL SECURITY DEFINER functions added in this block (the rule-based eval lives in the edge fn)

## Tables
- `retention_personas` (8 rows seeded)
- `retention_scenarios` (12 rows seeded: 6 L1 + 6 L3)
- `retention_dialogue_turns` (56 rows seeded — linear sequences, branching deferred)
- `retention_feedback_templates` (5 global templates)
- `retention_dialogue_attempts` (expanded from Block 2 stub with scenario_id/branch_path/vocab metrics/transcript)

## RLS coverage
- `retention_personas` — read all + admin write ✓
- `retention_scenarios` — read active + staff read all + admin write ✓
- `retention_dialogue_turns` — read all + admin write ✓
- `retention_feedback_templates` — read all ✓
- `retention_dialogue_attempts` — student own select (Block 2 stub) + student own insert + student own update + staff select ✓

## Frontend
- Hooks: `useTodayScenario`, `useScenarioTurns`, `useScenarioWithTurns`, `useDialogueAttemptHistory`
- Pure module: `dialogueEval.js` — same scoring logic mirrored in the edge fn
- Pages: `DailyPartnerLanding`, `DailyPartnerPlay`, `DailyPartnerResult`
- 3 routes added in `App.jsx`
- Dashboard card mounted in `RetentionDashboardSection` gated on `daily_partner` flag

## Audio strategy (deferred)
- All 56 dialogue turns ship with `ai_audio_path = NULL`. `DailyPartnerPlay` uses **browser SpeechSynthesis** (`window.speechSynthesis.speak`) as a fallback for the AI line. This is functional (Safari + Chrome + iOS all support it) — voices vary but the dialogue runs end-to-end. ElevenLabs generation is deferred per the shared 80% cap policy.
- When audio is eventually generated, the script will populate `ai_audio_path` and the player will automatically use the file instead of the browser TTS.

## Feature OFF by default
- Module flag `daily_partner` defaults to false per student.
- All routes guard via `useRetentionModuleEnabled('daily_partner')` → render `RetentionDisabledState` if off.
- Dashboard card only renders when flag is true.

## Deferred work (logged in blockers.md)
- Full 200 scenarios target (12 shipped). Generator pattern in `scripts/retention/seed-dialogues.cjs` — extend SCENARIOS array, re-run idempotently.
- Branching turn trees (currently all turns are linear). The schema supports `parent_turn_id` + `branch_label` already; the eval edge fn would need to branch based on the chosen response type.
- ElevenLabs voice generation for all dialogue lines (~500-700 chars per turn × 56 turns ≈ 35K chars at first pass — well within 80% cap for L1+L3, but deferred to maintain audio budget for review briefs)
- Admin `/admin/retention/dialogues` editor — deferred to Block 7 or future
