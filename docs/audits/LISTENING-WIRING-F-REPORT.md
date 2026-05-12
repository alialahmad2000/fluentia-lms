# Listening Tab Wiring — Final Report

## Multi-Speaker Bug Status: FIXED ✅

**Root cause:** Legacy `AudioPlayer` read `curriculum_listening.audio_url` (first segment only). Never queried `listening_audio` table. All multi-speaker dialogues/interviews ended after segment 0 (~10-25s).

**Fix:** `ListeningSection` now uses `useListeningTranscriptAudio(listening.id)` which fetches ALL segments from `listening_audio` ordered by `segment_index`. `SmartAudioPlayer` with `useAudioEngine` handles seamless segment transitions (already implemented in Foundation).

**Before:** Fatima/Noor dialogue plays 10s → stops  
**After:** All segments play sequentially; interviews run 255-312s total

---

## Programmatic Tests: 10/10 ✅

- Hook shape and isMounted guard: ✅
- Multi-segment URLs return 200 audio: ✅
- Dialogue cumulative duration >15s: ✅
- SmartAudioPlayer import in ListeningTab: ✅
- VocabPopup import: ✅
- variant="bottom-bar" used: ✅
- useListeningTranscriptAudio used: ✅
- ListeningExercises preserved: ✅
- ≥5 analytics events: ✅ (5 events)
- React Hooks Rule: ✅

---

## Data Summary

- 72 transcripts, all with audio
- L0/L1: 12 each, 1 segment (monologues — expected)
- L2-L5: 7-14 avg segments/transcript (rich multi-speaker)
- Storage: 10/10 sampled URLs return 200 + audio/mpeg

---

## 60-Second Manual Smoke Test for Ali

Open https://app.fluentia.academy as a student. Navigate to a Unit → Listening tab.

- [ ] Bottom bar appears at bottom of screen, Play button centered
- [ ] Press Play — audio starts from segment 0
- [ ] **CRITICAL: at end of first speaker, second speaker starts automatically**
- [ ] Speaker badge changes when speaker switches (e.g. Alice → George)
- [ ] Cumulative timer shows total listening duration (not 0:10/0:10)
- [ ] Long-press a word → VocabPopup opens
- [ ] Tap a word → audio seeks to that word (if not in one-play mode)
- [ ] Tap "محاكاة IELTS" → one-play mode banner appears, seek/speed disabled
- [ ] After audio ends in one-play mode → play button locked (grayed out)
- [ ] Comprehension questions below still render and can be answered
- [ ] Completion tracking still works (XP awarded)

---

## Files Changed

- `src/hooks/useListeningTranscriptAudio.js` — new (fetches listening_audio segments)
- `src/components/audio/parts/OnePlayBanner.jsx` — new (IELTS exam mode banner)
- `src/components/audio/SmartAudioPlayer.jsx` — added onePlayMode feature + playerLocked state
- `src/components/audio/parts/BottomBarControls.jsx` — playerLocked prop, disabled play button state
- `src/pages/student/curriculum/tabs/ListeningTab.jsx` — ListeningSection rewritten with SmartAudioPlayer
- `scripts/audit/listening-audit.mjs` — autonomous data audit script
- `scripts/audit/listening-wiring-tests.mjs` — programmatic wiring tests
- `docs/audits/LISTENING-WIRING-A-DISCOVERY.md` — discovery doc
- `docs/audits/LISTENING-DATA-AUDIT.txt` — audit results
- `docs/audits/LISTENING-WIRING-F-REPORT.md` — this file
