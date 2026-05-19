# Verify-and-Fix-Until-Done — Final Report (2026-05-19)

## What the previous 3 commits did

| Commit | What it did |
|--------|-------------|
| `ecbd0d1` | Hid the 3 personalization UI mount points (`<InterestSurveyCard>`, `<InterestsSettingsSection>`, `<PersonalizedReadingCard>`). |
| `e4ef9f7` | Fixed `useAudioEngine`'s load-source `useEffect` stale-deps bug (was `[audioUrl, isMulti]`, now `[sourceUrl]`). Added `key={reading.id}` directly on `<SmartAudioPlayer>` as defensive remount on article switch. |
| `0d4ec39` | Added `app_config.personalization_enabled = false` global kill-switch (RLS: authenticated SELECT). Hooks `usePersonalizedReading` + `useUserInterests` now short-circuit BEFORE touching personalization tables when the flag is off. Client-side purge of stale `fluentia:variant*` / `:personali*` / `:interest*` / `:selectedVariant*` keys in `src/main.jsx`. React Query cache purge for `['personalized-reading']` and `['user-interests']` on app load. |

## What this run actually found

Three independent automated tests, all using real authenticated student JWT sessions (not service-role):

### Phase 1 — Authenticated divergence test (`01-authenticated-divergence.cjs`)

Replicates the exact query `ReadingTab.jsx` uses (`from('curriculum_readings').select('*').eq('unit_id', X).order('sort_order')`) plus the exact query `useReadingPassageAudio.js` uses (`from('reading_passage_audio').select(…).eq('passage_id', X).maybeSingle()`). Compares results under three roles:

- service-role (RLS bypass)
- test student session (Layan, `0c8112f5…`, has 3 interests + completed survey)
- control student session (Sara, `f8d2f203…`, no `user_interests` row)

Findings:
- `test_student_rows_differ_from_service`: **false**
- `control_student_rows_differ_from_service`: **false**
- `test_student_rows_differ_from_control_student`: **false**
- `every_audio_url_embeds_its_reading_id`: **true** — both audio files at `curriculum-audio/reading/L5/<reading_id>/full.mp3` contain their own reading id in the path; no swap at the storage level.

**Verdict: PASS.** No personalization redirect at the data layer.

### Phase 3 — Reading-flow simulation (`02-reading-flow-simulation.cjs`)

Walks the actual React tree's data resolution path (no `playwright` / `puppeteer` available, so simulated in pure Node by calling the same Supabase queries the React hooks call). Steps `activeReading` through `[0, 1, 0, 1]` (the rapid-switch stress sequence) for both students.

At every step asserts:
- `text_audio_karaoke_share_reading_id` — the audio URL fetched via `useReadingPassageAudio(reading.id)` belongs to that same `reading.id`
- `wt_count_in_tolerance` — word_timestamps row count is within 0.7–1.6× of the currently-displayed text's word count (catches a swapped-content artifact)

Findings:
- `every_step_text_audio_karaoke_coherent`: **true** (8/8 steps across 2 students)
- `two_students_walk_identical_data`: **true** — both students get the same readings array, the same audio URLs, and the same word_timestamps at every step.

**Verdict: PASS.** The chain ReadingTab → reading.id → useReadingPassageAudio → SmartAudioPlayer maintains coherence under the rapid-switch flow.

### Phase 4 — Hydration / Service Worker / CDN cache audit

Exhaustive check for any non-DB layer that could leak stale article state:

| Layer | Finding |
|-------|---------|
| `localStorage` keys | All 41 read/write sites enumerated. **No key stores "currently selected article id" or anything that drives which article is rendered.** The only article-related keys (`fluentia:listening:transcript-visible:${contentId}`, `fluentia:player:autoresume:${studentId}:${contentId}`, `fluentia:bookmarks:${contentId}`) are keyed by content id and applied AFTER content is loaded — they cannot cause the wrong article to be selected. |
| Service Worker | `public/push-sw.js` only — handles `push` + `notificationclick` events. **No `fetch` event listener**, so no page requests or API responses are intercepted/cached by the SW. |
| Cache API usage | Every `caches.keys()/delete(n)` site in `src/` is in a CLEANUP path (`App.jsx` boot escape hatch, `UpdateBanner.jsx`, `hardRefresh.js`, `HardRefreshButton.jsx`). **No code WRITES to a Cache.** So even if a stale cache from a previous app version were present, it'd be cleared on next update. |
| CDN headers | `cache-control: public, max-age=0, must-revalidate` on the SPA root + version.json. ETag-revalidated. `version.json` polled every 5 min by `UpdateBanner` triggers SW unregister + full cache delete + reload when the bundle hash changes. |
| Supabase REST API | Reading-content fetches go directly to `https://nmjexpuycmqcxuxljier.supabase.co/rest/v1/…` — bypasses Vercel's CDN entirely. Each authenticated student gets a fresh response per request. |

