# Stability Crisis — Diagnostic Report
**Generated: 2026-04-14**

---

## Timeline
- **Last known-good state**: `b1f8c96` (2026-04-14 04:49) — Phase 0 design system foundation
- **Issues intensified**: Between `7e8ffe2` (Phase 1 nav redesign, 05:32) and `4be433f` (emergency fix, 08:00)
- **Emergency fixes applied**: `4be433f` (ErrorBoundary defensive hardening) and `1a5b9d3` (isImpersonating crash fix)
- **Note**: 15 commits in ~13 hours — extremely rapid churn, high regression risk

---

## Problem 1 — Crashes

### Build status
- Local `npm run build`: **PASS** (30.19s)
- **1 warning**: `eruda-DUhdLQ_m.js` is 506.28 KB (over 500 KB chunk limit)
- No TypeScript/JSX errors

### ErrorBoundary instrumentation
- Logs to console: **Y** (`console.error` in `componentDidCatch`, line 17)
- Logs to backend: **Y** (via `tracker.track('error_displayed', ...)`, line 19)
- Logs to Supabase table: **N** — no direct DB insert of errors
- Technical details only shown in dev mode (`import.meta.env.DEV`, line 66) — **production users see no error details**

### Root cause identified: `isImpersonating()` selector crash
- **File**: `src/pages/student/StudentProfile.jsx:771`
- **Bug**: `useAuthStore((s) => s.isImpersonating())` — calling a function inside a Zustand selector is **invalid**. Zustand selectors must return a value, not call a method. This causes an immediate crash on every render of `AppearanceContent`
- **Fix applied**: Commit `1a5b9d3` changed to `useAuthStore((s) => s.impersonation)` + `!!impersonation`
- **No remaining instances**: Grep confirms all `isImpersonating()` selector patterns are eliminated

### Other crash risk patterns in recent commits
- **None found** in the last 4 commits' changed files. No conditional hooks, no unsafe destructuring in the modified files.

### Uncleaned realtime subscriptions
| File | Has cleanup? | Channel name |
|------|-------------|--------------|
| `src/stores/authStore.js:126-138` | **Y** — removes previous channel before subscribing | `student-{userId}` |

**No other realtime subscriptions found.** The auth store properly cleans up on sign-out (line 88) and before re-subscribing (line 124).

---

## Problem 2 — Slowness

### Bundle sizes (key chunks)
| Chunk | Size | Gzipped |
|-------|------|---------|
| `vendor-charts` | 432.46 KB | 114.64 KB |
| `UnitContent` | **455.21 KB** | 117.35 KB |
| `eruda` (debug tool) | **506.28 KB** | 160.88 KB |
| `index` (main) | 282.57 KB | 77.50 KB |
| `vendor-supabase` | 175.83 KB | 46.14 KB |
| `vendor-react` | 158.43 KB | 51.97 KB |
| `vendor-motion` | 116.07 KB | 38.48 KB |
| `StudentDashboard` | 94.17 KB | 25.47 KB |
| `VocabularyFlashcards` | 97.21 KB | 27.52 KB |

**Total initial download** (index + vendor-react + vendor-supabase + vendor-motion): ~733 KB / 214 KB gzipped
**Eruda** is bundled even though it's only activated with `?debug=1`. Dynamic import is used but Vite still creates the chunk and it's included in the service worker precache (21 entries, 581.55 KB).

