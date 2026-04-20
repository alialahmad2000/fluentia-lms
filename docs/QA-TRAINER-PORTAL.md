# QA Checklist — Trainer Portal
Post-quality-pass (commit after b13c8a9)

Run this after every trainer-portal deploy. Check each item in the browser — DevTools Console must be open.

---

## كـ علي (B1 trainer — real account)

### /trainer — Cockpit

- [ ] Page loads in < 2s, no black screen, no white flash
- [ ] Skeleton shows briefly then resolves to real content
- [ ] Hero greeting shows "علي" + time-appropriate greeting (صباح/مساء)
- [ ] Hero CTA matches time of day (morning ritual before 10am / default otherwise)
- [ ] Stats strip shows: XP number / streak days / student count
- [ ] Interventions section visible OR hidden (depends on open interventions)
- [ ] Pulse Map: 7 rows × 7 columns, cells colored by activity
- [ ] Grading section: shows top 3 pending OR hidden if queue empty
- [ ] Nabih card shows one suggestion OR hidden if no data
- [ ] "جولة تعريفية" button top-right — clicking starts driver.js tour
- [ ] No console errors (check DevTools → Console)

### /trainer/interventions

- [ ] Queue renders with real student names, not placeholders
- [ ] Each row: student name, signal reason, severity badge, age
- [ ] Filter tabs (الكل / عاجل / صامت) work and update list
- [ ] Click row → Student 360 or action modal opens
- [ ] Realtime badge updates when a new intervention arrives

### /trainer/prep

- [ ] Shows upcoming class or "لا توجد حصص قادمة"
- [ ] If class within 30 min → pre-class CTA visible
- [ ] Prep deck loads unit content and talking points

### /trainer/live

- [ ] If no active class → redirects to /trainer/prep (no blank screen)
- [ ] If active class → live toolbar with points/attendance/timer/note/progress tools
- [ ] End class button → confirm dialog → saves session → back to /trainer

### /trainer/grading

- [ ] Queue shows pending submissions, oldest first
- [ ] AI score + feedback pre-loaded per submission
- [ ] Approve / request-redo buttons work
- [ ] Empty state: "ما في شي معلق للتصحيح 👏"

### /trainer/students (legacy)

- [ ] Groups dropdown populated
- [ ] Student list renders on group select
- [ ] Student card shows name, level, last active, streak

### /trainer/student/:studentId

- [ ] Hero card: name, level, XP, streak, risk level
- [ ] Activity timeline shows last 30 days
- [ ] Skills radar shows section breakdown
- [ ] AI insight card loads (may take a moment)

### /trainer/curriculum

- [ ] Breadcrumb navigation: المنهج → Group → Unit
- [ ] Student progress color-coded by status
- [ ] Writing feedback modal opens on click

### /trainer/competition

- [ ] If active competition → leaderboard renders
- [ ] If no competition → "لا توجد مسابقة نشطة حالياً"

### /trainer/my-growth

- [ ] XP chart renders (line/bar)
- [ ] Weekly streak heatmap renders
- [ ] Goals and commissions section visible
- [ ] Recognitions from students visible (or empty state)

### /trainer/nabih

- [ ] Welcome screen if no conversation
- [ ] Suggested prompts as quick-start buttons
- [ ] Send message → AI responds within 5s
- [ ] Conversation list in sidebar updates
- [ ] New conversation button works

### /trainer/help

- [ ] All sections render (FAQ, shortcuts, tour trigger)
- [ ] Search filters sections in real-time
- [ ] "لا توجد نتائج" shown for unmatched search

---

## كـ د. محمد (A1 trainer — via impersonation)

To impersonate: Admin panel → Trainers → محمد → Impersonate

- [ ] Impersonation banner visible (top of page)
- [ ] /trainer cockpit shows A1 data only (NOT B1 students)
- [ ] Pulse map: A1 students only
- [ ] Grading queue: A1 students only
- [ ] Interventions: A1 students only
- [ ] Stop impersonation → back to Ali's data

---

## Mobile — iPhone SE 375px (DevTools responsive mode)

For each route listed above:

- [ ] No horizontal scroll (inspect body overflow)
- [ ] All buttons ≥ 44px height (inspect with DevTools)
- [ ] Text readable — body ≥ 14px Arabic
- [ ] Sidebar hidden → bottom tab bar visible
- [ ] Bottom tab bar doesn't cover page content (check padding-bottom)

### Cockpit specific at 375px
- [ ] Daily Brief column fits without scroll
- [ ] Hero CTA button full-width or wraps properly
- [ ] Pulse heatmap scrolls horizontally if needed (overflow-x: auto)
- [ ] Section cards have 12px+ padding on sides

---

## Console checks (must be zero errors after full navigation)

Open DevTools → Console → navigate through all 11 routes.

- [ ] Zero `[ErrorBoundary]` errors
- [ ] Zero `[TrainerErrorBoundary]` errors  
- [ ] Zero React hook order violations (Rule of Hooks #310)
- [ ] Zero undefined prop access errors
- [ ] Zero PostgREST column-not-found errors

---

## After verifying: sign off

```
Date: ___________
Verified by: علي
Build: ___________
Status: ✅ PASS / ❌ FAIL
Issues found: ___________
```
