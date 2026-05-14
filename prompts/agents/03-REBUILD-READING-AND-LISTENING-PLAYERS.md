# 03-REBUILD-READING-AND-LISTENING-PLAYERS — UI split + word-level interaction

> **Move + execute:**
> ```powershell
> Move-Item -Force "$env:USERPROFILE\Downloads\03-REBUILD-READING-AND-LISTENING-PLAYERS.md" "C:\Users\Dr. Ali\Desktop\fluentia-lms\prompts\agents\03-REBUILD-READING-AND-LISTENING-PLAYERS.md"
> ```
> ```
> Read and execute prompts/agents/03-REBUILD-READING-AND-LISTENING-PLAYERS.md
> ```

> **Prerequisite:** Prompts 01 + 02 done. Reading + listening audio is healthy.

---

## 🎯 MISSION

Three coupled UI fixes:

1. **Split Reading and Listening** into two distinct player components. Reading must NEVER have a hide-text toggle — the passage IS the content to read. Listening keeps hide-text.
2. **Single-word translation** — student taps any word in the passage → small popup with translation + "add to vocab" button, **without** triggering audio playback of the whole passage.
3. **Single-word pronunciation** — student taps the speaker icon in the popup → plays JUST that word's audio (using `word_timestamps` to seek and stop). Never plays the whole clip.

---

## 📁 ENVIRONMENT

- **Working dir:** `C:\Users\Dr. Ali\Desktop\fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`
- **Design system:** `src/design-system/` — use existing `GlassPanel`, `PremiumCard`, token system (`var(--ds-*)` for new code)
- **Theme:** RTL Arabic-first, dark cinematic, Tajawal for UI, Inter/Playfair for English passages

---

## ⚠️ STRICT RULES

1. **All hooks declared BEFORE any conditional return.** No React Error #310.
2. **Use `profile.id` not `user.id`** for any DB reads tied to the current student (impersonation safety).
3. **No `vite build` locally.**
4. **Use the existing translation service** for single-word translation (check for `translate-word` edge function or `useTranslate` hook before adding anything new). If none exists → use Claude API edge function `translate-word` (cached, never inline Claude SDK).
5. **Per-word audio playback uses existing `word_timestamps`** — never call ElevenLabs at runtime. If a passage has no `word_timestamps` → fall back to Web Speech API `speechSynthesis.speak()` with an English voice.
6. **No new audio generation at runtime.** Word audio is sourced from the existing full-clip's timestamps only.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Discovery (15 min)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 — Locate current player code

```bash
grep -rln "ReadingTab\|ListeningTab\|reading_passage_audio\|curriculum_listening" src/ --include="*.jsx"
grep -rln "audio.*player\|AudioPlayer" src/components/ src/pages/ --include="*.jsx"
grep -rn "transcriptHidden\|hide.*text\|إخفاء.*النص" src/ --include="*.jsx"
```

Read every match. Identify:
- The component(s) currently used for Reading tab content
- The component(s) currently used for Listening tab content
- Any shared player component
- Any existing word-click / translation popup code (even partial)

### A.2 — Existing translation infra

```bash
ls supabase/functions/ | grep -i translat
grep -rn "useTranslate\|translateWord\|fetch.*translate" src/ --include="*.jsx" --include="*.ts" --include="*.js"
```

If `translate-word` edge function exists → use it. If not → create it (Phase B.6).

### A.3 — Existing vocabulary "add" infra

```bash
grep -rn "addToVocabulary\|saved_words\|user_vocabulary" src/ --include="*.jsx" | head -20
```

Identify the canonical "add word to my vocabulary" mutation. The new popup will call it.

### A.4 — Save discovery summary to `docs/dev-notes/player-refactor-discovery.md`

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Build new player components
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### B.1 — Shared utilities first

**`src/components/players/lib/useWordTimestamps.js`**

