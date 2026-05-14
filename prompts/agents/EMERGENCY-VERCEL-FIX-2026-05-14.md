# 🚨 EMERGENCY — Vercel Production Deploy Failed (May 14, 2026)

## CONTEXT
- Ali just received Vercel email: "Failed production deployment on team 'alialahmad2000's projects'"
- This is the 4th failed-deploy incident in 2 months (Apr 6, Apr 18, May 12, May 14 — same recurring pattern)
- Live site (`app.fluentia.academy`) is still showing the last successful deploy, but every commit pushed after that point is OFFLINE
- Multiple Claude Code terminals may be running in parallel — one of them pushed broken code
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
   - Both SHAs must match exactly.
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

- **Same error** → one root cause introduced at a specific commit. Find that commit:
  ```bash
  # Inspect the FIRST failing deployment (oldest ● Error in the list)
  npx vercel inspect <OLDEST_FAILED_URL> --logs 2>&1 | head -60
  ```
- **Different errors** → multiple issues stacking. Fix the MOST RECENT first.

### A4. Check the four most common silent killers

These are the historical root causes from the past 4 outages:

#### (1) Untracked files imported by tracked files (most common — caused April 6 outage)

Files exist locally so local build works, but were never `git add`-ed, so Vercel can't find them.

```bash
# Find all import statements, extract paths, check each one exists AND is tracked
git ls-files | grep -E "\.(jsx?|tsx?)$" | xargs grep -h -E "^import .* from ['\"](\.\.?/|@/)" 2>/dev/null | \
  sed -E "s/.*from ['\"]([^'\"]+)['\"].*/\1/" | sort -u > /tmp/all-imports.txt

# Check git status for untracked files in src/
git status --short src/ | grep -E "^\?\?" | tee /tmp/untracked.txt
```

If `untracked.txt` shows files in `src/`, check if any of them appear in `all-imports.txt`. If yes → those are the culprits.

#### (2) Case-sensitivity mismatch (Windows is case-insensitive, Linux is not — caused May 8 outage)

```bash
# Find imports referencing paths that don't exist with exact case match
node -e "
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const files = cp.execSync('git ls-files \"src/**/*.{js,jsx,ts,tsx}\"', {encoding:'utf8'}).split('\n').filter(Boolean);
let issues = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /^import\s.*?from\s+['\"]([^'\"]+)['\"]/gm;
  let m;
  while ((m = re.exec(src))) {
    const imp = m[1];
    if (!imp.startsWith('.') && !imp.startsWith('@/')) continue;
    let resolved;
    if (imp.startsWith('@/')) resolved = path.join('src', imp.slice(2));
    else resolved = path.join(path.dirname(f), imp);
    // Try common extensions
    const candidates = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx'];
    let found = false;
    for (const ext of candidates) {
      const full = resolved + ext;
      if (fs.existsSync(full)) {
        // Verify exact case by walking up
        const parts = full.split(path.sep);
        let cursor = parts[0] || '.';
        let mismatch = false;
        for (let i = 1; i < parts.length; i++) {
          const entries = fs.readdirSync(cursor);
          if (!entries.includes(parts[i])) { mismatch = true; break; }
          cursor = path.join(cursor, parts[i]);
        }
        if (!mismatch) { found = true; break; }
      }
    }
    if (!found) issues.push({file: f, import: imp});
  }
}

if (issues.length === 0) console.log('OK: no case-sensitivity issues');
else issues.forEach(i => console.log('MISMATCH', i.file, '→', i.import));
"
```

#### (3) Missing `VITE_*` env vars on Vercel (caused April 7 push notif outage)

```bash
# List env vars Vercel knows about
npx vercel env ls 2>&1 | tee /tmp/vercel-env.txt

# List env vars the code expects
grep -rhE "import\.meta\.env\.VITE_[A-Z_]+" src/ 2>/dev/null | \
  grep -oE "VITE_[A-Z_]+" | sort -u > /tmp/code-env.txt

cat /tmp/code-env.txt
```

Compare both lists. Any `VITE_*` in `code-env.txt` that doesn't appear in `vercel-env.txt` = missing var.
**If missing, STOP and tell Ali — adding env vars requires his Vercel dashboard action.**

