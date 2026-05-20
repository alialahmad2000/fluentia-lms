# Word Detail Sheet + Library Premium — Final Report (Phases A–G complete)

> **Status: COMPLETE** (2026-05-21). VOCAB-PREMIUM Prompt 07 shipped in one session.

## Phase A discovery summary

- **WordCard** at: `src/pages/student/curriculum/tabs/VocabularyTab.jsx` (lines ~758–800) — local function component. Tap handler: `onClick={() => { onView?.(); onPractice?.(word) }}` where `onPractice` is bound to `setExerciseWord` in the parent. The `onPractice` prop name is misleading but stays as-is — rewire happens at the parent's `onTapWord`/fallback level.
- **Filter bar** at: same file, lines ~452-498 (after legacy block removal). FILTERS array at module top (line 26).
- **Legacy ProgressRing + StatsRow** at: same file, ~lines 418-450 (the "① HERO HEADER" block) + local `ProgressRing` helper at line ~48 + local `StatCard` helper at line ~748. **All three REMOVED in Phase E.**
- **Audio playback pattern**: `new Audio(url)` instantiated inline + `.play().catch(() => {})`. No shared hook in the codebase — Detail Sheet matches this pattern with its own `audioRef`.
- **Exercise mastery schema**: `vocabulary_word_mastery` has per-exercise boolean columns (`meaning_exercise_passed`, `sentence_exercise_passed`, `listening_exercise_passed`) plus per-exercise attempt counts — NOT a separate `exercise_type` enum table. ProgressSection reads these directly.

## Production JSONB field names (verified live in Phase A.2 — used by Detail Sheet)

Sampled from words `leverage` and `soar`:

| Column | Item shape |
|---|---|
| `synonyms[]` | `{ word, level (1-5), is_strongest, vocabulary_id }` — uses `level` NOT `cefr_level`, `vocabulary_id` NOT `known_word_id` |
| `antonyms[]` | Same shape as synonyms |
| `word_family[]` | `{ pos, word, level, is_base, is_opposite, vocabulary_id, morphology: { affix?, rule_ar?, base_pos?, base_word?, affix_type?, similar_examples?[], is_base?, note_ar? } }` — uses `pos` NOT `part_of_speech`, two morphology variants (base form uses `note_ar`, derivative uses `affix` + `rule_ar` + `similar_examples`) |
| `pronunciation_alert` | `{ ipa, severity, has_alert, rule_category, similar_words[], explanation_ar, practice_tip_ar, problem_letters[], correct_approximation_ar, common_mispronunciation_ar }` — uses `correct_approximation_ar`/`common_mispronunciation_ar` NOT `correct_ar`/`wrong_ar` |

All sub-section components map to these exact field names.

## Files created

| Path | Lines | Purpose |
|---|---:|---|
| `src/components/curriculum/word-detail/WordDetailSheet.jsx` | 354 | Composer — bottom drawer (mobile) / RTL-left side panel (desktop) + drag-down-to-close + ESC + backdrop tap + sticky header + scrollable body + sticky 2-CTA footer |
| `src/components/curriculum/word-detail/DefinitionSection.jsx` | 90 | Arabic definition + English example sentence + optional audio button. Empty state: em-dash. |
| `src/components/curriculum/word-detail/PronunciationSection.jsx` | 175 | CONDITIONAL render. Red-tinted card. Severity badge + IPA + correct vs wrong-with-strikethrough + explanation + yellow tip + similar-words chips + rule_category footnote. |
| `src/components/curriculum/word-detail/RelationshipsSection.jsx` | 145 | 2-column synonyms + antonyms (stack on mobile). CEFR-color chips (`level` 1-5 → A1..C1), ⭐ for is_strongest, ✓ badge + interactive for known words. |
| `src/components/curriculum/word-detail/WordFamilySection.jsx` | 232 | 4-col POS table (verb/noun/adj/adv) — stacks 2-col on mobile. Tap chip discloses morphology card (affix, rule_ar, similar_examples). Base ⭐ + opposite ↔ markers. Known words get "افتح بطاقة" link. |
| `src/components/curriculum/word-detail/ProgressSection.jsx` | 192 | 3 exercise dots (meaning/sentence/listening per real schema) + 3 SRS stat rows (next due, lapses, difficulty as 5-dot scale). Calls `getWordSrsStats` via `useQuery`. |

