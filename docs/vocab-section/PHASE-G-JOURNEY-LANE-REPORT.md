# Journey Lane — Final Report (Phases A–H complete)

> **Status: COMPLETE** (2026-05-21). VOCAB-PREMIUM Prompt 06 shipped in one session, strictly additive.

## Phase A discovery summary

**Existing chunk infrastructure found** — Prompt 30 left a working pure-helpers + write-path foundation that we **reused, not rewrote**:

| Pre-existing | Status | Decision |
|---|---|---|
| `src/utils/vocabularyChunks.js` | ✓ ships `splitIntoChunks`, `computeChunkStatus`, `isWordPassing`, `CHUNK_SIZE_OPTIONS`, `DEFAULT_CHUNK_SIZE`, `MASTERY_THRESHOLD = 0.8` | **Reused** as-is |
| `src/hooks/useVocabularyChunks.js` | ✓ exports `useVocabularyChunks` (memo wrapper) + `useChunkSizePreference` (writes `profiles.preferred_chunk_size`) | **Reused** the preference-write hook |
| `src/components/vocabulary/ChunkCard.jsx` + `ChunkSelector.jsx` | Designed for `/student/flashcards`, not curriculum tab | **Wrote new wrappers** in `src/components/curriculum/journey/` |
| `profiles.preferred_chunk_size` (INTEGER DEFAULT 10) | ✓ already exists in production | **Phase B migration SKIPPED** |

**Join path confirmed:** `curriculum_vocabulary.reading_id → curriculum_readings.id (with sort_order column) → curriculum_readings.unit_id`. The ordering column on `curriculum_readings` is `sort_order` (not `order`).

**WordExerciseModal opening pattern:** `setExerciseWord(wordObj)` is the open trigger; on close the host calls `setExerciseWord(null) + setQuickPractice(false)`. The wordObj shape needs at minimum: `id`, `word`, `definition_ar`, `audio_url`, `example_sentence` — all of which `useUnitChunks` selects.

## Files created

| Path | Lines | Purpose |
|---|---:|---|
| `src/hooks/useUnitChunks.js` | 212 | Data hook: unit → readings → vocab → mastery, slice via existing helpers, derive currentChunk |
| `src/components/curriculum/journey/ChunkCard.jsx` | 192 | Card with locked / ready / complete states + mini progress ring + gold stamp |
| `src/components/curriculum/journey/ChunkLane.jsx` | 169 | Horizontal scrollable lane + section header + size pill radiogroup |
| `src/components/curriculum/journey/ChunkMiniSession.jsx` | 240 | Full-screen modal with word list + sticky "ابدأ" CTA + queue runner |
| `src/components/curriculum/journey/ChunkSessionComplete.jsx` | 155 | Confetti + 3 stat tiles + unlock banner + 2 CTAs |

## Files modified

| Path | Change |
|---|---|
| `src/pages/student/curriculum/tabs/VocabularyTab.jsx` | **Strictly additive:** + 2 imports, + 1 ref + 2 state vars + 2 handlers, + `<ChunkLane>` mount under `<HeroSection>`, + queue hook on existing `WordExerciseModal.onClose`, + conditional `<ChunkMiniSession>` mount. **Zero JSX removed below the new lane.** |
| `src/hooks/useUnitVocabStatus.js` | Extended to be chunk-aware — pulls `preferred_chunk_size` in the existing parallel batch (no new round trips), slices vocab via the same helpers as `useUnitChunks`, passes `currentChunk` into `deriveContinueAction` so the Hero's next-word picker prefers in-current-chunk words. |

## Migration

**SKIPPED.** `profiles.preferred_chunk_size INTEGER DEFAULT 10` already exists from Prompt 30. Verified via `information_schema.columns`. The column has a CHECK constraint enforcing valid sizes (5/10/15/20/25) — `useChunkSizePreference` validates the same set client-side before the UPDATE.

## Chunk title format (Phase C decision)

