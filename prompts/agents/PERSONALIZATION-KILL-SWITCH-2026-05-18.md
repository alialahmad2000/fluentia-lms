# 🔒 PERSONALIZATION KILL-SWITCH — FORCE CANONICAL FOR EVERY STUDENT (2026-05-18)

> **URGENT — this is the third attempt at killing personalization. Previous attempts (ecbd0d1, e4ef9f7) ran service-role audits that bypassed RLS and missed the actual redirect mechanism. This run tests with authenticated-student JWTs.**
>
> **Move + execute (Mac):**
> ```bash
> mv ~/Downloads/PERSONALIZATION-KILL-SWITCH-2026-05-18.md \
>    /Users/dr.ali/Projects/fluentia-lms/prompts/agents/
> cd /Users/dr.ali/Projects/fluentia-lms
> git pull --rebase origin main
> claude
> ```
> Then in Claude Code:
> ```
> Read and execute prompts/agents/PERSONALIZATION-KILL-SWITCH-2026-05-18.md
> ```

---

## 🎯 MISSION

Every student must see the **canonical curriculum**. Not a per-student variant. Not a hybrid. Not a "mostly canonical with some personalized." **Canonical. Single source of truth. Same for everyone.**

Two previous prompts attempted this:
- **`ecbd0d1`** — hid 3 UI mount points (interest survey card, settings section, personalized reading card). Audit concluded personalization was an isolated drawer.
- **`e4ef9f7`** — fixed a `useAudioEngine` useEffect dep bug. Verified 10/10 across multi-article units.

Both ran their verification against **service-role queries**, which bypass RLS. Real students authenticated with their JWT may be hitting a redirect layer that the audits couldn't see:

1. **RLS policy** on `curriculum_reading` (or similar) that conditionally returns variant rows for students with `user_interests`
2. **Supabase view** (e.g., `v_student_reading`) that joins against `user_interests`
3. **Supabase RPC/function** (e.g., `get_student_curriculum`) that does the substitution server-side
4. **Edge function** that intermediates between client and DB and applies interest-based redirect
5. **Client-side state hydration** — students who previously enabled personalization have `selectedVariantId` in localStorage/IndexedDB; UI is hidden but cached state still feeds the article-loader

This prompt finds the actual mechanism, kills it at the lowest possible layer, and adds a global feature flag as belt-and-suspenders so no unknown future code path can resurrect personalization accidentally.

---

## 📁 ENVIRONMENT

- **Working dir:** `/Users/dr.ali/Projects/fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md` — load and obey
- **DB:** Supabase prod (`nmjexpuycmqcxuxljier`, Frankfurt Pro)
- **MCP tools:** `mcp__supabase__list_tables`, `mcp__supabase__execute_sql`, `mcp__supabase__apply_migration`
- **Branch:** `main`. Pull-rebase before starting.
- **Critical:** `.env` must have BOTH the service-role key (for forensic comparison) AND the anon/public key (for authenticated-session testing).

---

## ⚠️ STRICT RULES

1. **Test with authenticated-student JWT, not service-role.** Service-role bypasses RLS — that's how the previous audits missed the actual redirect. Every "does a student see canonical" check must use a real student session.
2. **NO destructive data changes.** Do not DELETE rows from `personalized_readings`, `user_interests`, or any personalization table. Disable read paths, don't destroy data — future opt-in feature might need the data.
3. **Add a global kill-switch.** Even after fixing every found redirect, add a `app_config.personalization_enabled` boolean (or equivalent) hard-defaulted false. Every code path that touches personalization must check it. Belt-and-suspenders.
4. **Clear client-side state.** Students with cached personalization state must be reset on next load.
5. **No student data writes.** No submissions, no unit_progress, no xp_transactions.
6. **Hooks before guards.**
7. **`profile?.id` not `user?.id`.**
8. **`.select()` after every `.update()` / `.upsert()`.**
9. **No `vite build` locally.**
10. **Mac shell.**
11. **Idempotent.** Re-runnable.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Authenticated forensic audit
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 — Find a known-affected student to test with

