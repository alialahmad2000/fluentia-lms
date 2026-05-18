# Listening Audio + Vocab Completion — Final Report
Generated: 2026-05-18

---

## Listening audio

**Root cause:** `ListeningPlayer.jsx` lacked a dedicated `useEffect([audioUrl])`. The `<audio src={audioUrl}>` JSX prop change alone doesn't reliably trigger `audio.load()` on iOS Safari — the audio element keeps the old source when navigating between units. `play()` rejection was silently swallowed. No `error` event handler, so load failures were invisible.

**Fix:**
1. Added `useEffect([audioUrl])` that explicitly sets `el.src = audioUrl` + calls `el.load()`, resets playback state
2. Added `error` event listener with visible Arabic error state + retry button
3. `play().catch()` now sets `loadError` (visible to user)
4. Added `playsInline` attribute (iOS Safari fullscreen prevention)

**Files changed:** `src/components/players/listening/ListeningPlayer.jsx`

**Verification:**
- Audio URLs: 200, `audio/mpeg`, `Accept-Ranges: bytes`, CORS `*`, ID3 magic bytes — storage layer is healthy
- No `crossOrigin` set (CORS is wildcard, adding it speculatively would break things)

---

## Listening player redesign

**Pattern chosen:** α — `position: fixed`, sidebar width from `useSidebarWidth` hook

**How it works:**
- `useSidebarWidth` measures the `[data-sidebar-root]` element's width via `ResizeObserver`
- `data-sidebar-root` attribute added to `<aside>` in `Sidebar.jsx`
- Player bar: `position: fixed; left: 0; right: sidebarWidth; bottom: 0`
- On mobile (no sidebar): `right: 0` → full width
- iOS safe-area: `padding-bottom: max(16px, 16px + env(safe-area-inset-bottom))`
- Content spacer (`height: 80–160px`) rendered by the player itself to prevent content hidden behind bar

**Visual:** Dark glass card (`rgba(6,14,28,0.92)` + `backdrop-blur(24px)`), gold hairline top accent, gold play button, speaker tick marks, "يتحدث الآن" label, 5s skip, 0.5–1.5× speed, A-B loop, collapse toggle.

**Files changed:** `src/components/players/listening/ListeningPlayer.jsx`, `src/components/players/listening/ListeningSection.jsx`, `src/components/layout/Sidebar.jsx`

---

## Vocab completion check

**Root cause:** `handleMasteryUpdate` in `VocabularyTab.jsx` used `queryClient.setQueryData` (optimistic update) but had no `invalidateQueries` fallback. If the optimistic update was lost (React re-render boundary, concurrent update from another query), the green check would not reappear until next full page load. Additionally, the mastery SELECT query in `useVocabularyMastery` had no error check — a silent failure would produce an empty `masteryMap` (all cards show as "new").

**Fix:**
1. `handleMasteryUpdate` now calls `queryClient.invalidateQueries` alongside `setQueryData`, ensuring a fresh DB fetch confirms the mastery level
2. Handles null `updated` (RLS RETURNING edge case) by invalidating and re-fetching
3. `useVocabularyMastery` mastery SELECT now throws on error (surfaces silently-empty-map failures)

**Files changed:** `src/pages/student/curriculum/tabs/VocabularyTab.jsx`, `src/hooks/useVocabularyMastery.js`

---

## Self-check results

| Check | Result |
|---|---|
| No `crossOrigin` on `<audio>` | ✓ |
| `playsInline` present | ✓ |
| `play()` called from click handler | ✓ |
| Error state visible to user | ✓ |
| `isMastered` conditional in WordCard | ✓ |
| No `fixed bottom-0` class (uses inline style) | ✓ |
| ESLint passes on listening player files | ✓ |
| All hooks before returns | ✓ |
| Audio URL headers unchanged: 200 / audio/mpeg / Accept-Ranges | ✓ |
| DB: recent mastery writes confirmed | ✓ |

---

## Follow-ups (out of scope)

- `speaker_segments` in DB has no `start_ms`/`end_ms` — tick marks and live "يتحدث الآن" label won't show until listening audio is re-generated with timing data written back to the DB
- L0/L1 monologue `word_timestamps` still NULL (low priority — simple single-voice audio)
