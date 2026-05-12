---
name: fluentia-workflow
description: >
  Master build workflow for Fluentia LMS. ALWAYS use this workflow for ANY task
  in this project. It enforces the full quality pipeline: load context first,
  use frontend-design plugin for UI work, follow Supabase/React patterns,
  then run all 4 review agents (code-reviewer, ux-reviewer, performance-auditor,
  pre-push-auditor) before committing. Use this for every feature, fix, or change.
---

# Fluentia Master Build Workflow

## PHASE 1: PREPARE (before writing any code)

1. Read CLAUDE.md — check the change log for recent changes
2. If task involves DB/architecture, read FLUENTIA-SPEC.md
3. Use context7 to fetch current docs for libraries you'll use
4. Search the codebase FIRST — find existing patterns, related files, components you can reuse
5. Plan what files to create/modify before starting

## PHASE 2: BUILD (write the code)

### For UI work:
- Use frontend-design approach — bold distinctive design, not generic AI slop
- Apple aesthetic: spacious, elegant, dark mode (#060e1c bg), generous spacing
- RTL Arabic-first: Tajawal font, right-to-left everything
- Mobile-first: 320px min, 44px touch targets
- Cards: rgba(255,255,255,0.03) bg + rgba(255,255,255,0.06) border + 12-16px radius
- Hover: translateY(-2px) + brighter border, NOT scale
- Inputs: 48-52px height, 12px radius, focus glow
- Loading: skeleton shimmer, NEVER spinners
- Color sparingly: sky-blue #38bdf8 only for active/primary, gold #fbbf24 only for achievements

### For all code:
- Supabase: `const { data, error } = await ...` — NEVER `.catch()`
- useEffect async: ALWAYS add mounted guard + cleanup return
- Realtime: ALWAYS clean up subscriptions in return function
- Soft delete only: `update({ deleted_at: new Date() })` — NEVER `.delete()`
- Errors: Arabic-friendly messages — NEVER raw error strings
- Voice recording: detect browser — Safari: audio/mp4, Chrome: audio/webm;codecs=opus

### For features:
- Follow feature-dev structured workflow: Explore → Plan → Build → Review
- Check if AI Command Center needs updating for new features
- Respect package-based AI limits on all AI features
- AI is always a helper — include trainer review option on all AI output

## PHASE 3: REVIEW (run all 4 agents in sequence)

After building, BEFORE committing, invoke each agent:

1. **@fluentia-code-reviewer** — Review all changed files for code quality issues
   → Fix everything found

2. **@fluentia-ux-reviewer** — Review all UI changes for RTL, mobile, accessibility
   → Fix everything found

3. **@fluentia-performance-auditor** — Review for performance bottlenecks
   → Fix everything found

4. **@fluentia-pre-push-auditor** — Final scan: no console.log, no secrets, no TODOs, CLAUDE.md updated
   → Fix everything found

## PHASE 4: SHIP (commit and deploy)

1. Update CLAUDE.md change log with:
   ```
   ### [DATE] — [DESCRIPTION]
   - What: [built/fixed]
   - Files: [added/modified]
   - DB: [new tables if any]
   - Edge Functions: [new/modified if any]
   - Status: [complete/partial]
   - Notes: [important for next session]
   ```

2. Update FLUENTIA-SPEC.md if architecture changed

3. Commit and push:
   ```bash
   git add -A && git commit -m "feat/fix: descriptive message" && git push
   ```

4. Deploy edge functions if applicable:
   ```bash
   supabase functions deploy FUNCTION_NAME --project-ref nmjexpuycmqcxuxljier
   ```
