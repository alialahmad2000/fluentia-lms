// Single source of truth for the 5 retention module keys.
// Must mirror the CHECK constraint in supabase/migrations/20260524020000_retention_modules.sql.

import { pickGender } from '../../i18n/gender'

export const RETENTION_MODULES = Object.freeze({
  DAILY_PARTNER: 'daily_partner',
  SMART_HOMEWORK: 'smart_homework',
  WEEKLY_REPORTS: 'weekly_reports',
  STREAK_ACTIVATION: 'streak_activation',
  LESSON_BRIEFS: 'lesson_briefs',
})

export const MODULE_LABELS_AR = Object.freeze({
  daily_partner: 'الرفيق اليومي',
  smart_homework: 'الواجبات الذكية',
  weekly_reports: 'التقرير الأسبوعي',
  streak_activation: 'سلسلة الإنجاز',
  lesson_briefs: 'تحضير ومراجعة الكلاس',
})

// Gender-aware descriptions. The gendered entries (daily_partner, smart_homework,
// weekly_reports) are THUNKS — call them at render time so pickGender() reads the
// current student's gender then, not at module-import time when gender isn't known.
// The two neutral entries stay as plain strings. (Currently unconsumed; thunks keep
// the shape correct for any future caller — e.g. MODULE_DESCRIPTIONS_AR.daily_partner().)
export const MODULE_DESCRIPTIONS_AR = Object.freeze({
  daily_partner: () => pickGender(
    'محادثة يومية موجّهة مع رفيق ذكي — تتدرب على المحادثة بصوتك كل يوم',
    'محادثة يومية موجّهة مع رفيق ذكي — تتدربين على المحادثة بصوتك كل يوم'
  ),
  smart_homework: () => pickGender(
    'تمارين مخصّصة لك بناءً على أخطائك الفعلية — تصلك بعد كل كلاس',
    'تمارين مخصّصة لكِ بناءً على أخطائكِ الفعلية — تصلكِ بعد كل كلاس'
  ),
  weekly_reports: () => pickGender(
    'تقرير أسبوعي يلخّص تقدّمك ويحتفي بأكبر إنجازاتك',
    'تقرير أسبوعي يلخّص تقدّمكِ ويحتفي بأكبر إنجازاتكِ'
  ),
  streak_activation: 'سلسلة يومية للحفاظ على الزخم وتحدّيات أسبوعية مع مكافآت',
  lesson_briefs: 'تحضير قبل الكلاس ومراجعة بعده — كل واحدة أقل من دقيقتين',
})
