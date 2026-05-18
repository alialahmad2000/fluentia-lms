# 🔧 LISTENING AUDIO + PLAYER REDESIGN + VOCAB COMPLETION RESTORE (2026-05-18)

> **Move + execute (Mac):**
> ```bash
> mv ~/Downloads/LISTENING-VOCAB-FIX-2026-05-18.md \
>    /Users/dr.ali/Projects/fluentia-lms/prompts/agents/
> cd /Users/dr.ali/Projects/fluentia-lms
> claude
> ```
> Then in Claude Code:
> ```
> Read and execute prompts/agents/LISTENING-VOCAB-FIX-2026-05-18.md
> ```

---

## 🎯 MISSION

Three problems, one autonomous run:

### 1. Listening audio doesn't actually play in the browser
The previous overhaul (commit `8159640`) reported "all 72 rows pass `ffmpeg -v error ... -f null -`". That proves the **files on Supabase Storage are decodable in isolation**. It does NOT prove the audio plays for a student loading `app.fluentia.academy`. The new `ListeningPlayer.jsx` is the most likely culprit — a bug in how `audio_url` is consumed, in how the `<audio>` element is initialized, in CORS / MIME / signed-URL handling, or in how `speaker_segments` is parsed.

### 2. The listening player still doesn't look right
The previous run chose **sticky-in-content** positioning. The user wants a **proper sticky bar pinned to the bottom of the viewport** — visible while scrolling, premium, and respecting the sidebar (expanded or collapsed) automatically.

### 3. Vocab completion check stopped rendering (REGRESSION)
Students used to see a green check on vocab cards after completing the vocab exercises tied to those words. After recent refactors, the check no longer appears. The exercise still completes, the XP probably still gets awarded — but the visual feedback on the vocab card is dead.

**DO NOT BUILD A NEW VOCAB UI.** Find what broke and restore the connection. The check rendering already exists somewhere in the codebase or its git history — this is a wire-up regression, not a missing feature.

---

## 📁 ENVIRONMENT

- **Working dir:** `/Users/dr.ali/Projects/fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md` — load and obey
- **DB:** Supabase prod (`nmjexpuycmqcxuxljier`, Frankfurt Pro) via `mcp__supabase__*` tools
- **Storage bucket:** `curriculum-audio`
- **Last known-good listening commit:** `8159640` — start from there, do not revert it
- **Reference unit:** Level 2 / Memory unit (the one with "Conversation About a Psychology Exam and Memory")
- **Design tokens:** `var(--ds-*)`, Velvet Midnight, RTL, Tajawal Arabic

---

## ⚠️ STRICT RULES

