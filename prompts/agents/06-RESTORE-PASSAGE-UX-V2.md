# 06-RESTORE-PASSAGE-UX-V2 — Per-word audio + vocab highlighting + sticky audio bar

> **Move + execute:**
> ```powershell
> Move-Item -Force "$env:USERPROFILE\Downloads\06-RESTORE-PASSAGE-UX-V2.md" "C:\Users\Dr. Ali\Desktop\fluentia-lms\prompts\agents\06-RESTORE-PASSAGE-UX-V2.md"
> ```
> ```
> Read and execute prompts/agents/06-RESTORE-PASSAGE-UX-V2.md
> ```

> **Prerequisite:** Prompt 03 ran (new player components exist). This prompt restores the BETTER design from before the audio refactor and fixes the broken per-word audio.

---

## 🎯 MISSION

Three coupled fixes:

1. **Per-word audio is broken — fix it.** Currently clicking a word's speaker icon does nothing (or plays the whole clip). Root cause: timing/preload/event-handling in `useWordAudio`. Replace with a precise, mobile-safe implementation using `timeupdate` events.

2. **Restore vocab-word visual design from the pre-audio version.** Previously, important vocabulary words from the unit were visually distinct (highlighted color/underline) and their Arabic translation rendered DIRECTLY beside/under them — always visible, no click needed. The recent audio refactor removed this. Bring it back via git archaeology + re-implementation.

3. **Bring back the sticky audio player bar** from the second-to-last version. Fixed at the bottom of the screen, glass morphism, contains all controls (play/pause, time, scrubber, speed, A-B repeat for listening). All student-requested features stay active: per-word translation popup, per-word audio, add-to-vocab.

---

## 📁 ENVIRONMENT

- **Working dir:** `C:\Users\Dr. Ali\Desktop\fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`
- **Design tokens:** `var(--ds-*)`, RTL, dark cinematic, Tajawal for Arabic UI, Inter/Playfair for English passages

---

## ⚠️ STRICT RULES

1. **All hooks before conditional returns.** No React Error #310.
2. **`profile.id` not `user.id`** for student DB reads.
3. **No `vite build`.**
4. **Mobile-first.** Test the per-word audio mentally on iOS Safari (`audio.play()` returns Promise, may reject without user gesture).
5. **Backward compatible.** Existing `reading_passage_audio` and `curriculum_listening` rows must keep working — no DB changes here.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Git archaeology + discovery
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 — Find the BEFORE versions

```bash
# Find every file related to reading/listening passage rendering across the last 100 commits
git log --oneline -100 -- "src/components/players/" "src/components/curriculum/" "src/pages/student/curriculum/" | head -30
git log --oneline -100 -- "**/ReadingTab*" "**/ListeningTab*" "**/PassagePlayer*" "**/WordDefinition*" | head -30

# Find commits that touched vocab highlighting in passages
git log --all --oneline -100 -S "vocabulary" -- "src/components/" "src/pages/" | head -20
git log --all --oneline -100 -S "WordDefinitionPopup\|InlineTranslation\|VocabWord\|hoverTranslation" | head -20

# Find when sticky audio bar existed
git log --all --oneline -100 -S "sticky" -- "src/components/" | head -20
git log --all --oneline -100 -S "fixed.*bottom\|StickyAudioBar\|FloatingPlayer" | head -20
```

### A.2 — Identify two reference commits

Pick:
- **REF_VOCAB_DESIGN** = the most recent commit BEFORE the audio refactor that has the vocab-word visual treatment intact. (Search for commits modifying ReadingTab/Reading passage component where vocab styling was added or last touched.)
- **REF_STICKY_BAR** = the most recent commit that had the sticky audio bar / floating player. (Search for "sticky" / "fixed bottom" / "floating player" / similar.)

### A.3 — Extract the BEFORE source

```bash
mkdir -p docs/dev-notes/before-snapshots
# Extract the historical reading component
git show <REF_VOCAB_DESIGN>:src/components/... > docs/dev-notes/before-snapshots/ReadingTab-vocab-design.jsx
# Extract the historical sticky bar
git show <REF_STICKY_BAR>:src/components/... > docs/dev-notes/before-snapshots/StickyAudioBar.jsx
# Extract any related CSS
git show <REF_VOCAB_DESIGN>:src/styles/... > docs/dev-notes/before-snapshots/vocab-styles.css 2>/dev/null || true
```

