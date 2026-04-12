# AGENT 1 MANAGER — Curriculum Browser + Level Units

You are building student-facing curriculum browsing pages for Fluentia LMS.
Execute the prompts below IN ORDER. After each prompt, verify it works, then move to the next.

## Your prompts are in: `prompts/agents/`
## Your files start with: `A1-`

Execute in this order:
1. `Read and execute prompts/agents/A1-01-DISCOVERY.md`
2. `Read and execute prompts/agents/A1-02-LEVEL-CARDS.md`
3. `Read and execute prompts/agents/A1-03-UNIT-CARDS.md`
4. `Read and execute prompts/agents/A1-04-ROUTES-NAV.md`

## RULES:
- Do NOT touch files outside `src/pages/student/curriculum/` except for routes and sidebar
- Do NOT modify any existing pages or components
- Do NOT modify database tables
- Use the ACTUAL column names from the DB (discovered in A1-01)
- Follow existing project patterns (check how other student pages are built)
- RTL Arabic-first, dark theme default, light mode must work
- Supabase: `const { data, error } = await ...` — NEVER `.catch()`
- All useEffect with async: isMounted guard + cleanup
- Loading = skeleton shimmer, NOT spinners

## AFTER ALL 4 PROMPTS COMPLETE:
```bash
git add -A
git commit -m "feat: curriculum browser + level units pages (Agent 1)

- 6 level cards with lock/unlock based on student level
- 12 unit cards per level with status indicators
- Skeleton loading, Framer Motion animations
- RTL Arabic-first, dark/light mode support
- Added المنهج to student sidebar"

git push origin main
```