```sql
-- Students with user_interests populated (most likely to see variant content)
SELECT
  p.id AS profile_id,
  p.email,
  p.full_name,
  COUNT(ui.id) AS interest_count,
  MIN(ui.created_at) AS first_interest_at
FROM profiles p
JOIN user_interests ui ON ui.user_id = p.id  -- or whichever join column
WHERE ui.active IS NOT FALSE
GROUP BY p.id, p.email, p.full_name
HAVING COUNT(ui.id) > 0
ORDER BY interest_count DESC
LIMIT 5;
```

Pick one. Record `profile_id` and `email`. This is the test student.

Also pick a **control student** — same level/group, no `user_interests`:

```sql
SELECT p.id, p.email, p.full_name
FROM profiles p
LEFT JOIN user_interests ui ON ui.user_id = p.id
WHERE ui.id IS NULL
  AND p.role = 'student'  -- adjust column if different
LIMIT 1;
```

### A.2 — Pick the test unit

```sql
-- A unit with multiple reading articles, ideally one a student would currently be in
SELECT unit_id, COUNT(*) AS article_count
FROM curriculum_reading
GROUP BY unit_id
HAVING COUNT(*) >= 2
ORDER BY article_count DESC
LIMIT 5;
```

Record `unit_id` of the chosen unit.

### A.3 — Compare authenticated-student SELECT vs service-role SELECT

This is the critical step the previous audits skipped.

Write `scripts/audits/personalization-killswitch/01-impersonate-and-compare.cjs`:

```javascript
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const TEST_PROFILE_ID = '<from A.1>';
const CONTROL_PROFILE_ID = '<from A.1>';
const TEST_UNIT_ID = '<from A.2>';

(async () => {
  fs.mkdirSync('docs/audits/personalization-killswitch', { recursive: true });

  // 1. Service-role view (the "ground truth" the previous audits used)
  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: serviceRoleRows, error: svcErr } = await svc
    .from('curriculum_reading')
    .select('id, unit_id, title_ar, title_en, body_ar, audio_url, audio_duration_ms, order_index')
    .eq('unit_id', TEST_UNIT_ID)
    .order('order_index');
  if (svcErr) throw svcErr;

  // 2. Generate JWT for the test student
  const { data: testJwt, error: testJwtErr } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email: '<test student email>',
  });
  // Alternative: use the impersonate pattern your codebase already uses for admin → student
  // If your codebase has a custom impersonation mechanism, use it.

  // For Supabase JS v2, the right approach is:
  //   const { data: { user } } = await svc.auth.admin.getUserById(TEST_PROFILE_ID);
  //   Then create a session token via the admin API.
  // Adjust to whatever your codebase uses for admin impersonation (already established for tools like Hajar's view-as-student).

  const testSession = await mintStudentSession(svc, TEST_PROFILE_ID);
  const auth = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${testSession.access_token}` } },
  });

  // 3. Run the SAME SELECT as authenticated student
  const { data: studentRows, error: studentErr } = await auth
    .from('curriculum_reading')
    .select('id, unit_id, title_ar, title_en, body_ar, audio_url, audio_duration_ms, order_index')
    .eq('unit_id', TEST_UNIT_ID)
    .order('order_index');
  if (studentErr) throw studentErr;

  // 4. Compare row by row
  const result = {
    test_profile_id: TEST_PROFILE_ID,
    test_unit_id: TEST_UNIT_ID,
    service_role_count: serviceRoleRows.length,
    student_count: studentRows.length,
    rows_differ: false,
    differences: [],
  };

  const svcMap = new Map(serviceRoleRows.map(r => [r.order_index, r]));
  const stdMap = new Map(studentRows.map(r => [r.order_index, r]));
  const allOrderIndexes = new Set([...svcMap.keys(), ...stdMap.keys()]);

  for (const oi of allOrderIndexes) {
    const s = svcMap.get(oi);
    const t = stdMap.get(oi);
    if (!s || !t) {
      result.rows_differ = true;
      result.differences.push({ order_index: oi, service: s?.id, student: t?.id, note: 'present in only one' });
      continue;
    }
    const fieldsToCompare = ['id', 'title_ar', 'body_ar', 'audio_url', 'audio_duration_ms'];
    const differing = fieldsToCompare.filter(f => s[f] !== t[f]);
    if (differing.length > 0) {
      result.rows_differ = true;
      result.differences.push({
        order_index: oi,
        service_id: s.id,
        student_id: t.id,
        diff_fields: differing,
        service_title: s.title_en,
        student_title: t.title_en,
        service_audio: s.audio_url,
        student_audio: t.audio_url,
      });
    }
  }

  fs.writeFileSync(
    'docs/audits/personalization-killswitch/impersonation-comparison.json',
    JSON.stringify(result, null, 2)
  );

  console.log(`rows_differ: ${result.rows_differ}`);
  console.log(`differences: ${result.differences.length}`);
  if (result.rows_differ) {
    console.log('🔴 PERSONALIZATION IS ACTIVE AT THE DATA LAYER.');
    console.log('Sample diff:');
    console.log(JSON.stringify(result.differences[0], null, 2));
  } else {
    console.log('🟢 Service-role and student-session queries return identical rows. Personalization is NOT in the data layer.');
  }
})();

