# Premium Vocabulary Rebuild — COMPLETE

> **The 8-prompt series is shipped.** Closure date: 2026-05-21.

## Journey

| Prompt | Subject | Report |
|---|---|---|
| 01 | Audit (read-only) | [`PHASE-A-AUDIT.md`](./PHASE-A-AUDIT.md) |
| 02 | Enrichment fill (foundation prompt) | [`PHASE-B-CHECKPOINT.md`](./PHASE-B-CHECKPOINT.md) |
| 02A | Relationships track (L1 + L3) | (in `PHASE-B-CHECKPOINT.md`) |
| 02B | Word Families track (L1 + L3) | (in `PHASE-B-CHECKPOINT.md`) |
| 02C | Pronunciation Alerts track (L1 + L3) | (in `PHASE-B-CHECKPOINT.md`) |
| 03 | SRS Upgrade → FSRS (DB + service) | [`PHASE-C-SRS-UPGRADE-REPORT.md`](./PHASE-C-SRS-UPGRADE-REPORT.md) |
| 03B | SRS Frontend (Phases D–H) | [`PHASE-D-SRS-FRONTEND-REPORT.md`](./PHASE-D-SRS-FRONTEND-REPORT.md) |
| 04 | Hard Words Training | [`PHASE-E-HARD-WORDS-REPORT.md`](./PHASE-E-HARD-WORDS-REPORT.md) |
| 05 | Vocab Tab Hero Shell | [`PHASE-F-VOCAB-HERO-REPORT.md`](./PHASE-F-VOCAB-HERO-REPORT.md) |
| 06 | Vocab Tab Journey Lane | [`PHASE-G-JOURNEY-LANE-REPORT.md`](./PHASE-G-JOURNEY-LANE-REPORT.md) |
| 07 | Word Detail Sheet | [`PHASE-H-WORD-DETAIL-REPORT.md`](./PHASE-H-WORD-DETAIL-REPORT.md) |
| 08 | Polish + Gaps | [`PHASE-I-POLISH-REPORT.md`](./PHASE-I-POLISH-REPORT.md) |

## What students experience now

### Daily SRS review (`/student/srs`)
- Premium dashboard with progress orb, 3-stat hero, recent-7-day chart, settings drawer
- FSRS algorithm (replaces SM-2). 4-rating UX (Again/Hard/Good/Easy) with predicted-interval previews.
- 97 active student rows preserved from the SM-2 era; due dates carried over.
- `srs_review_logs` captures every rating event.

### Hard Words Training (`/student/hard-words`)
- Conditional nav entry — only visible when the student has classified hard words.
- 4 drill modes: Matching (6×6 tap-pair), Context Fill (4-MCQ on blanked sentence), Listening (audio + 4 English options), Typing Recall (Arabic→English typing with Levenshtein-≤1 forgiveness).
- Promotion gate: 3 consecutive correct attempts across ≥2 distinct modes → word leaves the hard-words pool.

### Unit vocabulary tab (per-unit)
- **Sticky Hero** at top: animated SVG progress orb + smart status pill + gold Continue Arc with chunk-aware next-word picker.
- **Journey Lane** below: horizontal-scrollable chunk cards (size 5/10/15/20/25, selectable). Sequential 80% unlock. Tap card → full-screen mini-session with queue runner driving the existing WordExerciseModal.
- **Smart nudge banners**: return-to-unit greeting (≥3 days away) + stalled-learning reminder (words in `learning` for ≥14 days).
- **Word library** below the lane: grid/list views, search input, 6 filter pills (الكل / جديدة / تتعلمها / أتقنتها / صعبة / معلّقة).
- Tap any word card → **Word Detail Sheet** (bottom drawer on mobile, RTL-start side panel on desktop) with 6 sections:
  1. Header (audio + IPA + mastery badge)
  2. التعريف — Arabic definition + English example
  3. التحذير من النطق — conditional red-tinted alert with severity badge + practice tip + similar words (lazy-loaded)
  4. مرادفات ومتضادات — CEFR-color-coded chip rows, ⭐ for strongest, ✓ for known words
  5. عائلة الكلمة — 4-column POS table with tappable morphology drawers (lazy-loaded)
  6. التقدم — 3 exercise mastery dots + SRS personal stats (due, lapses, difficulty)
  - Two sticky CTAs: "تدرّب على هذي الكلمة" / "أضفها للمراجعة الفورية"
