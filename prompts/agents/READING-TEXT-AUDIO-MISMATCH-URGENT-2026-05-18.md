# 🚨 URGENT — READING SECTION TEXT/AUDIO ARTICLE MISMATCH (2026-05-18)

> **THIS IS THE TOP PRIORITY. Students are actively frustrated.**
>
> **Move + execute (Mac):**
> ```bash
> mv ~/Downloads/READING-TEXT-AUDIO-MISMATCH-URGENT-2026-05-18.md \
>    /Users/dr.ali/Projects/fluentia-lms/prompts/agents/
> cd /Users/dr.ali/Projects/fluentia-lms
> git pull --rebase origin main
> claude
> ```
> Then in Claude Code:
> ```
> Read and execute prompts/agents/READING-TEXT-AUDIO-MISMATCH-URGENT-2026-05-18.md
> ```

---

## 🎯 MISSION (read every word)

**The bug:** In the reading section of the curriculum, students see Article A on screen but pressing play makes the audio player read out **a completely different article (Article B)**. The karaoke word-highlighting tries to follow the audio, so it bounces around random words in Article A trying to match Article B's content. Total disorientation. Students lose trust in the system.

**This is NOT personalization.** The personalization revert (`ecbd0d1`) shipped successfully — but its agent concluded personalization was an isolated drawer, not in-flow substitution. The bug persists, which means the cause is somewhere else:

1. The reading section has multiple articles per unit. When a student picks Article X (or navigates between articles), the text component updates from `reading.id = X`, but the audio player keeps the `audio_url` from a previous article — **state synchronization bug**.
2. OR: text and audio are fetched independently with different filters (different `order_by`, different `first` vs `selected`, different join), so they resolve to different rows even at first render — **independent fetch bug**.
3. OR: an article-selection state in a parent is propagated to the text component but not to the audio player — **prop drilling bug**.
4. OR: the audio player uses its own internal "current article" state that initializes from `articles[0]` and never updates — **stale initialization bug**.

Phase A determines which. Phase B fixes it. Phase C verifies. Phase D ships.

---

## 📁 ENVIRONMENT

- **Working dir:** `/Users/dr.ali/Projects/fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md` — load and obey
- **DB:** Supabase prod via `mcp__supabase__*` tools
- **Branch:** `main`. Pull-rebase before starting.
- **Coordination:** If LISTENING-COMPLETE-COVERAGE or SECTION-COMPLETION-RESTORE are still running in other tabs, this prompt's scope is the **reading** section — different files. Safe to run in parallel. Just pull-rebase once both push before this commits.

---

## ⚠️ STRICT RULES

1. **Single source of truth.** After this fix, exactly ONE state variable holds "currently selected reading article id" for any given moment in a student's session. Text, audio, and karaoke all derive their data from THAT variable's resolved row. No independent fetches with their own logic.
2. **No student data writes.**
3. **No DB schema changes.**
4. **Hooks before guards.**
5. **`.select()` after every `.update()` / `.upsert()`** (will rarely apply — read-path only).
6. **`profile?.id` not `user?.id`.**
7. **No `vite build` locally.**
8. **Idempotent.** Re-runnable.
9. **Mac shell.**
10. **No personalization re-enable.** Even if the bug turns out to be personalization-related (variant table read paths the previous agent missed), do NOT re-introduce personalization UI. Flatten the read path to canonical, same way the personalization revert did.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Map the reading section's article-selection flow
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 — Find the reading section components

```bash
# All files in the reading section UI
grep -rln "ReadingSection\|ReadingTab\|ReadingArticle\|ReadingPassage\|reading\.body\|curriculum_reading" \
  src/components src/pages/student src/hooks 2>/dev/null | head -30

# The audio player(s) used in reading
grep -rln "ReadingPlayer\|ReadingAudio\|reading.*audio_url\|karaoke" \
  src/components src/pages/student src/hooks 2>/dev/null | head -20

# Article selection / navigation
grep -rn "currentArticle\|selectedReading\|activeReading\|currentReadingId\|articleIndex\|setCurrentReading" \
  src/ 2>/dev/null | head -30
```

