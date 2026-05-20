# SRS Frontend (Phases D–H) — Final Report

> **Status: COMPLETE** (2026-05-20). All of Prompt 03B shipped.
>
> Phases A-C were prerequisites from Prompt 03 (foundation in
> `PHASE-C-SRS-UPGRADE-REPORT.md`). Phases D-H from Prompt 03B
> were largely completed in an earlier parallel session today; this
> session verified that work and closed the one remaining gap
> (the useSRS.js → useSrs.js case rename).

---

## Verification of prior work (done before this session)

Confirmed live on `main` (commits `ba26119` → `1940257`):

| Phase | Commit | Status |
|---|---|---|
| D — Refactor existing components | `ba26119` | ✅ DailyReview + WordExerciseModal + SrsReviewCard call srs.ts |
| E — Premium components (5 new) | `32fff55` | ✅ SrsHome (356L), SrsReviewSession (400L), SrsSessionComplete (163L), SrsSettings (282L), SrsStatsCard (111L) |
| F — Route + nav | `1ce351d` | ✅ `/student/srs` mounted (`App.jsx:655`), nav entry "مراجعة المفردات اليومية" with `BookOpenCheck` icon + `srs-due` badge in 2 places (main + drawer) |
| G — Cleanup | `7dc997f` | ✅ `src/components/anki/*`, `src/lib/fsrs.js`, `src/utils/sm2.js`, `src/hooks/useAnkiSession.js` all deleted. 0 imports left to deleted paths. |
| H — Smoke + report | `1940257` | ✅ Pure rateCard smoke + shadow smoke against real production row |

**Broken-import scan:** 0 hits for `from.*components/anki`, `from.*lib/fsrs`, `from.*useAnkiSession`, `from.*utils/sm2`. Clean.

## Outstanding gap closed this session

Phase D.1 directive: "Pick canonical name: `useSrs.js` (camelCase per project convention). Update all imports across `src/` to use the canonical file."

State on entry:
- File tracked in git as `src/hooks/useSRS.js` (uppercase)
- 2 consumers imported via `'../hooks/useSRS'`
- On macOS case-insensitive FS, both `useSRS.js` and `useSrs.js` resolved to the same physical file — masking the inconsistency
- On Linux deploy (Vercel, case-sensitive), any future drift would break

**This session's commits:**

| Commit | Change |
|---|---|
| `c68f3a7` | Renamed `src/hooks/useSRS.js` → `src/hooks/useSrs.js` via 2-step `git mv` (through `_useSrs_tmp.js`) so git records the case-change rename even on a case-insensitive FS |
| `b0a8555` | Updated 2 consumer imports: `PersonalDictionaryWidget.jsx`, `VocabularyTab.jsx`, both now `from '../../../hooks/useSrs'` and `'../../../../hooks/useSrs'` |

**Hook internals deliberately unchanged.** `useSRSCounts` / `useSRSDue` still call Postgres RPCs `srs_get_counts` / `srs_get_due` — a separate data path from `src/services/srs.ts`. Both coexist:
- `srs.ts` powers the new `/student/srs` premium dashboard + new components
- `useSrs.js` powers the legacy `PersonalDictionaryWidget` + `VocabularyTab` SRS due-section

Refactoring `useSrs.js` to delegate to `srs.ts` is a follow-up that adds no functional difference today and risks breaking 2 live consumers. Deferred.

## Files inventory (cumulative from Prompts 03 + 03B)

### Files created — Phase C (Prompt 03, prior session)

| Path | Lines | Purpose |
|---|---:|---|
| `src/services/srs.ts` | 438 | FSRS service layer — single algorithm authority |
| `supabase/migrations/20260520140000_srs_upgrade_to_fsrs.sql` | 105 | DB migration |
| `scripts/_apply-srs-fsrs-migration.cjs` | 102 | Apply migration via pg client |
| `scripts/_smoke-srs-service.mjs` | 53 | Pure rateCard smoke test |

### Files created — Phase E (Prompt 03B, prior session today)

