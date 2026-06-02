# PHASE A — Reading crash: vocab index is not a Set

> Captured error: `s?.has is not a function. (In 's?.has(f.toLowerCase())', 's?.has' is undefined)`
> at `ReadingTab-xvlUXb48.js:24` inside a `.map()`.

## Crash call site
- **File:line:** `src/components/curriculum/reading/ArticleBody.jsx:54`
  - Code: `const isVocab = vocabIndex?.has(word.toLowerCase())`
- **Second, identical-shape hazard:** `ArticleBody.jsx:15`
  - Code: `onWordTap(word, rect, vocabIndex?.get(word.toLowerCase()) || null)`
  - `?.` guards `null`/`undefined` on `vocabIndex`, but if `vocabIndex` is a plain
    object, `vocabIndex?.get` resolves to `undefined` and calling it throws the same
    "is not a function" class of error. Both lines must read from a normalized source.

## Where `<var>` (`vocabIndex`) comes from
- **Prop:** `ArticleBody` receives `vocabIndex={articleVocabIndex}` from
  `ReadingTab.jsx:862`.
- **Hook:** `articleVocabIndex` is the `.data` of
  `useArticleVocabIndex(reading?.id, reading?.passage_content?.paragraphs)`
  (`ReadingTab.jsx:388`).
- **What the hook returns:** `src/hooks/useArticleVocabIndex.js` — its `queryFn`
  **always** returns a `Map` (`new Map()` even on the empty path). So at runtime,
  immediately after a network fetch, the value IS a real `Map`. The source queryFn
  is *not* the bug.

## What it actually returns on the crashing path
A **plain object `{}`** — not a `Map`, not `null`.

### Root cause (one sentence)
`src/main.jsx` wraps the app in `PersistQueryClientProvider` + a
`createSyncStoragePersister` (localStorage key `fluentia-query-cache-v1`), and every
successful query is dehydrated to localStorage; a `Map` cannot survive JSON
serialization (`JSON.stringify(new Map([...]))` === `"{}"`), so on reload the
`['article-vocab-index', articleId]` cache rehydrates as a plain object `{}` whose
`.has`/`.get` are `undefined`, and `ArticleBody` crashes when it calls
`vocabIndex.has(word)`.

### Why optional chaining didn't help
`vocabIndex` is not `null`/`undefined` on the crashing path — it's a real (empty)
object `{}`. `?.` short-circuits only on nullish values, so `({})?.has` is `undefined`
and `undefined(...)` throws.

### Why production-only / intermittent
- The crash needs a *rehydrated* persisted cache entry for this query. In dev you
  rarely reload with a populated localStorage cache for the article you're viewing;
  in production (and the installed PWA) reloads routinely rehydrate it → `{}` → crash.
  Matches the minified `ReadingTab-*.js` stack.
- Also explains "happens on *some* articles": only articles whose vocab-index query
  had been fetched + persisted in a prior session rehydrate to `{}`.

## Fix shape (Phase B)
- **B.1 (belt — universal):** normalize `vocabIndex` to a real `Map` once via
  `useMemo` in `ArticleBody`, accepting any shape (Map / Set / array / plain object /
  `{data}` wrapper / nullish). Use it for both `.has` (line 54) and `.get` (line 15).
- **B.2 (suspenders — source):** the queryFn already returns a `Map`; additionally
  (a) opt this query out of the lossy persistence by tagging its key with
  `'no-persist'` (matches the existing `shouldDehydrateQuery` convention in
  `main.jsx`) so a `Map` is never serialized to `{}`, and (b) give the consumer a
  `= new Map()` default for the loading/undefined path.
- **B.3:** `WordPopup` receives `vocabRow` as a prop (it does not call `.get` on the
  index), so it is already null-safe; the only `.get` call is in `ArticleBody` and now
  reads from the normalized `Map`.

Editorial reading design unchanged; gold dotted underline + tap-to-popup preserved.
