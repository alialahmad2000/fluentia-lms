# Curriculum Performance Foundation — Before Step 2 Redesign
Date: 2026-04-20

## Root Causes Identified

1. **Tab remount on every switch (PRIMARY)** — `AnimatePresence mode="wait"` with `key={activity-${activeActivity}}` caused React to fully unmount the previous tab and mount the new one on every switch. Each mount triggered all tab useEffects + Supabase queries.

2. **29 queries per full tab cycle** — Reading(10) + Vocabulary(7) + Speaking(6) + Grammar(2) + Listening(2) + Writing(2) = 29 Supabase calls if a student visits all tabs in one session. With remounting, repeated tab visits doubled this.

3. **Framer Motion AnimatePresence on tab transitions** — `AnimatePresence mode="wait"` animated out the old tab, then animated in the new one — 300ms dead time per switch, plus JS animation overhead.

4. **No lazy-mount-once strategy** — Each visit to a previously-seen tab triggered a fresh React subtree creation with all hooks and effects.

## Fixes Applied

- **Lazy-mount-once pattern** (`UnitContent.jsx`): Replaced `AnimatePresence mode="wait"` with a `visitedTabs` Set (state). Each tab mounts on first visit and stays mounted. Subsequent switches toggle `display: none/block` via CSS — zero unmount/remount cost, zero re-queries.

- **Mission grid always mounted**: The mission grid (SmartNextStepCTA + MissionGrid + UnitMasteryCard) is now always in the React tree, hidden with `display: none` when inside an activity. Eliminates remount when navigating back from a tab to the grid.

- **Replaced AnimatePresence tab transitions with CSS**: Removed the `<AnimatePresence mode="wait">` wrapper and per-tab `<motion.div key={...}>` elements. Instant CSS show/hide replaces 300ms Framer Motion unmount+remount cycle.

- **Removed unused `activeLabel` declaration**: Dead variable cleanup.

- **vite.config `esbuild.drop`**: Console/debugger stripping in production was already configured — confirmed ✓.

- **QueryClient defaults**: Already well-tuned (staleTime 5min, gcTime 30min, refetchOnWindowFocus: false, placeholderData: previousData) — no changes needed.

- **No `select('*')` patterns found** in any tab component — queries already use specific column selects ✓.

## Estimated Impact

| Metric | Before | After |
|---|---|---|
| Queries per full tab cycle (7 tabs) | 29 | 29 (first visit only) → 0 on revisit |
| Tab switch cost (revisit) | full unmount + remount + queries | CSS toggle (< 1ms) |
| AnimatePresence overhead per switch | ~300ms JS animation | 0 |
| Dead JS (console/debugger in prod) | stripped by esbuild ✓ | ✓ |

## Lessons for Step 2 (Cinematic Curriculum Redesign)

When adding visual depth (particles, cinematic transitions, animated backgrounds):

- **Never use `AnimatePresence` on tab content** — use CSS `display: none/block` or `opacity` transitions instead. AnimatePresence unmounts/remounts, destroying query cache and re-triggering all effects.
- **Lazy-mount-once is the correct pattern for tab-heavy pages** — mount on first visit, keep mounted, toggle visibility.
- **Keep Framer Motion for page-level transitions** (hero entry, modal overlays) — not for tab switches that happen 10+ times per session.
- **Always verify query counts before adding new tabs** — each tab with 5+ useQuery calls costs 5+ network round-trips on first mount.
- **Mission grid should always stay mounted** — it's the "home base" the student returns to repeatedly. Remounting it on every "back to grid" action added cumulative overhead.
- **React.memo on tab components** prevents re-renders from parent state changes (trophyOpen, showBrief, etc.) — add for Step 2 when redesigning tab files.
