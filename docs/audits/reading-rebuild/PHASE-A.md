# Reading Editorial Rebuild — Phase A

Date: 2026-05-25 · Branch: `reading-editorial-rebuild`

## Schema corrections (the prompt's assumptions were wrong)
- Table is **`curriculum_readings`** (plural), not `curriculum_reading`.
- Passage text lives in **`passage_content` JSONB → `{ paragraphs: string[] }`** (English only). There is **NO `body_en` / `body_ar` / `deck_en`**.
  - **Deck/standfirst** is therefore computed from the first sentence of `paragraphs[0]` (truncated ~120 chars) — never fabricated.
  - **No Arabic passage exists** → the "full Arabic translation" toggle cannot show real data. Per "no fabrication / loud failure", the toggle shows an honest notice: "الترجمة العربية الكاملة غير متوفّرة لهذا المقال — اضغطي على أي كلمة لرؤية ترجمتها ونطقها."
- Paragraph text uses **`*word*` markers** to flag vocab → `ArticleBody` strips the `*` and relies on the vocab index for the dotted underline.
- `curriculum_vocabulary` columns: **`word`** (lowercase-stored → exact `.in()` works), **`definition_ar`**, **`audio_url`**, **`example_sentence`**, **`pronunciation_ipa`** (not `word_en`/`meaning_ar`/`example_en`).
- `student_saved_words` already has everything the save button needs (`student_id, word, meaning, source_unit_id, curriculum_vocabulary_id, source`) → **no migration**.

## Fonts
Loaded: Tajawal, Readex Pro, Playfair Display, Amiri, Space Grotesk, IBM Plex Sans/Arabic, Inter Tight. **Cormorant Garamond is NOT loaded.** Per the prompt's "no new deps / no global CSS" rules, editorial titles use the already-loaded **Playfair Display italic** (not Cormorant). Amiri for the Arabic title, Space Grotesk for eyebrow/meta/IPA, Readex Pro for body.

## What already existed (reused, not rebuilt)
- `pronounceWord()` (megafix lib): clean MP3 → Web Speech. `WordPopup` reuses it and reads its `{ ok, source }` to pick the audio-button state.
- The reading word-tap/popup/audio pipeline already worked (verified in-browser earlier this session). The rebuild swaps the *presentation* (KaraokeText→ArticleBody, WordLens→WordPopup) while keeping the pronunciation engine.
- `SmartAudioPlayer` (karaoke + A-B + speed + skip) → demoted: only mounts when the student turns on audio in the new tools drawer.

## Build (Phase B)
New: `ArticleMasthead`, `ArticleBody`, `WordPopup`, `ReadingTools` (drawer), `useArticleVocabIndex`. Integrated into `ReadingTab` (passage card): masthead replaces the plain title; ArticleBody is the default reading surface; ⚙️ drawer holds audio + Arabic toggle; WordPopup on any word tap. All other ReadingTab features (comprehension questions, submit, AI summary, vocab quiz, reading-aid prefs, focus mode, before-read, images) left intact.
