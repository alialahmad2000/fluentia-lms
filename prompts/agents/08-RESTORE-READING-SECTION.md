# 08-RESTORE-READING-SECTION — Restore the original, then layer audio additively

> **Move + execute:**
> ```powershell
> Move-Item -Force "$env:USERPROFILE\Downloads\08-RESTORE-READING-SECTION.md" "C:\Users\Dr. Ali\Desktop\fluentia-lms\prompts\agents\08-RESTORE-READING-SECTION.md"
> ```
> ```
> Read and execute prompts/agents/08-RESTORE-READING-SECTION.md
> ```

---

## 🎯 MISSION

The reading section worked well for a long time. Students were used to it. Recent audio-refactor work (prompts 03 / 06) rewrote it into new `players/` components and **broke the experience students relied on**. Students are getting upset.

**This is a RESTORE operation, not a rebuild.** The long-standing reading component is the source of truth. The job is:

1. **Restore the original reading section verbatim** — its exact layout, its exact vocabulary-word highlighting, its exact tap-to-translate behavior. Pull it back from git history. Do not redesign it. Do not "improve" it.
2. **Then layer ONLY the audio additions on top, additively** — without disturbing anything that already worked:
   - A **sticky audio bar** — organized, polished, with **all controls centered horizontally around the middle**.
   - **Karaoke** — each word highlights in sync as the audio plays.
   - **Per-word audio** — tapping a word shows a "listen" option that plays just that word.
   - **Translation on touch** — tapping a word still shows its translation immediately, exactly as before.
   - **Highlighted key vocabulary** — every essential word that was visually distinguished in each passage comes back **exactly** as it was.

The litmus test: a student who used the reading section three months ago should feel like nothing changed — except now there's audio with karaoke, and tapping a word also offers to play it.

---

## 🧭 GUIDING PRINCIPLE — read before touching anything

> **The old version is sacred. The audio is a thin additive layer.**
>
> - Do NOT rewrite the passage renderer. Restore it.
> - Do NOT redesign the vocabulary highlighting. Restore the exact CSS and logic.
> - Do NOT change the translation popup. Restore it, then add one button to it.
> - The ONLY net-new code is: the sticky audio bar, the karaoke sync hook, and the per-word "listen" action wired into the existing popup.
> - If a choice arises between "matching the old behavior" and "doing something cleaner," **match the old behavior.**

---

## 📁 ENVIRONMENT

- **Working dir:** `C:\Users\Dr. Ali\Desktop\fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`
- **DB:** Supabase prod (`nmjexpuycmqcxuxljier`) — read-only for this prompt; reading audio + `word_timestamps` already exist in `reading_passage_audio`.
- **Design system:** `var(--ds-*)` tokens, Velvet Midnight, RTL Arabic-first.
- **Context:** prompts 03 and 06 are the commits that rewrote the reading section. The "long-standing" version is whatever existed **before** prompt 03 first touched the reading files.

---

## ⚠️ STRICT RULES

1. **Restore, don't rebuild.** Extract the original component(s) from git and bring them back as-is.
2. **No DB writes.** Reading audio and `word_timestamps` already exist; this prompt is presentation-only.
3. **All hooks before conditional returns.** No React Error #310.
4. **`profile.id` not `user.id`** for student-scoped reads (e.g. saved-words state).
5. **No `vite build` locally.**
6. **The audio layer must degrade gracefully** — a passage with no audio yet renders exactly like the old version did (text + vocab highlighting + tap-to-translate), with no broken player and no errors.
7. **Do not delete the new `players/` components outright** — the listening section (prompt 07) depends on some of them. Only stop the *reading* flow from using them.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Git archaeology: find the long-standing reading section
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is the most important phase. If the wrong commit is chosen, everything downstream is wrong.

### A.1 — Map the reading component history

```bash
# Find every file that has ever rendered reading passages
git log --all --oneline -200 -- "**/Reading*" "**/reading*" "**/Passage*" "**/passage*" | head -50

# The recent audio-refactor commits (prompts 03/06) — these are the BOUNDARY
git log --oneline -60 --grep="player\|players\|word-level\|passage-ux\|reading.*audio\|InteractivePassage" | head -30

# History of the specific reading files (run for each path found above)
git log --oneline -60 -- src/components/curriculum/ src/pages/student/curriculum/ | head -40
```

