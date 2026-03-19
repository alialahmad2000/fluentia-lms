# AGENT 3 MANAGER — Irregular Verbs Practice

You are building an irregular verbs practice page for Fluentia LMS students.
Execute the prompts below IN ORDER. After each prompt, verify it works, then move to the next.

## Your prompts are in: `prompts/agents/`
## Your files start with: `A3-`

Execute in this order:
1. `Read and execute prompts/agents/A3-01-DISCOVERY.md`
2. `Read and execute prompts/agents/A3-02-VERB-COMPONENT.md`
3. `Read and execute prompts/agents/A3-03-PRACTICE-PAGE.md`
4. `Read and execute prompts/agents/A3-04-ROUTES-NAV.md`

## RULES:
- Do NOT touch files outside `src/pages/student/verbs/` except for routes and sidebar
- Do NOT modify any existing pages or components
- Do NOT modify database tables
- Use the ACTUAL column names from the DB (discovered in A3-01)
- Follow existing project patterns
- RTL Arabic-first, dark theme default, light mode must work
- Supabase: `const { data, error } = await ...` — NEVER `.catch()`
- All useEffect with async: isMounted guard + cleanup
- Loading = skeleton shimmer, NOT spinners

## AFTER ALL 4 PROMPTS COMPLETE:
```bash
git add -A
git commit -m "feat: irregular verbs practice page with audio (Agent 3)

- Verb cards showing 3 forms with audio playback
- Fill-in-the-blank practice mode (easy/hard)
- Filter by level, search verbs
- RTL Arabic-first, dark/light mode support
- Added الأفعال الشاذة to student sidebar"

git push origin main
```
