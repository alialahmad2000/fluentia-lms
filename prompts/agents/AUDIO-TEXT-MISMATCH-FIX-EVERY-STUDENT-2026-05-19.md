# 🚨 FIX AUDIO-TEXT MISMATCH FOR EVERY STUDENT — LAMIA IS THE REPRODUCER (2026-05-19)

> **Move + execute (Mac):**
> ```bash
> mv ~/Downloads/AUDIO-TEXT-MISMATCH-FIX-EVERY-STUDENT-2026-05-19.md \
>    /Users/dr.ali/Projects/fluentia-lms/prompts/agents/
> cd /Users/dr.ali/Projects/fluentia-lms
> git pull --rebase origin main
> claude
> ```
> Then in Claude Code:
> ```
> Read and execute prompts/agents/AUDIO-TEXT-MISMATCH-FIX-EVERY-STUDENT-2026-05-19.md
> ```

---

## 🎯 MISSION

**THIS IS A CONFIRMED PRODUCTION BUG WITH A LIVE REPRODUCER.**

Ali viewed-as-student for **Lamia (لمياء سعود الحربي)** on Unit 1 Reading A. The article displayed on screen is about cultural celebrations (mentions India / China / Saudi lands / Ramadan, image of a colorful festival). The audio plays something completely different — the previous personalized variant's audio.

**Four commits have now shipped (`ecbd0d1`, `e4ef9f7`, `0d4ec39`, `5b83d67`) and the bug persists for real students.** Every one of those agents declared success based on tests that didn't include Lamia's actual data state. **STOP making that mistake.**

**Your hypothesis to validate:**
- Lamia previously selected interests → system created a `personalized_readings` row for her with custom text + custom audio
- The killswitch (`0d4ec39`) made the TEXT layer serve canonical → she now sees the default article
- BUT some audio-resolution code path is STILL reading from `personalized_readings.audio_url` (or equivalent) for her — she hears the old variant audio

**What you must deliver:**
1. Reproduce Lamia's exact bug programmatically (audio URL ≠ text article)
2. Find the EXACT code/data path that resolves audio differently than text
3. Kill it
4. Verify the fix holds across **EVERY student profile in the database** — not 2 sample students, not 5, not 10. EVERY ONE.
5. Ship

---

## 📁 ENVIRONMENT

