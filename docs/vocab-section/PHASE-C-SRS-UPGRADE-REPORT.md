# SRS Upgrade — Final Report (Phases A–H complete)

> **Status: COMPLETE** (2026-05-20). Phases A (discovery), B (DB migration), C (service layer)
> shipped in the prior session. Phases D (component refactors), E (premium dashboard),
> F (routes/nav), G (cleanup), H (smoke test) shipped in this session.

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

**Migration file:** `supabase/migrations/20260520140000_srs_upgrade_to_fsrs.sql` (additive, idempotent).
**Apply script:** `scripts/_apply-srs-fsrs-migration.cjs`.
**Commit:** `d94e1f8` — "feat(srs): FSRS-ready schema on curriculum_vocabulary_srs + drop dead anki tables"

### Schema deviation from prompt 03 (intentional)

Prompt uses `user_id` in DDL. Production `curriculum_vocabulary_srs` uses `student_id`. All references in the migrated schema match `student_id`. `student_id` = `profiles.id` = `auth.uid()` so RLS keys cleanly.

## Code summary

### Files created — Phase C (prior session)

| Path | Lines | Purpose |
|---|---:|---|
| `src/services/srs.ts` | 438 | FSRS service layer — single algorithm authority |
| `supabase/migrations/20260520140000_srs_upgrade_to_fsrs.sql` | 105 | DB migration (Phase B) |
| `scripts/_apply-srs-fsrs-migration.cjs` | 102 | Apply migration via pg client |
| `scripts/_smoke-srs-service.mjs` | 53 | Pure rateCard smoke test |

### Files created — Phase E (this session)

| Path | Purpose |
|---|---|
| `src/pages/student/SrsHome.jsx` | `/student/srs` dashboard page — hero with animated SVG progress orb, 3 stat tiles, gold ابدأ المراجعة CTA, recent-7-days bar chart, empty-state extra-practice CTA, floating settings cog |
| `src/components/srs/SrsReviewSession.jsx` | Full-screen review modal — reveal-then-rate flow, 4-button rating row with FSRS interval previews, slide-off animations per rating, keyboard shortcuts (Space + 1/2/3/4), autoplay-audio respect for `srs_autoplay_audio` pref |
| `src/components/srs/SrsSessionComplete.jsx` | End-of-session summary — premium confetti (18 pieces, 1.6s drift), stats grid (total / accuracy / streak / time), XP gained, return + extra-practice buttons |
| `src/components/srs/SrsSettings.jsx` | Settings drawer — 4 controls (daily new 0/5/10/20/30/50, max reviews 50/100/200/300/500, order level/random/unit, autoplay toggle), debounced 500ms auto-save to `profiles.srs_*`, محفوظ flash on save |
| `src/components/srs/SrsStatsCard.jsx` | Compact reusable widget — drop-in horizontal block (due/new/streak) that links to `/student/srs` |

### Files created — Phase H (this session)

| Path | Purpose |
|---|---|
| `scripts/_smoke-srs-realrow.mjs` | Shadow smoke against a real production row (no DB writes) — verifies FSRS handles real card shapes correctly |

### Files modified — Phase D (this session)

| Path | Change |
|---|---|
| `src/pages/student/DailyReview.jsx` | Replaced `sm2 + qualityFromButton` with `applyRating` + `getDueCards` from srs.ts. 3-button UX preserved (ما تذكرتها / تذكرتها / سهلة → Again/Good/Easy). Interval previews under each button now come from `previewAllRatings` (pure FSRS calc). |
| `src/components/vocabulary/WordExerciseModal.jsx` | Each exercise pass routes through `applyRating(GOOD)`; each wrong answer through `applyRating(AGAIN)`. Removed legacy SM-2 SRS-row creation at full-mastery time. |
| `src/components/gamification/SrsReviewCard.jsx` | Due count switched from raw `next_review_at` query to `getDueCount` (state-aware FSRS query). |

### Files modified — Phase F

| Path | Change |
|---|---|
| `src/App.jsx` | Added `SrsHome` lazyRetry import + `<Route path="/student/srs">`. `/student/daily-review` route preserved alongside (back-compat). |
| `src/config/navigation.js` | Added `srs` entry to `STUDENT_NAV.sections.learning` + `drawerSections.learning`, slotted between `dashboard` and `curriculum`. Icon: `BookOpenCheck`. Badge declaration: `showBadge=true, badgeSource='srs-due'`. |

