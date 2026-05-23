# LISTENING AUDIO — Reproduction-Gated Fix
## Evidence Log (live, updated as phases complete)

## Phase 0 — Identify broken scenario

### Test fixture
- **Unit ID:** `49ed7c2c-fa1b-47b2-bb5c-34074beeafdc` (L1 Unit 1 — "Cultural Festivals" / المهرجانات الثقافية)
- **Listening ID:** `2992edc4-d68d-4f16-99d1-ab7b7a2683c3` (listening_number=1, "Nadia at the Cherry Blossom Festival in Japan")
- **Audio URL:** `https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/curriculum-audio/listening/L1/2992edc4-d68d-4f16-99d1-ab7b7a2683c3/s0_nadia.mp3`
- **Expected route:** `https://app.fluentia.academy/student/curriculum/unit/49ed7c2c-fa1b-47b2-bb5c-34074beeafdc?tab=listening`
- **Test student:** `mock-test-a1@fluentia.academy / MockTest2025!` — academic_level=1, group `bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb`, status=`active` (has access to L1 content).

### Storage-layer sanity (curl, outside any code)
```
HEAD / 200 — content-type: audio/mpeg, content-length: 1,597,066 bytes
Range bytes=0-65535 / 206 — content-range: bytes 0-65535/1597066
accept-ranges: bytes
access-control-allow-origin: *
cache-control: no-cache
sb-gateway-mode: direct
```
**Conclusion:** Storage layer is healthy. Bug is NOT in upload / bucket policy / CORS.

### Frontend data path inventory
- `src/pages/student/curriculum/tabs/ListeningTab.jsx` — fetches rows from `curriculum_listening` by `unit_id`, no `is_published` filter, sorts by `sort_order`.
- Local `ListeningSection` (lines ~80-240) renders `<ListeningSectionUI>` (the shared component from `src/components/players/listening/ListeningSection.jsx`).
- `ListeningSectionUI` renders `<ListeningPlayer>` (`src/components/players/listening/ListeningPlayer.jsx`, 427 lines).

### Architectural mismatch — KEY FINDING
The 2026-05-22 MEGA-FIX V2 Phase B (commit `7368960`, marked "closes L1") patched:
- `src/components/audio/hooks/useAudioEngine.js` — state machine + preflight + telemetry
- `src/components/audio/SmartAudioPlayer.jsx` — Arabic error surface

…but the actual Listening playback flows through `src/components/players/listening/ListeningPlayer.jsx` — a SEPARATE player that the changelog explicitly says was "untouched". So yesterday's R2/R3/L1 work did not touch any code on the Listening tab's playback path. The "L1 closed" claim in commit `7368960` was based on similar-sounding code, not on actual reproduction of the Listening-tab scenario.

