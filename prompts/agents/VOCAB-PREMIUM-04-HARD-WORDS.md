# VOCAB PREMIUM — PROMPT 04 — HARD WORDS TRAINING

> Part 4 of 8 in the Premium Vocabulary rebuild series.
> Greenfield. Consumes the FSRS data from Prompt 03 (`curriculum_vocabulary_srs.difficulty + lapses`, `srs_review_logs.rating`).
> Reference foundations: `docs/vocab-section/PHASE-A-AUDIT.md`, `docs/vocab-section/PHASE-D-SRS-FRONTEND-REPORT.md`.

---

## 🎯 GOAL — END STATE

After this prompt:

1. New table `hard_words_drill_log` records every drill attempt (immutable, RLS-protected).
2. Additive columns on `curriculum_vocabulary_srs`: `hw_correct_streak`, `hw_drill_modes_seen`, `hw_last_drill_at`.
3. New service `src/services/hardWords.ts`: classification, drill batch selection, completion tracking, promotion logic.
4. Four drill mode components: Matching, ContextFill, Listening, TypingRecall.
5. New route `/student/hard-words` with `HardWordsHome` dashboard + `HardWordsDrillSession` + `HardWordsSessionComplete`.
6. Sidebar nav entry "تدريب الكلمات الصعبة" (conditional — only visible when hard words count > 0 for the student).
7. Smoke test: 3 drill attempts → log rows correct, promotion logic produces expected streak increments.

---

## 🧭 FOUNDATION (already done, don't re-do)

- `curriculum_vocabulary_srs` has FSRS state — `student_id`, `vocabulary_id`, `stability`, `difficulty`, `state`, `due`, `last_review`, `reps`, `lapses`, `elapsed_days`, `scheduled_days`, `fsrs_seeded_at`.
- `srs_review_logs` has rating history — `student_id`, `vocabulary_id`, `rating` (1=Again, 2=Hard, 3=Good, 4=Easy), `state_before`, `state_after`, `stability_after`, `difficulty_after`, `reviewed_at`.
- 97 active students with seeded SRS state. Real FSRS data is accumulating as they review.
- Design tokens: `var(--ds-*)`, `var(--tr-*)`. Tajawal Arabic, Readex Pro English. RTL-safe.
- Audio: 100% generated on `curriculum_vocabulary.audio_url`.

---

## 📐 CLASSIFICATION RULES

A word is **hard for a student** if ANY of these:
- `lapses >= 3` (failed at least 3 times historically), OR
- `difficulty >= 7.0` (FSRS difficulty, scale 0–10), OR
- Recent 14-day Again-rate: ≥60% of last `srs_review_logs` rows for this (student, vocab) are `rating = 1`, with at least 3 review log rows in the window.

A word is **medium**:
- `lapses` in 1–2 OR `difficulty` in 5.0–7.0 (and not already classified hard).

A word is **easy**:
- `lapses == 0` AND `difficulty < 5.0`.

**Promotion** (word leaves the hard-words pool):
- `hw_correct_streak >= 3` AND `array_length(hw_drill_modes_seen, 1) >= 2`
- When promoted: word remains in normal FSRS flow; just doesn't appear in `/student/hard-words` until classification rules re-trigger.
- Any drill failure resets `hw_correct_streak = 0` and `hw_drill_modes_seen = '{}'`.

---

## ⚠️ NON-NEGOTIABLE

1. **`student_id` everywhere** — schema reality from Prompt 03.
2. **Hooks at top of every component** — React rule.
3. **`.select()` after every `.update()`** for RLS silent-failure detection.
4. **Atomic phase commits** — push after each phase, Vercel deploys each.
5. **Idempotent migrations.**
6. **No `vite build` locally.**
7. **Design tokens only.**
8. **Empty/small-pool handling** — Matching needs ≥6 candidates, Listening needs ≥4. If the pool is smaller, gracefully disable those modes; never crash on small pools.

---

## PHASE A — DISCOVERY (5 min, read-only)

### A.1 — Verify foundation tables/columns

