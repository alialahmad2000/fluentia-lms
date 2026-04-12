# AGENT 2 MANAGER — Vocabulary Flashcards

You are building a vocabulary flashcards page for Fluentia LMS students.
Execute the prompts below IN ORDER. After each prompt, verify it works, then move to the next.

## Your prompts are in: `prompts/agents/`
## Your files start with: `A2-`

Execute in this order:
1. `Read and execute prompts/agents/A2-01-DISCOVERY.md`
2. `Read and execute prompts/agents/A2-02-FLASHCARD-COMPONENT.md`
3. `Read and execute prompts/agents/A2-03-FLASHCARDS-PAGE.md`
4. `Read and execute prompts/agents/A2-04-ROUTES-NAV.md`

## RULES:
- Do NOT touch files outside `src/pages/student/vocabulary/` except for routes and sidebar
- Do NOT modify any existing pages or components
- Do NOT modify database tables
- Use the ACTUAL column names from the DB (discovered in A2-01)
- Follow existing project patterns
- RTL Arabic-first, dark theme default, light mode must work
- Supabase: `const { data, error } = await ...` — NEVER `.catch()`
- All useEffect with async: isMounted guard + cleanup
- Loading = skeleton shimmer, NOT spinners

## AFTER ALL 4 PROMPTS COMPLETE:
```bash
git add -A
git commit -m "feat: vocabulary flashcards page with audio (Agent 2)

- Flip card animation with word/translation/example
- Audio playback for pronunciation (ElevenLabs)
- Filter by level/unit, search words
- Browse and list view modes
- RTL Arabic-first, dark/light mode support
- Added المفردات to student sidebar"

git push origin main
```
