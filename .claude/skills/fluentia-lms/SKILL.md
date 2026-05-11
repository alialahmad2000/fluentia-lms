---
name: fluentia-lms
description: >
  Fluentia Academy LMS development patterns. Use this skill when working on
  any file in this project. Covers Supabase patterns, RTL Arabic-first UI,
  dark theme design system, component conventions, and edge function patterns.
  Auto-load for all tasks in this codebase.
---

# Fluentia LMS — Development Skill

## Project Context
This is a production Arabic-first Learning Management System for an English language academy in Saudi Arabia. ~14 active students, mostly young Saudi women on iPhones with Safari.

## Supabase Patterns (ALWAYS follow)

### Queries — NEVER use .catch()
```jsx
// ✅ CORRECT
const { data, error } = await supabase
  .from('students')
  .select('*')
  .eq('status', 'active');
if (error) throw error;

// ❌ WRONG — never do this
supabase.from('students').select('*').then(...).catch(...)
```

### Async Safety — ALWAYS use mounted guards
```jsx
// ✅ CORRECT — every useEffect with async
useEffect(() => {
  let isMounted = true;
  const fetchData = async () => {
    const { data, error } = await supabase.from('table').select('*');
    if (isMounted && !error) setData(data);
  };
  fetchData();
  return () => { isMounted = false; };
}, []);

// ❌ WRONG — causes crash on rapid navigation
useEffect(() => {
  const fetch = async () => {
    const { data } = await supabase.from('table').select('*');
    setData(data); // 💥 might be unmounted
  };
  fetch();
}, []);
```

### Realtime — ALWAYS clean up subscriptions
```jsx
useEffect(() => {
  const channel = supabase.channel('my-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, handleChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

### Soft Delete — NEVER hard delete
```jsx
// ✅ CORRECT
await supabase.from('students').update({ deleted_at: new Date() }).eq('id', id);

// ❌ WRONG — never do this
await supabase.from('students').delete().eq('id', id);
```

### Phase A via MCP (PREFERRED — Nov 2025+)

If the `supabase` MCP server is available (it should be — see `.mcp.json` in repo root), Phase A discovery is done by calling MCP tools directly. Concretely:

- **Schema check:** call `list_columns` with the table name. Do NOT write a Node script that queries `information_schema.columns`.
- **Row count / filter test:** call `execute_sql` with a `SELECT count(*) FROM <table> WHERE <filter>` query.
- **Existence check:** `list_tables` then verify the target is present.
- **RLS / policy inspection:** `execute_sql` against `pg_policies`.

Only fall back to a Node script if (a) MCP is unavailable in this session, or (b) the discovery requires multi-step procedural logic (e.g., signing in as a user, calling an Edge Function). For all pure read queries — use MCP. Faster, fewer files, no commit pollution.

The MCP server is **read-only**. It physically cannot execute mutating SQL. This makes Phase A safer than running a Node script with a service-role key.

## UI/Design Patterns (ALWAYS follow)

### RTL Arabic-First
- All layouts are RTL (right-to-left)
- Use `text-right` for text alignment
- Use `mr-` for right margins (which appear on the left visually in RTL)
- All Arabic text uses 'Tajawal' font
- English headings use 'Playfair Display'

### Apple-Level Dark Theme
```css
/* Backgrounds — layered depth */
Page bg: #060e1c
Card surface: rgba(255,255,255,0.03) + border rgba(255,255,255,0.06)
Elevated (modals): rgba(255,255,255,0.06) + backdrop-blur + soft shadow

/* Accent — use SPARINGLY */
Primary: #38bdf8 (sky-blue) — only active states, primary buttons, key CTAs
Gold: #fbbf24 — only achievements/premium

/* Typography hierarchy */
Page title: 28-32px, bold (700-800), Tajawal
Section header: 20-22px, semibold (600)
Body: 15-16px, regular (400), line-height 1.7
Caption: 12-13px, muted (#64748b)

/* Spacing — generous, Apple-style */
Card padding: 24-32px
Section gaps: 48-64px
Input height: 48-52px
Border radius: 12-16px (cards), 10-12px (buttons/inputs)
Touch targets: min 44px

/* Interactions */
Hover: translateY(-2px) + brighter border (NOT scale)
Transitions: ease-out, 150-200ms
Loading: skeleton shimmer (NOT spinners)
```

### Component Conventions
- Buttons: Primary (solid sky-blue), Secondary (ghost/outline), Danger (muted red)
- Tables: No grid lines, subtle row dividers, 56-64px row height, hover highlight
- Badges: Pill shape, semi-transparent bg (rgba of color + 0.15)
- Empty states: Centered, large icon, Arabic text, single CTA
- Errors: Never raw — always Arabic, friendly, with clear next step

### Mobile-First
- 320px minimum width
- Bottom tab bar on mobile (replaces sidebar)
- Touch targets minimum 44px
- Voice recording: Safari = audio/mp4, Chrome = audio/webm;codecs=opus
- Test everything on Safari/iOS

## Edge Function Patterns

### Auth Check — ALWAYS verify JWT
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Verify user
const authHeader = req.headers.get('Authorization')!;
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) return new Response('Unauthorized', { status: 401 });
```

### AI Calls — Use Sonnet, not Opus
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': Deno.env.get('CLAUDE_API_KEY')!,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',  // Always Sonnet for cost
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  })
});
```

## Critical Terminology
- Free trial: "لقاء مبدئي مجاني مع المدرب" — NEVER "كلاس تجريبي مجاني"
- Academy: أكاديمية طلاقة / Fluentia Academy

## After Every Task
1. Update the CHANGE LOG in CLAUDE.md
2. Update FLUENTIA-SPEC.md if architecture changed
3. Include both files in the git commit
4. Commit message format: "feat: ...", "fix: ...", "docs: ..."
