# Reading Audit Report — 2026-04-13

## Files Involved
- `src/pages/student/curriculum/tabs/ReadingTab.jsx` — main student reading component (937 lines)
- `src/components/interactive-curriculum/InteractiveReadingTab.jsx` — trainer view
- `src/pages/admin/curriculum/components/ReadingEditor.jsx` — admin editor
- `src/pages/admin/curriculum/components/PassageEditor.jsx` — paragraph editor

## Data Layer
- Table: `curriculum_readings` (NOT `curriculum_reading_passages` — that table is empty)
- Key columns: `id`, `unit_id`, `reading_label` (A/B), `sort_order`, `title_en`, `title_ar`, `passage_content` (JSONB with paragraphs array), `passage_word_count`, `before_read_image_url`, `passage_image_urls` (JSONB array), `infographic_image_url`, `passage_audio_url`
- 144 readings across 72 units — ALL units have exactly 2 passages

## A/B Ordering Issues
**41 out of 72 units have wrong A/B ordering.**

All `sort_order` values are 0 for both A and B in every unit. The DB falls back to UUID ordering, which puts B before A in 41 units. The remaining 31 units happen to have A's UUID sort before B's UUID by luck.

Units with wrong ordering (B appears first): 00ca3625, 0afc0986, 170ce97d, 2105dec8, 23f63e6e, 290f3fbe, 2f3df52f, 357a1833, 49ed7c2c, 5515ee31, 55a4d6c2, 55d40057, 59de8aaa, 6d85610d, 738ff234, 79f8500f, 7fd7a0b6, 82167f9b, 8272e688, 85aabed1, 89f2e975, 8a656780, 95530744, 99996ac0, 9a560631, 9b30bc71, a1c18caa, a393f989, a5b583a4, aa6e8325, bdb9ff2e, c14c9ffc, d485be14, daf340b3, defcf06f, dfefdb76, e56f8f63, f072a40a, f14cdead, f3a651e1, ffa3641f

## Image Audit
- All 144 readings have `before_read_image_url` populated
- All 144 readings have `passage_image_urls` populated (array)
- All 144 readings have `infographic_image_url` populated
- No broken/missing image URLs detected in data

## Visual Inconsistencies
1. **Hero image**: `h-48 sm:h-56 object-cover` — no fixed aspect ratio, varies by source image
2. **Passage images**: `h-40 sm:h-48 w-auto` in horizontal scroll — inconsistent sizing, no aspect ratio enforcement
3. **Title**: `text-lg font-bold` — too small, not premium
4. **Paragraphs**: `text-[16px] sm:text-[17px] leading-[1.85]` — acceptable but could be more spacious
5. **Paragraph badges**: `w-6 h-6 bg-sky-500/15 text-sky-400` — fine but could be more refined
6. **No reading time estimate**
7. **No A/B badge on passage cards**
8. **No image error handling / fallback**
9. **No gradient accent or premium card borders**
10. **Infographic image**: full-width with no aspect ratio control

## Proposed Fix
- Migration: set `sort_order = 0` for all label='A', `sort_order = 1` for all label='B'
- Premium redesign of ReadingTab.jsx per design spec
- Image fallback handling
- A/B badge display
- Reading time estimate
- Typography upgrade