```sql
-- Confirm SRS schema as expected
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'curriculum_vocabulary_srs'
  AND column_name IN ('student_id', 'difficulty', 'lapses', 'state', 'reps');

-- Confirm srs_review_logs has rating column populated
SELECT COUNT(*) AS total_logs,
       COUNT(*) FILTER (WHERE rating = 1) AS again_count
FROM srs_review_logs;

-- Sample distribution: how many words would currently classify as hard?
-- Use Ali's UUID e5528ced-b3e2-45bb-8c89-9368dc9b5b96 as a probe student, OR pick any with active SRS rows.
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE lapses >= 3 OR difficulty >= 7.0) AS classified_hard,
  COUNT(*) FILTER (WHERE (lapses BETWEEN 1 AND 2) OR (difficulty BETWEEN 5.0 AND 7.0)) AS classified_medium
FROM curriculum_vocabulary_srs
WHERE student_id = '<probe student uuid>';
```

If `srs_review_logs` is empty (no students have used the new dashboard yet), classification still works — it falls back to lapses + difficulty only.

### A.2 — Code

```bash
# Find nav config (for adding the conditional hard-words entry)
grep -rln "BookOpenCheck\|srs_due_count" src/config/ src/components/layout/ 2>/dev/null

# Find existing route definitions
grep -rE "'/student/srs'|'/student/daily" src/ 2>/dev/null

# Verify hardWords doesn't already exist
ls src/services/hardWords.ts 2>/dev/null
ls src/components/hard-words/ 2>/dev/null
ls src/pages/student/HardWords*.jsx 2>/dev/null

# Check supabase client import path used by srs.ts
head -10 src/services/srs.ts
```

Print findings, proceed.

---

## PHASE B — DB MIGRATION (idempotent)

Apply via Supabase MCP `apply_migration` with name `hard_words_training`.

```sql
-- ============================================================
-- 1) Additive columns on curriculum_vocabulary_srs
-- ============================================================
ALTER TABLE curriculum_vocabulary_srs
ADD COLUMN IF NOT EXISTS hw_correct_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hw_drill_modes_seen TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hw_last_drill_at TIMESTAMPTZ;

-- ============================================================
-- 2) Immutable drill attempt log
-- ============================================================
CREATE TABLE IF NOT EXISTS hard_words_drill_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES curriculum_vocabulary(id) ON DELETE CASCADE,
  drill_mode TEXT NOT NULL CHECK (drill_mode IN ('matching', 'context_fill', 'listening', 'typing_recall')),
  is_correct BOOLEAN NOT NULL,
  response_ms INTEGER, -- time to answer in milliseconds (optional analytics)
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hw_log_student_vocab_idx
  ON hard_words_drill_log(student_id, vocabulary_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS hw_log_attempted_at_idx
  ON hard_words_drill_log(attempted_at DESC);

ALTER TABLE hard_words_drill_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students read own drill log" ON hard_words_drill_log;
CREATE POLICY "students read own drill log"
  ON hard_words_drill_log FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "students insert own drill log" ON hard_words_drill_log;
CREATE POLICY "students insert own drill log"
  ON hard_words_drill_log FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "admin full access" ON hard_words_drill_log;
CREATE POLICY "admin full access"
  ON hard_words_drill_log FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3) Helper function: classify hard words for a student
--    (used by the service layer; SECURITY DEFINER so RLS doesn't block)
-- ============================================================
CREATE OR REPLACE FUNCTION get_hard_words_for_student(p_student_id UUID, p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  vocabulary_id UUID,
  word TEXT,
  meaning_ar TEXT,
  audio_url TEXT,
  example_sentence TEXT,
  difficulty DOUBLE PRECISION,
  lapses INTEGER,
  hw_correct_streak INTEGER,
  hw_drill_modes_seen TEXT[],
  recent_again_rate DOUBLE PRECISION,
  classification TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH recent_log_stats AS (
    SELECT
      vocabulary_id,
      COUNT(*) FILTER (WHERE rating = 1)::float / NULLIF(COUNT(*), 0) AS again_rate,
      COUNT(*) AS recent_count
    FROM srs_review_logs
    WHERE student_id = p_student_id
      AND reviewed_at > NOW() - INTERVAL '14 days'
    GROUP BY vocabulary_id
  )
  SELECT
    cv.id AS vocabulary_id,
    cv.word,
    cv.meaning_ar,
    cv.audio_url,
    cv.example_sentence,
    cvs.difficulty,
    cvs.lapses,
    cvs.hw_correct_streak,
    cvs.hw_drill_modes_seen,
    COALESCE(rls.again_rate, 0) AS recent_again_rate,
    'hard'::TEXT AS classification
  FROM curriculum_vocabulary_srs cvs
  JOIN curriculum_vocabulary cv ON cv.id = cvs.vocabulary_id
  LEFT JOIN recent_log_stats rls ON rls.vocabulary_id = cvs.vocabulary_id
  WHERE cvs.student_id = p_student_id
    AND (
      cvs.lapses >= 3
      OR cvs.difficulty >= 7.0
      OR (rls.again_rate >= 0.6 AND rls.recent_count >= 3)
    )
    -- Exclude already-promoted in current cycle
    AND NOT (cvs.hw_correct_streak >= 3 AND array_length(cvs.hw_drill_modes_seen, 1) >= 2)
  ORDER BY cvs.difficulty DESC NULLS LAST, cvs.lapses DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_hard_words_for_student(UUID, INTEGER) TO authenticated;
```

