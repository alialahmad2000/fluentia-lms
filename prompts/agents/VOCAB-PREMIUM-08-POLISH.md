# VOCAB PREMIUM — PROMPT 08 — POLISH + GAPS (FINAL)

> Part 8 of 8 in the Premium Vocabulary rebuild series.
> Final layer — settings gear, onboarding tour, skeleton loaders, accessibility, performance, smart nudges.
> Closes out the series with a comprehensive report.

---

## 🎯 GOAL — END STATE

When a student opens any unit's Vocabulary tab:

1. **First-ever visit** → 3-step spotlight onboarding tour walks through Hero → Journey Lane → Word Library. Completion stored on profile; never shown again.
2. **Floating settings gear** (bottom-right of viewport) opens a drawer with unit-vocab-specific preferences: view mode default, audio autoplay on tap, tap-to-details-vs-practice, chunk size, link out to SRS settings.
3. **Skeleton loaders** appear during initial data fetch — Hero orb pulses, chunks lane shows ghost cards, word library shows ghost grid. No empty white space during 200–600ms load times.
4. **Accessibility**:
   - ARIA labels on every interactive element
   - Keyboard navigation works end-to-end (Tab/Shift+Tab order, Enter/Space activates, Esc closes drawers)
   - `prefers-reduced-motion` respected — animations replaced with instant transitions when set
   - Focus traps inside drawers/modals; focus returns to trigger on close
   - Screen reader announces state changes
5. **Performance**:
   - Heavy Detail Sheet sections (Pronunciation, WordFamily) lazy-loaded via `React.lazy`
   - ChunkCard memoized
   - Word Library virtualized when filtered view >50 words
   - Backdrop-filter degrades gracefully on low-end devices
   - Audio preloads deferred until user interaction
6. **Smart nudges**:
   - Returning after 3+ days → small banner under Hero: "مرحب بعودتك! عندك X كلمة جاهزة للمراجعة"
   - Words stalled in `learning` for 14+ days → gentle reminder banner: "X كلمات معلّقة من زمان — خل نراجعهم اليوم"
7. Comprehensive final report in `docs/vocab-section/PHASE-I-POLISH-REPORT.md` + a top-level **VOCAB-PREMIUM-COMPLETE.md** closure summary documenting the entire 8-prompt journey.

---

## 🧭 FOUNDATION (all already shipped)

- ✅ FSRS-backed SRS at `/student/srs` (Prompt 03/03B)
- ✅ Hard Words Training at `/student/hard-words` (Prompt 04)
- ✅ Unit Vocab Tab: Hero + Journey Lane + Word Library + Detail Sheet (Prompts 05/06/07)
- ✅ Enrichment partially filled for L1 + L3 (3 parallel tracks)
- Profile columns already present: `srs_daily_new_cards`, `srs_daily_max_reviews`, `srs_review_order`, `srs_autoplay_audio`, `preferred_chunk_size`
- Schema realities verified across prompts:
  - `mastery_level` is TEXT (`'new'|'learning'|'mastered'`)
  - `student_id` for all student-data queries (= profile.id = auth.uid())
  - Unit→vocab via `curriculum_readings.unit_id`
  - JSONB field names: `level` not `cefr_level`, `vocabulary_id` not `known_word_id`, `pos` not `part_of_speech`, `correct_approximation_ar` / `common_mispronunciation_ar`
  - Mastery is 3 per-row booleans, not a separate exercise_type table

---

## ⚠️ NON-NEGOTIABLE

1. **Strictly additive.** Don't break or regress anything from Prompts 03–07.
2. **Atomic phase commits**, push after each. Vercel auto-deploys.
3. **`student_id` for student-data queries.**
4. **Hooks at top of components.**
5. **`.select()` after every `.update()` / `.insert()`** for RLS silent-failure detection.
6. **Idempotent migrations.**
7. **Design tokens only.** No raw hex.
8. **No `vite build` locally.**
9. **Accessibility is not a "nice to have"** — every new component must pass keyboard nav + ARIA + reduced-motion checks before its commit.

---

## PHASE A — DISCOVERY (10 min, read-only)

### A.1 — Existing patterns

