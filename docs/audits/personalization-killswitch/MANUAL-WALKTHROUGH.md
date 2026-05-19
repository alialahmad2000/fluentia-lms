# Manual Walkthrough — Personalization Kill-Switch Verification

Date: 2026-05-19

After this fix lands in production, please run the following spot-checks in a real browser session. The automated three-profile sweep passes 15/15, but only the browser confirms client-side purge + UI absence.

## Subjects tested by the automated sweep

- **layan88700@gmail.com** — has interests, has completed survey
- **nourahumayyim@gmail.com** — has interests, has completed survey
- **sarashrahili22@gmail.com** — control: no interests, no survey

All three see identical canonical curriculum rows + read `app_config.personalization_enabled = false`.

## Test as a real student with interests

1. Log in as **layan88700@gmail.com** (or any student who previously completed the interest survey).
2. Navigate to any unit's reading section. Recommended: Level 5 Unit 8 ("ذكاء الأسراب"), `00ca3625-46ee-4e38-95da-2255f522aff8`.
3. Confirm:
   - Title shown matches **"Nature's Hidden Networks"** (canonical, not a variant)
   - Press play — audio reads the canonical opening "In the vast expanses of the Arabian Peninsula…"
   - Switch to Article B (القراءة B) — title + audio + karaoke all update together to "Nature's Architects of Innovation"
4. Open DevTools → Application → Local Storage:
   - **No keys** starting with `fluentia:variant`, `fluentia:selected`, `fluentia:personali`, `fluentia:interest` (the kill-switch purges any present on next load)
5. Open DevTools → Console and run:
   ```js
   await window.supabase
     .from('app_config')
     .select('key, value')
     .eq('key', 'personalization_enabled')
     .maybeSingle()
   ```
   - Expect: `{ data: { key: 'personalization_enabled', value: false }, error: null }`
6. Navigate to /student/dashboard — no "اختر اهتماماتك" survey card should appear.
7. Navigate to /student/profile — no "اهتماماتي" / interest settings section should appear.

## Test as the control student (no interests)

1. Log out, log in as **sarashrahili22@gmail.com**.
2. Same checks: canonical text, canonical audio, identical to test student's view, flag reads false.

## What to do if anything fails

Report back with: the subject, the step number, and what was seen in DevTools Network + Console. The kill-switch is layered (DB flag + hook short-circuit + client purge), so a failure on any single layer is recoverable without rolling back the whole change.
