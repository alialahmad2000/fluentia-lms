# PROMPT BF5: Notification Settings Redesign — Accordion Categories
# Priority: 🟢 ENHANCEMENT
# Estimated time: 15 minutes

---

## CONTEXT

Fluentia LMS — production Arabic-first LMS.
- **Repo:** alialahmad2000/fluentia-lms
- **Stack:** React 18 + Vite + Tailwind + Supabase (ref: nmjexpuycmqcxuxljier) + Framer Motion
- **Design:** Dark theme default, RTL, Tajawal font, CSS variables only

## ⚠️ CRITICAL RULES

1. `const { data, error } = await ...` — NEVER `.catch()`
2. RTL Arabic-first, all colors via CSS variables
3. Framer Motion for accordion animations
4. 44px touch targets, mobile-first
5. Light mode must work equally well

---

## TASK: Redesign Notification Settings with Accordion Categories

**Current state:** Flat list of toggle switches — hard to navigate.

**New design:** Categorized accordion sections with smooth animations.

### Database:

```sql
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  notification_type text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auto-populate defaults for new users (trigger)
CREATE OR REPLACE FUNCTION populate_notification_defaults()
RETURNS trigger AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, category, notification_type, enabled) VALUES
    -- التعلم
    (NEW.id, 'learning', 'new_assignment', true),
    (NEW.id, 'learning', 'deadline_approaching', true),
    (NEW.id, 'learning', 'assignment_graded', true),
    -- الحصص
    (NEW.id, 'classes', 'class_reminder_30min', true),
    (NEW.id, 'classes', 'class_reminder_5min', true),
    (NEW.id, 'classes', 'trainer_note', true),
    -- الإنجازات والنقاط
    (NEW.id, 'achievements', 'new_achievement', true),
    (NEW.id, 'achievements', 'new_xp', true),
    (NEW.id, 'achievements', 'peer_thanks', true),
    -- المجموعة والفريق
    (NEW.id, 'team', 'team_update', true),
    (NEW.id, 'team', 'peer_submission', true),
    (NEW.id, 'team', 'group_update', true),
    -- المدفوعات
    (NEW.id, 'payments', 'payment_reminder', true)
  ON CONFLICT (user_id, notification_type) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER populate_notifications_on_profile_create
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION populate_notification_defaults();

-- Populate for existing users
INSERT INTO notification_preferences (user_id, category, notification_type, enabled)
SELECT p.id, v.category, v.notification_type, true
FROM profiles p
CROSS JOIN (VALUES
  ('learning', 'new_assignment'),
  ('learning', 'deadline_approaching'),
  ('learning', 'assignment_graded'),
  ('classes', 'class_reminder_30min'),
  ('classes', 'class_reminder_5min'),
  ('classes', 'trainer_note'),
  ('achievements', 'new_achievement'),
  ('achievements', 'new_xp'),
  ('achievements', 'peer_thanks'),
  ('team', 'team_update'),
  ('team', 'peer_submission'),
  ('team', 'group_update'),
  ('payments', 'payment_reminder')
) AS v(category, notification_type)
ON CONFLICT (user_id, notification_type) DO NOTHING;
```

### Category Definition (hardcoded in frontend):

```javascript
const NOTIFICATION_CATEGORIES = [
  {
    id: 'learning',
    icon: 'BookOpen', // from lucide-react
    label: 'التعلم',
    color: 'sky',
    types: [
      { key: 'new_assignment', label: 'واجب جديد' },
      { key: 'deadline_approaching', label: 'موعد تسليم قريب' },
      { key: 'assignment_graded', label: 'تم تقييم واجبك' },
    ],
  },
  {
    id: 'classes',
    icon: 'Calendar',
    label: 'الحصص',
    color: 'violet',
    types: [
      { key: 'class_reminder_30min', label: 'تذكير بالحصة (٣٠ دقيقة قبل)' },
      { key: 'class_reminder_5min', label: 'تذكير بالحصة (٥ دقائق قبل)' },
      { key: 'trainer_note', label: 'ملاحظة من مدربك' },
    ],
  },
  {
    id: 'achievements',
    icon: 'Trophy',
    label: 'الإنجازات والنقاط',
    color: 'amber',
    types: [
      { key: 'new_achievement', label: 'إنجاز جديد' },
      { key: 'new_xp', label: 'نقاط XP جديدة' },
      { key: 'peer_thanks', label: 'شكر من زميلك' },
    ],
  },
  {
    id: 'team',
    icon: 'Users',
    label: 'المجموعة والفريق',
    color: 'emerald',
    types: [
      { key: 'team_update', label: 'تحديث الفريق' },
      { key: 'peer_submission', label: 'زميل أنجز واجباً' },
      { key: 'group_update', label: 'تحديث من المجموعة' },
    ],
  },
  {
    id: 'payments',
    icon: 'CreditCard',
    label: 'المدفوعات',
    color: 'rose',
    types: [
      { key: 'payment_reminder', label: 'تذكير بموعد الدفع' },
    ],
  },
];
```

### Component Implementation:

