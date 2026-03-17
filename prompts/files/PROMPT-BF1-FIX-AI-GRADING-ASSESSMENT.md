# PROMPT BF1: Fix ALL AI Features + Grading + Self-Assessment
# Priority: 🔴 CRITICAL — Nothing works without this
# Estimated time: 20-30 minutes

---

## CONTEXT

You are working on Fluentia LMS — a production Arabic-first Learning Management System.
- **Repo:** alialahmad2000/fluentia-lms
- **Stack:** React 18 + Vite + Tailwind + Supabase (ref: nmjexpuycmqcxuxljier, Frankfurt) + Claude API + OpenAI Whisper
- **Live:** fluentia-lms.vercel.app
- **Admin:** admin@fluentia.academy / Fluentia2025!

## ⚠️ CRITICAL RULES — FOLLOW EVERY ONE

1. **Supabase queries:** ALWAYS `const { data, error } = await ...` — NEVER `.catch()` or `.then()` on Supabase query builders. This was the ROOT CAUSE of previous AI failures.
2. **Edge function CORS:** Every edge function MUST handle OPTIONS preflight AND include CORS headers on ALL responses.
3. **Edge function auth:** Verify JWT from Authorization header using `supabase.auth.getUser(token)`.
4. **AI model:** Use `claude-sonnet-4-20250514` — NEVER opus, NEVER old model strings.
5. **Whisper:** Use `https://api.openai.com/v1/audio/transcriptions` with model `whisper-1`.
6. **Error messages:** NEVER show raw errors to students. Always Arabic: "حدث خطأ مؤقت — حاول مرة أخرى" with a retry button.
7. **Secrets header name:** `CLAUDE_API_KEY` (not ANTHROPIC_API_KEY) — check what's actually set in secrets.
8. **All colors via CSS variables** — zero hardcoded colors.
9. **RTL Arabic-first** — all text alignment, all layouts.

---

## TASK: 3 BUGS TO FIX

### BUG 1: ALL AI FEATURES ARE BROKEN (Points 6-10)

**Symptoms:** Every AI-powered feature fails:
- Speaking Lab / Voice Journal: records audio → stuck on "يحلل..." forever
- Spelling Trainer: stuck on "جاري التحميل..." — never starts
- Writing Lab: stuck on "جاري التصحيح..."
- Level Test: returns "Edge Function returned a non-2xx status code"
- ALL other AI features: same pattern

**Diagnosis Steps (DO ALL OF THESE):**