### A.2 — Identify the boundary commit and the restore target

- **BOUNDARY** = the first commit where prompt 03's work touched the reading section (look for "split reading + listening players", "InteractivePassage", "ReadingPassagePlayer", or similar in commit messages).
- **RESTORE_TARGET** = the commit immediately **before** BOUNDARY — the last state of the reading section as students knew it for a long time.

Confirm RESTORE_TARGET is genuinely the long-standing version: its reading component should already contain vocabulary-word highlighting and a tap-to-translate popup (these existed long before audio). If the commit you picked doesn't have those, you picked too early or too late — adjust.

### A.3 — Extract the original source

```bash
mkdir -p docs/dev-notes/reading-restore
# For EACH reading-related file, extract the RESTORE_TARGET version:
git show <RESTORE_TARGET>:src/components/curriculum/ReadingTab.jsx > docs/dev-notes/reading-restore/_original-ReadingTab.jsx
git show <RESTORE_TARGET>:<path-to-passage-renderer> > docs/dev-notes/reading-restore/_original-PassageRenderer.jsx
git show <RESTORE_TARGET>:<path-to-word-popup> > docs/dev-notes/reading-restore/_original-WordPopup.jsx
git show <RESTORE_TARGET>:<path-to-reading-css> > docs/dev-notes/reading-restore/_original-reading.css 2>/dev/null || true
# ...repeat for every file the reading section depended on at RESTORE_TARGET
```

### A.4 — Document the original behavior precisely

Read every extracted file. Write `docs/dev-notes/reading-restore/ORIGINAL-SPEC.md`:

- **Layout:** the exact structure of the reading tab (header, passage body, any side elements).
- **Vocabulary highlighting:** which words got highlighted (matched against `curriculum_vocabulary`? a field on the passage row? a hardcoded list?), and the exact visual treatment (color, underline, weight, background — copy the exact CSS).
- **Word tokenization:** does the original render every word as a tappable span, or only vocab words? This determines how karaoke attaches in Phase C.
- **Tap-to-translate:** what happens on tap — popup? inline? what's in it? how is the translation fetched (which hook/edge function)?
- **Saved-words / "add to vocabulary":** did the original have it? how did it work?
- **File inventory:** the complete list of files that must be restored, with their original paths.

### A.5 — Diff against current

```bash
# Show what prompts 03/06 changed for each reading file
git diff <RESTORE_TARGET> HEAD -- <each reading file path> > docs/dev-notes/reading-restore/_drift.diff
```

Skim the diff to understand exactly what was altered, so the restore is deliberate and complete.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Restore the original reading section verbatim
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### B.1 — Bring back the original files

For every file in the A.4 inventory, restore the RESTORE_TARGET version to its original path:

```bash
git checkout <RESTORE_TARGET> -- <original/path/to/each/reading/file>
```

If a file's path changed between RESTORE_TARGET and HEAD, restore it to the **original** path and update imports accordingly.

### B.2 — Re-point the curriculum page to the restored reading component

The curriculum unit page currently routes the Reading tab through prompt 03/06's `ReadingPassagePlayer`. Change it back to mount the **restored original** reading component.

```bash
grep -rn "ReadingPassagePlayer\|players/.*Reading" src/pages/ src/components/curriculum/ --include="*.jsx"
```

