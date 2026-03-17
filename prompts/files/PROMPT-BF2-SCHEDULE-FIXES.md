# PROMPT BF2: Fix Schedule — Classes Display + Read-Only + Task Planning
# Priority: 🔴 CRITICAL
# Estimated time: 15-20 minutes

---

## CONTEXT

Fluentia LMS — production Arabic-first LMS.
- **Repo:** alialahmad2000/fluentia-lms
- **Stack:** React 18 + Vite + Tailwind + Supabase (ref: nmjexpuycmqcxuxljier) + Framer Motion
- **Design:** Dark theme default, RTL, Tajawal font, all colors via CSS variables

## ⚠️ CRITICAL RULES

1. `const { data, error } = await ...` — NEVER `.catch()` on Supabase
2. RTL Arabic-first — all layouts
3. All colors via CSS variables — zero hardcoded
4. Mobile-first, 44px touch targets, Safari iOS compatible
5. Framer Motion for animations
6. Soft delete only

---

## TASK: 3 SCHEDULE IMPROVEMENTS

### FIX 1: Classes NOT Showing on Student Schedule (Point 1)

**Problem:** Student opens Schedule page → calendar is empty. Classes exist in Supabase (in `classes` or `class_sessions` table) but don't appear.

**Steps:**
1. Find the student schedule page: look in `src/pages/student/Schedule.jsx` or similar
2. Check which table it queries: `classes`, `class_sessions`, or `group_classes`
3. Check the query:
   - Is it filtering by the student's `group_id`?
   - Is it filtering by date range (current month/week)?
   - Is the RLS policy allowing students to see their group's classes?
4. Verify the data flow:
   - Student has a `group_id` in their profile/student record
   - Classes are linked to that group
   - Query joins correctly
5. Check if there's a recurring schedule pattern:
   - Groups have fixed weekly slots (e.g., Sunday + Tuesday, 8-9 PM)
   - These might be in `groups` table as `schedule` jsonb column
   - Or in a `class_sessions` / `recurring_classes` table
6. If classes are stored as one-off records: ensure they're created for the current period
7. If classes use a recurring pattern: ensure the frontend generates calendar events from the pattern

**Expected result:** Student opens Schedule → sees all their weekly classes on the calendar with correct day/time.

---

### FIX 2: Classes Must Be READ-ONLY for Students (Point 2)

**Problem:** Students might be able to drag, edit, or delete classes. Classes MUST be completely locked for students.

**Implementation:**
1. In the student schedule component:
   - Classes render as **fixed, non-draggable** events
   - NO edit button, NO delete button, NO drag handles
   - Visual indicator: lock icon or solid background (different from personal events)
2. Click on a class → opens a **read-only modal** showing:
   - 🕐 الوقت (Time): e.g., "الأحد ٨:٠٠ - ٩:٠٠ مساءً"
   - 📚 الموضوع (Topic): from class record
   - 🔗 رابط الحصة (Google Meet link): clickable button "انضم للحصة"
   - 👨‍🏫 المدرب (Trainer name)
   - **NO edit buttons. NO reschedule. NO delete.**
3. Only trainers and admins can modify classes from THEIR dashboards

**Class event styling (student view):**
```jsx
// Class events — distinct from personal tasks
<div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 
  rounded-xl px-3 py-2 cursor-pointer select-none"
  style={{ pointerEvents: 'auto' }} // clickable but NOT draggable
>
  <div className="flex items-center gap-2">
    <Lock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
    <span className="text-sm font-medium">حصة إنجليزي</span>
  </div>
  <span className="text-xs text-[var(--color-muted)]">٨:٠٠ - ٩:٠٠ م</span>
</div>
```

