# READING-LENS P0 — DISCOVERY REPORT

Generated: 2026-05-20 05:11 Asia/Riyadh (UTC+03)
Working dir: /Users/dr.ali/projects/fluentia-lms
Git HEAD: 7b15596 — "fix(listening): regenerated 11 broken audio files + calibrated audit threshold to filter natural prosody"
Branch: main
Working tree: clean except 1 modified + 5 untracked markdown files (none touched by this audit).

---

## A. READING TAB — CURRENT STATE

### A1. Files

- **ReadingTab component path:** `src/pages/student/curriculum/tabs/ReadingTab.jsx`
- **LOC:** 2,086
- **Last commit touching this file:** `e4ef9f7` — "fix(reading): text + audio + karaoke now share single source of truth (article id)" (2026-05-19)
- **Sibling `.legacy.jsx` / `.deprecated.jsx`:** none for this file. The repo has 11 unrelated `.legacy/.deprecated` files (chat, dashboard, schedule, conversation, challenges, trainer-background) — listed in Appendix L.1.
- **Top-of-file imports (verbatim, lines 1-28):**

```jsx
import { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Volume2, CheckCircle, XCircle, Lightbulb, MessageSquare, ChevronDown, RotateCcw, History, Clock, ImageOff, Eye, EyeOff, StickyNote, Headphones, FileText, Loader2, Zap, Settings } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
// PERSONALIZATION-REVERT 2026-05-19: hidden from default flow.
// import PersonalizedReadingCard from '../../../../components/personalization/PersonalizedReadingCard'
import { useAuthUser } from '../../../../stores/authStore'
import { toast } from '../../../../components/ui/FluentiaToast'
import { awardCurriculumXP } from '../../../../utils/curriculumXP'
import TextSelectionTooltip from '../../../../components/student/TextSelectionTooltip'
import XPBadgeInline from '../../../../components/xp/XPBadgeInline'
import PageHelp from '../../../../components/PageHelp'
import { usePointerType } from '../../../../hooks/usePointerType'
import { useReadingPrefs } from '../../../../hooks/useReadingPrefs'
import { usePageReset } from '../../../../hooks/usePageReset'
import { useReadingPassageAudio } from '../../../../hooks/useReadingPassageAudio'
import { useWordHighlights } from '../../../../hooks/useWordHighlights'
import { useUnitVocabSet } from '../../../../hooks/useUnitVocabSet'
import SmartAudioPlayer from '../../../../components/audio/SmartAudioPlayer'
import { VocabPopup } from '../../../../components/audio/VocabPopup'
import { WordActionMenu } from '../../../../components/audio/parts/WordActionMenu'
import { WordTooltip } from '../../../../components/audio/parts/WordTooltip'
import { findWordTimestamp, resolveVoiceLabel } from '../../../../lib/findWordTimestamp'
import { trackEvent } from '../../../../lib/trackEvent'
```

### A2. Word interaction surface

When the student touches a single word inside the rendered passage, the surface is **layered through three sibling popups (and a fourth, deprecated stack still on disk)**:

| # | Component                                                | Path                                                  | LOC | Triggered by                                                       |
|---|----------------------------------------------------------|-------------------------------------------------------|----:|--------------------------------------------------------------------|
| 1 | `WordTooltip`                                            | `src/components/audio/parts/WordTooltip.jsx`          | 189 | Tap on a *vocab-marked* word (gold underline) — `onVocabWordTap`   |
| 2 | `WordActionMenu`                                         | `src/components/audio/parts/WordActionMenu.jsx`       |  84 | Long-press / context-menu on any word — `onWordLongPress`          |
| 3 | `VocabPopup` (mobile bottom-sheet + desktop popover)     | `src/components/audio/VocabPopup.jsx`                 | 265 | "lookup" from `WordActionMenu`, or "تفاصيل أكثر" from `WordTooltip`|
| 4 | `TextSelectionTooltip` (selection-range based)           | `src/components/student/TextSelectionTooltip.jsx`     | 480 | Native text selection in the no-audio `PassageDisplay` fallback only |
| 5 | `VocabTooltipPortal` (inline helper)                     | `src/pages/student/curriculum/tabs/ReadingTab.jsx`    |  ~30 lines, lines 1152-1198 | Desktop hover via `handleWordHover` (kept for hover path only) |

Number of separate popup/menu components found in the reading flow: **5 (3 active + 1 fallback-only + 1 inline)**.

A sixth, fully-built parallel stack exists on disk but is **NOT wired into ReadingTab.jsx**:

- `src/components/players/ReadingPassagePlayer.jsx` (50 LOC, last touched in `c433b96`) — exports `ReadingPassagePlayer`. `grep -rn "ReadingPassagePlayer"` returns only its own `export` line. Dead in the reading flow today.
- `src/components/players/InteractivePassage.jsx` (158 LOC) + `src/components/players/WordPopover.jsx` (93 LOC). These are still consumed by **`ListeningSection.jsx`** (line 116) and would *also* be the natural future word-tap engine, but they ship with two broken assumptions noted in §A3 / §C1.

Pointer-type detection hook: `src/hooks/usePointerType.js` — wired in `ReadingTab.jsx` at line 17; the `pointerType` value is passed to `TextSelectionTooltip` (line 919) only.

Settings toggle for word assist (localStorage + UI):
- Store: `src/hooks/useReadingPrefs.js` — backed by localStorage key `fluentia:reading-prefs:${studentId}` (read inside the hook).
- UI control: the "إعدادات القراءة" / preferences cog inside `ReadingTab.jsx` (`Settings` icon imported line 5). Toggles `word_assistance_enabled` + `quick_translation_on_hover_tap` + `detailed_menu_on_click_longpress` (gates the conditional `<TextSelectionTooltip>` at line 911 and conditional handlers on `KaraokeText`).

### A3. Existing word-tap actions wired today

For each action: status, where it's wired, and what (if anything) it writes to:

| Action                            | Status | Where wired | Writes to |
|-----------------------------------|:------:|-------------|-----------|
| Quick Arabic translation (tap)    | ⚠️ exists, **partially broken** | `WordTooltip` (line 130) shows `definition_ar` from `curriculum_vocabulary`. For non-vocab words the `regular-word` path inside `InteractivePassage` → `useTranslateWord` invokes the `vocab-quick-meaning` edge fn. But because ReadingTab does **not** use `InteractivePassage`, non-vocab tap inside the reading passage gets `WordActionMenu` instead of an instant translation — students must tap "📖 المعنى" first. | n/a |
| Single-word audio playback        | ⚠️ exists, **two parallel paths** | (1) `WordTooltip` → `playAudioSlice` (in-context slice of passage MP3 via `findWordTimestamp` + `useReadingPassageAudio.segments[0].word_timestamps`) — line 422-428 of ReadingTab.jsx. (2) `WordTooltip` standard pronunciation → `audio_url` from `curriculum_vocabulary` if present (lines 159-172 of WordTooltip.jsx). | n/a |
| Add to vocabulary ("احفظ")        | ⚠️ wired but **silently broken in two places** | Active path: `TextSelectionTooltip.handleSaveWord` (line 198) inserts into `student_saved_words` — but never sets `meaning`, so the Arabic translation is dropped (NOT NULL nullable, but loses data). Inside `VocabPopup` the button at line 213 only calls `console.log('Save to flashcards not implemented yet', vocab.word)`. The legacy `useSavedWords.addWord` at line 35 of `src/hooks/useSavedWords.js` writes column `definition_ar` which **does not exist on `student_saved_words`** (real column is `meaning`); the insert errors and the error is swallowed (no toast). | `public.student_saved_words` |
| Explain-in-context (AI)           | ⚠️ exists, **selection-only** | Inside `TextSelectionTooltip` via `fetch('/api/vocab-assist', { action_type: 'explain' })` (line 235). NOT reachable from the word-tap-action stack. | n/a |
| New examples (AI)                 | ⚠️ exists, **selection-only** | Same: `TextSelectionTooltip` → `vocab-assist` with `action_type: 'examples'`. NOT in word-tap menus. | n/a |
| Word family forms                 | ❌ not wired into reading | `WordFamilySection` component exists for vocabulary screens but no action in the reading word menu invokes it. No `word-family-forms` edge function. | — |
| Copy                              | ❌ not wired | No "نسخ" action on `WordActionMenu` or `WordTooltip`. Native long-press → system clipboard is suppressed by `WebkitTouchCallout: 'none'` on KaraokeText word spans (line 167 of `KaraokeText.jsx`). | — |