async function mintStudentSession(supabase, profileId) {
  // Implementation depends on the codebase's existing impersonation pattern.
  // Likely options:
  //   1. supabase.auth.admin.generateLink({type: 'magiclink', email})
  //      + automatic token extraction
  //   2. A custom edge function /v1/admin/impersonate that returns an access_token
  //   3. Direct JWT minting if the codebase has the JWT secret available
  // Use whichever pattern Ali's admin "view as student" feature already uses
  // (this exists — referenced as "Hajar/Hawazen view-as-student" in past sessions).
  throw new Error('IMPLEMENT THIS using the codebase\'s existing impersonation pattern. Search src/ for "view as student" or "impersonate".');
}
```

Run it. The output verdict is the most important single signal in this whole prompt.

### A.4 — If A.3 confirms rows differ → find the mechanism

Personalization IS at the data layer. Find which layer:

#### A.4.1 — RLS policies

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('curriculum_reading', 'curriculum_listening', 'curriculum_vocabulary')
ORDER BY tablename, policyname;
```

Look for ANY policy with a CASE statement on `user_interests`, `personalized_readings`, or anything joining against interest tables. That's the mechanism.

#### A.4.2 — Views

```sql
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (view_definition ILIKE '%personalized%'
    OR view_definition ILIKE '%user_interests%'
    OR view_definition ILIKE '%variant%');
```

#### A.4.3 — Functions/RPCs

```sql
SELECT proname, prosrc
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND (prosrc ILIKE '%personalized%'
    OR prosrc ILIKE '%user_interests%'
    OR prosrc ILIKE '%variant%')
ORDER BY proname;
```

#### A.4.4 — Edge functions

```bash
ls supabase/functions/
grep -rln "personali\|variant\|user_interests" supabase/functions/ 2>/dev/null
```

For each function found, read its body and identify if it does interest-based row substitution.

#### A.4.5 — Client-side state hydration

```bash
# Anywhere localStorage/sessionStorage stores curriculum-related state
grep -rn "localStorage\|sessionStorage\|indexedDB" src/ 2>/dev/null | grep -iE "reading|article|variant|personali|curriculum" | head -30

# React Query keys involving personalization
grep -rn "queryKey.*\[\s*['\"]personali\|queryKey.*\[\s*['\"]variant" src/ 2>/dev/null | head -20

# URL/router state involving variants
grep -rn "useSearchParams\|searchParams\.get" src/ 2>/dev/null | grep -iE "variant|personali" | head -20
```