Verify:
```sql
-- After migration, run for probe student:
SELECT * FROM get_hard_words_for_student('<probe student uuid>', 20);
-- Should return up to N rows, all with classification='hard'
```

```bash
git add supabase/migrations/
git commit -m "feat(hard-words): schema + drill log + classification RPC"
git push origin main
```

---

## PHASE C — SERVICE LAYER

Create `src/services/hardWords.ts`. Follow the same patterns as `src/services/srs.ts` (project conventions, supabase client import, error handling).

**Required exports:**

```typescript
// Classification + pool fetch
export async function getHardWords(studentId: string, limit?: number): Promise<HardWord[]>
export async function getHardWordsCount(studentId: string): Promise<number>

// Drill batch selection — returns N hard words shaped for a specific drill mode
export async function selectDrillBatch(
  studentId: string,
  drillMode: DrillMode,
  size: number
): Promise<DrillBatch>

// Record outcome of a single drill attempt (updates streak + log)
export async function recordDrillAttempt(params: {
  studentId: string;
  vocabularyId: string;
  drillMode: DrillMode;
  isCorrect: boolean;
  responseMs?: number;
}): Promise<DrillAttemptResult>

// Dashboard stats
export async function getHardWordsStats(studentId: string): Promise<HardWordsStats>
```

**Types:**

```typescript
export type DrillMode = 'matching' | 'context_fill' | 'listening' | 'typing_recall';

export interface HardWord {
  vocabularyId: string;
  word: string;
  meaningAr: string;
  audioUrl: string | null;
  exampleSentence: string | null;
  difficulty: number;
  lapses: number;
  hwCorrectStreak: number;
  hwDrillModesSeen: DrillMode[];
  recentAgainRate: number;
}

export interface DrillBatch {
  primaryWords: HardWord[];      // The words being tested
  distractorWords?: HardWord[];  // For matching/listening MCQ — drawn from non-hard pool
  mode: DrillMode;
}

export interface DrillAttemptResult {
  newStreak: number;
  newModesSeen: DrillMode[];
  promoted: boolean;
}

export interface HardWordsStats {
  totalHard: number;
  byCause: {
    highLapses: number;
    highDifficulty: number;
    recentAgainPattern: number;
  };
  availableModes: DrillMode[]; // disabled if pool too small
  recentDrillsLast7Days: number;
}
```

**Drill batch sizing per mode:**
- `matching`: 6 primary + 0 distractors (matching is among the 6 hard words themselves; their Arabic meanings shuffle)
- `context_fill`: 1 primary + 3 distractors (4 MCQ options)
- `listening`: 1 primary + 3 distractors (4 MCQ options)
- `typing_recall`: 1 primary + 0 distractors