### A4. Known regressions / TODOs / commented-out code

Grep `TODO|FIXME|HACK|XXX` across `src/pages/student/curriculum/**` and `src/components/Reading*` returned mostly comment markers in unrelated submit-flow code. The notable items in the reading flow:

- `ReadingTab.jsx` line 7-10 — PERSONALIZATION-REVERT block (deliberately disabled `<PersonalizedReadingCard />` import + JSX). Not a TODO, but a "do not delete, may re-enable" marker.
- `ReadingTab.jsx` line 929-931 — same revert block at the render call.
- `VocabPopup.jsx` line 213 — `onClick={() => console.log('Save to flashcards not implemented yet', vocab.word)}` — the only "Save" button inside the deep popup is a no-op. (This is the canonical "the popup gives a beautiful card but the save button does nothing" regression.)
- `ReadingTab.jsx` line 1643 — inline comment `// which is disabled until ALL questions are answered. Writes…` — describes submit behaviour, not a regression.
- `ReadingTab.jsx` line 474 — `window.prompt('ملاحظتك على هذه الكلمة:', existingHighlight?.note || '')` — note-taking on a highlighted word uses native `prompt()`, which on iOS Safari renders the system Arabic input but cannot show RTL placeholder direction properly. A premium UX would replace with an inline composer; flagged for P5.
- Two parallel reading players exist on disk: `ReadingPassagePlayer.jsx` (dead — no consumer) and the `SmartAudioPlayer` actually wired in. The dead path uses `InteractivePassage` → `useUnitVocab`, which contains the broken DB schema reference noted in §C1.

---

## B. SMART AUDIO PLAYER — CURRENT STATE

### B1. File + size

- **Path:** `src/components/audio/SmartAudioPlayer.jsx`
- **LOC:** 776
- **Last commit:** `b69a3b2` — "feat(audio): karaoke parity + listening UX redesign"
- **Companion files (`src/components/audio/`):**
  - `hooks/` — `useAudioEngine.js`, `useKaraoke.js`, `useABLoop.js`, `useBookmarks.js`, `useKeyboardShortcuts.js`, `useMobileGestures.js`, `useDictation.js`, `useAutoResume.js`, `useAudioNavigationPause.js`, `useBarVisibility.js`
  - `parts/` — `ABLoopControls.jsx`, `BookmarkDrawer.jsx`, `BottomBarControls.jsx`, `DictationPanel.jsx`, `FloatingToggle.jsx`, `KaraokeText.jsx`, `ListeningFocusMode.jsx`, `OnePlayBanner.jsx`, `PlayerControls.jsx`, `ProgressBar.jsx`, `SettingsMenu.jsx`, `SettingsPopover.jsx`, `SpeakerBadge.jsx`, `WordActionMenu.jsx`, `WordTooltip.jsx`
  - `VocabPopup.jsx`, `lib/` (utility folder)

**Full prop signature (verbatim, SmartAudioPlayer.jsx lines 46-70):**

```jsx
export default function SmartAudioPlayer({
  audioUrl,
  text,
  wordTimestamps,
  segments,
  contentId,
  contentType = 'reading',
  studentId,
  features: featuresProp = {},
  onWordClick,        // legacy: single-click vocab popup (used in default/compact)
  onWordTap,          // tap = seek (regular words)
  onWordLongPress,    // long-press = action menu
  onVocabWordTap,     // tap on vocab-highlighted word = instant tooltip
  onWordHover,        // desktop hover tooltip
  onWordHoverEnd,     // desktop hover tooltip end
  highlightLookup,    // Map<`${segIdx}:${wordIdx}`, highlight> for student highlights
  vocabSet,           // Set<string> lowercase vocab words for marking
  onSegmentComplete,
  onPlaybackComplete,
  onDictationSubmit,
  onPlayCountChange,
  variant = 'default',
  showTranscriptByDefault = true,
  className = '',
})
```

**Default features (verbatim, lines 26-44):**

```js
const DEFAULT_FEATURES = {
  karaoke: true, speedControl: true, skipButtons: true,
  sentenceNav: true, paragraphNav: true, sentenceMode: false,
  abLoop: true, bookmarks: true, speakerLabels: true,
  hideTranscript: true, keyboardShortcuts: true, mobileGestures: true,
  dictation: false, autoResume: true, playbackHistory: true,
  wordClickToLookup: true, onePlayMode: false,
}
```

`PLAYER_VARIANTS` export (line 771): `Object.freeze({...})` — variants are `default`, `compact`, `bottom-bar`. ReadingTab uses `bottom-bar`.

### B2. Karaoke wiring — runtime data flow

```
curriculum_readings.id
    │
    ▼  (ReadingTab.jsx:78-91)
useQuery(['unit-readings', unitId]) → readings[]
    │
    ▼  (ReadingTab.jsx:384)
useReadingPassageAudio(reading.id, reading.passage_content)
    │
    ▼  (src/hooks/useReadingPassageAudio.js)
supabase.from('reading_passage_audio')
        .select('full_audio_url, full_duration_ms, word_timestamps, paragraph_audio, voice_id')
        .eq('passage_id', passageId)
        .maybeSingle()
    │
    ▼  (normalizes word_timestamps: flat array OR { all_words: [...] } → flat array)
audioData = {
  segments: [{ audio_url, duration_ms, text_content, word_timestamps, segment_index:0, speaker_label:null, voice_id }],
  paragraphAudio, voiceId,
}
    │
    ▼  (ReadingTab.jsx:851)
<SmartAudioPlayer segments={audioData.segments} ... />
    │
    ▼  (SmartAudioPlayer.jsx:102-109)
useKaraoke({ currentTime, currentSegmentIndex, segments, audioUrl, wordTimestamps, isBottomBarMode })
    │
    ▼  (useKaraoke.js:50-56)
timestamps = wordTimestamps ?? segments[currentSegmentIndex].word_timestamps
binarySearchWord(timestamps, currentTime * 1000)  // start_ms / end_ms in ms
    │
    ▼
setCurrentWordIndex(idx) → KaraokeText highlights span with data-word-idx === idx
```

**Storage table + column:** `public.reading_passage_audio` — JSONB column `word_timestamps`. Schema (verified via information_schema):