### A.5 — Phase A report

`docs/audits/personalization-killswitch/PHASE-A-REPORT.md`:

```markdown
# Phase A — Personalization Kill-Switch Audit

## Test setup
- Test student (has interests): <profile_id> / <email>
- Control student (no interests): <profile_id>
- Test unit: <unit_id> with <N> articles

## Impersonation comparison
- Service-role rows: N
- Student-session rows: N
- rows_differ: YES/NO
- Sample difference: <verbatim>

## Mechanism found (if rows_differ = YES)
- Layer: <RLS_POLICY | VIEW | FUNCTION_RPC | EDGE_FUNCTION | CLIENT_HYDRATION>
- Specific name: <e.g., curriculum_reading_personalized_select_policy>
- Definition (verbatim): <SQL or code>

## Other layers checked (for completeness)
- RLS policies on curriculum_*: <count, names>
- Views joining user_interests: <count, names>
- Functions referencing personalization: <count, names>
- Edge functions: <list>
- Client hydration sources: <localStorage keys, query keys, URL params>

## Fix plan
<exact change(s) needed, layer by layer>
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Kill personalization at the source
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Apply fixes layer by layer, in order of "deepest first."

### B.1 — Drop or rewrite personalization RLS policies

If Phase A.4.1 found an RLS policy doing interest-based redirect:

```sql
-- supabase/migrations/<NNN>_drop_personalization_rls.sql

-- Drop the offending policy
DROP POLICY IF EXISTS "<exact policy name from A.4.1>" ON curriculum_reading;

-- Recreate as canonical-only SELECT for authenticated users
DROP POLICY IF EXISTS "canonical_curriculum_reading_select" ON curriculum_reading;
CREATE POLICY "canonical_curriculum_reading_select" ON curriculum_reading
  FOR SELECT
  TO authenticated
  USING (true);  -- All students see all canonical reading rows (RLS-level scoping by unit/level happens at query time, not policy time)
```

Apply via `mcp__supabase__apply_migration`.

If the policy was on multiple tables (`curriculum_listening`, etc.), drop+recreate each.

### B.2 — Drop or rewrite personalization views

If Phase A.4.2 found a view doing the redirect:

```sql
-- The codebase might import this view. Don't DROP it — replace it with a canonical-only definition.
CREATE OR REPLACE VIEW <view_name> AS
SELECT * FROM curriculum_reading;  -- adjust columns to match original view signature
```

### B.3 — Disable or no-op personalization functions

```sql
-- For each personalization function found:
-- Option A: drop it entirely (only if no callers)
-- Option B: replace its body with a canonical-only equivalent

CREATE OR REPLACE FUNCTION <func_name>(p_profile_id uuid, p_unit_id uuid)
RETURNS SETOF curriculum_reading
LANGUAGE sql STABLE
AS $$
  SELECT * FROM curriculum_reading WHERE unit_id = p_unit_id ORDER BY order_index;
$$;
```

### B.4 — Edge functions

For each personalization-aware edge function:
- If still used: replace its body so it returns canonical-only data
- If no longer called: leave deployed but log a deprecation notice

Re-deploy via `supabase functions deploy <name> --no-verify-jwt --project-ref nmjexpuycmqcxuxljier`.

### B.5 — Client-side state purge

#### B.5.1 — Detect and clear stale personalization state on app load

In `src/main.jsx` or the equivalent app-bootstrap file, add (immediately after the imports, before React renders):

```javascript
// PERSONALIZATION-KILL-SWITCH 2026-05-18 — clear any stale state from before the revert
const STALE_KEYS_TO_PURGE = [
  // Add every key Phase A.4.5 found, e.g.:
  'fluentia:selectedVariantId',
  'fluentia:personalizationEnabled',
  'fluentia:interestPickerSeen',
  // ...
];

