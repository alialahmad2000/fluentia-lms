# Listening — Simplify + Silent-Failure + Self-Heal — Final Report (2026-05-20)

## Telemetry analysis (Phase A)

Source: `docs/audits/listening-simplify/telemetry-analysis.json`. Mined the previous 48h of `public.audio_telemetry` rows where `context = 'listening'` (telemetry table itself was only shipped earlier today in commit `2de03b2`, so this is the inaugural data set).

- **Total failures in 48h:** 11
- **Unique students affected:** 3
- **By error code:**
  - `0` (`play()` rejected): **10** — dominant
  - `3` (decode error): 1
- **By browser:**
  - macOS Safari: 10
  - Chrome: 1
- **By bundle version:** all 11 from `mpd7tlnk` (the latest deploy at the time of mining)
- **Top failing rows:** `8715d6fd-…` 8 failures (one student retrying same item), `f7bc89f9-…` 2, `896ab711-…` 1

**Verdict:** the dominant failure mode is `play()` rejection on macOS Safari — almost certainly autoplay-without-user-gesture or muted-context. The previous instrumentation correctly captured these as `error_code: 0`. The Phase B + C changes harden the player against this class of failure and add silent-failure detection so the cases where `play()` resolves successfully but no audio actually emits are also caught.

## Player simplification (Phase B)

Rewrote `src/components/players/listening/ListeningPlayer.jsx` from ~700 lines of Framer-Motion-driven hero-button + gradient glow + glass card + popover speed selector + speaker pills + color-coded ticks down to **~260 lines of plain Tailwind**.

**Removed:**
- 64px hero play button → standard 48px (closer to platform 44pt touch target)
- Amber gradient glow behind play
- Glass-card backdrop with `backdropFilter: blur(24px)`
- Multi-row dramatic layout
- `SpeakerPill` / `currentSpeaker` indicator (top-right Arabic name pill)
- Popover speed selector → inline 4-button row (0.75 / 1 / 1.25 / 1.5)
- 5-color speaker tick marks on the scrubber
- Fixed-bottom positioning with `useSidebarWidth()` adjustment → inline card
- Framer Motion entirely (no `motion.*` / `AnimatePresence`)

**Preserved:**
- `playsInline` + `preload="metadata"`
- Event listeners attached BEFORE `el.src = audioUrl`
- `useEffect` deps include `audioUrl` so source changes re-fire load
- `play()` called from the click handler (iOS Safari user-gesture rule)
- `play()` rejection caught + telemetry logged
- `logAudioFailure()` wired into both error event + play() catch
- `transcriptShown` / `onTranscriptToggle` / `listeningId` / `durationMs` / `speakerSegments` (ignored but accepted) / `hideTranscriptToggle` / `onTimeUpdate` prop signature — no caller change needed
- `ListeningSection` unchanged (still uses `key={listening.id}` + `ListeningAudioComingSoon` fallback when `audio_url` is null)

## Silent-failure detection (Phase C)

After every successful `play()`, the new player schedules a 2-second watchdog (`silentCheckRef` timeout). If `currentTime` has advanced < 0.1s while `paused === false`, this is a silent failure (iOS silent switch / locked audio context / autoplay-blocked-without-error / audio session interrupted). The watchdog:

1. Sets `silentFailure = true` → renders the recovery `<ErrorCard>` with the Arabic message:
   *الصوت لا يصدر — تأكد من رفع صوت الجهاز وإيقاف وضع الصامت ثم أعد المحاولة*
2. Pauses the audio defensively
3. Logs telemetry: `error_code: -1`, `error_message: 'silent_failure: play() resolved but currentTime did not advance'`, `extra: { paused, readyState, currentTime }`

`AdminAudioTelemetry.jsx` updated to recognize `error_code: -1` with the dedicated Arabic label and `medium` severity styling.

## Self-heal (Phase D — LOOP-SAFE)

Added `selfHealStaleClient()` IIFE to `src/main.jsx`. Runs once on app boot:

1. Fetch `/version.json?_=Date.now()` with `cache: 'no-store'`
2. Compare `remote.version` to `localStorage['fluentia:bundle-version']`
3. If mismatch AND `sessionStorage['fluentia:self-heal-attempted'] !== '1'`:
   - Set the sessionStorage guard
   - Write the new version to localStorage
   - `caches.delete()` all CacheStorage entries
   - `serviceWorker.getRegistrations()` then `unregister()` each
   - `location.reload()`
4. If `sessionStorage['fluentia:self-heal-attempted'] === '1'` AND mismatch persists → log a warning and **stop**. Do not loop the device.

**Crucial property:** no `visibilitychange` listener, no periodic timer. Each device sees AT MOST one self-heal reload per session. After this, even if a CDN or SW bug keeps the mismatch alive, the page proceeds normally with the new bundle marker recorded so a fresh tab won't loop either.

`public/version.json` bumped to `simple-player-1779232928678` (a Unix-millisecond suffix so subsequent re-runs of the version-bump command always produce a distinct value).

## Self-check (Phase E)

- Bracket balance OK for all 5 touched files
- `sessionStorage.getItem('fluentia:self-heal-attempted')` appears 2× in main.jsx (set + check)
- 8 references to `silent_failure` / `errorCode: -1` / `silentCheckRef` in ListeningPlayer.jsx
- No `useSidebarWidth`, `framer-motion`, `SPEAKER_COLORS` imports left in ListeningPlayer.jsx
- No `vite build` invoked locally
- **ESLint skipped:** repo has no `.eslintrc*` or `eslint.config.*` file. Phase E's `npx eslint` would create an empty config or error. Bracket-balance + grep-based shape checks substitute for this run.

## Files changed

```
M  public/version.json                                        (bumped)
M  src/components/players/listening/ListeningPlayer.jsx        (full rewrite)
M  src/pages/admin/AdminAudioTelemetry.jsx                     (-1 label + severity)
M  src/main.jsx                                                (selfHealStaleClient)
A  docs/audits/listening-simplify/FINAL-REPORT.md              (this file)
A  docs/audits/listening-simplify/telemetry-analysis.json
A  scripts/audits/listening-simplify/01-mine-telemetry.cjs
```

`src/components/players/listening/ListeningSection.jsx` was NOT touched — the prop contract was already correct.

## Commit SHA

Filled by the actual commit.