1. **Check edge function secrets:**
```bash
npx supabase secrets list --project-ref nmjexpuycmqcxuxljier
```
Verify these exist: `CLAUDE_API_KEY` (or `ANTHROPIC_API_KEY`), `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

If ANY is missing, check `.env` file for the values and set them:
```bash
npx supabase secrets set CLAUDE_API_KEY=<value> --project-ref nmjexpuycmqcxuxljier
npx supabase secrets set OPENAI_API_KEY=<value> --project-ref nmjexpuycmqcxuxljier
npx supabase secrets set SUPABASE_URL=https://nmjexpuycmqcxuxljier.supabase.co --project-ref nmjexpuycmqcxuxljier
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<value> --project-ref nmjexpuycmqcxuxljier
```

2. **Check logs for EACH failing function:**
```bash
npx supabase functions logs ai-speaking-analysis --project-ref nmjexpuycmqcxuxljier
npx supabase functions logs ai-writing-feedback --project-ref nmjexpuycmqcxuxljier
npx supabase functions logs ai-spelling-trainer --project-ref nmjexpuycmqcxuxljier
npx supabase functions logs ai-level-test --project-ref nmjexpuycmqcxuxljier
npx supabase functions logs ai-trainer-assistant --project-ref nmjexpuycmqcxuxljier
```
Look for: TypeError, undefined env var, CORS error, body parsing error.

3. **Audit EVERY edge function in `supabase/functions/`:**

For EACH `.ts` file, check and fix:

**a) CORS handling:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// MUST be FIRST thing in serve()
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

**b) Body parsing — handle empty/malformed:**
```typescript
let body;
try {
  const text = await req.text();
  body = text ? JSON.parse(text) : {};
} catch {
  return new Response(JSON.stringify({ error: 'Invalid request body' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

**c) Auth verification:**
```typescript
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Missing authorization' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
if (authError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

**d) Claude API call pattern:**
```typescript
const apiKey = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY');
if (!apiKey) {
  console.error('CLAUDE_API_KEY not found in environment');
  return new Response(JSON.stringify({ error: 'AI service not configured' }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  }),
});

if (!response.ok) {
  const errorText = await response.text();
  console.error('Claude API error:', response.status, errorText);
  return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const result = await response.json();
const aiText = result.content?.[0]?.text || '';
```

**e) Supabase client — NEVER .catch():**
```typescript
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ✅ CORRECT
const { data, error } = await supabaseClient.from('table').select('*');
if (error) { console.error(error); /* handle */ }

// ❌ NEVER DO THIS — causes silent TypeError
// supabaseClient.from('table').select('*').catch(...)
```

**f) Response ALWAYS includes CORS headers:**
```typescript
return new Response(JSON.stringify({ success: true, data: result }), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

4. **Fix ALL functions, then redeploy ALL:**
```bash
# List all functions
ls supabase/functions/

# Deploy each one (or use a loop)
npx supabase functions deploy <function-name> --project-ref nmjexpuycmqcxuxljier --no-verify-jwt
```

5. **Frontend: Check every AI call in the React code:**

Search for all `supabase.functions.invoke(` calls in `src/`:
- Ensure they pass `Authorization` header with the session token
- Ensure they handle `{ data, error }` pattern (NOT .catch)
- Ensure loading states are set to false on BOTH success AND error
- Ensure error shows Arabic message + retry button

Pattern for frontend AI calls:
```jsx
const callAI = async () => {
  setLoading(true);
  setError(null);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('function-name', {
      body: { /* params */ },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (error) throw error;
    setResult(data);
  } catch (err) {
    console.error(err);
    setError('حدث خطأ مؤقت — حاول مرة أخرى');
  } finally {
    setLoading(false);
  }
};
```

---

### BUG 2: GRADING DOES NOT WORK (Point 5)

**Symptom:** Trainer opens grading page → sees submissions → tries to grade → nothing happens. The submit handler fails silently.

**Diagnosis:**
1. Find the grading page: search `src/` for files related to grading (likely `src/pages/trainer/Grading.jsx` or similar)
2. Find the submit/save handler for grades
3. Check:
   - Is the Supabase update query correct? (table name, column names, where clause)
   - Is there a `.catch()` that's swallowing the error? → Replace with `{ data, error }` pattern
   - Is the RLS policy on the submissions/grades table allowing trainer UPDATE?
   - Is the trainer's role being checked correctly?
4. Check RLS policies:
```sql
-- Run in Supabase SQL editor or check migrations
SELECT tablename, policyname, cmd, qual FROM pg_policies 
WHERE schemaname = 'public' AND tablename IN ('submissions', 'assignments', 'grades');
```
5. If RLS is blocking: create proper policy allowing trainers to update grades
6. After fix: test the full flow — open submission → enter grade → save → verify in DB

---

### BUG 3: SELF-ASSESSMENT DOES NOT SAVE (Point 11)

**Symptom:** Student goes to assessments page → selects mood (ممتاز/جيد/عادي/ضعيف) → adjusts level slider → clicks "إرسال التقييم" → error "حدث خطأ، حاول مرة أخرى". Assessment is NOT saved.

**Diagnosis:**
1. Find the self-assessment component: search `src/` for assessment/self-assessment/mood files
2. Find the submit handler
3. Check:
   - Which table does it insert into? (likely `self_assessments` or `assessments`)
   - Does the table exist? If not, create it:
```sql
CREATE TABLE IF NOT EXISTS self_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  mood text NOT NULL CHECK (mood IN ('excellent', 'good', 'average', 'poor')),
  level_rating integer CHECK (level_rating BETWEEN 1 AND 10),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE self_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own assessments"
  ON self_assessments FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view own assessments"
  ON self_assessments FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Trainers and admins can view all assessments"
  ON self_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin')
    )
  );
```
   - Is the insert query correct? (column names match)
   - Is `.catch()` being used? → Fix to `{ data, error }` pattern
   - Is `student_id` being set to `auth.uid()` or the session user?
4. Fix the root cause
5. Show success toast in Arabic after save: "تم حفظ تقييمك بنجاح ✅"

---

## VERIFICATION CHECKLIST

After ALL fixes, verify each one works:

- [ ] Speaking Lab: record audio → analysis completes → shows results
- [ ] Voice Journal: record → analysis works
- [ ] Spelling Trainer: loads correctly → starts exercises
- [ ] Writing Lab: submit text → correction appears
- [ ] Level Test: starts → completes → shows results
- [ ] AI Trainer Assistant: chat works (admin)
- [ ] Grading: trainer submits grade → saved → student sees it
- [ ] Self-Assessment: student submits → saved → no error

---

## GIT

```bash
git add -A
git commit -m "fix: resolve all AI features, grading, and self-assessment bugs — root cause fixes"
git push origin main
```

## EDGE FUNCTION DEPLOY

After fixing, redeploy ALL edge functions:
```bash
for func in $(ls supabase/functions/); do
  if [ -d "supabase/functions/$func" ]; then
    npx supabase functions deploy $func --project-ref nmjexpuycmqcxuxljier --no-verify-jwt
  fi
done
```