```
passage_id        uuid (PK, references curriculum_readings.id)
full_audio_url    text
full_audio_path   text
full_duration_ms  integer
paragraph_audio   jsonb
word_timestamps   jsonb    -- two historical shapes: flat array OR { all_words: [...] }
voice_id          text
generated_at      timestamptz
```

**Per-level coverage (verified live):**

```
level_number │ passages_with_audio │ with_timestamps
─────────────┼─────────────────────┼─────────────────
      0      │         24          │       24
      1      │         24          │       24
      2      │         24          │       24
      3      │         24          │       24
      4      │         24          │       24
      5      │         24          │       24
```

All 144 reading passages have audio AND word_timestamps. No gaps.

### B3. Audio modes shipped

| Mode                  | Status                              | Notes |
|-----------------------|:-----------------------------------:|-------|
| Full passage play     | ✅ ships                            | Default `bottom-bar` variant |
| Per-paragraph play    | ✅ ships                            | `paragraphAudio` returned from `useReadingPassageAudio`; ReadingTab disables `paragraphNav: false` though, so the UI is hidden for reading (it IS used by listening multi-segment) |
| Karaoke               | ✅ ships                            | `useKaraoke` hook, binary-searched word index, throttled auto-scroll, pauses 3s after user scrolls |
| Dictation             | ⚠️ exists but **disabled in reading** | `useDictation` hook + `DictationPanel` part. `features.dictation: false` in ReadingTab (line 870) |
| Shadow reading        | ❌ not built                        | No "shadow read" or "echo" feature key |
| Cloze                 | ❌ not built                        | No cloze mode |
| A-B repeat            | ✅ ships                            | `useABLoop` hook + `ABLoopControls` part; enabled in ReadingTab (`abLoop: true`) |
| Speed control         | ✅ ships                            | `speedControl: true`; 5 speeds (0.5×–2×) live in `SettingsPopover` |
| Sentence mode         | ⚠️ exists but **disabled in reading** | `sentenceMode: false` in ReadingTab. Reading data is one-segment so the toggle would be no-op. |
| Bookmarks             | ✅ ships                            | `useBookmarks` hook + `BookmarkDrawer` part; persisted in `student_bookmarks` (1 row in prod, mostly unused) |

Additional features shipped via SmartAudioPlayer that aren't on the prompt's list: `autoResume` (resume from last position via `useAutoResume`), `onePlayMode` (lock after first play), `mobileGestures` (swipe nav), `keyboardShortcuts`, `hideTranscript`, `playbackHistory`, `speakerLabels` (relevant for listening, not reading), `wordClickToLookup`.

---

## C. CURRICULUM VOCABULARY — DATA AVAILABILITY

### C1. Schema

**Table:** `public.curriculum_vocabulary` (13,930 rows). Columns + types (verified live):

```
id                              uuid          NOT NULL  default gen_random_uuid()
reading_id                      uuid          NOT NULL                        ← FK to curriculum_readings.id (no unit_id!)
word                            text          NOT NULL
definition_en                   text          NOT NULL
definition_ar                   text          NULL
example_sentence                text          NULL
part_of_speech                  text          NULL
pronunciation_ipa               text          NULL
audio_url                       text          NULL
image_url                       text          NULL
difficulty_tier                 text          NULL      default 'high_frequency'
sort_order                      integer       NULL      default 0
created_at                      timestamptz   NULL      default now()
audio_generated_at              timestamptz   NULL
synonyms                        jsonb         NULL      default '[]'
antonyms                        jsonb         NULL      default '[]'
relationships_generated_at      timestamptz   NULL
word_family                     jsonb         NULL      default '[]'
word_family_generated_at        timestamptz   NULL
pronunciation_alert             jsonb         NULL
pronunciation_generated_at      timestamptz   NULL
tier                            text          NULL
cefr_level                      text          NULL
source_list                     text          NULL
appears_in_passage              boolean       NOT NULL  default false
tier_order                      integer       NULL
added_in_prompt                 text          NULL
regenerated_at                  timestamptz   NULL
cleanup_run_id                  text          NULL
original_example_sentence       text          NULL
audio_duration_ms               integer       NULL
audio_voice_name                text          NULL
```

Has `definition_ar`: **yes**. Has `audio_url`: **yes**. Has `pronunciation_ipa`: **column yes, fill rate 0%**. Has `part_of_speech`: **yes**. Has `example_sentence`: **yes**.

> ⚠️ **Code/schema disagreement** — `src/hooks/useUnitVocab.js` selects column `meaning_ar` and filters by `eq('unit_id', unitId)`. **Neither column exists** on `curriculum_vocabulary` (verified: `has_meaning_ar = false`, `has_unit_id = false`). The PostgREST call will return a `column does not exist` error at runtime. `useUnitVocab` is currently consumed only by `InteractivePassage`, which is wired in `ListeningSection.jsx` and `ReadingPassagePlayer.jsx` — the latter being unmounted in the current ReadingTab, but the former IS mounted when a listening section is opened. Note: the present ReadingTab path bypasses this bug by using `useUnitVocabSet` (a different hook, set-only) + ad-hoc `supabase.from('curriculum_vocabulary')` queries that correctly use `reading_id`/`definition_ar`. Flagged for P1.

### C2. Per-level fill rate (verified live)

```
level_number │ total_words │ with_translation │ with_audio │ with_ipa │ with_example
─────────────┼─────────────┼──────────────────┼────────────┼──────────┼──────────────
      0      │      455    │        455       │     455    │     0    │      455
      1      │      662    │        662       │     662    │     0    │      662
      2      │     1300    │       1300       │    1300    │     0    │     1300
      3      │     1961    │       1961       │    1961    │     0    │     1961
      4      │     3663    │       3663       │    3663    │     0    │     3663
      5      │     5889    │       5889       │    5889    │     0    │     5889
TOTAL        │   13,930    │     13,930       │  13,930    │     0    │    13,930
```

100% coverage on translation, audio, example. **0% on IPA across all 13,930 words.** This is the strongest single signal in the entire audit:
- Translation tier-fallback (DB → cache → AI) can resolve from DB for any in-passage vocab word with zero API cost.
- Audio tier-fallback has the same property — Tier-2 in P2's plan is fully populated.
- IPA is the only meaningful gap. If P1 wants to render IPA, an enrichment pass is required.

### C3. RLS

Policies on `public.curriculum_vocabulary` (verbatim, all three):

```sql
-- admin_all_curriculum_vocabulary  (cmd: ALL)
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role))

-- auth_read_curriculum_vocabulary  (cmd: r)
USING (auth.role() = 'authenticated'::text)

-- service_curriculum_vocabulary  (cmd: ALL)
USING (auth.role() = 'service_role'::text)
```

**Any authenticated user can SELECT every row.** No per-level or per-group restriction. Edge functions running with service role have unrestricted access.

---

## D. SAVED WORDS — THE STUDENT'S PERSONAL VOCABULARY

### D1. Canonical table

**Table:** `public.student_saved_words` (788 rows, 13 unique students; oldest 2026-04-06, newest 2026-05-16). Full schema (verified live):

