# PHASE A — Listening player + word-pron path (read-only)

## Listening player
- **File:** `src/components/players/listening/ListeningPlayer.jsx`
  (the prompt's `src/components/curriculum/listening/` is a Windows-env guess; the real
  tree is `src/components/players/listening/`.)
- **How it makes/controls audio:** a single real `<audio ref={audioRef} preload="metadata"
  playsInline style={{display:'none'}} />` (line 506). `audioRef = useRef(null)`. `src` is
  assigned in an effect (`audio.src = audioUrl`), never inline. `play()` is called
  synchronously from the play-button click handler (`togglePlay` → `startPlayback`).
- **The URL prop fed to it:** `audioUrl` (passed by `ListeningSection.jsx`).
- **muted / volume / defaultMuted anywhere?** NONE. Grep of the player (and the app) shows
  the listening `<audio>` never sets `muted`, `volume`, or `defaultMuted`. So if the element
  reads `muted=true` or `volume=0` at runtime, that state comes from the browser/OS, not our
  code — which the overlay will reveal.

## Word-pronunciation path (the one that "works" in the same Safari)
- **File:** `src/lib/audio/pronounceWord.js` (used by reading `WordPopup.jsx`; the listening
  word path `src/components/players/lib/useWordAudio.js` has the same two-tier shape).
- **Mechanism — TWO tiers:**
  1. **Tier 1:** `curriculum_vocabulary.audio_url` MP3 via `new Audio()` + `audio.play()`.
  2. **Tier 2:** **Web Speech API** — `new SpeechSynthesisUtterance(word)` +
     `window.speechSynthesis.speak(u)` when Tier 1 has no row / fails.
- Real-device telemetry (prompt 10) showed word audio falls back to **Web Speech ~48% on
  iPhone**. Web Speech (`speechSynthesis`) does **not** go through an `<audio>` element and
  **bypasses Safari's per-tab mute** and element `muted`/`volume`.

## Why this matters (hypothesis status)
"Word pronunciation works, the listening player is silent, in the same Safari" is exactly
what you'd see if Ali's word audio is coming through **Web Speech (Tier 2, bypasses tab-mute)**
while the listening player's `<audio>` element **obeys** a muted tab / `muted=true` / `volume=0`.
The tab-mute / output-routing theory is the leading candidate. The `?debug=audio` overlay
(Phase B) confirms or eliminates it from one screenshot:
- element `muted`/`volume`/`error`/`readyState`/`currentTime` live;
- a Web-Audio **Test Beep** (does ANY output reach the speakers in this tab?);
- a **Fresh `<audio>` play()** that bypasses the React player logic.

Observation only — no playback logic changed.