#### (4) Missing lockfile dependency

If a `package.json` `dependencies` entry was added but `package-lock.json` wasn't updated/committed:

```bash
# Check if package.json was modified more recently than package-lock.json
git log -1 --format="%ai %H" -- package.json
git log -1 --format="%ai %H" -- package-lock.json

# Diff dependencies in both
node -e "
const pkg = require('./package.json');
const lock = require('./package-lock.json');
const pkgDeps = {...(pkg.dependencies||{}), ...(pkg.devDependencies||{})};
const lockDeps = lock.packages[''].dependencies || {};
const lockDevDeps = lock.packages[''].devDependencies || {};
const inLock = {...lockDeps, ...lockDevDeps};
for (const d of Object.keys(pkgDeps)) {
  if (!inLock[d]) console.log('MISSING IN LOCK:', d);
}
"
```

---

## PHASE B — FIX

Based on Phase A findings, apply the SMALLEST fix that resolves the error.

**Common fix patterns by error type:**

| Error pattern | Fix |
|---|---|
| `Cannot find module './X'` where X exists locally | `git add` the file → commit → push |
| `Cannot find module './X'` where X is wrong case | Rename file to match import OR fix import case |
| `import.meta.env.VITE_X is undefined` | STOP — tell Ali to add env var to Vercel dashboard |
| `Cannot find package 'Y'` | `npm install Y` → commit `package.json` + `package-lock.json` |
| `Out of memory` in Vite build | Tell Ali — needs Vercel project memory bump (dashboard) |
| `SyntaxError` or `Type error` | Fix the syntax in the file shown in the log |
| `ENOSPC` | Vercel infra issue — re-deploy via `npx vercel --prod` once |

### B1. Apply the fix

Make the smallest possible code change to fix the error. Do NOT take this opportunity to refactor anything else.

### B2. Commit with a clear message

```bash
git add -A
git status --short
git commit -m "fix(deploy): <one-line summary of what broke + what fixed it>

Vercel deployment was failing with: <exact error from build log>
Root cause: <one sentence>
Fix: <one sentence>"
```

### B3. Push

```bash
git push origin main
git fetch origin
echo "HEAD:   $(git log --oneline -1 HEAD)"
echo "ORIGIN: $(git log --oneline -1 origin/main)"
```

Both SHAs must match.

### B4. Verify next deploy

```bash
# Wait for Vercel to start building
sleep 30

# Poll until ready or error (max 4 minutes)
for i in 1 2 3 4 5 6 7 8; do
  npx vercel ls --count 3 2>&1 | head -8
  STATE=$(npx vercel ls --count 1 2>&1 | grep -oE "● (Ready|Error|Building|Queued)" | head -1)
  echo "Attempt $i: $STATE"
  if echo "$STATE" | grep -q "Ready"; then echo "✅ DEPLOYED"; break; fi
  if echo "$STATE" | grep -q "Error"; then echo "❌ NEW ERROR — loop back to Phase A"; break; fi
  sleep 30
done
```

If the new deploy ALSO fails:
- Run `npx vercel inspect <NEW_FAILED_URL> --logs` and loop back to Phase A.
- Keep iterating until `● Ready`.

---

## PHASE C — REPORT BACK

When deploy is `● Ready`, print this exact block:

```
═══════════════════════════════════════════════
🟢 VERCEL DEPLOY RECOVERED — May 14, 2026
═══════════════════════════════════════════════

Last successful deploy before incident: <SHA>
Failed deploys: <count>
Commits that were offline: <N>

Root cause: <one sentence>
Error message: <exact>
File(s) touched in fix: <list>
Fix commit SHA: <SHA>
New ● Ready deployment: <URL>

Recurrence prevention note for Ali:
<one sentence — e.g. "Consider running `npm run pre-deploy-check`
before pushing — see scripts/check-imports.mjs">
═══════════════════════════════════════════════
```

---

## DO NOT

- ❌ Run `vite build` or `npm run build` locally (machine runs out of memory)
- ❌ Touch any file unrelated to the deploy fix (no refactors, no "while we're here" cleanups)
- ❌ Push without verifying remote SHA matches local
- ❌ Stop after one fix attempt — keep iterating until `● Ready`
- ❌ Skip the report block at the end
