# AUDIO-PREMIUM-POLISH-A-DISCOVERY

Generated: 2026-05-12 (autonomous)

## A.1 — Legacy Hover Tooltip

The legacy PassageDisplay (still rendered as fallback when no audioData) uses `TextSelectionTooltip` with `prefs.quick_translation_on_hover_tap`. It also has `handleWordHover` fetching from `/api/vocab-quick-meaning`.

**When SmartAudioPlayer (bottom-bar) is active:** PassageDisplay is NOT rendered. The hover tooltip is gone.

**Fix:** Build `WordTooltip.jsx` + wire hover in KaraokeText. Use Supabase lookup (curriculum_vocabulary) instead of /api endpoint.

## A.2 — Vocab Image Column

Column: `image_url` (text) in `curriculum_vocabulary`. **EXISTS with real data.**

Sample: `https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/curriculum-images/vocabulary/vocab-popular-0f01178c.png`

VocabPopup should query `image_url` and render it.

## A.3 — RTL Progress Bar Bug

`ProgressBar.jsx` — no `dir="ltr"` on root container div. In RTL page:
- CSS `left: 0; width: pct%` fills from left CSS edge = visual right in RTL = fill goes RIGHT-to-LEFT
- Click handler uses `e.clientX - rect.left` = distance from LEFT CSS edge = LTR math
- **Mismatch**: user clicks "near start" (visual right in RTL) but gets high percentage → seeks far into audio

**Fix**: Add `dir="ltr"` to ProgressBar root div. Fill left→right = audio progress start→end. Click math stays the same and is now correct.

## A.4 — Highlights Table

`student_word_highlights`: **DOES NOT EXIST** — creating via migration.

## A.5 — KaraokeText Current States

Word span classes:
- Current: `bg-sky-500/20 text-sky-100 font-semibold rounded px-0.5 transition-colors duration-150`
- Past: `text-slate-400 transition-colors duration-150`
- Future: `text-inherit transition-colors duration-150`

No highlight state, no `data-is-vocab` attribute yet. Adding both.