```bash
# How does the codebase currently handle drawers / modals?
grep -rln "drawer\|Drawer" src/components/ 2>/dev/null | head -10

# Does any onboarding/tour infrastructure exist?
grep -rln "onboarding\|tour\|joyride\|tutorial\|spotlight" src/ 2>/dev/null

# What's the toast system?
grep -rln "toast(\|useToast\|sonner\|react-hot-toast" src/ package.json 2>/dev/null | head -5

# Skeleton/loading patterns
grep -rln "Skeleton\|<.*loading" src/components/ 2>/dev/null | head -5

# Virtualization libraries already installed?
grep -E "react-window|react-virtual|@tanstack/react-virtual" package.json
```

### A.2 — Profile preference columns needed

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('vocab_view_mode_default', 'vocab_card_autoplay_audio', 'vocab_tap_behavior', 'vocab_onboarding_completed_at', 'last_vocab_visit_at');
```

Anything missing → add in Phase B migration.

### A.3 — Stalled-learning probe

```sql
-- Sample query to verify the stalled-words concept finds real data
SELECT COUNT(*) AS stalled
FROM vocabulary_word_mastery vwm
WHERE vwm.mastery_level = 'learning'
  AND vwm.updated_at < NOW() - INTERVAL '14 days';
```

Print findings. Proceed.

---

## PHASE B — PROFILE MIGRATION + SETTINGS GEAR

### B.1 — Migration (additive, idempotent)

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vocab_view_mode_default TEXT DEFAULT 'grid'
  CHECK (vocab_view_mode_default IN ('grid', 'list')),
ADD COLUMN IF NOT EXISTS vocab_card_autoplay_audio BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vocab_tap_behavior TEXT DEFAULT 'details'
  CHECK (vocab_tap_behavior IN ('details', 'practice')),
ADD COLUMN IF NOT EXISTS vocab_onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_vocab_visit_at TIMESTAMPTZ;
```

```bash
git add supabase/migrations/
git commit -m "feat(vocab-tab): profile prefs for settings gear + onboarding + last-visit tracking"
git push origin main
```

### B.2 — `VocabSettingsGear.jsx` + drawer

New file: `src/components/curriculum/settings/VocabSettingsGear.jsx`

**Visual:**
- Floating button bottom-right of viewport (RTL: bottom-left, fixed position, z-index above main content but below modals)
- 56px circular button, gradient background using design tokens
- Lucide `Settings2` icon, animates 90° on hover/tap
- Box-shadow elevation

**Drawer (when opened):**
- Mobile: bottom drawer (slides up, ~70% height)
- Desktop: side panel from start edge (RTL: left)
- Backdrop with blur

**Drawer contents:**
1. **العرض الافتراضي** (View mode default):
   - Segmented pills: شبكة (grid) / قائمة (list)
   - Writes to `profiles.vocab_view_mode_default`
2. **تشغيل الصوت تلقائياً عند الضغط** (Audio autoplay on tap):
   - Toggle switch
   - Writes to `profiles.vocab_card_autoplay_audio`
3. **سلوك الضغط على الكلمة** (Tap behavior):
   - Radio: "عرض التفاصيل أولاً" (`details`) / "ابدأ التدريب مباشرة" (`practice`)
   - Writes to `profiles.vocab_tap_behavior`
   - If `practice`: tapping a word card opens WordExerciseModal directly (skips Detail Sheet — for power users)
4. **حجم المجموعة** (Chunk size):
   - Pills mirror ChunkLane: ٥ / ١٠ / ١٥ / ٢٠ / ٢٥
   - Writes to `profiles.preferred_chunk_size`
   - Same value, two access points — both write to the same column
5. **إعدادات أخرى** (Other settings):
   - Link button: "إعدادات المراجعة اليومية" → navigates to `/student/srs` (settings drawer inside SRS)

All settings auto-save (debounce 500ms). Subtle "تم الحفظ ✓" toast.

### B.3 — Mount the gear in VocabularyTab

Add to VocabularyTab.jsx (after the existing content, before any other modals):

```jsx
<VocabSettingsGear studentId={profile.id} />
```

### B.4 — Respect `vocab_tap_behavior` in tap handler

Update the Phase D tap rewire from Prompt 07:

```jsx
const handleCardTap = (wordObj) => {
  if (profile.vocab_tap_behavior === 'practice') {
    setExerciseWord(wordObj);          // direct practice
  } else {
    setDetailSheetWord(wordObj);       // detail sheet first
  }
};
```

