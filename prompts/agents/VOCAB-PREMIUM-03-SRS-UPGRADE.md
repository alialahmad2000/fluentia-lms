# VOCAB PREMIUM — PROMPT 03 — SRS UPGRADE → FSRS

> Part 3 of 8 in the Premium Vocabulary rebuild series.
> Upgrades the alive `curriculum_vocabulary_srs` to FSRS v4. Drops dead `anki_cards`. Builds the premium "مراجعة المفردات اليومية" dashboard.
> Reference: `docs/vocab-section/PHASE-A-AUDIT.md` (commit `240dede`) for ground truth.
> Run in its own Claude Code tab. Zero conflict with the 3 enrichment tracks — different columns, different tables, different files.

---

## 🎯 GOAL

End state after this prompt completes:

1. `curriculum_vocabulary_srs` carries FSRS state (stability, difficulty, state, due, lapses, …) — 97 existing student rows seeded with defaults, due dates preserved.
2. `profiles` carries SRS preferences (daily new cards, max reviews, order, autoplay).
3. `srs_review_logs` table records every rating event (foundation for Prompt 04 Hard Words classification).
4. `anki_cards` + `anki_review_logs` dropped (clean — 0 rows in each).
5. `ts-fsrs` installed, `src/services/srs.ts` is the single algorithm authority.
6. Existing `DailyReview` and `WordExerciseModal` refactored to call `srs.ts` — students experience continuity, no broken state during deploy.
7. New `/student/srs` route mounted with premium `SrsHome` dashboard + full review session UX.
8. Sidebar nav: "مراجعة المفردات اليومية" entry visible to students.
9. Orphaned `src/components/anki/*` deleted.
10. Smoke test passes — 4 simulated ratings produce expected state transitions.

---

## ⚠️ NON-NEGOTIABLE

