# VOCAB PREMIUM — PROMPT 06 — VOCABULARY JOURNEY LANE

> Part 6 of 8 in the Premium Vocabulary rebuild series.
> Adds the chunks lane between the Hero (Prompt 05) and the existing word library.
> **Strictly additive** — does NOT modify or remove existing VocabularyTab content. The Journey Lane is inserted between the Hero and the rest of the page.
> The audit found Prompt 30 (Chunks + Quiz) was PARTIAL. Phase A discovers what already exists so we extend, not rebuild.

---

## 🎯 GOAL — END STATE

When a student opens any unit's Vocabulary tab:

1. **Below the Hero**, a new **Journey Lane** section appears with:
   - Section header: "رحلة المفردات" + small subtitle "تعلّم الكلمات على مجموعات"
   - Inline chunk-size selector (pills: ٥ / ١٠ / ١٥ / ٢٠ / ٢٥) — saves to `profiles.preferred_chunk_size`
   - Horizontal-scrollable row of chunk cards (mobile-swipe, desktop wheel/drag scroll)
2. Each chunk card shows:
   - Title: "المجموعة X" + word-range subtitle "(الكلمات Y–Z)"
   - Mini progress ring (chunk mastery % — derived from words' mastery_level inside the chunk)
   - Stat row: "X / Y" (mastered / total)
   - **Lock state** for chunks where the previous chunk is < 80% mastered
   - Gold ✓ stamp when chunk reaches 100% mastery
3. Tap an unlocked chunk → opens **Chunk Mini-Session**:
   - Full-screen modal showing chunk title + word list with mastery states
   - "ابدأ" CTA → queues `WordExerciseModal` through un-mastered words in chunk order
   - On last word complete → `<ChunkSessionComplete>` celebration
4. Tap a locked chunk → small toast: "أكمل المجموعة السابقة بنسبة ٨٠٪ لفتح هذي".
5. Mobile-friendly: cards swipe horizontally; section never causes layout shift.
6. Hero's Continue Arc respects new chunk state (e.g., when "next un-started word" is picked, prefer the next un-started word in the **current chunk in progress**).

---

## 🧭 FOUNDATION (already in place)

- VocabularyTab: `src/pages/student/curriculum/tabs/VocabularyTab.jsx`. Takes `unitId` prop. Modal opens via `setExerciseWord(wordObj)`.
- HeroSection already mounted at top.
- Mastery: `vocabulary_word_mastery.mastery_level` is **TEXT** with values `'new' | 'learning' | 'mastered'`.
- Unit → vocab join via `curriculum_readings.unit_id`. So fetching unit words requires joining through readings.
- `useUnitVocabStatus` hook (from Prompt 05) — useful pattern to extend; uses TanStack `useQuery` with `staleTime: 30_000`.
- Design tokens: `var(--ds-*)` and `var(--tr-*)`. Tajawal Arabic. RTL.

---

## ⚠️ NON-NEGOTIABLE

1. **Strictly additive** — existing VocabularyTab content (legacy ProgressRing, StatsRow, FilterBar, word grid, Quick Practice button) untouched.
2. **`mastery_level` is text** — never compare to numeric 1/2/3.
3. **`student_id` for all student-data queries** (= `profile.id` = `auth.uid()`).
4. **Unit→vocab via `curriculum_readings`** — verify exact join path in Phase A; do not assume direct FK.
5. **Hooks at top of components.**
6. **`.select()` after every `.update()`** (mostly applies to Phase B for the preference column write).
7. **Atomic phase commits** + push after each.
8. **Design tokens only.**
9. **Horizontal scroll must not block vertical page scroll** (touch-action: pan-y on the lane).
10. **Continue Arc in Hero must still work** after Prompt 06 lands. Either it's untouched, or its underlying hook is extended to be chunk-aware.

---

## PHASE A — DISCOVERY (15 min, read-only)

### A.1 — Existing chunk infrastructure

```bash
# Find any existing chunk code (Prompt 30 was PARTIAL — what shipped?)
grep -rln "chunk\|Chunk" src/ 2>/dev/null | head -30

# Look in components, hooks, services, pages
ls src/components/vocabulary/ 2>/dev/null
ls src/hooks/ | grep -iE "chunk|vocab" 2>/dev/null
ls src/services/ | grep -iE "chunk|vocab" 2>/dev/null

# Database — chunk-related tables/columns
```

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND (table_name LIKE '%chunk%' OR table_name LIKE '%vocab%')
ORDER BY table_name;

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND (column_name LIKE '%chunk%' OR column_name LIKE '%vocab%')
ORDER BY column_name;
```

**Decision rule:**
- If existing chunk code is structurally compatible with the spec below → extend it, don't rewrite.
- If it's stale/broken/partial-only-on-DB-side → keep the DB but rewrite the UI.
- If nothing exists → greenfield build per spec below.

Document the decision in the final report.

### A.2 — Confirm join path

```sql
-- Verify the unit → vocab join works
SELECT cv.id, cv.word, cv.definition_ar, cr.unit_id, cr.id AS reading_id, cr.title AS reading_title
FROM curriculum_vocabulary cv
JOIN curriculum_readings cr ON cr.id = cv.reading_id
WHERE cr.unit_id = (SELECT id FROM curriculum_units LIMIT 1)
ORDER BY cr.order, cv.id
LIMIT 10;
```

Confirm:
- Column name on `curriculum_vocabulary` for the reading FK (probably `reading_id`)
- Column on `curriculum_readings` for unit FK (probably `unit_id`)
- Ordering field on readings (probably `order` or `sort_order`)
- Ordering field on vocab within a reading (probably `id` or insertion order)

### A.3 — Existing WordExerciseModal opening pattern

Read the lines in VocabularyTab.jsx that call `setExerciseWord(wordObj)`. Confirm:
- What shape does `wordObj` need? (id, word, definition_ar, audio_url, …)
- How does the modal close? (callback prop? state cleared by modal itself?)
- Is there a way to enqueue multiple words? If not, we'll implement the queue at the Chunk Session level.

Print findings. Proceed.

---

## PHASE B — MIGRATION (idempotent, additive)

```sql
-- preferred_chunk_size on profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_chunk_size INTEGER DEFAULT 10
  CHECK (preferred_chunk_size IN (5, 10, 15, 20, 25));
```

That's it for DB if Phase A confirms no chunk tables exist yet. If a chunk_progress table existed from Prompt 30 and is structurally usable → keep it; otherwise no new chunk-progress table is needed (chunk mastery is **derived** at query time from `vocabulary_word_mastery`, no separate state).

If Phase A finds an existing `vocabulary_chunk_progress` table or similar with rows in it → preserve and document; do not drop.

```bash
git add supabase/migrations/
git commit -m "feat(vocab-tab): add profiles.preferred_chunk_size for journey lane"
git push origin main
```

---

## PHASE C — DATA HOOK

Create `src/hooks/useUnitChunks.js`:

```typescript
interface ChunkData {
  index: number;              // 0-based chunk index
  number: number;             // 1-based display number
  title: string;              // "المجموعة الأولى" / "المجموعة الثانية" / ...
  rangeLabel: string;         // "الكلمات ١–١٠" — Arabic numerals via toLocaleString('ar-EG')
  words: VocabWord[];         // The chunk's words in display order
  total: number;              // words.length
  mastered: number;
  learning: number;
  newCount: number;
  masteryPct: number;         // (mastered + 0.5*learning) / total * 100, rounded
  isUnlocked: boolean;        // chunk 0 always; rest unlock when previous masteryPct >= 80
  isCompleted: boolean;       // masteryPct >= 100
  wasJustUnlocked?: boolean;  // optional flag — true if previous chunk crossed 80% in last 24h (cosmetic celebration)
}

interface UseUnitChunksReturn {
  chunks: ChunkData[];
  chunkSize: number;          // current preferred chunk size
  setChunkSize: (size: 5|10|15|20|25) => Promise<void>;
  currentChunk: ChunkData | null;  // the chunk most likely to be "in progress" — first non-completed unlocked chunk
  isLoading: boolean;
}
```

**Internal:**
- Fetch unit words via the join verified in A.2
- Fetch this student's `vocabulary_word_mastery` for those word ids in one query
- Fetch `profiles.preferred_chunk_size` (default 10)
- Slice the words array into chunks of `chunkSize`
- Compute mastery stats per chunk
- Apply unlock rule sequentially

**Chunk titles:**
- Number 1 → "المجموعة الأولى"
- Number 2 → "المجموعة الثانية"
- Number 3 → "المجموعة الثالثة"
- Number 4 → "المجموعة الرابعة"
- Number 5 → "المجموعة الخامسة"
- Numbers 6+ → "المجموعة السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"
- Numbers 11+ → fallback to `المجموعة ${number.toLocaleString('ar-EG')}`

`setChunkSize` writes to `profiles.preferred_chunk_size`, invalidates the query, refetches. Use TanStack `useMutation` with `.select()` after `.update()`.

Query key: `['unit-chunks', unitId, profileId, chunkSize]`. `staleTime: 30_000`.

```bash
git add src/hooks/useUnitChunks.js
git commit -m "feat(vocab-tab): useUnitChunks hook — chunk slicing + mastery aggregation + unlock logic"
git push origin main
```

---

## PHASE D — JOURNEY LANE COMPONENTS

All new files in `src/components/curriculum/journey/`.

### D.1 — `ChunkCard.jsx`

**Visual spec (unlocked, in-progress):**
- Card size: 200px wide × 180px tall (desktop). 160px × 150px (mobile).
- Background: subtle gradient using design tokens — `linear-gradient(135deg, var(--ds-indigo-700/0.4), var(--ds-violet-800/0.3))` or analogous.
- Border: 1px solid `rgba(255,255,255,0.08)`, radius 16px.
- Top: chunk title (Tajawal bold, 16px) + small range label below.
- Center: mini progress ring (80px diameter, gradient stroke).
- Bottom: stat row "X / Y" + small label "أتقنت".
- Hover/tap: subtle lift + glow shift.

**Locked variant:**
- Same dimensions, grayed-out (filter: grayscale(0.7), opacity 0.6).
- Lock icon overlay (lucide `Lock`) centered.
- Tap → toast (use existing toast system from the codebase; grep for `toast(` to find it).

**Completed variant:**
- Gold accent on border + gold ✓ stamp in top-right corner (lucide `CheckCircle2`, color `var(--ds-gold-400)`).
- Progress ring stays at 100% in gold.

**"Just unlocked" celebration (when `wasJustUnlocked` is true):**
- Subtle 2-second pulse animation on mount (Framer Motion `animate={{ scale: [1, 1.05, 1] }}`).

**Props:**
```jsx
<ChunkCard 
  chunk={chunkData}
  onTap={() => onOpenChunk(chunkData)}
  onLockedTap={() => toast('أكمل المجموعة السابقة بنسبة ٨٠٪ لفتح هذي')}
/>
```

### D.2 — `ChunkLane.jsx`

The horizontal-scrollable container.

**Layout:**
- Section header (above the lane):
  - Title (Tajawal bold, 20px): "رحلة المفردات"
  - Subtitle (Tajawal regular, 14px, opacity 0.7): "تعلّم الكلمات على مجموعات"
  - Inline pill row (right side on desktop / below title on mobile): chunk-size pills — ٥ / ١٠ / ١٥ / ٢٠ / ٢٥. The current value has filled background; others outline only. Tap → calls `setChunkSize(value)`.
- Lane container (the horizontal scroll area):
  - `display: flex; gap: 16px; overflow-x: auto; padding: 16px; scroll-snap-type: x mandatory;`
  - `touch-action: pan-x;` (allows vertical scroll on page while lane scrolls horizontally)
  - `scroll-behavior: smooth`
  - Each `<ChunkCard>` has `scroll-snap-align: start`
- Empty state (unit has no words): hide the entire lane (don't render).

**Auto-scroll on mount:**
- If `currentChunk` is not the first chunk, smooth-scroll the lane to bring `currentChunk` into view on initial render.

**Props:**
```jsx
<ChunkLane 
  unitId={unitId}
  profileId={profile.id}
  onOpenChunk={(chunk) => setActiveChunk(chunk)}
/>
```

Internally calls `useUnitChunks(unitId, profileId)`.

### D.3 — `ChunkMiniSession.jsx`

Full-screen modal opened when a chunk is tapped.

**Layout:**
- Header (top of modal):
  - Chunk title (large) + range label
  - Mastery summary: "أتقنت ٣ من ١٠ كلمات"
  - Close button (X) — top-left (RTL)
- Body — scrollable list of all words in the chunk:
  - Each row: word + Arabic definition + mastery state badge (3 states with color: new=neutral, learning=amber, mastered=emerald)
  - Small audio play button per row
- Footer (sticky bottom):
  - Single gold CTA: "ابدأ" (if un-mastered words remain) OR "كل الكلمات مكتملة 🎉" (if all mastered, scroll back to chunk lane on tap)

**On "ابدأ" tap:**
- Build a queue: all words in the chunk where `mastery_level !== 'mastered'`, in chunk order
- For each word in sequence:
  1. Open `WordExerciseModal` via the existing `setExerciseWord(wordObj)` callback (passed in as a prop from VocabularyTab)
  2. Wait for modal close
  3. Advance to next word
- After last word closes → render `<ChunkSessionComplete>` inline (replace the body of the ChunkMiniSession with the complete view)

**Important:** the queue runs inside this modal but uses VocabularyTab's existing WordExerciseModal — we don't duplicate modal logic. The orchestration is: ChunkMiniSession is the controller, WordExerciseModal is the per-word view, opened one at a time.

To make this work, expose a callback prop `onRequestNextWord: (wordObj, onClose) => void` from VocabularyTab. VocabularyTab implements it by calling `setExerciseWord(wordObj)` and listening for the modal close event to call `onClose`. The agent will need to read VocabularyTab's existing close-handling to wire this up correctly.

If a single-word-at-a-time pattern is too tangled with existing state, an alternative is acceptable: ChunkMiniSession mounts its OWN copy of the exercise UI internally, sharing the underlying `useWordExercise` hook. The agent decides based on what the existing code looks like.

**Props:**
```jsx
<ChunkMiniSession 
  chunk={chunkData}
  onClose={() => setActiveChunk(null)}
  onRequestNextWord={(wordObj, onClose) => { /* delegated */ }}
  onChunkUpdate={() => refetchChunks()}  // call after each word completes so mastery refreshes
/>
```

### D.4 — `ChunkSessionComplete.jsx`

Rendered inline inside ChunkMiniSession after the queue empties.

**Layout:**
- Subtle confetti burst
- Heading: chunk title + "خلصت!"
- Stats row:
  - عدد الكلمات
  - الكلمات اللي أتقنتها
  - تقدّم المجموعة (delta — show before/after mastery %)
- **If `chunk.masteryPct >= 80` (newly cleared the unlock threshold):**
  - Special banner: "🔓 المجموعة التالية مفتوحة!"
- Buttons:
  - "تابع للمجموعة التالية" (primary, if next chunk exists and is now unlocked)
  - "ارجع للوحدة" (secondary)

```bash
git add src/components/curriculum/journey/
git commit -m "feat(vocab-tab): journey lane components — ChunkCard + ChunkLane + ChunkMiniSession + ChunkSessionComplete"
git push origin main
```

---

## PHASE E — INTEGRATE INTO VocabularyTab

Open `src/pages/student/curriculum/tabs/VocabularyTab.jsx`.

**Insert `<ChunkLane>` immediately below `<HeroSection>` and above the existing `libraryRef`-attached block.**

```jsx
return (
  <div className="vocabulary-tab">
    <HeroSection
      unitId={unitId}
      studentId={profile.id}
      onOpenWord={handleHeroOpenWord}
      onScrollToLibrary={handleScrollToLibrary}
    />
    
    {/* === NEW: Journey Lane === */}
    <ChunkLane
      unitId={unitId}
      profileId={profile.id}
      onOpenChunk={(chunk) => setActiveChunk(chunk)}
    />
    
    {/* === EXISTING content unchanged === */}
    <div ref={libraryRef}>
      {/* legacy ProgressRing, StatsRow, FilterBar, word grid, Quick Practice — UNTOUCHED */}
    </div>
    
    {/* === NEW: ChunkMiniSession modal === */}
    {activeChunk && (
      <ChunkMiniSession
        chunk={activeChunk}
        onClose={() => setActiveChunk(null)}
        onRequestNextWord={handleRequestNextWordInChunk}
        onChunkUpdate={refetchChunks}
      />
    )}
  </div>
);
```

**Wire up `handleRequestNextWordInChunk`:**
- Inspect how WordExerciseModal's open/close cycle currently works
- The simplest reliable pattern: 
  - When `setExerciseWord(wordObj)` is called, also store an `onCloseCallback`
  - Modify the existing close handler to invoke `onCloseCallback()` if present
  - ChunkMiniSession passes a callback that advances its queue

If the close-event plumbing is too brittle, fall back to the alternative noted in D.3 (ChunkMiniSession internally renders the exercise UI). Document the choice in the final report.

```bash
git add src/pages/student/curriculum/tabs/VocabularyTab.jsx
git commit -m "feat(vocab-tab): mount ChunkLane + ChunkMiniSession below Hero (additive)"
git push origin main
```

---

## PHASE F — HERO ↔ JOURNEY COORDINATION (small extension to Prompt 05 hook)

The Continue Arc's `next_word` path currently picks from the whole unit's un-mastered words. Now that chunks exist, it should prefer words from the **current chunk in progress** (first non-completed unlocked chunk).

Extend `useUnitVocabStatus` (the Prompt 05 hook):
- Add a parallel sub-query that figures out `currentChunkStart` and `currentChunkEnd` indices using `preferred_chunk_size` and the same slice logic as `useUnitChunks`
- When deriving `continueAction.payload.vocabularyId`, prefer un-mastered words within `[currentChunkStart, currentChunkEnd]` before falling back to unit-wide
- If the current chunk is fully mastered, advance to the next unlocked chunk

This keeps the Hero coherent with the new chunk reality — the Continue Arc says "ابدأ كلمة جديدة" and opens a word from the chunk the student is actively in.

```bash
git add src/hooks/useUnitVocabStatus.js
git commit -m "feat(vocab-tab): Hero Continue Arc respects current chunk context"
git push origin main
```

---

## PHASE G — MOBILE RESPONSIVE PASS

Test at: 380 / 414 / 768 / 1024 / 1440 / 1920 px.

Checklist:
- [ ] Chunk cards swipe horizontally on mobile without blocking vertical scroll
- [ ] Chunk-size pills wrap / shrink appropriately at 380px
- [ ] ChunkMiniSession modal fills screen on mobile, comfortable padding on desktop
- [ ] ChunkSessionComplete confetti not janky on low-end devices (test with Chrome DevTools 4x CPU throttle)
- [ ] Locked-chunk tap target ≥44px on mobile
- [ ] Section header readable in RTL — Tajawal Arabic rendering correct

Commit only if fixes needed:
```bash
git commit -m "fix(vocab-tab): journey lane responsive at <breakpoint>"
```

---

## PHASE H — SMOKE TEST + FINAL REPORT

### H.1 — Live verification on Vercel deploy

Pick a student with at least one unit started:

1. Open a unit's Vocabulary tab
2. Verify Hero still works (Prompt 05 not broken)
3. Verify Journey Lane appears below Hero, scrolls horizontally
4. Verify chunk count = `ceil(unit_word_count / 10)` (or whatever default chunk_size is)
5. Verify chunk 1 is unlocked; chunks 2+ locked if chunk 1 < 80%
6. Change chunk size pill to 5 — verify the lane re-slices into more, smaller chunks
7. Tap chunk 1 → ChunkMiniSession opens with the chunk's words listed
8. Tap "ابدأ" → WordExerciseModal opens on first un-mastered word
9. Complete the modal → ChunkMiniSession advances to next un-mastered word
10. Close ChunkMiniSession → chunks refetch, mastery updates visibly
11. Continue Arc in Hero now shows next un-mastered word from this chunk (not jumped to a random unit word)

### H.2 — DB sanity

```sql
SELECT preferred_chunk_size FROM profiles WHERE id = '<test-student>';
-- Confirm: updated to whichever pill was tapped last
```

### H.3 — Final report

Write `docs/vocab-section/PHASE-G-JOURNEY-LANE-REPORT.md`:

```markdown
# Journey Lane — Final Report

## Phase A discovery summary
- Existing chunk code: <none | partial — paths and decision>
- Join path confirmed: curriculum_vocabulary.reading_id → curriculum_readings.id (unit_id, order_col)

## Files created
- src/hooks/useUnitChunks.js
- src/components/curriculum/journey/ChunkCard.jsx
- src/components/curriculum/journey/ChunkLane.jsx
- src/components/curriculum/journey/ChunkMiniSession.jsx
- src/components/curriculum/journey/ChunkSessionComplete.jsx

## Files modified
- src/pages/student/curriculum/tabs/VocabularyTab.jsx (additive)
- src/hooks/useUnitVocabStatus.js (Continue Arc chunk-aware)

## Migration
- profiles.preferred_chunk_size added

## Smoke results
- [ ] Lane renders with N chunks
- [ ] Sequential unlock at 80% verified
- [ ] Chunk size change updates lane
- [ ] Mini-session queue advances through un-mastered words
- [ ] Continue Arc prefers current chunk

## Word queue wiring
- Approach taken: <"delegated via onCloseCallback prop" | "internal copy of exercise UI">
- Reason: <one-line justification>

## Deferred / known gaps
- Legacy ProgressRing duplicate still below Hero — Prompt 07 removes
- Auto-themed chunk titles deferred (using "المجموعة الأولى" etc. for now)
- Floating settings gear still pending — Prompt 08 wraps preferences
```

```bash
git add docs/vocab-section/PHASE-G-JOURNEY-LANE-REPORT.md
git commit -m "docs(vocab-tab): journey lane final report"
git push origin main
```

---

## ⚠️ HARD RULES (RECAP)

1. Strictly additive — existing VocabularyTab content untouched below the new Journey Lane insertion point.
2. `mastery_level` is TEXT.
3. `student_id` for student-data queries.
4. Unit→vocab via `curriculum_readings.unit_id`.
5. Hooks at top of components.
6. Atomic phase commits, push after each.
7. Design tokens only.
8. Horizontal scroll respects vertical page scroll (touch-action: pan-x).
9. No vite build locally.
10. The Continue Arc in the Hero must continue to work after Prompt 06.

Begin Phase A.