```bash
git add src/components/curriculum/settings/ src/pages/student/curriculum/tabs/VocabularyTab.jsx
git commit -m "feat(vocab-tab): floating VocabSettingsGear + 5 unit-vocab preferences"
git push origin main
```

---

## PHASE C — ONBOARDING TOUR (3-step spotlight)

New file: `src/components/curriculum/onboarding/VocabOnboardingTour.jsx`

### C.1 — Trigger logic

In VocabularyTab.jsx, on mount:
- Read `profiles.vocab_onboarding_completed_at`
- If NULL → render `<VocabOnboardingTour onComplete={...} />`
- On complete: update profile column, hide tour

### C.2 — Spotlight component (custom, no library deps)

Three steps:

**Step 1: Hero**
- Spotlight cutout around the HeroSection (data attribute `data-tour="hero"`)
- Tooltip pointing at the hero: 
  - Heading: "هذا تقدّمك في الوحدة"
  - Body: "الدائرة تشيك تقدمك. اللي يلي تحته يخبرك وش تسوي اليوم. اضغط 'ابدأ المراجعة' لما تكون جاهز."
- Buttons: "التالي" (advance) / "تخطّي" (skip — completes tour, fades out)

**Step 2: Journey Lane**
- Spotlight on ChunkLane (`data-tour="journey"`)
- Tooltip:
  - Heading: "رحلة المفردات"
  - Body: "كلمات الوحدة مقسّمة على مجموعات صغيرة. ابدأ بالأولى، وكل ما تكمّل ٨٠٪ من مجموعة، اللي بعدها تفتح. تقدر تغيّر حجم المجموعة من الأعلى."
- Buttons: "السابق" / "التالي" / "تخطّي"

**Step 3: Word Library**
- Spotlight on the word library area (the filter bar + grid, `data-tour="library"`)
- Tooltip:
  - Heading: "مكتبة الكلمات"
  - Body: "كل كلمات الوحدة هنا. اضغط أي كلمة لتشوف التفاصيل الكاملة — التعريف، المرادفات، عائلة الكلمة، وأكثر. استخدم الفلاتر فوق علشان تشوف الجديدة، اللي تتعلمها، أو الصعبة."
- Buttons: "السابق" / "ابدأ التعلّم! 🚀"

### C.3 — Implementation notes

- Use a single fixed overlay with `box-shadow: 0 0 0 9999px rgba(0,0,0,0.7)` trick around the spotlight cutout — cheap and works everywhere
- Compute spotlight position via `useRef` + `getBoundingClientRect` on the target data-tour element
- Recompute on window resize
- Tooltip positions adapt to viewport (above/below/left/right of the cutout based on available space)
- Tour state: useState in the component for current step (1–3)
- Animations: fade-in tooltip with slide; respect `prefers-reduced-motion`

### C.4 — Completion

```typescript
async function markOnboardingComplete(studentId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ vocab_onboarding_completed_at: new Date().toISOString() })
    .eq('id', studentId)
    .select();
  if (error) console.warn('onboarding complete write failed:', error);
}
```

Call this when:
- Student clicks "ابدأ التعلّم!" on step 3
- Student clicks "تخطّي" on any step
- Student dismisses by clicking outside (escape, backdrop click)

Once written, the tour never shows again for that student.

```bash
git add src/components/curriculum/onboarding/
git commit -m "feat(vocab-tab): 3-step onboarding tour with completion tracking"
git push origin main
```

---

## PHASE D — SKELETON LOADERS

Wherever `isLoading: true` from a TanStack `useQuery`, render a skeleton in place of the real component.

### D.1 — `<HeroSkeleton>`
- Greyed circle where the orb would be (with subtle pulse animation)
- Greyed pill block
- Greyed full-width CTA block

### D.2 — `<JourneyLaneSkeleton>`
- 3 greyed chunk cards (horizontal, with mini ring placeholders)

### D.3 — `<WordLibrarySkeleton>`
- 6 greyed word cards in grid (current view-mode default)
- OR 6 greyed list rows if list view

### D.4 — `<DetailSheetSectionSkeleton>` 
- For each section of the Detail Sheet, an opacity-pulsing placeholder

### D.5 — Implementation

- Shared base component: `<Skeleton className="...">` from a single source (probably already exists in the design system — `grep -rn 'Skeleton'` in Phase A.1)
- All animations respect `prefers-reduced-motion` (use static greyed-out box if reduced motion is set)

