# 🤖 AGENT-DRIVEN VERIFY-AND-FIX UNTIL DONE (2026-05-19)

> **Move + execute (Mac):**
> ```bash
> mv ~/Downloads/AGENT-DRIVEN-VERIFY-AND-FIX-UNTIL-DONE-2026-05-19.md \
>    /Users/dr.ali/Projects/fluentia-lms/prompts/agents/
> cd /Users/dr.ali/Projects/fluentia-lms
> git pull --rebase origin main
> claude
> ```
> Then in Claude Code:
> ```
> Read and execute prompts/agents/AGENT-DRIVEN-VERIFY-AND-FIX-UNTIL-DONE-2026-05-19.md
> ```

---

## 🎯 MISSION

The user (Ali) will not be running browser checks. You verify everything yourself, programmatically. You loop until the bug is gone or you have hard evidence the bug cannot exist. You ship.

**The bug:** Real students see Article A on screen in the reading section but the audio reads Article B. This has survived three commits (`ecbd0d1`, `e4ef9f7`, `0d4ec39`). Stop assuming previous work is sufficient. Verify with authenticated student sessions, find what's still leaking, fix it.

**Scope:** Reading section text/audio sync. Specifically test unit `00ca3625-46ee-4e38-95da-2255f522aff8` (Level 5 / "ذكاء الأسراب"), test with `sarashrahili22@gmail.com` as control + one student with `user_interests` populated as test.

---

## 📁 ENVIRONMENT

- **Working dir:** `/Users/dr.ali/Projects/fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md` — load and obey
- **DB:** Supabase prod (`nmjexpuycmqcxuxljier`, Frankfurt Pro) via `mcp__supabase__*`
- **Branch:** `main`. Pull-rebase before starting.
- **Existing commits to build on (not revert):** `ecbd0d1`, `e4ef9f7`, `0d4ec39`
- **NODE_OPTIONS:** `export NODE_OPTIONS="--dns-result-order=ipv4first"`

---

## ⚠️ STRICT RULES

1. **Verify before declaring success.** Do not output "DONE" unless an automated test you wrote and ran proves the bug is gone.
2. **No browser checks asked of the user.** Every verification step runs from this terminal.
3. **No `audio_url IS NOT NULL` filters.** Inspect every row.
4. **Authenticated-session tests are mandatory.** Service-role-only tests are why we've shipped 3 broken fixes already. Use the codebase's existing admin → student impersonation mechanism. If you can't find one, mint a session JWT directly from the service-role key + admin API (`supabase.auth.admin.generateLink` then redeem, or `supabase.auth.admin.createUser`-style helpers — find the working pattern, don't ask).
5. **If you can't authenticate as a student**, fall back to running the test SQL with `SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = '{"sub":"<profile_id>","role":"authenticated"}'::jsonb;` — this replicates RLS-effective behavior without needing a real session.
6. **Loop until clean.** If your test finds a divergence, fix it, then re-run your test. Repeat until the test passes. Commit only when it passes.
7. **No student data writes.** No DB destructive ops.
8. **Hooks before guards.**
9. **`.select()` after every `.update()` / `.upsert()`.**
10. **No `vite build` locally.**
11. **Mac shell.**
12. **Idempotent.**

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 1 — Build the authenticated-session test that the previous prompts didn't actually run
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1.1 — Find the impersonation mechanism

Search for existing admin "view as student" code in the codebase:

```bash
grep -rn "impersonate\|view.as.student\|signInWithUserId\|createSession\|admin.*token" src/ supabase/functions/ 2>/dev/null | head -30
grep -rn "auth\.admin\." src/ 2>/dev/null | head -20
```

Use whatever the codebase already does. If nothing works, mint a session like this:

```javascript
const { data: { session }, error } = await supabaseAdmin.auth.admin.createUser({
  email: 'temp-test-' + Date.now() + '@fluentia.local',
  email_confirm: true,
  user_metadata: {}
});
// then sign in as that user for an anon-key client
```

…then delete the temp user after the test. OR use the `SET LOCAL` SQL approach from rule 5 if session minting fails.

### 1.2 — The actual test (test, not audit)

Write `scripts/audits/verify-and-fix/01-authenticated-divergence.cjs`. For each of:
- The test unit `00ca3625-46ee-4e38-95da-2255f522aff8`
- Two student profiles: one WITH `user_interests`, one WITHOUT (Sara: `sarashrahili22@gmail.com`)