```javascript
// Hook to extract word-level timestamps from a passage's word_timestamps JSONB.
// Returns: { findWord(wordText, occurrenceIndex), getWordById(idx) }
// Tolerates punctuation: normalizes "hello," → "hello" for matching.

import { useMemo } from 'react';

function normalize(w) {
  return w.toLowerCase().replace(/[^a-z']/g, '');
}

export function useWordTimestamps(wordTimestampsJson) {
  return useMemo(() => {
    if (!wordTimestampsJson) return { words: [], findByOccurrence: () => null };

    // Flatten paragraphs[].words[] into a single ordered array
    const words = [];
    const source = wordTimestampsJson.paragraphs || [{ words: wordTimestampsJson.words || [] }];
    for (const p of source) {
      for (const w of (p.words || [])) {
        words.push({ ...w, normalized: normalize(w.word) });
      }
    }

    return {
      words,
      // Find a word by its 0-indexed occurrence in the passage (matches DOM order)
      findByOccurrence: (wordText, occurrenceIndex) => {
        const target = normalize(wordText);
        let seen = 0;
        for (const w of words) {
          if (w.normalized === target) {
            if (seen === occurrenceIndex) return w;
            seen++;
          }
        }
        return null;
      }
    };
  }, [wordTimestampsJson]);
}
```

**`src/components/players/lib/useWordAudio.js`**

```javascript
// Plays a single word from an existing audio URL using start_ms / end_ms.
// Falls back to Web Speech API if no timestamps.

import { useCallback, useRef } from 'react';

export function useWordAudio(audioUrl) {
  const audioRef = useRef(null);
  const stopTimerRef = useRef(null);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio(audioUrl);
      a.preload = 'auto';
      audioRef.current = a;
    }
    return audioRef.current;
  }, [audioUrl]);

  const playWordFromClip = useCallback(({ start_ms, end_ms }) => {
    if (!audioUrl || start_ms == null || end_ms == null) return false;
    const a = ensureAudio();
    a.pause();
    clearTimeout(stopTimerRef.current);
    a.currentTime = start_ms / 1000;
    a.play().catch(() => {});
    const dur = Math.max(120, end_ms - start_ms + 60); // pad 60ms for natural fall-off
    stopTimerRef.current = setTimeout(() => { a.pause(); }, dur);
    return true;
  }, [audioUrl, ensureAudio]);

  const playWordViaSpeechSynthesis = useCallback((wordText) => {
    if (!('speechSynthesis' in window)) return false;
    const u = new SpeechSynthesisUtterance(wordText);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  }, []);

  const playWord = useCallback((wordText, timestamps) => {
    if (timestamps) {
      const played = playWordFromClip(timestamps);
      if (played) return;
    }
    playWordViaSpeechSynthesis(wordText);
  }, [playWordFromClip, playWordViaSpeechSynthesis]);

  return { playWord };
}
```

### B.2 — WordPopover component

**`src/components/players/WordPopover.jsx`**

Shown when student taps a word. Smart positioning — never covers the tapped word.

```jsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function WordPopover({
  word,         // the tapped word text
  rect,         // DOMRect of the tapped span
  translation,  // { ar: '...', loading: boolean }
  onPlayAudio,
  onAddToVocab,
  onClose,
  isInVocab
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'bottom' });

  useEffect(() => {
    if (!rect) return;
    const popoverHeight = 140;
    const popoverWidth = 280;
    const gap = 12;
    const margin = 16;

    // Default: place above the word
    let top = rect.top - popoverHeight - gap + window.scrollY;
    let placement = 'top';

    // If not enough room above → place below
    if (top < window.scrollY + margin) {
      top = rect.bottom + gap + window.scrollY;
      placement = 'bottom';
    }

    // Horizontal: center on word, clamp to viewport
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - popoverWidth - margin));

    setPos({ top, left, placement });
  }, [rect]);

  if (!rect) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: pos.placement === 'top' ? 8 : -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'absolute',
          top: pos.top,
          left: pos.left,
          width: 280,
          zIndex: 60
        }}
        className="rounded-2xl bg-[var(--ds-surface-elevated)] border border-[var(--ds-border-default)] shadow-2xl backdrop-blur-md"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 space-y-3">
          {/* Word + audio button */}
          <div className="flex items-center justify-between gap-3" dir="ltr">
            <span className="text-lg font-semibold text-[var(--ds-text-primary)]">{word}</span>
            <button
              onClick={onPlayAudio}
              aria-label="استمع للنطق"
              className="p-2 rounded-lg bg-[var(--ds-accent-soft)] hover:bg-[var(--ds-accent-hover)] transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/></svg>
            </button>
          </div>

          {/* Translation */}
          <div className="text-sm text-[var(--ds-text-secondary)] min-h-[1.5rem]">
            {translation.loading ? (
              <span className="opacity-60">جاري الترجمة...</span>
            ) : translation.ar ? (
              <span>{translation.ar}</span>
            ) : (
              <span className="opacity-60">لم يتم العثور على ترجمة</span>
            )}
          </div>

          {/* Add to vocab */}
          <button
            onClick={onAddToVocab}
            disabled={isInVocab}
            className={`w-full py-2 rounded-lg text-sm font-medium transition ${
              isInVocab
                ? 'bg-[var(--ds-success-soft)] text-[var(--ds-success)] cursor-default'
                : 'bg-[var(--ds-accent)] text-white hover:bg-[var(--ds-accent-hover)]'
            }`}
          >
            {isInVocab ? '✓ في مفرداتك' : '+ أضف لمفرداتي'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

### B.3 — Interactive passage renderer

**`src/components/players/InteractivePassage.jsx`**

Renders a passage where every word is a tappable span. Reused by both Reading and Listening players.

```jsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { WordPopover } from './WordPopover';
import { useWordTimestamps } from './lib/useWordTimestamps';
import { useWordAudio } from './lib/useWordAudio';
import { useTranslateWord } from '@/hooks/useTranslateWord';
import { useSavedWords } from '@/hooks/useSavedWords';