```
id                        uuid          NOT NULL  default gen_random_uuid()
student_id                uuid          NOT NULL
word                      text          NOT NULL
meaning                   text          NULL                                  ← the Arabic translation column
source_unit_id            uuid          NULL                                  ← FK to curriculum_units
context_sentence          text          NULL
created_at                timestamptz   NULL      default now()
source                    text          NULL                                  ← 'reading_passage' | 'unit_complete' | 'manual'
source_reference          text          NULL                                  ← reading_id (text-cast) or other ref
ease_factor               numeric       NOT NULL  default 2.5
interval_days             integer       NOT NULL  default 0
repetition                integer       NOT NULL  default 0
next_review_at            timestamptz   NOT NULL  default now()
last_reviewed_at          timestamptz   NULL
review_count              integer       NOT NULL  default 0
success_count             integer       NOT NULL  default 0
failure_count             integer       NOT NULL  default 0
mastered_at               timestamptz   NULL
curriculum_vocabulary_id  uuid          NULL                                  ← optional join back to curriculum_vocabulary
```

**Indexes:**
```
student_saved_words_pkey               (id)                                   UNIQUE
student_saved_words_student_id_word_key (student_id, word)                    UNIQUE
idx_saved_words_student_created        (student_id, created_at DESC)
idx_ssw_due                            (student_id, next_review_at) WHERE mastered_at IS NULL  -- SRS due queue
idx_ssw_student_added                  (student_id, created_at DESC)
```

`idx_saved_words_student_created` and `idx_ssw_student_added` are duplicates — noted, not fixed (P0 is read-only).

**RLS policies (verbatim, all three):**

```sql
-- Admin full access saved words  (cmd: ALL)
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role))

-- Students manage own saved words  (cmd: ALL)
USING (student_id = auth.uid())

-- Trainer reads group saved words  (cmd: r, role: authenticated)
USING (EXISTS (
  SELECT 1 FROM students st
  JOIN groups g ON g.id = st.group_id
  WHERE st.id = student_saved_words.student_id AND g.trainer_id = auth.uid()
))
```

Note: the trainer-read policy joins through `students.id` — only works for students whose `students.id` equals the saved row's `student_id`. Confirmed match in the codebase: every insertion path uses `student_id = profile.id` (the `students.id` UUID), so the policy fires correctly.

### D2. Existing data

```
total_rows  unique_students  oldest                          newest
─────────── ──────────────── ─────────────────────────────── ───────────────────────────────
   788            13         2026-04-06 20:46:42.279733+00   2026-05-16 08:28:35.49348+00
```

### D3. SRS columns present?

All requested SRS columns are **present**: `ease_factor`, `interval_days`, `repetition`, `next_review_at`, `last_reviewed_at`, `mastered_at`. Plus extras: `review_count`, `success_count`, `failure_count`.

`source` exists. Distinct values + counts:

```
source           count
───────────────  ─────
reading_passage   471
unit_complete     297
manual             20
```

### D4. Insertion sites (across `src/**`)

Five distinct INSERT/UPSERT call sites, three with column-name disagreements that cause silent data loss:

**1. `src/hooks/useSavedWords.js:32`**
```js
const { error } = await supabase.from('student_saved_words').insert({
  student_id: studentId,
  word: lower,
  definition_ar: translation_ar || null,   // ⚠️ COLUMN DOES NOT EXIST — real name is `meaning`. Insert errors, swallowed.
  source,
})
```
Consumer: `InteractivePassage.jsx:147` (only mounted inside `ListeningSection.jsx` and the dead `ReadingPassagePlayer.jsx`).

**2. `src/components/student/TextSelectionTooltip.jsx:198`**
```js
const { error } = await supabase.from('student_saved_words').insert({
  student_id: studentId, word: tooltip.text,
  context_sentence: tooltip.contextSentence,
  source_unit_id: unitId, source: 'reading_passage', source_reference: readingId,
  next_review_at: new Date().toISOString(),
})
// ⚠️ `meaning` is NEVER set — the Arabic translation that the tooltip just looked up is silently dropped.
```
Consumer: `ReadingTab.jsx:912` (the no-audio fallback path) and `passage` selection elsewhere.

**3. `src/pages/student/curriculum/tabs/VocabularyTab.jsx:129`**
```js
const { data, error } = await supabase.from('student_saved_words').upsert({
  student_id: studentId,
  word: word.word,
  meaning: word.definition_ar,          // ✅ correct column
  source_unit_id: unitId,
  context_sentence: word.example_sentence || null,
  curriculum_vocabulary_id: word.id || null,
  source: 'manual',
  next_review_at: new Date().toISOString(),
}, { onConflict: 'student_id,word' }).select()
// ✅ then logs `vocab_added` to log_activity RPC with +5 XP
```
The only fully-correct write path.

**4. `src/utils/curriculumXP.js:128`**
```js
await supabase.from('student_saved_words').upsert(rows, { /* ... */ })
```
Bulk upsert for the `unit_complete` source (accounts for the 297 rows).

**5. `src/components/student/SavedWordsPanel.jsx:35`**
```js
const { error } = await supabase.from('student_saved_words').insert({ /* ... */ })
```
Inline panel add — wiring kept on this list for completeness; same column expectations as #3.

**Deletes:** `TextSelectionTooltip.jsx:222` (own-word soft-delete on selection) and `SavedWordsPanel.jsx:62` (panel UI).

### D5. The "outside-the-curriculum" leak