### A.2 — Read each file end-to-end

Open the top 5 hits from A.1 and trace:
- What component renders the text?
- What component renders the audio player?
- What component renders the karaoke highlighter?
- What's the **parent** of all three?
- Does the parent hold a "current article" state that it passes down? Or does each child fetch its own?

### A.3 — Identify the state divergence point

Pick one reading unit that has **multiple articles** (Phase A.4 finds one). Trace a hypothetical click on "Article 2" through the component tree:

| Step | What updates | Source of truth |
|------|--------------|-----------------|
| User clicks "Article 2" | `setCurrentArticleId(2)` in parent? | ??? |
| Text component re-renders | reads from `articles[currentArticleId]` or fetches fresh? | ??? |
| Audio player re-renders | gets a new `audioUrl` prop? OR reuses its old one? | ??? |
| Karaoke re-renders | gets new `wordTimings`? OR keeps old? | ??? |

The exact step where the chain breaks IS the bug. Document it explicitly in the Phase A report.

### A.4 — Find a real broken unit

```sql
-- Find units with >1 reading article
SELECT unit_id, COUNT(*) AS article_count
FROM curriculum_reading
GROUP BY unit_id
HAVING COUNT(*) > 1
ORDER BY article_count DESC
LIMIT 10;
```

Pick the unit with the most articles — best test case for the bug. Record `unit_id` and the `id` + `title_en` of each article in that unit.

### A.5 — Trace what the broken unit's data looks like end-to-end

```javascript
// Query the unit's articles in the order the UI would see them
const { data } = await sb
  .from('curriculum_reading')
  .select('id, unit_id, title_ar, title_en, body_ar, audio_url, audio_duration_ms, word_timings, order_index')
  .eq('unit_id', '<unit_id from A.4>')
  .order('order_index');
```