**Read-only modal:**
```jsx
// Modal content — NO form elements, NO edit actions
<div className="space-y-4 p-6">
  <h3 className="text-xl font-bold">حصة إنجليزي</h3>
  
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <Clock className="w-5 h-5 text-[var(--color-muted)]" />
      <span>الأحد ٨:٠٠ - ٩:٠٠ مساءً</span>
    </div>
    <div className="flex items-center gap-3">
      <BookOpen className="w-5 h-5 text-[var(--color-muted)]" />
      <span>{class.topic || 'لم يُحدد الموضوع بعد'}</span>
    </div>
    <div className="flex items-center gap-3">
      <User className="w-5 h-5 text-[var(--color-muted)]" />
      <span>{trainerName}</span>
    </div>
  </div>
  
  {class.google_meet_link && (
    <a href={class.google_meet_link} target="_blank" rel="noopener noreferrer"
      className="block w-full text-center py-3 rounded-xl bg-[var(--color-primary)] 
        text-white font-semibold hover:opacity-90 transition-opacity">
      انضم للحصة 🔗
    </a>
  )}
</div>
```

---

### FIX 3: Weekly Task Planning Section Below Calendar (Point 3)

**Problem:** Students have weekly tasks but can't plan when to do them. Add a planning section.

**Database change:**
```sql
-- Add planned_date column to weekly_tasks
ALTER TABLE weekly_tasks ADD COLUMN IF NOT EXISTS planned_date date;
```

Run this migration first. Create a new migration file if using migration files.

**Implementation:**

1. **Below the calendar**, add a section titled "خطط أسبوعك 📋"
2. Show all weekly tasks for the CURRENT week that are NOT yet completed
3. Each task card shows:
   - Task title + type icon (speaking 🎤, writing ✍️, reading 📖, listening 🎧, grammar 📝)
   - Estimated duration (e.g., "~١٥ دقيقة")
   - Status badge (لم تبدأ / مخطط لها)
4. Each task has a **dropdown** or **date picker**: "متى تخطط تنجزها؟" with days of the current week
5. When student selects a day → save `planned_date` to Supabase
6. Planned tasks appear on the calendar on their selected day — in a DIFFERENT color from classes:
   - Classes: sky-blue/primary color
   - Planned tasks: emerald/green color
7. Student can freely change the planned day
8. Tasks with no planned date show in the "غير مجدولة" (unscheduled) area

**Task card design:**
```jsx
<motion.div 
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  className="flex items-center justify-between p-4 rounded-xl 
    bg-[var(--color-surface)] border border-[var(--color-border)]"
>
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
      {typeIcon}
    </div>
    <div>
      <p className="font-medium text-sm">{task.title}</p>
      <p className="text-xs text-[var(--color-muted)]">~{task.estimated_minutes} دقيقة</p>
    </div>
  </div>
  
  <select 
    value={task.planned_date || ''}
    onChange={(e) => updatePlannedDate(task.id, e.target.value)}
    className="text-sm rounded-lg px-3 py-2 bg-[var(--color-bg)] 
      border border-[var(--color-border)] text-[var(--color-text)]"
  >
    <option value="">اختر يوم</option>
    {weekDays.map(day => (
      <option key={day.date} value={day.date}>{day.label}</option>
    ))}
  </select>
</motion.div>
```

**Calendar task event (different from class):**
```jsx
<div className="bg-emerald-500/10 border border-emerald-500/20 
  rounded-lg px-2 py-1 text-xs">
  <span>{task.title}</span>
</div>
```

---

## VERIFICATION

- [ ] Student opens Schedule → sees weekly classes on calendar
- [ ] Click class → read-only modal with time, topic, Meet link, trainer name
- [ ] Student CANNOT drag, edit, or delete classes
- [ ] "خطط أسبوعك" section shows current week's tasks
- [ ] Student can assign a task to a day → it appears on calendar in green
- [ ] Student can change the planned day
- [ ] Planned dates persist after page refresh (saved in Supabase)
- [ ] Works on mobile (especially Safari iOS)
- [ ] Works in dark mode AND light mode

---

## GIT

```bash
git add -A
git commit -m "feat: fix schedule — show classes, read-only for students, weekly task planning"
git push origin main
```
