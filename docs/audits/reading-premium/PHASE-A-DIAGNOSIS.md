# Reading Premium — Phase A Diagnosis (READ-ONLY)

Branch: `megafix-vocab-listening-reading` · Date: 2026-05-25 · Supabase PROD `nmjexpuycmqcxuxljier`
Scope: Problem 3 — make Reading word pronunciation + translation the primary, premium interaction.

---

## 1. Component map

| Role | File | Lines |
|------|------|-------|
| Tab dispatch (`reading` → `ReadingTab`) | `src/pages/student/curriculum/UnitContent.jsx` | 195 |
| Tab dispatch (v2/v3) | `src/pages/student/curriculum/UnitContent.jsx` / `unit-v3/ActivityContentDispatcher.jsx` | 280 / 47 |
| **Main reading tab** | `src/pages/student/curriculum/tabs/ReadingTab.jsx` | 71 (`ReadingTab`), 145 (`ReadingContent`) |
| Reading data query (`curriculum_readings`) | `src/pages/student/curriculum/tabs/ReadingTab.jsx` | 75–88 |
| **Passage renderer (audio path — PRIMARY)** | `SmartAudioPlayer variant="bottom-bar"` → `KaraokeText` | ReadingTab `840–885`; `src/components/audio/SmartAudioPlayer.jsx` 277–433; `src/components/audio/parts/KaraokeText.jsx` |
| Passage renderer (no-audio fallback) | `PassageDisplay` / `renderParagraph` / `renderWord` | ReadingTab 1194, 1304, 1285 |
| **Word-interaction handlers** | `handleVocabWordTap`, `handleWordClick`, `openWordLens`, `handleWordHover` | ReadingTab 446, 454, 427, 398 |
| Karaoke / full-audio player (sticky bottom bar) | `SmartAudioPlayer` (bottom-bar) + `BottomBarControls` | SmartAudioPlayer 277–433, 400 |
| **Translation + pronunciation popup (active)** | `WordLens` → `QuickRead` / `DeepMenu` | ReadingTab 1054–1068; `src/components/audio/wordlens/WordLens.jsx` |
| Word audio (tier engine) | `useWordLensAudio` | `src/components/audio/wordlens/useWordLensAudio.js` |
| Word data/translation lookup | `useWordLensData` → `tierFallbackLookup` | `src/components/audio/wordlens/useWordLensData.js` |
| Legacy hover tooltip (NOT slicing in reading — see below) | `WordTooltip` | `src/components/audio/parts/WordTooltip.jsx` |
| Isolated word-pronounce util (prewarm only in reading) | `pronounceWord` / `prewarmPassageWords` | `src/lib/audio/pronounceWord.js` |
| Time-slice primitive | `playAudioSlice` | `src/lib/playAudioSlice.js` |

Full grep output: `docs/audits/reading-premium/component-map.txt`.

---

## 2. Word click — current behavior

Single word tap/long-press flow (audio path, which is the live path because every L1 reading has audio):

1. `KaraokeText.handlePointerUp` (KaraokeText.jsx 61–77) fires. Vocab-highlighted word → `onVocabWordTap`; any other word → `onWordTap` (seek) and long-press → `onWordLongPress`.
2. ReadingTab wires `onVocabWordTap={handleVocabWordTap}` (846/868) and `onWordLongPress={…handleWordClick}` (866).
3. `handleVocabWordTap` (ReadingTab 446) passes the already-loaded `curriculum_vocabulary` row as `prefetched`; `handleWordClick` (454) passes `null`. Both call `openWordLens` (427).
4. `openWordLens` reads `audioData.segments[segIdx].word_timestamps[wordIdx]` (433) and opens `WordLens`.
5. `WordLens` calls `useWordLensData` (translation/meaning) + `useWordLensAudio` (pronunciation).

### Pronunciation tier order (`useWordLensAudio.js`)
- **Tier 2 (DEFAULT): `curriculum_vocabulary.audio_url`** clean per-word MP3 — `useWordLensAudio.js:105–141`.
- **Tier 1 (FALLBACK): passage slice** — `useWordLensAudio.js:80–103`; the actual passage-slicing call is:

> **`src/components/audio/wordlens/useWordLensAudio.js:87` → `playAudioSlice({ audioUrl: passageAudioUrl, startMs: wordTimestamp.start_ms, endMs: wordTimestamp.end_ms, … })`**

  This is the dirty co-articulation surface. `playAudioSlice` (`src/lib/playAudioSlice.js:17`) seeks the whole-passage MP3 and stops via setTimeout + timeupdate (lines 57–68) — the stop can overrun on slow connections, and even when accurate the slice carries co-articulated neighbor phonemes.
- **Tier 3 (last resort): Web Speech** `SpeechSynthesisUtterance` — lines 58–76.