For each article in the result, confirm:
- `body_ar` (or whatever the text column is) is present and matches `title_ar`
- `audio_url` is present and the file content corresponds to `body_ar` (you can't verify acoustically here, but check that `audio_duration_ms` is consistent with the text length — e.g., 130 words ÷ 2.5 wps = ~52 sec)
- `word_timings` covers the same word count as `body_ar`

If `audio_duration_ms` for Article 2 looks like it matches Article 1's text length, that's a **content-layer mismatch** — the audio file uploaded for Article 2's row is actually the audio of Article 1. That's a generator bug, not a UI bug.

If `audio_duration_ms` matches `body_ar` correctly per row, then the data is fine and the bug is **UI state synchronization**.

### A.6 — Phase A report

Write `docs/audits/reading-text-audio-mismatch/PHASE-A-REPORT.md`:

```markdown
# Phase A — Reading Text/Audio Mismatch Diagnosis

## Component map
- Reading text render: <file:line>
- Reading audio player: <file:line>
- Karaoke highlighter: <file:line>
- Parent that coordinates them: <file:line>

## Article selection flow
<step-by-step trace of what happens when a student picks Article 2>

## Source of truth audit
| Component | Reads from | Fetches independently? |
|-----------|-----------|------------------------|
| Text | <prop / hook / fetch> | YES / NO |
| Audio player | <prop / hook / fetch> | YES / NO |
| Karaoke | <prop / hook / fetch> | YES / NO |

## Test unit
- unit_id: <id>
- Articles in unit: <count>
- Article order in DB: <list of id + title>
- Article order in UI: <list — if different, that's relevant>

## Per-row data sanity (test unit articles)
| Article id | title | body_ar word count | audio_duration_ms | duration plausible? |
|-----------|-------|-------------------|-------------------|---------------------|
| ... | ... | ... | ... | ... |

## Diagnosis
The mismatch happens because: <one-line root cause>

### Bug category
One of:
- STATE_NOT_PROPAGATED — selection updates text but not audio player
- INDEPENDENT_FETCH — text and audio fetched separately with different logic
- STALE_INIT — audio player initializes from articles[0] and never updates
- CONTENT_LAYER — audio file in DB doesn't match the text it's paired with
- READ_PATH_VARIANT — still consulting a personalization/variant table

## Fix plan
<exact change needed>
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Wire text + audio + karaoke to one source of truth
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Apply the minimum fix matching Phase A's bug category.

### B.1 — If STATE_NOT_PROPAGATED

The parent holds `currentArticleId` but only passes it to the text component. Refactor the parent so a single `currentArticle` (resolved row) is passed to all three children:

```jsx
// ReadingSection.jsx — parent
const articles = useReadingArticles(unitId);  // returns all articles for the unit
const [currentArticleId, setCurrentArticleId] = useState(articles?.[0]?.id ?? null);

// Single source of truth — the resolved row
const currentArticle = articles?.find(a => a.id === currentArticleId) ?? articles?.[0] ?? null;

// Reset selection when unit changes
useEffect(() => {
  setCurrentArticleId(articles?.[0]?.id ?? null);
}, [unitId, articles?.[0]?.id]);

return (
  <>
    <ArticleSelector
      articles={articles}
      currentId={currentArticleId}
      onChange={setCurrentArticleId}
    />
    {currentArticle && (
      <>
        <ReadingArticle article={currentArticle} />
        <ReadingPlayer
          key={currentArticle.id}  // ← force remount on article change
          audioUrl={currentArticle.audio_url}
          durationMs={currentArticle.audio_duration_ms}
          wordTimings={currentArticle.word_timings}
        />
      </>
    )}
  </>
);
```

The `key={currentArticle.id}` on `ReadingPlayer` is critical — it forces a full remount when the article changes, which resets the `<audio>` element's internal state and `src`. No more stale `audio.src` from the previous article.

### B.2 — If INDEPENDENT_FETCH

Replace independent fetches in text and audio with a single shared hook:

```javascript
// hooks/useReadingArticle.js
export const useReadingArticle = (articleId) => {
  return useQuery({
    queryKey: ['reading-article', articleId],
    queryFn: async () => {
      if (!articleId) return null;
      const { data, error } = await supabase
        .from('curriculum_reading')
        .select('id, title_ar, title_en, body_ar, audio_url, audio_duration_ms, word_timings')
        .eq('id', articleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(articleId),
  });
};
```

Every consumer (text, audio player, karaoke) calls this same hook with the same `articleId`. React Query dedupes the network call. Single source of truth, no divergence possible.

### B.3 — If STALE_INIT

The audio player initializes its `src` once and never reacts to prop changes:

```jsx
// BEFORE — stale init
useEffect(() => {
  audioRef.current.src = audioUrl;
}, []);   // ← empty dep array, runs once

// AFTER — reactive
useEffect(() => {
  const audio = audioRef.current;
  if (!audio || !audioUrl) return;
  audio.src = audioUrl;
  audio.load();
  setIsPlaying(false);
  setCurrentMs(0);
}, [audioUrl]);   // ← reacts to prop changes
```

Also add the `key={currentArticle.id}` defensive remount from B.1 in the parent.

### B.4 — If CONTENT_LAYER

The data itself is wrong — Article 2's row has Article 1's audio file. This is a regeneration job. For each affected article:
1. Verify by comparing `audio_duration_ms` to `body_ar` word count (Phase A.5)
2. If mismatched, regenerate via the existing reading-audio generation script
3. Decode-verify the new file
4. `.update({audio_url, audio_path, audio_duration_ms}).select()`

Check ElevenLabs quota before bulk regen. If many rows are affected, scope this prompt to the UI fix only and write a separate follow-up prompt for content regeneration with proper budget planning.

### B.5 — If READ_PATH_VARIANT

The personalization revert missed a code path. Find every remaining `from('reading_variant'...)`, `from('personalized_readings'...)`, etc. in src/ and edge functions. Flatten each to canonical (`curriculum_reading`).

This shouldn't happen — the personalization revert audit reported zero remaining variant reads. If you find one, document it as a Phase A audit miss in the final report.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Verify end-to-end
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### C.1 — Run-through script

Write `scripts/audits/reading-text-audio-mismatch/verify.cjs`:

For 5 units with multiple articles, simulate the consumer flow:
1. Load all articles for the unit
2. For each article in the unit (not just article[0]):
   - Confirm `text_source_id === audio_source_id === karaoke_source_id`
   - Confirm `audio_url` HEAD returns 200 + audio/mpeg
   - Confirm `audio_duration_ms` is plausible vs `body_ar` length (between 0.5× and 2× of expected)

Output `verify.json` with per-row pass/fail.

### C.2 — Manual UI spot-check list

Pick the test unit from Phase A.4. Write to `docs/audits/reading-text-audio-mismatch/MANUAL-SPOT-CHECK.md`:

```markdown
# Manual Spot-Check — Reading Text/Audio Sync

Open: <URL of the unit on app.fluentia.academy>

1. Click "Article 1" — confirm:
   - Text title matches: <expected_title>
   - Press play — audio starts reading <expected_first_words>
   - Karaoke highlighter lands on the correct first word

2. Click "Article 2" — confirm:
   - Text title now reads: <expected_title>
   - Press play — audio NOW reads <expected_first_words>, NOT article 1's content
   - Karaoke highlighter on article 2's first word

3. Click back to "Article 1" — confirm:
   - Text + audio + karaoke ALL return to article 1's content together

If any step fails, the fix is incomplete. Report back.
```

### C.3 — Code-level sanity

- All hooks above conditional returns
- `key={currentArticle.id}` on the `ReadingPlayer` instance
- No `useEffect` with stale empty dep array in the audio player's src setup
- ESLint clean: `npx eslint src/components/Reading/ src/components/players/reading/ src/pages/student/curriculum/ --max-warnings=0`

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### D.1 — Final report

`docs/audits/reading-text-audio-mismatch/FINAL-REPORT.md`:

```markdown
# Reading Text/Audio Mismatch — Final Report (2026-05-18)

## Bug category
<from Phase A>

## Root cause
<one-line>

## Fix
- Files changed: <list>
- Source of truth: <name of the single state variable / hook>
- key={article.id} added on player: YES / NO

## Verification
- verify.cjs: <N>/<N> PASS
- Manual spot-check: see MANUAL-SPOT-CHECK.md (Ali to confirm in browser)
```

### D.2 — Commit + push

```bash
git add src/ scripts/audits/reading-text-audio-mismatch/ docs/audits/reading-text-audio-mismatch/

git commit -m "fix(reading): text + audio + karaoke now share single source of truth (article id)

ROOT CAUSE:
<from FINAL-REPORT>

THE BUG:
Students saw Article A on screen but the audio player read Article B
because <category-specific cause>. Karaoke followed the audio, bouncing
random words on screen.

FIX:
- <change summary>
- key={currentArticle.id} forces audio player remount on article switch —
  resets <audio> element state, eliminating stale src
- ReadingPlayer reacts to audioUrl prop changes (was previously stale-init)

NOT TOUCHED:
- No student data writes
- No DB schema changes
- No personalization re-enabled
- No transcript content rewritten
- Listening flow untouched"

git push origin main
git fetch origin
git log --oneline -3 HEAD
git log --oneline -3 origin/main
```

Confirm HEAD == origin/main.

---

## ⛔ DO NOT

- ❌ Re-enable any personalization UI
- ❌ Run a separate fetch in the audio player when the text component already has the data
- ❌ Touch the listening section (different player, different fix track)
- ❌ Touch student data
- ❌ Run `vite build` locally
- ❌ Apply DB migrations

## ✅ FINISH LINE

- Clicking Article 1 / Article 2 / etc. updates text + audio + karaoke together
- verify.cjs PASSES across 5 multi-article units
- One commit pushed to `origin/main`
- `docs/audits/reading-text-audio-mismatch/FINAL-REPORT.md` exists

End of prompt.
