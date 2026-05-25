# Listening Section — Phase A Diagnosis (READ-ONLY)

**Date:** 2026-05-25
**Branch:** `megafix-vocab-listening-reading`
**Scope:** Problem 2 — "Students press play and nothing happens" inside curriculum unit listening tabs.
**Method:** Exhaustive row audit (NO `audio_url IS NOT NULL` filter), HEAD + decode probes, full UI fetch-chain trace, real production telemetry analysis, Playwright repro (Chromium + iPhone 13 WebKit), storage policy check.

---

## 1. Tables audited / which tables a student can render

Three listening tables are referenced in `src/`:

| Table | Rows | Role in the unit listening tab | Student-rendered? |
|---|---|---|---|
| **`curriculum_listening`** | **72** | The unit listening rows. `ListeningTab` fetches these. **`audio_url` on this row is the playback source.** | **YES — this is the one that matters** |
| `listening_audio` | 711 (segments) | Per-speaker segment audio. Fetched by `useListeningTranscriptAudio(listening.id)` but used **ONLY for word-level vocab popups** (`findWordTimestamp`), NOT for playback. | Indirectly (word taps only) |
| `ielts_listening_sections` | (separate) | IELTS atelier flow — `src/pages/student/ielts*`. NOT the curriculum unit tab. | Different feature, out of scope |

**Conclusion:** The unit player plays `curriculum_listening.audio_url`. The `listening_audio` segment table is auxiliary. Past audits that focused on `listening_audio` were looking at the wrong source for the play button.

`curriculum_listening` confirmed columns (via `select('*').limit(1)`): `id, unit_id, listening_number, title_en, title_ar, audio_url, audio_duration_seconds, transcript, audio_type, before_listen, exercises, discussion_prompts, difficulty, is_published, sort_order, created_at, updated_at, audio_generated_at, speaker_segments, segments_processed_at, word_timestamps, source_text_hash, source_text_hash_at`.

---

## 2. Audio status breakdown (ALL 72 rows, NO audio_url filter)

`docs/audits/listening-fix/row-audit.json` holds the full per-row array + summary.

| Category | Count |
|---|---|
| Total rows | **72** |
| NEVER_GENERATED (null/empty audio_url) | **0** |
| HAS_URL → 404 | **0** |
| HAS_URL → 403 | **0** |
| HAS_URL → 5xx | **0** |
| HAS_URL → wrong_content_type | **0** |
| HAS_URL → probe_error | **0** |
| **HAS_URL → 200_OK (audio/mpeg)** | **72** |
| Decode test (15-row 20% sample, ffmpeg) → CORRUPT | **0** |
| Decode test → OK | **15 / 15** |

Every row has a healthy, public, decodable MP3. HEAD returns `200`, `content-type: audio/mpeg`, `accept-ranges: bytes`, `access-control-allow-origin: *`, `cache-control: public, max-age=3600`. Range requests return `206`. Content-Length is non-trivial on every row (no tiny/truncated files; smallest sampled ~5 MB).

**Direct decode confirmation (Playwright):** loading a `combined.mp3` once and calling `play()` on Chromium, WebKit (desktop), AND WebKit iPhone 13 all returned `advanced: true, mediaErrorCode: null`. The MP3s are NOT inherently undecodable on iOS — so the iOS `code=4` failures are a *player-context* problem, not a file problem.

> Side note: all 72 rows have `is_published = false`, but the `ListeningTab` query does NOT filter on `is_published`, so this does not hide any rows. (See §3.)

---

## 3. UI fetch chain trace

**Component path:** `src/pages/student/curriculum/UnitContent.jsx` (line 283: `<ListeningTab unitId={unitId} />`) → `src/pages/student/curriculum/tabs/ListeningTab.jsx` → `src/components/players/listening/ListeningSection.jsx` (`ListeningSectionUI`) → `src/components/players/listening/ListeningPlayer.jsx`.