export function InteractivePassage({
  content,
  audioUrl,
  wordTimestampsJson,
  currentTimeMs,   // for karaoke highlighting (optional)
  className = ''
}) {
  // ALL hooks first — never below conditional returns
  const [activeWord, setActiveWord] = useState(null); // { text, rect, occurrenceIndex }
  const containerRef = useRef(null);
  const { findByOccurrence } = useWordTimestamps(wordTimestampsJson);
  const { playWord } = useWordAudio(audioUrl);
  const { translation, fetchTranslation } = useTranslateWord();
  const { isWordSaved, addWord } = useSavedWords();

  // Close popover on outside click
  useEffect(() => {
    if (!activeWord) return;
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setActiveWord(null);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [activeWord]);

  // Build tappable spans
  const renderParagraph = useCallback((para, paraIdx) => {
    // Split by whitespace BUT preserve the whitespace so spacing renders correctly
    const tokens = para.split(/(\s+)/);
    let wordCounter = 0;

    return (
      <p key={paraIdx} className="leading-loose text-[var(--ds-text-primary)] mb-4" dir="ltr">
        {tokens.map((tok, i) => {
          if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>;
          const cleanWord = tok.replace(/[^a-zA-Z']/g, '');
          if (!cleanWord) return <span key={i}>{tok}</span>;

          const occurrenceIndex = wordCounter++;
          const isActive = activeWord?.text === cleanWord && activeWord?.occurrenceIndex === occurrenceIndex;

          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveWord({ text: cleanWord, rect, occurrenceIndex, originalToken: tok });
                fetchTranslation(cleanWord);
              }}
              className={`cursor-pointer rounded px-0.5 transition ${
                isActive
                  ? 'bg-[var(--ds-accent)] text-white'
                  : 'hover:bg-[var(--ds-accent-soft)] hover:text-[var(--ds-text-primary)]'
              }`}
            >
              {tok}
            </span>
          );
        })}
      </p>
    );
  }, [activeWord, fetchTranslation]);

  const paragraphs = (content || '').split(/\n\n+/).filter(Boolean);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="passage-text font-serif text-lg">
        {paragraphs.map(renderParagraph)}
      </div>

      {activeWord && (
        <WordPopover
          word={activeWord.text}
          rect={activeWord.rect}
          translation={translation}
          onPlayAudio={() => {
            const ts = findByOccurrence(activeWord.text, activeWord.occurrenceIndex);
            playWord(activeWord.text, ts);
          }}
          onAddToVocab={async () => {
            await addWord({
              word: activeWord.text,
              translation_ar: translation.ar,
              source: 'reading_passage'
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

### B.4 — ReadingPassagePlayer (NEW — replaces shared player for Reading tab)

**`src/components/players/ReadingPassagePlayer.jsx`**

```jsx
import { useState, useRef } from 'react';
import { InteractivePassage } from './InteractivePassage';

export function ReadingPassagePlayer({ passage, audio }) {
  // passage: { id, title_en, title_ar, content }
  // audio: { full_audio_url, word_timestamps, full_duration_ms } | null

  const [playing, setPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const audioRef = useRef(null);

  // Reading player has NO hide-text toggle. The passage is always visible.

  return (
    <div className="space-y-6">
      <header dir="rtl">
        <h2 className="text-2xl font-bold text-[var(--ds-text-primary)]">{passage.title_ar}</h2>
        <p className="text-sm text-[var(--ds-text-secondary)] mt-1" dir="ltr">{passage.title_en}</p>
      </header>

      {audio?.full_audio_url && (
        <div className="rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-default)] p-4">
          <audio
            ref={audioRef}
            src={audio.full_audio_url}
            onTimeUpdate={(e) => setCurrentTimeMs(e.currentTarget.currentTime * 1000)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            controls
            className="w-full"
            dir="ltr"
          />
          <p className="text-xs text-[var(--ds-text-tertiary)] mt-2 text-right" dir="rtl">
            انقر على أي كلمة لرؤية الترجمة وسماع نطقها
          </p>
        </div>
      )}

      <InteractivePassage
        content={passage.content}
        audioUrl={audio?.full_audio_url}
        wordTimestampsJson={audio?.word_timestamps}
        currentTimeMs={currentTimeMs}
      />
    </div>
  );
}
```

### B.5 — ListeningAudioPlayer (keeps hide-text, adds word interaction)

**`src/components/players/ListeningAudioPlayer.jsx`**

```jsx
import { useState, useRef } from 'react';
import { InteractivePassage } from './InteractivePassage';

export function ListeningAudioPlayer({ item }) {
  // item: { id, title_en, transcript, audio_url, word_timestamps, audio_type }

  const [transcriptHidden, setTranscriptHidden] = useState(true);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const audioRef = useRef(null);

  return (
    <div className="space-y-6">
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

      <div className="rounded-2xl bg-[var(--ds-surface)] border border-[var(--ds-border-default)] p-4">
        <audio
          ref={audioRef}
          src={item.audio_url}
          onTimeUpdate={(e) => setCurrentTimeMs(e.currentTarget.currentTime * 1000)}
          controls
          className="w-full"
          dir="ltr"
        />
      </div>

      {!transcriptHidden && (
        <InteractivePassage
          content={item.transcript}
          audioUrl={item.audio_url}
          wordTimestampsJson={item.word_timestamps}
          currentTimeMs={currentTimeMs}
        />
      )}
    </div>
  );
}
```

### B.6 — Edge function: translate-word (only if not already present)

**`supabase/functions/translate-word/index.ts`**

Skip if already exists. Otherwise:
- Receives `{ word: string, context?: string }`.
- Caches result in `word_translations` table (create with migration if needed: `word`, `translation_ar`, `pos`, `created_at`, UNIQUE on `word`).
- On cache miss: calls Claude Sonnet 4 with a strict prompt returning only `{ "translation_ar": "...", "pos": "..." }`.
- Set `temperature: 0.1`.
- Single-word translation = a Claude API runtime call — minimal, cached forever.

### B.7 — Hooks: useTranslateWord + useSavedWords

**`src/hooks/useTranslateWord.js`**

```javascript
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const CACHE = new Map();

export function useTranslateWord() {
  const [translation, setTranslation] = useState({ ar: null, loading: false });
  const lastWordRef = useRef(null);

  const fetchTranslation = useCallback(async (word) => {
    const key = word.toLowerCase();
    lastWordRef.current = key;

    if (CACHE.has(key)) {
      setTranslation({ ar: CACHE.get(key), loading: false });
      return;
    }
    setTranslation({ ar: null, loading: true });
    try {
      const { data, error } = await supabase.functions.invoke('translate-word', {
        body: { word }
      });
      if (lastWordRef.current !== key) return; // user moved on
      if (error) throw error;
      const ar = data?.translation_ar || null;
      if (ar) CACHE.set(key, ar);
      setTranslation({ ar, loading: false });
    } catch (e) {
      if (lastWordRef.current !== key) return;
      setTranslation({ ar: null, loading: false });
    }
  }, []);

  return { translation, fetchTranslation };
}
```

**`src/hooks/useSavedWords.js`** — check if already exists; only build if not. Standard CRUD against `saved_words` table.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Wire into Reading + Listening tabs
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### C.1 — Reading tab

In the file you found in Phase A.1 that handles the Reading tab:
- Remove any shared player import that includes hide-text.
- Import `ReadingPassagePlayer`.
- Pass `passage` from `curriculum_reading_passages` and `audio` from `reading_passage_audio`.
- Delete any `transcriptHidden` state or toggle in this file.

### C.2 — Listening tab

In the file that handles the Listening tab:
- Import `ListeningAudioPlayer`.
- Pass `item` from `curriculum_listening` (must include `transcript`, `audio_url`, `word_timestamps`, `audio_type`).
- The hide-text toggle now lives inside `ListeningAudioPlayer` — remove any duplicate at the parent level.

### C.3 — Edge cases

- **Reading passage with no audio yet:** `ReadingPassagePlayer` renders text + word interaction (using Web Speech API fallback for pronunciation). No audio player shown.
- **Listening item with no transcript shown (transcriptHidden=true):** word interaction is unavailable until student reveals text — correct behavior.
- **Mobile:** word spans are tappable (44px min touch target via line-height + padding). Test on simulated narrow viewport.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Self-check (no human gate)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run these checks in the codebase (not in a running app):

1. `grep -rn "ReadingTab.*transcriptHidden\|Reading.*hide.*text" src/` → must return ZERO matches (Reading has no hide-text toggle).
2. `grep -rn "WordPopover\|InteractivePassage" src/components/players/` → must show both components.
3. `grep -rn "useWordTimestamps\|useWordAudio" src/components/players/lib/` → must show both hooks.
4. ESLint clean on new files: `npx eslint src/components/players/ --max-warnings=0`.
5. Read `ReadingPassagePlayer.jsx` and verify there is NO `transcriptHidden` state and NO hide-text button.
6. Read `ListeningAudioPlayer.jsx` and verify hide-text IS present.
7. Read `InteractivePassage.jsx` and verify all hooks are above any return statement.

If any check fails → fix before commit.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE E — Commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```bash
git add src/components/players/ \
        src/hooks/useTranslateWord.js \
        src/hooks/useSavedWords.js \
        supabase/functions/translate-word/ \
        supabase/migrations/*_word_translations.sql \
        docs/dev-notes/player-refactor-discovery.md \
        src/pages/   # only the parent files that wire the new players

git commit -m "feat(players): split reading + listening players, add word-level interaction

Reading tab:
- ReadingPassagePlayer (new) replaces shared player
- NO hide-text toggle (passage IS the content)
- Word tap → translation popover + per-word audio playback
- Per-word audio uses word_timestamps; falls back to Web Speech API

Listening tab:
- ListeningAudioPlayer (new) keeps hide-text toggle (correct behavior)
- Adds same word-level interaction when transcript is visible

Shared:
- InteractivePassage: tokenizes passage, renders tappable spans
- WordPopover: smart positioning (above/below word, viewport-clamped)
- useWordTimestamps / useWordAudio hooks
- useTranslateWord hook + translate-word edge function (cached)
- word_translations table for permanent cache (per-word lookups dedupe across users)

Fixes student complaints:
- 'انقر على كلمة يشغل المقطع كامل' → single-word audio only
- 'ما يمديني أشوف ترجمة الكلمة' → translation popover
- 'قسم القراءة يخفي النص' → hide-text removed from Reading"

git push origin main
git fetch origin
git log --oneline -1 HEAD
git log --oneline -1 origin/main
```

---

## ⛔ DO NOT

- ❌ Generate ElevenLabs audio at runtime (use existing `word_timestamps` or Web Speech API)
- ❌ Add hide-text to ReadingPassagePlayer
- ❌ Remove hide-text from ListeningAudioPlayer
- ❌ Place any hook below a conditional return
- ❌ Use `user.id` for student DB reads (use `profile.id`)
- ❌ Run `vite build` locally
- ❌ Touch curriculum content rows

## ✅ FINISH LINE

Two distinct players. Reading: no hide-text, word-tap works. Listening: hide-text preserved, word-tap works when transcript visible. Commit pushed.

End of prompt.