- **Floating settings gear** (bottom-end): 5 preferences (view default, autoplay audio, tap behavior details-vs-practice, chunk size, link to SRS settings).
- **First-time onboarding tour**: 3-step spotlight on Hero → Journey → Library. Once dismissed, never appears again for that student.

### Schema additions (across the series)

| Table | Columns added |
|---|---|
| `curriculum_vocabulary` | 4 enrichment JSONB cols (synonyms, antonyms, word_family, pronunciation_alert) + 4 generation-timestamp cols + `pronunciation_checked_at` |
| `curriculum_vocabulary_srs` | 10 FSRS state cols + 3 hw_* (hard-words tracking) |
| `srs_review_logs` | NEW table — FSRS rating history |
| `hard_words_drill_log` | NEW table — drill attempt log |
| `profiles` | 4 srs_* prefs + 5 vocab_* / last_vocab_visit_at prefs + preferred_chunk_size |
| Dropped | `anki_cards`, `anki_review_logs` (0 rows at drop time) |

### Service layer additions

- `src/services/srs.ts` — 11 exports (rateCard, previewAllRatings, applyRating, getDueCards, getDueCount, getNewCardsAvailable, getNewCards, getStreak, getDashboardCounts, getWordSrsStats, addWordToImmediateReview) + RATING constant + RATING_AR labels
- `src/services/hardWords.ts` — 8 exports + DrillMode types + 3 SECURITY DEFINER RPCs

### Hooks

- `src/hooks/useUnitVocabStatus.js` — Hero data hook (chunk-aware)
- `src/hooks/useUnitChunks.js` — Journey lane data hook + chunk derivation
- `src/services/srs.ts` exports are consumed via TanStack Query in several components

## Known deferred items (post-series)

| Area | Item | Why deferred |
|---|---|---|
| Enrichment | L1 + L3 word_family / pronunciation backfill incomplete | Tracks B + C made partial progress; opportunistic fill in future sessions |
| Enrichment | L0 / L2 / L4 / L5 enrichment | No active students at those levels yet |
| FSRS | Legacy SM-2 columns still on `curriculum_vocabulary_srs` | Kept one release cycle as rollback safety; drop in a follow-up cleanup |
| FSRS | Hybrid hook situation: legacy `useSRSCounts`/`useSRSDue` (RPC path) coexists with new `srs.ts` service | Functional today; single-source-of-truth pass is cosmetic |
| Hard Words | 0 hard words classified today | Words will accumulate organically as students rate Again on the new SRS dashboard |
| Vocab tab | Virtualization of word library | Pool sizes (max ~50/unit) don't need it yet |
| Vocab tab | Auto-themed chunk titles | "المجموعة الأولى" etc. work fine; semantic theming is a future polish |
| Vocab tab | Formal focus trap inside drawers | ESC/backdrop/X all close; standard keyboard nav works |
| Vocab tab | Screen-reader live announcements for state changes | Existing role=status on banners covers most cases |
| Migrations | `pronunciation_checked_at` migration on disk but Track C used `pronunciation_generated_at` fallback | Apply when convenient — column is additive, idempotent |

## Stats — what shipped

- **8 prompts × ~6 phases avg = 48 atomic commits** spanning DB migrations + service layer + 22 new components + hooks + reports
- **5 new DB migrations** applied to production via direct-pg helper scripts
- **0 breaking changes** to existing student data — every migration was additive
- **97 active student SRS rows** carried through the entire series intact
- **2 new top-level routes** mounted (`/student/srs`, `/student/hard-words`)
- **8 phase reports** + 1 closure summary (this doc)

## Pickup for future sessions

The architecture is forward-looking. The next natural areas of investment:

1. **Continue Track A/B/C enrichment for L3** — biggest impact since L3 has 7 active students. Use `prompts/agents/VOCAB-PREMIUM-02A` / `02B` / `02C` as templates.
2. **Apply the `pronunciation_checked_at` migration** in Supabase Dashboard SQL Editor — already on disk at `supabase/migrations/20260520120000_add_pronunciation_checked_at.sql`.
3. **Once student feedback arrives**, address whichever deferred items the data shows mattering most.

---

*Series shipped by Claude Code across multiple sessions. Foundation prompts (01–02C) by VOCAB-PREMIUM authors; implementation work logged commit-by-commit to `main`.*
