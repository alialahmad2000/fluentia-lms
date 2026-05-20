# VOCAB PREMIUM — PROMPT 07 — WORD LIBRARY + WORD DETAIL SHEET

> Part 7 of 8 in the Premium Vocabulary rebuild series.
> The payoff prompt — surfaces all 4 enrichment columns in a premium drawer.
> Also performs the long-deferred cleanup: removes the duplicate legacy Hero block (ProgressRing + StatsRow) that's sat below the new Hero through Prompts 05–06.

---

## 🎯 GOAL — END STATE

When a student opens any unit's Vocabulary tab and taps a word card:

1. **Word Detail Sheet** opens (bottom drawer on mobile, side panel on desktop) with six sections:
   - Header: word + IPA + audio + mastery badge
   - **التعريف**: Arabic definition + example sentence + sentence audio
   - **التحذير من النطق**: pronunciation alert (conditional — only if data present) with red-tinted card, explanation, practice tip, similar words, severity badge
   - **مرادفات ومتضادات**: CEFR-color-coded chip rows with ⭐ for strongest and "تعرفها ✓" badge for words student already knows
   - **عائلة الكلمة**: 4-column table (فعل/اسم/صفة/حال), base⭐ + opposite↔ flags, tap-chip for morphology affix explanation
   - **التقدم**: 3 exercise mastery dots + SRS personal stats (next due, lapses, difficulty)
   - **CTA row** (sticky bottom): "تدرّب على هذي الكلمة" (primary, opens WordExerciseModal) + "أضفها للمراجعة الفورية" (secondary, sets SRS due=NOW)
2. **"صعبة" filter pill** added to the existing filter bar — surfaces this student's hard words within the unit (reads from Hard Words classification).
3. **Duplicate legacy Hero removed**: the old "① HERO HEADER" block (ProgressRing + StatsRow) is finally deleted. The new Hero from Prompt 05 owns this real estate.
4. Existing grid/list/search/Quick Practice flow continues to work — tapping a card no longer opens WordExerciseModal directly; it opens the Detail Sheet, and practice happens via the sticky CTA inside.
5. No regression on chunks, Continue Arc, SRS, Hard Words, or the existing mastery/XP system.

---

## 🧭 FOUNDATION (already in place)

- VocabularyTab: `src/pages/student/curriculum/tabs/VocabularyTab.jsx`
- HeroSection at top; ChunkLane below; legacy duplicate block below that (to be removed in this prompt)
- WordExerciseModal opens via `setExerciseWord(wordObj)` with `exerciseCloseCallbackRef` queue mechanism from Prompt 06
- Hard Words service: `src/services/hardWords.ts` — `getHardWords(studentId, limit?)` for classification
- SRS service: `src/services/srs.ts` — for per-word due/lapses/difficulty reads
- Curriculum vocab columns confirmed:
  - `definition_ar` (NOT `meaning_ar`)
  - `synonyms` JSONB
  - `antonyms` JSONB
  - `word_family` JSONB (rich morphology object — see Track B notes)
  - `pronunciation_alert` JSONB (uses `correct_approximation_ar` / `common_mispronunciation_ar` per Track C)
  - `audio_url`
  - `example_sentence`
  - `level`
- Mastery level is TEXT: `'new' | 'learning' | 'mastered'`
- `student_id` for student-data queries (= profile.id = auth.uid())

---

## ⚠️ NON-NEGOTIABLE