| Path | Lines | Purpose |
|---|---:|---|
| `src/pages/student/SrsHome.jsx` | 356 | `/student/srs` dashboard page |
| `src/components/srs/SrsReviewSession.jsx` | 400 | Full-screen review modal w/ reveal-then-rate + keyboard shortcuts |
| `src/components/srs/SrsSessionComplete.jsx` | 163 | Confetti, stats grid, return + extra-practice buttons |
| `src/components/srs/SrsSettings.jsx` | 282 | Settings drawer w/ debounced auto-save |
| `src/components/srs/SrsStatsCard.jsx` | 111 | Compact reusable widget |

### Files created — Phase H (Prompt 03B, prior session today)

| Path | Purpose |
|---|---|
| `scripts/_smoke-srs-realrow.mjs` | Shadow smoke against a real production row (no DB writes) |

### Files modified — Phase D (Prompt 03B, mostly prior, finalized this session)

| Path | Change |
|---|---|
| `src/pages/student/DailyReview.jsx` | SM-2 → FSRS via `applyRating` + `getDueCards`. 3-button UX preserved (ما تذكرتها / تذكرتها / سهلة → Again/Good/Easy). Interval previews via `previewAllRatings`. |
| `src/components/vocabulary/WordExerciseModal.jsx` | Pass → `applyRating(GOOD)`, wrong → `applyRating(AGAIN)`. Legacy SM-2 SRS-row creation removed. |
| `src/components/gamification/SrsReviewCard.jsx` | Due count from `getDueCount` (state-aware) instead of raw `next_review_at` query. |
| `src/hooks/useSrs.js` | **Renamed from useSRS.js** (case-rename via 2-step git mv this session) |
| `src/components/student/dashboard/PersonalDictionaryWidget.jsx` | **Import path updated** to `useSrs` (this session) |
| `src/pages/student/curriculum/tabs/VocabularyTab.jsx` | **Import path updated** to `useSrs` (this session) |

### Files modified — Phase F

| Path | Change |
|---|---|
| `src/App.jsx` | Added `SrsHome` lazyRetry import (line 70) + `<Route path="/student/srs">` (line 655). `/student/daily-review` preserved. |
| `src/config/navigation.js` | Added `srs` entry to `STUDENT_NAV.sections.learning` + `drawerSections.learning`. Icon `BookOpenCheck`. `showBadge=true, badgeSource='srs-due'`. |

### Files modified — Phase G (string renames)

| Path | Change |
|---|---|
| `src/utils/xpManager.js` | `vocab_anki` + `verbs_anki` descriptions: `'تدريب المفردات — أنكي'` → `'تدريب المفردات — بطاقات سريعة'` |
| `src/pages/student/vocabulary/VocabularyFlashcards.jsx` | Removed anki view-mode + AnkiContainer mount. `VOCAB_GAMES[anki].name`: `'أنكي'` → `'بطاقات سريعة'`. Pruned unused `Flame` icon import. |
| `src/pages/student/verbs/IrregularVerbsPractice.jsx` | `VERB_GAMES[anki].name`: `'أنكي'` → `'بطاقات سريعة'` |
| `src/pages/admin/curriculum/CurriculumProgress.jsx` | `GAME_TYPE_LABELS.anki`: `'أنكي'` → `'بطاقات سريعة'` |

### Files deleted — Phase G

| Path | Reason |
|---|---|
| `src/components/anki/AnkiContainer.jsx` | Replaced by `/student/srs` premium dashboard |
| `src/components/anki/AnkiHome.jsx` | Replaced by `SrsHome.jsx` |
| `src/components/anki/AnkiReviewSession.jsx` | Replaced by `SrsReviewSession.jsx` |
| `src/components/anki/AnkiSessionComplete.jsx` | Replaced by `SrsSessionComplete.jsx` |
| `src/components/anki/AnkiSettings.jsx` | Replaced by `SrsSettings.jsx` |
| `src/components/anki/AnkiStatsCard.jsx` | Replaced by `SrsStatsCard.jsx` |
| `src/hooks/useAnkiSession.js` | Replaced by service-driven hooks in SrsHome |
| `src/lib/fsrs.js` | Legacy anki-targeting FSRS helper. Replaced by `src/services/srs.ts`. |
| `src/utils/sm2.js` | SM-2 algorithm utility. All consumers refactored to FSRS in Phase D. |