Run, for each profile:

```sql
-- Simulate the exact RLS context the student would have
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = jsonb_build_object('sub', '<profile_id>', 'role', 'authenticated');

-- Run the exact query the reading-section hook runs
-- (extract the query from src/hooks/useReadingArticles.js or whatever the actual hook is — DO NOT GUESS)
SELECT id, title_ar, title_en, body_ar, audio_url, audio_duration_ms, order_index, ...
FROM curriculum_reading
WHERE unit_id = '00ca3625-46ee-4e38-95da-2255f522aff8'
ORDER BY order_index;
```

Compare the rows returned for each profile. If a single field differs between the two profiles for the same `order_index`, you've found a live leak.

Also independently check:
- The actual `useReadingArticles` (or equivalent) source — what does it select? Is the field list complete?
- Where does `audio_url` come from in the React tree? Is it the same row as `body_ar`?

### 1.3 — Test what the AUDIO PLAYER actually receives

The previous fix added `key={reading.id}` on `<SmartAudioPlayer>`. Verify that change is still in effect:

```bash
grep -n "key={reading.id}" src/pages/student/curriculum/tabs/ReadingTab.jsx
grep -n "key=" src/components/audio/ 2>/dev/null
```

Now trace, from `ReadingTab` → article selector → text body → audio player: **what variable feeds the audio player's `audioUrl`?**

Specifically check:
- Does the parent pass `currentArticle.audio_url`?
- Or does it pass `articles[currentIndex].audio_url`?
- Or does the audio player fetch its own data via a separate hook?
- Is there a `useReadingAudio(articleId)` or similar that fetches independently from text?

If the audio player has its own fetch hook, that's a near-certain divergence vector — the text component and the audio component can resolve to different rows.

### 1.4 — Run the test

Run `01-authenticated-divergence.cjs`. Capture output to `docs/audits/verify-and-fix/divergence.json`.

If the test reports divergence between the two profiles → personalization is still leaking somewhere. Go to Phase 2.

If the test reports no divergence between profiles BUT the audio player path traces to a different row than the text path → the bug is structural. Go to Phase 3.

If neither shows divergence → run Phase 4 (no-bug-found exhaustive check before declaring victory).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 2 — If divergence found: kill it at the actual layer
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 2.1 — Find the layer

```sql
-- All RLS policies on curriculum tables
SELECT schemaname, tablename, policyname, cmd, qual::text, with_check::text
FROM pg_policies
WHERE tablename ILIKE 'curriculum_%' OR tablename ILIKE '%reading%'
ORDER BY tablename, policyname;

-- All views that join personalization
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (view_definition ILIKE '%user_interest%'
    OR view_definition ILIKE '%personalized%'
    OR view_definition ILIKE '%variant%');

-- All functions/RPCs that touch personalization
SELECT proname, prosrc
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND (prosrc ILIKE '%user_interest%'
    OR prosrc ILIKE '%personalized%'
    OR prosrc ILIKE '%variant%')
ORDER BY proname;
```

Find the SPECIFIC policy/view/function that, given the test profile's interest state, returns a different row than canonical.

### 2.2 — Kill it (preserve data)

For RLS policies: drop the offending policy, recreate as canonical-only (`USING (true)` for SELECT).

For views: `CREATE OR REPLACE VIEW <name> AS SELECT * FROM curriculum_reading WHERE ...` — canonical-only.

For functions: replace body with canonical-only equivalent.

Apply each via `mcp__supabase__apply_migration` with idempotent migrations:

```sql
-- supabase/migrations/<NNN>_kill_<specific_layer>_personalization.sql
DROP POLICY IF EXISTS "<name>" ON curriculum_reading;
CREATE POLICY "canonical_reading_select" ON curriculum_reading
  FOR SELECT TO authenticated USING (true);
```

### 2.3 — Re-run the test from Phase 1

```bash
node scripts/audits/verify-and-fix/01-authenticated-divergence.cjs
```

If still divergent → another layer is leaking. Repeat 2.1–2.3 until the test passes.

If the test now passes for both profiles → divergence is killed. Continue to Phase 3 (which validates the player path, even if Phase 2 was the fix — both paths need to be clean).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 3 — Validate the audio player path matches the text path
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 3.1 — Headless browser simulation

Use `playwright` or `puppeteer` (whichever is already installed; if neither, install `playwright` to `devDependencies` only). Run a headless test against `https://app.fluentia.academy`:

