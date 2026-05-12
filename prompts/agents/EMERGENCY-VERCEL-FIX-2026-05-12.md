# 🚨 EMERGENCY — Vercel Production Deploy Failed (May 12, 2026 — 3:54 AM)

## CONTEXT
- Ali received Vercel email at 3:54 AM: "Failed production deployment on team 'alialahmad2000's projects'"
- Multiple Claude Code terminals were running in parallel — one of them pushed broken code
- Live site (`app.fluentia.academy`) is still showing the last successful deploy, but every commit pushed after that point is OFFLINE
- Recent shipped work that may be at risk: password reset bulletproof fix, PWA install name fix, Smart Audio Player foundation, God Communication Phase 1, landing page work, Atelier theme
- **Working directory:** `C:\Users\Dr. Ali\Desktop\fluentia-lms`
- **Model:** Opus, run with `--dangerously-skip-permissions`

## MISSION
Diagnose the failed deployment → fix the root cause → push → verify the next deploy succeeds → report.

---

## ⚠️ MANDATORY RULES — READ FIRST

1. **DO NOT run `npm run build` or `vite build` locally.** Ali's machine runs out of memory. Vercel is the only build environment.
2. Use the Vercel CLI (`npx vercel`) for every diagnostic step — logs, inspect, list.
3. After every `git push`:
   - Run: `git fetch origin && git log --oneline -1 HEAD && git log --oneline -1 origin/main`
   - Both SHAs must match.
4. After push, wait 90 seconds, then run: `npx vercel ls --count 5`
   - Confirm the newest deployment shows `● Ready` (not `● Error` or `● Building`).
   - If still `● Building`, wait 60 more seconds and check again. Repeat up to 4 times.
5. If the fix itself produces a NEW error in the next deployment, loop back to Phase A with the new failed deployment URL. **Do not give up — keep iterating until a deployment shows `● Ready`.**

---

## PHASE A — DIAGNOSE (READ-ONLY)

### A1. Pull deployment history

```bash
cd "/c/Users/Dr. Ali/Desktop/fluentia-lms"

# Last 30 deployments + state
npx vercel ls --count 30 2>&1 | tee /tmp/vercel-list.txt

# Last 30 commits
git log --oneline -30 > /tmp/git-list.txt
cat /tmp/git-list.txt
```

**Print and analyze:**
- Which deployment IDs show `● Ready` vs `● Error` vs `● Building`?
- What is the URL of the MOST RECENT failed deployment?
- What is the SHA of the last successful production deployment?
- How many commits sit between last-success and HEAD? (= the "offline" scope)

### A2. Inspect the most recent failed deployment

```bash
# Replace <FAILED_URL> with the URL of the most recent ● Error deployment from A1
npx vercel inspect <FAILED_URL> --logs 2>&1 | tee /tmp/vercel-recent-error.txt
```

**From the log, extract and print:**
- The exact error message(s) — search for lines containing: `Error:`, `ERROR`, `Cannot find`, `Module not found`, `Type error`, `SyntaxError`, `Out of memory`, `ENOSPC`, `Could not resolve`, `failed`.
- The file path and line number where the error occurred.
- The build command's exit code.
- The last 50 lines of the build log (for context).

### A3. Identify the culprit commit

If multiple deployments failed in a row, was it the SAME error each time, or different?

- Same error → one root cause introduced at a specific commit. Find that commit:
  ```bash
  # Inspect the FIRST failing deployment (oldest ● Error in the list)
  npx vercel inspect <OLDEST_FAILED_URL> --logs 2>&1 | head -60
  ```
- Different errors → multiple issues stacking. Fix the MOST RECENT first.

### A4. Check the four most common silent killers (run all four checks)