### Dashboard complexity (`StudentDashboard.jsx`)
- **Lines**: 658
- **useEffect hooks**: 1 (countdown timer)
- **useQuery hooks fired on mount**: 4 direct + 4 child widget queries = **~8 parallel Supabase queries**
  1. `dashboard-weekly-progress`
  2. `dashboard-weekly-tasks-detail` (depends on #1)
  3. `student-pending-assignments`
  4. `student-next-payment`
  5. `dashboard-nudges` (SmartNudgesWidget)
  6. `pending-exercises-count` (ExercisesCTA)
  7. DailyProgressWidget queries
  8. WeeklyProgressWidget queries
  9. PersonalDictionaryWidget queries
  10. LiveLevelActivityFeed queries
  11. StreakWidget queries
  12. TeamCard queries
- **Verdict**: **RED FLAG** — easily 10+ parallel queries on dashboard mount

### Animation audit
- `<motion.` elements across codebase: **~200+ instances** (count from files)
- `animate=`/`initial=`/`whileHover=` props: **200+ across 100+ files**
- **Infinite/constant animations**: 45 occurrences across 25 files
  - `repeat: Infinity` in AuroraBackground, DuelsBackdrop, FloatingParticles, MysteryBox, LevelUpCelebration, AchievementUnlock, ShareCard, StreakWidget, TeamCard, PlacementTest, ShimmerProgress, etc.
  - CSS `animation: infinite` in `animations.css` (14 occurrences), `index.css`, `components.css`

### Aurora background (`src/design-system/components/AuroraBackground.jsx`)
- **Blob count**: 3 animated blobs
- **Blob size**: `70vw x 70vw` each — massive
- **Blur filter**: `blur-3xl` (Tailwind = 64px blur) — **GPU-intensive**
- **Mobile optimization**: **NO** — same 3 blobs at 70vw on mobile
- **`prefers-reduced-motion` respected**: **YES** — uses `useReducedMotion()` from framer-motion, disables animation when reduced motion is preferred
- **Still renders blobs on reduced-motion**: Yes, they just don't animate (still 3 massive blurred divs)

### Heavy third-party imports
- `recharts` imported in: `StudentAIProfile`, `TrainerCurriculum`, `StudentProgressDetail`, `TrainerStudentView` — all lazy-loaded routes, acceptable
- **eruda** (506 KB): Dynamic import but chunk still generated and precached

---

## Problem 3 — Data Loss (CRITICAL)

### Persistence table
- **`student_curriculum_progress`** — single table for all activity types (grammar, reading, vocabulary, writing, listening, speaking, pronunciation)
- Key columns: `student_id`, `unit_id`, `grammar_id`, `reading_id`, `section_type`, `status` (in_progress/completed), `score`, `answers` (JSONB), `attempt_number`, `is_latest`, `is_best`, `time_spent_seconds`

### Per-activity persistence behavior

| Activity | Persistence | When it saves | Auto-save? | Resumable on return? |
|----------|------------|---------------|------------|---------------------|
| **Grammar** | DB (`student_curriculum_progress`) | After each answer (auto-save useEffect) | **Y** | **NO** — deliberately does not hydrate in-progress answers |
| **Reading** | DB (`student_curriculum_progress`) | On comprehension complete only | **N** — only on final submit | **Partially** — loads completed attempts but not in-progress MCQ selections |
| **Vocabulary** | DB (mastery hooks) | Per-word mastery events | Y | Y (mastery is per-word) |
| **Writing** | **localStorage** (`fluentia_writing_draft_{taskId}`) | Manual draft save | **N** | **Y** — but only on same device/browser |
| **Listening** | Unknown — needs deeper check | — | — | — |
| **Speaking** | Unknown — needs deeper check | — | — | — |

### ROOT CAUSE OF DATA LOSS — Grammar

**File**: `src/components/grammar/ExerciseSection.jsx`, lines 64-76

```javascript
if (latest.status === 'completed') {
  // Do NOT hydrate answers — student sees empty cards ready for a new attempt
  setIsCompleted(true)
  setShowSummary(true)
  hasSaved.current = true
} else {
  // In-progress attempt: do NOT hydrate previous answers.
  // Students must always see a fresh state on page load.
}
```

**The exact reproduction path**:
1. Student opens grammar → `answers` state initialized as `{}` (line 13)
2. Student answers 4 of 8 questions → auto-save fires after each answer, saves to DB with `status: 'in_progress'`
3. Student clicks "vocabulary" tab → URL changes to `?activity=vocabulary`, `GrammarTab` unmounts, `answers` state is destroyed
4. Student clicks back to "grammar" → `GrammarTab` remounts, `ExerciseSection` remounts
5. `useEffect` on line 42 fires, loads the in-progress row from DB
6. **Lines 72-76**: Code deliberately skips hydrating answers: "Students must always see a fresh state on page load"
7. Student sees **all 8 questions blank** — their 4 answers appear lost
8. When they answer the first question, auto-save fires and **creates a new row** or updates with only 1 answer — the previous 4 answers in the DB are superseded

**The answers ARE in the database** but the UI intentionally refuses to restore them. This is a deliberate design decision (to prevent showing ✓/✗ marks) that creates a devastating UX of "my work disappeared."

### Navigation mechanism
- `UnitContent.jsx` uses `useSearchParams` for activity switching (line 63, 176-178)
- `handleActivitySelect` sets `?activity=grammar` etc. via `setSearchParams`
- Each activity tab is **conditionally rendered** (line 187-199): `case 'grammar': return <GrammarTab unitId={unitId} />`
- When switching activities, the previous tab's component **fully unmounts** — all React state is destroyed

### Writing draft risk
- `WritingTab.jsx` uses `localStorage` for drafts (lines 18-26)
- This means writing drafts are device-specific and will be lost on: different device, incognito mode, cleared browser data
- No DB persistence for in-progress writing drafts

---

## Auth & Session

### Supabase client config (`src/lib/supabase.js`)
- `autoRefreshToken`: **Y** (line 12)
- `persistSession`: **Y** (line 13)
- `detectSessionInUrl`: **Y** (line 14)
- Custom storage: **N** — uses default localStorage

### Auth state listener (`src/stores/authStore.js:74-92`)
- `onAuthStateChange` handler: **Y**
- Handles `SIGNED_IN`, `TOKEN_REFRESHED`, `SIGNED_OUT`
- On `TOKEN_REFRESHED`: updates user object + invalidates (not refetches) active queries — **correct behavior**
- On `SIGNED_OUT`: clears all state, removes realtime channel, clears query cache

### Session timeout handling
- `initialize()` wraps `getSession()` in a 6s timeout and `fetchProfile()` in an 8s timeout (lines 38-46)
- If either times out, does a local signOut to clear corrupted session (line 52, 60)
- **This is robust** — should not produce "data disappeared" from stale sessions

### Impersonation restore
- Stored in `sessionStorage` (survives refresh but not new tabs)
- Restored on init after auth (line 67-70)
- 5s timeout — non-blocking

---

## My Recommendations (ranked by severity + effort)

### 1. CRITICAL + LOW EFFORT: Fix grammar answer restoration
**Evidence**: `ExerciseSection.jsx:72-76` deliberately skips hydrating in-progress answers
**Fix**: When `status === 'in_progress'`, hydrate `answers` state from `latest.answers.exercises` — map each exercise result back to `{ selected, correct }`. Show answers as already-submitted (with ✓/✗ marks) since the student already answered them. The "exercises appear pre-checked" is the CORRECT behavior for resuming.

### 2. CRITICAL + MEDIUM EFFORT: Writing drafts to DB
**Evidence**: `WritingTab.jsx:18-26` uses localStorage only
**Fix**: Add auto-save to `student_curriculum_progress` with `section_type: 'writing'`, `status: 'in_progress'`. Keep localStorage as a fast local cache, but sync to DB with debounce.

### 3. HIGH + LOW EFFORT: Reduce dashboard query flood
**Evidence**: 10+ parallel Supabase queries on StudentDashboard mount
**Fix**: Batch into 2-3 RPC calls, or stagger non-critical widget queries with `staleTime` / lazy loading.

### 4. HIGH + LOW EFFORT: Disable Aurora blobs on mobile
**Evidence**: 3 blobs at 70vw with 64px blur, no mobile check
**Fix**: In `AuroraBackground.jsx`, reduce to 1 blob or disable entirely on `window.innerWidth < 768` or via CSS `@media`. Also consider reducing blur to `blur-2xl` (40px).

### 5. MEDIUM + LOW EFFORT: Exclude eruda from production precache
**Evidence**: 506 KB chunk in SW precache manifest
**Fix**: Mark eruda as external in Vite config or exclude from SW precache. It's already dynamically imported, just needs to not be precached.

### 6. MEDIUM + LOW EFFORT: UnitContent chunk is 455 KB
**Evidence**: All 9 activity tabs are imported (not lazy-loaded) in `UnitContent.jsx:17-25`
**Fix**: `lazy(() => import('./tabs/GrammarTab'))` etc. — only load the active tab.

### 7. LOW + LOW EFFORT: ErrorBoundary — show error details in production (temporarily)
**Evidence**: Line 66 gates technical details behind `import.meta.env.DEV`
**Fix**: Temporarily enable in production (or log to a `error_logs` table) until stability is resolved, so you can see what's crashing remotely.