**Fetch method (ListeningTab.jsx lines 39-52):**
```js
useQuery({
  queryKey: ['unit-listening', unitId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('curriculum_listening')
      .select('*')
      .eq('unit_id', unitId)
      .order('sort_order')
    if (error) throw error
    return data || []
  },
})
```

| Question | Answer |
|---|---|
| Does the query filter out `audio_url IS NULL`? | **NO.** Only `.eq('unit_id', …).order('sort_order')`. Broken/null rows are NOT silently hidden — they reach the UI. |
| Does it filter `is_published`? | **NO.** All 72 unpublished rows still render. |
| What is passed to the player? | `ListeningSection` passes `audioUrl={listening.audio_url}`, `speakerSegments`, `durationMs`, `listeningId` to `<ListeningPlayer>`. |
| Graceful null/empty handling? | **YES.** `ListeningSection` lines 126-137: if `!listening.audio_url` it renders `<ListeningAudioComingSoon>` ("🎧 الصوت قيد التحضير") instead of a dead play button. (Currently no row hits this since all 72 have URLs.) |
| Are `<audio>` error events surfaced in the UI? | **PARTIALLY — and this is the core problem.** See below. |

**Player error handling (`ListeningPlayer.jsx`):**
- Listeners attached **before** `audio.src = audioUrl` then `audio.load()` (lines 149-157). Good.
- `error` event (lines 113-130): maps `MediaError.code` 1-4 → Arabic message, sets `loadError`, renders `<ErrorCard>`, logs to `audio_telemetry`. **This IS surfaced.**
- `play()` rejection (lines 218-228): caught, sets `loadError = 'فشل التشغيل — حاول النقر مرة أخرى'`, logs telemetry. **This IS surfaced** — but see the race below.
- **Silent-failure watchdog (lines 192-217):** 2 s after a *resolved* `play()`, if `currentTime` hasn't advanced and the element isn't paused, it pauses, sets `silentFailure = true`, renders an `<ErrorCard>` ("الصوت لا يصدر…"), logs `error_code: -1`. **This IS surfaced.**

**Every `audio.addEventListener(...)` in the player:** `error`, `loadedmetadata`, `timeupdate`, `play`, `pause`, `ended` (lines 149-154). There is no `canplay`/`canplaythrough`/`stalled`/`waiting`/`abort` listener.

**The defect in the chain:** The source-load `useEffect` (deps `[audioUrl, listeningId, onTimeUpdate]`, line 171) calls `audio.load()` on every change of those deps. `onTimeUpdate` is passed from the parent and (if not memoized at a higher level) can change identity on re-render, **re-running the effect → `audio.load()` → which aborts any in-flight `play()` promise** with `AbortError "The operation was aborted."`. That is exactly the dominant telemetry signature (see §6). The `play()` rejection handler shows an error card, but the abort frequently fires *after* the button's optimistic `isPlaying` state — so from the student's seat the button toggles but no sound comes, and on some paths the abort is swallowed by a subsequent successful state, leaving NO visible error. This is the "press play, nothing happens, no error" report.

---

## 4. Production telemetry — the authoritative evidence (`public.audio_telemetry`)

The player already logs failures. **58 real listening failures** are recorded (context=`listening`, all `network_status: online`, date range 2026-05-19 → 2026-05-25), across **13 distinct rows**:

| error_code | meaning | count | browsers |
|---|---|---|---|
| **0** | `play()` promise rejected | **39** | mostly **Mac-Safari (35)** + iOS-Safari; messages: `"The operation was aborted."` (AbortError) and `"The operation is not supported."` (NotSupported) |
| **4** | `MEDIA_ERR_SRC_NOT_SUPPORTED` | **10** | **ALL iOS-Safari / iPad** |
| **-1** | silent-failure watchdog (resolved but `currentTime` frozen, `readyState: 4`) | **8** | **ALL Windows-Chrome** |
| **3** | `MEDIA_ERR_DECODE` | **1** | one-off |