1. **97 active student SRS rows must survive intact.** Zero data loss. Their existing due dates must be preserved.
2. **No broken intermediate state.** If a student opens DailyReview mid-deploy, it must work. All schema changes are additive (ADD COLUMN ... DEFAULT, never DROP COLUMN on the alive table).
3. **Idempotent migration.** Re-runnable without error.
4. **Atomic phase commits.** Each phase pushes to main and Vercel deploys it. A broken phase = revert one commit, the rest stand.
5. **Hooks at top of every component** (React rule from skill — avoid error #310).
6. **`profile.id` not `user.id`** for all student data reads.
7. **`.select()` after every `.update()`** for RLS silent-failure detection.
8. **No `vite build` locally.** Vercel handles all builds.

---

## PHASE A — DISCOVERY (10 min, read-only)

### A.1 — DB

```sql
-- Existing curriculum_vocabulary_srs schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'curriculum_vocabulary_srs'
ORDER BY ordinal_position;

-- Row count (should be 97)
SELECT COUNT(*) FROM curriculum_vocabulary_srs;

-- Sample 3 rows to see real data shape
SELECT * FROM curriculum_vocabulary_srs LIMIT 3;

-- profiles schema — find any srs/anki preference columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND (column_name LIKE 'srs_%' OR column_name LIKE 'anki_%');

-- Anki tables — confirm empty before drop
SELECT 'anki_cards' AS t, COUNT(*) FROM anki_cards
UNION ALL
SELECT 'anki_review_logs', COUNT(*) FROM anki_review_logs;

-- Any pre-existing srs review log tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%srs%' OR table_name LIKE '%review_log%');
```

### A.2 — Code

```bash
# Find SRS-related source
grep -rln "curriculum_vocabulary_srs" src/ 2>/dev/null
grep -rln "DailyReview" src/ 2>/dev/null
grep -rln "WordExerciseModal" src/ 2>/dev/null

# Find anki-related source (likely to be deleted)
grep -rln "anki" src/ 2>/dev/null | head -30

# Find route registrations matching SRS-relevant paths
grep -rE "['\"]\\/student\\/(srs|daily-review|review|anki|vocabulary-review)" src/ 2>/dev/null

# Find sidebar/nav configs
ls src/config/ 2>/dev/null
grep -rln "navigation\|sidebar" src/config/ src/components/layout/ 2>/dev/null

# Find supabase client import path
grep -rE "from ['\"].*supabase" src/lib/ src/services/ 2>/dev/null | head -5
```

### A.3 — package.json

```bash
cat package.json | grep -E '"ts-fsrs"|"@anki|"date-fns"|"lucide-react"|"framer-motion"'
```

### A.4 — Print discovery report

Print to stdout, then proceed:
- Existing SRS columns + sample row
- Any srs_/anki_ preference columns on profiles
- Anki row counts (must be 0 to drop safely)
- File paths for DailyReview, WordExerciseModal, anki components, route definitions, nav config, supabase import
- ts-fsrs install status

If anki row counts are non-zero → stop and report. The audit said zero; if production has changed, escalate.

---

## PHASE B — DB MIGRATION (idempotent, applied via Supabase MCP)

Apply via `mcp__supabase__apply_migration` with name `vocab_premium_srs_upgrade`.

```sql
-- ============================================================
-- 1) Add FSRS state columns to alive curriculum_vocabulary_srs
-- ============================================================
ALTER TABLE curriculum_vocabulary_srs
ADD COLUMN IF NOT EXISTS stability DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS difficulty DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'new'
  CHECK (state IN ('new', 'learning', 'review', 'relearning')),
ADD COLUMN IF NOT EXISTS due TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_review TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reps INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lapses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS elapsed_days DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS scheduled_days DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS fsrs_seeded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_srs_user_due
  ON curriculum_vocabulary_srs(user_id, due);
CREATE INDEX IF NOT EXISTS idx_srs_state
  ON curriculum_vocabulary_srs(state);

-- ============================================================
-- 2) Seed existing 97 rows
-- ============================================================
-- Strategy: if discovery (A.1) finds an existing scheduling column
-- like next_review_at / interval_days / repetitions, use it to
-- preserve student-perceived schedule:
--   • If row has prior review history → state='review', preserve due date
--   • If row is brand new → state='new', due=NOW()
-- If no such column exists, treat all 97 as 'review' starting from NOW()
-- with FSRS defaults (stability=2.5, difficulty=5.0).
--
-- ADAPT this UPDATE to actual column names from A.1:
UPDATE curriculum_vocabulary_srs
SET
  state = CASE
    WHEN <existing_review_indicator_column> > 0 THEN 'review'
    ELSE 'new'
  END,
  due = COALESCE(<existing_due_column>, NOW()),
  stability = 2.5,
  difficulty = 5.0,
  fsrs_seeded_at = NOW()
WHERE fsrs_seeded_at IS NULL;

-- Verify seeding:
-- SELECT COUNT(*) FROM curriculum_vocabulary_srs WHERE fsrs_seeded_at IS NOT NULL;
-- Expected: same as total row count (97 or whatever discovery shows)

-- ============================================================
-- 3) Create srs_review_logs (FSRS history → feeds Prompt 04)
-- ============================================================
CREATE TABLE IF NOT EXISTS srs_review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES curriculum_vocabulary(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4),
  state_before TEXT NOT NULL,
  state_after TEXT NOT NULL,
  stability_after DOUBLE PRECISION NOT NULL,
  difficulty_after DOUBLE PRECISION NOT NULL,
  elapsed_days DOUBLE PRECISION NOT NULL,
  scheduled_days DOUBLE PRECISION NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS srs_logs_user_vocab_idx
  ON srs_review_logs(user_id, vocabulary_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS srs_logs_reviewed_at_idx
  ON srs_review_logs(reviewed_at DESC);

ALTER TABLE srs_review_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students read own logs" ON srs_review_logs;
CREATE POLICY "students read own logs"
  ON srs_review_logs FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "students insert own logs" ON srs_review_logs;
CREATE POLICY "students insert own logs"
  ON srs_review_logs FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin full access" ON srs_review_logs;
CREATE POLICY "admin full access"
  ON srs_review_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 4) SRS preference columns on profiles
-- ============================================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS srs_daily_new_cards INTEGER DEFAULT 20
  CHECK (srs_daily_new_cards BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS srs_daily_max_reviews INTEGER DEFAULT 200
  CHECK (srs_daily_max_reviews BETWEEN 50 AND 500),
ADD COLUMN IF NOT EXISTS srs_review_order TEXT DEFAULT 'level'
  CHECK (srs_review_order IN ('level', 'random', 'unit')),
ADD COLUMN IF NOT EXISTS srs_autoplay_audio BOOLEAN DEFAULT true;

-- ============================================================
-- 5) Drop dead anki tables (verified 0 rows in audit)
-- ============================================================
DROP TABLE IF EXISTS anki_cards CASCADE;
DROP TABLE IF EXISTS anki_review_logs CASCADE;
```

After applying, verify via SELECT counts and `SELECT to_regclass('anki_cards');` (must return NULL).

```bash
git add supabase/migrations/
git commit -m "feat(srs): FSRS-ready schema on curriculum_vocabulary_srs + drop dead anki tables"
git push origin main
```

---

## PHASE C — INSTALL + SERVICE LAYER

### C.1 — Install ts-fsrs

```bash
npm install ts-fsrs
```

### C.2 — Create `src/services/srs.ts`

Service must expose:

| Function | Purpose |
|---|---|
| `rateCard(card, rating, now?)` | Pure FSRS calculation. Returns updated card + log fields. No DB. |
| `applyRating(vocabularyId, rating, profileId)` | Wraps rateCard + DB update + log insert. |
| `getDueCards(profileId, limit?)` | Returns due cards joined with `curriculum_vocabulary`. |
| `getDueCount(profileId)` | Count of cards with `due <= NOW()`. |
| `getNewCardsAvailable(profileId, dailyLimit)` | Daily new card budget remaining for today. |
| `getNewCards(profileId, limit?)` | Cards in state='new', respecting daily limit. |
| `getStreak(profileId)` | Days of consecutive review activity. |

FSRS parameters:
```typescript
const params = generatorParameters({
  enable_fuzz: true,
  enable_short_term: true,
  request_retention: 0.9,
});
```

Rating enum (UI maps these to Arabic buttons):
- `1 = Again` → "مرة أخرى"
- `2 = Hard` → "صعبة"
- `3 = Good` → "جيد"
- `4 = Easy` → "سهلة"

Use the supabase client import path discovered in A.2. Apply project rules:
- `.select()` after every `.update()`
- `profile.id` everywhere (not `user.id`) — assume callers pass profileId already resolved

```bash
git add package.json package-lock.json src/services/srs.ts
git commit -m "feat(srs): ts-fsrs + service layer (rateCard, applyRating, getDueCards, ...)"
git push origin main
```

---

## PHASE D — REFACTOR EXISTING COMPONENTS

Goal: existing `DailyReview` + `WordExerciseModal` consume the new service. Student-visible behavior changes minimally (same screen flow, same buttons); under the hood FSRS replaces whatever algorithm was there.

### D.1 — Hook layer

Find the SRS hook from A.2 (likely `useSrs.js` or `useDailyReview.js`). Refactor it to:
- Use `getDueCards`, `getDueCount`, `getNewCardsAvailable` from `srs.ts`
- Return data via TanStack Query (`useQuery`) with `staleTime: 0` for due counts
- Keep the public hook API stable so consuming components don't break

### D.2 — `DailyReview.jsx`

- Old custom scheduling → replaced by `applyRating(vocabId, rating, profile.id)`
- Old "next interval" displays → use `card.due` directly
- All hooks declared at top, conditional returns AFTER hooks
- If component imports anything from `src/components/anki/*` → remove the import (those are getting deleted in Phase G)

### D.3 — `WordExerciseModal.jsx`

When student completes an exercise:
- Pass → `applyRating(vocabId, 3 /* Good */, profile.id)`
- Fail → `applyRating(vocabId, 1 /* Again */, profile.id)`
- Skip → no rating change (or rating=2 Hard if the UX treats skip as "I struggled")

The exercise-level XP system stays untouched — XP and SRS are orthogonal.

```bash
git add src/hooks/ src/components/curriculum/ src/components/vocabulary/
git commit -m "refactor(srs): DailyReview + WordExerciseModal use FSRS service"
git push origin main
```

---

## PHASE E — PREMIUM SRS DASHBOARD

All new components. Use design system tokens (`var(--ds-*)`, `var(--tr-*)`), Tajawal for Arabic, Readex Pro for English. RTL-safe.

### E.1 — `src/pages/student/SrsHome.jsx`  (route: `/student/srs`)

Layout:
- **Hero block (top)**:
  - Large animated progress orb showing today's review completion (0% → 100% as cards complete)
  - Stat row: "تستحق المراجعة" (due count) | "كلمات جديدة اليوم" (new available) | "السلسلة" (streak in days with 🔥)
  - Single dominant gold CTA "ابدأ المراجعة" → opens SrsReviewSession in a full-screen modal
- **Recent activity row** (below hero):
  - Last 7 days mini chart (reviews per day, simple bar)
- **Settings gear (floating, bottom-right)**:
  - Tap → opens SrsSettings drawer

When due count is 0 and no new cards available:
- Empty state: gold checkmark + "أحسنت! خلصت مراجعة اليوم" + "تعال غداً للمراجعة الجديدة"
- Show a "خلني أراجع كلمات إضافية" secondary CTA that pulls 20 cards from cards reviewed in the last 14 days (regardless of due date) for optional extra practice

### E.2 — `src/components/srs/SrsReviewSession.jsx`

Full-screen modal opened from SrsHome. Per-card UX:
1. **Question phase**: show English word + audio button + optional context sentence (audio only). No Arabic visible yet.
2. **"أظهر الإجابة"** button reveals: Arabic meaning + example sentence (Arabic translation) + any enrichment (pronunciation alert badge if exists).
3. **Rating row** (4 buttons): مرة أخرى / صعبة / جيد / سهلة. Each button shows the predicted next-review interval underneath in small text ("بعد ١٠ ث" / "بعد يوم" / "بعد ٤ أيام" / "بعد ٩ أيام"). Compute via `rateCard` (pure, no DB) for each rating to preview intervals before commit.
4. On tap → call `applyRating`, animate card out, animate next card in.

Animation: Framer Motion. Card slides off in direction matching button (left for Again, up for Hard, right for Good, far-right for Easy).

Keyboard shortcuts: 1/2/3/4 = ratings; Space = reveal answer.

### E.3 — `src/components/srs/SrsSessionComplete.jsx`

Shown after the last card in a session:
- Confetti burst (subtle, premium — not cheesy)
- Stats: total reviewed, accuracy %, XP gained, time elapsed
- Streak indicator: "السلسلة: X يوم" (with fire emoji + new-record indicator if applicable)
- Buttons: "العودة للوحة" (return to SrsHome) | "مراجعة إضافية" (extra practice if cards remain)

### E.4 — `src/components/srs/SrsSettings.jsx`

Drawer (slides up from bottom on mobile, slides in from right on desktop). Reads/writes `profiles.srs_*` columns:
- **كلمات جديدة يومياً** — slider 0 / 5 / 10 / 20 / 30 / 50 (default 20)
- **حد المراجعات اليومية** — slider 50 / 100 / 200 / 300 / 500 (default 200)
- **ترتيب المراجعة** — segmented pills: حسب المستوى / عشوائي / حسب الوحدة (default level)
- **تشغيل الصوت تلقائياً** — toggle (default on)

Auto-save on change (no Save button — debounce 500ms then update). Show subtle saved-checkmark micro-animation.

### E.5 — `src/components/srs/SrsStatsCard.jsx`

Compact widget for use elsewhere (sidebar, future curriculum pages):
- Title: "مراجعة اليوم"
- Due count + new available + streak in single horizontal layout
- Tap → navigate to `/student/srs`

```bash
git add src/pages/student/SrsHome.jsx src/components/srs/
git commit -m "feat(srs): premium SrsHome dashboard + review session + settings + stats card"
git push origin main
```

---

## PHASE F — ROUTES + NAV

### F.1 — Register `/student/srs`

In the route definition file from A.2:
```jsx
{ path: '/student/srs', element: <SrsHome /> }
```

### F.2 — Sidebar nav

Add to `src/config/navigation.js` (or wherever nav items live):
```js
{
  label: 'مراجعة المفردات اليومية',
  href: '/student/srs',
  icon: BookOpenCheck, // from lucide-react
  order: <above curriculum, below dashboard>,
  badge: '<dynamic due-count if non-zero>', // computed in NavItem via useDueCount hook
}
```

Existing DailyReview route stays mounted and functional — it's the same data, refactored to FSRS. Don't break it.

```bash
git add src/App.jsx src/config/navigation.js src/components/layout/
git commit -m "feat(srs): mount /student/srs route + sidebar nav entry"
git push origin main
```

---

## PHASE G — RENAME + CLEANUP

### G.1 — Delete orphaned anki UI

```bash
git rm -r src/components/anki/
```

If any file in `src/` still imports from those paths after delete, refactor or delete that file too. Audit said the anki route was never mounted, so this should be safe.

### G.2 — Rename UI strings

```bash
# Find any user-facing "Anki" / "أنكي" strings
grep -rn -E "Anki|أنكي|انكي" src/ 2>/dev/null
```

Replace with:
- English UI: "Daily SRS Review" or just "Daily Review"
- Arabic UI: "مراجعة المفردات اليومية" or "المراجعة اليومية"

Don't rename internal variable names like `useSrs` or `srs.ts` — those are fine as-is.

```bash
git add src/
git commit -m "chore(srs): delete orphaned anki UI + rename remaining user-facing strings"
git push origin main
```

---

## PHASE H — SMOKE TEST

```bash
# TypeScript check on the SRS service
npx tsc --noEmit src/services/srs.ts
```

In code, simulate 4 ratings on a test card:
```ts
const testCard = {
  vocabulary_id: '<one of the 97 seeded uuids>',
  user_id: '<test profile id>',
  stability: 2.5,
  difficulty: 5.0,
  state: 'new',
  due: new Date(),
  reps: 0,
  lapses: 0,
  elapsed_days: 0,
  scheduled_days: 0,
};

console.log('Again →', rateCard(testCard, 1));
console.log('Hard →',  rateCard(testCard, 2));
console.log('Good →',  rateCard(testCard, 3));
console.log('Easy →',  rateCard(testCard, 4));
```

Print state transitions to stdout. Verify:
- Again → state becomes 'learning' or 'relearning', due ~10min from now, lapses incremented
- Hard → due in <1 day
- Good → due in 1-4 days depending on prior reps
- Easy → due in 4-9 days

Open Vercel deploy URL after final push. Verify:
- `/student/srs` loads, shows SrsHome
- Sidebar shows "مراجعة المفردات اليومية" entry
- Old DailyReview route still loads (no 404)
- 97 existing SRS rows visible via Supabase MCP `SELECT * FROM curriculum_vocabulary_srs WHERE state IS NOT NULL LIMIT 5;`

---

## 📊 FINAL REPORT

Write `docs/vocab-section/PHASE-C-SRS-UPGRADE-REPORT.md`:

```markdown
# SRS Upgrade — Final Report

## Migration outcome
- curriculum_vocabulary_srs rows: X (97 expected)
- All rows fsrs_seeded_at: X (== row count)
- anki_cards: dropped ✓
- anki_review_logs: dropped ✓
- srs_review_logs: created ✓ with N policies
- profiles SRS columns: added ✓

## Code summary
- Files created: <list>
- Files modified: <list>
- Files deleted: <list>
- npm packages added: ts-fsrs <version>

## Smoke test
<paste console output of 4-rating simulation>

## URLs to verify
- /student/srs (new)
- /student/<existing daily review path> (still working)

## Deferred / known gaps
<anything not done>
```

```bash
git add docs/vocab-section/PHASE-C-SRS-UPGRADE-REPORT.md
git commit -m "docs(srs): phase C upgrade final report"
git push origin main
```

---

## ⚠️ HARD RULES (RECAP)

1. 97 existing rows preserved end-to-end.
2. No DROP COLUMN on `curriculum_vocabulary_srs`. Additive only.
3. Atomic phase commits. Push after each. Vercel deploys each one.
4. Hooks at top of components. No conditional hooks.
5. profile.id, never user.id.
6. .select() after every .update().
7. No `vite build` locally.
8. If migration fails mid-phase, revert that phase's commit before proceeding.

Begin Phase A.