## Files modified

| Path | Change |
|---|---|
| `src/services/srs.ts` | + `WordSrsStats` interface, + `getWordSrsStats(profileId, vocabId)`, + `addWordToImmediateReview(profileId, vocabId)`. Both use `.select()` after `.update()/.insert()`. |
| `src/pages/student/curriculum/tabs/VocabularyTab.jsx` | + 4 imports (Flame icon, WordDetailSheet, getHardWords). + `'hard'` entry in FILTERS array. + `detailSheetWord` state, + `useQuery(['hard-words-list'])` + `hardWordsSet`. + `filterWord` branch for `'hard'`. + flame-icon + per-state colors + disabled-state on the filter pill button. + `onTapWord` prop threaded through PaginatedTier → WordCard / WordListView. + `<WordDetailSheet>` mount at the bottom with `onRequestPractice` (close + `setExerciseWord`) + `onOpenRelated` (recursive open within unit). **Legacy "① HERO HEADER" block removed** (Phase E) including local `ProgressRing` + `StatCard` helpers. |

## Files removed

None on the filesystem — the legacy block was inline JSX + two local function components in `VocabularyTab.jsx`. All gone.

## Schema deviations from prompt 07 (documented, intentional)

1. **`level` not `cefr_level`** in synonyms/antonyms — production uses numeric `level: 1..5`. The Detail Sheet maps to A1/A2/B1/B2/C1 labels via a clamping helper.
2. **`vocabulary_id` not `known_word_id`** — same pattern.
3. **`pos` not `part_of_speech`** in word_family items.
4. **`correct_approximation_ar` / `common_mispronunciation_ar`** — confirmed in production, matches the audit + my Prompt 02C work.
5. **Mastery exercises are per-row booleans**, not a separate `exercise_type` enum table. ProgressSection reads `meaning_exercise_passed`, `sentence_exercise_passed`, `listening_exercise_passed` directly.

## Smoke results (parse + behavior trace)

### Parse-check

```
$ npx esbuild <all new/modified files> --bundle=false --loader:.jsx=jsx --target=esnext
OK  src/services/srs.ts
OK  src/components/curriculum/word-detail/WordDetailSheet.jsx
OK  src/components/curriculum/word-detail/DefinitionSection.jsx
OK  src/components/curriculum/word-detail/PronunciationSection.jsx
OK  src/components/curriculum/word-detail/RelationshipsSection.jsx
OK  src/components/curriculum/word-detail/WordFamilySection.jsx
OK  src/components/curriculum/word-detail/ProgressSection.jsx
OK  src/pages/student/curriculum/tabs/VocabularyTab.jsx
```

All 8 files parse cleanly. No `vite build` run locally per prompt rules.

### Behavior trace (static)

