# PROMPT — Send Maintenance Push Notification to All Students

## 🎯 Goal
Send a push notification + in-app notification to ALL active students announcing a brief maintenance window for content update on L0 and L1.

---

## 📍 Working Directory
`C:\Users\Dr. Ali\Desktop\fluentia-lms`

---

## ⛔ Critical Rules

1. **Send to STUDENTS ONLY** — exclude admins and trainers
2. **Use existing infrastructure**: `send-push-notification` edge function + `notifications` table
3. **Exact text below** — do not rephrase
4. **Print recipient count** before sending for confirmation
5. **Log the send** — save result summary to `PHASE-2-CLEANUP/maintenance-notification-log.md`

---

## 📋 Notification Content

**Title (Arabic):**
```
🔧 صيانة مجدولة
```

**Body (Arabic):**
```
مرحباً بكم،

ستُجرى عملية صيانة سريعة على المنصة من الآن وحتى الساعة 6:00 مساءً.

قد تلاحظون بطءاً بسيطاً أو تعذّر الوصول لبعض الأقسام خلال هذه الفترة.

جميع بياناتكم وتقدّمكم محفوظة بالكامل.

شكراً لتفهّمكم.
```

**Type:** `system` / `maintenance`
**URL (click target):** `/curriculum` (or keep null)

---

## 📋 Execution Phases

### Phase 0 — Discovery (READ-ONLY)

Locate the existing push infrastructure:

```bash
# Find the edge function
ls -la supabase/functions/send-push-notification/ 2>/dev/null
# Find the notifications table schema
grep -r "notifications" supabase/migrations/ | head -20
# Find any existing admin broadcast tool
grep -r "announcement" src/pages/admin/ | head -10
```

**Query student count:**
```sql
-- Active students count
SELECT COUNT(*) AS student_count 
FROM profiles 
WHERE role = 'student' AND status = 'active';

-- Students with active push subscriptions
SELECT COUNT(DISTINCT ps.profile_id) AS subscribed_students
FROM push_subscriptions ps
JOIN profiles p ON p.id = ps.profile_id
WHERE p.role = 'student' AND ps.is_active = true;
```

**Print both numbers** before proceeding.

---

### Phase 1 — Compose the Broadcast

Create a one-off script at `scripts/send-maintenance-notification.cjs`:

```javascript
// scripts/send-maintenance-notification.cjs
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TITLE = '🔧 صيانة مجدولة';
const BODY = `مرحباً بكم،

ستُجرى عملية صيانة سريعة على المنصة من الآن وحتى الساعة 6:00 مساءً.

قد تلاحظون بطءاً بسيطاً أو تعذّر الوصول لبعض الأقسام خلال هذه الفترة.

جميع بياناتكم وتقدّمكم محفوظة بالكامل.

شكراً لتفهّمكم.`;

async function main() {
  // 1. Get all active students
  const { data: students, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'student')
    .eq('status', 'active');

  if (error) { console.error(error); process.exit(1); }
  
  console.log(`Target recipients: ${students.length} students`);
  console.log('Proceed? Pass --confirm to send.');
  
  if (!process.argv.includes('--confirm')) {
    console.log('Dry run complete. Re-run with --confirm to actually send.');
    process.exit(0);
  }

  // 2. Insert in-app notification for EVERY student (guaranteed delivery)
  const rows = students.map(s => ({
    profile_id: s.id,
    title: TITLE,
    body: BODY,
    type: 'system',
    url: '/curriculum',
    is_read: false
  }));
  
  const { error: insertErr } = await supabase
    .from('notifications')
    .insert(rows);
  
  if (insertErr) { console.error('Insert failed:', insertErr); process.exit(1); }
  console.log(`✅ Inserted ${rows.length} in-app notifications`);

  // 3. Invoke push function for each student
  let sent = 0, failed = 0;
  for (const s of students) {
    try {
      const { error: pushErr } = await supabase.functions.invoke('send-push-notification', {
        body: {
          profile_id: s.id,
          title: TITLE,
          body: BODY,
          url: '/curriculum'
        }
      });
      if (pushErr) { failed++; console.error(`Push failed for ${s.id}:`, pushErr.message); }
      else sent++;
    } catch (e) {
      failed++;
      console.error(`Exception for ${s.id}:`, e.message);
    }
  }

  console.log(`\n✅ Push results: ${sent} sent, ${failed} failed`);
  console.log(`📨 In-app: ${rows.length} delivered (guaranteed)`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

**⚠️ Adjust table/column names** based on Phase 0 discovery. If `status` column doesn't exist on profiles, drop that filter. If `push_subscriptions` has different column names, fix accordingly. **Do not assume schema.**

---

### Phase 2 — Dry-Run

```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"
node scripts/send-maintenance-notification.cjs
```

This runs WITHOUT `--confirm` and prints recipient count. Example output:
```
Target recipients: 12 students
Proceed? Pass --confirm to send.
```

**Print this output and wait for Ali's confirmation before proceeding.**

---

### Phase 3 — Send (after Ali confirms)

```bash
node scripts/send-maintenance-notification.cjs --confirm
```

Capture full output including:
- Number of in-app notifications inserted
- Push sent / failed count
- Any error messages

---

### Phase 4 — Verify & Log

Verify delivery:
```sql
-- Check notifications were created
SELECT COUNT(*) FROM notifications 
WHERE title = '🔧 صيانة مجدولة' 
  AND created_at > NOW() - INTERVAL '10 minutes';

-- Sample check: pick 3 random students, confirm notification exists
SELECT p.full_name, n.created_at, n.is_read
FROM notifications n
JOIN profiles p ON p.id = n.profile_id
WHERE n.title = '🔧 صيانة مجدولة'
ORDER BY random() LIMIT 3;
```

Save to `PHASE-2-CLEANUP/maintenance-notification-log.md`:
- Timestamp sent
- Recipient count
- Push sent/failed breakdown
- Sample verification output

---

### Phase 5 — Cleanup

Keep the script for future reuse (rename if useful):
```bash
# Optional: keep in scripts/, or delete if one-off
git add scripts/send-maintenance-notification.cjs PHASE-2-CLEANUP/maintenance-notification-log.md
git commit -m "chore: send maintenance notification to all students before L0/L1 rollback"
git push origin main

git fetch origin && git log --oneline -1 HEAD && git log --oneline -1 origin/main
```

---

## ✅ Success Criteria

- [ ] Phase 0 discovery printed (student count + push subscription count)
- [ ] Script created with correct table/column names (verified against actual schema)
- [ ] Dry-run output printed, waited for Ali's confirmation
- [ ] In-app notifications inserted for ALL active students
- [ ] Push notifications sent (best effort)
- [ ] Log saved to `PHASE-2-CLEANUP/maintenance-notification-log.md`
- [ ] Committed and pushed

---

## 🚫 Halt Conditions

- If student count = 0: HALT (something is wrong with the query)
- If recipient count > 50: HALT (unexpected, verify role filter)
- If push function not found: insert in-app notifications only, skip push, notify Ali
- If insert fails for any reason: HALT, do not proceed

---

## 📝 Command to Run

```
Read and execute prompts/agents/PROMPT-MAINTENANCE-NOTIFICATION.md. Run Phase 0 discovery and Phase 2 dry-run, then STOP and print the recipient count. Wait for my confirmation before Phase 3 (actual send).
```
