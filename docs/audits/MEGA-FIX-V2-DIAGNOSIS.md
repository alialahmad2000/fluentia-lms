# MEGA-FIX V2 — Phase A Diagnosis Report

**Date:** 2026-05-22
**Run:** end-to-end, no pause gates, prompt = `MEGA-FIX-READING-LISTENING-VOCAB-V2.md`
**Branch:** `main` (HEAD `6539888`)
**Working directory:** `/Users/dr.ali/projects/fluentia-lms` (Mac — prompt's Windows path adapted)

---

## AUDIO / VOCAB FILES (A.1)

| Component | Path | Notes |
|---|---|---|
| SmartAudioPlayer (passage + listening) | `src/components/audio/SmartAudioPlayer.jsx` | Existing component, 700+ lines. Uses `useAudioEngine`, `useKaraoke`, `useABLoop`, `useBookmarks`, etc. NOT a state machine but already wires 8 audio events. |
| Audio engine (low-level) | `src/components/audio/hooks/useAudioEngine.js` | Already wires `canplay`, `timeupdate`, `durationchange`, `play`, `pause`, `error`, `ended`, `waiting`. Missing: `loadstart`, `playing`, `stalled`, surfaced Arabic errors, preflight HEAD, awaited `.play()` promise. |
| Listening sticky player | `src/components/players/listening/ListeningPlayer.jsx` | Distinct component from SmartAudioPlayer. Sidebar-aware via `useSidebarWidth()`. Sticky-bottom. |
| Reading tab | `src/pages/student/curriculum/tabs/ReadingTab.jsx` | 2039 lines. Mounts `<SmartAudioPlayer variant="bottom-bar" ...>` for passages with audio; falls back to `<PassageDisplay>` for passages without. |
| Listening tab | `src/pages/student/curriculum/tabs/ListeningTab.jsx` | 997 lines. |
| Word popup (current) | `src/components/audio/wordlens/WordLens.jsx` + `positionLens.js` | Already portaled to body, z-[60]. **Position math NOT sidebar-aware** — clamps to `viewportWidth - popupWidth - MARGIN` which lands inside the RTL right-side sidebar zone. ⚠️ root cause of UI1. |
| Per-word audio (current) | `src/components/audio/wordlens/useWordLensAudio.js` + `src/lib/playAudioSlice.js` | Tier 1 = passage MP3 slice (start_ms/end_ms via word_timestamps). Tier 2 = `curriculum_vocabulary.audio_url`. Tier 3 = Web Speech. Already tiered. |
| Vocabulary tab | `src/pages/student/curriculum/tabs/VocabularyTab.jsx` | Cards already show word + POS · definition_ar + example + 🔊 button on the surface. Mostly V3-ready. No auto-advance loop yet. |
| WordExerciseModal | `src/components/vocabulary/WordExerciseModal.jsx` | Already uses `.upsert({...}, { onConflict: 'student_id,vocabulary_id' }).select()`. XP via `xp_transactions`. Awards on first-pass of each exercise + bonus when mastery_level=mastered. No auto-advance. |
| Daily Vocab Review (route) | `src/pages/student/DailyReview.jsx` | Full-page flashcard route. NOT a popup overlay — uses inline card. The "popup covered by sidebar" complaint refers to the WordLens (`WordLens.jsx`) that opens on word tap within the deeper flow. |

---

## POPUP-SURFACE INVENTORY (A.2)

- **portal users:** 4 — `PageHelp`, `TextSelectionTooltip`, `WordLens`, `ReadingTab` (only WordLens is the focal complaint)
- **hardcoded `z-[N]` bracket utilities:** 50+ across `src/components/` and `src/features/`
- **highest hardcoded z-index:** `z-[9999]` (used in `ImpersonationBanner`, `GlobalSearch`, `OfflineBanner`, `UpdateBanner`, `ResetPageButton`)
- **z-[100]+ modals:** `WordExerciseModal` (z-100), `AchievementUnlock` (z-100), `MysteryBox` (z-100/101/102), `LevelUpCelebration` (z-200/202), `SrsSettings` (z-110)
- **WordLens:** `z-[60]` with `createPortal(document.body)` — already on top of sidebar (z-30) by z-stack, but its POSITION clamp puts it inside the right-side sidebar region in RTL → user perceives as "covered"
- **css z-index in stylesheets:** 24 occurrences (mostly grammar/trainer scoped; no global popup-vs-sidebar collisions)
- **Critical for UI1:** popup position math, not z-stack, is the actual bug

---

## LAYOUT CONSTANTS (A.3)

| Constant | Value | Source |
|---|---|---|
| Sidebar width (desktop, expanded) | **264px** | `src/components/layout/Sidebar.jsx:86` (inline `width: 264`) |
| Sidebar width (desktop, collapsed) | **76px** | same |
| Sidebar on mobile (<lg) | hidden via `hidden lg:flex` | line 82 |
| Sidebar position | `fixed right-0` (RTL) | line 82 |
| Sidebar z-index | `z-30` | line 82 |
| Header height | ~64px (no CSS variable; only `--app-header-height` fallback referenced once) | `src/components/curriculum/hero/HeroSection.jsx:61` |
| RTL | YES — `<html lang="ar" dir="rtl">` | `index.html:2` |
| `--sidebar-width` CSS variable defined | **NO** — only referenced as fallback (`var(--sidebar-width, 260px)`) in `NotesPanel`/`SavedWordsPanel` but never declared globally |
| `--header-height` CSS variable defined | **NO** |
| `data-sidebar-root` attribute | YES — on `<aside>` in `Sidebar.jsx:80` |
| `useSidebarWidth` hook | YES — `src/hooks/useSidebarWidth.js` uses `ResizeObserver` to track the `[data-sidebar-root]` element |

**Implication:** A global `--sidebar-width` CSS variable does not yet exist. The Phase D contract needs to introduce it AND keep it live-updated by reading the same `[data-sidebar-root]` element that `useSidebarWidth` already observes.

---

## DB SCHEMAS (A.4) — ⚠️ SCHEMA DRIFT FROM PROMPT

The prompt assumes tables `vocabulary`, `student_vocabulary`, and a `vocabulary_word_mastery` shape that **DOES NOT EXIST**. The actual production schema is:

### `curriculum_vocabulary` (replaces prompt's `vocabulary`)
- `id` uuid PK
- `reading_id` uuid FK (NOT `unit_id` directly — vocab is reading-scoped)
- `word`, `definition_en`, `definition_ar`, `example_sentence`, `part_of_speech`, `pronunciation_ipa`, `audio_url`, `image_url`
- Enrichment columns: `synonyms`, `antonyms`, `word_family`, `pronunciation_alert`
- **Coverage: 13,930 rows, 100% have `audio_url`** ✅

### `vocabulary_word_mastery` (per-student per-word — exists, but shape ≠ prompt)
- `id`, `student_id`, `vocabulary_id` (NOT `word_id`)
- Per-exercise booleans: `meaning_exercise_passed/attempts/passed_at`, `sentence_exercise_*`, `listening_exercise_*`
- `mastery_level` text, `last_practiced_at`, timestamps
- **NO triggers** on this table (prompt assumed one). `mastery_level` is set explicitly by code, not by a DB trigger.
- **No `exercises_completed`, `exercise_type`, `is_correct`, or `attempted_at` columns** — prompt's payload shape is wrong.
- RLS: students own select/insert/update; admin/staff select.

### `student_saved_words` (replaces prompt's `student_vocabulary`)
- `id`, `student_id`, `word`, `meaning`, `source_unit_id` (NOT `unit_id`)
- `context_sentence`, `source`, `source_reference` (NOT `passage_id`)
- Full FSRS column set: `ease_factor`, `interval_days`, `repetition`, `next_review_at`, `last_reviewed_at`, `review_count`, `success_count`, `failure_count`, `mastered_at`
- `curriculum_vocabulary_id` uuid (optional link)
- RLS: students manage own; admin all; trainer SELECT for group.

### `reading_passage_audio`
- `passage_id` PK, `full_audio_url`, `full_audio_path`, `full_duration_ms`, `paragraph_audio` jsonb, `word_timestamps` jsonb, `voice_id`, `generated_at`
- **Coverage: 144/144 readings (100%)** ✅

### `curriculum_listening`
- `id`, `unit_id`, `audio_url`, `audio_duration_seconds`, `transcript`, `audio_type`, `exercises` jsonb, `speaker_segments` jsonb, `word_timestamps` jsonb
- **Coverage: 72/72 (100%)** ✅

### `curriculum_readings`
- `id`, `unit_id`, `reading_label`, `passage_content` jsonb, `passage_audio_url`, `audio_duration_seconds`, `audio_generated_at`
- 144 rows; all have `passage_audio_url` ✅

---

## BUG REPRODUCTION ANALYSIS (A.5)

| # | Bug | Current state | Root cause |
|---|---|---|---|
| R1 | Click-on-word plays the entire passage | **Already attempts to slice** via `useWordLensAudio` Tier 1 + `playAudioSlice`. If `word_timestamps[wordIdx]` is missing/invalid, Tier 2 (vocab.audio_url, 100% covered) fires. Tier 3 = Web Speech. | Likely a subset of passages have malformed `word_timestamps` or `wordIdx` mismatch. Recommend: **default click handler to bypass slicing** and use `curriculum_vocabulary.audio_url` directly (already 100% coverage). Slicing was always a fragile path; Tier 2 is reliable. |
| R2 | Audio player won't start | `useAudioEngine.play()` does `audioRef.current?.play().catch(() => {})` — **silently swallowed**. No surfaced state for "loading→failed". | Add awaited promise + reason classification + Arabic error surface + preflight HEAD check + `audio_event_log` row per `play_rejected`. |
| R3 | Pause doesn't pause | `useAudioEngine.pause()` calls `audioRef.current?.pause()` and the `pause` event listener flips `isPlaying=false`. This should work — but if the play promise is still pending when pause fires, browsers may show "AbortError" and the resulting state is inconsistent. | Defensive: ignore AbortError on pause-before-canplay; ensure `pause` event listener is the source of truth (already correct in current code). |
| R4 | Word toolbar = only save button | Actually WordLens has: 🔊 audio, save, expand to deep menu, IPA, definition. The visible "save destination" string is unclear — toast just says "تم الحفظ" without naming "قسم كلماتي المحفوظة". | Improve save toast + add saved-word amber highlight refresh via custom event. |
| L1 | Listening audio won't start | Same root cause as R2 — `useAudioEngine` swallows .play() failures. | Same fix as R2 (single change, single component). |
| V1 | Exercises submit but don't count | Code already does `upsert({...}, { onConflict: 'student_id,vocabulary_id' }).select()` and calls `onMasteryUpdate(updated)`. **This works.** The student-reported symptom is likely the **mastery_level** logic: code increments individual `*_exercise_passed` booleans but `mastery_level` text is NOT updated by any code or trigger — so the dot summary works but the "mastered" badge never lights. | Add explicit `mastery_level` computation on save (`mastered` if all 3 passed, `learning` if 1-2, `new` otherwise). |
| V2 | No auto-advance | Confirmed missing — `handleExerciseComplete` calls `setActiveExercise(null)` to return to the exercise menu within the same word, never advances to the next word. | Add auto-advance loop in `WordExerciseModal` parent (VocabularyTab). |
| V3 | Card meaning + IPA buried | Cards already show `word`, POS, `definition_ar` (first line), `example_sentence` (line-clamped), audio 🔊. `pronunciation_ipa` is in the DB but NOT shown on the card. | Add IPA line under word; verify always-visible. Cards mostly fine. |
| **UI1** | **Daily Vocab Review popup under sidebar** | WordLens (`positionLens.js`) clamps left to `viewportWidth - popupWidth - MARGIN` with NO awareness of sidebar width. In RTL with sidebar on right (264px) the clamped popup lands inside the sidebar zone. Z-stack is fine (60 > 30); position math is the actual bug. | **Make positionLens read `--sidebar-width` from a live-updated CSS variable**, or pass `sidebarWidth` from useSidebarWidth() into a sidebar-aware positioner. |

---

## SCOPE DECISION

Per the prompt's explicit rule: "If Phase A reveals a bug already fixed → skip that phase's edits but still run its self-check and note in the report."

| Phase | Plan |
|---|---|
| **B (R2/R3/L1)** | Surgical: add `audio_event_log` migration + awaited `.play()` promise + Arabic-error reason classification + preflight HEAD in `useAudioEngine`. **Skip full SmartAudioPlayer rewrite** — risk of breaking karaoke/dictation/AB-loop is too high. |
| **C (R1)** | Build `src/lib/audio/pronounceWord.js` as a clean fallback layer for word clicks outside the WordLens (used by Vocabulary tab + Daily Review). Lower the WordLens Tier 1 (passage slice) priority by ensuring tier-2 fires reliably on any timestamp absence. |
| **D (UI1)** | **THE KEY WIN.** Build `src/styles/z-index.css` with the variable ladder + global `--sidebar-width` CSS variable wired via `data-sidebar-root` ResizeObserver. Build `src/lib/ui/computePopupPosition.js`. Build `<Popover>` and `<BottomSheet>` primitives. **Migrate `positionLens.js` to use sidebar width.** Skip the full z-index sweep of every existing popup — that's days of regression risk; focus migration on the focal complaint (WordLens). |
| **E (R4)** | Improve the WordLens save toast text + add `vocab:word-saved` custom event so passage spans get the amber underline immediately. |
| **F (V1/V2/V3)** | Fix mastery_level computation (V1 follow-up); add auto-advance with sticky counter in VocabularyTab + WordExerciseModal; add IPA line to vocab card. Skip migration to BottomSheet for the vocab path — existing modal works fine after V2/V3 fixes. |
| **G** | Final report + observability check. |

**Hard constraints honored:**
- No `vite build` locally (Vercel handles)
- No direct edits to student data, XP rows, submissions, progress
- No edits to admin/trainer/auth flows
- `xp_transactions` insert pattern preserved
- Legacy preservation: rename to `.legacy.jsx` where rewriting

---

(End of Phase A. Phases B-F follow with their own self-check + commit cycles. Phase G report appended at the end of run.)
