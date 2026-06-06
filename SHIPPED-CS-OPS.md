# SHIPPED — Fluentia CS Operations (A → Z)

Branch: **`cs-ops`** (built in an isolated worktree off `origin/main`, never touched the shared tree).
Status: **System A + System B complete and verified.** DB + edge changes are LIVE (additive, gated); the **frontend is on `cs-ops` and is NOT in production until you merge**.
(Terminal report written as `SHIPPED-CS-OPS.md` to avoid clobbering the prior build's `SHIPPED.md`.)

## How to merge
```bash
# review then merge cs-ops → main (Vercel auto-deploys main)
gh pr merge cs-ops --squash    # or merge via the GitHub PR UI
```
After merge, confirm the live JS bundle hash changed at https://app.fluentia.academy.

---

## What shipped

### SYSTEM A — Lead Pipeline & Performance
- **Tables:** `crm_leads`, `crm_lead_activities` (RLS: staff-only via `is_staff()`).
- **RPCs:** `crm_log_activity`, `crm_set_status`, `crm_performance(period)` (admin-only).
- **Role:** new `agent` value added to the `user_role` enum. `agent` reaches `/team/*`, is blocked from `/admin/*` and student areas; `admin` reaches everything.
- **Routes (frontend):** `/team` (workspace shell, tabs) → `/team/pipeline` (kanban + quick-add + 1-tap WhatsApp + lead drawer), `/team/followups` (overdue + due-today, Riyadh tz). Admin: `/admin/cs-performance`.

### SYSTEM B — Scheduling, Reminders & Calendar
- **Tables:** `cs_availability_rules` (seeded with your hours), `cs_bookings` (hard DB double-booking guard via `btree_gist` EXCLUDE).
- **RPCs:** `cs_book`, `cs_reschedule`, `cs_set_booking_status`, `cs_within_availability`, `cs_search_students` (staff-gated).
- **Route (frontend):** `/team/schedule` (week view, book lead/student/manual, reschedule/cancel/done/no-show, override toggle). Admin: `/admin/integrations`.
- **Edge functions (deployed, ACTIVE, `--no-verify-jwt`):** `gcal-sync` (creates/updates/deletes calendar events with **60 + 10 min popup reminders**), `gcal-oauth` (connect flow). **Both are GATED** — they no-op (`{skipped:"not_configured"}`) until you finish the Google setup below.
- **Cron:** `cs-gcal-sync-sweep` (every 5 min) — only fires when a Google integration is connected.

### Your weekly availability (seeded)
Sun–Thu 15:00–23:00, Sat 13:00–20:00, Fri off (override-only). Editable anytime in `cs_availability_rules`.

---

## ① Grant Hajar & Manal the `agent` role (when you send me their emails)
A ready script creates the account + role + forces a first-login password change:
```bash
cd ~/projects/fluentia-lms
node scripts/cs-ops/create-agent.cjs hajar@example.com "هاجر" "Temp#2026"
node scripts/cs-ops/create-agent.cjs manal@example.com "منال" "Temp#2026"
```
Share the email + temp password with each; first login forces a password change. They then see only `/team/*`.

## ② Activate Google Calendar reminders (C3) — manual steps for you
Until done, scheduling fully works; only the calendar event + phone alarm are inactive.
1. **Google Cloud Console** → create a project.
2. **Enable** the **Google Calendar API**.
3. **OAuth consent screen** → External → add yourself (Ali) as a **Test user** → scope `https://www.googleapis.com/auth/calendar.events`.
4. **Credentials** → create an **OAuth 2.0 Client ID** (type **Web application**).
   - Authorized redirect URI: **`https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/gcal-oauth`**
5. Set these **edge-function secrets** (Supabase → Project Settings → Edge Functions → Secrets):
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` = `https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/gcal-oauth`
   - `APP_URL` = `https://app.fluentia.academy`
6. In the app: **`/admin/integrations` → "ربط Google Calendar"** → approve. State flips to **مربوط**.

## ③ Test one real booking end-to-end
1. Open **`/team/schedule`** → **حجز جديد** → pick a lead/student/manual → type + a date/time **inside an availability window** → **تأكيد الحجز**.
2. The booking appears on the day; if it was a lead, it auto-flips to **حجز تجربة (trial_booked)** in the pipeline.
3. With Google connected (②), the event appears on your calendar with two popup reminders (60 + 10 min). Cancelling the booking deletes the event.

---

## Deferred / notes
- **C4 (optional in-app push, 15-min-before):** deferred. C3's native calendar reminders are the must-have and are live. The in-app push must target *your specific* admin account (5 admin accounts exist) — tell me which is yours and I'll wire it in ~10 min (PWA push infra already exists).
- **Verification:** every DB layer was verified live under real JWTs — non-staff blocked, agent allowed (RLS + RPC guards), overlap/availability/override logic, lead→trial_booked on booking, funnel + per-rep aggregation, gcal-sync gating. Throwaway verification accounts were created and **deleted** at finish (production is clean).
- **Frontend verification:** all files esbuild-parse-clean (per the no-local-build rule). Recommend a visual click-through on a Vercel preview or post-merge: agent → `/team/*`; admin → `/admin/cs-performance` + `/admin/integrations`.
- **Spec corrections applied:** real repo path `~/projects/fluentia-lms`; the new role lives in the `user_role` enum; `is_staff()` compares `role::text` to decouple from enum timing; `/team` guard is `['agent','admin']`.

## Ready-to-paste CLAUDE.md change-log entry
> Not auto-added to avoid a merge conflict on the hot shared file. Paste at the top of the CHANGE LOG after merge:
```
### 2026-06-06 — CS OPERATIONS (full A→Z build, branch cs-ops)
- System A: crm_leads + crm_lead_activities (RLS is_staff), RPCs crm_log_activity/crm_set_status/crm_performance; new `agent` role in user_role enum; /team workspace (pipeline kanban + quick-add + 1-tap WhatsApp logging + lead drawer; follow-ups queue Riyadh-tz); admin /admin/cs-performance.
- System B: cs_availability_rules + cs_bookings (btree_gist EXCLUDE no-overlap), RPCs cs_book/cs_reschedule/cs_set_booking_status/cs_within_availability/cs_search_students; /team/schedule week view; integration_tokens + gcal-oauth + gcal-sync edge fns (60+10min reminders, GATED until Google creds set); cs-gcal-sync-sweep cron (fires only when connected); /admin/integrations.
- Verified live under real agent/admin/non-staff JWTs. Frontend on cs-ops (merge to ship). Hajar/Manal accounts via scripts/cs-ops/create-agent.cjs. Google setup steps in SHIPPED-CS-OPS.md. C4 in-app push deferred.
```