For each match in the reading path: swap it to the restored component. Leave the listening path (prompt 07's `ListeningSection`) untouched.

### B.3 — Resolve dependency drift

The restored files may import hooks/utilities whose signatures changed since RESTORE_TARGET (e.g. a `supabase` client path, a translation hook, a `useSavedWords` hook). For each broken import:
- If the old hook still exists with the same behavior → just fix the import path.
- If the hook was renamed/refactored → restore the **original hook** alongside the component (from the same RESTORE_TARGET commit) rather than adapting the component to a newer hook. The component is sacred; bend the environment to fit it, not the reverse.

### B.4 — Checkpoint: original parity

At this point the reading section must look and behave **exactly** like RESTORE_TARGET — vocabulary highlighting back, tap-to-translate back, original layout back. No audio yet. Verify by reading the restored files and confirming they match the extracted originals byte-for-byte (except import-path fixes).

**Commit this as its own atomic commit** before adding audio — so the restore is independently revertable:

```bash
git add <restored reading files> src/pages/ docs/dev-notes/reading-restore/
git commit -m "restore(reading): bring back long-standing reading section verbatim (pre-audio-refactor)

- Restored from <RESTORE_TARGET> — the last stable version students knew
- Vocabulary-word highlighting restored exactly (original CSS + matching logic)
- Tap-to-translate popup restored exactly
- Original reading tab layout restored
- Curriculum page re-pointed away from prompt-03/06 ReadingPassagePlayer
- Listening section (prompt 07) untouched
- No audio layer yet — that lands in the next commit"
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Layer the audio additively (the only net-new code)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Three additions, each touching the restored component as little as possible.

### C.1 — Karaoke sync hook

**`src/components/reading/audio/useKaraoke.js`**

```javascript
import { useMemo } from 'react';

/**
 * Given the passage's word_timestamps and the current audio time (ms),
 * returns the index of the word currently being spoken, or -1.
 *
 * "Index" = position among matchable English-letter words, counted in passage
 * order. The restored renderer must tag word spans with the same counting rule
 * (see C.3) so the index lines up.
 */
export function useKaraoke(wordTimestampsJson, currentTimeMs) {
  const words = useMemo(() => {
    if (!wordTimestampsJson) return [];
    const src = wordTimestampsJson.paragraphs
      ? wordTimestampsJson.paragraphs.flatMap(p => p.words || [])
      : (wordTimestampsJson.words || []);
    return src.filter(w => w.word && /[A-Za-z]/.test(w.word));
  }, [wordTimestampsJson]);

  return useMemo(() => {
    if (!words.length || currentTimeMs == null) return -1;
    // linear scan is fine — passages are short; avoids binary-search edge bugs
    for (let i = 0; i < words.length; i++) {
      const start = words[i].start_ms ?? 0;
      const end = words[i].end_ms ?? start;
      if (currentTimeMs >= start && currentTimeMs < end) return i;
      // between words → highlight the upcoming one slightly early feels natural
      if (currentTimeMs < start) return Math.max(0, i - 1);
    }
    return words.length - 1;
  }, [words, currentTimeMs]);
}
```

### C.2 — Per-word audio playback

**`src/components/reading/audio/useWordAudio.js`** — mobile-safe, `timeupdate`-based (NOT `setTimeout`):

```javascript
import { useCallback, useRef, useEffect } from 'react';

/**
 * Plays a single word [start_ms, end_ms] from the passage's full audio file.
 * Uses a shared, preloaded <audio> element + timeupdate-based stopping so it
 * survives iOS low-power mode and background throttling.
 * Falls back to Web Speech API when timestamps are unavailable.
 */
export function useWordAudio(audioUrl) {
  const elRef = useRef(null);
  const stopAtRef = useRef(null);
  const tokenRef = useRef(0);

  const getEl = useCallback(() => {
    if (!audioUrl) return null;
    if (elRef.current && elRef.current.src === audioUrl) return elRef.current;
    let el = document.querySelector(`audio[data-reading-word-audio="${audioUrl}"]`);
    if (!el) {
      el = document.createElement('audio');
      el.dataset.readingWordAudio = audioUrl;
      el.src = audioUrl;
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      el.style.display = 'none';
      document.body.appendChild(el);
    }
    elRef.current = el;
    return el;
  }, [audioUrl]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const onTime = () => {
      if (stopAtRef.current != null && el.currentTime * 1000 >= stopAtRef.current) {
        el.pause();
        stopAtRef.current = null;
      }
    };
    el.addEventListener('timeupdate', onTime);
    return () => el.removeEventListener('timeupdate', onTime);
  }, [audioUrl]);

  const playWord = useCallback(async (wordText, timestamps) => {
    const el = getEl();
    const myToken = ++tokenRef.current;

    if (el && timestamps && typeof timestamps.start_ms === 'number') {
      if (el.readyState < 1) {
        await new Promise((res) => {
          const ready = () => { el.removeEventListener('loadedmetadata', ready); res(); };
          el.addEventListener('loadedmetadata', ready);
          el.load();
          setTimeout(() => { el.removeEventListener('loadedmetadata', ready); res(); }, 1500);
        });
      }
      if (myToken !== tokenRef.current) return;
      try {
        el.pause();
        el.currentTime = timestamps.start_ms / 1000;
        stopAtRef.current = (timestamps.end_ms ?? timestamps.start_ms) + 40;
        await el.play();
        return;
      } catch { /* fall through to speech synthesis */ }
    }
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(wordText);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  }, [getEl]);

  return { playWord };
}
```

### C.3 — Minimal touch-points in the restored renderer

Make the **smallest possible** edits to the restored passage renderer:

1. **Tag word spans with a stable index.** Wherever the original renders word spans, add `data-word-index={n}` where `n` increments only for matchable English-letter words (same rule as `useKaraoke`). If the original renders only *vocab* words as spans and plain text otherwise, you must extend tokenization so **every** word is a span — but keep the original's vocab-word class/style untouched; non-vocab words just get a minimal wrapper span. This is the one structural change allowed, and only because karaoke requires per-word spans.

2. **Apply the karaoke class.** Pass `currentWordIndex` (from `useKaraoke`) into the renderer; the span whose `data-word-index` matches gets an added class `karaoke-active`. Vocab words keep their original class AND get `karaoke-active` when active — additive, never replacing.

3. **Add a "listen" action to the existing translation popup.** Do NOT rebuild the popup. The restored popup already shows the translation on tap. Add one button/icon to it: a speaker that calls `playWord(word, timestampForThisWord)`. The timestamp comes from looking up `word_timestamps` by the span's `data-word-index`.

Karaoke CSS — add to the restored reading stylesheet, do not modify existing rules:

```css
/* Additive — karaoke highlight. Layers on top of existing vocab styling. */
.karaoke-active {
  background-color: color-mix(in srgb, var(--ds-accent-gold) 28%, transparent);
  border-radius: 4px;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ds-accent-gold) 35%, transparent);
  transition: background-color 0.12s ease, box-shadow 0.12s ease;
}
@media (prefers-reduced-motion: reduce) {
  .karaoke-active { transition: none; }
}
```

### C.4 — The sticky reading audio bar (controls centered)

**`src/components/reading/audio/ReadingAudioBar.jsx`**

Sticky, organized, polished — and **all controls centered horizontally around the middle**. Reading audio is supplementary, so this bar is cleaner/simpler than the listening player (no A-B loop, no speaker markers): play/pause centered and prominent, scrubber, time, replay-5s / forward-5s flanking the play button symmetrically, speed control.

```jsx
import { useState, useEffect, useRef, useCallback } from 'react';