- **Empty enrichment word** (no synonyms / no family / no alert) → DefinitionSection renders the basics, PronunciationSection returns null entirely, Relationships/WordFamily show their polite empty-state messages. No layout shift.
- **Fully enriched word** (e.g., `leverage`) → all 6 sections render. Mastery badge "جديدة" by default; SRS stats show "—" if no SRS row exists; difficulty dots use green (0..1 dot) when no data is present.
- **Tap a card** → `onTapWord(v)` → `setDetailSheetWord(v)` → sheet animates in. Hero + ChunkLane stay mounted in the background (z-index ordering).
- **Tap "تدرّب على هذي الكلمة"** → sheet's `onRequestPractice` closes it + calls `setExerciseWord(w)` after 80ms → existing WordExerciseModal opens for that word. No queue callback set, so on close the modal does its normal cleanup. **No regression on chunks**.
- **Tap "أضفها للمراجعة الفورية"** → `addWordToImmediateReview(studentId, vocabId)` upserts the SRS row with `due=NOW()`. Toast displays. Hero status pill refreshes on its next stale-time window (30s).
- **Tap related word chip** with `vocabulary_id` matching another unit word → `onOpenRelated(vocabId)` → finds the word in `allWords` and swaps `detailSheetWord`. Cross-unit chips silently no-op for v1.
- **Switch filter to "صعبة"** → if `hardWordsSet` has 0 intersection with `allWords` for this unit, pill is greyed-out + disabled + tooltip-warning. If non-empty, pill renders with red treatment + count badge + filters word grid client-side.
- **Chunks queue regression check** → ChunkMiniSession's "ابدأ" path calls `onRequestNextWord(word, advanceCb)` → VocabularyTab sets `exerciseCloseCallbackRef.current = advanceCb` + `setExerciseWord(word)` directly (bypassing the Detail Sheet). When the modal closes, the same onClose handler that was already running before Prompt 07 fires `cb()`. **Unchanged from Prompt 06**.

## Two-path coexistence verified

| Path | Trigger | Goes through | Notes |
|---|---|---|---|
| **A** | Tap a WordCard | `onTapWord(v)` → `setDetailSheetWord(v)` → Detail Sheet → "تدرّب" CTA → `setExerciseWord(w)` after sheet close | one-off, no queue |
| **B** | Tap chunk → "ابدأ" | ChunkMiniSession's queue runner → `onRequestNextWord(w, cb)` → `exerciseCloseCallbackRef.current = cb` + `setExerciseWord(w)` directly | sequential queue, `cb` fires on modal close to advance |

Both paths converge on the same `WordExerciseModal` mount. Path A leaves `exerciseCloseCallbackRef.current` null, so the existing onClose flow (`setExerciseWord(null) + setQuickPractice(false)`) runs without firing any callback. Path B sets the ref so the cleanup also fires the queue's advance.

## Mobile responsive (static review)

- Drawer slides up from bottom on mobile; drag down past 140px or with velocity > 600 closes (Framer's `drag` API).
- Desktop side panel slides in from the RTL-start edge (left visually), width `min(480px, 95vw)`.
- All sections use `flex-wrap` chip rows + responsive grid (`grid-cols-2 md:grid-cols-4` on word family).
- Sticky 2-button footer keeps the CTAs visible at all viewport heights.
- Tap targets ≥40px (CTAs are 48px tall).
- All Arabic text uses `font-['Tajawal']`; English words use `font-['Inter']` with explicit `dir="ltr"` so English doesn't get RTL-mirrored.

## Deferred to Prompt 08

- Floating settings gear (preferences drawer: autoplay audio, chunk size, daily new cards)
- Onboarding tour (3-step intro on first-ever open)
- Skeleton loaders for each Detail Sheet section (currently they render their empty states immediately)
- Smart nudge notifications
- Accessibility (ARIA landmarks for the drawer, keyboard navigation for chip rows, prefers-reduced-motion)
- Performance pass (lazy-load PronunciationSection / WordFamilySection only when scrolled into view, virtualize library if a unit ever has >50 words)

## Commits this session

| Commit | Subject |
|---|---|
| `52cbf46` | feat(vocab-tab): WordDetailSheet — surfaces all 4 enrichments + SRS personal stats + practice CTA |
| `6248aaa` | feat(vocab-tab): 'صعبة' filter pill scoped to unit hard words |
| `34ae08d` | feat(vocab-tab): tap-card opens WordDetailSheet; practice via sheet CTA preserves chunks queue |
| `f3405e3` | chore(vocab-tab): remove duplicate legacy Hero block (ProgressRing + StatsRow now in new Hero) |
| `<this report>` | docs(vocab-tab): word detail sheet + library final report |