```javascript
// scripts/audits/verify-and-fix/02-headless-reading-test.cjs
const { chromium } = require('playwright');

const TEST_UNIT_URL = 'https://app.fluentia.academy/student/curriculum/unit/00ca3625-46ee-4e38-95da-2255f522aff8';
const STUDENTS = [
  { email: 'sarashrahili22@gmail.com', password: '<from a known test credential>' },
  // also one with interests if discoverable
];

(async () => {
  for (const student of STUDENTS) {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // Login
    await page.goto('https://app.fluentia.academy/login');
    await page.fill('input[type="email"]', student.email);
    await page.fill('input[type="password"]', student.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|curriculum/, { timeout: 15000 });

    // Navigate to the reading section of the test unit
    await page.goto(TEST_UNIT_URL);
    await page.click('text=القراءة');
    await page.waitForLoadState('networkidle');

    // Capture: title on screen + audio src
    const titleA = await page.textContent('h1, h2, [data-reading-title]');
    const audioSrc = await page.getAttribute('audio', 'src');

    // Verify: audio src is the canonical audio_url for the article displayed
    // Cross-check via DB
    const expectedAudio = await getCanonicalAudioForTitle(titleA);
    const verdict = audioSrc === expectedAudio ? 'OK' : 'MISMATCH';

    // Also: click to a second article, repeat
    // ... etc

    console.log(`${student.email}: titleA="${titleA}" audio=${audioSrc} verdict=${verdict}`);
    await browser.close();
  }
})();
```

If you can't get headless authentication working in 20 minutes of trying: write a Node-level test that does the same thing without a browser — uses the Supabase JS client as an authenticated student session, calls the same data hooks the reading page calls, asserts text + audio refer to the same row id.

### 3.2 — If mismatch found

The bug is in the React component tree — text + audio aren't sharing source of truth. Apply this exact fix in `src/pages/student/curriculum/tabs/ReadingTab.jsx` (or whatever the actual file is):

```jsx
// Find where currentArticle is computed
// Ensure ONE source of truth — currentArticle.id drives BOTH:
//   1. The text component
//   2. The audio player's audioUrl prop

const currentArticle = articles?.find(a => a.id === currentArticleId) ?? articles?.[0];

// Then for the audio player
<SmartAudioPlayer
  key={currentArticle.id}   // forces remount on article switch
  audioUrl={currentArticle.audio_url}
  durationMs={currentArticle.audio_duration_ms}
  // ...
/>
```

If the player is fetching independently (its own `useReadingAudio(articleId)` hook), refactor: take the audio data from the parent's `currentArticle`, no separate fetch.

### 3.3 — Re-run the headless/data test until it passes

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 4 — No-bug-found exhaustive check (only if Phase 1 & 3 both clean)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If the authenticated-session test passes AND the headless test passes, but Ali still reports the bug, the cause might be:

### 4.1 — Per-student state hydration from old localStorage

```javascript
// scripts/audits/verify-and-fix/03-state-hydration-audit.cjs
// Inspect the app's bootstrap path:
//   - What localStorage / sessionStorage keys does the app read on load?
//   - Does any of them influence which article is "current" in the reading section?
//   - Does the recent client-state purge from commit 0d4ec39 cover every such key?
```

Specifically grep for localStorage reads in any reading-related path. The earlier purge covered `fluentia:interest*`, `personalizationEnabled`, but might have missed something specific like:
- `fluentia:lastReadingArticle:<unitId>` (per-unit last-read state)
- `fluentia:variantOverride`
- Any key matching `/variant|interest|personali/i`

Add any missed keys to the purge list. Re-deploy.

### 4.2 — Service Worker / PWA cache

Check if a service worker is caching stale article responses:

```bash
ls public/
grep -rn "serviceWorker\|workbox\|sw\.js" src/ public/ 2>/dev/null
cat public/sw.js 2>/dev/null | head -40
```

If a service worker exists and caches API responses, students on returning visits may get stale personalized variants from the cache even after the DB layer is clean.

Fix: bump the service-worker cache version (`CACHE_VERSION = 'v<incremented>'`) and add a `skipWaiting()` in the SW so it activates immediately.

### 4.3 — CDN / Vercel edge cache

If reading content is served through any cached path (Vercel edge functions, image CDN, etc.), check Cache-Control headers:

```bash
curl -sI https://app.fluentia.academy/student/curriculum/unit/00ca3625... | grep -i cache
```

