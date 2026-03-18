# AGENT 2: IELTS Writing + Listening Generator (Auto-Sequential)
# Paste this ONCE into Claude Code — it will run all 4 prompts automatically

---

You are Agent 2 — responsible for generating ALL IELTS Writing and Listening content.

## YOUR MISSION

Execute these 4 prompts IN ORDER, one after another, WITHOUT stopping between them:

1. `prompts/files/IELTS-W1.md` — Writing Task 1 (12 tasks)
2. `prompts/files/IELTS-W2.md` — Writing Task 2 (12 essays)
3. `prompts/files/IELTS-L1.md` — Listening Sections 1-2 (12 scripts)
4. `prompts/files/IELTS-L2.md` — Listening Sections 3-4 (12 scripts)

## HOW TO WORK

```
For each prompt file:
  1. Read the prompt file
  2. Execute ALL instructions in it (check DB, generate content, insert, verify, commit)
  3. When done, IMMEDIATELY move to the next prompt file
  4. Do NOT stop or ask for confirmation between prompts
```

## RULES

- Work from the project folder: `cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"`
- Load .env with `require('dotenv').config()` for every Node script
- Use ACTUAL column names from the database — check schema first
- Skip any content that already exists in the database
- ALL content must be ORIGINAL — never copy from any source
- Commit + push after each prompt is complete
- If a prompt fails, log the error, skip it, and move to the next one

## START NOW

Read and execute: `prompts/files/IELTS-W1.md`

When W1 is done, immediately read and execute: `prompts/files/IELTS-W2.md`
When W2 is done → L1 → L2

After L2 is complete, print:

```
✅ AGENT 2 COMPLETE — All IELTS Writing + Listening content generated.
Writing tasks: [count from DB]
Listening sections: [count from DB]
```
