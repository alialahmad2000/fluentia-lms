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


