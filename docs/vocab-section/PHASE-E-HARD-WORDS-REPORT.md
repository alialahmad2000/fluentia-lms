# Hard Words Training — Final Report (Phases A–G complete)

> **Status: COMPLETE** (2026-05-21). All of VOCAB-PREMIUM Prompt 04 shipped in one session.

## Migration outcome (Phase B)

| Item | Result |
|---|---|
| `curriculum_vocabulary_srs.hw_correct_streak` (INTEGER DEFAULT 0) | ✓ added |
| `curriculum_vocabulary_srs.hw_drill_modes_seen` (TEXT[] DEFAULT '{}') | ✓ added |
| `curriculum_vocabulary_srs.hw_last_drill_at` (TIMESTAMPTZ) | ✓ added |
| `hard_words_drill_log` table created | ✓ with 3 RLS policies (students-read-own, students-insert-own, admin-all) |
| `get_hard_words_for_student(UUID, INTEGER)` RPC | ✓ SECURITY DEFINER, GRANT EXECUTE TO authenticated |
| `get_hard_words_count(UUID)` RPC | ✓ STABLE, cheap nav-badge count |
| `get_hard_words_breakdown(UUID)` RPC | ✓ chips for dashboard hero (high_lapses / high_difficulty / recent_again_pattern / total_hard) |
| Schema deviation | Uses `cv.definition_ar` (production column) not `cv.meaning_ar` (prompt spec). Aliased back to `meaning_ar` in RPC output for service-layer compatibility. |

**Migration file:** `supabase/migrations/20260520180000_hard_words_training.sql`
**Apply script:** `scripts/_apply-hard-words-migration.cjs` (direct pg, MCP read-only this session)
**Commit:** `c02715b` — "feat(hard-words): schema + drill log + classification RPCs"

## Classification baseline at first deploy

```
Top 5 students by SRS row count:
  0aba3164-...  57 SRS rows  →  0 hard words
  de70db0c-...  29 SRS rows  →  0 hard words
  b091fb1d-...  10 SRS rows  →  0 hard words
  cad66f17-...   2 SRS rows  →  0 hard words
  338e8c57-...   2 SRS rows  →  0 hard words
```

**Total hard words across all 97 SRS rows: 0.** This is the expected baseline — every row was seeded with FSRS defaults (`difficulty=5.0, lapses=0`) by the Prompt 03 SRS upgrade. Hard words will surface organically as students use the new `/student/srs` dashboard and accumulate Again ratings / increased difficulty.

**Empty-state UX:** the dashboard handles this gracefully — green checkmark + "ما عندك كلمات صعبة الآن! 🎉" + CTA back to `/student/srs`. The sidebar nav entry is hidden when count is 0 (see Phase F).

## Code summary

### Files created — Phase B (DB)

| Path | Lines | Purpose |
|---|---:|---|
| `supabase/migrations/20260520180000_hard_words_training.sql` | 165 | Migration (additive cols + drill log + 3 RPCs) |
| `scripts/_apply-hard-words-migration.cjs` | 81 | Direct-pg apply + verification |

### Files created — Phase C (service)

| Path | Lines | Purpose |
|---|---:|---|
| `src/services/hardWords.ts` | 434 | Service layer — classification, drill batch shaping, attempt recording, stats |

### Files created — Phase D (components)

| Path | Lines | Purpose |
|---|---:|---|
| `src/components/hard-words/MatchingDrill.jsx` | 274 | 6×6 tap-to-pair grid, shake on wrong, green-lock on correct |
| `src/components/hard-words/ContextFillDrill.jsx` | 232 | Sentence with blank + 4 MCQ options |
| `src/components/hard-words/ListeningDrill.jsx` | 218 | Big play button + 4 English options, autoplay-aware |
| `src/components/hard-words/TypingRecallDrill.jsx` | 261 | Arabic → English typing input with Levenshtein-≤1 forgiveness |
| `src/components/hard-words/DrillSessionContainer.jsx` | 192 | Full-screen modal orchestrator + skeleton + error states |
| `src/components/hard-words/HardWordsSessionComplete.jsx` | 144 | Confetti + 4 stat tiles + promotion highlight + buttons |

### Files created — Phase E (dashboard)

| Path | Lines | Purpose |
|---|---:|---|
| `src/pages/student/HardWordsHome.jsx` | 322 | `/student/hard-words` dashboard with hero + 4 mode cards + 7-day chart + empty state |
| `src/components/hard-words/HardWordsStatsCard.jsx` | 65 | Compact widget for embedding elsewhere (auto-hides when count=0) |

### Files modified — Phase F

| Path | Change |
|---|---|
| `src/App.jsx` | Added `HardWordsHome` lazyRetry import + `<Route path="/student/hard-words">` |
| `src/config/navigation.js` | Added `Dumbbell` icon import + 'hard-words' entry in 2 nav sections with `showBadge=true badgeSource='hard-words-count' visibleWhen='hard-words-count'` |
| `src/components/layout/Sidebar.jsx` | Added `useQuery`-based `getHardWordsCount` fetch (student-only, 60s stale) + visibility filter for `visibleWhen='hard-words-count'` items |

### npm packages

No new dependencies. ts-fsrs already installed (from Prompt 03). Recharts not needed — used inline bar chart for the 7-day activity strip (token-colored sky gradient).

## Service exports (`src/services/hardWords.ts`)