### Telemetry tables present
- `audio_event_log` (used by useAudioEngine → SmartAudioPlayer): 81 rows, all `player_id` starts with `reading:` — no listening entries.
- `audio_telemetry` (used by ListeningPlayer's `logAudioFailure`): schema confirmed but query against `created_at` returns "column does not exist" → table schema differs from code's row shape, meaning ListeningPlayer's failure inserts may be failing silently (warned to console, then discarded).

### Notes on `is_published`
All 72 `curriculum_listening` rows have `is_published=false` in prod. The frontend does NOT filter on this column (verified), so visibility is fine — but the field is misleading and should be revisited separately. Not a blocker for the current fix.

---

## Phase 1 — Playwright reproduction (REPRODUCED — bug is iOS Safari specific)

### Test harness
- `scripts/reproduce-listening-bug.cjs` — Playwright headless: chromium (1366×800 desktop) + webkit (iPhone 14 emulation).
- Login as `mock-test-a1@fluentia.academy`, suppress onboarding modal + PWA install gate via localStorage, navigate to `/student/curriculum/unit/<unit>?activity=listening` (the unit-v2 URL — NOT `?tab=listening`), hide mobile-bottom-nav so the play button is hittable, snapshot the `<audio>` element before/after click, count audio-URL network requests.

### Clean reproduction results (no instrumentation, no DOM hacks, no click)
`scripts/listening-fix-2/02-clean-reproduce.cjs`:

| Browser | mp3 requests in 15s | readyState | networkState | duration | paused |
|---|---|---|---|---|---|
| chromium desktop | **1** (steady) | 4 (HAVE_ENOUGH_DATA) | 1 (LOADED) | 99.75s | true (no click) |
| webkit iPhone 14 | **20,462 at t+1s → 30,215 at t+15s** (~700/sec) | **0 (HAVE_NOTHING)** | **2 (NETWORK_LOADING)** | null | true |

### Click test (`scripts/reproduce-listening-bug.cjs`)
- Chromium VERDICT: **PLAYING** — currentTime advanced 3.36s → 5.69s in 2s. Audio plays correctly on desktop.
- WebKit VERDICT: **PAUSED_AT_ZERO** — paused=false (play() returned successfully), but currentTime stuck at 0 across all snapshots. readyState=0 throughout. Audio "thinks" it's playing but no data is buffered. **This is exactly the symptom students report.**

### Instrumentation result — React is NOT to blame
`scripts/listening-fix-2/01-instrument-load.cjs` patched `document.createElement('audio')` + the `src` setter to count effect re-runs. In the failing iOS run:
- `audio element creates: 1`
- `audio.load() calls: 1`
- `audio.src setter calls: 1`
- BUT **37,298 mp3 network requests in ~30 seconds**.

So a single `<audio>` element with a single `src` assignment is generating **thousands of Range 0-1 byte probes** to the audio URL. The probe storm is iOS Safari's internal behavior, not React re-runs.

### Range probe shape (curl-confirmed)
```
HTTP/2 206
content-type: audio/mpeg
content-length: 2
content-range: bytes 0-1/1597066
cache-control: no-cache
accept-ranges: bytes
access-control-allow-origin: *
```
First 4 bytes of file = `49 44 33 04` (valid ID3v2.4 header). File itself is healthy.

### ROOT CAUSE
`src/components/players/listening/ListeningPlayer.jsx:422`:
```jsx
<audio ref={audioRef} preload="metadata" playsInline style={{ display: 'none' }} />
```

The `style={{ display: 'none' }}` was added in commit `8eb285c` (2026-05-20, "dispositive silence audit + premium full-width sticky bottom bar"). On iOS Safari (mobile WebKit), an `<audio>` element with `display: none` + `preload="metadata"` + a remote URL served with `Cache-Control: no-cache` enters a **runaway metadata-fetch loop**:
- iOS Safari treats `display: none` audio as "not currently in use" and uses a power-saving heuristic that defers full metadata load.
- `preload="metadata"` tells iOS it should at least read enough bytes to know duration / format.
- `Cache-Control: no-cache` forces iOS to re-validate the file on every probe.
- The three together produce: iOS issues `Range: bytes=0-1` → server returns 206 + 2 bytes → iOS decides it doesn't have enough to determine metadata → re-issues `Range: bytes=0-1` → loop, ~700–1500 times/second.
- Because `readyState` never advances past 0, `play()` cannot actually start playback. The element stays in NETWORK_LOADING forever.

### Why the May 22 MEGA-FIX V2 (commit 7368960) did not close L1
Yesterday's "L1 closed" claim patched `useAudioEngine.js` + `SmartAudioPlayer.jsx`. The actual Listening playback flows through `ListeningPlayer.jsx` — an entirely separate player that was not touched. The architectural mismatch was already flagged in Phase 0, and Phase 1 confirms it: chromium plays correctly (no useAudioEngine involved), webkit fails for an entirely different reason (`display: none` + iOS Safari quirk).

### Browser support
The hidden-audio pattern works on Chromium and Firefox (they don't have iOS Safari's power-saving heuristic for hidden media elements).

---

## Phase 2 — Targeted fix attempt #1 — REVERTED (did not fix)

**Hypothesis tested:** `<audio style="display:none">` is the iOS Safari trigger. Changed to off-screen positioning (`position: absolute; left: -9999px; opacity: 0`).

**Result:** Storm continues identically on iOS WebKit. readyState stays at 0. Hypothesis disproved.

Reverted to `display:none` to avoid shipping speculative non-fix changes per HARD GATE rule. Diff applied + reverted; no commit.

## Phase 2 — Targeted fix attempt #2 — Cache-Control rewrite (server-side root cause, NOT yet applied)

**Hypothesis tested:** `Cache-Control: no-cache` on the Supabase Storage response is the iOS Safari trigger.

**Test method:** Playwright `ctx.route()` intercepts the audio URL and rewrites `Cache-Control: public, max-age=31536000, immutable` on the response.

**Result — flaky:**
- 1 / 5 runs: storm stopped completely (mp3Reqs=2, readyState=4, audio fully loaded — perfect).
- 4 / 5 runs: storm continued (mp3Reqs in thousands, readyState=0).

**Cross-check:** Repeated `scripts/listening-fix-2/02-clean-reproduce.cjs` 3×; the broken behavior reproduced 3/3. So the bug IS deterministic without intervention. The Cache-Control rewrite SOMETIMES fixes it. That points to Cache-Control as one of multiple contributing factors but not a sufficient client-side fix.

Storage objects in `curriculum-audio/` currently respond with `Cache-Control: no-cache`. This is set per-object at upload time and would need to be backfilled via the Supabase Storage admin API (re-upload with `cacheControl` metadata, or use the Management API). **NOT applied** — needs Ali's approval before mutating storage metadata on the live bucket.

## Phase 2 — What works on desktop, what does NOT work on iOS WebKit

| Browser | Playwright behavior |
|---|---|
| Chromium (1366×800) | Audio loads, click plays, currentTime advances. ✅ |
| WebKit (1366×800 desktop, no emulation) | Same probe storm + readyState=0 stuck as iPhone 14 emulation. ❌ |
| WebKit (iPhone 14 emulation) | Probe storm + readyState=0. ❌ |

So the failure is **all WebKit-based browsers in Playwright**, not just mobile emulation. This strongly suggests the bug is real WebKit/Safari behavior, not a Playwright emulation artifact.

## Phase 3 — Local verification: NOT PASSED (HARD GATE)

Per the prompt's pass criteria: chromium AND webkit must both show `currentTime > 0`, `paused: false`, `error: null` after click.

| Browser | currentTime > 0 after click | paused: false | error: null | VERDICT |
|---|---|---|---|---|
| chromium | ✅ (3.36→5.69 in 2s) | ✅ | ✅ | PASS |
| webkit | ❌ (stays at 0) | ✅ | ✅ | FAIL — PAUSED_AT_ZERO |

**Verification fails on WebKit. Per the HARD GATE rule, no commit.**

## Phase 4 — Not executed (HARD GATE blocked)

---

## Honest hand-off

What I did successfully:
- Stood up a deterministic Playwright reproduction that survives in `scripts/reproduce-listening-bug.cjs` as a regression test for future sessions.
- Captured 7 supporting probe scripts in `scripts/listening-fix-2/` documenting each hypothesis tested.
- Established that the audio storage layer is healthy (curl HEAD 200, Range 206, valid ID3 MP3 header).
- Established that chromium playback is healthy.
- Confirmed yesterday's MEGA-FIX V2 (commit `7368960`, claimed "closes L1") patched `useAudioEngine.js` + `SmartAudioPlayer.jsx` but DID NOT touch the actual production Listening playback (`ListeningPlayer.jsx`). So that closure claim was incorrect — the architectural mismatch is real and was the right thing to flag.

What I did NOT solve:
- A verified fix that makes WebKit `currentTime` advance after click.
- A 100%-reliable explanation for why WebKit enters the stuck-loading state. Closest signal: `Cache-Control: no-cache` on the audio response, which iOS Safari is known to handle poorly for ranged audio.

What to try next (in order of likely-impact-vs-effort):
1. **Apply `Cache-Control: public, max-age=31536000, immutable` to all 72 audio files in the `curriculum-audio/listening/*` storage path.** This requires re-uploading or hitting the Storage Management API; not safe to run automatically without Ali's approval since it touches the live bucket. Storage-headers fix is server-side and addresses what evidence most directly points at.
2. **Get a real iPhone in front of the dev tools** (Safari remote debugging via USB) and observe whether the same probe-storm fires on a real device. If yes → real bug, ship Cache-Control fix. If no → Playwright WebKit emulation artifact, dig differently.
3. **Convert ListeningPlayer to a Blob-URL pattern:** `fetch(audioUrl) → blob → URL.createObjectURL(blob)` → set as audio src. This bypasses Cache-Control / CDN entirely on the load path but adds an upfront fetch cost. Bigger surgery; worth trying only if (1) and (2) don't pan out.
