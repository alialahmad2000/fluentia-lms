// Single source of truth for the 5 retention module keys.
// Must mirror the CHECK constraint in supabase/migrations/20260524020000_retention_modules.sql.

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

export const MODULE_DESCRIPTIONS_AR = Object.freeze({
  daily_partner: 'محادثة يومية موجّهة مع رفيق ذكي — تتدربين على المحادثة بصوتك كل يوم',
  smart_homework: 'تمارين مخصّصة لكِ بناءً على أخطائكِ الفعلية — تصلكِ بعد كل كلاس',
  weekly_reports: 'تقرير أسبوعي يلخّص تقدّمكِ ويحتفي بأكبر إنجازاتكِ',
  streak_activation: 'سلسلة يومية للحفاظ على الزخم وتحدّيات أسبوعية مع مكافآت',
  lesson_briefs: 'تحضير قبل الكلاس ومراجعة بعده — كل واحدة أقل من دقيقتين',
})