**recordDrillAttempt logic:**
- Insert into `hard_words_drill_log`.
- If correct:
  - `hw_correct_streak += 1`
  - `hw_drill_modes_seen = array_append(hw_drill_modes_seen, drill_mode)` (deduped via `(SELECT array(SELECT DISTINCT unnest(...)))`)
  - `hw_last_drill_at = NOW()`
  - Compute `promoted = (new_streak >= 3 AND array_length(new_modes_seen, 1) >= 2)`
- If incorrect:
  - `hw_correct_streak = 0`
  - `hw_drill_modes_seen = '{}'`
  - `hw_last_drill_at = NOW()`
  - `promoted = false`
- Return `{ newStreak, newModesSeen, promoted }`.

**Available modes calculation:**
- `matching`: needs `getHardWordsCount(studentId) >= 6`
- `listening` / `context_fill`: needs `getHardWordsCount(studentId) >= 1` PLUS at least 3 other words in `curriculum_vocabulary` of the same level to serve as distractors
- `typing_recall`: needs `>= 1`

```bash
git add src/services/hardWords.ts
git commit -m "feat(hard-words): service layer — classification + drill batch + attempt logging"
git push origin main
```

---

## PHASE D — DRILL COMPONENTS

All new files in `src/components/hard-words/`. Use Framer Motion for animations. RTL-safe.

### D.1 — `MatchingDrill.jsx`

Layout: 6 English words on left column, 6 shuffled Arabic meanings on right column.

UX:
- **Desktop**: drag English word onto Arabic meaning (or vice versa).
- **Mobile**: tap one side, then tap the other to pair.
- Correct pair → both turn green, lock in place, log via `recordDrillAttempt({ isCorrect: true })`.
- Incorrect pair → red flash for 600ms, words bounce back, log via `recordDrillAttempt({ isCorrect: false })`.
- Each word is one drill attempt (6 attempts per session for matching mode).
- Session complete when all 6 are paired.

Hooks at top. Reads batch from `selectDrillBatch(studentId, 'matching', 6)` via TanStack `useQuery`. Audio button next to each English word.

### D.2 — `ContextFillDrill.jsx`

Shows the example sentence with the target word blanked out (use `_____` placeholder). Four MCQ buttons below.

UX:
- Single tap on an option submits.
- Correct → green flash, "ممتاز!" text overlay, advance to next word after 1.2s.
- Incorrect → red flash, show correct answer highlighted briefly, advance after 2s.
- Logs each attempt via `recordDrillAttempt`.
- Session runs through `primaryWords` (one drill attempt per word). Default session size = 10.

Edge case: if a word has no `example_sentence` in the DB, fall back to typing_recall for that word.

### D.3 — `ListeningDrill.jsx`

Plays the audio for the target word; 4 word options shown (no Arabic meanings on the buttons — student listens, then identifies which English word matches the sound).

UX:
- Audio auto-plays on card load (respect `profiles.srs_autoplay_audio`).
- Replay button always available.
- 4 buttons with English words only.
- Correct/incorrect handling same as ContextFillDrill.

Distractors: pull from `curriculum_vocabulary` matching the primary word's level, with audio_url present, and ideally with similar phonetic shape (this is a stretch — for v1, just random level-matched audio-having words).

### D.4 — `TypingRecallDrill.jsx`

Shows Arabic meaning. Input field for English word. Student types.

UX:
- On submit (Enter or button):
  - Compute Levenshtein distance between input and target `word` (case-insensitive, trim whitespace).
  - Distance ≤ 1 → correct (one typo allowed). Show "تقريباً صحيح ✓" if distance = 1 (educates the student) but counts as correct.
  - Distance > 1 → incorrect. Show the correct spelling in green next to the input.
