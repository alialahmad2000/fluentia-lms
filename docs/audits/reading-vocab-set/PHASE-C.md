# PHASE C — Verification

| Check | Result |
|---|---|
| Phase A named the wrong type feeding `.has` | ✅ rehydrated plain object `{}` (persisted Map → JSON `"{}"`) |
| Normalization yields a real Map for every shape (no `.has`/`.get` throw) | ✅ 10/10 shapes incl. the `{}` crasher (`verify-normalize.cjs`) |
| Vocab words still detected (gold dotted underline) | ✅ Map / keyed-object / Set / array all detect words case-insensitively |
| Tapping a vocab word still returns its row for the popup | ✅ `.get` returns the curriculum row from the normalized Map |
| No false positives (non-vocab word never underlined) | ✅ |
| Rehydrated `{}` path → empty Map, no crash | ✅ (and `refetchOnMount: true` repopulates a real Map immediately) |
| Modified files parse (esbuild jsx) | ✅ ArticleBody.jsx, useArticleVocabIndex.js, ReadingTab.jsx |

`verify-normalize.cjs`: **16 passed, 0 failed.**

## What changed
- **`ArticleBody.jsx`** — added a `useMemo` that normalizes whatever `vocabIndex`
  arrives as into a real `Map<string,row>`; both the underline check (`.has`) and the
  popup lookup (`.get`) now read from it. This is the belt: it can't crash on any shape.
- **`useArticleVocabIndex.js`** — tagged the query key with `'no-persist'` so the Map
  value is never written to localStorage and rehydrated as a lossy `{}`. This is the
  suspenders: the broken shape can no longer be produced in the first place.
- **`ReadingTab.jsx`** — `= new Map()` default on the destructure for the loading path.

## Notes on engine-independence
The fault was a pure JS type error (`undefined` is not callable), not a rendering or
audio-engine issue, so it reproduces identically across browser engines and the fix is
engine-independent. Decisive product check = Ali opening the previously-crashing reading
unit on his iPhone after the Vercel preview deploys: the article loads, vocab words keep
their gold dotted underline, and tapping one opens the popup with the translation.