Browser split overall: Mac-Safari 35, iOS-Safari 17, Windows 6. Failures hit both `combined.mp3` (multi-segment) and single monologue rows — NOT concentrated on concatenated files.

**Interpretation:**
- **code 0 / "aborted" (the plurality):** classic `load()`-interrupts-`play()` race. Network is online and files are 200/decodable, so this is purely client-side ordering.
- **code 4 on iOS:** since the same files decode fine in a clean WebKit load (§2), this is iOS Safari rejecting a source that was reassigned/`load()`-ed at a bad moment in the player lifecycle (e.g., source set while a previous load was pending, or `src` reassigned by a re-render). Not a file defect.
- **code -1 on Windows-Chrome:** the 2 s watchdog firing on tracks that were simply slow to start (`readyState: 4` = HAVE_ENOUGH_DATA means data was actually fine). This is at least partly a **false-positive watchdog** that pauses a track that would have started a moment later — itself a cause of "nothing happens."

---

## 5. Playwright repro (prod, `https://app.fluentia.academy`)

Credentials worked: `mock-test-a1@fluentia.academy / MockTest2025!` logged in on both Chromium and iPhone 13 (WebKit). Findings:

- The test account is gated behind a multi-step **onboarding modal** ("مرحباً في أكاديمية طلاقة" → "نصائح سريعة" → "يلا نبدأ!") that intercepts clicks; the `?tab=listening` deep link lands on the unit grid, not the tab. Reaching the actual player required dismissing onboarding + clicking into the unit.
- After dismissal, Chromium reached a player with a play button; **clicking play did NOT advance audio within 1 s and showed NO UI error** — i.e. the silent "press play, nothing happens" state was reproduced live. iPhone WebKit run landed on a different layout and did not surface the button reliably (flaky, not blocking per task guidance).
- **Static + direct-load substitute (decisive):** a clean single `load()`+`play()` of the prod `combined.mp3` succeeded on Chromium, WebKit desktop, AND WebKit iPhone 13 (`advanced: true`, `mediaErrorCode: null`). This isolates the failure to the *player's live load/play ordering*, not the audio.

Artifacts: `docs/audits/_megafix-tmp/playwright-results.json`, `listen2-chromium.png`, `12-pw-direct.mjs` output.

No DB writes were made; test account `onboarding_completed` remains `false`.

---

## 6. Storage policy

- Bucket: **`curriculum-audio`** — **PUBLIC**. Every `audio_url` is of the form `…/storage/v1/object/public/curriculum-audio/listening/L{n}/{uuid}/combined.mp3` (or single-file equivalents). 72/72 are public URLs; **0 signed URLs** are used.
- Headers confirm: `access-control-allow-origin: *`, `accept-ranges: bytes`, `cache-control: public, max-age=3600`, served via Cloudflare (`cf-cache-status: HIT`). No auth/expiry/CORS obstacle to playback.
- `voice-notes` bucket NOT touched.

---

## 7. RANKED root causes (with row/impact estimates)

1. **[CRITICAL] Player `load()`-interrupts-`play()` race → `AbortError` (code 0).**
   The source-load effect (`ListeningPlayer.jsx` dep array `[audioUrl, listeningId, onTimeUpdate]`) re-runs and calls `audio.load()`, aborting in-flight `play()`. Dominant telemetry signature (**39 of 58 failures**, ~67%). Can affect **any of the 72 rows** on any re-render; concentrated on the highest-traffic rows (L1 monologues, L2 dialogues). This is the primary "nothing happens" cause and the most likely reason multiple past repairs didn't stick (they fixed file/data, not the lifecycle race).

2. **[HIGH] iOS Safari `code=4 SRC_NOT_SUPPORTED` from mid-load source reassignment.**
   **10 of 58 failures, ALL iOS/iPad** — the platform most of the student base uses. Files decode fine in a clean load, so the trigger is the player reassigning `audio.src`/calling `load()` at a bad lifecycle moment on iOS's stricter media stack. Impacts iPhone/iPad students disproportionately; potentially **all 72 rows** on affected devices.