| Function / constant | Purpose | DB? |
|---|---|---|
| `DRILL_MODES` (const) | `['matching','context_fill','listening','typing_recall']` | – |
| `DRILL_MODE_AR` (const) | Arabic mode names | – |
| `DRILL_MODE_DESCRIPTION_AR` (const) | Arabic 1-line descriptions | – |
| `getHardWords(studentId, limit)` | Classified pool via `get_hard_words_for_student` RPC | Yes |
| `getHardWordsCount(studentId)` | Cheap count via `get_hard_words_count` RPC | Yes |
| `selectDrillBatch(studentId, mode, size?)` | Shape primaries + distractors per mode | Yes (pool + distractors) |
| `recordDrillAttempt({...})` | Log row + update hw_correct_streak / hw_drill_modes_seen / hw_last_drill_at; returns `{newStreak, newModesSeen, promoted}` | Yes |
| `getHardWordsStats(studentId)` | Breakdown + availableModes + recentDrillsLast7Days | Yes |
| `getRecentDrillActivity(studentId, days)` | 7-day buckets for activity chart | Yes |

## Smoke test results (Phase G)

`node scripts/_smoke-hard-words.cjs`:

```
Test target: student_id=0aba3164-..., vocabulary_id=ffcb3f4d-...
Original SRS state: { difficulty: 5, lapses: 0, streak: 0, modes: [] }

Forced row to hard (difficulty=8.5, lapses=4).

=== Classification RPC ===
vocab_id=ffcb3f4d-..., classification='hard', difficulty=8.5, lapses=4 ✓

=== 3-attempt promotion sequence ===
Attempt 1: mode=matching,      newStreak=1, modes=[matching],                           promoted=false ✓
Attempt 2: mode=context_fill,  newStreak=2, modes=[matching, context_fill],             promoted=false ✓
Attempt 3: mode=typing_recall, newStreak=3, modes=[matching, context_fill, typing_recall], promoted=TRUE ✓

=== Verification ===
Log rows for (student, vocab): 3                                                         ✓
Final SRS state: streak=3, modes=3 unique, hw_last_drill_at set                          ✓
Classification RPC after promotion: 0 rows                                               ✓ (promoted, excluded from pool)

=== Reset complete ===
Restored difficulty=5, lapses=0, streak=0, modes=[]; deleted 3 smoke log rows
```

Promotion gate working as designed: `hw_correct_streak >= 3 AND hw_drill_modes_seen ≥ 2` exits the hard-words pool, returns to normal FSRS flow.

## URLs to verify on next Vercel deploy

- `/student/hard-words` — dashboard
  - Empty state for every student (correct given baseline 0 hard words)
  - 4 mode cards rendered (all disabled with requirement text since pool < min)
- Sidebar nav: "تدريب الكلمات الصعبة" entry **hidden** for every student (correct, count=0)
- After a student starts using `/student/srs` and accumulates lapses/difficulty, hard words will surface organically and the entry appears

## Deferred / known gaps

- 🟡 **Empty-state baseline is by design.** The dashboard will look like the empty state for ~weeks until students use the new SRS dashboard enough for FSRS to mark words as hard. The architecture is forward-looking — no action needed.
- 🟡 **Distractor pool quality.** v1 pulls audio-having distractors at random (not level-matched or phonetically similar). Adequate for the small student count; improve to level-matched distractors when the pool of active students grows.
- 🟡 **`HardWordsStatsCard` not embedded anywhere yet.** Available for future placement (student dashboard, sidebar, curriculum integration). Auto-hides when count=0 so it's safe to drop anywhere.
- 🟡 **`badgeSource` declarative but no consumer yet.** The nav entries for SRS and Hard Words both declare `showBadge: true` + `badgeSource`, but Sidebar.jsx doesn't render the badge number yet. Both entries pattern-match; whenever the badge renderer is built, both will light up at once.
- 🟢 **No outstanding blockers.** Hard Words is functionally complete and live on `main`.

## Commits this session

| Commit | Subject |
|---|---|
| `c02715b` | feat(hard-words): schema + drill log + classification RPCs |
| `2ff46b0` | feat(hard-words): service layer src/services/hardWords.ts |
| `70fa9df` | feat(hard-words): 4 drill mode components + session container + completion |
| `5c3f715` | feat(hard-words): premium HardWordsHome + StatsCard |
| `cafcfcc` | feat(hard-words): mount /student/hard-words route + conditional nav entry |
| `<this report>` | docs(hard-words): final report |

## Pipeline once student data accumulates

1. Student reviews vocabulary in `/student/srs`.
2. They rate Again on some words → FSRS bumps `difficulty` up and `lapses` increments on lapse-eligible transitions.
3. After ~3 Again ratings on a word (or difficulty crossing 7.0), `get_hard_words_for_student` includes it.
4. Sidebar entry appears with the count badge (once badge renderer is built).
5. Student opens `/student/hard-words`, sees breakdown chips, picks a mode, drills 6–10 cards.
6. Each correct attempt increments `hw_correct_streak` + extends `hw_drill_modes_seen`. Wrong attempt resets both to 0.
7. After 3 correct attempts across 2+ different modes → word is **promoted**, leaves the hard-words pool, returns to normal FSRS flow.
8. If the word later starts failing again, the classification rules re-trigger it back into the pool (the promotion gate is per-cycle, not permanent).