1. **The Detail Sheet must not break the chunks queue.** The queue from Prompt 06 calls `setExerciseWord(wordObj)` directly. After Prompt 07, the tap-on-card path opens the Detail Sheet, but the chunks queue still calls `setExerciseWord` directly to keep its sequential flow. Two entry points, one shared modal.
2. **Sheet content reads from the already-fetched word row.** Don't add per-word DB queries for synonyms/antonyms/word_family/pronunciation_alert — they're in the row. Only SRS personal stats need a fresh query.
3. **Empty enrichment states**: every enrichment section gracefully handles NULL / empty JSONB. Words at L0/L2/L4/L5 (where enrichment hasn't run) show "—" or a polite "ما عندنا ... لهالكلمة بعد" message — never broken layout, never an error.
4. **`mastery_level` is text** — never compare to numeric.
5. **`student_id` for all SRS reads.**
6. **Atomic phase commits** + push after each. Vercel auto-deploys.
7. **Mobile-first**: drawer slides up smoothly, swipe-down-to-close, no layout shift, 60fps on mid-range phones.
8. **Field name flexibility**: the agent in Phase A.2 must inspect the actual JSONB shape of all 4 enrichment columns in production. Field names may differ from spec (e.g., word_family items may use `pos` not `part_of_speech`, `level` not `cefr_level`, `vocabulary_id` not `known_word_id`). Match production exactly.

---

## PHASE A — DISCOVERY (15 min, read-only)

### A.1 — Existing library structure

```bash
# Locate the existing word card component and filter bar
grep -rln "WordCard\|word.*card\|FilterBar\|filter.*pill" src/components/curriculum/ 2>/dev/null

# Locate the legacy ProgressRing + StatsRow (the duplicate to delete)
grep -rln "ProgressRing\|StatsRow" src/components/curriculum/ src/pages/student/curriculum/ 2>/dev/null

# Identify the search input
grep -rn "searchQuery\|search.*input" src/pages/student/curriculum/tabs/VocabularyTab.jsx 2>/dev/null
```

Print:
- WordCard file path + how it currently opens the modal
- Filter pill component path + how the filter state is managed
- Legacy ProgressRing / StatsRow location (these are the deletion targets)

### A.2 — Inspect ACTUAL enrichment JSONB shapes in production

Run for a word that has all four populated:

```sql
SELECT 
  word, 
  definition_ar,
  example_sentence,
  audio_url,
  synonyms,
  antonyms,
  word_family,
  pronunciation_alert
FROM curriculum_vocabulary
WHERE synonyms IS NOT NULL
  AND antonyms IS NOT NULL  
  AND word_family IS NOT NULL
  AND pronunciation_alert IS NOT NULL
LIMIT 3;
```

Pretty-print the JSONB blobs. The agent uses these as ground truth for rendering — every field accessed in the Detail Sheet UI must match exactly what's in production. Notable expected differences from spec:
- Word family items likely use `pos` not `part_of_speech`, `level` not `cefr_level`, `vocabulary_id` not `known_word_id`
- Pronunciation alert uses `correct_approximation_ar` / `common_mispronunciation_ar` (NOT `correct_ar` / `wrong_ar`)
- Synonyms/antonyms items may have only `word`, `cefr_level`, `is_strongest`, `vocabulary_id` (no `meaning_ar` per item — that's intentional)

Document the exact field names from production samples in the final report.

### A.3 — Audio playback pattern

```bash
# Find how audio is currently played in the existing word cards
grep -rn "audio_url\|new Audio\|HTMLAudio" src/components/curriculum/ src/components/vocabulary/ 2>/dev/null | head -10
```

If there's an audio hook (`useAudio`, `useWordAudio`, etc.), reuse it in the Detail Sheet.

### A.4 — Mastery exercise mapping

```bash
# Look at vocabulary_word_mastery — how are the 3 exercises identified?
```

```sql
SELECT DISTINCT exercise_type FROM vocabulary_word_mastery LIMIT 10;
```

The Detail Sheet's "3 exercise dots" needs to know which exercise types exist (e.g., `meaning_mcq`, `complete_sentence`, `listen_choose` — or whatever the production strings are).

Print findings. Proceed.

---

## PHASE B — WORD DETAIL SHEET COMPONENT

All new files in `src/components/curriculum/word-detail/`.

### B.1 — `WordDetailSheet.jsx` (main composer)

**Layout adaptive to viewport:**

**Mobile (<768px)** — bottom drawer:
- Slides up from bottom (Framer Motion `initial={{ y: '100%' }} animate={{ y: 0 }}`)
- 85% viewport height
- Swipe down (drag gesture, drag past 30% → close)
- Top: small drag handle (rounded pill, neutral color, 4px tall × 40px wide, centered)
- X button top-right corner

**Desktop (≥768px)** — side panel:
- Slides in from the **left** edge (RTL) — width 480px
- Full viewport height
- X button top-right

**Backdrop:**
- Both modes: `rgba(0, 0, 0, 0.6)` with `backdrop-filter: blur(8px)`
- Tap backdrop → close

**Content (vertically scrollable):**

#### B.1.a — Header block
- Word in large English (text-3xl, Readex Pro Bold) — left/start on RTL
- Audio play button (Lucide `Volume2`, 32px) — tap → play `audio_url`. Spinning indicator while loading. Visual feedback on play (ring pulse around icon).
- IPA below word in monospace (text-sm, opacity 0.7)
- Mastery badge top-right of header:
  - `mastery_level === 'mastered'` → emerald pill "أتقنت" with check icon
  - `mastery_level === 'learning'` → amber pill "تتعلم" 
  - `mastery_level === 'new'` or no mastery row → neutral pill "جديدة"

#### B.1.b — `<DefinitionSection>` 
- Heading: "التعريف" (Tajawal Bold 16px, opacity 0.8, with small icon)
- Body: `definition_ar` in Tajawal Regular 20px
- Sub-heading: "جملة مثال" (smaller)
- Example: `example_sentence` in English italics (Readex Pro Italic)
- Audio button next to the example sentence — plays the sentence audio if a separate audio URL exists for the sentence (check schema; if no separate URL, omit this button — only word audio in header)

#### B.1.c — `<PronunciationSection>` (CONDITIONAL — only render if `pronunciation_alert IS NOT NULL`)
- Heading: "⚠️ تحذير في النطق" (red icon)
- Red-tinted card (`bg-red-500/10 border-red-500/20`)
- Top row: 
  - "النطق الصحيح:" + `correct_approximation_ar` (large, bold)
  - "لا تنطقها:" + `common_mispronunciation_ar` (struck-through red)
- Body: `explanation_ar` (Tajawal Regular 16px)
- Yellow tip box: 💡 + `practice_tip_ar`
- Similar words: heading "كلمات لها نفس النمط:" + chip row of `similar_words` (each chip clickable — opens that word's Detail Sheet via recursive open IF the word exists in `curriculum_vocabulary`, otherwise just visual)
- Severity badge (top-right of section): high/medium/low — color-coded pill in Arabic ("خطر عالي" / "متوسط" / "منخفض")
- Rule category badge (small, monospace, below severity): "نمط: silent_letter" or whichever category

#### B.1.d — `<RelationshipsSection>` (Synonyms + Antonyms)
- Two sub-blocks, stacked on mobile, side-by-side on ≥1024px

**مرادفات (Synonyms):**
- Heading: "مرادفات" with small "🔄" icon
- Chip row — each chip:
  - Chip content: synonym word (English) + small CEFR badge
  - CEFR badge color (per `cefr_level` or `level` field — confirm in Phase A.2):
    - 1 (A1) — emerald
    - 2 (A2) — green
    - 3 (B1) — blue
    - 4 (B2) — amber
    - 5 (C1/C2) — red
  - If `is_strongest` → small ⭐ next to the chip
  - If `vocabulary_id` (or `known_word_id`) is non-null → small green "✓" badge with tooltip "تعرفها"
  - Tap chip → if it has a vocabulary_id, open that word's Detail Sheet (recursive); otherwise just show inline a small tooltip with chip details

**متضادات (Antonyms):**
- Same structure as synonyms
- Heading: "متضادات" with "↔" icon

**Empty state for either:**
- "ما عندنا [مرادفات/متضادات] لهالكلمة بعد" in small muted text

#### B.1.e — `<WordFamilySection>`
- Heading: "عائلة الكلمة" with small "🌳" icon  
- 4-column table layout:
  | فعل | اسم | صفة | حال |
  |---|---|---|---|
  | <chips matching pos='verb'> | <pos='noun'> | <pos='adjective'> | <pos='adverb'> |
- Use whichever POS field name production uses (likely `pos`, but confirm in Phase A.2)
- Each chip:
  - Base derivative (`is_base === true`) → ⭐ next to it, gold border
  - Opposite (`is_opposite === true`) → ↔ next to it
  - Has `vocabulary_id` / `known_word_id` → small ✓ badge "تعرفها"
- Tap chip → opens small popover/tooltip showing the morphology object's `rule_ar` ("لاحظ كيف صار اسم بإضافة -tion" etc.) + `similar_examples` chip row
- Empty state: "ما عندنا عائلة كلمات لهالكلمة بعد"

**Mobile fallback:** if the 4-column table is too tight at 380px, stack POS rows vertically with each row labeled.

#### B.1.f — `<ProgressSection>`
- Heading: "تقدّمك مع هذي الكلمة"
- Row 1 — three exercise mastery dots (read `vocabulary_word_mastery` rows for this student × word):
  - For each of the 3 exercise types (use the types found in A.4):
    - Filled circle (emerald) if that exercise is mastered
    - Half-filled (amber) if in progress (some attempts but not mastered)
    - Empty (neutral) if not attempted
  - Label below each dot in small Arabic: "اختيار المعنى" / "إكمال الجملة" / "استمع واختر" (adapt to production exercise types)
- Row 2 — SRS personal stats (call a small new helper `getWordSrsStats(studentId, vocabularyId)` → returns `{ due, lapses, difficulty } | null`):
  - "الموعد القادم للمراجعة:" → formatted Arabic date (e.g., "بعد ٣ أيام") — or "—" if no SRS row exists for this word/student
  - "مرّات السقوط:" → `lapses` count
  - "الصعوبة:" → 5-dot visual scaled from `difficulty / 2` (FSRS difficulty is 0–10, map to 0–5 dots; filled emerald for low difficulty, amber for medium, red for high)

#### B.1.g — `<CtaRow>` (sticky bottom)
- Primary button: "تدرّب على هذي الكلمة" — full-width on mobile, half-width on desktop. Gold gradient. Tap → close Detail Sheet AND open WordExerciseModal via the parent's `setExerciseWord(wordObj)`.
- Secondary button: "أضفها للمراجعة الفورية" — outline style. Tap → updates `curriculum_vocabulary_srs.due = NOW()` for this (student, word), refetches Hero status, shows toast "أُضيفت للمراجعة اليومية ✓". If no SRS row exists yet, INSERT one with FSRS defaults.

**Props:**
```jsx
<WordDetailSheet
  word={wordObj}             // full curriculum_vocabulary row + mastery state
  studentId={profile.id}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onRequestPractice={(w) => { onClose(); setExerciseWord(w); }}
  onAddToReview={async (vocabId) => { /* set SRS due=NOW */ }}
/>
```

### B.2 — Helper: `getWordSrsStats(studentId, vocabularyId)`

Add to `src/services/srs.ts`:

```typescript
export async function getWordSrsStats(studentId: string, vocabularyId: string): Promise<{
  due: Date | null;
  lapses: number;
  difficulty: number;
} | null> {
  const { data, error } = await supabase
    .from('curriculum_vocabulary_srs')
    .select('due, lapses, difficulty')
    .eq('student_id', studentId)
    .eq('vocabulary_id', vocabularyId)
    .maybeSingle();
  if (error) throw error;
  return data ? { due: data.due ? new Date(data.due) : null, lapses: data.lapses, difficulty: data.difficulty } : null;
}

export async function addWordToImmediateReview(studentId: string, vocabularyId: string): Promise<void> {
  // Upsert: if SRS row exists, set due=NOW. If not, insert with FSRS defaults + due=NOW.
  // Use .select() after .update() / .insert() per project rule
}
```

```bash
git add src/components/curriculum/word-detail/ src/services/srs.ts
git commit -m "feat(vocab-tab): WordDetailSheet — surfaces all 4 enrichments + SRS personal stats + practice CTA"
git push origin main
```

---

## PHASE C — ADD "صعبة" FILTER PILL

The existing filter bar likely has: الكل / جديدة / تتعلم / أتقنتها (or similar). Add a 5th pill: **صعبة**.

### Logic:
- When "صعبة" is selected, the word grid filters to words classified as hard for this student
- Reuse `getHardWords(studentId)` from `src/services/hardWords.ts`
- But scope to the current unit only: intersect the hard-words result with this unit's words

### Implementation:
- Find the filter pill component (Phase A.1)
- Add a new pill labeled "صعبة" with a small flame icon (Lucide `Flame`)
- Hook the filter logic: when this pill is active, filter the visible words by hard-word ids
- The hard-words query result is small (typically <50 items), so client-side intersection is fine
- Use TanStack `useQuery(['hard-words-for-unit', unitId, profileId])` with the same `studentId` source

If the unit has zero hard words → render the pill with grayed-out / muted styling and a tooltip "ما عندك كلمات صعبة في هذي الوحدة الآن".

```bash
git add src/components/curriculum/
git commit -m "feat(vocab-tab): 'صعبة' filter pill scoped to unit hard words"
git push origin main
```

---

## PHASE D — REWIRE TAP BEHAVIOR

Currently tapping a word card opens WordExerciseModal directly (via `setExerciseWord`). Change to open the Detail Sheet first.

### D.1 — In VocabularyTab.jsx:

```jsx
const [detailSheetWord, setDetailSheetWord] = useState(null);

const handleCardTap = (wordObj) => {
  setDetailSheetWord(wordObj);
};

const handleSheetPracticeRequest = (wordObj) => {
  setDetailSheetWord(null);
  setExerciseWord(wordObj);  // existing path
};

// ... existing JSX ...

{detailSheetWord && (
  <WordDetailSheet
    word={detailSheetWord}
    studentId={profile.id}
    isOpen={true}
    onClose={() => setDetailSheetWord(null)}
    onRequestPractice={handleSheetPracticeRequest}
    onAddToReview={addWordToImmediateReview}
  />
)}
```

### D.2 — Update WordCard:

Change its tap handler to call the parent's `handleCardTap` instead of opening the modal directly.

### D.3 — DO NOT modify the chunks queue path

The ChunkMiniSession from Prompt 06 uses `setExerciseWord(wordObj)` directly with the `exerciseCloseCallbackRef` queue. This path must continue to work. The Detail Sheet is the NEW path for direct card taps; the chunks queue is the EXISTING path for sequential drilling within a chunk.

Two entry points to the same WordExerciseModal:
- **Detail Sheet "تدرّب" button** → close sheet, set exercise word (one-off, no queue)
- **Chunks "ابدأ" button** → queue runs, each iteration sets exercise word + callback ref

The agent verifies both paths still work in Phase G smoke.

```bash
git add src/pages/student/curriculum/tabs/VocabularyTab.jsx src/components/curriculum/
git commit -m "feat(vocab-tab): tap-card opens WordDetailSheet; practice via sheet CTA preserves chunks queue"
git push origin main
```

---

## PHASE E — CLEANUP: REMOVE THE LEGACY DUPLICATE HERO BLOCK

This is the long-deferred cleanup. The legacy "① HERO HEADER" block (ProgressRing + StatsRow + possibly related UI) below the new Hero is now redundant. Remove it.

### E.1 — Identify the exact code lines

From Phase A.1, locate the legacy ProgressRing + StatsRow component(s) in VocabularyTab.jsx. Confirm:
- They render the same data the new Hero renders
- Nothing else depends on them (no other component imports them)
- The `libraryRef` ref attached during Prompt 05 needs to be moved to whatever element is now at the top of the post-Hero content (probably the filter bar)

### E.2 — Delete

Remove the JSX block. If the components are not imported elsewhere, delete the component files too (`git rm`).

Move `libraryRef` to the next top-level element below the chunks lane (the filter bar's wrapper).

### E.3 — Verify the Hero's Continue Arc still scrolls correctly

The Continue Arc's `'celebrate'` and `'start_exploration'` actions scroll to `libraryRef`. After the move, verify it scrolls to a sensible position (just above the filter bar).

```bash
git rm src/components/curriculum/<legacy ProgressRing files>
git add src/pages/student/curriculum/tabs/VocabularyTab.jsx
git commit -m "chore(vocab-tab): remove duplicate legacy Hero block (ProgressRing + StatsRow now in new Hero)"
git push origin main
```

---

## PHASE F — MOBILE RESPONSIVE PASS

Breakpoints: 380 / 414 / 768 / 1024 / 1440 / 1920 px.

Detail Sheet checklist:
- [ ] Bottom drawer on mobile slides up smoothly, swipe-down closes
- [ ] Side panel on desktop slides in from RTL-start edge
- [ ] Backdrop covers full viewport, tap closes
- [ ] All sections readable at 380px without horizontal scroll
- [ ] Word Family 4-column table degrades gracefully at narrow widths
- [ ] Pronunciation alert red card doesn't overflow
- [ ] CTA row sticky at bottom on mobile, full-width buttons
- [ ] Backdrop blur doesn't kill performance on mid-range phones
- [ ] Tap targets ≥44px on mobile

Library + filter pill checklist:
- [ ] "صعبة" pill visible alongside existing filter pills
- [ ] Pill row wraps at narrow widths instead of horizontal scroll

Commit only if fixes needed:
```bash
git commit -m "fix(vocab-tab): detail sheet responsive at <breakpoint>"
```

---

## PHASE G — SMOKE TEST + FINAL REPORT

### G.1 — Live verification on Vercel deploy

1. Open a unit's Vocabulary tab as a real student
2. Tap any word → Detail Sheet opens (mobile = drawer, desktop = panel)
3. Verify each section renders correctly:
   - [ ] Header (word + IPA + audio + mastery badge)
   - [ ] Definition with example sentence
   - [ ] Pronunciation alert (test a word with alert + a word without — both gracefully)
   - [ ] Synonyms / Antonyms (test a word with both + one with neither — gracefully)
   - [ ] Word Family table — test a word with full family + one without
   - [ ] Progress section (mastery dots + SRS stats — test a word with no SRS row → shows "—" for next review)
4. Tap "تدرّب على هذي الكلمة" → sheet closes, WordExerciseModal opens for that word
5. Tap "أضفها للمراجعة الفورية" → toast appears, Hero's status pill updates after the page revalidates
6. Open a chunk → tap "ابدأ" → verify chunks queue still works (this is the regression check)
7. Switch filter to "صعبة" → verify only hard words shown (or empty state if none)
8. Verify the legacy duplicate Hero block is GONE — only the new Hero appears at top

### G.2 — Final report

Write `docs/vocab-section/PHASE-H-WORD-DETAIL-REPORT.md`:

```markdown
# Word Detail Sheet + Library Premium — Final Report

## Phase A discovery summary
- WordCard at: <path>
- Filter bar at: <path>
- Legacy ProgressRing + StatsRow at: <path> — REMOVED in Phase E
- Audio playback pattern: <reused existing hook | created new>
- Exercise mastery types in production: <list>

## Production JSONB field names (used in Detail Sheet)
- synonyms[]: word, cefr_level (or level), is_strongest, vocabulary_id (or known_word_id)
- antonyms[]: <same>
- word_family.derivatives[]: word, pos (or part_of_speech), level (or cefr_level), is_base, is_opposite, vocabulary_id, morphology
- pronunciation_alert: correct_approximation_ar, common_mispronunciation_ar, explanation_ar, practice_tip_ar, similar_words, severity, rule_category, problem_letters

## Files created
- src/components/curriculum/word-detail/WordDetailSheet.jsx
- src/components/curriculum/word-detail/DefinitionSection.jsx
- src/components/curriculum/word-detail/PronunciationSection.jsx
- src/components/curriculum/word-detail/RelationshipsSection.jsx
- src/components/curriculum/word-detail/WordFamilySection.jsx
- src/components/curriculum/word-detail/ProgressSection.jsx
- src/components/curriculum/word-detail/CtaRow.jsx

## Files modified
- src/pages/student/curriculum/tabs/VocabularyTab.jsx (tap rewire + libraryRef move + legacy removal)
- src/services/srs.ts (getWordSrsStats + addWordToImmediateReview)
- <WordCard path> (tap handler delegates to parent)
- <filter bar path> ("صعبة" pill added)

## Files removed
- <legacy ProgressRing files>

## Smoke results
- [ ] Detail Sheet opens with all 6 sections
- [ ] Practice CTA reaches WordExerciseModal
- [ ] Add-to-review writes to SRS
- [ ] Chunks queue still works (regression check)
- [ ] "صعبة" filter functional
- [ ] Legacy duplicate Hero block gone

## Deferred to Prompt 08
- Floating settings gear (preferences drawer)
- Onboarding tour (3-step intro on first-ever open)
- Skeleton loaders for each section
- Smart nudge notifications
- Accessibility (ARIA, keyboard nav, prefers-reduced-motion)
- Performance pass (lazy-load heavy sections, virtualize library if >50 words)
```

```bash
git add docs/vocab-section/PHASE-H-WORD-DETAIL-REPORT.md
git commit -m "docs(vocab-tab): word detail sheet + library final report"
git push origin main
```

---

## ⚠️ HARD RULES (RECAP)

1. Two paths to WordExerciseModal coexist: tap-card → Detail Sheet → "تدرّب" CTA, AND chunks queue → direct setExerciseWord. Both must work.
2. Detail Sheet renders from already-fetched word row data — no extra queries except SRS personal stats.
3. Every enrichment section has a graceful empty state for words without that enrichment.
4. `mastery_level` is TEXT; `student_id` for student-data; production JSONB field names from Phase A.2 (not spec assumptions).
5. Hooks at top of components.
6. .select() after .update() / .insert().
7. Atomic phase commits + push after each.
8. Design tokens only.
9. Mobile responsive at 380–1920px.
10. No vite build locally.

Begin Phase A.
