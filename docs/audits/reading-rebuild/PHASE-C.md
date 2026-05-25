# Reading Editorial Rebuild — Phase C Verification

Date: 2026-05-25 · Branch: `reading-editorial-rebuild`

| Check | Status | Notes |
|---|---|---|
| Masthead: editorial title (Playfair italic, substitute for unloaded Cormorant) + eyebrow + computed deck + meta strip | BUILT | `ArticleMasthead.jsx`; deck from first sentence (no `deck_en` exists) |
| Body: Readex Pro 18px / line-height 1.85 / max-width 38rem | BUILT | `ArticleBody.jsx` scoped `<style>` |
| Drop cap on first paragraph | BUILT | `.aw-first::first-letter`, Playfair, gold |
| Every word tappable — not just vocab | BUILT | tokenizer `/([\p{L}\p{M}'-]+)|.../gu`, each word a `<button class="aw">` |
| Vocab words: 1px gold dotted underline only (no badges/icons) | BUILT | `.aw-vocab`; `*word*` markers stripped, underline from vocab index |
| WordPopup anchored to word (not center-modal) | BUILT | `getBoundingClientRect` → below/above + viewport clamp; dismiss on outside/Escape/scroll-200px |
| WordPopup: word + IPA + Arabic + example + add-to-vocab | BUILT | non-vocab shows "لا توجد ترجمة … في القاموس" (loud, not silent) |
| Audio button distinguishes curriculum vs Web Speech | BUILT | solid gold = `source: vocabulary/cache`; gold outline = `web_speech`; spinner while loading |
| Karaoke/full-audio/A-B demoted behind one ⚙️ button | BUILT | `ReadingTools` drawer; audio mounts `SmartAudioPlayer` only when toggled on |
| Arabic full-translation toggle | BUILT (honest) | no Arabic passage data exists → toggle shows availability notice instead of fabricating |
| Save-to-vocab writes student_saved_words | BUILT | `.insert(...).select()`; no migration needed |
| Tap reads from prefetched vocab index (no per-click DB) | BUILT | `useArticleVocabIndex` one chunked query, 5-min stale |
| Babel parse (6 files) | PASS | |
| **Editorial AESTHETICS validated in-browser** | **NOT DONE** | Cannot validate visual quality headlessly — needs Ali's Vercel preview review |
| Lighthouse mobile ≥ 75 | NOT RUN | needs deployed preview |

## Honest status
All functional pieces are built, parse clean, and reuse the verified pronunciation pipeline. **The visual/editorial quality has NOT been validated** — that requires looking at the rendered result, which I can't do in this headless environment. Review the Vercel preview for this branch and iterate on spacing/typography there.

## Known deviations from prompt (with rationale)
- **Cormorant Garamond → Playfair Display** (Cormorant not loaded; rules forbid new deps/global CSS).
- **Arabic full-translation toggle shows "unavailable"** (no Arabic passage data in `curriculum_readings`; no fabrication).
- **Existing reading-aid chips** (focus mode / AI summary / vocab quiz / reading-prefs) kept below the masthead rather than removed — they're working features unrelated to the karaoke tools the drawer demotes; removing them was out of scope + regression risk.
- **Speed control** stays inside `SmartAudioPlayer` (not duplicated in the drawer) to avoid disconnected state.
