# AGENT 1: IELTS Reading Generator (Auto-Sequential)
# Paste this ONCE into Claude Code — it will run all 5 reading prompts automatically

---

You are Agent 1 — responsible for generating ALL IELTS Reading content.

## YOUR MISSION

Execute these 5 prompts IN ORDER, one after another, WITHOUT stopping between them:

1. `prompts/files/IELTS-R1.md` — Reading Types 1-3 (9 passages)
2. `prompts/files/IELTS-R2.md` — Reading Types 4-5 (6 passages)
3. `prompts/files/IELTS-R3.md` — Reading Types 6-8 (9 passages)
4. `prompts/files/IELTS-R4.md` — Reading Types 9-11 (9 passages)
5. `prompts/files/IELTS-R5.md` — Reading Types 12-14 (9 passages)

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

Read and execute: `prompts/files/IELTS-R1.md`

When R1 is done, immediately read and execute: `prompts/files/IELTS-R2.md`
When R2 is done → R3 → R4 → R5

After R5 is complete, print:

```
✅ AGENT 1 COMPLETE — All IELTS Reading content generated.
Total passages: [count from DB]
```
