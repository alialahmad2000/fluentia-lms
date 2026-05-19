# Phase A — Deploy Verification (2026-05-19)

## Vercel deploy

- Latest production deploy id: `dpl_8nfeWLP5zycRRvzaHjLQzxXi1q9E`
- Latest production URL: `https://fluentia-nuoh74l8t-alialahmad2000s-projects.vercel.app` (aliased to `app.fluentia.academy`)
- Deploy created: `2026-05-19T19:05:22 +03` (16:05 UTC)
- Build completed: `2026-05-19T16:06:04 UTC` (33s build)
- Build cache: `Created build cache: 21s` + `Uploading build cache [40.70 MB]` + `Build cache uploaded: 1.652s` — Vercel reused/reuploaded build cache during this deploy
- Local HEAD: `b8e2f44` authored `2026-05-19T19:05:15 +03` (committed 7s before the deploy started)
- Match: nominally yes (deploy is from `b8e2f44`), but the timing is tight enough that Vercel may have built off `85bd29b` rather than `b8e2f44`

## Bundle content

Bundle paths discovered in deployed HTML (entry):
- `/assets/index-C7FoDd2e.js` (430 KB)
- `/assets/vendor-*` (8 files, total ~1MB)

Additional chunks discovered by chunk-graph probe: **326 chunks**, including:
- `assets/UnitContent-CNCOWvGx.js` (127 KB) — this is where ListeningTab + ListeningSection should be bundled, since `UnitContent.jsx` uses `lazyRetry()` to load each tab
- `assets/ListeningSectionModule-DDoRrDVF.js`
- `assets/SmartAudioPlayer-k907iULx.js`
- `assets/ReadingTab-C8HKvfJl.js` (77 KB — separate chunk for Reading tab)
- No dedicated `ListeningTab-*.js` chunk in the deploy logs

### Distinctive-marker scan across ALL 326 chunks

| Marker | Source file | Prod chunk hits | Notes |
|---|---|---|---|
| `قيد التحضير` | `ListeningAudioComingSoon.jsx` (only place locally) | **0** | The most distinctive marker. Tree-shaking cannot eliminate JSX-referenced components, so 0 hits = component not in bundle |
| `ListeningAudioComingSoon` (identifier) | `ListeningSection.jsx` import + JSX | **0** | Component name minified — expected to be absent post-minify, but the *string literal* `قيد التحضير` should remain |
| `speaker_segments` (DB column) | new `useListeningTranscriptAudio` chain | **0** | Suggests new transcript hook is not in bundle |
| `إظهار النص` / `إخفاء النص` | New ListeningPlayer (line 540) + 6 other components | hits in `SmartAudioPlayer-k907iULx.js` (3 + 5), `parts/PlayerControls.jsx`, `parts/SettingsMenu.jsx`, `parts/ListeningFocusMode.jsx`, `ListeningAudioPlayer.jsx` | Inconclusive — hits could be from old player components |
| `playsInline` (string identifier) | New ListeningPlayer + others | hits in `SmartAudioPlayer-k907iULx.js` + `AudioPlayer-di4_KAAs.js` + `parts/WordTooltip.jsx` | Inconclusive |

### Verdict

**TREE_SHAKE_DROPPED or STALE_BUILD_CACHE.** The distinctive string `قيد التحضير` (only in `ListeningAudioComingSoon.jsx`) is absent from all 326 chunks. The local import chain `ListeningTab → ListeningSection (aliased) → ListeningPlayer + ListeningAudioComingSoon` is statically resolvable, so Vite/Rollup should bundle these. The only plausible explanations are:

1. **Stale Vercel build cache** — Vercel reused cached chunk hashes from an earlier build that didn't have the new imports. The "Created build cache: 21s" log line on this deploy is consistent with cache reuse.
2. **Tree-shake dropped them** — unlikely given JSX usage of `<ListeningAudioComingSoon>` is a runtime-conditional render, not statically false.
3. **The deploy was built off `85bd29b` (the previous commit) rather than `b8e2f44`** — timing-wise possible; Vercel webhook may have started before `b8e2f44` reached origin.

## Service worker / cache

- `public/sw.js`: not present in source. Vite-PWA generates `dist/sw.js` at build time (deploy logs: `PWA v0.21.2 mode generateSW precache 29 entries (657.84 KiB)`).
- `public/push-sw.js`: present (push notification handler, no fetch interceptor — confirmed previously in CLAUDE.md May 19 entry "verify-and-fix").
- `version.json`: prod = `mpctr197` (16:05Z); local = `listening-drift-v1` (13:00Z). They don't match because Vercel auto-bumps or because origin/main's version.json was not updated to reflect this deploy.
- UpdateBanner: not investigated this phase. Per CLAUDE.md, the `version-check` path exists and can trigger a banner.

**Verdict: PWA hygiene is acceptable; the issue is at the build/bundle layer, not the SW layer.**

## Next step

Force-rebuild via a no-op bump to `public/version.json` + push. Re-scan prod bundle. If still missing → escalate with `vercel deploy --prod --force` to invalidate Vercel's remote build cache.
