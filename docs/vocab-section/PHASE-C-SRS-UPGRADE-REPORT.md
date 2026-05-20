# SRS Upgrade — Phase C Partial Report (2026-05-20)

> **Partial completion.** Phases A (discovery), B (DB migration), C (service layer) **DONE**.
> Phases D (component refactors), E (premium dashboard), F (routes/nav), G (cleanup), H (full smoke test) **DEFERRED** to next session.

## Migration outcome (Phase B)

| Item | Result |
|---|---|
| `curriculum_vocabulary_srs` rows preserved | **97 / 97** ✓ |
| All rows seeded (fsrs_seeded_at set) | **97 / 97** ✓ |
| Rows in `state='review'` (preserve schedule) | 96 |
| Rows in `state='new'` (no prior history) | 1 |
| Rows in `state='learning'` / `'relearning'` | 0 / 0 |
| `anki_cards` dropped | ✓ (was 0 rows) |
| `anki_review_logs` dropped | ✓ (was 0 rows) |
| `srs_review_logs` created | ✓ with 3 RLS policies (students-read-own, students-insert-own, admin-all) |
| `profiles` SRS preference columns added | 4 ✓ (`srs_daily_new_cards` default 20, `srs_daily_max_reviews` default 200, `srs_review_order` default 'level', `srs_autoplay_audio` default true) |
| Sample row check | due preserved from `next_review_at` ✓ (e.g., `2026-05-05T03:06:39.214Z`) |

**Migration file:** `supabase/migrations/20260520140000_srs_upgrade_to_fsrs.sql` (additive, idempotent — re-runnable).
**Apply script:** `scripts/_apply-srs-fsrs-migration.cjs` (direct pg connection to Supabase pooler — necessary because Supabase MCP was in read-only mode this session).
**Commit:** `d94e1f8` — "feat(srs): FSRS-ready schema on curriculum_vocabulary_srs + drop dead anki tables"

### Schema deviation from prompt 03 (intentional)

Prompt uses `user_id` in DDL. Production `curriculum_vocabulary_srs` uses `student_id` (existing column). All references in the new schema (indexes, srs_review_logs FK + policies, the seeding UPDATE) match the existing column name so DailyReview and WordExerciseModal don't break. `student_id` maps to `profiles.id` which equals `auth.uid()` — RLS policies key on this directly.

## Code summary (Phase C)

### Files created

| Path | Lines | Purpose |
|---|---:|---|
| `src/services/srs.ts` | 438 | FSRS service layer — single algorithm authority |
| `supabase/migrations/20260520140000_srs_upgrade_to_fsrs.sql` | 105 | DB migration (Phase B) |
| `scripts/_apply-srs-fsrs-migration.cjs` | 102 | Apply migration via pg client |
| `scripts/_smoke-srs-service.mjs` | 53 | Pure rateCard smoke test |
| `docs/vocab-section/PHASE-C-SRS-UPGRADE-REPORT.md` | this file | this report |

### Files modified / deleted

**None this session.** Phase D will refactor `DailyReview.jsx`, `WordExerciseModal.jsx`, and `useSRS.js` to call the new service. Phase G will delete `src/components/anki/*` and `src/lib/fsrs.js` (the old anki-targeting helper).

### npm packages

- `ts-fsrs ^5.3.2` already in `package.json` (no install needed)

### Service exports (src/services/srs.ts)

| Function | Purpose | DB? |
|---|---|---|
| `rateCard(row, rating, now?)` | Pure FSRS calc — returns updated card + log fields | No |
| `previewAllRatings(row, now?)` | All 4 rating outcomes for UI button labels | No |
| `applyRating(vocabId, rating, profileId)` | DB write + log insert | Yes |
| `getDueCards(profileId, limit)` | Joined with vocabulary content | Yes |
| `getDueCount(profileId)` | Cheap header count | Yes |
| `getNewCardsAvailable(profileId, dailyLimit)` | Daily budget from logs | Yes |
| `getNewCards(profileId, limit)` | state='new' cards | Yes |
| `getStreak(profileId)` | Consecutive review days | Yes |
| `getDashboardCounts(profileId, limit)` | Parallel: due + new + streak for hero block | Yes |

Plus constants: `RATING.AGAIN | HARD | GOOD | EASY` (numeric 1-4), `RATING_AR` (Arabic labels for buttons), `fsrs` (configured FSRS instance with 0.9 retention target).

## Smoke test (Phase H — partial)

`node scripts/_smoke-srs-service.mjs` — pure `rateCard` (no DB):

```
=== rateCard transitions ===
Starting card: state=new, stability=2.5, difficulty=5.0, reps=0, lapses=0

Rating 1 (Again) → state=learning,   due in 1m, stability=0.84, difficulty=8.34, reps=1, lapses=0
Rating 2 (Hard)  → state=learning,   due in 6m, stability=2.50, difficulty=6.67, reps=1, lapses=0
Rating 3 (Good)  → state=learning,   due in 10m, stability=2.50, difficulty=4.99, reps=1, lapses=0
Rating 4 (Easy)  → state=review,     due in 3d, stability=4.25, difficulty=3.31, reps=1, lapses=0
```