(`src/hooks/useSRS.js` renamed to `useSrs.js` — not deleted; same file via git mv.)

## Smoke tests

### Pure FSRS transitions — `scripts/_smoke-srs-service.mjs`

```
Rating 1 (Again) → state=learning,  due in 1m,  stability=0.84, difficulty=8.34, reps=1, lapses=0
Rating 2 (Hard)  → state=learning,  due in 6m,  stability=2.50, difficulty=6.67, reps=1, lapses=0
Rating 3 (Good)  → state=learning,  due in 10m, stability=2.50, difficulty=4.99, reps=1, lapses=0
Rating 4 (Easy)  → state=review,    due in 3d,  stability=4.25, difficulty=3.31, reps=1, lapses=0
```

### Shadow smoke against real production row — `scripts/_smoke-srs-realrow.mjs`

(Ran in prior session — see `PHASE-C-SRS-UPGRADE-REPORT.md` for full output.)
Verified FSRS handles a real card from the 97 production rows without DB writes. State + due transitions matched expected behavior.

### Static verification (this session)

```bash
$ grep -rln "from.*components/anki" src/  → 0 hits
$ grep -rln "from.*lib/fsrs" src/         → 0 hits
$ grep -rln "from.*useAnkiSession" src/   → 0 hits
$ grep -rln "from.*utils/sm2" src/        → 0 hits
$ grep -rln "hooks/useSRS\b" src/         → 0 hits
$ git ls-files src/hooks/ | grep -i srs   → src/hooks/useSrs.js (canonical)
```

All broken imports cleared. The canonical `useSrs.js` is the only SRS hook file tracked in git.

## URLs to verify on next Vercel deploy

- `/student/srs` — new SrsHome dashboard (lazyRetry import, premium hero + 3 stats + 7-day chart + settings cog)
- `/student/daily-review` — legacy route, still works (refactored to use srs.ts under the hood)
- Sidebar — "مراجعة المفردات اليومية" entry visible to students, between dashboard and curriculum
- After this commit, Linux Vercel build will resolve `useSrs.js` correctly (was working before via case-insensitive macOS quirk; now correctly tracked in git as lowercase-s)

## Deferred / known gaps

- 🟡 **Legacy SM-2 columns** still present on `curriculum_vocabulary_srs` (`ease_factor`, `interval_days`, `repetitions`, `next_review_at`, `last_quality`). They're orphaned now that FSRS columns carry all scheduling. Safe to drop in a future cleanup migration after one release cycle of rollback safety.
- 🟡 **`students.anki_*` columns** (anki_daily_new_cards, anki_daily_max_reviews, anki_review_order, anki_autoplay_audio, anki_last_session_at, anki_streak_current, anki_streak_best) on the `students` table — the new SRS prefs live on `profiles.srs_*`. The students columns are orphaned but kept in case any unaudited code path reads them. Future cleanup.
- 🟡 **`useSrs.js` internal refactor** to call `src/services/srs.ts` instead of its own RPC queries. Functional behavior identical today; the dual path adds no bugs but is a minor architectural inconsistency. Single-source-of-truth follow-up.
- 🟢 **No outstanding blockers.** SRS upgrade is functionally complete and live on `main`.

## Commits this session

| Commit | Subject |
|---|---|
| `c68f3a7` | chore(srs): dedupe useSRS.js → useSrs.js (canonical camelCase per prompt 03B) |
| `b0a8555` | chore(srs): update 2 consumer imports from useSRS → useSrs (case-sensitive Linux fix) |
| `<this report>` | docs(srs): phase D report — final closure of prompt 03B |