- **Working dir:** `/Users/dr.ali/Projects/fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md` — load and obey
- **DB:** Supabase prod (`nmjexpuycmqcxuxljier`, Frankfurt Pro) via `mcp__supabase__*`
- **Branch:** `main`. Pull-rebase before starting.
- **Test reproducer profile:** Lamia Saud Al-Harbi (لمياء سعود الحربي)
- **Test unit:** Unit 1, Reading A (Lamia's view as of 2026-05-19 15:12 — article is about cultural celebrations / festivals)
- **NODE_OPTIONS:** `export NODE_OPTIONS="--dns-result-order=ipv4first"`

---

## ⚠️ STRICT RULES

1. **The "tests pass" lie ends here.** If your test report says "all clean" but Lamia's actual screen still shows text/audio mismatch, your test is wrong. Verify with HER data, not Layan's, not Sara's.
2. **Find Lamia by name in the DB.** Query `profiles` for full_name containing "لمياء" or "Lamia" or "Al-Harbi" — get her profile_id, then use it as the impersonation target for every test in this run.
3. **Test EVERY student, not a sample.** Final verification loops through every row in `profiles` (where `role = 'student'`). Each student × each unit's reading articles must show text_id == audio_source_id.
4. **No browser checks asked of Ali.** Verify everything programmatically using the codebase's existing admin impersonation, or `SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = jsonb_build_object('sub', '<profile_id>', 'role', 'authenticated')` for RLS-equivalent simulation.
5. **No destructive data ops.** Don't DELETE `personalized_readings` rows. Disable read paths instead.
6. **No student data writes.** No `submissions`, `unit_progress`, `xp_transactions`.
7. **Hooks before guards.**
8. **`.select()` after every `.update()` / `.upsert()`.**
9. **No `vite build` locally.**
10. **Mac shell.**
11. **Loop until clean.** Test fails → find cause → fix → re-test → repeat. Only commit when the test passes for **every student × every reading article**.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 1 — Reproduce Lamia's bug programmatically
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1.1 — Find Lamia

```sql
SELECT id, email, full_name, role, created_at
FROM profiles
WHERE full_name ILIKE '%لمياء%' OR full_name ILIKE '%lamia%' OR full_name ILIKE '%harbi%'
LIMIT 5;
```

Record her `profile_id`. Then check what state she has:

```sql
-- Does she have interest tags?
SELECT * FROM user_interests WHERE user_id = '<lamia_id>';

-- Does she have personalized_readings rows?
SELECT id, canonical_reading_id, audio_url, body_ar, created_at
FROM personalized_readings
WHERE user_id = '<lamia_id>'
LIMIT 20;

-- What's her current unit / level?
SELECT * FROM unit_progress WHERE profile_id = '<lamia_id>' LIMIT 10;
```

The output of these queries is critical context. Save to `docs/audits/audio-text-mismatch-fix/lamia-state.json`.

### 1.2 — Find Unit 1, Reading A's canonical row

```sql
-- Find unit 1 of whatever level Lamia is currently in
-- From the screenshot, Lamia is in the curriculum section. Find the unit with order_index = 0 or position = 1 in her active level.
SELECT id, level_id, unit_id, order_index, title_ar, title_en, body_ar, audio_url
FROM curriculum_reading
WHERE unit_id = (
  -- find the right unit — adjust if needed
  SELECT id FROM units WHERE level_id = (SELECT current_level_id FROM profiles WHERE id = '<lamia_id>') ORDER BY order_index LIMIT 1
)
ORDER BY order_index
LIMIT 5;
```

If you can't determine which unit Lamia was viewing from the schema alone, query her unit_progress / activity history for the most recent reading activity she opened.

Record the canonical article: its `id`, `title_ar`, `body_ar`, `audio_url`, plus the `reading_passage_audio.full_audio_url` for it.

### 1.3 — Simulate Lamia's exact request flow

Write `scripts/audits/audio-text-mismatch-fix/01-reproduce-lamia.cjs`:

```javascript
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const LAMIA_ID = '<from 1.1>';
const TEST_UNIT_ID = '<from 1.2>';

(async () => {
  fs.mkdirSync('docs/audits/audio-text-mismatch-fix', { recursive: true });

  const svc = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. Find every code path that resolves "audio URL for a reading"
  //    Grep results from Phase 2 will guide this — but for now, run all candidates

  // 1a. Run the EXACT query useReadingArticles / ReadingTab uses
  //     (read the hook source — DO NOT GUESS — replicate the query as written)
  const readingTabQuery = await svc.rpc('<rpc_name>', { /* args */ });
  // OR if it's a direct select:
  // const { data: articles } = await svc.from('curriculum_reading').select('...').eq('unit_id', TEST_UNIT_ID);

  // 1b. Run the EXACT query useReadingPassageAudio uses for each article
  //     Pass impersonated context — see rule 4
  for (const article of articles) {
    // Set RLS context to Lamia
    await svc.rpc('set_config', { setting_name: 'request.jwt.claims', setting_value: JSON.stringify({sub: LAMIA_ID, role: 'authenticated'}), is_local: true }).catch(()=>{});

    // Fetch audio as Lamia would
    const { data: audioForLamia } = await svc
      .from('reading_passage_audio')  // adjust to actual table
      .select('reading_id, full_audio_url, segments')
      .eq('reading_id', article.id)
      .maybeSingle();

    // Fetch audio as anonymous service-role
    const { data: audioForService } = await svc
      .from('reading_passage_audio')
      .select('reading_id, full_audio_url, segments')
      .eq('reading_id', article.id)
      .maybeSingle();

    console.log({
      article_id: article.id,
      article_title_en: article.title_en,
      text_first_30_chars: article.body_ar?.slice(0, 30),
      audio_url_lamia: audioForLamia?.full_audio_url,
      audio_url_service: audioForService?.full_audio_url,
      diverges: audioForLamia?.full_audio_url !== audioForService?.full_audio_url,
    });
  }

  // 1c. Also check: does Lamia have a personalized_readings row that overrides any of this?
  const { data: lamiaPersonalized } = await svc
    .from('personalized_readings')
    .select('*')
    .eq('user_id', LAMIA_ID);

  console.log('Lamia personalized_readings rows:', lamiaPersonalized?.length || 0);
  console.log(lamiaPersonalized);

  // 1d. Does ANY edge function or RPC resolve audio differently for Lamia?
  //     If you find an RPC like get_student_reading_audio, INVOKE IT as Lamia AND as service-role.
  //     Compare outputs.

  // Write everything to a report
  fs.writeFileSync('docs/audits/audio-text-mismatch-fix/reproduce-report.json', JSON.stringify({
    lamia_id: LAMIA_ID,
    test_unit_id: TEST_UNIT_ID,
    canonical_articles: articles,
    audio_per_article: /* the loop output */,
    lamia_personalized: lamiaPersonalized,
  }, null, 2));
})();
```

### 1.4 — If 1.3 shows ANY divergence between Lamia's audio resolution and canonical → GO TO PHASE 2

If 1.3 shows everything matches but Ali still reproduced the bug → the bug is in the React layer, not the data layer. Go to Phase 3.

### 1.5 — If Lamia has `personalized_readings` rows

That's the smoking gun. Investigate every place `personalized_readings` (or whatever the table is named — check exact schema) is read from in the app:

```bash
grep -rn "personalized_readings\|personalized_reading_audio\|personalizedReading" src/ supabase/functions/ 2>/dev/null
grep -rn "from('personalized" src/ 2>/dev/null
```

There must be at least one read path that's serving audio from `personalized_readings.audio_url` when canonical text is being shown. That's the leak.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 2 — Kill the audio leak path
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on Phase 1's finding:

### 2.1 — If the audio leak is in a hook (most likely)

Find the hook that fetches audio. It probably does something like:

```javascript
// LEAKY pattern:
const { data: audio } = await supabase
  .from('reading_passage_audio')
  .select('*, personalized:personalized_reading_audio(...)')
  .or(`reading_id.eq.${readingId},user_id.eq.${userId}`)
  .order(...)
  .limit(1);
```

OR:

```javascript
// LEAKY pattern with fallback:
let { data: audio } = await supabase
  .from('personalized_reading_audio')  // try personalized first
  .select('*')
  .eq('user_id', profileId)
  .eq('reading_id', readingId)
  .maybeSingle();

if (!audio) {
  // fall back to canonical
  audio = await supabase.from('reading_passage_audio')...;
}
```

The fix: **delete the personalized branch entirely.** Always fetch from canonical:

```javascript
// CLEAN — canonical only
const { data: audio, error } = await supabase
  .from('reading_passage_audio')
  .select('full_audio_url, segments, duration_ms, word_timestamps')
  .eq('reading_id', readingId)
  .single();
if (error) throw error;
return audio;
```

### 2.2 — If the audio leak is in an RLS policy

```sql
SELECT policyname, qual::text FROM pg_policies
WHERE tablename IN ('reading_passage_audio', 'personalized_reading_audio', 'audio_files');
```

Drop and recreate any policy that uses `auth.uid()` to route to personalized variants:

```sql
DROP POLICY IF EXISTS "<offending name>" ON reading_passage_audio;
CREATE POLICY "canonical_audio_select" ON reading_passage_audio
  FOR SELECT TO authenticated USING (true);
```

### 2.3 — If the audio leak is in an RPC / function

```sql
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND (prosrc ILIKE '%personalized%' AND prosrc ILIKE '%audio%');
```

Replace function body with canonical-only equivalent. Re-deploy.

### 2.4 — If the audio leak is in an edge function

```bash
ls supabase/functions/
grep -rln "personalized\|user_interest\|variant" supabase/functions/ 2>/dev/null
```

For each found, replace body with canonical-only or no-op. Re-deploy via `supabase functions deploy <name> --no-verify-jwt --project-ref nmjexpuycmqcxuxljier`.

### 2.5 — Re-run Phase 1.3 immediately

The reproduce script must now show Lamia's audio_url == canonical audio_url for every article in the test unit.

If still divergent → another layer is leaking. Repeat 2.1–2.5.

If clean → continue to Phase 3.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 3 — Audit & fix data integrity (catch the next-worst case)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 2 fixes the read path. Phase 3 catches a different possible bug: the data itself being wrong (canonical row references the wrong audio file).

### 3.1 — Verify every canonical audio URL matches its text

```javascript
// scripts/audits/audio-text-mismatch-fix/02-data-integrity.cjs
// For every curriculum_reading row:
//   1. Take audio_url (or full_audio_url from reading_passage_audio)
//   2. The URL path should embed the reading_id (e.g., readings/<reading_id>.mp3)
//   3. If the path embeds a DIFFERENT id, that's a data bug — the audio file linked is wrong
//   4. Also: audio_duration_ms should be plausible vs body_ar word count
//      English: 130-180 words/minute, Arabic: 120-160 words/minute
//      If actual duration is < 0.5× or > 2.0× expected, flag as suspect
```

Output `docs/audits/audio-text-mismatch-fix/data-integrity.json` with per-row verdicts.

### 3.2 — For each flagged row, decide:

- **URL embeds wrong reading_id** → the canonical record is pointing at the wrong file. Either re-link to the correct file (if it exists under the right reading_id in storage) OR regenerate (only if necessary, check ElevenLabs budget).
- **Duration mismatch** → likely the audio file is from a different version of the text. Regenerate.

Do NOT regenerate in bulk. Per-row evidence required. Check ElevenLabs char budget first:

```bash
curl -sH "xi-api-key: $ELEVENLABS_API_KEY" \
  https://api.elevenlabs.io/v1/user/subscription | jq '.character_count, .character_limit'
```

Available chars must exceed estimated regeneration chars × 1.2.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 4 — Verify across EVERY STUDENT
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is the test the previous 4 attempts didn't run. **Mandatory. No skipping.**

Write `scripts/audits/audio-text-mismatch-fix/03-all-students-verify.cjs`:

```javascript
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

(async () => {
  const svc = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Get EVERY student
  const { data: students } = await svc
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('role', 'student');  // adjust column if different

  console.log(`Verifying ${students.length} students`);

  // For each unit with reading content
  const { data: units } = await svc
    .from('units')
    .select('id, level_id, title_ar')
    .order('level_id, order_index');

  const failures = [];
  let totalChecks = 0;

  for (const student of students) {
    for (const unit of units) {
      // Get articles for this unit, in the student's context
      // Use RLS-equivalent simulation (see rule 4)
      const { data: articles } = await fetchReadingArticlesAsStudent(svc, student.id, unit.id);
      if (!articles || articles.length === 0) continue;

      for (const article of articles) {
        // Fetch the audio that this student's session would receive for this article
        const { data: audio } = await fetchReadingAudioAsStudent(svc, student.id, article.id);

        if (!audio) continue;  // no audio for this row — different issue, handled by listening coverage prompt

        // ASSERTION: the audio URL must reference this article's ID
        const audioUrl = audio.full_audio_url || audio.audio_url;
        const urlContainsArticleId = audioUrl && audioUrl.includes(article.id);

        totalChecks++;

        if (!urlContainsArticleId) {
          failures.push({
            student_id: student.id,
            student_email: student.email,
            unit_id: unit.id,
            article_id: article.id,
            article_title: article.title_en,
            audio_url: audioUrl,
            audio_url_reading_id_segment: extractReadingIdFromUrl(audioUrl),
            verdict: 'AUDIO_URL_REFERENCES_DIFFERENT_ARTICLE',
          });
        }
      }
    }
  }

  fs.writeFileSync('docs/audits/audio-text-mismatch-fix/all-students-verify.json', JSON.stringify({
    total_students: students.length,
    total_units: units.length,
    total_checks: totalChecks,
    failures_count: failures.length,
    failures,
  }, null, 2));

  console.log(`\nTotal checks: ${totalChecks}`);
  console.log(`Failures: ${failures.length}`);
  if (failures.length > 0) {
    console.log('SAMPLE FAILURE:');
    console.log(JSON.stringify(failures[0], null, 2));
    process.exit(1);  // exit non-zero so the run is forced to loop back
  }
  console.log('\n✅ ALL STUDENTS CLEAN');
})();

async function fetchReadingArticlesAsStudent(svc, studentId, unitId) {
  // Set local JWT context
  // Replicate ReadingTab's exact query
  // Return rows
  // Implement faithfully — read the actual hook source
}

async function fetchReadingAudioAsStudent(svc, studentId, articleId) {
  // Same pattern
}

function extractReadingIdFromUrl(url) {
  // URL pattern is something like .../readings/<uuid>.mp3 or .../<uuid>/full.mp3
  // Extract the UUID segment
  const match = url?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
  return match ? match[0] : null;
}
```

Run it:

```bash
node scripts/audits/audio-text-mismatch-fix/03-all-students-verify.cjs
```

**The script MUST exit 0 with "ALL STUDENTS CLEAN".** If it exits non-zero with failures, identify the pattern in the failures (same student? same unit? same article?), go back to Phase 2 with that specific case, fix, re-run.

**Do not commit until this script exits 0.**

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE 5 — Commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 5.1 — Final report

`docs/audits/audio-text-mismatch-fix/FINAL-REPORT.md`:

```markdown
# Audio-Text Mismatch Fix — Final Report (2026-05-19)

## What the previous 4 commits missed
- ecbd0d1, e4ef9f7, 0d4ec39, 5b83d67 all verified with Layan / Sara
- Lamia had a different data state (personalized_readings rows or similar) that the
  audio resolution path was honoring, even after text was forced canonical
- None of the previous tests included Lamia's profile or any student with leftover
  personalization data

## Phase 1 — Lamia reproducer
- Profile: <id> / <name>
- State: <user_interests rows>, <personalized_readings rows>
- Test unit: <unit_id>
- Reproduced divergence: <verbatim from reproduce-report.json>

## Phase 2 — Layer killed
- Path: <hook / RLS / RPC / edge function>
- Specific name + line: <verbatim>
- Fix: <one-line summary>

## Phase 3 — Data integrity
- Rows audited: N
- Rows with URL embedding wrong reading_id: N
- Rows with duration mismatch: N
- Rows fixed: N
- ElevenLabs chars consumed: N

## Phase 4 — All-students verification
- Total students: N
- Total checks: N
- Failures: 0 ✅

## Commit
- SHA: <filled after commit>
```

### 5.2 — Commit + push

```bash
git add src/ supabase/migrations/ supabase/functions/ \
        scripts/audits/audio-text-mismatch-fix/ \
        docs/audits/audio-text-mismatch-fix/

git commit -m "fix(reading): kill audio source leak — every student's audio now matches their displayed article

REPRODUCER:
Lamia Saud Al-Harbi (لمياء سعود الحربي), Unit 1 Reading A. Article on
screen: cultural celebrations across India/China/Saudi lands. Audio: a
completely different (previously personalized) variant.

WHAT THE PREVIOUS 4 COMMITS MISSED:
- ecbd0d1: hid UI surfaces
- e4ef9f7: fixed useAudioEngine deps
- 0d4ec39: killswitch + DB layer flatten + client purge
- 5b83d67: automated triple-check — passed for Layan/Sara who didn't have
  leftover personalization data
- The bug: <specific data state> created an audio-resolution leak that
  only affected students with leftover personalization data. Test sample
  didn't include any such student.

ROOT CAUSE:
<from FINAL-REPORT — concrete>

FIX:
<from FINAL-REPORT — concrete>

VERIFICATION:
- Lamia reproduce: PASS
- Data integrity: N rows audited, N fixed
- ALL STUDENTS × ALL READING ARTICLES: 0 mismatches across N checks

NOT TOUCHED:
- No student data writes
- No destructive deletes (personalized_readings, user_interests preserved)
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

- ❌ Test only with Layan and Sara again. Lamia is the reproducer. Use her data.
- ❌ Skip Phase 4. If you don't loop over every student, you don't know if the fix holds.
- ❌ Declare success without `03-all-students-verify.cjs` exiting 0.
- ❌ Ask Ali to do browser checks.
- ❌ DELETE personalized_readings rows.
- ❌ Run vite build locally.

## ✅ FINISH LINE

- `03-all-students-verify.cjs` exits 0 with "ALL STUDENTS CLEAN"
- One commit pushed to `origin/main`
- `docs/audits/audio-text-mismatch-fix/FINAL-REPORT.md` exists with **concrete** findings (no placeholders)

End of prompt.