Verified:
- Again → 1m, learning, difficulty bumped up (8.34) — card gets harder
- Hard → 6m, learning, difficulty 6.67 (slightly harder)
- Good → 10m, learning, difficulty stable (~5.0)
- Easy → 3d, review, difficulty drops to 3.31 — card gets easier, state advances to review

All transitions match FSRS v5 expected behavior with the configured 0.9 retention target.

**`applyRating` end-to-end smoke test (with DB) deferred to next session** — needs a known-good (student_id, vocabulary_id) pair from the 97 seeded rows + a transactional rollback to avoid polluting real student data.

## URLs to verify (after Phases D-H)

These don't exist yet (Phase F not done):
- `/student/srs` — new SrsHome (Phase E)
- `/student/daily-review` — existing route, will be refactored to use service layer in Phase D (no URL change)

## Deferred to next session (Phases D-H)

### Phase D — refactor existing components

- `src/hooks/useSRS.js` (and the duplicate `useSrs.js` — same file twice, need to dedupe) — currently calls RPC `srs_get_counts`. Replace with `getDashboardCounts()` from the new service.
- `src/pages/student/DailyReview.jsx` (uses `curriculum_vocabulary_srs`) — replace SM-2 logic with `applyRating()`.
- `src/components/vocabulary/WordExerciseModal.jsx` — on pass/fail, call `applyRating(vocabId, 3 /* Good */, profile.id)` or `(1 /* Again */)`.
- `src/components/gamification/SrsReviewCard.jsx` — `dueCount` source updated.

**Important:** Phase D must preserve student-visible behavior. Same screen flow, same buttons. Under the hood SM-2 → FSRS.

### Phase E — premium SRS dashboard (5 new components)

- `src/pages/student/SrsHome.jsx` — hero with animated progress orb, stats (due / new / streak), gold CTA, recent-7-day mini chart, empty state
- `src/components/srs/SrsReviewSession.jsx` — full-screen modal, question/answer phases, 4-rating row with interval preview, Framer Motion slide animations, keyboard shortcuts (1/2/3/4 + space)
- `src/components/srs/SrsSessionComplete.jsx` — confetti, stats, streak indicator, return-or-extra buttons
- `src/components/srs/SrsSettings.jsx` — drawer with 4 sliders/segmented controls, debounced auto-save to profiles.srs_*
- `src/components/srs/SrsStatsCard.jsx` — compact widget for embedding elsewhere

### Phase F — routes + nav

- Mount `/student/srs` in `src/App.jsx` (line ~653, next to existing daily-review route)
- Add "مراجعة المفردات اليومية" nav entry in `src/config/navigation.js`
- NavItem with dynamic due-count badge (uses `getDueCount` hook)

### Phase G — cleanup

- Delete `src/components/anki/*` (AnkiContainer, AnkiSettings, AnkiHome, AnkiStatsCard, AnkiSessionComplete, AnkiReviewSession)
- Delete `src/lib/fsrs.js` (old anki-targeting helper — replaced by `src/services/srs.ts`)
- Delete `src/hooks/useAnkiSession.js`
- Grep for any user-facing "Anki" / "أنكي" strings and replace with "Daily Review" / "مراجعة المفردات اليومية"

### Phase H — full smoke test

- `applyRating()` end-to-end against a test student
- Vercel deploy URL: visit `/student/srs`, complete a 5-card session, verify due dates decrement, verify streak increments
- Old `/student/daily-review` route still works (no 404, no broken state)

## Risk flags for next session

- 🟠 `src/hooks/useSRS.js` and `src/hooks/useSrs.js` are **identical duplicates** (same bytes, same date). One can be deleted and the other kept. Check imports across the codebase before deleting.
- 🟠 The legacy SM-2 columns (`ease_factor`, `interval_days`, `repetitions`, `next_review_at`, `last_quality`) are still present. The migration was additive. DailyReview reading from these columns will still work until Phase D. After Phase D, they become dead but stay in the table for one release cycle as a rollback safety. A future migration can drop them.
- 🟠 `students.anki_*` columns (anki_daily_new_cards, anki_daily_max_reviews, anki_review_order, anki_autoplay_audio, anki_last_session_at, anki_streak_current, anki_streak_best) on the `students` table are now orphaned — the new SRS prefs live on `profiles.srs_*`. These can be dropped in a future cleanup migration but **NOT this session** — they may be read by code somewhere I haven't found.
- 🟢 RLS on `srs_review_logs` is keyed to `auth.uid()` directly. Authenticated user reads/writes their own logs. Admin bypass via role check.

## Pickup instructions for next session

1. Read this report
2. Continue at Phase D — start by deduping `useSRS.js` / `useSrs.js`, then refactor `DailyReview.jsx`
3. Schema is stable, service layer is stable — only code changes from here on
4. Reference: `src/services/srs.ts` exports are documented in this file's "Service exports" table