try {
  for (const key of STALE_KEYS_TO_PURGE) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
} catch (e) {
  console.warn('[personalization-purge] cleanup error', e);
}
```

#### B.5.2 — React Query keys purge

If any query keys reference personalization (e.g., `['personalized-reading', ...]`), invalidate them on app load:

```javascript
// In the QueryClient setup or app bootstrap:
queryClient.removeQueries({ queryKey: ['personalized-reading'] });
queryClient.removeQueries({ queryKey: ['variant'] });
// ...etc for whatever keys Phase A found
```

#### B.5.3 — URL/router param strip

If any route accepts a `?variant=X` query param: at the router-guard level, strip it before rendering. This prevents a bookmarked URL from re-injecting personalization state.

### B.6 — The global kill-switch (belt-and-suspenders)

Add a global feature flag so even an unknown future code path can't accidentally re-enable personalization:

```sql
-- supabase/migrations/<NNN>_app_config_personalization_killswitch.sql

CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO app_config (key, value)
VALUES ('personalization_enabled', 'false'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = 'false'::jsonb, updated_at = now();

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_config readable by all authenticated" ON app_config;
CREATE POLICY "app_config readable by all authenticated" ON app_config
  FOR SELECT TO authenticated USING (true);
```

Then in `src/lib/featureFlags.js` (create if doesn't exist):

```javascript
import { supabase } from './supabaseClient';

let cached = null;

export async function isPersonalizationEnabled() {
  if (cached !== null) return cached;
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'personalization_enabled')
      .single();
    if (error) throw error;
    cached = data?.value === true;
    return cached;
  } catch (e) {
    return false;  // fail-safe: when in doubt, disabled
  }
}
```

Wrap any remaining personalization code path with:

```javascript
import { isPersonalizationEnabled } from '@/lib/featureFlags';

const enabled = await isPersonalizationEnabled();
if (!enabled) return canonicalData;
```

### B.7 — Do NOT delete data

Reiterate: `personalized_readings` rows, `user_interests` rows, variant audio files — ALL STAY in the DB. Only the read paths and UI surfaces are killed. Future opt-in feature can resurrect everything.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Verify with authenticated sessions
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### C.1 — Re-run the impersonation comparison

```bash
node scripts/audits/personalization-killswitch/01-impersonate-and-compare.cjs
```

**Expected:** `rows_differ: false` for both the test student (has interests) and the control student (no interests). They must see identical rows now.

### C.2 — Three-profile sweep

```javascript
// scripts/audits/personalization-killswitch/02-three-profile-sweep.cjs
// For each of 3 profiles:
//   1. Test student with many interests
//   2. Control student with zero interests
//   3. Test student with interests + manually-set localStorage entry simulating stale state
// Run the impersonation comparison across 5 units (different levels, different article counts)
// All 15 combinations (3 profiles × 5 units) must return identical canonical rows.
```

### C.3 — Manual UI walkthrough list

Write `docs/audits/personalization-killswitch/MANUAL-WALKTHROUGH.md`:

```markdown
# Manual Walkthrough — Personalization Kill-Switch Verification

## Test as a real student with interests

1. Log in as <test student email>
2. Navigate to Level X / Unit Y reading section
3. Confirm:
   - The article displayed matches what the canonical curriculum has
   - Press play — audio reads the same article shown on screen
   - Switch to Article 2 — text + audio + karaoke all update together
4. Open DevTools → Application → Local Storage
   - Confirm no keys starting with `fluentia:variant`, `fluentia:selected`, `fluentia:personali`
5. Open DevTools → Console
   - Type `await window.supabase.from('app_config').select('*').eq('key', 'personalization_enabled').single()`
   - Confirm `value: false`

## Test as the control student

