# VOCAB PREMIUM — PROMPT 05 — VOCAB TAB HERO SHELL

> Part 5 of 8 in the Premium Vocabulary rebuild series.
> The centerpiece begins. Adds the premium sticky Hero block to every unit's Vocabulary tab.
> **Strictly additive** — does NOT modify existing VocabularyTab content. The hero block is prepended; existing word grid/list/filter UI stays exactly where it is. Prompts 06–08 reshape the content below.

---

## 🎯 GOAL — END STATE

When a student opens any unit and switches to the Vocabulary tab:

1. **Premium sticky Hero** appears at the top, containing:
   - **Progress Orb** — large animated SVG ring showing unit mastery % (computed from `vocabulary_word_mastery` for this unit's words)
   - **Smart Status Pill** — concise live status: "اليوم: ٣ مراجعة + كلمة جديدة" or "✓ كل شيء تم"
   - **Continue Arc** — single dominant gold CTA that smart-resumes (next un-mastered word in unit, or "due review" if SRS has cards due for this unit's words)
2. Hero collapses gracefully on mobile (vertical stack, smaller orb).
3. Below the hero: existing VocabularyTab content unchanged — same word grid/list, same filter bar, same Quick Practice button. Prompts 06–08 reshape this; not 05's job.
4. No regression on the 18% unit-progress weight, the existing exercise modal, or any mastery/XP flow.

---

## 🧭 FOUNDATION (already in place)

- Vocab mastery: `vocabulary_word_mastery` table (per-student, per-word, per-exercise). Master = 3 levels (new/learning/mastered).
- FSRS: `src/services/srs.ts` — call `getDueCount(studentId)` for system-wide; for unit-scoped due count we need a small new query.
- Curriculum vocab table: `curriculum_vocabulary` with `id`, `word`, `definition_ar` (NOT `meaning_ar`), `unit_id`, `audio_url`, `level`.
- SRS table: `curriculum_vocabulary_srs` with `student_id`, `vocabulary_id`, `due`, `state`.
- Existing VocabularyTab path: confirm via Phase A — likely `src/components/curriculum/VocabularyTab.jsx`.
- Existing exercise modal: WordExerciseModal — opened on word card click.
- Design tokens: `var(--ds-*)`, `var(--tr-*)`. Tajawal for Arabic, Readex Pro for English. RTL-safe.

---

## ⚠️ NON-NEGOTIABLE

1. **Strictly additive.** Do not delete or modify the existing VocabularyTab JSX below where the Hero is inserted. Existing word grid, list view, filter pills, search, Quick Practice — all untouched.
2. **Hooks at top of every component.**
3. **`student_id` for SRS reads. `profile.id`/`user_id` for mastery reads** — check existing VocabularyTab to match its current pattern (audit + Prompt 03 found schema drift; verify per query).
4. **`.select()` after every `.update()`** — though Prompt 05 is mostly reads.
5. **Atomic phase commits** + push after each phase.
6. **Design tokens only.** No raw hex.
7. **Mobile-first.** Hero must look premium at 380px viewport (small phones) AND at 1920px (desktop).
8. **Performance.** The Hero adds 3–5 queries per unit-tab-open. Use TanStack `useQuery` with cache, batch where possible.

---

## PHASE A — DISCOVERY (10 min, read-only)

### A.1 — Locate VocabularyTab + parent

```bash
# Find VocabularyTab and where it's mounted
grep -rln "VocabularyTab" src/ 2>/dev/null
# Find the curriculum unit detail page (parent)
grep -rE "<VocabularyTab" src/ 2>/dev/null
# Identify what data the parent passes down (unit, words, etc.)
```

Open the existing VocabularyTab file. Note:
- Current props (likely `unit` or `unitId`, possibly `words` list)
- Current JSX structure (existing sections like ProgressRing, StatsRow, FilterBar, Word cards, Quick Practice button)
- Current hooks used (useVocabularyMastery, etc.)
- Where the "right place" is to insert the Hero — top of the rendered JSX, but BEFORE existing ProgressRing if that exists (the new Progress Orb replaces it visually but the existing one stays in code temporarily — Prompt 07 removes the duplicate)

If an existing `ProgressRing` is already at the top doing similar work, the new Hero supersedes it visually but **leave the old one in place** behind/below the new hero. Prompt 07 will remove the duplicate cleanly. This avoids breaking anything in Prompt 05.

### A.2 — Confirm enrichment column for live word counts

```sql
-- Confirm definition_ar exists (not meaning_ar)
SELECT column_name FROM information_schema.columns
WHERE table_name='curriculum_vocabulary' AND column_name IN ('definition_ar','meaning_ar');

-- Verify vocabulary_word_mastery shape
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='vocabulary_word_mastery'
ORDER BY ordinal_position;
```

### A.3 — Design tokens sanity

```bash
# Find the design token file(s)
grep -rln "ds-gold\|--ds-" src/styles/ src/index.css 2>/dev/null
# Confirm the token names actually used in the codebase
grep -rE "var\(--ds-" src/components/ | awk -F'var\\(' '{print $2}' | awk -F'\\)' '{print $1}' | sort -u
```

Print findings. Proceed.

---

## PHASE B — DATA HOOK

Create `src/hooks/useUnitVocabStatus.js`. Single hook that returns everything the Hero needs:

```typescript
interface UnitVocabStatus {
  // For Progress Orb
  totalWords: number;
  masteredWords: number;       // mastery_level = 3
  learningWords: number;       // mastery_level in (1,2)
  newWords: number;             // not yet started
  masteryPct: number;           // 0..100, derived

  // For Smart Status Pill
  dueForReviewToday: number;    // FSRS cards due where vocabulary_id is in this unit
  newCardsAvailableToday: number; // FSRS new cards in this unit's range respecting profile.srs_daily_new_cards
  
  // For Continue Arc — the next action
  continueAction: {
    label: string;              // Arabic text for the button
    target: 'srs_review' | 'next_word' | 'celebrate' | 'start_exploration';
    payload?: { vocabularyId?: string; route?: string };
  };
  
  isLoading: boolean;
  refetch: () => void;
}
```

**Internal queries (parallel via Promise.all or react-query parallel useQueries):**

1. Unit words: `SELECT id FROM curriculum_vocabulary WHERE unit_id = $1`
2. Mastery for this student × unit words: aggregate counts by mastery_level
3. SRS due for unit words: `SELECT COUNT(*) FROM curriculum_vocabulary_srs WHERE student_id = $1 AND vocabulary_id IN (...) AND due <= NOW()`
4. New cards available today (respecting profile daily limit): reuse logic similar to `getNewCardsAvailable` from `srs.ts` but unit-scoped — or add a thin `getUnitNewCardsAvailable(studentId, unitId)` helper to `srs.ts`

**Continue Arc decision tree (in priority order):**

```
if dueForReviewToday > 0:
  → label: "راجع كلمات اليوم" (or "راجع X كلمة من هذي الوحدة")
  → target: 'srs_review', route: '/student/srs'

else if learningWords > 0:
  → pick the oldest-touched learning word (lowest mastery_level first, then earliest updated_at)
  → label: "تابع التقدم"
  → target: 'next_word', vocabularyId: <picked word id>

else if newWords > 0:
  → pick the first un-started word by curriculum order
  → label: "ابدأ كلمة جديدة"
  → target: 'next_word', vocabularyId: <picked word id>

else if masteryPct == 100:
  → label: "كل كلمات الوحدة أتقنتها! 🎉"
  → target: 'celebrate' (CTA still tappable — opens word library to revisit)

else:
  → label: "ابدأ استكشاف الوحدة"
  → target: 'start_exploration'
```

Use TanStack `useQuery` with key `['unit-vocab-status', unitId, profile.id]`. `staleTime: 30_000` (30s — students touch the tab back and forth; don't refetch every click).

```bash
git add src/hooks/useUnitVocabStatus.js
git commit -m "feat(vocab-tab): useUnitVocabStatus hook — orb + status pill + continue arc data"
git push origin main
```

---

## PHASE C — HERO COMPONENTS

All new files in `src/components/curriculum/hero/` (create directory).

### C.1 — `ProgressOrb.jsx`

Animated SVG ring.

**Visual spec:**
- **Desktop**: 200px diameter, ring thickness 14px.
- **Mobile (<768px)**: 140px diameter, ring thickness 10px.
- Gradient stroke: `linear-gradient` from `var(--ds-sky-500)` to `var(--ds-indigo-600)` (or whatever the codebase's analogous tokens are — check Phase A.3).
- Background ring: `var(--ds-neutral-200)` at 0.15 opacity for dark theme.
- Animation: on mount, fill from 0% → target% over 900ms (Framer Motion or CSS animation). Re-animate on prop change.

**Center content:**
- Top: large number — masteryPct rounded to integer + "%" suffix.
- Bottom: small label — "أتقنت X من Y كلمة" (mastered X of Y words).

**Props:**
```jsx
<ProgressOrb 
  percent={68}
  masteredCount={17}
  totalCount={25}
  size="desktop" | "mobile"  // optional; defaults to responsive
/>
```

### C.2 — `SmartStatusPill.jsx`

Compact horizontal pill, glass-effect background.

**Visual spec:**
- Rounded-full, padding 8px 16px.
- Background: `rgba(255,255,255,0.06)` with `backdrop-filter: blur(8px)`. Subtle border at `rgba(255,255,255,0.1)`.
- Text: small (14px), Tajawal Arabic.

**Content (computed from props):**
- If `dueForReviewToday > 0` AND `newCardsAvailableToday > 0`:
  → "اليوم: {due} مراجعة + {new} جديدة"
- If only due > 0: "اليوم: {due} كلمة للمراجعة"
- If only new > 0: "{new} كلمة جديدة جاهزة"
- If both 0: "✓ كل شيء تم لليوم" (with checkmark icon green)

**Props:**
```jsx
<SmartStatusPill 
  dueForReviewToday={3}
  newCardsAvailableToday={1}
/>
```

Live-update: subscribe to the same TanStack query as the orb — no extra refetch.

### C.3 — `ContinueArc.jsx`

The dominant gold CTA.

**Visual spec:**
- Full-width on mobile, fixed width 320px on desktop (centered).
- Gradient background: `linear-gradient(135deg, var(--ds-gold-400), var(--ds-gold-600))`. Subtle inner glow on hover.
- Text: large (18px desktop, 16px mobile), Tajawal bold.
- Height: 56px desktop, 48px mobile.
- Tap state: scales to 0.97 briefly (Framer Motion `whileTap`).
- If target is `'celebrate'`: gold becomes more subdued, gradient shifts toward `--ds-emerald-*`. Slight pulse animation.

**Content:**
- Primary line: `continueAction.label` (Arabic).
- If `continueAction.target === 'next_word'` and a vocabulary word is available, render a small secondary line below the label showing the target word in English (truncated to 20 chars) + arrow icon.

**On click:**
- `'srs_review'` → navigate to `continueAction.payload.route` (`/student/srs`).
- `'next_word'` → open WordExerciseModal with `vocabularyId = continueAction.payload.vocabularyId`. The modal handler is passed in as a prop from VocabularyTab (which already knows how to open the modal).
- `'celebrate'` → scroll to the word library section below (smooth scroll), no modal.
- `'start_exploration'` → same as celebrate (scroll to library).

**Props:**
```jsx
<ContinueArc 
  action={continueAction}
  onOpenWord={(vocabId) => { /* delegated to parent */ }}
  onScrollToLibrary={() => { /* delegated */ }}
/>
```

### C.4 — `HeroSection.jsx`

The composer. Sticky positioning. Brings the three above into one block.

**Layout:**

**Desktop** (≥768px):
```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│      [Orb 200px]   ┌────────────────────────┐           │
│                    │  Smart Status Pill     │           │
│                    │  Continue Arc (320px)  │           │
│                    └────────────────────────┘           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```
Orb on the right (RTL — visually right edge = start of line in Arabic), Pill + Arc stacked on the left.

**Mobile** (<768px):
```
┌──────────────────────────┐
│                          │
│        [Orb 140px]       │
│                          │
│   Smart Status Pill      │
│   ──── Continue Arc ──── │
│                          │
└──────────────────────────┘
```
Vertical stack, centered.

**Sticky behavior:**
- `position: sticky; top: <header height>;` so it sticks below the app header during scroll.
- On scroll (when not stickied at top), no behavior change — it's just normally laid out.
- On scroll when stickied: subtle background appears (the hero gains a `backdrop-filter: blur(20px) saturate(180%);` so content scrolling underneath blurs through). Use IntersectionObserver to detect sticky state.

**Background:**
- Hero has a subtle gradient background — `linear-gradient(135deg, rgba(99,102,241,0.05), rgba(168,85,247,0.03))` — visible only when not stickied. When stickied, the gradient softens into glass.

**Empty/loading state:**
- While `isLoading`: render orb skeleton (greyed-out outer ring, no number) + pill skeleton (greyed pill shape) + arc skeleton (greyed full-width block). Use Framer Motion shimmer or simple opacity pulse.

**Props:**
```jsx
<HeroSection 
  unitId={unit.id}
  studentId={profile.id}
  onOpenWord={(vocabId) => { /* opens existing WordExerciseModal */ }}
  onScrollToLibrary={() => { /* scrolls to existing word library section */ }}
/>
```

Internally calls `useUnitVocabStatus(unitId, studentId)`.

```bash
git add src/components/curriculum/hero/
git commit -m "feat(vocab-tab): HeroSection + ProgressOrb + SmartStatusPill + ContinueArc"
git push origin main
```

---

## PHASE D — INTEGRATE INTO VocabularyTab.jsx

**STRICTLY ADDITIVE.** Open the existing VocabularyTab.jsx. Insert `<HeroSection>` at the very top of the rendered JSX, immediately inside the wrapper element. Everything that was there before stays where it was.

```jsx
import { HeroSection } from '@/components/curriculum/hero/HeroSection';
// ... existing imports

export default function VocabularyTab({ unit, /* ... */ }) {
  // ... existing hooks at top (mastery, etc.)
  
  const handleOpenWord = (vocabId) => {
    // Delegate to existing WordExerciseModal opening logic
    // If there's an existing `setSelectedWordId` or similar — call it.
  };
  
  const libraryRef = useRef(null);
  const handleScrollToLibrary = () => {
    libraryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  return (
    <div className="vocabulary-tab" /* existing wrapper */>
      <HeroSection
        unitId={unit.id}
        studentId={profile.id}
        onOpenWord={handleOpenWord}
        onScrollToLibrary={handleScrollToLibrary}
      />
      
      {/* === EVERYTHING BELOW THIS LINE IS UNCHANGED === */}
      <div ref={libraryRef}>
        {/* existing ProgressRing — leave it, Prompt 07 will remove */}
        {/* existing StatsRow — leave it */}
        {/* existing FilterBar — leave it */}
        {/* existing word cards grid/list — leave it */}
        {/* existing Quick Practice button — leave it */}
      </div>
    </div>
  );
}
```

The library ref's wrapper is the only change BELOW the new hero — and it's just attaching a ref so the Continue Arc can scroll to it. No content changes.

**Wire up `handleOpenWord`:** look at how the existing word grid opens WordExerciseModal. If a state variable like `selectedWordId` exists, set it. If it's a callback pattern, invoke the existing opener. Keep the existing modal mounting where it is.

```bash
git add src/components/curriculum/VocabularyTab.jsx
git commit -m "feat(vocab-tab): mount HeroSection at top of VocabularyTab (additive)"
git push origin main
```

---

## PHASE E — MOBILE RESPONSIVE PASS

Test at the following breakpoints:
- **380px** (iPhone SE / small phones in RTL)
- **414px** (most modern phones)
- **768px** (iPad portrait)
- **1024px** (iPad landscape / small laptops)
- **1440px** (typical desktop)
- **1920px** (wide desktop)

Checklist:
- [ ] Orb scales correctly (140px ≤ 768px, 200px ≥ 768px)
- [ ] Smart Status Pill text doesn't overflow at 380px when "اليوم: ٣ مراجعة + كلمة جديدة"
- [ ] Continue Arc full-width on mobile, fixed-width on desktop
- [ ] Hero stack vertical on mobile, horizontal on desktop
- [ ] Sticky behavior works on all sizes (test by scrolling)
- [ ] Background gradient visible at idle, glass-blur active when stickied
- [ ] No horizontal scroll introduced at any width
- [ ] Tap targets ≥44px on mobile

If any breakpoint reveals a layout issue, fix and re-commit:
```bash
git commit -m "fix(vocab-tab): hero responsive at <breakpoint>"
```

Otherwise skip the responsive commit.

---

## PHASE F — SMOKE TEST + FINAL REPORT

### F.1 — Quick visual smoke on Vercel deploy

After final push, open a unit's Vocabulary tab. Verify:
- Hero appears at the top
- Progress Orb shows expected % (cross-check vs `vocabulary_word_mastery` count)
- Smart Status Pill content matches FSRS due-count for this unit
- Continue Arc button:
  - Has hard words / due reviews → "راجع كلمات اليوم" (or scoped message)
  - Has un-started words → "ابدأ كلمة جديدة"
  - Tap → opens WordExerciseModal on the right word (verify via the modal's title)
- Sticky behavior on scroll
- Mobile responsiveness verified manually or via DevTools

### F.2 — Sanity-check empty unit

Open a unit where the student has 0 mastery rows yet. Confirm:
- Orb shows 0%
- Status pill shows new-cards-available count
- Continue Arc says "ابدأ كلمة جديدة" or "ابدأ استكشاف الوحدة"
- No JS errors in console

### F.3 — Sanity-check fully-mastered unit

If no real unit is at 100%, manually `UPDATE vocabulary_word_mastery SET mastery_level = 3 WHERE student_id = '<test>' AND vocabulary_id IN (SELECT id FROM curriculum_vocabulary WHERE unit_id = '<test-unit>');` then revert after testing. Confirm:
- Orb shows 100%
- Status pill: "✓ كل شيء تم لليوم"
- Continue Arc: celebration label + tap scrolls to library

### F.4 — Final report

`docs/vocab-section/PHASE-F-VOCAB-HERO-REPORT.md`:

```markdown
# Vocab Tab Hero Shell — Final Report

## Files created
- src/hooks/useUnitVocabStatus.js
- src/components/curriculum/hero/HeroSection.jsx
- src/components/curriculum/hero/ProgressOrb.jsx
- src/components/curriculum/hero/SmartStatusPill.jsx
- src/components/curriculum/hero/ContinueArc.jsx

## Files modified
- src/components/curriculum/VocabularyTab.jsx (additive: HeroSection prepended)

## Continue Arc decision tree — verified states
- [ ] dueForReviewToday > 0 → SRS review link
- [ ] learningWords > 0 → next-word modal
- [ ] newWords > 0, no learning → first un-started word
- [ ] 100% mastered → celebrate label

## Visual smoke
- [ ] Orb percent matches mastery count
- [ ] Status pill matches FSRS due
- [ ] Continue Arc opens correct target

## Responsive
- [ ] 380px / 414px / 768px / 1024px / 1440px / 1920px all pass

## Deferred / known gaps
- Existing ProgressRing below hero is now duplicated; Prompt 07 removes it.
- Floating settings gear deferred to Prompt 06 (chunk size is the main control).
- Hero doesn't yet show streak or XP — design decision: keep hero focused on action, not stats.
```

```bash
git add docs/vocab-section/PHASE-F-VOCAB-HERO-REPORT.md
git commit -m "docs(vocab-tab): hero shell final report"
git push origin main
```

---

## ⚠️ HARD RULES (RECAP)

1. Strictly additive — do not delete/modify existing VocabularyTab content below the hero.
2. Hooks at top of components.
3. .select() after .update() (mostly reads in this prompt).
4. Atomic phase commits.
5. Design tokens only.
6. Mobile-first responsive checklist.
7. `student_id` for SRS reads; match existing patterns for mastery reads.
8. No vite build locally.

Begin Phase A.
