# VOCAB PREMIUM — PROMPT 03B — SRS FRONTEND (Phases D–H)

> Continuation of Prompt 03. Phases A (discovery), B (migration), C (service layer) are complete and committed.
> This prompt finishes the SRS upgrade: refactor existing live components to use the new service, build the premium dashboard, mount the route, clean up dead code, smoke test end-to-end.
> Reference foundation: `docs/vocab-section/PHASE-C-SRS-UPGRADE-REPORT.md` for what's already done.

---

## 🎯 GOAL — END STATE

After this prompt:

1. Existing `DailyReview` + `WordExerciseModal` call `src/services/srs.ts` exclusively. No leftover custom scheduling logic. Duplicate hook files (`useSRS.js` / `useSrs.js`) merged into one.
2. Five new premium components in `src/components/srs/` + `src/pages/student/SrsHome.jsx`.
3. `/student/srs` mounted with sidebar nav "مراجعة المفردات اليومية".
4. Deleted: `src/components/anki/*`, `src/lib/fsrs.js` (old custom FSRS implementation, superseded by service layer), `src/hooks/useAnkiSession.js`.
5. End-to-end smoke test: real student → opens /student/srs → sees due count → reviews 3 cards → state transitions visible in DB → returns to dashboard.

---

## 🧭 FOUNDATION (already done, don't re-do)

- `curriculum_vocabulary_srs` has FSRS columns: stability, difficulty, state, due, last_review, reps, lapses, elapsed_days, scheduled_days, fsrs_seeded_at. **Owner column is `student_id` (NOT user_id)** — match this everywhere.
- `srs_review_logs` exists with RLS. FK is `student_id`, also `vocabulary_id`.
- `profiles` has: `srs_daily_new_cards`, `srs_daily_max_reviews`, `srs_review_order`, `srs_autoplay_audio`.
- `anki_cards` + `anki_review_logs` tables: DROPPED.
- `src/services/srs.ts` exports:
  - **Pure** (no DB): `rateCard(card, rating, now?)`, `previewAllRatings(card, now?)`
  - **DB**: `applyRating(vocabularyId, rating, studentId)`, `getDueCards(studentId, limit?)`, `getDueCount(studentId)`, `getNewCardsAvailable(studentId, dailyLimit)`, `getNewCards(studentId, limit?)`, `getStreak(studentId)`, `getDashboardCounts(studentId)`
  - **Constants**: `RATING.AGAIN | HARD | GOOD | EASY` (1–4), `RATING_AR` (Arabic button labels)

---

## ⚠️ NON-NEGOTIABLE