Read each snapshot. Document in `docs/dev-notes/before-snapshots/README.md`:
- How were vocab words tokenized? (regex match against `curriculum_vocabulary` for this unit? A `vocab_words` field on the passage row?)
- What was the visual treatment? (color? underline? background? font weight?)
- How was the translation rendered? (inline `<ruby>`-style? Below the word? Tooltip on hover?)
- What were the sticky bar's exact controls and their positions?

### A.4 — Verify current data sources

```sql
-- Confirm what's available for vocab linking
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('curriculum_reading_passages','curriculum_listening','curriculum_vocabulary')
ORDER BY table_name, ordinal_position;

-- Check if passages already have a vocab list column
SELECT id, unit_id,
  CASE WHEN target_vocabulary IS NOT NULL THEN 'has list' ELSE 'no list' END
FROM curriculum_reading_passages LIMIT 5;

-- Vocab rows for a sample unit
SELECT word_en, meaning_ar FROM curriculum_vocabulary
WHERE unit_id = (SELECT id FROM curriculum_units LIMIT 1) LIMIT 10;
```

If `curriculum_reading_passages.target_vocabulary` (or equivalent) doesn't exist → we'll match by intersection with `curriculum_vocabulary` rows for the unit (Phase C.3).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Fix per-word audio (the actual bug)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### B.1 — Replace `useWordAudio` entirely

`setTimeout` for stopping is unreliable on mobile (background throttling, focus loss). Use `timeupdate` events instead, and preload the audio in a real `<audio>` DOM element shared at the passage level.

**`src/components/players/lib/useWordAudio.js`** — full rewrite:

```javascript
import { useCallback, useEffect, useRef } from 'react';

/**
 * Plays a slice of an audio file [start_ms, end_ms] using a shared <audio> element.
 *
 * Why a ref to a real DOM <audio>:
 * - new Audio(url) creates an unmanaged element. iOS Safari often refuses to seek
 *   reliably until metadata is loaded AND a user gesture has primed playback.
 * - A shared DOM element preloads metadata once and survives unmounts.
 *
 * Why `timeupdate` instead of `setTimeout`:
 * - setTimeout pauses in background tabs / locked screens / iOS low-power mode.
 * - timeupdate fires ~250ms during playback in all browsers and is gesture-safe.
 */
export function useWordAudio(audioUrl) {
  const audioElRef = useRef(null);
  const activeStopAtRef = useRef(null); // ms
  const playTokenRef = useRef(0);

  // Lazy-attach the shared <audio> element to the document the first time we need it
  const getAudio = useCallback(() => {
    if (!audioUrl) return null;
    if (audioElRef.current && audioElRef.current.src === audioUrl) return audioElRef.current;

    // Reuse or create a single hidden audio element scoped by URL
    let el = document.querySelector(`audio[data-fluentia-word-audio="${audioUrl}"]`);
    if (!el) {
      el = document.createElement('audio');
      el.dataset.fluentiaWordAudio = audioUrl;
      el.src = audioUrl;
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      el.style.display = 'none';
      document.body.appendChild(el);
    }
    audioElRef.current = el;
    return el;
  }, [audioUrl]);

  // Time-update listener — stops playback at end_ms
  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    const onTimeUpdate = () => {
      const stopAt = activeStopAtRef.current;
      if (stopAt != null && el.currentTime * 1000 >= stopAt) {
        el.pause();
        activeStopAtRef.current = null;
      }
    };
    el.addEventListener('timeupdate', onTimeUpdate);
    return () => el.removeEventListener('timeupdate', onTimeUpdate);
  }, [audioUrl]);

  const playClipRange = useCallback(async ({ start_ms, end_ms }) => {
    const el = getAudio();
    if (!el || start_ms == null || end_ms == null) return false;

    const myToken = ++playTokenRef.current;

    // Wait for metadata so seeking works deterministically
    if (el.readyState < 1 /* HAVE_METADATA */) {
      await new Promise((resolve) => {
        const ready = () => { el.removeEventListener('loadedmetadata', ready); resolve(); };
        el.addEventListener('loadedmetadata', ready);
        el.load();
        // Safety timeout in case the event never fires
        setTimeout(() => { el.removeEventListener('loadedmetadata', ready); resolve(); }, 1500);
      });
    }

    if (myToken !== playTokenRef.current) return false; // a newer click superseded us

    try {
      el.pause();
      el.currentTime = start_ms / 1000;
      // Tiny padding so we don't cut the final consonant
      activeStopAtRef.current = end_ms + 40;
      const p = el.play();
      if (p && typeof p.then === 'function') {
        await p;  // throws on autoplay block — bubble up
      }
      return true;
    } catch (err) {
      console.warn('[useWordAudio] play blocked or failed:', err.message);
      return false;
    }
  }, [getAudio]);

  const playWord = useCallback(async (wordText, timestamps) => {
    let played = false;
    if (timestamps && typeof timestamps.start_ms === 'number') {
      played = await playClipRange(timestamps);
    }
    if (!played && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(wordText);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  }, [playClipRange]);

  return { playWord };
}
```