1. Log out, log in as <control student email>
2. Same checks as above
3. Should see identical content to the test student
```

### C.4 — Cache sanity

```bash
# Confirm no remaining references to personalized_readings or user_interests in read paths
grep -rn "from('personalized\|from(\"personalized\|from('user_interests\|from(\"user_interests" src/ 2>/dev/null
# Expected: ZERO matches in src/. Allowed: docs/, scripts/audits/, comments.
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### D.1 — Final report

`docs/audits/personalization-killswitch/FINAL-REPORT.md`:

```markdown
# Personalization Kill-Switch — Final Report (2026-05-18)

## What previous prompts missed
<one-paragraph: which layer the previous audits couldn't see and why>

## Layer killed
- RLS policy: <name dropped + replaced with canonical-only> (or NONE)
- View: <name updated> (or NONE)
- Function/RPC: <name updated> (or NONE)
- Edge function: <name updated> (or NONE)
- Client hydration: <localStorage keys purged> (or NONE)

## Global kill-switch
- Table: app_config
- Key: personalization_enabled
- Value: false
- Helper: src/lib/featureFlags.js — isPersonalizationEnabled()

## Verification
- Impersonation comparison (test student with interests): rows_differ = false ✅
- Three-profile sweep (3 profiles × 5 units = 15 combos): all canonical ✅
- src/ grep for variant reads: 0 matches ✅

## Data preserved (no destruction)
- personalized_readings: N rows untouched
- user_interests: N rows untouched
- Variant audio files: untouched

## Manual verification needed (Ali)
- See docs/audits/personalization-killswitch/MANUAL-WALKTHROUGH.md
```

### D.2 — Commit + push

```bash
git add src/ supabase/migrations/ supabase/functions/ \
        scripts/audits/personalization-killswitch/ \
        docs/audits/personalization-killswitch/

git commit -m "fix(curriculum): force canonical curriculum for every student — kill-switch at DB + client layers

PREVIOUS ATTEMPTS:
- ecbd0d1: hid 3 UI mount points. Audit was code-level + service-role, missed
  data-layer redirect (RLS / view / RPC / edge fn / client hydration).
- e4ef9f7: fixed a useAudioEngine dep bug. Verified 10/10 service-role.
  Real students still saw mismatch because verification didn't use
  authenticated JWT sessions.

WHAT WAS ACTUALLY HAPPENING:
<from FINAL-REPORT — the specific mechanism>

WHAT THIS COMMIT DOES:
1. Drops/rewrites the offending data-layer redirect (RLS / view / function /
   edge function — see report for specifics)
2. Purges stale client-side personalization state on app load
3. Adds app_config.personalization_enabled = false as a global kill-switch.
   Every remaining personalization code path now defers to this flag.
4. Verified with authenticated-student JWT sessions across 3 profiles × 5
   units = 15 combinations — all return identical canonical rows.

PRESERVED (NOT DELETED):
- personalized_readings rows (variant content)
- user_interests rows
- Variant audio files in storage
- All personalization component files (hidden, not deleted)

Future opt-in feature can re-enable by flipping app_config and
unhiding the UI mount points."

git push origin main
git fetch origin
git log --oneline -3 HEAD
git log --oneline -3 origin/main
```

Confirm HEAD == origin/main.

---

## ⛔ DO NOT

- ❌ DELETE rows from `personalized_readings`, `user_interests`, or any variant table
- ❌ DROP variant audio files from storage
- ❌ Delete personalization component files
- ❌ Run verification with service-role only (must use authenticated JWT)
- ❌ Stop after Phase A if `rows_differ: false` — STILL add the global kill-switch + client purge for safety
- ❌ Touch student data
- ❌ Run `vite build` locally

## ✅ FINISH LINE

- Authenticated-student JWT sessions return IDENTICAL rows for test (with interests) and control (no interests) students across 5 units
- `app_config.personalization_enabled = false` is set and queryable by clients
- Stale client storage is auto-purged on next app load
- `docs/audits/personalization-killswitch/FINAL-REPORT.md` exists
- One commit pushed to `origin/main`

End of prompt.