```bash
# (1) Untracked files imported by tracked files (the #1 cause historically — same as April 6, 2026 outage)
# Find all import statements, extract paths, check each one exists AND is tracked
git ls-files | grep -E "\.(jsx?|tsx?)$" | xargs grep -h -E "^import .* from ['\"](\.\.?/|@/)" 2>/dev/null | \
  sed -E "s/.*from ['\"]([^'\"]+)['\"].*/\1/" | sort -u > /tmp/all-imports.txt
echo "Total import paths: $(wc -l < /tmp/all-imports.txt)"

# (2) Case-sensitivity mismatches (Windows is case-insensitive, Linux/Vercel is case-sensitive)
# Print any tracked file whose path has unusual casing
git ls-files | grep -E "[A-Z]" | head -30

# (3) Missing VITE_* env vars on Vercel
npx vercel env ls production 2>&1 | tee /tmp/vercel-env.txt
grep -h "import.meta.env.VITE_" src -r 2>/dev/null | sed -E "s/.*VITE_([A-Z_]+).*/VITE_\1/" | sort -u > /tmp/required-env.txt
echo "Required VITE_ vars:"
cat /tmp/required-env.txt

# (4) Package-lock vs package.json drift
git status --short package.json package-lock.json
```

**Print findings for each of the four checks.** Whichever one matches the error from A2 is your root cause.

---

## PHASE B — FIX

### B1. Apply the fix based on root cause

Apply the targeted fix for whichever category matched in A4:

- **Untracked file:** `git add <missing-file> && git commit -m "fix(build): add missing <name> to git"`
- **Case mismatch:** Rename the file via `git mv` to match the import casing exactly.
- **Missing env var:** STOP. Print the missing var name and tell Ali to add it via the Vercel dashboard (`Settings → Environment Variables`). Do NOT proceed until he confirms.
- **Lockfile drift:** `npm install` to regenerate, then commit `package-lock.json`.
- **Syntax error / type error / import path typo:** Open the offending file, fix the exact line shown in the build log, commit.
- **Out of memory on Vercel side:** Check `vercel.json` for `buildCommand` — if it sets `NODE_OPTIONS`, verify the value. If not, add `"buildCommand": "NODE_OPTIONS=--max-old-space-size=4096 vite build"` to vercel.json and commit.
- **Anything else:** Print the full error, your hypothesis, and your proposed fix. Apply it.

### B2. Push the fix

```bash
git push origin main
git fetch origin
git log --oneline -1 HEAD
git log --oneline -1 origin/main
```

Both SHAs must match. If they don't, the push silently failed — retry.

### B3. Watch the next deployment

```bash
# Wait 90s then poll for up to 6 minutes
for i in 1 2 3 4 5 6; do
  echo "--- Check $i ($((i*60))s elapsed) ---"
  npx vercel ls --count 3 2>&1 | head -10
  sleep 60
done
```

The newest deployment must end in `● Ready`. If it ends in `● Error`, go back to PHASE A with the new failed deployment URL — a new error has surfaced underneath the first one.

---

## PHASE C — REPORT

Print this exact structured report at the end:

```
═══════════════════════════════════════════════
VERCEL EMERGENCY DEPLOY FIX — REPORT
═══════════════════════════════════════════════

LAST SUCCESSFUL DEPLOY (before incident)
  SHA:        <abcd1234>
  Timestamp:  <ISO datetime>
  Title:      <commit subject>

OFFLINE WINDOW
  Failed deploys:    <N>
  Commits offline:   <M>
  Duration offline:  <Y minutes>

ROOT CAUSE
  Category:   <untracked file | case mismatch | env var | lockfile | syntax | import path | OOM | other>
  Details:    <exact error line>
  Location:   <file:line>

FIX APPLIED
  Commit:     <new SHA>
  Summary:    <one line>

NEW DEPLOY
  URL:        <vercel URL>
  State:      ● Ready ✅

COMMITS NOW RESTORED TO PRODUCTION
  <SHA1>: <subject>
  <SHA2>: <subject>
  ...

POSSIBLY AFFECTED FEATURES (during outage)
  - <feature 1>
  - <feature 2>
```

---

## Out of scope

- Do NOT modify any feature code beyond the exact fix required.
- Do NOT touch `.env.*` files.
- Do NOT change Supabase config, edge functions, or RLS policies.
- Do NOT update README or status docs — only the fix commit.
- Do NOT delete files. If a file appears unused, leave it.
