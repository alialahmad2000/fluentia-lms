# Phase A — Listening Audio + Vocab Regression Diagnosis
Generated: 2026-05-18

---

## ListeningPlayer audio path

- **audioUrl flow:** prop → `useEffect([audioUrl])` sets `el.src` + calls `el.load()` (fixed)
- **Error event handled:** YES (fixed — shows Arabic error message + retry button)
- **preload:** `metadata`
- **crossOrigin:** NOT SET (CORS is `*` so not needed; adding it would be speculative)
- **playsInline:** YES (fixed — required for iOS Safari)
- **speaker_segments shape:** `{ text, order, gender, speaker, voice_id, char_count, voice_name }` — no `start_ms`/`end_ms` fields present in DB (timing was never written back after generation). Tick marks and "يتحدث الآن" label will remain dormant until a future regen writes `start_ms`/`end_ms` back.

**Anti-patterns found (and fixed):**
- ❌ `error` event not handled → silent failure on any load error → **FIXED**
- ❌ `audioUrl` not in useEffect deps → URL changes (new unit) didn't trigger `audio.src = url; audio.load()` → **FIXED**
- ❌ `play()` rejection swallowed with `.catch(() => {})` → no feedback when play failed → **FIXED** (shows visible error)
- ❌ No `playsInline` → iOS Safari may show fullscreen player → **FIXED**
- ❌ `playing` / `currentSec` state not reset when URL changes → stale progress bar on navigation → **FIXED**

---

## Audio URL probe (3 samples)

| Type | HTTP | Content-Type | Accept-Ranges | CORS | Magic bytes | Verdict |
|---|---|---|---|---|---|---|
| dialogue (combined.mp3) | 200 | audio/mpeg | bytes | `*` | ID3 (MP3) | OK |
| interview (combined.mp3) | 200 | audio/mpeg | bytes | `*` | ID3 (MP3) | OK |
| monologue (s0_narrator.mp3) | 200 | audio/mpeg | bytes | `*` | ID3 (MP3) | OK |

All storage objects: correct MIME, Range support, public CORS. No storage-level bug.

---

## URL format check

- **DB stores:** full `https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/...` URL ✓
- **Parent passes:** same URL directly to player ✓
- **Verdict:** OK — no transform needed

---

## Diagnosis

The audio was not playing because:
1. Primary: on iOS Safari, the `<audio src={audioUrl}>` JSX prop change (when navigating units) does NOT automatically call `audio.load()` — the audio element keeps the old source. Fixed by dedicated `useEffect([audioUrl])` that explicitly sets `src` + calls `load()`.
2. Secondary: `play()` rejection was silently swallowed → no feedback → appeared as if audio was broken even when the issue was transient (e.g., called before metadata loaded).
3. No `error` event listener meant any real load failure was completely invisible.

---

## Vocab completion regression

### Card component
- **File:** `src/pages/student/curriculum/tabs/VocabularyTab.jsx`
- **WordCard** (line 690): renders `isMastered = mastery?.mastery_level === 'mastered'` → green dot + border + "أتقنتها" text ✓
- **Completion-check JSX:** present and correct at lines 713–742

### Write path
- **Trigger:** student completes exercise in `WordExerciseModal` → `handleExerciseComplete` → upsert to `vocabulary_word_mastery`
- **Table written:** `vocabulary_word_mastery`
- **Field set:** `meaning_exercise_passed / sentence_exercise_passed / listening_exercise_passed` = true → trigger `trg_update_mastery_level` computes `mastery_level`
- **Status:** WORKING — B.4 confirmed recent writes with `mastery_level: 'mastered'`

### Read path
- **Hook:** `useVocabularyMastery(profile?.id, unitId)` in `src/hooks/useVocabularyMastery.js`
- **Returns:** `masteryMap` = `{ [vocabulary_id]: mastery_record }`
- **Includes completion field:** YES — includes `mastery_level`, `meaning_exercise_passed`, etc.
- **Error handling:** was MISSING for the mastery SELECT query → silent empty map on any RLS/network error → **FIXED** (now throws)
- **Status:** Mechanism correct; potential failure mode was silent empty result

### `handleMasteryUpdate` fix
- **Previous:** `queryClient.setQueryData(...)` only, no fallback if `updated` was null
- **Fix:** Added `queryClient.invalidateQueries(...)` alongside `setQueryData` to force re-fetch from DB, ensuring the green check appears even if optimistic update was stale

### Git history
- No single commit identified as the regression root. The mechanism is architecturally correct but was fragile due to:
  1. Missing error check on mastery SELECT (silently returned empty masteryMap on any failure)
  2. Missing `invalidateQueries` fallback (optimistic update only, no eventual consistency)

### Diagnosis
The green check disappeared because: the mastery SELECT query had no error check, and the `handleMasteryUpdate` had no `invalidateQueries` fallback — so if the optimistic `setQueryData` cache update was lost on a React re-render boundary, the check would not reappear until the next full page load.

---

## Listening player redesign

- **Pattern chosen:** α (fixed positioning, sidebar width measured via `useSidebarWidth`)
- **`data-sidebar-root`:** added to `<aside>` in `Sidebar.jsx` so `useSidebarWidth` can measure it
- **Position:** `position: fixed; bottom: 0; left: 0; right: sidebarWidth`
- **Mobile:** `right: 0` (sidebarWidth = 0 on mobile/when sidebar hidden)
- **iOS:** `padding-bottom: max(16px, 16px + env(safe-area-inset-bottom))` for home indicator clearance
- **Content spacer:** player renders a `<div style={{ height: collapsed ? 80 : 160 }}>` spacer to prevent last content from being hidden behind the bar
