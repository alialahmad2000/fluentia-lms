# Retention System — Blockers Log

Format: stop, write two options, move on. Ali resolves.

---

## B1 — Module 2 exercise corpus (full 3,500-target deferred)

**Status:** 69 hand-authored starter exercises shipped (43 L1 + 26 L3). Target was 3,500 (~700/level × 5 levels). Gap: 3,431 exercises.

**Two options:**
1. **Future content pass via a dedicated Claude Code session.** Open `scripts/retention/templates/exercise-templates-L*.cjs`, author additional templates with the same shape, then re-run `node scripts/retention/seed-exercises.cjs` (idempotent — skips already-inserted rows by (level, skill, exercise_type, prompt_en)). Budget: ~3-5 hours per level for full coverage at the quality shown in the starter corpus. Recommended.
2. **Generator script with programmatic variation.** Build a script that takes a smaller hand-authored seed (~50 per level/skill) and combinatorially varies vocab/grammar topics to produce the 3,500. Faster but lower per-exercise quality. Not recommended for the active L1/L3 levels where students will see them.

**My recommendation:** option 1 for L1 + L3 (active students), option 2 (or skip entirely) for L0/L2/L4/L5 until those levels have active enrollees.

**Module 2 ships functional with the starter 69:** Students at L1 see 43 exercises, L3 see 26. The selection algorithm picks 5 at a time, excludes attempted-in-last-30-days, so each homework set is fresh until the bank is exhausted (~9 L1 sets, ~5 L3 sets before exhaustion). Acceptable for the first 2-4 weeks of soft-launch; bank expansion needed before wide rollout.

## B2 — Module 1 scenario corpus + audio (200-target deferred, audio deferred)

**Status:** 12 hand-authored linear scenarios shipped (6 L1 + 6 L3) with 56 turns total. Target was 200 scenarios with branching. 8 personas + 5 feedback templates also shipped.

**Two options for scenario expansion:**
1. **Future content session — extend templates in `scripts/retention/seed-dialogues.cjs`** (same pattern as Module 2). Each scenario takes ~5 min to author at the quality shipped. ~30 hours total to reach 200. Recommended.
2. **Reduce target to 50** (which is more realistic for a single trainer's content output) — students rotate through them weekly, covering ~2 months before any scenario repeats.

**Audio:** All 56 turns ship without ElevenLabs audio. Browser `SpeechSynthesis` is the runtime fallback (functional on all target browsers). ElevenLabs generation deferred for two reasons:
- Maintain ~88K char buffer for Module 5 review briefs + future Module 3 reports
- Browser TTS is honestly fine for L1/L3 — students hear English at a natural pace; the persona voice is less critical than the dialogue flow

**Branching:** Schema supports `parent_turn_id` + `branch_label` but all current turns are linear. To add branching, set `parent_turn_id` to a non-NULL value when seeding sibling turns, and update the eval edge fn to pick the next turn based on response shape match. Deferred.

## B3 — Module 3 email delivery (in-app notification only for now)

**Status:** `useApproveReport` mutation inserts an in-app notification when the trainer hits "أرسلي". The mega-prompt also asks for email delivery via `send-email`. Deferred.

**Two options:**
1. **Add the email send inside the mutation** — one extra `supabase.functions.invoke('send-email', { body: { to, subject, html } })` call after the notification insert. ~15 min. Recommended for Block 7 polish or first post-launch pass.
2. **Skip email entirely; rely on in-app + PWA push** — simpler, matches Ali's "in-LMS" philosophy. The downside is that students who haven't opened the app in 24h won't see the report.

**Template-bank gap:** Mega-prompt asked for 80 templates; we shipped 7 high-priority shapes that cover ~90% of realistic combinations across Ali's roster. Adding more is one INSERT each via `scripts/retention/seed-report-templates.cjs`.