```bash
git add src/components/curriculum/skeletons/
git commit -m "feat(vocab-tab): skeleton loaders across Hero + Journey + Library + Detail Sheet"
git push origin main
```

---

## PHASE E — ACCESSIBILITY PASS

### E.1 — ARIA labels

Every interactive element in the new components needs an `aria-label` (or visible label that's properly associated):
- Settings gear: `aria-label="إعدادات المفردات"`
- Onboarding skip button: `aria-label="تخطّي الجولة التعريفية"`
- Audio buttons: `aria-label="استمع للكلمة"` / `aria-label="استمع للجملة"`
- Filter pills: `aria-label="فلتر: {label}"`, `aria-pressed={isActive}`
- Word cards: `aria-label="{word} — {status}"`
- Detail Sheet drawer: `role="dialog"` + `aria-labelledby` pointing at header

### E.2 — Keyboard navigation

- All buttons reachable via Tab/Shift+Tab in logical order
- Enter/Space activates buttons and links
- Esc closes:
  - Detail Sheet
  - Settings drawer
  - Onboarding tour
  - Chunk Mini Session
- Arrow keys within chunk lane scroll between chunks
- Focus trap inside drawers/modals (focus stays inside until closed)
- Focus returns to triggering element on close

### E.3 — `prefers-reduced-motion`

Wrap Framer Motion components with `MotionConfig`:

```jsx
import { MotionConfig, useReducedMotion } from 'framer-motion';

function App() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <MotionConfig reducedMotion={shouldReduceMotion ? 'always' : 'never'}>
      {/* ... */}
    </MotionConfig>
  );
}
```

Or per-component, replace animation values with static when `useReducedMotion()` returns true. Apply to:
- HeroSection animations
- ChunkCard hover/tap
- ChunkSessionComplete confetti (replace with simple checkmark)
- DetailSheet slide-in (replace with instant fade)
- Tour tooltip transitions

### E.4 — Screen reader live regions

For state changes that aren't visible (e.g., Continue Arc updates after a word completes), add an aria-live polite region that announces:
- "تم إتقان الكلمة {word}"
- "المجموعة الثانية فُتحت"

Mount once at the top of VocabularyTab:
```jsx
<div role="status" aria-live="polite" className="sr-only">
  {liveAnnouncement}
</div>
```

`liveAnnouncement` is a useState that gets set briefly when events fire (then cleared).

```bash
git add src/
git commit -m "feat(vocab-tab): accessibility pass — ARIA + keyboard nav + reduced motion + live regions"
git push origin main
```

---

## PHASE F — PERFORMANCE PASS

### F.1 — Lazy-load heavy Detail Sheet sections

```jsx
const PronunciationSection = lazy(() => import('./PronunciationSection'));
const WordFamilySection = lazy(() => import('./WordFamilySection'));

// Inside the sheet:
<Suspense fallback={<DetailSheetSectionSkeleton />}>
  <PronunciationSection ... />
</Suspense>
```

Definition + Relationships + Progress stay in the main bundle (they're small).

### F.2 — Memoize ChunkCard

```jsx
export default React.memo(ChunkCard, (prev, next) => {
  return prev.chunk.number === next.chunk.number
    && prev.chunk.masteryPct === next.chunk.masteryPct
    && prev.chunk.isUnlocked === next.chunk.isUnlocked
    && prev.chunk.isCompleted === next.chunk.isCompleted;
});
```

Same pattern for WordCard if rapid filter changes cause excessive re-renders.

### F.3 — Conditional virtualization

In the Word Library:
- If `filteredWords.length <= 50` → render normally
- If `filteredWords.length > 50` → use `@tanstack/react-virtual` (install if not present)

Install if missing:
```bash
npm install @tanstack/react-virtual
```

Virtualization config:
- `estimateSize: 180` (grid card) or `64` (list row)
- `overscan: 5`

### F.4 — Backdrop-filter degradation

Add a CSS feature query:

```css
@supports not (backdrop-filter: blur(20px)) {
  .premium-glass { background: rgba(0, 0, 0, 0.5); /* solid fallback */ }
}

@media (prefers-reduced-transparency: reduce) {
  .premium-glass { backdrop-filter: none; background: rgba(0, 0, 0, 0.7); }
}
```

Apply `.premium-glass` class to any element currently using backdrop-filter (HeroSection sticky-stuck state, drawer backdrops, etc.).

### F.5 — Defer audio preload

Don't preload audio on card render. Only on first user interaction (tap audio button). Use `<audio preload="none">` and call `.load()` on first play.

```bash
git add src/ package.json package-lock.json
git commit -m "perf(vocab-tab): lazy-load sections + memoize cards + virtualize >50 + backdrop-filter degradation + defer audio"
git push origin main
```

---

## PHASE G — SMART NUDGES

### G.1 — Update `last_vocab_visit_at` on mount

In VocabularyTab.jsx `useEffect`:

```jsx
useEffect(() => {
  supabase
    .from('profiles')
    .update({ last_vocab_visit_at: new Date().toISOString() })
    .eq('id', profile.id)
    .select(); // .select() per project rule
}, [profile.id]);
```

### G.2 — Return-to-unit greeting

Read previous `last_vocab_visit_at` BEFORE updating it. If > 3 days ago AND due review count > 0:
- Render a dismissible banner below the Hero: "مرحب بعودتك! عندك {dueCount} كلمة جاهزة للمراجعة 👋"
- Banner has a small "ابدأ المراجعة" link → opens SRS, plus an X to dismiss

Store dismissal in sessionStorage so it doesn't reappear in the same session. Don't persist server-side — it's a soft reminder.

### G.3 — Stalled-learning reminder

Query (computed in the existing `useUnitVocabStatus` parallel batch — add a 5th query):

```sql
SELECT COUNT(*) AS stalled
FROM vocabulary_word_mastery vwm
JOIN curriculum_vocabulary cv ON cv.id = vwm.vocabulary_id
JOIN curriculum_readings cr ON cr.id = cv.reading_id
WHERE vwm.student_id = $1
  AND cr.unit_id = $2
  AND vwm.mastery_level = 'learning'
  AND vwm.updated_at < NOW() - INTERVAL '14 days';
```

If count > 0: render a small banner below Hero (and below the return-greeting banner if both apply):
- "{count} كلمات معلّقة من ١٤+ يوم — خل نراجعهم اليوم"
- Tap → opens the Word Library scoped to a new "معلّقة" filter (NEW addition to the filter bar — same pattern as "صعبة")

If the stalled count is 0, no banner.

### G.4 — Optional: "معلّقة" filter pill

Add as a 6th pill to the filter bar (alongside "صعبة" from Prompt 07). When active, filter words to those with `mastery_level = 'learning'` AND `updated_at < NOW() - 14 days`.

```bash
git add src/
git commit -m "feat(vocab-tab): smart nudges — return-to-unit greeting + stalled-learning banner + معلّقة filter"
git push origin main
```

---

## PHASE H — FINAL SMOKE + CLOSURE REPORTS

### H.1 — Comprehensive smoke

For each new feature:
- [ ] Settings gear opens drawer, all 5 settings save, drawer closes
- [ ] First-time student (clear `vocab_onboarding_completed_at`) sees tour, can advance through all 3 steps, completion persists
- [ ] Returning student (set `vocab_onboarding_completed_at`) does NOT see the tour
- [ ] Skeleton loaders visible during initial load (test with DevTools network throttle "Slow 3G")
- [ ] Tab through entire VocabularyTab — focus order is logical, all controls reachable
- [ ] Enter `prefers-reduced-motion` via browser setting → animations replaced with instant transitions
- [ ] Open a unit with >50 words → virtualized rendering kicks in, scroll is smooth at 60fps
- [ ] Detail Sheet sections lazy-load (verify in Network tab: separate chunks for Pronunciation + WordFamily)
- [ ] Return-to-unit banner appears for student with `last_vocab_visit_at` >3 days old
- [ ] Stalled-learning banner appears for student with words in 'learning' for 14+ days
- [ ] `معلّقة` filter pill shows stalled words

### H.2 — Phase I report

`docs/vocab-section/PHASE-I-POLISH-REPORT.md`:

```markdown
# Polish + Gaps — Final Report

## Files created
- src/components/curriculum/settings/VocabSettingsGear.jsx
- src/components/curriculum/onboarding/VocabOnboardingTour.jsx
- src/components/curriculum/skeletons/* (4 skeletons)
- (lazy-loaded sections were already components, just split via React.lazy)

## Files modified
- src/pages/student/curriculum/tabs/VocabularyTab.jsx (gear + tour + nudges + skeletons + last-visit + tap-behavior preference)
- src/hooks/useUnitVocabStatus.js (stalled-learning query added)
- src/components/curriculum/hero/ + journey/ + word-detail/ (a11y pass + reduced-motion)
- index.css (premium-glass class + media query degradation)

## Migration
- 5 profile columns added (view mode, autoplay, tap behavior, onboarding timestamp, last visit timestamp)

## Smoke results
<paste H.1 checklist with results>

## Performance metrics (DevTools Lighthouse, mobile, 4x CPU)
- TTI: <before vs after>
- LCP: <before vs after>
- CLS: <before vs after>

## Deferred / known gaps
<anything still pending>
```

### H.3 — Closure summary

`docs/vocab-section/VOCAB-PREMIUM-COMPLETE.md` — top-level closure of the entire 8-prompt series:

```markdown
# Premium Vocabulary Rebuild — COMPLETE

## Journey
- Prompt 01 — Audit (read-only) — `PHASE-A-AUDIT.md`
- Prompt 02 — Enrichment fill (L1+L3, 3 parallel tracks)
  - Track A — Relationships: `PHASE-B-CHECKPOINT.md`
  - Track B — Word Families: `PHASE-B-CHECKPOINT.md`
  - Track C — Pronunciation: `PHASE-B-CHECKPOINT.md`
- Prompt 03 — SRS Upgrade → FSRS — `PHASE-C-SRS-UPGRADE-REPORT.md`
- Prompt 03B — SRS Frontend — `PHASE-D-SRS-FRONTEND-REPORT.md`
- Prompt 04 — Hard Words Training — `PHASE-E-HARD-WORDS-REPORT.md`
- Prompt 05 — Vocab Tab Hero Shell — `PHASE-F-VOCAB-HERO-REPORT.md`
- Prompt 06 — Vocab Tab Journey Lane — `PHASE-G-JOURNEY-LANE-REPORT.md`
- Prompt 07 — Word Detail Sheet — `PHASE-H-WORD-DETAIL-REPORT.md`
- Prompt 08 — Polish + Gaps — `PHASE-I-POLISH-REPORT.md`

## What students experience now
- Premium hero with progress orb + smart status + continue arc
- Vocabulary journey lane with chunks + progressive unlock + mini-sessions
- Word library with grid/list/search/filter + 6 filter pills (الكل / جديدة / تتعلم / أتقنتها / صعبة / معلّقة)
- Word Detail Sheet with 6 sections: word audio + definition + pronunciation alert + synonyms/antonyms + word family + personal progress
- Daily SRS Review with FSRS algorithm and premium dashboard at /student/srs
- Hard Words Training with 4 drill modes at /student/hard-words (appears only when student has hard words)
- Floating settings gear with 5 preferences
- 3-step onboarding tour for new students
- Smart nudges: return greeting + stalled-learning reminder

## Known deferred items (post-series)
- L0/L2/L4/L5 enrichment backfill (only L1+L3 done — these levels have no active students yet)
- Track A L3 (1,676 rows), Track B L3 (1,714), Track C L3 (1,676) — fill opportunistically
- Auto-themed chunk titles (currently "المجموعة الأولى" etc.)
- The hybrid hook situation: legacy useSRSCounts/useSRSDue (RPC path) coexists with new srs.ts service — single-source pass deferred
- pronunciation_checked_at migration sits on disk; Track C uses pronunciation_generated_at fallback — apply when convenient
```

```bash
git add docs/vocab-section/PHASE-I-POLISH-REPORT.md docs/vocab-section/VOCAB-PREMIUM-COMPLETE.md
git commit -m "docs(vocab-tab): polish report + 8-prompt series closure summary"
git push origin main
```

---

## ⚠️ HARD RULES (RECAP)

1. Strictly additive — no regression on Prompts 03–07.
2. `student_id` for student-data queries.
3. Hooks at top of components; conditional returns AFTER hooks.
4. `.select()` after every `.update()` / `.insert()`.
5. Atomic phase commits + push after each.
6. Idempotent migrations.
7. Design tokens only.
8. Accessibility is a commit gate, not an afterthought.
9. Respect `prefers-reduced-motion` everywhere.
10. No `vite build` locally.

Begin Phase A.
