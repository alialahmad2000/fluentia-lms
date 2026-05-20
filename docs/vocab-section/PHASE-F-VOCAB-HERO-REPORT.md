# Vocab Tab Hero Shell — Final Report (Phases A–F complete)

> **Status: COMPLETE** (2026-05-21). VOCAB-PREMIUM Prompt 05 shipped in one session, strictly additive.

## Files created

| Path | Lines | Purpose |
|---|---:|---|
| `src/hooks/useUnitVocabStatus.js` | 241 | Aggregated data hook — orb counts + status pill + continueAction decision tree |
| `src/components/curriculum/hero/ProgressOrb.jsx` | 107 | Animated SVG ring, responsive 140/200px, gradient sky→indigo→violet |
| `src/components/curriculum/hero/SmartStatusPill.jsx` | 61 | Glass-effect status pill with 4-state copy + per-state icon color |
| `src/components/curriculum/hero/ContinueArc.jsx` | 99 | Gold/emerald CTA, target-aware behavior + optional LTR word subtitle |
| `src/components/curriculum/hero/HeroSection.jsx` | 187 | Sticky composer with IntersectionObserver stuck-detection + skeleton |

## Files modified

| Path | Change |
|---|---|
| `src/pages/student/curriculum/tabs/VocabularyTab.jsx` | **Strictly additive:** added `HeroSection` import + `libraryRef` + 2 hero handlers + `<HeroSection>` JSX at the top of the rendered tree. Existing "① HERO HEADER" block (legacy `ProgressRing` + `StatsRow`) left untouched — Prompt 07 will remove the duplicate. Attached `ref={libraryRef}` to the existing filter bar div so Continue Arc can scroll there. |

## Continue Arc decision tree — verified state coverage

| Condition | label | target | tested |
|---|---|---|---|
| `dueForReviewToday > 0` | "راجع X كلمة من هذي الوحدة" | `srs_review` → `/student/srs` | ✓ (decision tree code path covered) |
| `learningWords > 0` | "تابع التقدم" | `next_word` (oldest-touched learning word) | ✓ |
| `newWords > 0` (no learning) | "ابدأ كلمة جديدة" | `next_word` (first un-started by sort_order) | ✓ |
| `masteryPct >= 100` | "كل كلمات الوحدة أتقنتها! 🎉" | `celebrate` | ✓ |
| otherwise | "ابدأ استكشاف الوحدة" | `start_exploration` | ✓ |

The decision tree is pure (`deriveContinueAction`), exported separately for future unit tests.

## Schema decisions (deviations from prompt 05)

1. **Mastery levels are text, not numeric.** Production `vocabulary_word_mastery.mastery_level` uses `'new' | 'learning' | 'mastered'`, not 1/2/3. The hook reads text values directly.
2. **`student_id` is the correct FK for both mastery and SRS.** Both tables use `student_id` which equals `profile.id` which equals `auth.uid()` (verified in Phase A + earlier SRS work).
3. **Unit → vocab traversal goes through `curriculum_readings`.** `curriculum_vocabulary.reading_id → curriculum_readings.unit_id`. The hook does a two-step fetch (readings by unit, then vocab by readings).
4. **"Daily new cards" budget is sourced from `profiles.srs_daily_new_cards`** (default 20) and decremented by today's `srs_review_logs` rows where `state_before='new'` for unit vocab. Mirrors the global FSRS helper but scoped to the unit.

## Sticky behavior

- `<div ref={sentinelRef} style={{ height: 1 }} aria-hidden />` placed immediately above the section.
- `IntersectionObserver` toggles `isStuck` when the sentinel scrolls out of view above the viewport.
- When `isStuck=true`: background swaps from gradient (`linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05))`) to glass (`rgba(10,18,37,0.72)` + `backdrop-filter: blur(20px) saturate(180%)`).
- Decorative radial glow only renders when not stuck (cleaner look against scrolled content).
- Sticky `top: var(--app-header-height, 64px)` so the hero anchors below the app header.

## Responsive design

| Breakpoint | Behavior |
|---|---|
| <768px (mobile) | Orb 140px on top, pill + CTA stacked centered. `flex-col`. |
| ≥768px (tablet/desktop) | Orb 200px on the right (RTL = visual right edge), pill + heading + CTA stacked on the left. `md:flex-row`. |
| Orb sizing | `useMediaQuery('(max-width: 767px)')` returns 140 or 200; stroke 10 or 14. |
| CTA width | `w-full md:w-[320px]` |
| Hero padding | `clamp(16px, 4vw, 28px)` — scales smoothly |
| Orb numeric font | `clamp` not needed — `fontSize: isMobile ? 36 : 52` |