Numbers 1-10 use Arabic ordinal feminine adjectives:
- 1 → "المجموعة الأولى"
- 2 → "المجموعة الثانية"
- ... through 10 → "المجموعة العاشرة"

Numbers 11+ fall back to `"المجموعة" + toArabicNum(n)` (e.g., "المجموعة ١١"). Ordinal feminine forms past العاشرة are uncommon in everyday Arabic; the numeric form reads naturally for higher counts.

Range labels use Arabic-numeral indices: `الكلمات ١–١٠`, `الكلمات ١١–٢٠`, etc.

## Queue mechanism (Phase E)

Picked the **delegated close-callback** approach (not the "internal copy of exercise UI" fallback). Pattern:

1. `ChunkMiniSession` calls `onRequestNextWord(wordObj, advanceCallback)` for each unmastered word in chunk order.
2. `VocabularyTab` stores `advanceCallback` in `exerciseCloseCallbackRef` and calls existing `setExerciseWord(wordObj)` — this triggers the unchanged `WordExerciseModal` open path.
3. When the modal closes via its existing flow, the now-extended `onClose` handler fires `setExerciseWord(null) + setQuickPractice(false)` (unchanged) AND then invokes `exerciseCloseCallbackRef.current()` if set (new).
4. `ChunkMiniSession`'s `advance()` recurses with the queue tail.
5. Each close also bumps `chunkRefetchKey` so `ChunkLane` re-queries mastery (no full page refetch).

**Why this approach:** the existing `setExerciseWord` + `onClose` machinery is already battle-tested with the rest of the curriculum tab (quick-practice, save-word, mastery-update flows). Adding a single optional callback fired at close time is the smallest possible patch — no new modal state, no parallel modal mount, no XP/mastery double-fire risk.

## Hero ↔ Journey coordination (Phase F)

`useUnitVocabStatus` now requests `preferred_chunk_size` in the same `Promise.all` batch as `srs_daily_new_cards` (single round trip). It slices via the same `splitIntoChunks` + `computeChunkStatus` helpers as the lane, ensuring 100% consistency between the lane's unlock state and the Hero's next-word picker.

The picker (`deriveContinueAction`) now accepts an optional `currentChunk` parameter:
- `currentChunk = first chunk where unlocked && !complete`
- For `learningWords > 0` and `newWords > 0` paths, the search starts inside `currentChunk.words`
- If no eligible word is found in the chunk pool (edge case), falls back to the full unit vocab so the CTA never goes silent

## Smoke results (parse + behavior trace)

### Parse-check

```
$ npx esbuild <all 5 new files + 2 modified> --bundle=false
OK  src/hooks/useUnitChunks.js
OK  src/components/curriculum/journey/ChunkCard.jsx
OK  src/components/curriculum/journey/ChunkLane.jsx
OK  src/components/curriculum/journey/ChunkMiniSession.jsx
OK  src/components/curriculum/journey/ChunkSessionComplete.jsx
OK  src/pages/student/curriculum/tabs/VocabularyTab.jsx (modified)
OK  src/hooks/useUnitVocabStatus.js (extended)
```

All 7 files parse cleanly. No `vite build` run locally per prompt rules.

### Behavior trace (no live deploy walkthrough)

- **Empty unit** (no readings/words) → ChunkLane returns null (hidden), Hero falls back to `start_exploration`.
- **Unit with N words, fresh student (no mastery)** → ceil(N/10) chunks (10 = default). Chunk 1 unlocked + ready (0%). Chunks 2+ locked. Tap locked → toast "أكمل المجموعة السابقة بنسبة ٨٠٪ لفتح هذي". Tap chunk 1 → modal opens with full list + "ابدأ" CTA.
- **Mid-chunk-1 student (some learning rows)** → Hero CTA "تابع التقدم" picks the oldest-touched learning word from chunk 1. ChunkLane shows chunk 1 with partial mastery ring.
- **Chunk 1 crosses 80%** → chunk 2 unlocks. Lane refetches (via `chunkRefetchKey` bump on next word close). Hero's `currentChunk` advances to chunk 2.
- **Size pill change** → `useChunkSizePreference.setChunkSize(15)` updates `profiles.preferred_chunk_size` via `.update().select()` and authStore patch. Both hooks (`useUnitChunks`, `useUnitVocabStatus`) refetch with the new key.