- Use a small Levenshtein implementation inline (don't pull a dependency).
- After 5s of correct flash OR immediately on tap "التالي", advance.

### D.5 — `DrillSessionContainer.jsx`

Orchestrates one drill session:
- Receives `drillMode` prop.
- Calls `selectDrillBatch(studentId, drillMode, N)` once on mount.
- Tracks session state: cards completed, correct count, total response time, words promoted.
- Renders the appropriate drill component for `drillMode`.
- On session end → renders `<HardWordsSessionComplete>`.

Default session sizes per mode:
- matching: 1 session = 1 set of 6 (6 attempts)
- context_fill: 10 words per session
- listening: 10 words per session
- typing_recall: 10 words per session

```bash
git add src/components/hard-words/
git commit -m "feat(hard-words): 4 drill mode components + session container"
git push origin main
```

---

## PHASE E — DASHBOARD + COMPLETION

### E.1 — `src/pages/student/HardWordsHome.jsx` (route `/student/hard-words`)

**Hero block:**
- Title: "تدريب الكلمات الصعبة"
- Subtitle (small): "الكلمات اللي تواجه معاها صعوبة في المراجعة اليومية"
- Total hard words count (large display number).
- Breakdown chips (small inline cards):
  - "كلمات سقطت فيها كثيراً" (`byCause.highLapses` count)
  - "كلمات صعبة المستوى" (`byCause.highDifficulty` count)
  - "كلمات أخطأت فيها مؤخراً" (`byCause.recentAgainPattern` count)

**Mode selection cards (grid below hero):**
4 cards, one per drill mode. Each:
- Mode icon (lucide: Shuffle for matching, BookOpen for context, Headphones for listening, Keyboard for typing)
- Mode name in Arabic: مطابقة المعاني / كلمة في جملة / استماع / كتابة الكلمة
- 1-line description of the mode in Arabic
- Availability state:
  - **Available** (mode in `stats.availableModes`): card is fully colored, large gold "ابدأ" button.
  - **Disabled** (mode NOT in `stats.availableModes`): card grayed out + tooltip: "تحتاج على الأقل ٦ كلمات صعبة لهذا التدريب".

Tap an available card → opens `<DrillSessionContainer mode={mode} />` in a full-screen overlay.

**Empty state (totalHard == 0):**
- Big green checkmark
- "ما عندك كلمات صعبة الآن! 🎉"
- "استمر بالمراجعة اليومية وراح نبيّن لك الصعب أول ما يظهر."
- Single CTA: "العودة لمراجعة المفردات" → links to `/student/srs`.

**Recent activity strip (bottom):**
- "تدربت على X كلمة هذا الأسبوع" with `stats.recentDrillsLast7Days`.
- Inline 7-day bar chart (reuse `recharts` from SrsHome).

### E.2 — `HardWordsSessionComplete.jsx`

Shown after a drill session ends.
- Subtle confetti.
- Heading: "خلصت التدريب!"
- Stats row:
  - عدد التدريبات (session count)
  - دقة الإجابة (% correct)
  - كلمات ترقّت (count of promoted words this session — celebrate this most prominently if > 0)
- Promoted words list (if any): show each as a small card with word + 🎉 badge.
- Buttons:
  - "تدريب جديد" (back to HardWordsHome)
  - "مراجعة المفردات" (link to `/student/srs`)

### E.3 — `HardWordsStatsCard.jsx`

Compact widget. Read `getHardWordsStats(studentId)`. Show:
- "كلمات صعبة"
- Count of total hard
- Tap → navigate to `/student/hard-words`.
- Hide entirely if total == 0.

```bash
git add src/pages/student/HardWordsHome.jsx src/components/hard-words/HardWordsSessionComplete.jsx src/components/hard-words/HardWordsStatsCard.jsx
git commit -m "feat(hard-words): premium HardWordsHome + SessionComplete + StatsCard"
git push origin main
```

---

## PHASE F — ROUTE + NAV

### F.1 — Route

Add to router:
```jsx
import HardWordsHome from '@/pages/student/HardWordsHome';
{ path: '/student/hard-words', element: <HardWordsHome /> }
```

### F.2 — Nav entry (conditional visibility)

Add to nav config, similar to the SRS entry pattern:
```js
{
  label: 'تدريب الكلمات الصعبة',
  href: '/student/hard-words',
  icon: Dumbbell, // from lucide-react
  // Only render if getHardWordsCount(profile.id) > 0
  visible: (ctx) => ctx.hardWordsCount > 0,
}
```

If the nav config doesn't support visibility predicates, wire up the count in the nav component itself and conditionally render the entry. Mirror the badge pattern used by the SRS due badge.

```bash
git add src/App.jsx src/config/navigation.js src/components/layout/
git commit -m "feat(hard-words): mount /student/hard-words route + conditional nav entry"
git push origin main
```

---

## PHASE G — SMOKE TEST + FINAL REPORT

### G.1 — TypeScript check

```bash
npx tsc --noEmit
```

### G.2 — DB smoke test

Throwaway script at `scripts/_smoke-hard-words.cjs` (do not commit):

1. Pick a student with hard words: `SELECT student_id FROM curriculum_vocabulary_srs WHERE difficulty >= 7 OR lapses >= 3 LIMIT 1;`
2. Call `get_hard_words_for_student(studentId, 10)` — print result, confirm at least one row.
3. Pick one of those vocabulary_ids. Simulate 3 drill attempts via `recordDrillAttempt`:
   - Attempt 1: drill_mode='matching', is_correct=true. Expect `newStreak=1`, `newModesSeen=['matching']`, `promoted=false`.
   - Attempt 2: drill_mode='context_fill', is_correct=true. Expect `newStreak=2`, `newModesSeen=['matching','context_fill']`, `promoted=false`.
   - Attempt 3: drill_mode='typing_recall', is_correct=true. Expect `newStreak=3`, `newModesSeen=['matching','context_fill','typing_recall']`, `promoted=TRUE`.
4. Confirm `SELECT * FROM hard_words_drill_log WHERE student_id = $1 AND vocabulary_id = $2 ORDER BY attempted_at DESC LIMIT 3;` returns the 3 attempts.
5. Reset for cleanliness: `UPDATE curriculum_vocabulary_srs SET hw_correct_streak=0, hw_drill_modes_seen='{}' WHERE student_id=$1 AND vocabulary_id=$2;`

Print transitions to stdout.

### G.3 — Vercel deploy check

After final push, verify on the deploy URL:
- `/student/hard-words` loads
- If probe student has hard words: dashboard shows count, mode cards visible, at least one mode marked available
- If probe has none: empty state visible
- Sidebar nav entry appears only when count > 0
- Tap a mode → drill session opens, plays one attempt, ratings update

### G.4 — Final report

Write `docs/vocab-section/PHASE-E-HARD-WORDS-REPORT.md`:

```markdown
# Hard Words Training — Final Report

## Migration outcome
- curriculum_vocabulary_srs: 3 columns added ✓
- hard_words_drill_log: created with N policies ✓
- get_hard_words_for_student RPC: deployed ✓

## Code summary
- Files created: <list>
- Files modified: <list>
- Components: 4 drill modes + container + dashboard + completion + stats card

## Classification at first deploy
- Probe student: <id>
- Total hard words classified: N
- By cause: lapses=X, difficulty=Y, recent_pattern=Z

## Smoke test
<paste 3-attempt promotion transition results>

## Vercel verification
- /student/hard-words: ✓
- Nav entry: ✓ (visible/hidden as designed)
- Drill session smoke: ✓

## Deferred / known gaps
<anything not done>
```

```bash
git add docs/vocab-section/PHASE-E-HARD-WORDS-REPORT.md
git commit -m "docs(hard-words): final report"
git push origin main
```

---

## ⚠️ HARD RULES (RECAP)

1. `student_id` everywhere.
2. Hooks at top of components.
3. .select() after every .update().
4. Atomic phase commits + push after each.
5. Idempotent migrations.
6. Empty/small-pool handling — never crash, gracefully disable modes.
7. No vite build locally.
8. Design tokens only.

Begin Phase A.