NOTE: A **second** slice surface exists in `WordTooltip.playInContext()` (`WordTooltip.jsx:50`), but in the Reading tab `WordTooltip` is rendered hover-only WITHOUT `inContextAudio` (SmartAudioPlayer.jsx 374–380 passes no `inContextAudio`/`audio_url`), so that slice path is **dead in reading**. The live slice surface is `useWordLensAudio.js:87`.

### If word not in vocab
`useWordLensData.tierFallbackLookup` (useWordLensData.js 28–47) queries `curriculum_vocabulary` case-insensitively (`ilike('word', lowerWord)`). If `audio_url` exists it is passed to Tier 2; if missing, audio falls to slice → Web Speech. So a non-vocab word is **not silent** — it gets Web Speech (Tier 3). The intended Phase B Layer 2 (Web Speech) already exists here; what's missing is Layer 3 (background-queue generation).

**Verdict:** the hybrid is PARTIALLY built. Layer 1 (clean vocab MP3) + Layer 2 (Web Speech) are present; the legacy slice is demoted to a middle fallback but is still wired and still the bug surface when a word lacks a clean MP3. There is NO background generation queue.

---

## 3. Translation — current behavior — STATUS: WORKS

- Source order (`useWordLensData.js`):
  1. `prefetched.definition_ar` (the in-memory `curriculum_vocabulary` row) — 13–24.
  2. `curriculum_vocabulary.definition_ar` via `ilike('word', …)` — 28–47.
  3. `vocab-quick-meaning` edge function (Haiku, caches to `public.vocab_cache`) — 49–64.
- Rendered in `WordLens` → `QuickRead` as a clean RTL popup (positioned via `positionLens`, sidebar-aware; mobile = bottom-sheet). Save/unsave to `student_saved_words` with success/error toasts (WordLens.jsx 54–80).

**Translation is functional and reasonably premium.** The meaning column is `definition_ar` (NOT `meaning_ar`). Quality gap: the popup is `QuickRead`/`DeepMenu`, decent but its visual polish should be aligned with the Velvet Midnight palette in Phase B (uses `var(--ds-*)` tokens already at WordLens.jsx 180–184, good).

---

## 4. Real `curriculum_vocabulary` column names (confirmed via `select('*').limit(1)`)

| Concept | Actual column |
|---------|---------------|
| Word (English) | **`word`** (NOT `word_en`) |
| Arabic meaning | **`definition_ar`** (NOT `meaning_ar`) |
| English definition | `definition_en` |
| Clean per-word audio | **`audio_url`** ✓ exists |
| IPA | **`pronunciation_ipa`** ✓ exists (often null) |
| Others | `example_sentence`, `part_of_speech`, `image_url`, `difficulty_tier`, `synonyms`, `antonyms`, `word_family`, `pronunciation_alert`, `cefr_level`, `audio_duration_ms`, `audio_voice_name`, `reading_id`, `sort_order` |

Overall `audio_url` coverage in `curriculum_vocabulary`: **13,945 / 13,945 rows that ARE in the table have audio (~100%)** — but the table only holds the ~10–15 curated target vocab words per reading (986 distinct words total), NOT the full passage vocabulary.

**Reading table:** `curriculum_readings`. **Passage text column:** `passage_content` (JSONB), shape `{ paragraphs: [string, …] }`. (Mirror audio columns: `passage_audio_url`, `audio_duration_seconds`.)

---

## 5. Vocab coverage for a typical article