```jsx
// src/pages/student/NotificationSettings.jsx (or in Settings page)

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Bell, BellOff } from 'lucide-react';
import * as Icons from 'lucide-react';

const NotificationSettings = () => {
  const [preferences, setPreferences] = useState({});
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Fetch preferences
  useEffect(() => {
    let isMounted = true;
    const fetchPrefs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('notification_type, enabled')
        .eq('user_id', user.id);
      
      if (isMounted && !error) {
        const map = {};
        data.forEach(p => { map[p.notification_type] = p.enabled; });
        setPreferences(map);
        setMasterEnabled(Object.values(map).some(v => v));
        setLoading(false);
      }
    };
    fetchPrefs();
    return () => { isMounted = false; };
  }, []);

  // Toggle single notification
  const toggleNotification = async (type, enabled) => {
    setPreferences(prev => ({ ...prev, [type]: enabled }));
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('notification_preferences')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('notification_type', type);
    if (error) {
      // Revert on error
      setPreferences(prev => ({ ...prev, [type]: !enabled }));
    }
  };

  // Toggle all in category
  const toggleCategory = async (category, enabled) => {
    const types = category.types.map(t => t.key);
    const newPrefs = { ...preferences };
    types.forEach(t => { newPrefs[t] = enabled; });
    setPreferences(newPrefs);
    
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('notification_preferences')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .in('notification_type', types);
    // Handle error...
  };

  // Master toggle
  const toggleMaster = async (enabled) => {
    setMasterEnabled(enabled);
    const allTypes = NOTIFICATION_CATEGORIES.flatMap(c => c.types.map(t => t.key));
    const newPrefs = {};
    allTypes.forEach(t => { newPrefs[t] = enabled; });
    setPreferences(newPrefs);
    
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('notification_preferences')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
  };

  const getEnabledCount = (category) => {
    return category.types.filter(t => preferences[t.key]).length;
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Master Toggle */}
      <div className="flex items-center justify-between p-4 rounded-2xl
        bg-[var(--color-surface)] border border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          {masterEnabled ? (
            <Bell className="w-5 h-5 text-[var(--color-primary)]" />
          ) : (
            <BellOff className="w-5 h-5 text-[var(--color-muted)]" />
          )}
          <span className="font-bold">
            {masterEnabled ? 'الإشعارات مفعّلة' : 'جميع الإشعارات متوقفة'}
          </span>
        </div>
        <Toggle checked={masterEnabled} onChange={toggleMaster} />
      </div>

      {/* Categories */}
      {NOTIFICATION_CATEGORIES.map((category) => {
        const Icon = Icons[category.icon];
        const isExpanded = expandedCategory === category.id;
        const enabledCount = getEnabledCount(category);
        const allEnabled = enabledCount === category.types.length;
        
        return (
          <div key={category.id} 
            className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
            
            {/* Category Header */}
            <button 
              onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-bg)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-${category.color}-500/10 
                  flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${category.color}-500`} />
                </div>
                <div className="text-right">
                  <p className="font-semibold">{category.label}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {enabledCount} من {category.types.length} مفعّل
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-[var(--color-muted)] transition-transform 
                ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Expanded Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {/* Toggle all in category */}
                  <div className="flex items-center justify-between px-4 py-2 
                    border-t border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-muted)]">
                      {allEnabled ? 'إيقاف الكل' : 'تفعيل الكل'}
                    </span>
                    <Toggle 
                      checked={allEnabled} 
                      onChange={(v) => toggleCategory(category, v)} 
                      small 
                    />
                  </div>
                  
                  {/* Individual notifications */}
                  <div className="px-4 pb-3 space-y-1">
                    {category.types.map((type) => (
                      <div key={type.key} 
                        className="flex items-center justify-between py-3 
                          border-b border-[var(--color-border)] last:border-0">
                        <span className="text-sm">{type.label}</span>
                        <Toggle 
                          checked={preferences[type.key] ?? true}
                          onChange={(v) => toggleNotification(type.key, v)}
                          small
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
```

### Toggle Component (if not exists):
```jsx
const Toggle = ({ checked, onChange, small }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors
      ${small ? 'h-6 w-11' : 'h-7 w-12'}
      ${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
  >
    <span className={`inline-block rounded-full bg-white shadow-sm transition-transform
      ${small ? 'h-4 w-4 mt-1' : 'h-5 w-5 mt-1'}
      ${checked 
        ? (small ? 'translate-x-1 rtl:-translate-x-5' : 'translate-x-1 rtl:-translate-x-6') 
        : (small ? 'translate-x-6 rtl:-translate-x-1' : 'translate-x-6 rtl:-translate-x-1')
      }`}
    />
  </button>
);
```

**Note on RTL toggle:** The toggle thumb position is REVERSED in RTL. Test carefully on both LTR and RTL layouts. The translate values above are estimates — adjust based on actual rendering. Consider using `ltr:translate-x-5 rtl:-translate-x-5` Tailwind directional modifiers.

### Integration:
- Place this component in the existing Settings/Profile page
- If Settings page uses tabs, add "الإشعارات" as a tab
- These preferences MUST be checked by the actual notification system when sending notifications (if notifications are currently just UI, note this — the preferences should be functional when push notifications are implemented)

---

## VERIFICATION

- [ ] Page loads with correct preferences from Supabase
- [ ] Master toggle enables/disables ALL notifications
- [ ] Each category collapses/expands with smooth animation
- [ ] Category header shows enabled count (e.g., "٢ من ٣ مفعّل")
- [ ] "تفعيل الكل" / "إيقاف الكل" works per category
- [ ] Individual toggles save to Supabase on change
- [ ] New user gets default preferences automatically (all enabled)
- [ ] Works in dark + light mode
- [ ] Works on mobile (44px touch targets for toggles)
- [ ] RTL layout correct (toggles on left, labels on right)

---

## GIT

```bash
git add -A
git commit -m "feat: notification settings redesign with accordion categories + preferences table"
git push origin main
```