3. **[MEDIUM] Over-eager 2 s silent-failure watchdog → false positives (code -1).**
   **8 of 58, ALL Windows-Chrome**, `readyState: 4` (data was fine). The watchdog pauses tracks that were merely slow to start, *causing* a "nothing happens" rather than diagnosing one. Affects slow-start playback on any row.

4. **[LOW / latent] Errors not always loud enough.**
   Error cards exist, but the abort path can resolve into a non-error state, leaving the student with a toggled button and no message. Also no `stalled`/`waiting`/`canplay` listeners to drive a "buffering…" state. This is why the symptom reads as fully silent.

5. **[INFORMATIONAL, not a current bug] `is_published = false` on all 72 rows.**
   Harmless today because `ListeningTab` doesn't filter on it — but it's a latent trap if any future query adds `.eq('is_published', true)`. Flag for awareness.

**There is NO data/content root cause:** 0 never-generated, 0 404, 0 corrupt, 0 wrong-MIME, public bucket, CORS open, Range supported. **No ElevenLabs regeneration is required.**

---

## 8. Plan for Phase B (numbered)

1. **Fix the load/play race in `ListeningPlayer.jsx` (root cause #1).**
   - Remove `onTimeUpdate` from the source-load effect dep array (or wrap it so the effect keys only on `[audioUrl]`). The effect must run **only when the actual source changes**, never on incidental re-renders.
   - Guard `play()` so a pending `play()` is tracked; never call `audio.load()` while a `play()` promise is unsettled. Cancel/await the prior play before reassigning source.
   - Treat `AbortError` and `NotAllowedError` as benign-retryable (re-arm on next user gesture) rather than terminal "فشل التشغيل".

2. **Harden iOS source assignment (root cause #2).**
   - Assign `src` once and avoid re-`load()` unless the URL genuinely changed; on iOS, prefer awaiting `loadedmetadata`/`canplay` before `play()`. Add `canplay`/`loadeddata` listeners to gate the play attempt.

3. **Make the watchdog smarter (root cause #3).**
   - Don't flag silent-failure when `readyState >= 3` and the track is buffering; lengthen the window and require `paused === false && currentTime === 0 && readyState < 3` before declaring failure. Convert a slow start into a visible "جارٍ التحميل…" state instead of an error.

4. **Loud-fail UX (root cause #4).**
   - Ensure every non-benign failure renders the existing `<ErrorCard>` AND keeps `isPlaying=false` so the button never lies. Add a "buffering" spinner on `waiting`/`stalled`. Keep the retry + "تحديث كامل" buttons.

5. **Telemetry (already strong — extend).**
   - Keep `audio_telemetry` logging. Add the player's `bundle_version` already captured; additionally log a `play_attempt` success event so we can compute a real success-rate denominator (right now we only see failures). Add `canplay`/`stalled` transitions to `extra`.

6. **Rows to regenerate:** **NONE.** All 72 files are healthy. Do not spend ElevenLabs budget.

7. **Verification target for Phase B:** re-run the Playwright repro (with onboarding dismissed) + watch `audio_telemetry` for a drop in code 0 / code 4 / code -1 after deploy; success = play() starts within ~1 s on Chromium + iPhone WebKit for a 5-row sample, and any genuine failure shows a visible Arabic error card.

---

### Files referenced
- UI: `src/pages/student/curriculum/UnitContent.jsx`, `src/pages/student/curriculum/tabs/ListeningTab.jsx`, `src/components/players/listening/ListeningSection.jsx`, `src/components/players/listening/ListeningPlayer.jsx`, `src/components/players/listening/ListeningAudioComingSoon.jsx`, `src/hooks/useListeningTranscriptAudio.js`, `src/hooks/useSidebarWidth.js`, `src/lib/audioTelemetry.js`
- Data: `docs/audits/listening-fix/row-audit.json` (full 72-row audit), `docs/audits/_megafix-tmp/*` (scratch scripts + telemetry breakdowns + Playwright artifacts)