If you find `s-maxage` > 0 on dynamic content, that explains stale data per student. Fix by setting `Cache-Control: no-store` on the relevant routes/endpoints.

### 4.4 — Auth cache in Supabase JS client

The Supabase JS client caches the user session. If a student logs in fresh post-fix, behavior should be correct. But if they have a long-lived session, the JWT might still encode old role/claims. Verify the JWT structure doesn't include any personalization context.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 5 — Self-check + commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 5.1 — All assertions must pass

1. `node scripts/audits/verify-and-fix/01-authenticated-divergence.cjs` → 0 divergences
2. `node scripts/audits/verify-and-fix/02-headless-reading-test.cjs` (or data-level equivalent) → 0 mismatches across 4 article switches per test student
3. `grep -rn "from('personalized\|from(\"personalized\|from('user_interests\|from(\"user_interests" src/` → 0 (read paths in app code)
4. `app_config.personalization_enabled = false` confirmed via authenticated SELECT
5. `key={...}` defensive remount on `SmartAudioPlayer` confirmed present
6. ESLint clean on all touched files
7. No student data written

### 5.2 — Final report

`docs/audits/verify-and-fix/FINAL-REPORT.md`:

```markdown
# Verify-and-Fix-Until-Done — Final Report (2026-05-19)

## What the previous 3 commits did vs. what was still broken
- ecbd0d1: hid UI surfaces
- e4ef9f7: fixed useAudioEngine deps
- 0d4ec39: kill-switch + RLS + view + function + client purge

## What this run actually found and fixed
- Phase 1 authenticated divergence test: <found / clean>
- Phase 2 layer killed (if any): <name>
- Phase 3 headless reading test: <found / clean>
- Phase 4 hydration / SW / cache fix (if any): <details>

## Final test results
- Authenticated test: PASS (0 divergences across N profiles × M units)
- Headless test: PASS (0 mismatches across K article switches)

## Commit
- SHA: <will be filled after commit>
```

### 5.3 — Commit + push

```bash
git add src/ supabase/migrations/ supabase/functions/ public/ \
        scripts/audits/verify-and-fix/ \
        docs/audits/verify-and-fix/

git commit -m "fix(reading): close text/audio mismatch loop — automated verify-and-fix run

WHY THIS WAS NEEDED:
Three previous commits (ecbd0d1, e4ef9f7, 0d4ec39) shipped but the bug
persisted in production. Each verified with service-role queries (which
bypass RLS) or with hooks that didn't replicate the authenticated student
session that real users have.

WHAT THIS RUN DID:
- Built an authenticated-session test (Phase 1) that replicates real
  student RLS context and compares rows returned for students with vs
  without user_interests.
- Built a headless reading-flow test (Phase 3) that simulates the full
  click-through (article A → press play → switch to B → press play →
  switch back to A) and asserts text + audio + karaoke stay in lockstep.
- <Phase 2 finding: e.g., RLS policy X was still routing through
  user_interests; dropped + recreated as canonical-only.>
- <Phase 3 finding: e.g., SmartAudioPlayer was getting audioUrl from a
  separate fetch hook; refactored to share the parent's currentArticle.>
- <Phase 4 finding: e.g., localStorage key 'fluentia:lastReadingArticle'
  was hydrating stale state; added to client purge list.>

VERIFICATION:
- Authenticated divergence test: 0 mismatches
- Headless reading test: 0 mismatches across 4 article switches × 2 students

NOT TOUCHED:
- No student data writes
- No destructive DB changes (variant data, interest tags, audio files all preserved)
- Listening flow untouched
- Vocab flow untouched"

git push origin main
git fetch origin
git log --oneline -3 HEAD
git log --oneline -3 origin/main
```

Confirm HEAD == origin/main.

---

## ⛔ DO NOT

- ❌ Output "DONE" without running an automated test that proves the bug is gone
- ❌ Ask Ali to do browser checks — verify yourself
- ❌ Trust service-role queries alone (this is what failed 3 times)
- ❌ DELETE personalization data
- ❌ Stop after Phase 1 if it's clean — Phase 3 must also pass
- ❌ Use placeholder "<find_this>" in commit messages — fill them in with real findings

## ✅ FINISH LINE

- Both your automated tests (authenticated + headless/data-level) report 0 mismatches
- One commit pushed to `origin/main`
- `docs/audits/verify-and-fix/FINAL-REPORT.md` exists with concrete findings (not placeholders)

End of prompt.