### B.2 — Replace `useWordTimestamps` lookup to be robust

The current `findByOccurrence` breaks when the DOM tokenization and the timestamp tokenization disagree on punctuation. New strategy: index by **stable word position** — count only matchable English-letter words, in order, and let both sides use the same counting rule.

**`src/components/players/lib/useWordTimestamps.js`** — full rewrite:

```javascript
import { useMemo } from 'react';

const isMatchable = (s) => /[A-Za-z]/.test(s);
const normalize = (s) => s.toLowerCase().replace(/[^a-z']/g, '');

export function useWordTimestamps(wordTimestampsJson) {
  return useMemo(() => {
    if (!wordTimestampsJson) return { byPosition: [], lookup: () => null };

    const source = wordTimestampsJson.paragraphs
      ? wordTimestampsJson.paragraphs.flatMap(p => p.words || [])
      : (wordTimestampsJson.words || []);

    // Flatten + filter to matchable words, preserving order
    const byPosition = source
      .filter(w => w.word && isMatchable(w.word))
      .map(w => ({
        ...w,
        normalized: normalize(w.word)
      }));

    /**
     * Look up by position in the passage. Position is the 0-indexed count
     * of matchable English-letter words from the start of the passage,
     * counted the SAME WAY in both the DOM and the timestamps.
     */
    const lookup = (passagePosition, fallbackWord) => {
      // Primary: by position
      const exact = byPosition[passagePosition];
      if (exact && exact.normalized === normalize(fallbackWord)) return exact;

      // Drift recovery: search ±3 positions for a normalized match
      const target = normalize(fallbackWord);
      for (let delta = -3; delta <= 3; delta++) {
        const cand = byPosition[passagePosition + delta];
        if (cand && cand.normalized === target) return cand;
      }
      return null;
    };

    return { byPosition, lookup };
  }, [wordTimestampsJson]);
}
```

### B.3 — InteractivePassage must count matchable words the same way

When tokenizing the passage in the DOM, increment the position counter ONLY for tokens that have at least one letter (same rule as `isMatchable`). Pass that position to `lookup`. See Phase C.4 for the updated component.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Restore vocab word styling + inline translation
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### C.1 — Build the unit vocab map

Add a hook that loads vocab for the current unit and exposes a lookup function:

**`src/hooks/useUnitVocab.js`**

```javascript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useUnitVocab(unitId) {
  const q = useQuery({
    queryKey: ['unit-vocab', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      const { data, error } = await supabase
        .from('curriculum_vocabulary')
        .select('id, word_en, meaning_ar, part_of_speech')
        .eq('unit_id', unitId)
        .order('word_en');
      if (error) throw error;
      return data || [];
    },
    enabled: !!unitId,
    staleTime: 5 * 60 * 1000
  });

  // Lemma-friendly lookup: normalize + strip trailing 's', 'ed', 'ing' for casual matching
  const lookup = (rawWord) => {
    if (!q.data) return null;
    const norm = rawWord.toLowerCase().replace(/[^a-z']/g, '');
    if (!norm) return null;
    const exact = q.data.find(v => v.word_en.toLowerCase() === norm);
    if (exact) return exact;
    // Lemma fallback — order of attempts: -s, -es, -ed, -ied→y, -ing, doubled+ing
    const candidates = [
      norm.replace(/s$/, ''),
      norm.replace(/es$/, ''),
      norm.replace(/ed$/, ''),
      norm.replace(/ied$/, 'y'),
      norm.replace(/ing$/, ''),
      norm.replace(/ing$/, 'e'),
      norm.replace(/(.)\1ing$/, '$1') // running → run
    ];
    for (const c of candidates) {
      const m = q.data.find(v => v.word_en.toLowerCase() === c);
      if (m) return m;
    }
    return null;
  };

  return { vocab: q.data || [], lookup, isLoading: q.isLoading };
}
```