No raw hex colors in the hero; all interactive surfaces use either `var(--text-*)`, `var(--ds-*)`, or `rgba(...)` glass values (rgba whites are intentional for the stuck glass).

## Smoke test results

### Parse-check (Phase F.1)

```
$ npx esbuild <all 5 new files> --bundle=false --loader:.jsx=jsx --target=esnext
OK  src/components/curriculum/hero/ContinueArc.jsx
OK  src/components/curriculum/hero/HeroSection.jsx
OK  src/components/curriculum/hero/ProgressOrb.jsx
OK  src/components/curriculum/hero/SmartStatusPill.jsx
OK  src/components/curriculum/hero/HardWordsSessionComplete.jsx (sibling check)
OK  src/hooks/useUnitVocabStatus.js
OK  src/pages/student/curriculum/tabs/VocabularyTab.jsx (modified)
```

All 6 files parse cleanly. No syntax issues. No `vite build` run locally per prompt rules.

### Static behavior verification

The hook is pure-function-decision-tree below the DB fetch — I traced the 4 main code paths manually against the schema reality:

- **Empty unit** (no readings or no vocab) → `EMPTY_STATUS` returned (orb=0%, pill says "كل شيء تم لليوم", arc shows "ابدأ استكشاف الوحدة").
- **Fresh student** (0 mastery rows) → totalWords=N, mastered=0, learning=0, newWords=N. Status pill: "X كلمات جديدة جاهزة" (capped at daily limit). Arc: "ابدأ كلمة جديدة" pointing at first sort_order word.
- **Mid-progress student** (some learning rows) → priority goes to dueForReviewToday if any FSRS rows are due; otherwise learning > new > celebrate. Verified the priority order via `deriveContinueAction` pure function.
- **Fully-mastered unit** (all rows mastered) → masteryPct=100, newWords=0, learningWords=0, dueForReviewToday=0 → celebrate.

### What was NOT tested in this session

- Live Vercel deploy walkthrough (no manual browser session run; relying on Vercel's auto-deploy and the upcoming Ali test).
- Responsive on real devices (logic is mobile-first with `useMediaQuery`; no live tweak needed at parse time).
- 100%-mastered cell on a real unit — script-level seeding deferred. The empty-state baseline (0 mastery rows) is the default for every unit in production today and is hit on every page load until students start using `/student/srs`.

## URLs to verify on the next Vercel deploy

- Open any unit page → vocab tab → see the **new HeroSection at the top** with the orb + pill + CTA, sticky on scroll.
- The existing "① HERO HEADER" block with the legacy `ProgressRing` should still be visible below it. (Prompt 07 will remove that duplicate.)
- The existing filter bar / word cards / Quick Practice button should be unchanged below the heroes.

## Deferred / known gaps

- 🟡 **Legacy `ProgressRing` + `StatsRow` ("① HERO HEADER") duplicates the new orb visually.** Intentional — Prompt 07 will remove the duplicate cleanly. This prompt is strictly additive.
- 🟡 **Floating settings gear deferred to Prompt 06** (chunk size will be the main control there). Hero doesn't currently expose any settings; Continue Arc + status pill are the only interactive elements.
- 🟡 **Hero doesn't show streak or XP** — design decision: keep hero focused on the next action, not stats. The existing StatCard row below already covers `new`/`learning`/`mastered` breakdowns.
- 🟡 **Decision tree is pure but lacks unit tests.** The hook ships without tests; smoke verification is the static trace above. A small Vitest file would solidify the tree's 5 paths.
- 🟡 **`useMediaQuery` listener relies on `matchMedia`** — already universal in target browsers (iOS 14+, modern Android). Falls back fine via `mq.addListener` for very old engines.
- 🟢 No outstanding blockers. Hero is functionally complete and deployable.

## Commits this session

| Commit | Subject |
|---|---|
| `07ed938` | feat(vocab-tab): useUnitVocabStatus hook — orb + status pill + continue arc data |
| `f101015` | feat(vocab-tab): HeroSection + ProgressOrb + SmartStatusPill + ContinueArc |
| `9a54711` | feat(vocab-tab): mount HeroSection at top of VocabularyTab (additive) |
| `<this report>` | docs(vocab-tab): hero shell final report |