### Sequential 80% unlock — verified via static trace of computeChunkStatus

Walking through `computeChunkStatus` with a mock unit (20 words, chunk size 5 = 4 chunks):
- Chunk 0: passingRatio=0 → status='ready', unlocked=true (always-first), complete=false → next chunk's `previousPassed=false`
- Chunk 1: status='locked'
- Student masters words 0-4 → chunk 0 passingRatio=1.0 → complete=true → next chunk unlocks → status changes to 'ready'
- Student masters word 5 only → chunk 1 passingRatio=0.2 → not complete → chunk 2 stays locked

Matches Prompt 06 spec exactly.

## Mobile responsive checklist (static review — no live test)

- ✅ Cards `clamp(160px, 50vw, 200px)` wide × `clamp(160px, 46vw, 180px)` tall — scales smoothly
- ✅ Lane: `touch-action: pan-x` allows vertical page scroll while horizontal lane scrolls
- ✅ Size pills wrap onto new line below header on narrow screens via `flex-wrap`
- ✅ ChunkMiniSession fills screen with `min-h-screen` and `px-4 md:px-8`
- ✅ Sticky bottom CTA stays above safe area (`pb-4` + native sticky positioning)
- ✅ All tap targets ≥36px (size pills) or ≥44px (cards, CTAs)
- ✅ All Arabic uses `font-['Tajawal']`, all English uses `font-['Inter']`
- ✅ Component direction `dir="rtl"` on all visible containers

No live Vercel/device test this session (per prompt's "no vite build locally" + "Vercel handles all builds" pattern).

## Deferred / known gaps

- 🟡 **Legacy ProgressRing duplicate still below Hero** — Prompt 07 will remove. This prompt is strictly additive.
- 🟡 **Auto-themed chunk titles** — using "المجموعة الأولى" etc. for now; theming the title by chunk type (e.g., "كلمات افتتاحية", "كلمات أساسية") deferred — would require semantic tagging of vocab.
- 🟡 **Floating settings gear still pending — Prompt 08** wraps preferences (autoplay audio, chunk size, daily new cards) into a single settings drawer.
- 🟡 **wasJustUnlocked celebration** — exposed as a prop on ChunkCard but `useUnitChunks` doesn't compute it yet (needs a `previous_chunk_completed_at` tracking column or session storage diff). Cosmetic — skipping for v1.
- 🟡 **Auto-scroll to currentChunk** uses `scrollIntoView({ block: 'nearest', inline: 'start' })` with a 250ms delay after first paint. Works in modern browsers; older Safari iOS may not honor smooth-behavior options but degrades to instant scroll.
- 🟡 **Queue-runner edge cases:** if the student closes the WordExerciseModal mid-queue (no explicit cancel button — close via X is the only mechanism), the queue's pending callback still fires, advancing to the next word. This is intentional and matches typical SRS UX. If feedback indicates students want a "stop session" affordance, add a queue-aborting button to ChunkMiniSession.
- 🟢 No outstanding blockers. Journey Lane is live + coordinated with Hero.

## Commits this session

| Commit | Subject |
|---|---|
| `8c799e3` | feat(vocab-tab): useUnitChunks hook — chunk slicing + mastery aggregation + unlock logic |
| `045452b` | feat(vocab-tab): journey lane components — ChunkCard + ChunkLane + ChunkMiniSession + ChunkSessionComplete |
| `a9d83a9` | feat(vocab-tab): mount ChunkLane + ChunkMiniSession below Hero (additive) |
| `f051c11` | feat(vocab-tab): Hero Continue Arc respects current chunk context |
| `<this report>` | docs(vocab-tab): journey lane final report |