### C.2 — Vocab word visual treatment

Use this exact treatment (matches Fluentia design language, distinct without being noisy):

```css
/* src/components/players/passage-vocab.css */

.vocab-word {
  position: relative;
  display: inline-block;
  color: var(--ds-accent-gold);
  font-weight: 600;
  border-bottom: 1.5px dashed var(--ds-accent-gold);
  padding-bottom: 1px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.vocab-word:hover,
.vocab-word.active {
  color: var(--ds-text-primary);
  background-color: color-mix(in srgb, var(--ds-accent-gold) 18%, transparent);
  border-bottom-style: solid;
  border-radius: 4px;
  padding: 1px 3px;
}

.vocab-word-translation {
  display: block;
  font-family: 'Tajawal', sans-serif;
  font-size: 0.72em;
  font-weight: 500;
  color: var(--ds-text-secondary);
  text-align: center;
  line-height: 1.2;
  margin-top: 1px;
  direction: rtl;
  /* Hide on very narrow screens to keep flow readable; show on tap via popover */
}

/* On mobile, the always-visible inline translation can crowd. Keep it but smaller. */
@media (max-width: 480px) {
  .vocab-word-translation {
    font-size: 0.65em;
  }
}

/* Active state when user is interacting with the word */
.vocab-word.active .vocab-word-translation {
  color: var(--ds-text-primary);
  font-weight: 600;
}

/* Non-vocab words remain interactive but with minimal styling */
.regular-word {
  cursor: pointer;
  border-radius: 3px;
  padding: 0 1px;
  transition: background-color 0.15s ease;
}
.regular-word:hover {
  background-color: var(--ds-accent-soft);
}
.regular-word.active {
  background-color: var(--ds-accent);
  color: white;
}
```

### C.3 — Update InteractivePassage to render vocab inline

**`src/components/players/InteractivePassage.jsx`** — full rewrite:

```jsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { WordPopover } from './WordPopover';
import { useWordTimestamps } from './lib/useWordTimestamps';
import { useWordAudio } from './lib/useWordAudio';
import { useUnitVocab } from '@/hooks/useUnitVocab';
import { useTranslateWord } from '@/hooks/useTranslateWord';
import { useSavedWords } from '@/hooks/useSavedWords';
import './passage-vocab.css';

export function InteractivePassage({
  content,
  audioUrl,
  wordTimestampsJson,
  unitId,
  className = ''
}) {
  // ALL hooks first
  const [activeWord, setActiveWord] = useState(null); // { text, rect, position, isVocab, vocabRow }
  const containerRef = useRef(null);
  const { lookup: lookupTimestamp } = useWordTimestamps(wordTimestampsJson);
  const { playWord } = useWordAudio(audioUrl);
  const { lookup: lookupVocab } = useUnitVocab(unitId);
  const { translation, fetchTranslation } = useTranslateWord();
  const { isWordSaved, addWord } = useSavedWords();

  // Close popover on outside click / scroll
  useEffect(() => {
    if (!activeWord) return;
    const close = () => setActiveWord(null);
    const onScroll = () => setActiveWord(null);
    document.addEventListener('mousedown', (e) => {
      if (!containerRef.current?.contains(e.target)) close();
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [activeWord]);

  const handleWordClick = useCallback(async (e, { word, position, vocabRow }) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveWord({
      text: word,
      rect,
      position,
      isVocab: !!vocabRow,
      vocabRow
    });
    // If it's a known vocab word, the translation is already known — skip the API call
    if (!vocabRow) fetchTranslation(word);

    // Play the audio of just this word immediately (in parallel with showing popover)
    const ts = lookupTimestamp(position, word);
    if (ts) playWord(word, ts);
    else playWord(word, null); // falls back to Web Speech API
  }, [lookupTimestamp, playWord, fetchTranslation]);

  // Tokenize content and render
  const renderParagraph = useCallback((para, paraIdx, positionRef) => {
    // positionRef.current is the running matchable-word counter for the entire passage
    const tokens = para.split(/(\s+)/);

    return (
      <p key={paraIdx} className="passage-paragraph leading-loose mb-5" dir="ltr">
        {tokens.map((tok, i) => {
          if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>;
          const cleanWord = tok.replace(/[^a-zA-Z']/g, '');
          if (!cleanWord) return <span key={i}>{tok}</span>;

          const position = positionRef.current++;
          const vocabRow = lookupVocab(cleanWord);
          const isVocab = !!vocabRow;
          const isActive = activeWord?.position === position;

          // Vocab word: gold underline + Arabic translation directly under it
          if (isVocab) {
            // Split surrounding punctuation off the word so it doesn't break the underline
            const leadingPunct = tok.match(/^[^a-zA-Z']*/)?.[0] || '';
            const trailingPunct = tok.match(/[^a-zA-Z']*$/)?.[0] || '';
            const coreWord = tok.slice(leadingPunct.length, tok.length - trailingPunct.length);

            return (
              <span key={i}>
                {leadingPunct}
                <span
                  className={`vocab-word ${isActive ? 'active' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleWordClick(e, { word: cleanWord, position, vocabRow })}
                >
                  {coreWord}
                  <span className="vocab-word-translation">{vocabRow.meaning_ar}</span>
                </span>
                {trailingPunct}
              </span>
            );
          }

          // Regular word: minimal styling, clickable for translation + audio
          return (
            <span
              key={i}
              className={`regular-word ${isActive ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={(e) => handleWordClick(e, { word: cleanWord, position, vocabRow: null })}
            >
              {tok}
            </span>
          );
        })}
      </p>
    );
  }, [activeWord, lookupVocab, handleWordClick]);

  const paragraphs = (content || '').split(/\n\n+/).filter(Boolean);
  const positionRef = useRef({ current: 0 });
  positionRef.current.current = 0; // reset on every render

  return (
    <div ref={containerRef} className={`relative passage-body ${className}`}>
      <div className="text-[17px] font-serif text-[var(--ds-text-primary)]">
        {paragraphs.map((p, idx) => renderParagraph(p, idx, positionRef.current))}
      </div>

      {activeWord && (
        <WordPopover
          word={activeWord.text}
          rect={activeWord.rect}
          translation={
            activeWord.isVocab
              ? { ar: activeWord.vocabRow.meaning_ar, loading: false }
              : translation
          }
          onPlayAudio={() => {
            const ts = lookupTimestamp(activeWord.position, activeWord.text);
            playWord(activeWord.text, ts);
          }}
          onAddToVocab={async () => {
            await addWord({
              word: activeWord.text,
              translation_ar: activeWord.isVocab
                ? activeWord.vocabRow.meaning_ar
                : translation.ar,
              source: 'passage'
            });
          }}
          isInVocab={isWordSaved(activeWord.text)}
          onClose={() => setActiveWord(null)}
        />
      )}
    </div>
  );
}
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Sticky audio player bar
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### D.1 — Build the sticky bar component

**`src/components/players/StickyAudioBar.jsx`**

Compose pieces extracted from the historical snapshot (Phase A.3) but with the design language locked to current tokens. Required controls:

- Large play/pause button (center on mobile, left on desktop)
- Time display: current / total (mm:ss)
- Scrubber bar with buffered-progress indicator
- Speed selector: 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2× (a small chip-style toggle)
- A-B repeat (Listening only — pass a prop `showABRepeat`)
- Skip ±10s buttons
- Minimize chevron (collapses to a thin strip showing only play/pause + scrubber)

```jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(sec) {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function StickyAudioBar({
  audioRef,           // forwarded ref to the <audio> element rendered by the parent
  showABRepeat = false,
  onTimeUpdate        // optional callback for karaoke highlighting
}) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [minimized, setMinimized] = useState(false);
  const [abPoints, setABPoints] = useState({ a: null, b: null });

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      setCurrentTime(el.currentTime);
      onTimeUpdate?.(el.currentTime * 1000);
      // A-B repeat enforcement
      if (abPoints.a != null && abPoints.b != null && el.currentTime >= abPoints.b) {
        el.currentTime = abPoints.a;
      }
    };
    const onMeta = () => setDuration(el.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    if (el.readyState >= 1) setDuration(el.duration || 0);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [audioRef, abPoints, onTimeUpdate]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, [audioRef]);

  const seek = useCallback((sec) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(sec, duration));
  }, [audioRef, duration]);

  const changeSpeed = useCallback((s) => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = s;
    setSpeed(s);
  }, [audioRef]);

  const setA = () => setABPoints(p => ({ ...p, a: currentTime }));
  const setB = () => setABPoints(p => ({ ...p, b: currentTime }));
  const clearAB = () => setABPoints({ a: null, b: null });

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
      dir="ltr"
    >
      <div className="max-w-4xl mx-auto px-4 pb-4 pointer-events-auto">
        <motion.div
          layout
          className="rounded-2xl border border-[var(--ds-border-default)] bg-[var(--ds-surface-elevated)] backdrop-blur-xl shadow-2xl overflow-hidden"
        >
          {/* Top row: scrubber */}
          <div className="px-4 pt-3">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full accent-[var(--ds-accent)] h-1 cursor-pointer"
              aria-label="Seek"
            />
            <div className="flex justify-between text-[11px] text-[var(--ds-text-tertiary)] mt-1 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {!minimized && (
              <motion.div
                key="expanded"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  {/* Skip back */}
                  <button
                    onClick={() => seek(currentTime - 10)}
                    aria-label="Skip back 10s"
                    className="p-2 rounded-lg hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-secondary)]"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 109-9M3 12l4-4M3 12l4 4"/><text x="12" y="16" fontSize="8" fill="currentColor" textAnchor="middle">10</text></svg>
                  </button>

                  {/* Play / Pause */}
                  <button
                    onClick={togglePlay}
                    aria-label={playing ? 'Pause' : 'Play'}
                    className="w-12 h-12 rounded-full bg-[var(--ds-accent)] text-white grid place-items-center hover:scale-105 active:scale-95 transition"
                  >
                    {playing ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
                    )}
                  </button>

                  {/* Skip forward */}
                  <button
                    onClick={() => seek(currentTime + 10)}
                    aria-label="Skip forward 10s"
                    className="p-2 rounded-lg hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-secondary)]"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-9-9M21 12l-4-4M21 12l-4 4"/><text x="12" y="16" fontSize="8" fill="currentColor" textAnchor="middle">10</text></svg>
                  </button>

                  {/* Speed */}
                  <div className="flex items-center gap-1 mr-auto ml-3">
                    {SPEEDS.map(s => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`px-2 py-1 rounded-md text-xs font-mono ${
                          speed === s
                            ? 'bg-[var(--ds-accent)] text-white'
                            : 'text-[var(--ds-text-tertiary)] hover:text-[var(--ds-text-secondary)]'
                        }`}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>

                  {/* A-B Repeat (listening only) */}
                  {showABRepeat && (
                    <div className="flex items-center gap-1 border-l border-[var(--ds-border-default)] pl-3">
                      <button
                        onClick={setA}
                        className={`px-2 py-1 rounded-md text-xs font-bold ${
                          abPoints.a != null ? 'bg-[var(--ds-accent-gold)] text-black' : 'bg-[var(--ds-surface)] text-[var(--ds-text-secondary)]'
                        }`}
                      >A</button>
                      <button
                        onClick={setB}
                        className={`px-2 py-1 rounded-md text-xs font-bold ${
                          abPoints.b != null ? 'bg-[var(--ds-accent-gold)] text-black' : 'bg-[var(--ds-surface)] text-[var(--ds-text-secondary)]'
                        }`}
                      >B</button>
                      {(abPoints.a != null || abPoints.b != null) && (
                        <button onClick={clearAB} className="text-xs text-[var(--ds-text-tertiary)] px-1 hover:text-[var(--ds-text-primary)]">×</button>
                      )}
                    </div>
                  )}

                  {/* Minimize */}
                  <button
                    onClick={() => setMinimized(true)}
                    className="p-2 rounded-lg hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-tertiary)] ml-1"
                    aria-label="Minimize"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>
              </motion.div>
            )}

            {minimized && (
              <motion.button
                key="minimized"
                onClick={() => setMinimized(false)}
                className="w-full text-center text-xs py-1 text-[var(--ds-text-tertiary)] hover:text-[var(--ds-text-primary)]"
              >
                ▲ توسيع
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
```

### D.2 — Mobile padding-bottom

The sticky bar overlaps content at the bottom of the passage. Add bottom padding to the player containers:

```jsx
// In ReadingPassagePlayer and ListeningAudioPlayer wrappers:
<div className="pb-32 md:pb-36">
  {/* ...content... */}
</div>
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE E — Rewire the players
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### E.1 — ReadingPassagePlayer

**`src/components/players/ReadingPassagePlayer.jsx`** — full rewrite:

```jsx
import { useRef } from 'react';
import { InteractivePassage } from './InteractivePassage';
import { StickyAudioBar } from './StickyAudioBar';

export function ReadingPassagePlayer({ passage, audio, unitId }) {
  const audioRef = useRef(null);

  return (
    <div className="space-y-6 pb-36">
      <header dir="rtl">
        <h2 className="text-2xl font-bold text-[var(--ds-text-primary)]">{passage.title_ar || passage.title_en}</h2>
        {passage.title_ar && (
          <p className="text-sm text-[var(--ds-text-tertiary)] mt-1" dir="ltr">{passage.title_en}</p>
        )}
        <p className="text-xs text-[var(--ds-text-tertiary)] mt-2" dir="rtl">
          الكلمات الذهبية: من مفردات الوحدة — ترجمتها ظاهرة تحتها. انقر على أي كلمة لسماع نطقها.
        </p>
      </header>

      <InteractivePassage
        content={passage.content}
        audioUrl={audio?.full_audio_url}
        wordTimestampsJson={audio?.word_timestamps}
        unitId={unitId}
      />

      {audio?.full_audio_url && (
        <>
          <audio ref={audioRef} src={audio.full_audio_url} preload="metadata" />
          <StickyAudioBar audioRef={audioRef} showABRepeat={false} />
        </>
      )}
    </div>
  );
}
```

### E.2 — ListeningAudioPlayer

**`src/components/players/ListeningAudioPlayer.jsx`** — full rewrite:

```jsx
import { useState, useRef } from 'react';
import { InteractivePassage } from './InteractivePassage';
import { StickyAudioBar } from './StickyAudioBar';

export function ListeningAudioPlayer({ item, unitId }) {
  const [transcriptHidden, setTranscriptHidden] = useState(true);
  const audioRef = useRef(null);

  return (
    <div className="space-y-6 pb-36">
      <header dir="rtl" className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--ds-text-primary)]">{item.title_ar || item.title_en}</h2>
          <p className="text-xs text-[var(--ds-text-tertiary)] mt-1">{item.audio_type}</p>
        </div>
        <button
          onClick={() => setTranscriptHidden(v => !v)}
          className="px-3 py-1.5 text-sm rounded-lg bg-[var(--ds-surface)] border border-[var(--ds-border-default)] hover:bg-[var(--ds-surface-hover)]"
        >
          {transcriptHidden ? 'إظهار النص' : 'إخفاء النص'}
        </button>
      </header>

      {!transcriptHidden && (
        <InteractivePassage
          content={item.transcript}
          audioUrl={item.audio_url}
          wordTimestampsJson={item.word_timestamps}
          unitId={unitId}
        />
      )}

      {transcriptHidden && (
        <div className="rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-default)] p-8 text-center text-[var(--ds-text-tertiary)]" dir="rtl">
          <p className="text-sm">استمع للمقطع وحاول الإجابة بدون قراءة النص.</p>
          <p className="text-xs mt-1 opacity-70">يمكنك إظهار النص في أي وقت من الزر أعلاه.</p>
        </div>
      )}

      <audio ref={audioRef} src={item.audio_url} preload="metadata" />
      <StickyAudioBar audioRef={audioRef} showABRepeat={true} />
    </div>
  );
}
```

### E.3 — Pass `unitId` from parent

Find where `ReadingPassagePlayer` and `ListeningAudioPlayer` are mounted (from Prompt 03 wiring). Add `unitId={unit.id}` prop. Without this, vocab highlighting won't work.

```bash
grep -rn "ReadingPassagePlayer\|ListeningAudioPlayer" src/pages/ src/components/ --include="*.jsx"
```

For each match, add the `unitId` prop from the surrounding unit context.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE F — Self-check
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. `grep -rn "useWordAudio" src/components/players/` → confirms the new hook is in place.
2. `grep -n "setTimeout" src/components/players/lib/useWordAudio.js` → expect ONLY the metadata-load safety timeout, NOT the playback-stop timer.
3. `grep -rn "vocab-word" src/components/players/` → confirms vocab styling is applied.
4. `grep -rn "StickyAudioBar" src/components/players/ src/pages/ src/components/curriculum/` → mounted at least once for Reading, once for Listening.
5. ESLint clean: `npx eslint src/components/players/ src/hooks/useUnitVocab.js src/hooks/useTranslateWord.js src/components/players/lib/ --max-warnings=0`.
6. Visually check the rendered HTML of `InteractivePassage` for vocab words: must have inline `<span class="vocab-word-translation">` immediately inside the vocab `<span>`.
7. Sticky bar must have `position: fixed` and `bottom: 0` in the rendered DOM (read the JSX to confirm).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE G — Commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```bash
git add src/components/players/ \
        src/components/players/lib/ \
        src/hooks/useUnitVocab.js \
        docs/dev-notes/before-snapshots/ \
        src/pages/   # parents that pass unitId

git commit -m "fix(passage-ux): restore vocab highlighting + fix per-word audio + sticky audio bar

Per-word audio (was broken):
- useWordAudio rewritten to use timeupdate events instead of setTimeout (mobile-safe)
- Shared DOM <audio> element survives unmounts, preloads metadata
- Awaits loadedmetadata before seeking (fixes iOS Safari seek-before-ready bug)
- Play token cancellation: rapid clicks don't stack
- 40ms tail-padding so final consonant isn't cut

Vocab word styling (restored from REF_VOCAB_DESIGN):
- Match passage words against curriculum_vocabulary for this unit
- Lemma-friendly lookup: handles plurals, -ed, -ing, doubled consonants
- Gold dashed underline + Arabic translation rendered DIRECTLY under each vocab word
- Always visible (no click required) — matches pre-audio-refactor design
- Regular words remain clickable (translation popover on demand, audio on click)

Sticky audio bar (restored from REF_STICKY_BAR):
- Fixed-bottom glass-morphism bar, max-w-4xl centered
- Play/pause, ±10s skip, scrubber with time display
- Speed selector: 0.5×–2× chip toggle
- A-B repeat for listening (showABRepeat prop)
- Minimize chevron to a thin strip
- Both ReadingPassagePlayer and ListeningAudioPlayer mount it

Wiring:
- unitId prop threaded through to InteractivePassage → useUnitVocab
- pb-36 on player containers so content isn't hidden by the bar
- Backward compatible: passages without audio still render text + word click + speech-synthesis fallback"

git push origin main
git fetch origin
git log --oneline -1 HEAD
git log --oneline -1 origin/main
```

---

## ⛔ DO NOT

- ❌ Keep the broken `setTimeout`-based playback stop
- ❌ Remove the always-visible Arabic translation under vocab words
- ❌ Place the audio player inline (must be sticky bottom)
- ❌ Drop the speed selector, A-B repeat, or skip buttons
- ❌ Use `user.id` for vocab queries (use `unitId` directly — not student-scoped)
- ❌ Run vite build

## ✅ FINISH LINE

- Per-word audio works on click — plays just that word and stops cleanly
- Vocab words from the unit have gold dashed underline + Arabic translation visible directly under them
- Sticky bottom audio bar with all controls is present on both Reading and Listening
- All previously-working features (translation popover for regular words, add-to-vocab, hide-text on Listening) still work
- Commit pushed

End of prompt.