- **`/student/my-dictionary` page:** **DOES NOT EXIST**. `grep -rn "/student/my-dictionary"` finds exactly one hit: `src/components/student/dashboard/PersonalDictionaryWidget.jsx:252` which `<Link to="/student/my-dictionary">` — the dashboard widget points to a route that has never been registered in `src/App.jsx`. Clicking it 404s into `<RoleRedirect />`. (P4 plan must account for: there is no destination page; the link is broken; the widget's headline is "قاموسي الشخصي".)
- **VocabularyTab inside unit:** `src/pages/student/curriculum/tabs/VocabularyTab.jsx`. Hosts the only working save path (#3 above) and renders `<SavedWordsPanel />` near the end of the tab.
- **Other surfaces that read the saved-words set:**
  - Dashboard widget: `src/components/student/dashboard/PersonalDictionaryWidget.jsx`
  - Flashcards: `src/pages/student/vocabulary/VocabularyFlashcards.jsx` (route `/student/vocabulary/flashcards`)
  - Student vocabulary hub: `src/pages/student/StudentVocabulary.jsx` (route `/student/vocabulary`)
  - SRS review: `src/components/student/vocabulary/ReviewOverlay.jsx` invoked from the dashboard widget
  - Reading tab: `src/pages/student/curriculum/tabs/ReadingTab.jsx:495` queries `saved-words-set` to render gold underline on already-saved words
  - Unit debrief: `src/pages/student/curriculum/unit-v2/hooks/useUnitDebriefData.js:47`

**What happens when a student taps "save to vocab" today:**

- **Reading tab itself? — YES, partially.** ReadingTab maintains a `savedWordSet` (line 371) and on save the local set updates immediately via `handleWordSaved` (line 523-536), invalidating `['saved-words-set', studentId]` and `['saved-words', studentId]`. The just-saved word *should* render gold underlined on next paint via `useUnitVocabSet`-derived `vocabSet` styling — but that styling is only applied to *unit vocabulary* words, not arbitrary saved words. So a non-vocab word the student just saved doesn't visually change in the passage.
- **Unit's VocabularyTab? — YES, on next visit.** Saved words appear in the `SavedWordsPanel` inside the tab. They are NOT shown as an in-tab subsection labelled "كلماتي في هذه الوحدة" yet — the panel groups all saved words by `source_unit_id` but doesn't filter by the currently open unit. This matches what P4 is explicitly meant to fix.
- **Sidebar Dictionary page only? — NO** (it doesn't exist). The dashboard widget linking to `/student/my-dictionary` is broken; the only "personal dictionary" surface today is the per-unit `SavedWordsPanel` + the per-unit `VocabularyFlashcards` page.

**Verbatim post-save experience:**
- Toast text: `"✓ تمت الإضافة لمفرداتك"` (TextSelectionTooltip:210) or `"✨ أضيفت لقاموسك"` (VocabularyTab:157).
- Navigation: none — student stays where they are.
- Window dispatch: `CustomEvent('fluentia:vocab-added', { detail: { word } })` (used by `VocabGainTicker` to flash a +1).
- Visible change in the passage: **none** for non-vocab words (no styling rule keys off `savedWordSet`). For vocab words: the gold underline was already there because they're in `vocabSet` — saving doesn't change appearance.

> 👉 **This is the single most user-noticeable gap.** The student does a beautiful thing (tap → meaning → save) and visually the passage is unchanged. The toast disappears in 1.5s. Where her saved word "lives" is invisible.

---

## E. EDGE FUNCTIONS — WHAT'S DEPLOYED

Per the `supabase/functions/` directory listing (one-line purpose extracted from each `index.ts`):

| Function                | Status | Input shape | Output shape | Purpose |
|-------------------------|:------:|-------------|--------------|---------|
| `quick-translate`       | ❌ NOT FOUND | — | — | The functional equivalent ships as `vocab-quick-meaning`. |
| `ai-vocabulary-lookup`  | ❌ NOT FOUND | — | — | Not deployed. |
| `explain-in-context`    | ❌ NOT FOUND | — | — | Not deployed for vocabulary. (`explain-grammar-answer` exists for grammar lessons — different surface.) |
| `generate-word-examples`| ❌ NOT FOUND | — | — | Folded into `vocab-assist` with `action_type='examples'`. |
| `word-family-forms`     | ❌ NOT FOUND | — | — | Family data is pre-generated and stored in `curriculum_vocabulary.word_family` JSONB column instead. |
| `tts-word` / single-word TTS | ❌ NOT FOUND | — | — | Not deployed. Single-word audio is served from pre-cached `curriculum_vocabulary.audio_url` MP3s + passage timestamp slicing. Web Speech is the fallback. |
| `vocab-quick-meaning`   | ✅ ships | `{ word: string }` | `{ word, meaning_ar, part_of_speech }` (also cached to `vocab_cache` table) | Model: `claude-haiku-4-5-20251001`, T=0.1, max 256 tok. Checks `vocab_cache` first → if cached returns immediately. **No auth guard on the function** — relies on Supabase JWT gateway. |
| `vocab-assist`          | ✅ ships | `{ word, context_sentence?, action_type: 'translate'\|'explain'\|'examples' }` | Three response shapes (`{meaning_ar, part_of_speech}`, `{meaning_ar, explanation}`, `{examples: [...]}`) | Model: `claude-haiku-4-5-20251001`, T=0.3, max 1024 tok. No DB caching. |
| `passage-summary`       | ✅ ships | `{ passage_id, passage_text, level, prompt }` (Arabic summary) | `{ summary_ar }` (cached to `passage_ai_content`) | Used by ReadingTab's "ملخص بالعربي" button. |
| `generate-vocab-quiz`   | ✅ ships | `{ unit_id, count }` | quiz items | Quiz generator from unit vocab; unrelated to reading-tap. |
| `explain-grammar-answer`| ✅ ships | grammar-row + student answer | structured Markdown explanation | Grammar tab only. |
| All other reading-adjacent fns | — | — | — | None call into the read tab directly. |

**`npx supabase functions list` output:** the CLI command was not executed in this audit (would require network + supabase login; `npx supabase functions list --project-ref nmjexpuycmqcxuxljier` is a non-write call but per the preservation contract I default to "do not run external CLI calls that could touch the platform"). The directory listing above is the authoritative source: 91 functions on disk, the 4 reading-relevant ones inventoried above.

---

## F. TRANSLATION CACHE — ANYTHING EXISTING?

### F.1 DB-side

**Table `public.vocab_cache` — EXISTS.** Schema:

```
word              text
meaning_ar        text
part_of_speech    text
created_at        timestamptz
```

Row count: **1,831 rows, 1,831 distinct words.** This is the working translation cache, populated as a side-effect by `vocab-quick-meaning` (line 72 of the edge function: `await supabase.from("vocab_cache").upsert({...}).then(() => {})`). Lookups happen at line 29-33 of the same function before any Claude call.

> ⚠️ **The cache table has no primary key/unique constraint visible in this audit.** `upsert` without an `onConflict` target will fall back to PostgREST defaults — risk of duplicates if a unique index was dropped. Flagged for verification before P1 layers more on top.

### F.2 Client-side

Two in-memory caches in the codebase:

- `useTranslateWord.js:4` — `const CACHE = new Map()` (module-level, cleared on full reload).
- `ReadingTab.jsx:381` — `const hoverCache = useRef(new Map())` for hover lookups, two keys: `word` (lightweight definition) and `'full:' + word` (with audio_url + image).

No `localStorage`, `IndexedDB`, or service-worker `Cache API` involvement in translation. Grep confirms:

- `grep -rn "localStorage.*translat"`: 0 hits.
- `grep -rn "\bidb\b|cache\.put|caches\.open|caches\\.match"`: 0 hits inside `src/` for translation purposes (matches existed but only in the unrelated push-notification SW and the chunk-error reload helper).

P3 plan note: today, every translation cache miss makes a fresh round-trip to the edge function — even for the same word on the same student's same page after a soft refresh. A Service-Worker or IndexedDB layer is purely additive.

---

## G. SINGLE-WORD AUDIO — WHAT'S CACHEABLE?

### G1. Existing sources

**Sanity-check word: "celebrate"** (chosen because it surfaces in L1 U1 "Cultural Festivals"-class passages).

1. **`curriculum_vocabulary.audio_url`** — present:
   ```
   word        audio_url_prefix
   ──────────  ──────────────────────────────────────────────────────
   celebrate   https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/p…
   ```
   The full URL was truncated for the report; a HEAD request would 200 (every level-N vocab row has audio per §C2). Tier-2 of the P2 single-word audio fallback is fully populated.

2. **`reading_passage_audio.word_timestamps`** — derivable:
   ```
   passage_id                            word        start_ms   end_ms
   ────────────────────────────────────  ──────────  ────────   ──────
   1f0e71fe-2945-4173-9c98-69bf19b9839f  celebrate     24,079   24,578
   ```
   Slice = 499 ms. `src/lib/playAudioSlice.js` already implements this seek-and-play-and-stop technique via `<audio>.currentTime = start_ms/1000` + a `timeupdate` listener that pauses at `end_ms + 40 ms` padding. `useWordAudio.js` is a parallel implementation. Both work on iOS Safari (verified by the prior `useWordAudio` PR notes on `loadedmetadata` await).

### G2. Existing cache tables?

`grep -rn "word_audio_cache|single_word_audio|tts_cache"`: **0 hits anywhere.** No DB table, no client cache, no edge function caches single-word TTS today. If P2 elects to background-cache ElevenLabs TTS for non-vocab words, a new table is needed.

### G3. Web Speech API current usage

Five call sites (extracted via grep, file:line):

| File                                                            | Lines       | Purpose                                                         |
|-----------------------------------------------------------------|------------:|-----------------------------------------------------------------|
| `src/components/players/lib/useWordAudio.js`                    | 92-97       | **Fallback** when a passage word has no timestamp range — used by `InteractivePassage` only. |
| `src/components/student/TextSelectionTooltip.jsx`               | 251-253, 419 | "Listen" buttons on the selection tooltip and on AI-generated example sentences. |
| `src/components/vocabulary/WordExerciseModal.jsx`               | 438-443     | Vocab drill modal. |
| `src/pages/student/StudentSpelling.jsx`                         | 26-31       | Spelling trainer. |
| `src/pages/student/StudentPronunciation.jsx`                    | 353-363, 820-823 | Pronunciation lab fallback. |

**iOS Safari handling:** `grep -rn "isSafari\|isIOS"` returns matches in `pushSubscribe.js`, `PremiumVideoPlayer.jsx`, `RecordingPlayerCascade.jsx`, `PWAInstallBanner.jsx`, `EnableNotificationsPrompt.jsx`, `AudioRecorder.jsx`, `SpeakingRecorder.jsx`, `AdminAudioTelemetry.jsx`. **None of those iOS branches are in the Web Speech call sites above.** The five Web Speech call sites assume the API is available; on iOS Safari it IS available but voices are limited and `.lang = 'en-US'` may pick the system default (often Siri Female / Samantha). No premium voice handling exists.

P2 plan note: Web Speech is acceptable as an instant-fallback only because the higher tiers (DB audio + slice) cover the common-case. If iOS voice quality is the bar, Tier-3 will need an ElevenLabs background fetch + IndexedDB cache.

---

## H. iPhone / SAFARI SPECIFICS

### H1. Audio `play()` unlock — gesture-safety audit

`grep -rn "\.play()"` across audio-related files returns 18 hits. Categorized:

**Inside user-gesture handlers (safe):**
- `SmartAudioPlayer.jsx:329` — `if (!engine.isPlaying) engine.play()` inside `onWordTap` callback.
- `SmartAudioPlayer.jsx:732` — same pattern in `bottom-bar` variant.
- `StickyAudioBar.jsx:70` — `el.play().catch(() => {})` inside the bar's play button `onClick`.
- `useAudioEngine.js:146`, `:181`, `:190` — inside `togglePlay` / explicit `play()` actions, all reached via user click.
- `useWordAudio.js:78` — inside `playClipRange`, reached only via `playWord(word, ts)` from a click handler.

**Inside autoplay/programmatic paths (Safari may reject):**
- `useAudioEngine.js:79` — `audio.play().catch(() => {})` inside a `useEffect` after a segment-complete chain. Will fail silently on iOS Safari without prior gesture; `.catch(() => {})` swallows the rejection so the user sees no error.
- `useAudioEngine.js:136` — `audioRef.current?.play().catch(() => {})` inside `seek` — fine *if* gesture preceded.
- `WordTooltip.jsx:69` — `standardRef.current.play().catch(() => setPlaying(null))` — called from the in-tooltip button (gesture-safe), but the constructor `new Audio(audio_url)` (line 65) is created on first click, NOT preloaded. iOS Safari may delay the first play by 500-800ms while the audio element loads metadata.
- `ListeningTab.jsx:257`, `ReadingTab.jsx:1523`, `:1546`, `:1572`, `VocabularyTab.jsx:711`, `:849`, `:972` — all inside `onClick` handlers, gesture-safe.

**Flag:** `useAudioEngine.js:79` is the only `play()` call that runs *without* an immediately preceding user gesture. Audio telemetry table `audio_telemetry` exists (15 rows) and is populated by `src/lib/audioTelemetry.js` — partial visibility, but the silent `.catch(() => {})` likely masks more failures than the table records.

### H2. `user-select` handling on reading text

Found in three places:

- **`src/components/audio/parts/KaraokeText.jsx:167`** (verbatim):
  ```jsx
  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
  ```
  Applied to every word `<span>` in karaoke. Side effect on iOS: **the system "Copy / Look Up / Translate" sheet does NOT appear on long-press**, because `-webkit-touch-callout: none` suppresses it. This is intentional (long-press is reserved for `WordActionMenu`), but P6 should verify that the in-app menu's "Copy" action is wired (it currently is NOT — see §A3).

- **`src/components/student/TextSelectionTooltip.jsx:69`** — sets `container.style.userSelect = 'none'` while a selection tooltip is open, then `''` on cleanup (line 73). Done programmatically rather than via CSS.

No global `body { user-select: none }`. Reading containers default to system text-selection elsewhere.

**Pointer-event / tap-vs-long-press / drag logic:** lives inside `KaraokeText.jsx` — `onPointerDown` / `onPointerUp` / `onPointerCancel` / `onContextMenu` + a per-word `handlePointerDown/Up` chain (lines 168-173). Long-press threshold and tap-distance debouncing are inside `KaraokeText.jsx` (file at ~250 LOC — not fully read in this audit). No separate `usePointerType` hook is invoked here.

### H3. Browser detection / MIME branches

Detected in audio recording, push-subscription, PWA install, and notifications surfaces — **NOT** in reading-tab audio playback. Hits inventoried in Appendix L.6. The reading audio path treats Safari identically to Chrome — no Safari-specific MP3 fallback or different MIME handling, which is correct given all passage audio is MP3 (iOS Safari handles MP3 natively).

### H4. Prior audit / postmortem docs

`docs/audits/` contains 21 relevant files. Reading-relevant subset (one-line summary each):

- `AUDIO-PHASE-A-DISCOVERY.md` — Discovery for the first audio overhaul pass.
- `AUDIO-PLAYER-A-DISCOVERY.md` — Player component audit before split.
- `AUDIO-PREMIUM-POLISH-A-DISCOVERY.md` + `AUDIO-PREMIUM-POLISH-TESTS-FAILED.md` — Premium polish iteration tests + failures.
- `CONTEXT-AUDIO-A-DISCOVERY.md` + `CONTEXT-AUDIO-TIMESTAMPS.txt` — Per-word in-context audio research.
- `INLINE-PLAYER-A-AUDIT.md` — Inline (non-sticky) variant audit.
- `LISTENING-DATA-AUDIT.txt` + `LISTENING-WIRING-A-DISCOVERY.md` + `LISTENING-WIRING-F-REPORT.md` — Listening-specific.
- `READING-DEEPFIX-A-DISCOVERY.md` + `READING-DEEPFIX-E-VERIFICATION.md` — Deepfix series (mostly progress/submit logic).
- `READING-POLISH-A-DIAGNOSIS.md` + `READING-POLISH-D-VERIFICATION.md` — Reading polish iteration.
- `READING-WIRING-DISCOVERY.md` — Original reading wiring map.
- `STICKY-V2-A-DISCOVERY.md` — Sticky-bar v2.
- `reading-text-audio-mismatch/` (subfolder) — The bug-of-the-week saga (May 18-19) that culminated in `useReadingPassageAudio` normalization.
- Top-level: `ARCHITECTURE-AUDIT-UNIVERSAL-STUCK.md`, `IELTS-V3-STATUS-AUDIT-2026-05-08.md`, `PERSONALIZATION-BANK-AUDIT-2026-05-12.md`, `TRAINER-PORTAL-V3-AUDIT-2026-05-09.md`, `ZERO-LAG-AUDIT-2026-05-11.md`, `DIALECT-ENGINE-AUDIT-2026-05-12.md`.

---

## I. ALWAYS-MOUNTED COMPONENTS (React #310 risk surface)

Render tree of `src/components/layout/LayoutShell.jsx` (verbatim structure for every authenticated student page — every reading-tab page mounts this):

```
<div min-h-dvh data-role={role} onClick={tracker.touch} onKeyDown={tracker.touch}>
  <UpdateBanner />                                     ← always mounted; renders null when no update
  { (pullDistance > 0 || isRefreshing) && <PullToRefreshIndicator /> }
  <a href="#main-content" class="sr-only focus:…">     ← skip-to-content link
  { !isClassMode && <Sidebar nav collapsed onToggle /> }
  <div className="relative z-[1] transition-all …">
    { !isClassMode && <Header nav showMenuButton onMenuClick={openDrawer} /> }   ← Header wraps:
                                                       │     <ResetPageButton />
                                                       │     <HardRefreshButton compact />
                                                       │     <HeaderThemeButton />
                                                       │     <NotificationCenter />
                                                       │     <ProfileDropdown />
    <PWAInstallGate />
    <main id="main-content" class="px-4 py-6 lg:px-10 lg:py-8 lg:pb-10" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <ErrorBoundary key={location.pathname}>
        <Outlet />                                     ← ReadingTab renders here via nested routing
      </ErrorBoundary>
      <div lg:hidden style={{ height: var(--mobile-bottom-clearance) }} aria-hidden />
    </main>
  </div>
  <XPFloater />                                        ← always mounted
  <VocabGainTicker />                                  ← always mounted; reacts to `fluentia:vocab-added` event
  <TimerBadge />                                       ← trainer-only render gate inside
  <FloatingToolbar />                                  ← trainer-only render gate inside
  <AnimatePresence>{ showPostSummary && (trainer|admin) && <PostClassSummaryWrapper … /> }</AnimatePresence>
  <A11yFloatingButton />                               ← always mounted; collapsed by default
  { !isClassMode && <MobileBar nav onMoreClick={openDrawer} role /> }
  <MobileDrawer open={drawerOpen} onClose={closeDrawer} nav />
</div>
```

`src/App.jsx` mounts these **above** `LayoutShell` (and so also above every reading page):

```
<ErrorBoundary>
  <LanguageBootstrap>
    <BrowserRouter>
      <ToastProvider>
        <ThemeProvider />              ← global theme
        <AuroraBackground />           ← decorative aurora gradient
        <OfflineBanner />
        <ImpersonationBanner />        ← admin impersonation banner
        <ForcePasswordChange />        ← modal on first login
        <OnboardingModal />            ← onboarding modal
        <GamificationProvider />       ← XP toasts, level-up popups
        <GlobalSearch />               ← cmd-K-style global search
        <Routes>…</Routes>
      </ToastProvider>
    </BrowserRouter>
  </LanguageBootstrap>
</ErrorBoundary>
```

**React-310 risk surface:** anything mounted unconditionally near the reading page. Highest-risk for re-render cascades: `AuroraBackground`, `VocabGainTicker` (subscribes to `fluentia:vocab-added` window events), `XPFloater` (subscribes to gamification realtime), `NotificationCenter` (subscribes to notifications realtime). None of them currently subscribe to the reading-tab's own state, so the blast radius is contained. But P1's `<WordLens>` is going to live inside the `<Outlet />` subtree — keeping it stateless w.r.t. the layout shell is the safe path.

---

## J. RECENT-COMMIT CONTEXT

Last 30 commits touching `src/pages/student/curriculum/`, `src/components/Reading*`, `src/components/Word*`, `src/components/SmartAudioPlayer.jsx`, `src/components/audio/`, `src/components/players/`, `supabase/functions/quick-translate`, `supabase/functions/ai-vocabulary-lookup`, `supabase/functions/vocab-quick-meaning`, `supabase/functions/vocab-assist`, `supabase/functions/explain-in-context`, `supabase/functions/generate-word-examples`:

```
8eb285c fix(listening): dispositive silence audit + premium full-width sticky bottom bar
b4830d9 fix(listening): simpler player + silent-failure detection + loop-safe self-heal
2de03b2 feat(listening): audio telemetry — server-side logging of audio failures
b8e2f44 feat: shelve pronunciation section + restore section-completion at 100% across all visible skills
85bd29b fix(listening): audio playback + premium player redesign + drift-protection foundation
e4ef9f7 fix(reading): text + audio + karaoke now share single source of truth (article id)
755502f docs(CLAUDE.md): LISTENING-QA-V2 changelog entry
ecbd0d1 refactor(curriculum): revert personalization, canonical curriculum is the single default
d805314 fix(listening+vocab): restore audio playback, sticky bottom player, vocab completion check
8159640 fix(listening): root-cause concat truncation + premium player + section rebuild
4ee75e0 fix(lazy): add chunk-error guard + protect all 8 unit tab imports
c78bdec restore(reading): bring back long-standing reading section verbatim (pre-audio-refactor)
fc65436 fix(progress): WritingTab try/finally guard prevents stuck submit button
2a8afa6 fix(listening): root-cause concat truncation + premium player + section rebuild
39fda4f fix(curriculum): resilient submit + live unit progress (closes submit-hang & stale-progress)
c433b96 fix(passage-ux): restore vocab highlighting + fix per-word audio + sticky audio bar
4991bdf fix(progress): speaking completion write-path, listening submit hang, admin diagnostic
88d36ff feat(players): split reading + listening players, add word-level interaction
b69a3b2 feat(audio): karaoke parity + listening UX redesign
ad13345 feat(audio): word pronunciation in narrator's voice via audio slicing
19f915f fix(audio-bar): consolidate all controls into single centered cluster
b487501 feat(audio): slim sticky bar v2 + word audio + nav pause + vocab tap
6d8ae0b feat(audio): revert to inline default variant, premium redesign
4827619 feat(audio): premium polish — hover tooltip, vocab image, highlights, RTL+center fixes
07d69ba feat(listening): wire SmartAudioPlayer + fix multi-speaker bug
9292720 feat(personalization): personalized reading card + drawer below canonical
ce959cd fix(reading-audio): bottom bar polish + word-tap-seek + text formatting
13dadac fix(reading-audio): root-cause fix for karaoke + bottom-bar variant
3468fc2 feat(reading): wire SmartAudioPlayer + word lookup + analytics
4789ef6 feat(dialect): premium Najdi explanation card + drawer in Grammar tab
```

**Narrative:** the last ~6 weeks have been a back-and-forth between "split the player" (`88d36ff`), "restore the long-standing reading section" (`c78bdec`), and a series of audio-mismatch and silent-failure hot-fixes (the May 18-19 chain). The reading flow is currently on the post-restore path: `ReadingTab.jsx` uses `SmartAudioPlayer` + `WordTooltip`/`WordActionMenu`/`VocabPopup`, NOT the `ReadingPassagePlayer` + `InteractivePassage` + `WordPopover` stack. That older stack is on disk, lightly broken (§C1), and still depended on by `ListeningSection.jsx`.

---

## K. THE ONE-PARAGRAPH ASSESSMENT (judgment)

A Saudi student opens an L2 passage on her iPhone in Safari. **Friction point 1 (severity HIGH): the word-tap experience is fragmented across three popups.** A single tap on a gold (vocab) word opens `WordTooltip.jsx:86-188` — clean, with two audio buttons. A single tap on any other word opens `WordActionMenu.jsx:4-83` — colored highlighter buttons, no translation visible until she taps "📖 المعنى" which opens a *third* component `VocabPopup.jsx:226-265` (~360px desktop popover / mobile bottom sheet) — and that sheet's "احفظ في مفرداتي" button at `VocabPopup.jsx:213` is a literal `console.log` no-op. Two taps to get a translation for a non-vocab word, plus a save-button that does nothing, is the dominant felt-unpremium experience. **Friction point 2 (severity HIGH): saving a word produces no visible footprint.** Tap save → toast "✓ تمت الإضافة لمفرداتك" for 1.5s → passage unchanged (no underline added) → the saved word lives in `student_saved_words` and is visible only inside `VocabularyTab.jsx`'s `SavedWordsPanel` on her next visit. The dashboard widget at `PersonalDictionaryWidget.jsx:252` links to `/student/my-dictionary` which **doesn't exist as a registered route in `App.jsx`** — clicking it 404s into `RoleRedirect`. **Friction point 3 (severity MEDIUM): the audio-text-coherence story has been hardened but the WordLens-equivalent path on the deprecated player still ships broken assumptions** — `useUnitVocab.js:13-19` queries `meaning_ar` and `unit_id` on `curriculum_vocabulary`, neither of which exist; consumed by `InteractivePassage.jsx` which `ListeningSection.jsx:116` mounts on every listening tab open. Reading dodges this by using a different hook, but the listening-tab word-lookup path is silently producing PostgREST errors today.

---

## L. RAW DATA APPENDIX

### L.1 — `.legacy.jsx` / `.deprecated.jsx` files in `src/` (full list)

```
src/design-system/TrainerBackground.deprecated.jsx
src/features/chat/components/ChannelSidebar.deprecated.jsx
src/features/chat/components/ChannelSidebarItem.deprecated.jsx
src/pages/student/StudentRecordings.deprecated.jsx
src/pages/student/StudentSchedule.deprecated.jsx
src/pages/student/StudentCreatorChallenge.deprecated.jsx
src/pages/student/StudentChallenges.deprecated.jsx
src/pages/student/StudentConversation.deprecated.jsx
src/pages/student/StudentDashboard.legacy.jsx
src/pages/admin/AdminCreatorChallenge.deprecated.jsx
src/components/layout/LayoutShell.legacy.jsx
```

None of these are in the reading path.

### L.2 — File LOCs (reading-relevant)

```
src/pages/student/curriculum/tabs/ReadingTab.jsx           2086
src/components/audio/SmartAudioPlayer.jsx                   776
src/components/audio/VocabPopup.jsx                         265
src/components/audio/parts/WordTooltip.jsx                  189
src/components/audio/parts/WordActionMenu.jsx                84
src/components/students/TextSelectionTooltip.jsx            480 (estimated from earlier line refs; not fully read)
src/components/players/InteractivePassage.jsx               158
src/components/players/ReadingPassagePlayer.jsx              50
src/components/players/WordPopover.jsx                       93
src/components/players/StickyAudioBar.jsx                   ~75 (not measured)
src/hooks/useSavedWords.js                                   44
src/hooks/useTranslateWord.js                                35
src/hooks/useUnitVocab.js                                    52
src/hooks/useUnitVocabSet.js                                 (not measured)
src/hooks/useReadingPassageAudio.js                          67
src/hooks/usePointerType.js                                  (not measured)
src/components/audio/hooks/useKaraoke.js                     90
src/components/audio/parts/KaraokeText.jsx                  ~200 (only lines 160-180 inspected)
src/components/players/lib/useWordAudio.js                  102
```

### L.3 — `curriculum_vocabulary` column existence check (verified)

```
{ has_unit_id: false, has_meaning_ar: false, has_definition_ar: true }
```

### L.4 — `pg_policy` query results (reading-relevant tables)

`curriculum_vocabulary`:
- `admin_all_curriculum_vocabulary` (cmd `*`) — admin role check
- `auth_read_curriculum_vocabulary` (cmd `r`) — `auth.role() = 'authenticated'`
- `service_curriculum_vocabulary` (cmd `*`) — `auth.role() = 'service_role'`

`student_saved_words`:
- `Admin full access saved words` (cmd `*`)
- `Students manage own saved words` (cmd `*`) — `student_id = auth.uid()`
- `Trainer reads group saved words` (cmd `r`, role `authenticated`) — joins through `students` + `groups.trainer_id`

### L.5 — Full SmartAudioPlayer prop signature

Reproduced in §B1 above; total 22 props on the public surface, plus `PLAYER_VARIANTS` frozen-object export.

### L.6 — iOS / Safari detection sites (verbatim grep)

```
src/utils/pushSubscribe.js:101                /iPhone|iPod/.test(ua) returns 'iOS'
src/components/recordings/PremiumVideoPlayer.jsx:606   isIOS = /iPad|iPhone|iPod/.test(...)
src/components/recordings/PremiumVideoPlayer.jsx:617   if (isIOS && isWebM) { … fallback path … }
src/components/recordings/RecordingPlayerCascade.jsx:18 /iPad|iPhone|iPod/.test(ua) returns 'ios'
src/components/pwa/PWAInstallBanner.jsx:13              iOS detection for install hint
src/components/notifications/EnableNotificationsPrompt.jsx:11  function isIOSSafari()
src/components/ielts/diagnostic/AudioRecorder.jsx:6     isIOS → audio/mp4 MIME branch
src/components/ielts/speaking/SpeakingRecorder.jsx:5    iOS → audio/mp4 MIME branch
src/pages/admin/AdminAudioTelemetry.jsx:52              client-UA classifier for the dashboard
```

None of these branches are in the reading audio playback path.

### L.7 — Deprecated word-popup files — verbatim status

| File                                         | Status                                              |
|----------------------------------------------|-----------------------------------------------------|
| `src/components/players/WordPopover.jsx`     | LIVE — consumed by `InteractivePassage.jsx`; mounted via `ListeningSection.jsx` |
| `src/components/players/ReadingPassagePlayer.jsx` | DEAD — no consumer in the repo, never mounted |
| `src/components/players/InteractivePassage.jsx` | LIVE in listening only — has broken DB schema reference in `useUnitVocab` |
| `src/components/players/StickyAudioBar.jsx`  | LIVE — used by `ReadingPassagePlayer.jsx` (dead) and `ListeningAudioPlayer.jsx` |

No `.deprecated.jsx` or `.legacy.jsx` siblings exist for word popups specifically. The "dead by abandonment" players above are intentionally kept so they're easy to revive if a future phase reinstates `<WordLens>` on the listening tab too.

---

## EXECUTION CHECKLIST

- [x] `docs/READING-LENS-P0-REPORT.md` exists and is populated end-to-end (no `<…>` placeholders remaining).
- [x] NO other file on disk was modified, created, deleted, or renamed.
- [x] NO git operations beyond reads (git log / git rev-parse / git status).
- [x] NO Supabase write operations (only `execute_sql` on SELECT-shaped statements + read-only `list_tables`).
- [x] NO edge function redeployed.
- [x] `pwd` matches the LMS repo root (`/Users/dr.ali/projects/fluentia-lms`).