1. **Diagnose first.** Do not patch the player blindly. Phase A proves what's actually broken before Phase D rebuilds anything.
2. **No new vocab UI.** The vocab fix is a regression hunt + rewire. If you find yourself writing a new card component, you've taken a wrong turn.
3. **No student data mutation.** No `submissions`, `unit_progress`, `vocab_progress`, `xp_transactions` schema changes. You may READ these tables freely.
4. **Hooks before guards** in any component touched (React #310).
5. **`.select()` after every `.update()` / `.upsert()`** to catch silent RLS.
6. **No `vite build` locally.** ESLint only for self-check.
7. **Decode-test was insufficient.** This time, prove audio works by simulating a browser fetch (`curl -H "Range: bytes=0-1023"` + check `Content-Type`, check CORS headers).
8. **Mac shell.** `mv`, `export`, `/Users/dr.ali/Projects/fluentia-lms/`.
9. **Idempotent.** Re-runnable safely.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Diagnose listening audio (browser-side, not file-side)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 — Read the current ListeningPlayer end-to-end

```bash
cat src/components/players/listening/ListeningPlayer.jsx
cat src/components/players/listening/ListeningSection.jsx
```

Trace the audio loading path:
- How is `audioUrl` passed in?
- Is it set on `<audio src={...} />` directly, or via `audioRef.current.src = ...`?
- Is there a `useEffect` that calls `audioRef.current.load()` after src changes?
- What event listeners are attached? `loadedmetadata`, `canplay`, `error`, `timeupdate`, `ended`?
- Is `error` actually handled with a visible state, or swallowed?
- Is `preload` set? (`metadata` is usually right, `auto` is heavier, `none` will silently not load)
- Is `crossOrigin="anonymous"` set? (Required if you want timestamps + tick marks to work consistently with CORS audio.)

Record any of the following anti-patterns:
- ❌ src set before `<audio>` ref is attached
- ❌ `audioRef.current?.play()` called without awaiting → silent rejection
- ❌ `error` event not handled → audio fails silently, button does nothing
- ❌ `speakerSegments` destructured assuming it's an array when it can be a string (JSONB)
- ❌ `durationMs` from props used as the only source of truth, but `<audio>` `duration` never updates → progress bar broken

### A.2 — Prove the audio URLs work from a browser-equivalent fetch

Pick 3 listening rows from different levels:

```javascript
// Inline node script — paste into a tmp file or run via node -e
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
(async () => {
  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await sb
    .from('curriculum_listening')
    .select('id, level_id, audio_url, audio_path, audio_duration_ms, speaker_segments')
    .not('audio_url', 'is', null)
    .limit(3);
  console.log(JSON.stringify(data, null, 2));
})();
```

For each `audio_url`:

```bash
# 1. HEAD request — does the file exist + what's the Content-Type?
curl -sI "<audio_url>" | head -15

# 2. Range request — Safari/Chrome use Range for seeking; if storage doesn't support it, seeking dies
curl -sI -H "Range: bytes=0-1023" "<audio_url>" | head -15

# 3. CORS preflight — does Supabase Storage return the right headers for app.fluentia.academy?
curl -sI -H "Origin: https://app.fluentia.academy" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS "<audio_url>"

# 4. Direct GET (first 4KB) and verify MP3 magic bytes
curl -sL --range 0-3 "<audio_url>" | xxd | head -1
# MP3 should start with: FF FB / FF F3 / FF F2 / ID3
```

Confirm:
- HTTP 200 (not 401, not 403, not 404, not 500)
- `Content-Type: audio/mpeg` (NOT `application/octet-stream`, NOT `text/html`)
- `Accept-Ranges: bytes` is present
- CORS allows `app.fluentia.academy` (or `*`)
- Magic bytes are MP3

If ANY of these fails, that's the bug. Specifically:
- **403 / 401** → bucket isn't public OR RLS on storage.objects blocks anon
- **`application/octet-stream`** → bucket-level MIME hint missing; iOS Safari refuses to play it
- **No `Accept-Ranges`** → seeking is broken, but playback might still work if you don't seek
- **CORS missing** → `<audio crossOrigin="anonymous">` will refuse to load; remove the attribute OR fix CORS

### A.3 — Verify the `audio_url` format the player actually receives

In the parent that renders `ListeningSection`, log (or trace via grep) what `listening.audio_url` looks like for the broken units. Is it:
- A full `https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/...` URL? ← good
- A bare `curriculum-audio/listening/...` path? ← BAD, player can't fetch it
- A signed URL that expired? ← BAD, time-bound

If it's a bare path, the player is correct to fail. The bug is the missing URL transform — find where `audio_url` is read from the DB and confirm it's a public URL by the time it hits the player.

### A.4 — speaker_segments shape

For the same 3 rows, inspect `speaker_segments`. Confirm:
- Type in DB: JSONB
- Value when read: a parsed JS array of objects with `start_ms` and `end_ms` (numbers, NOT strings)
- The new player reads `start_ms` and `end_ms` directly, NOT `start` / `end` / `startTime` / etc.

If the new player expects `start` but DB stores `start_ms` (or vice versa), the speaker label + tick marks will look like they're "frozen" — exact same symptom as broken audio if you're not looking closely.

### A.5 — Phase A report

Write `docs/audits/listening-vocab-fix/PHASE-A-REPORT.md`:

```markdown
# Phase A — Listening Audio + Vocab Regression Diagnosis

## ListeningPlayer audio path
- audioUrl flow: <prop → ref → src or src directly>
- Error event handled: YES / NO
- preload: <value>
- crossOrigin: <value>
- speaker_segments shape: <fields used>
- Anti-patterns found: <list>

## Audio URL probe (3 samples)
| id | HTTP | Content-Type | Accept-Ranges | CORS OK | Magic bytes | Verdict |
| .. | ..   | ..           | ..            | ..      | ..          | OK / BROKEN |

## URL format check
- DB stores: <full URL / bare path / signed URL>
- Parent passes to player: <same / transformed>
- Verdict: <OK / NEEDS_TRANSFORM>

## Diagnosis
The audio is broken because: <one-line root cause>
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Diagnose vocab completion regression
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### B.1 — Find the vocab card component(s)

```bash
# Where are vocab cards rendered?
grep -rln "vocabulary\|vocab_word\|VocabCard\|VocabularyCard" src/pages/student src/components 2>/dev/null | head -20

# Where is "mastered" / "completed" / "أتقنتها" rendered?
grep -rn "أتقنتها\|mastered\|completed.*vocab\|vocab.*complete" src/ 2>/dev/null | head -30

# Where does the green check appear?
grep -rn "isCompleted\|isMastered\|completedAt\|mastered_at" src/components src/pages/student 2>/dev/null | head -30
```

### B.2 — Trace the data source

Find the DB table or query that drives the "completed" badge:

```sql
-- Inspect candidate tables
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('vocab_progress', 'student_vocab', 'vocab_mastery',
                     'vocab_completed', 'curriculum_vocabulary',
                     'student_vocabulary_progress')
ORDER BY table_name, ordinal_position;
```

Find the **WRITE path** — what code updates the table when a student completes the vocab exercise?

```bash
grep -rn "vocab_progress\|vocab_mastery\|mastered_at\|vocab.*upsert\|vocab.*insert" src/ supabase/ 2>/dev/null | head -40
```

Find the **READ path** — what query feeds the vocab card grid?

```bash
grep -rn "useVocab\|fetchVocab\|vocab.*select\|curriculum_vocabulary.*select" src/ 2>/dev/null | head -30
```

### B.3 — Git archaeology — when did it break?

Look at recent commits touching vocab files:

```bash
# Find commits in the last 60 days touching anything vocab
git log --since="60 days ago" --oneline --name-only -- '*vocab*' '*Vocab*' 2>/dev/null | head -80

# Diff each suspect commit's vocab changes
git log --since="60 days ago" --oneline -- '*vocab*' '*Vocab*' 2>/dev/null | awk '{print $1}' | while read sha; do
  echo "=== $sha ==="
  git log -1 --format="%s%n%b" $sha
  git show --stat $sha -- '*vocab*' '*Vocab*' 2>/dev/null
  echo ""
done | head -200
```

Look for a commit where:
- A query was changed and stopped including the `mastered_at` / `completed_at` / progress field
- A card component was refactored and the completion-check JSX was removed or its condition silently flipped
- A hook (e.g., `useVocabProgress`) was deleted, renamed, or its result no longer consumed
- A join was dropped (e.g., card grid used to join against `vocab_progress` and now doesn't)

### B.4 — Verify the data still gets WRITTEN

Pick a real student account (do NOT impersonate via UI — query directly):

```sql
-- Find a student who completed vocab exercises recently
SELECT student_id, vocab_word_id, mastered_at, xp_earned
FROM <whichever table B.1 identified>
WHERE mastered_at > NOW() - INTERVAL '14 days'
ORDER BY mastered_at DESC
LIMIT 20;
```

If rows exist → the WRITE path works, the bug is in READ/RENDER.
If rows are empty → the WRITE path is also broken; that's a deeper issue and should be flagged separately.

### B.5 — Phase B report

Append to `docs/audits/listening-vocab-fix/PHASE-A-REPORT.md`:

```markdown
## Vocab completion regression

### Card component
- File: <path>
- Completion-check JSX location: <line> (or REMOVED)

### Write path
- Trigger: <where the exercise completion calls supabase>
- Table written: <name>
- Field set: <e.g., mastered_at = now()>
- Status: WORKING / BROKEN

### Read path
- Hook / query: <name + file>
- Returns: <fields>
- Includes completion field: YES / NO
- Status: WORKING / BROKEN

### Git history
- Suspect commit: <sha> — "<subject>" (<date>)
- What changed: <diff summary>

### Diagnosis
The green check disappeared because: <one-line root cause>
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Fix listening audio
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Apply the smallest fix that matches Phase A's diagnosis. Common cases:

### C.1 — If `<audio>` initialization is wrong

Replace the player's audio bootstrap with the canonical pattern:

```jsx
const audioRef = useRef(null);

useEffect(() => {
  const audio = audioRef.current;
  if (!audio || !audioUrl) return;

  // Reset state when URL changes
  setIsPlaying(false);
  setCurrentMs(0);

  // Attach error handler BEFORE setting src so we catch load failures
  const onError = () => {
    console.error('[ListeningPlayer] audio failed to load', audio.error, audioUrl);
    setLoadError('تعذّر تحميل الصوت');
  };
  const onLoadedMetadata = () => {
    setLoadError(null);
    setActualDurationMs(Math.round(audio.duration * 1000));
  };
  const onTimeUpdate = () => setCurrentMs(Math.round(audio.currentTime * 1000));
  const onEnded = () => setIsPlaying(false);

  audio.addEventListener('error', onError);
  audio.addEventListener('loadedmetadata', onLoadedMetadata);
  audio.addEventListener('timeupdate', onTimeUpdate);
  audio.addEventListener('ended', onEnded);

  // Force a fresh load (matters when re-mounting with a new src)
  audio.src = audioUrl;
  audio.load();

  return () => {
    audio.removeEventListener('error', onError);
    audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    audio.removeEventListener('timeupdate', onTimeUpdate);
    audio.removeEventListener('ended', onEnded);
  };
}, [audioUrl]);
```

The `<audio>` element itself:

```jsx
<audio
  ref={audioRef}
  preload="metadata"
  /* DO NOT set crossOrigin unless CORS is verified in Phase A.2 */
  playsInline   /* iOS Safari */
  style={{ display: 'none' }}
/>
```

### C.2 — If the audio URL is a bare path, not a full URL

Add a transform at the data layer (where listening rows are loaded), NOT in the player. The player should always receive a fully-qualified public URL.

```javascript
const toPublicAudioUrl = (audioPathOrUrl) => {
  if (!audioPathOrUrl) return null;
  if (audioPathOrUrl.startsWith('http')) return audioPathOrUrl;
  return supabase.storage.from('curriculum-audio').getPublicUrl(audioPathOrUrl).data.publicUrl;
};
```

Apply at every `select` that returns listening rows — `audio_url: toPublicAudioUrl(row.audio_url)`.

### C.3 — If `speaker_segments` field names mismatch

Normalize at read time, not in the player. Whatever the DB stores, the player receives:

```typescript
type SpeakerSegment = {
  speaker_id: string;
  speaker_name_ar: string;
  start_ms: number;  // always number, always milliseconds
  end_ms: number;
  text: string;
};
```

If DB stores `start` / `end` in seconds, transform at read time.

### C.4 — If CORS / MIME is wrong on the bucket

Fix at the Supabase level via MCP:

```sql
-- Ensure bucket is public
UPDATE storage.buckets SET public = true WHERE id = 'curriculum-audio';
```

For MIME, Supabase Storage infers from extension. If `Content-Type` returns `application/octet-stream`, files were uploaded without an extension or with the wrong one — fix the upload script to set `contentType: 'audio/mpeg'` on the upload call. For already-uploaded files, the easiest fix is to re-upload with the correct content type — but only if Phase A.2 actually shows this is the bug. Don't speculatively re-upload.

### C.5 — Validate the fix

After applying, manually test 3 broken units by:
1. `git diff` shows the change is minimal and targeted
2. `npx eslint src/components/players/listening/ --max-warnings=0` passes
3. Curl the audio URL again — confirm headers and Range support are unchanged or improved

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Rebuild ListeningPlayer as a proper sticky bottom bar
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### D.1 — Sidebar-width discovery

First, find how the app knows the sidebar's current width:

```bash
# Is there a CSS var like --sidebar-width? --layout-sidebar?
grep -rn "\-\-sidebar\|--layout-sidebar\|sidebarWidth\|SIDEBAR_WIDTH" src/ 2>/dev/null | head -20

# Is there a SidebarContext or layout state?
grep -rn "SidebarContext\|useSidebar\|sidebarCollapsed\|sidebar-collapsed" src/ 2>/dev/null | head -20

# How is the main content area positioned relative to the sidebar?
grep -rn "LayoutShell\|MainLayout\|AppShell" src/components src/layouts 2>/dev/null | head -10
cat <whichever the layout file is>
```

There are three possible patterns the codebase might use:

**Pattern α:** Sidebar is `position: fixed` with a known width, main content has matching `padding-right` (RTL) or `margin-right`. → The player can use `right: var(--sidebar-width)` if such a var exists, or `right: 280px` / `right: 64px` depending on the collapsed state read from context.

**Pattern β:** Layout uses CSS grid with named columns. → The player can be rendered INSIDE the content column and use `position: sticky; bottom: 0;` (which is what the current implementation does — only adjustments needed are styling).

**Pattern γ:** Sidebar context broadcasts collapsed state to children. → The player reads context, sets its own offset.

**Pick the pattern the codebase already uses.** Do not invent new architecture.

### D.2 — Build the sticky bottom bar

The player must:
- Be visible at the bottom of the viewport while the student scrolls through transcript + questions
- Respect sidebar collapsed/expanded state without manual width calc IF the layout architecture supports it (pattern α with CSS var, or pattern β with sticky-bottom inside content)
- Look premium — Velvet Midnight glass, gold play button, generous spacing

Recommended structure if pattern β fits (preferred — zero plumbing):

```jsx
// ListeningSection.jsx — wrap the entire content + player together
<div className="relative">
  {/* Scrollable content */}
  <div className="space-y-6 pb-32">
    <ListeningItemHeader listening={listening} />
    <TranscriptToggle ... />
    <ListeningQuestions ... />
  </div>

  {/* Sticky bottom — stays visible while content scrolls */}
  <div className="sticky bottom-4 z-30">
    <ListeningPlayer
      audioUrl={listening.audio_url}
      durationMs={listening.audio_duration_ms}
      speakerSegments={listening.speaker_segments}
      audioType={listening.audio_type}
    />
  </div>
</div>
```

Recommended structure if pattern α (fixed sidebar with CSS var):

```jsx
// ListeningSection.jsx
<>
  <div className="space-y-6 pb-40">...content...</div>

  {/* Fixed bottom bar — RTL, so right: 0 aligns to sidebar edge */}
  <div
    className="fixed bottom-0 left-0 z-30 px-4 pb-4"
    style={{ right: 'var(--sidebar-width, 280px)' }}
  >
    <ListeningPlayer ... />
  </div>
</>
```

Pick exactly ONE pattern. Do NOT ship both.

### D.3 — Visual treatment (premium, not generic)

The player card:

```jsx
<div className="
  rounded-2xl
  border border-white/[0.08]
  bg-[rgba(15,23,42,0.85)]
  backdrop-blur-2xl
  shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]
  px-6 py-4
">
  {/* Top row: speaker label + close/collapse (if collapse is wanted) */}
  <div className="flex items-center justify-between mb-3 text-xs">
    <span className="text-amber-300/80 font-medium">
      {currentSpeakerName ? `يتحدث الآن: ${currentSpeakerName}` : 'الاستماع'}
    </span>
    <span className="text-white/40 tabular-nums">
      {formatTime(currentMs)} / {formatTime(actualDurationMs || durationMs)}
    </span>
  </div>

  {/* Scrubber with speaker-segment tick marks */}
  <div className="relative h-1.5 bg-white/[0.08] rounded-full mb-3">
    {/* Progress fill */}
    <div
      className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-amber-300 rounded-full"
      style={{ width: `${(currentMs / (actualDurationMs || durationMs)) * 100}%` }}
    />
    {/* Segment tick marks */}
    {speakerSegments?.map((seg, i) => (
      <div
        key={i}
        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-amber-300/60"
        style={{ left: `${(seg.start_ms / (actualDurationMs || durationMs)) * 100}%` }}
        title={seg.speaker_name_ar}
      />
    ))}
    {/* Invisible scrubbing input */}
    <input
      type="range" min="0" max={actualDurationMs || durationMs} value={currentMs}
      onChange={(e) => seekTo(Number(e.target.value))}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      aria-label="موضع التشغيل"
    />
  </div>

  {/* Bottom row: controls */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <button onClick={() => seekBy(-5000)} className="..." aria-label="رجوع 5 ثوان">⟲ 5</button>
      <button onClick={togglePlay} className="
        w-12 h-12 rounded-full
        bg-gradient-to-br from-amber-300 to-amber-500
        text-slate-900 font-bold
        shadow-lg shadow-amber-500/30
        hover:scale-105 active:scale-95
        transition
      " aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}>
        {isPlaying ? '❚❚' : '▶'}
      </button>
      <button onClick={() => seekBy(5000)} className="..." aria-label="تقدم 5 ثوان">5 ⟳</button>
    </div>

    {/* Speed segmented control */}
    <div className="flex items-center gap-1 bg-white/[0.04] rounded-full p-1">
      {[0.5, 0.75, 1, 1.25, 1.5].map(s => (
        <button key={s} onClick={() => setSpeed(s)} className={`
          px-2.5 py-1 rounded-full text-xs font-medium transition
          ${speed === s
            ? 'bg-amber-300/90 text-slate-900'
            : 'text-white/60 hover:text-white/90'}
        `}>{s}×</button>
      ))}
    </div>
  </div>

  {loadError && (
    <div className="mt-3 text-xs text-red-300/90 text-right">
      {loadError} — <button onClick={retry} className="underline">إعادة المحاولة</button>
    </div>
  )}
</div>
```

Tokens preferred over hex codes — replace `amber-300/500` and slate values with `var(--ds-gold)` / `var(--ds-bg-elevated)` / etc. if such tokens exist in the project (Phase A discovery should have surfaced them).

### D.4 — Sanity for iOS Safari

- `<audio playsInline />` — without this, iOS forces fullscreen on play
- `audioRef.current.play()` must be called from inside the click handler (not in a `useEffect`, not after an `await` boundary) or Safari blocks it
- `crossOrigin` ONLY if CORS is verified — otherwise leave it unset

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE E — Restore vocab completion check
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### E.1 — Apply the minimum fix Phase B identified

Based on which path is broken:

**If the READ query stopped including the completion field:**
Add the field back to the query / hook. Confirm the field appears in the result. Do NOT change the table schema.

```javascript
// Example shape — adjust to the actual hook
const { data, error } = await supabase
  .from('curriculum_vocabulary')
  .select(`
    id, word, translation_ar, audio_url,
    progress:vocab_progress(mastered_at, xp_earned)
  `)
  .eq('unit_id', unitId);
```

Then in the card component:

```jsx
const isMastered = Boolean(word.progress?.mastered_at);

return (
  <Card>
    {isMastered && (
      <div className="absolute top-3 right-3 text-emerald-400">✓</div>
    )}
    ...
  </Card>
);
```

**If the JSX check was removed:**
Restore it from the git history. Find the last commit where it existed and lift the relevant block back into the current file. Do NOT cargo-cult the entire old file — bring back only the conditional render.

```bash
# Find the commit that removed the check
git log -p -- <vocab card file> | grep -B 2 -A 5 "mastered_at\|isMastered\|أتقنت"
# Restore the relevant lines
```

**If the WRITE path is broken too (Phase B.4 found no recent writes):**
This is out of scope for THIS prompt. Note it in the final report as "follow-up needed" — do not try to fix both in the same run.

### E.2 — Avoid the impersonation footgun

If the card uses any user identity to scope `vocab_progress` reads, it MUST use `profile?.id`, not `user?.id`. Verify with grep:

```bash
grep -rn "user\.id\|user\?\.id" src/components/Vocabulary 2>/dev/null
grep -rn "user\.id\|user\?\.id" src/pages/student/curriculum 2>/dev/null
```

Any `user.id` in code that reads vocab progress must become `profile?.id`.

### E.3 — Visual treatment

The green check should look like the old one. Do not redesign it. Grep for the old class names in git history and reuse them. If the old style was a small badge at the top-right of the card, keep that exact placement.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE F — Self-check
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every assertion must pass:

1. `git diff --stat origin/main..HEAD` — only listening player + listening section + vocab card / vocab query files changed. NO student-data tables touched. NO migrations applied.
2. `npx eslint src/components/players/listening/ src/components/Vocabulary/ src/pages/student/curriculum/ --max-warnings=0`
3. Hook-order check on every modified component (all `use*` above any conditional return)
4. SQL: confirm a sample student's `vocab_progress` rows still exist and Phase B.4 numbers didn't drop
5. Curl-test one previously-broken audio URL — confirm headers are still good (no regression from any storage policy change)
6. Re-read `ListeningPlayer.jsx` from top to bottom — confirm:
   - No `crossOrigin` unless CORS was verified
   - `playsInline` present
   - `play()` is called from an event handler, not inside a useEffect
   - Error state is visible to the user (not just `console.error`)
7. Re-read the vocab card — confirm the `isMastered` (or equivalent) conditional is present and reads from the right field
8. `git status` clean — no stray files

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE G — Commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write `docs/audits/listening-vocab-fix/FINAL-REPORT.md`:

```markdown
# Listening Audio + Vocab Completion — Final Report

## Listening audio
- Root cause: <one-line>
- Fix: <one-line>
- Files changed: <list>
- Verification: <list — what was curl-tested, what was eslint-tested>

## Listening player redesign
- Pattern chosen: <α / β / γ>
- File: src/components/players/listening/ListeningPlayer.jsx
- Visible behavior: sticky bottom bar, premium glass, segment ticks, "يتحدث الآن", 5s skip, 0.5-1.5× speed

## Vocab completion check
- Root cause: <one-line>
- Fix: <one-line — query field added back / JSX restored / hook rewired>
- Files changed: <list>

## Follow-ups (out of scope)
- <anything Phase B.4 flagged as broken WRITE>
- <anything else noticed>
```

Commit:

```bash
git add src/components/players/listening/ \
        src/components/Vocabulary/ \
        src/pages/student/curriculum/ \
        src/hooks/ \
        docs/audits/listening-vocab-fix/

git commit -m "fix(listening+vocab): restore audio playback, sticky bottom player, vocab completion check

LISTENING AUDIO:
- Root cause: <from FINAL-REPORT>
- Fixed <ListeningPlayer.jsx initialization | audio_url transform | speaker_segments shape>
- Curl-verified audio URLs return audio/mpeg + Accept-Ranges + correct CORS

LISTENING PLAYER:
- Rebuilt as sticky bottom bar respecting sidebar via <pattern α/β/γ>
- Premium Velvet glass card, gold play button, segment tick marks, 'يتحدث الآن' label, 5s skip, speed 0.5-1.5×
- iOS Safari sanity: playsInline + play() inside click handler + no speculative crossOrigin

VOCAB COMPLETION:
- Root cause: <from FINAL-REPORT>
- Restored the green check on cards by <action>
- No new components, no schema changes, no migrations
- profile?.id used (impersonation-safe)

NOT TOUCHED:
- No student data writes
- No DB migrations
- No reading flow
- No IELTS pages"

git push origin main
git fetch origin
git log --oneline -3 HEAD
git log --oneline -3 origin/main
```

Confirm HEAD == origin/main.

---

## ⛔ DO NOT

- ❌ Build a new vocab UI — the regression is a wire-up, not a missing feature
- ❌ Touch reading flow / IELTS / submissions / unit_progress / xp_transactions
- ❌ Apply any DB migration (schema changes are out of scope)
- ❌ Re-run audio regeneration — Phase C audit already passed
- ❌ Run `vite build` locally
- ❌ Speculatively set `crossOrigin` on the `<audio>` element
- ❌ Ship both sidebar-awareness patterns — pick exactly one

## ✅ FINISH LINE

- Audio plays end-to-end on a sample broken unit (Memory at L2), curl-verified URL is healthy
- ListeningPlayer is a sticky bottom bar, looks premium, respects sidebar
- Green completion check renders on vocab cards a student has completed
- `docs/audits/listening-vocab-fix/FINAL-REPORT.md` exists
- One commit pushed to `origin/main`

End of prompt.
