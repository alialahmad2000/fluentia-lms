# Dashboard V2 Trainer Letter — Phase C Verification (2026-05-31)

Built net-new (07 v1 never existed). The prompt's `assembleStudentDay` spec was
"deferred to the missing original 07" — resolved by **mirroring the production
`useStudentDashboard` hook** (same tables/columns) so the letter's facts always
agree with the dashboard. Live schema differed from the prompt's assumption:
`students` has **no `name_ar`** — the name comes from `profiles.display_name ||
full_name` (students.id = profiles.id). Adjusted accordingly.

## Verification checklist

| Check | Result |
|---|---|
| `students.gender` column exists with 'male'/'female' constraint | ✅ added (CHECK, default 'female') |
| `students.assigned_trainer_id` column exists referencing profiles | ✅ added (uuid → profiles, ON DELETE SET NULL) |
| علي سعيد القحطاني `gender = 'male'` | ✅ `1148c3bd-…831e830` → male |
| عبدالرحمن الشمري `gender = 'male'` | ✅ `730b4e93-…bbebcd1` → male |
| Male letter spot-check: masculine forms only (no ابدئي/أتيتِ/أراكِ) | ✅ both male letters: أنتَ/بدأتَ/أمامكَ/اختر/أنهِه — clean |
| Female letter spot-check: feminine forms only | ✅ راجعي/ابدئي/أنتِ/تحتاجين/عودي — clean |
| **Automated cross-gender scan over ALL 25 letters** | ✅ **0 leakage** (2 male, 23 female) |
| LetterActionFooter button labels match student gender | ✅ `getActionLabel(action, gender)` — انضمّ/انضمّي, راجع/راجعي, اكتشف/اكتشفي |
| Optimistic template works for both genders | ✅ intentionally neutral phrasing |
| daily_letters.gender + trainer_id populated | ✅ all rows carry gender; trainer_id NULL (none assigned) |
| Signature for student WITHOUT assigned_trainer | ✅ all = "— د. محمد" |
| Signature for student WITH assigned_trainer | n/a — no trainers assigned yet (resolves `profiles.display_name||full_name`; code path tested via fallback) |
| Edge function deployed | ✅ `generate-daily-letters` (index.ts + gender.ts) |
| Cron registered, **disabled** | ✅ `0 2 * * *`, `active = false` (Ali enables) |
| Frontend builds | ✅ `vite build` clean (10s) |
| Production route untouched | ✅ letter only renders on `?design=v2` (CinematicDashboard); default `/student` = OriginalDashboard |

## First run (manual invoke, 2026-05-31)
`generated_total=25 · male=2 · female=23 · via_claude=25 · via_fallback=0 ·
errors=0 · 33,192 in / 5,077 out tokens (~$0.06)`. Model `claude-haiku-4-5-20251001`.

## Honest limitations / notes
- **Trainer assignment** is NULL for everyone by design — all letters sign as
  "د. محمد" until Ali populates `students.assigned_trainer_id` (deferred to a
  separate admin-UI prompt). The dynamic-signature code path is implemented and
  resolves the trainer's name; it just has no assigned trainers to exercise yet.
- **`has_class_today`** is computed truthfully from `groups.schedule.days`
  (jsonb `{days:[…], time, timezone}`) matched against today's Riyadh weekday —
  no fabricated class claims.
- **`level_percent`** mirrors the dashboard's existing `xp_total % 500 / 500`
  heuristic so the letter and dashboard never disagree (it is approximate, by
  design, same as what students already see).
- **NULL-gender guard**: a NULL-gender student would get a gender-neutral
  template fallback (never a guessed-gender Claude letter) + `skipped_no_gender`
  counter. The B.0 default ('female') means there are currently no NULLs.
- **Admin widget (B.5)**: there was no pre-existing letters admin table to add a
  column to, so the male/female split is surfaced via a new `DailyLettersPanel`
  mounted on `/admin/retention` (+ stored in `daily_letters_runs.generated_male/
  female` and returned in the edge-function response).