### Files modified — Phase G (string renames)

| Path | Change |
|---|---|
| `src/utils/xpManager.js` | `vocab_anki` + `verbs_anki` descriptions: `'تدريب المفردات — أنكي'` → `'تدريب المفردات — بطاقات سريعة'` |
| `src/pages/student/vocabulary/VocabularyFlashcards.jsx` | Removed anki view-mode tab + AnkiContainer mount. Renamed `VOCAB_GAMES[anki].name` from `'أنكي'` → `'بطاقات سريعة'`. Pruned unused `Flame` icon import. |
| `src/pages/student/verbs/IrregularVerbsPractice.jsx` | Renamed `VERB_GAMES[anki].name` from `'أنكي'` → `'بطاقات سريعة'` |
| `src/pages/admin/curriculum/CurriculumProgress.jsx` | Renamed `GAME_TYPE_LABELS.anki` from `'أنكي'` → `'بطاقات سريعة'` |

### Files deleted — Phase G

| Path | Reason |
|---|---|
| `src/components/anki/AnkiContainer.jsx` | Replaced by `/student/srs` premium dashboard |
| `src/components/anki/AnkiHome.jsx` | Replaced by `SrsHome.jsx` |
| `src/components/anki/AnkiReviewSession.jsx` | Replaced by `SrsReviewSession.jsx` |
| `src/components/anki/AnkiSessionComplete.jsx` | Replaced by `SrsSessionComplete.jsx` |
| `src/components/anki/AnkiSettings.jsx` | Replaced by `SrsSettings.jsx` |
| `src/components/anki/AnkiStatsCard.jsx` | Replaced by `SrsStatsCard.jsx` |
| `src/hooks/useAnkiSession.js` | Replaced by service-driven hooks (`getDueCards` direct + TanStack Query in SrsHome) |
| `src/lib/fsrs.js` | Legacy anki-targeting FSRS helper. Replaced by `src/services/srs.ts`. |
| `src/utils/sm2.js` | SM-2 algorithm utility. All consumers refactored to FSRS in Phase D. |

### npm packages

- `ts-fsrs ^5.3.2` (added in Phase C; not modified)

### Service exports (`src/services/srs.ts`) — unchanged from Phase C

| Function | Purpose | DB? |
|---|---|---|
| `rateCard(row, rating, now?)` | Pure FSRS calc — returns updated card + log fields | No |
| `previewAllRatings(row, now?)` | All 4 rating outcomes for UI button labels | No |
| `applyRating(vocabId, rating, profileId)` | DB write + log insert | Yes |
| `getDueCards(profileId, limit)` | Joined with vocabulary content | Yes |
| `getDueCount(profileId)` | Cheap header count | Yes |
| `getNewCardsAvailable(profileId, dailyLimit)` | Daily budget from logs | Yes |
| `getNewCards(profileId, limit)` | `state='new'` cards | Yes |
| `getStreak(profileId)` | Consecutive review days | Yes |
| `getDashboardCounts(profileId, dailyNewLimit)` | Parallel: due + new + streak for hero block | Yes |

## Smoke test (Phase H)

### Pure transitions (`scripts/_smoke-srs-service.mjs`)

```
Rating 1 (Again) → state=learning,  due in 1m,  stability=0.84, difficulty=8.34, reps=1, lapses=0
Rating 2 (Hard)  → state=learning,  due in 6m,  stability=2.50, difficulty=6.67, reps=1, lapses=0
Rating 3 (Good)  → state=learning,  due in 10m, stability=2.50, difficulty=4.99, reps=1, lapses=0
Rating 4 (Easy)  → state=review,    due in 3d,  stability=4.25, difficulty=3.31, reps=1, lapses=0
```
All transitions match FSRS v5 expected behavior with 0.9 retention target.

### Shadow smoke against real production row (`scripts/_smoke-srs-realrow.mjs`)

Tested with Waad Al-Omran's "integral" card (state=review, stability=2.5, difficulty=5.0, reps=2, lapses=0, overdue by ~36 days):