L1 readings are **4 paragraphs each** (the task's "≥8 paragraphs" assumption does not hold for Level 1 — L1 is A1, short passages by design). Reference article chosen: **L1 U1 "Colors and Joy Around the World"** (`76d1051f-3e7c-4263-af48-98700a879bad`), 164 words, 4 paragraphs.

| Metric | Reference article | L1 aggregate (24 readings) |
|--------|-------------------|----------------------------|
| Distinct tokens | 99 | 2,318 |
| Covered by `curriculum_vocabulary` (any) | 17 (17.2%) | — |
| **Covered WITH clean `audio_url`** | **17 (17.2%)** | **413 (17.8%)** |
| **Queue burden (uncovered)** | **82 words** | ~1,905 distinct words |

Uncovered words are overwhelmingly common/function words (people, love, to, keep, their, big, days, in, every, land…) that will never live in `curriculum_vocabulary` (it is a curated target-vocab table, not a dictionary).

**Coverage is ~17–18%, far below the 60% threshold.** The `vocab_word_audio` table **does not exist** yet (confirmed: `Could not find the table 'public.vocab_word_audio'`).

### Recommendation
**Write generated word audio into a NEW lighter `vocab_word_audio` table — NOT into `curriculum_vocabulary`.** Reasons:
- `curriculum_vocabulary` is the curated target-vocab table (definitions, examples, families, IPA, images per reading). Injecting thousands of bare function-word audio rows would pollute it and break `reading_id`-scoped queries, vocab counts, and the Vocabulary tab.
- A `vocab_word_audio (word PK/lowercased, audio_url, voice_name, char_count, created_at)` table keeps generation cheap, global (one row per word reused across all readings/levels), and easy to background-queue. Tier order becomes: `curriculum_vocabulary.audio_url` → `vocab_word_audio.audio_url` → Web Speech → enqueue for generation.

---

## 6. Visual gap (static audit vs Velvet Midnight)

Reading article renders inside a premium card (ReadingTab 660–918): hero image, A/B badge, EN title (`Inter`, 2xl–3xl), AR subtitle (`Tajawal`), read-time/word-count chips, audio "صوت متوفر" chip, toolbar (focus mode, AI summary, vocab quiz, settings). Passage text via `KaraokeText` (Inter, leading-2, 19–20px). Audio controls live in a slim sticky `BottomBarControls` bar (secondary — correct).

Top gaps:
1. **Word-tap pronunciation is the bug surface, not the hero.** Tapping a word can still fall to the dirty passage slice (no clean MP3 for 82% of words). The "tap any word → clean pronunciation" promise is not met for most words; this is the #1 student-facing gap.
2. **English-first typography.** EN title uses `Inter` (CLAUDE.md design spec calls for `Playfair Display` for English titles; body `Readex Pro`). Titles/body don't match the stated premium type hierarchy; vocab-word highlight is a subtle dotted sky underline (`renderParagraph` 1325 / KaraokeText vocab styling) — not the premium glow/treatment expected, and only the ~15 curated vocab words get any affordance while the other ~85% of tappable words look identical to plain text (no discoverability that EVERY word is tappable).
3. **No Velvet Midnight token usage in the article body.** Card/passage use hardcoded `slate-*` Tailwind classes (e.g. ReadingTab 661, 689, 1423) rather than `var(--ds-*)`/`var(--tr-*)`; only `WordLens` adopted `--ds-*` tokens. Inconsistent surface/border/text vs the design system, and no RTL-aware article band styling.

---

## 7. Plan for Phase B (numbered, for the builder)

1. **Create `vocab_word_audio` table** (migration on a Supabase branch DB; Ali promotes): `word text primary key` (lowercased, normalized `[a-z'-]`), `audio_url text`, `voice_name text`, `char_count int`, `source text`, `created_at timestamptz`. RLS: authenticated read, service-role write. Index on `word`.
2. **Rework `useWordLensAudio` + `pronounceWord` tier order to the true hybrid:** Layer 1 `curriculum_vocabulary.audio_url` → Layer 1b `vocab_word_audio.audio_url` → Layer 2 Web Speech → Layer 3 enqueue-for-generation. **Demote/remove the `playAudioSlice` Tier 1 fallback** (`useWordLensAudio.js:80–103, esp. line 87`) so co-articulated slices never play; keep slice only as an explicit "hear in context" affordance if desired.
3. **Background generation queue:** on a Tier-2/Layer-2 fallback (word missing clean audio), write the word to a queue (new `vocab_word_audio` row with `audio_url=null` or a `vocab_audio_queue` table) and have a script/edge function generate via ElevenLabs, respecting the spend cap (80% of Creator quota, ~88K chars; CLAUDE.md memory). Backfill `vocab_word_audio.audio_url`.
4. **Prewarm both tables** in ReadingTab's `prewarmPassageWords` effect (ReadingTab 502–512; pronounceWord.js 173–194) so the first tap is instant.
5. **Make every word visibly tappable** in `KaraokeText` (subtle affordance distinct from the curated-vocab glow) and confirm `onWordLongPress`/`onVocabWordTap` open `WordLens` for ALL words, not just vocab.
6. **Visual polish to Velvet Midnight:** migrate the passage card + body from hardcoded `slate-*` to `var(--ds-*)`/`var(--tr-*)`; apply `Playfair Display` (EN titles) / `Readex Pro` (EN body) / `Tajawal` (AR) per spec; premium vocab highlight (glow/underline) and a clean article header band.
7. **Translation:** keep `useWordLensData` source order (works); align `QuickRead`/`DeepMenu` popup styling to Velvet Midnight tokens (already partly done in WordLens.jsx 180–184). Use the correct columns: `word`, `definition_ar`, `audio_url`, `pronunciation_ipa`.

Files to touch in Phase B: `useWordLensAudio.js`, `lib/audio/pronounceWord.js`, `WordLens.jsx` / `QuickRead.jsx` / `DeepMenu.jsx`, `ReadingTab.jsx` (highlight + prewarm + tokens), `KaraokeText.jsx` (tappable affordance), a new migration for `vocab_word_audio` (+ optional `vocab_audio_queue`), and a generator script under `scripts/`. Do NOT inject into `curriculum_vocabulary`.