1. **Live students (97 rows) must not break.** Refactor in Phase D must be backward-compatible — same screen flow, same buttons, FSRS underneath.
2. **Hooks at top of every component** (React rule from skill — avoid error #310). All `useState`/`useEffect`/`useQuery`/etc. BEFORE any conditional return.
3. **`student_id` everywhere**, not `user_id`. Match the schema reality from Phase B.
4. **`.select()` after every `.update()`** for RLS silent-failure detection.
5. **Atomic phase commits.** Push after each phase. Vercel deploys each one. A broken phase = revert one commit, the rest stand.
6. **No `vite build` locally.** Vercel handles all builds.
7. **Design system tokens only** — `var(--ds-*)`, `var(--tr-*)`. Tajawal for Arabic, Readex Pro for English. RTL-safe.

---

## PHASE D — REFACTOR EXISTING COMPONENTS

### D.1 — Dedupe useSRS.js / useSrs.js

Both files exist (case-collision risk on case-insensitive filesystems too):
1. Read both files; diff them. If identical, delete one.
2. If divergent, keep the one with more recent usage (`grep -rln "useSRS\|useSrs" src/ | wc -l` per file).
3. Pick canonical name: **`useSrs.js`** (camelCase per project convention).
4. Update all imports across `src/` to use the canonical file.
5. Refactor the hook internals to use `srs.ts` service functions:
   - Query: `getDueCards(profile.id)` via TanStack `useQuery({ queryKey: ['srs', 'due', profile.id], queryFn: ... })`
   - Mutation: `applyRating(vocabId, rating, profile.id)` via `useMutation({ mutationFn: ..., onSuccess: () => invalidateQueries })`
   - Counts: `getDashboardCounts(profile.id)` for the home page summary
   - Public API of the hook stays stable — consuming components don't break.

### D.2 — `DailyReview.jsx`

Find it: `grep -rln "DailyReview" src/`. Refactor:
- Remove any custom scheduling math (interval arithmetic, ease factor mutations, SM-2 logic) — all of it routes through `applyRating`.
- Replace any `next_review_at` date computations with `card.due` directly from the query.
- All hooks at the top, conditional returns AFTER hooks (e.g., `if (loading) return <Spinner />` after every `useState`/`useEffect`/`useQuery` declaration).
- If it imports from `src/lib/fsrs.js` or `src/components/anki/*` → remove the import (those files are deleted in Phase G).

### D.3 — `WordExerciseModal.jsx`

Find it: `grep -rln "WordExerciseModal" src/`. On exercise outcomes:
- Pass → `applyRating(vocabId, RATING.GOOD, profile.id)`
- Fail → `applyRating(vocabId, RATING.AGAIN, profile.id)`
- Skip / "I don't know" → `applyRating(vocabId, RATING.AGAIN, profile.id)` (treat as Again, not Hard — Hard means "I got it but barely")

XP and vocabulary_word_mastery logic stay untouched — they're orthogonal to SRS scheduling.

### D.4 — Commit

```bash
git add src/hooks/ src/components/ src/pages/
git commit -m "refactor(srs): existing DailyReview + WordExerciseModal use FSRS service; dedupe useSrs hooks"
git push origin main
```

After push: verify Vercel deploy passes. If it fails on a useSrs import that wasn't updated, fix and re-push before continuing.

---

## PHASE E — PREMIUM COMPONENTS

All new files in `src/components/srs/` (create the directory). The dashboard page is `src/pages/student/SrsHome.jsx`.

### E.1 — `SrsHome.jsx` (route: `/student/srs`)

**Hero block (top, gradient background using design tokens):**
- Large animated SVG progress orb. Center number = today's reviews completed. Outer ring fills from 0 → 100% as the student finishes cards.
- Stat row below orb, 3 cards (glass-style, subtle border):
  - **تستحق المراجعة** — due count (large number) + small "كلمة" suffix
  - **كلمات جديدة اليوم** — new available count
  - **السلسلة** — streak in days + 🔥 emoji (if > 0)
- Below: single dominant gold CTA button **"ابدأ المراجعة"** — opens `<SrsReviewSession>` in a full-screen modal. Disabled with subtle styling if both due == 0 and new == 0.

**Recent activity row (mid-page):**
- Last 7 days mini bar chart (reviews completed per day) — use `recharts` (already installed per project deps).
- Compact, no axis labels except day initials (س, أ, إ, ر, خ, ج, س).

**Empty state (due == 0 AND new == 0):**
- Replace CTA with a green checkmark icon + heading "أحسنت! خلصت مراجعة اليوم".
- Sub-text: "تعال بكرا في وقت المراجعة الجديدة".
- Secondary CTA: **"خلني أراجع كلمات إضافية"** — pulls 20 cards reviewed in last 14 days regardless of due date (extra practice). Opens the same `<SrsReviewSession>` but in "extra practice" mode (logs ratings but doesn't penalize schedule).

**Floating settings gear (bottom-right):**
- Tap → opens `<SrsSettings>` drawer.

**Data sources:**
- `useQuery(['srs', 'counts', profile.id], () => getDashboardCounts(profile.id))` — returns `{ due, newAvailable, streak, completedToday, last7Days }`.
- Streaming refresh after each `applyRating` (via `invalidateQueries`).

### E.2 — `SrsReviewSession.jsx`

**Full-screen modal** (uses Framer Motion for entrance/exit). Loads due cards on mount via `getDueCards(profile.id)`, plus up to `srs_daily_new_cards` from `getNewCards`. Interleaves new cards based on `srs_review_order` (level / random / unit).

**Per-card UX:**
1. **Question phase**: large English word centered. Audio button (auto-plays if `srs_autoplay_audio` is true). Optional context sentence below in smaller text. Arabic meaning HIDDEN.
2. **Reveal button** "أظهر الإجابة" (centered, gold). Or press SPACE.
3. **Answer reveal**: word + IPA + Arabic meaning + example sentence (Arabic translation) + pronunciation alert badge if `curriculum_vocabulary.pronunciation_alert IS NOT NULL`.
4. **Rating row** (4 buttons in single row):
   - Each button shows the predicted next interval underneath in small text. Compute via `previewAllRatings(card)` (returns `{ Again: '1 min', Hard: '6 min', Good: '10 min', Easy: '3 days' }` — formatted in Arabic via `RATING_AR` constant).
   - مرة أخرى (red tint) | صعبة (orange) | جيد (blue) | سهلة (green).
   - Tap → call `applyRating(vocab.id, rating, profile.id)`, animate card out (left/up/right/far-right based on rating), animate next card in.
5. **Keyboard shortcuts**: `1` `2` `3` `4` = ratings; `Space` = reveal answer.

**Header (sticky top of modal):**
- Progress: "٥ من ٢٠" (current / session total). Mini progress bar.
- Close button (X) — confirms with "هل تريد إيقاف الجلسة؟" if mid-session.

**Last card → triggers `<SrsSessionComplete>`** instead of dismissing.

### E.3 — `SrsSessionComplete.jsx`

Replaces the review modal content after the last card.

- Subtle confetti burst (Framer Motion + a few SVG circle particles — premium, not cheesy).
- Heading: "أحسنت!" + sub-line based on accuracy ("ممتاز" >= 90%, "جيد جداً" >= 75%, "كل المراجعة مهمة" < 75%).
- Stats cards row:
  - **عدد المراجعات**
  - **دقة الإجابة** (% of cards rated Good or Easy)
  - **XP المكتسبة** (sum of XP from this session)
  - **مدة الجلسة** (formatted as "M د ث")
- Streak line: "السلسلة: X يوم 🔥" — if new record, append " (رقم قياسي!)" in gold.
- Buttons row:
  - **العودة للوحة** (primary, navigates back to `/student/srs`)
  - **مراجعة إضافية** (secondary, only shown if cards remain — extra practice mode)

### E.4 — `SrsSettings.jsx`

**Drawer**: slides up from bottom on mobile (`<768px`), slides in from right on desktop. Uses Framer Motion.

Reads/writes `profiles.srs_*` columns via TanStack mutation.

- **كلمات جديدة يومياً** — slider 0 / 5 / 10 / 20 / 30 / 50 (default 20). Show selected value next to label.
- **حد المراجعات اليومية** — slider 50 / 100 / 200 / 300 / 500 (default 200).
- **ترتيب المراجعة** — segmented pills: حسب المستوى / عشوائي / حسب الوحدة.
- **تشغيل الصوت تلقائياً** — toggle (default on).
- Auto-save: debounce 500ms after a change, then update. Show subtle "تم الحفظ ✓" micro-animation in the corner.
- Close button (X) and tap-outside-to-dismiss.

### E.5 — `SrsStatsCard.jsx`

Compact horizontal widget for use anywhere (sidebar, future curriculum integration).

- Title: "مراجعة اليوم"
- Three inline stats: due count | new available | streak (with 🔥 if > 0).
- Tap anywhere → navigate to `/student/srs`.
- Hidden entirely if all three are zero (don't clutter UI for caught-up students unless explicitly placed).

### E.6 — Commit

```bash
git add src/pages/student/SrsHome.jsx src/components/srs/
git commit -m "feat(srs): premium SrsHome + ReviewSession + SessionComplete + Settings + StatsCard"
git push origin main
```

---

## PHASE F — ROUTE + NAV

### F.1 — Mount `/student/srs`

Find router config: `grep -rln "createBrowserRouter\|<Routes>" src/`. Add:

```jsx
import SrsHome from '@/pages/student/SrsHome';
// inside the student routes block:
{ path: '/student/srs', element: <SrsHome /> }
```

Keep existing DailyReview route mounted — it still works post-refactor (Phase D).

### F.2 — Sidebar nav entry

Find nav config: `grep -rln "navigation\|sidebar" src/config/ src/components/layout/`. Add the entry:

```js
{
  label: 'مراجعة المفردات اليومية',
  href: '/student/srs',
  icon: BookOpenCheck, // from lucide-react
  // order: position above 'المنهج' (curriculum), below 'الرئيسية' (dashboard)
}
```

If the nav supports dynamic badges, wire up a `<NavBadge>` that reads `getDueCount(profile.id)` and shows it next to the label when > 0 (small gold pill).

### F.3 — Commit

```bash
git add src/App.jsx src/config/navigation.js src/components/layout/
git commit -m "feat(srs): mount /student/srs route + sidebar nav 'مراجعة المفردات اليومية'"
git push origin main
```

---

## PHASE G — CLEANUP

### G.1 — Delete orphaned files

```bash
git rm -r src/components/anki/
git rm src/lib/fsrs.js  # old custom FSRS, replaced by src/services/srs.ts
git rm src/hooks/useAnkiSession.js
```

### G.2 — Check for stragglers

```bash
grep -rln "from.*anki\|from.*lib/fsrs\|useAnkiSession" src/ 2>/dev/null
```

If any file still imports from those paths → refactor or delete that consumer file. The audit confirmed no live route mounted these, so consumers should be limited.

### G.3 — Rename user-facing strings

```bash
grep -rnE "Anki|أنكي|انكي" src/ 2>/dev/null
```

Replace with:
- Arabic UI strings: "مراجعة المفردات اليومية" or "المراجعة اليومية"
- English UI strings: "Daily SRS Review" or "Daily Review"
- Internal variable names (`useSrs`, `srs.ts`, etc.) stay as-is.

### G.4 — Commit

```bash
git add src/
git commit -m "chore(srs): delete orphaned anki UI + old lib/fsrs.js + useAnkiSession hook"
git push origin main
```

---

## PHASE H — SMOKE TEST + FINAL REPORT

### H.1 — TypeScript check on the service consumers

```bash
npx tsc --noEmit
```

If any errors → fix and re-commit before the smoke test.

### H.2 — Real DB smoke test against applyRating

Pick a test student (Ali's admin UUID `e5528ced-b3e2-45bb-8c89-9368dc9b5b96` works, OR query `SELECT student_id FROM curriculum_vocabulary_srs LIMIT 1`).

Script (save to `scripts/_smoke-srs-frontend.cjs`, throwaway — don't commit):

```js
// Fetch one card, apply Good, verify state transition + log row
// Apply Again on the same card, verify state, log row count = 2
// Apply Easy, verify state advances to review, scheduled_days >= 3
```

Print before/after of card state for each rating. Confirm:
- After Good on a new card → state='learning', due within 10 min
- After Again → state='learning' (still), reps incremented, lapses incremented
- After Easy → state='review', scheduled_days >= 3
- `srs_review_logs` row count incremented by 3 for that vocabulary_id

### H.3 — Vercel deploy verification

Open the Vercel deploy URL after the final push. Manually verify:
- `/student/srs` loads with the premium SrsHome
- Sidebar shows "مراجعة المفردات اليومية" entry
- Old DailyReview route still loads (no 404, no broken UI)
- Settings drawer opens, all four controls visible
- Tapping "ابدأ المراجعة" opens the review session (with at least one card if test student has due cards)

### H.4 — Final report

Write `docs/vocab-section/PHASE-D-SRS-FRONTEND-REPORT.md`:

```markdown
# SRS Frontend (Phases D–H) — Final Report

## Files created
- src/pages/student/SrsHome.jsx
- src/components/srs/SrsReviewSession.jsx
- src/components/srs/SrsSessionComplete.jsx
- src/components/srs/SrsSettings.jsx
- src/components/srs/SrsStatsCard.jsx

## Files modified
- src/hooks/useSrs.js (canonical) + dedupe
- src/components/.../DailyReview.jsx
- src/components/vocabulary/WordExerciseModal.jsx
- src/App.jsx (or router config)
- src/config/navigation.js

## Files deleted
- src/components/anki/* (N files)
- src/lib/fsrs.js
- src/hooks/useAnkiSession.js
- src/hooks/useSRS.js (deduped to useSrs.js)

## Smoke test results
<paste before/after states from H.2>

## Vercel verification
- /student/srs: ✓ loads
- Sidebar entry: ✓ visible
- /student/<old daily review>: ✓ still works
- Review session: ✓ opens and rates correctly

## Deferred / known gaps
<anything not done — e.g., empty state copy needs review, etc.>
```

```bash
git add docs/vocab-section/PHASE-D-SRS-FRONTEND-REPORT.md
git commit -m "docs(srs): phase D-H frontend completion report"
git push origin main
```

---

## ⚠️ HARD RULES (RECAP)

1. `student_id` everywhere — not user_id.
2. Hooks at top of components. Conditional returns AFTER hooks.
3. .select() after every .update().
4. Atomic phase commits, push after each phase, verify Vercel after each.
5. 97 active students must not break — Phase D refactor preserves their experience.
6. No vite build locally.
7. Design system tokens only — no raw hex codes, no inline colors.

Begin Phase D.