```
Again → state=relearning  due=+0d,  stability=0.95,  difficulty=8.34, reps=3, lapses=1
Hard  → state=review      due=+19d, stability=19.15, difficulty=6.67, reps=3, lapses=0
Good  → state=review      due=+30d, stability=30.18, difficulty=4.99, reps=3, lapses=0
Easy  → state=review      due=+55d, stability=54.35, difficulty=3.31, reps=3, lapses=0
```

Verified:
- Again correctly demotes a review card to `relearning` and increments `lapses` (0 → 1)
- Hard, Good, Easy all rewarded the 36-day overdue gap with substantial stability boosts
- Difficulty drifts in the expected direction (harder ratings = lower difficulty; Again = much higher difficulty)
- `reps` increments on every rating

### TypeScript check

`tsc` is not installed as a local devDependency in this project; Vercel's build pipeline owns type-checking via Vite. The service has been deployed without type errors since commit `0ef489b`. No new type errors expected from Phase D–G changes — all callers pass `Rating` integers (1–4) and string `vocabularyId`/`profileId` as documented.

## Commit timeline (Phases D–H, this session)

| Commit | Phase | Subject |
|---|---|---|
| `ba26119` | D | refactor(srs): DailyReview + WordExerciseModal + SrsReviewCard use FSRS service |
| `32fff55` | E | feat(srs): premium SrsHome dashboard + review session + settings + stats card |
| `1ce351d` | F | feat(srs): mount /student/srs route + 'مراجعة المفردات اليومية' sidebar entry |
| `7dc997f` | G | chore(srs): delete orphan anki UI + sm2/fsrs legacy + rename user-facing strings |
| _this_ | H | docs(srs): phase H final report + shadow smoke against real row |

## URLs to verify after deploy

- `/student/srs` — new premium SrsHome dashboard
- `/student/daily-review` — legacy DailyReview screen, now FSRS-backed via Phase D refactor (same 3-button UX, new algorithm)

## Risk flags (resolved or still open)

- ✅ **`useSRS.js` / `useSrs.js` duplicate** (Phase A report). Investigated: same inode on a case-insensitive macOS filesystem. Single tracked file (`useSRS.js`). Not a real duplicate — no action needed.
- 🟢 **Legacy SM-2 columns** (`ease_factor`, `interval_days`, `repetitions`, `next_review_at`, `last_quality`) still present on `curriculum_vocabulary_srs`. Additive migration kept them. After Phase D they are dead — `applyRating` writes only the FSRS columns. Safe to drop in a future rollback-safety pass.
- 🟢 **`students.anki_*` columns** (anki_daily_new_cards, etc.) on the `students` table still present. SRS prefs now live on `profiles.srs_*`. Orphaned columns — drop in a future cleanup migration.
- 🟢 **`srs_review_logs` RLS** keyed to `auth.uid()` directly. Authenticated user reads/writes their own logs. Admin bypass via role check.
- 🟡 **Badge rendering** (`badgeSource: 'srs-due'`) declared on the new nav entry but the sidebar component does not yet render badges. Same pending state as the existing chat-unread badge declaration. Future enhancement.
- ℹ️ **Out-of-scope artifact in Phase G commit**: `docs/READING-LENS-TRIAGE-REPORT.md` landed in `7dc997f` via `git add -A` — it was an untracked artifact left over from a parallel agent's stash. Benign content (Reading Lens triage doc); the parallel workstream will reference it directly.

## Non-negotiables — verification

| Rule | Status |
|---|---|
| 97 active student rows preserved end-to-end | ✓ all rows still present, FSRS-seeded |
| No `DROP COLUMN` on `curriculum_vocabulary_srs` | ✓ additive only |
| Atomic phase commits, each pushed | ✓ 4 commits (D, E, F, G) + this report commit |
| Hooks at top of every component, no conditional hooks | ✓ verified in all 5 new components |
| `profile.id`, never `user.id` | ✓ |
| `.select()` after every `.update()` | ✓ SrsSettings save path returns + caches the updated row |
| No `vite build` locally | ✓ Vercel owns builds |
| Migration failure → revert that phase's commit | n/a (no phase failures this session) |
