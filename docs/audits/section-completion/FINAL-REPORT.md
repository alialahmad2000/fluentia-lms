# Pronunciation Hide + Section Completion — Final Report (2026-05-19)

## Pronunciation — shelved (not deleted)

5 student-facing surfaces hidden with `PRONUNCIATION-HIDDEN 2026-05-19` markers:

| Surface | File |
|---------|------|
| `/student/pronunciation` route | `src/App.jsx` (lazy import + Route both commented) |
| Unit overview tab | `src/pages/student/curriculum/UnitContent.jsx` (lazy import + TABS entry + renderActivityContent case all commented) |
| Unit-v2 activity grid card | `src/pages/student/curriculum/unit-v2/useUnitData.js` (ACTIVITY_MAP pronunciation entry commented) |
| Content-icon registry | `src/pages/student/curriculum/_premiumPrimitives.jsx` (icon entry commented) |
| معمل التحدث sub-tab | `src/pages/student/StudentSpeaking.jsx` (lazy import + TABS entry + render case all commented) |

Code preserved (no deletes):
- `src/pages/student/StudentPronunciation.jsx` — the page itself
- `src/pages/student/curriculum/tabs/PronunciationTab.jsx`
- `src/components/curriculum/PronunciationActivity.jsx`

Vocabulary-internal pronunciation features (different concept — IPA + alerts for hard-to-pronounce vocab words) are **kept active** — they're in `src/components/vocabulary/PronunciationAlert.jsx` and `src/components/vocabulary/tabs/PronunciationTab.jsx`. Likewise the speaking-AI `pronunciation_notes` feedback channel is untouched.

DB data preserved: `curriculum_pronunciation` rows + any `student_curriculum_progress` rows with `section_type='pronunciation'` left alone. Audio files in storage untouched.

Re-enable guide: `docs/PRONUNCIATION-SHELVED.md`.

## Section completion — diagnosis

Probed Fatima (`f9ecb220-…`, second-highest completer in the last 7 days; deliberately not Lamia who was the listening reproducer). Inspected her `student_curriculum_progress` completed rows vs. `unit_progress.breakdown` rows:

- All 4 of her recently-active units already had `unit_progress` rows
- `reading_done: 2`, `writing_done: 1`, `grammar_done: 1`, `listening_done: 1` were correctly recorded
- The triggers (`recompute_unit_progress_*` on 4 source tables) were already firing
- The previous `SECTION-COMPLETION-RESTORE-2026-05-18` (committed inside the May 19 vocab-section-signal migration) DID land

**Layer broken: not COMPUTE / TRIGGER / READ / RLS — it was DENOMINATOR.** With pronunciation included in the inventory but no longer reachable from the UI, the percentage was capped below 100% even when every visible section was completed. Section badges DID light up; the unit's overall percentage was stuck.

## Fix

Migration `supabase/migrations/20260519120000_compute_unit_progress_exclude_pronunciation.sql` — replaces `compute_unit_progress()` with a copy that skips both the pronunciation inventory and completion blocks. Applied via Supabase Management API.

Backfill: `scripts/audits/section-completion/03-backfill.cjs` — recomputed every `unit_progress` row via the RPC + wrote the new values back. **Result: 97 rows updated, 0 inserted, 0 errors.**

## Verification

`scripts/audits/section-completion/04-verify.mjs`:

| Check | Result |
|-------|--------|
| `unit_progress` rows with pronunciation in inventory | 0/97 ✅ |
| `unit_progress` rows with `pronunciation_done` in completion | 0/97 ✅ |
| Fatima's 7 active units: section completions match expected | ✅ ALL PASS |
| 5 random students each show unit_progress rows with sensible percentages | ✅ |
| Orphan students (completions without unit_progress) | 0 ✅ |

Sample after-state:
```
nadiah.alkhayar@gmail.com  unit 738ff234…  7/8 (88%)
sama33467@gmail.com        unit 542c8884…  3/8 (38%)
layan88700@gmail.com       unit 34f36fbb…  1/8 (13%)
waadmohammed21@gmail.com   unit a5b583a4…  6/8 (75%)
sarakhaledm43@gmail.com    unit 1de8e161…  6/8 (75%)
```

The denominator dropped from 9 → 8 (lost the pronunciation slot), so visible-section completions now yield proportionally higher percentages without changing any student's actual completion state.

## Files changed

### Frontend (5 surfaces hidden)
- `src/App.jsx`
- `src/pages/student/curriculum/UnitContent.jsx`
- `src/pages/student/curriculum/unit-v2/useUnitData.js`
- `src/pages/student/curriculum/_premiumPrimitives.jsx`
- `src/pages/student/StudentSpeaking.jsx`

### DB
- `supabase/migrations/20260519120000_compute_unit_progress_exclude_pronunciation.sql` — NEW (applied)

### Scripts + audit artifacts
- `scripts/audits/section-completion/01-probe.mjs` — diagnostic
- `scripts/audits/section-completion/02-fatima-units.mjs` — diagnostic
- `scripts/audits/section-completion/03-backfill.cjs` — backfill runner
- `scripts/audits/section-completion/04-verify.mjs` — verifier

### Docs
- `docs/PRONUNCIATION-SHELVED.md` — top-level revival guide
- `docs/audits/section-completion/FINAL-REPORT.md` — this file

## Not touched (per strict rules)

- No submissions / vocab_progress / xp_transactions rows mutated
- No DB tables / rows / migrations deleted
- No pronunciation audio files removed from storage
- No personalization data touched
- Listening flow untouched (shipped in earlier commit `85bd29b`)
- Reading flow untouched
- Vocab flow untouched

## Commit

Will be filled after `git commit`.