const SPEEDS = [0.75, 1, 1.25, 1.5];
const fmt = (s) => {
  if (!isFinite(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

/**
 * Sticky-in-content reading audio bar. Renders as the last child of the reading
 * content column so it respects the sidebar width automatically (no fixed-width
 * bleed). All controls are centered around the play button.
 *
 * Props:
 *   audioRef      forwarded ref to the parent's <audio> element
 *   onTimeUpdate  (ms) => void  — drives karaoke
 */
export function ReadingAudioBar({ audioRef, onTimeUpdate }) {
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => { setCur(el.currentTime); onTimeUpdate?.(el.currentTime * 1000); };
    const onMeta = () => setDur(el.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onPause);
    if (el.readyState >= 1) onMeta();
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onPause);
    };
  }, [audioRef, onTimeUpdate]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.paused ? el.play().catch(() => {}) : el.pause();
  }, [audioRef]);
  const seek = useCallback((s) => {
    const el = audioRef.current;
    if (el) el.currentTime = Math.max(0, Math.min(s, dur));
  }, [audioRef, dur]);
  const setRate = useCallback((s) => {
    const el = audioRef.current;
    if (el) el.playbackRate = s;
    setSpeed(s);
  }, [audioRef]);

  const pct = dur ? (cur / dur) * 100 : 0;

  return (
    <div dir="ltr" className="sticky bottom-4 z-30 mt-8">
      <div className="rounded-2xl border border-[var(--ds-border-default)]
                      bg-[color-mix(in_srgb,var(--ds-surface-elevated)_92%,transparent)]
                      backdrop-blur-2xl shadow-[0_18px_50px_-15px_rgba(0,0,0,0.55)]
                      px-5 py-4">
        {/* Scrubber */}
        <div className="relative h-6 flex items-center mb-1">
          <div className="absolute inset-x-0 h-1.5 rounded-full bg-[var(--ds-surface)] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[var(--ds-accent)] to-[var(--ds-accent-gold)]"
                 style={{ width: `${pct}%` }} />
          </div>
          <input type="range" min={0} max={dur || 0} step={0.01} value={cur}
                 onChange={(e) => seek(parseFloat(e.target.value))}
                 className="absolute inset-x-0 w-full h-6 opacity-0 cursor-pointer" aria-label="Seek" />
          <div className="absolute w-3.5 h-3.5 rounded-full bg-white border-2 border-[var(--ds-accent-gold)] pointer-events-none shadow"
               style={{ left: `calc(${pct}% - 7px)` }} />
        </div>
        <div className="flex justify-between text-[11px] font-mono text-[var(--ds-text-tertiary)] mb-3">
          <span>{fmt(cur)}</span>
          <span>{fmt(dur)}</span>
        </div>

        {/* Controls — CENTERED around the play button */}
        <div className="flex items-center justify-center gap-3">
          {/* speed sits left but the cluster as a whole is centered via justify-center + symmetric spacers */}
          <div className="flex items-center gap-0.5 p-1 rounded-xl bg-[var(--ds-surface)]">
            {SPEEDS.map(s => (
              <button key={s} onClick={() => setRate(s)}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition ${
                  speed === s ? 'bg-[var(--ds-accent)] text-white'
                              : 'text-[var(--ds-text-tertiary)] hover:text-[var(--ds-text-secondary)]'}`}>
                {s}×
              </button>
            ))}
          </div>

          <button onClick={() => seek(cur - 5)} aria-label="رجوع 5 ثوانٍ"
            className="grid place-items-center w-10 h-10 rounded-xl text-[var(--ds-text-secondary)]
                       hover:bg-[var(--ds-surface-hover)] transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4a8 8 0 108 8" /><path d="M11 4L7 1M11 4L7 7" />
            </svg>
          </button>

          <button onClick={toggle} aria-label={playing ? 'إيقاف' : 'تشغيل'}
            className="grid place-items-center w-14 h-14 rounded-full
                       bg-gradient-to-br from-[var(--ds-accent-gold)] to-[var(--ds-accent)]
                       text-black shadow-lg hover:scale-105 active:scale-95 transition">
            {playing ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><polygon points="6 4 20 12 6 20 6 4"/></svg>
            )}
          </button>

          <button onClick={() => seek(cur + 5)} aria-label="تقديم 5 ثوانٍ"
            className="grid place-items-center w-10 h-10 rounded-xl text-[var(--ds-text-secondary)]
                       hover:bg-[var(--ds-surface-hover)] transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 4a8 8 0 11-8 8" /><path d="M13 4l4-3M13 4l4 3" />
            </svg>
          </button>

          {/* symmetric spacer to keep the play button visually centered against the speed cluster */}
          <div className="w-[88px] hidden sm:block" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
```

### C.5 — Wire the audio layer into the restored reading component

In the restored reading component, add (additively — do not restructure what's there):

```jsx
// near the other hooks, ABOVE any conditional return
const audioElRef = useRef(null);
const [currentTimeMs, setCurrentTimeMs] = useState(0);
const currentWordIndex = useKaraoke(audio?.word_timestamps, currentTimeMs);
const { playWord } = useWordAudio(audio?.full_audio_url);
```

- Pass `currentWordIndex` down to the passage renderer (for the `karaoke-active` class).
- Pass `playWord` + a `word_timestamps` lookup into the existing translation popup (for the new "listen" button).
- At the end of the reading content column, render:
  ```jsx
  {audio?.full_audio_url && (
    <>
      <audio ref={audioElRef} src={audio.full_audio_url} preload="metadata" />
      <ReadingAudioBar audioRef={audioElRef} onTimeUpdate={setCurrentTimeMs} />
    </>
  )}
  ```
- Add `pb-32` to the reading content column so the sticky bar never covers the last lines.
- **If `audio` is null** → render nothing extra. The section is byte-for-byte the old experience.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Verify coexistence
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Confirm by reading the code (not a running app):

1. The restored passage renderer still has the **original** vocabulary-word class and CSS — unmodified.
2. The original tap-to-translate popup still works — translation shows on tap, exactly as before. The only addition is one "listen" button.
3. Every word span has `data-word-index`; the counting rule matches `useKaraoke`.
4. `karaoke-active` is **added** to active words, never **replacing** the vocab class.
5. `ReadingAudioBar` is `position: sticky bottom-4`, NOT `fixed` — respects the sidebar.
6. The play button is visually centered (justify-center cluster + symmetric spacer).
7. A passage with `audio == null` renders no `<audio>`, no `ReadingAudioBar`, no errors — pure original experience.
8. The listening section (prompt 07) is untouched — its imports still resolve.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE E — Self-check
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. `grep -rn "ReadingPassagePlayer" src/pages/ src/components/curriculum/` → ZERO matches in the reading path (curriculum page uses the restored component).
2. `grep -rn "data-word-index" src/` → present in the restored renderer.
3. `grep -rn "karaoke-active" src/` → present in both the renderer logic and the CSS.
4. `grep -rn "fixed bottom-0\|fixed.*left-0.*right-0" src/components/reading/` → ZERO (sticky, not fixed).
5. `grep -n "setTimeout" src/components/reading/audio/useWordAudio.js` → only the metadata-load safety timeout, not a playback-stop timer.
6. ESLint clean: `npx eslint src/components/reading/ --max-warnings=0`.
7. Diff the restored vocab-highlighting CSS against `docs/dev-notes/reading-restore/_original-reading.css` → identical (apart from the additive `.karaoke-active` rule).
8. All hooks in the restored component + new components are above any conditional return.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE F — Commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> Phase B already produced commit 1 (the verbatim restore). This is commit 2 (the additive audio layer).

```bash
git add src/components/reading/ \
        <restored reading component if edited in Phase C> \
        docs/dev-notes/reading-restore/

git commit -m "feat(reading): additive audio layer on the restored reading section

Built strictly on top of the restored long-standing reading section — no rewrite.

Additions only:
- useKaraoke: maps audio time + word_timestamps → active word index
- Passage renderer: every word tagged data-word-index (same counting rule);
  active word gets .karaoke-active ADDED on top of its original class
- .karaoke-active CSS layered in — original vocab-highlighting CSS untouched
- useWordAudio: mobile-safe per-word playback (timeupdate-based, not setTimeout;
  preloaded shared <audio>; Web Speech API fallback)
- Existing tap-to-translate popup gains ONE 'listen' button — popup otherwise unchanged
- ReadingAudioBar: sticky-in-content (sidebar-aware), controls centered around
  the play button, scrubber + time + replay/forward 5s + speed

Preserved exactly:
- Vocabulary-word highlighting (original CSS + matching logic, verbatim)
- Tap-to-translate behavior and popup
- Original reading tab layout
- Graceful degradation: passages without audio render as the pure original

Listening section (prompt 07) untouched."

git push origin main
git fetch origin
git log --oneline -2 HEAD
git log --oneline -1 origin/main
```

---

## ⛔ DO NOT

- ❌ Rewrite or redesign the reading passage renderer — restore it
- ❌ Modify the original vocabulary-highlighting CSS or matching logic — only ADD `.karaoke-active`
- ❌ Rebuild the translation popup — restore it, add exactly one "listen" button
- ❌ Position the audio bar `fixed` — sticky-in-content only, controls centered
- ❌ Use `setTimeout` to stop per-word audio — `timeupdate` only
- ❌ Break the listening section (prompt 07) — leave its components alone
- ❌ Adapt the restored component to newer hooks — restore the original hooks instead
- ❌ Write to the DB
- ❌ Run `vite build` locally

## ✅ FINISH LINE

- Reading section looks and behaves exactly like the long-standing version students knew — vocabulary highlighting back, tap-to-translate back, original layout back
- On top of that: a sticky, centered, polished audio bar; karaoke word-highlighting synced to playback; tapping a word offers a "listen" option alongside its translation
- Passages without audio still render as the pure original experience
- Two atomic commits pushed (verbatim restore, then additive audio layer)

End of prompt.