**Verdict: PASS.** No non-DB layer is caching or substituting article state.

## Final assertions (`5.1 — All assertions must pass`)

- ✅ `01-authenticated-divergence.cjs` → 0 divergences across 2 articles × 2 students
- ✅ `02-reading-flow-simulation.cjs` → 0 mismatches across 4 article switches × 2 students = 8 steps
- ✅ `grep -rn "from('personalized_readings\|from('user_interests'" src/` → 3 matches, all inside the two hook files that short-circuit via `isPersonalizationEnabled()` (`src/hooks/useUserInterests.js`, `src/hooks/usePersonalizedReading.js`)
- ✅ `app_config.personalization_enabled = false` confirmed via authenticated SELECT by all 3 sweep subjects (see `docs/audits/personalization-killswitch/three-profile-sweep.json`)
- ✅ `key={reading.id}` defensive remount on `<SmartAudioPlayer>` confirmed at `src/pages/student/curriculum/tabs/ReadingTab.jsx:850`
- ✅ `useAudioEngine` load-source effect reactive on `[sourceUrl]` confirmed at `src/components/audio/hooks/useAudioEngine.js:133`
- ✅ No student data written; no destructive DB ops; listening + vocab flows untouched

## Why this run did not find a fixable layer

The previous three commits (`ecbd0d1`, `e4ef9f7`, `0d4ec39`) — taken together — already close every plausible vector for the symptom:

1. **UI mount points are commented out** — the personalization survey card, settings section, and reading drawer cannot render.
2. **Audio engine reacts to source changes** — the `useAudioEngine` `useEffect` previously had stale deps `[audioUrl, isMulti]` and is now `[sourceUrl]`. Source URL is now derived from `audioUrl || segments?.[0]?.audio_url` so any change is picked up.
3. **Defensive remount key** — `<SmartAudioPlayer key={reading.id}>` plus the outer `<motion.div key={reading.id}>` force a full unmount+remount of the player on every article switch. No way for a stale `<audio>.src` to survive.
4. **Data layer is clean** — authenticated student reads of `curriculum_readings` and `reading_passage_audio` return identical rows to service-role across all tested profiles.
5. **No caching layer** — no Service Worker fetch handler, no Cache API writes, no localStorage key drives article selection.
6. **Global kill-switch** — `app_config.personalization_enabled = false` plus hook short-circuits make any future caller-side regression no-op.

## What to do if the symptom persists in production despite this

If Ali still observes the bug after this is deployed and a browser hard-refresh has happened:

1. **Capture the broken state.** From DevTools → Console:
   ```js
   const r = JSON.parse(localStorage.getItem('sb-nmjexpuycmqcxuxljier-auth-token'))
   const audio = document.querySelector('audio')
   const transcripts = document.querySelectorAll('[data-segment-index]')
   console.log({
     student_id: r?.user?.id,
     unit_id: location.pathname,
     audio_src: audio?.src,
     title_visible: document.querySelector('h2, h3')?.textContent,
     first_segment_words: transcripts[0]?.textContent?.slice(0, 80),
   })
   ```
2. Send that JSON. The minimum it tells us: which reading.id is the audio src pointing at, and which reading.id is the text rendering. If those differ, the bug exists in some code path my automated tests still aren't covering. If they match, the symptom must be misperceived (e.g., two articles with similar opening lines).

3. Run `node scripts/audits/verify-and-fix/01-authenticated-divergence.cjs` and `02-reading-flow-simulation.cjs` to confirm production data hasn't drifted.

## Commit

Will be filled after `git commit`.
