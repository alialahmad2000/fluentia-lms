// ─── XP Values (configurable via admin settings) ──────────
export const XP_VALUES = {
  assignment_on_time: 10,
  assignment_late: 5,
  class_attendance: 15,
  correct_answer_min: 5,
  correct_answer_max: 20,
  helped_peer: 10,
  shared_summary: 15,
  streak_7: 50,
  streak_14: 100,
  streak_30: 200,
  first_submission: 25,
  placement_test: 20,
  voice_note_bonus: 5,    // voice note > 60 seconds
  writing_bonus: 5,       // writing > 100 words
  daily_challenge: 5,
  early_bird: 5,
  reaction_received: 2,
  peer_recognition: 5,
  self_assessment: 10,
  improvement_bonus: 100,
  penalty_absent: -20,
  penalty_unknown_word: -5,
  penalty_pronunciation: -5,
  weekly_task: 10,
  weekly_all_complete: 25,
  spelling_80: 15,
  spelling_100: 30,
  verb_mastered: 5,
}

// ─── Gamification Level Thresholds (20 levels) ─────────────
export const GAMIFICATION_LEVELS = [
  { level: 1,  xp: 0,     title_ar: 'مبتدئ',     title_en: 'Newcomer' },
  { level: 2,  xp: 100,   title_ar: 'متعلم',     title_en: 'Learner' },
  { level: 3,  xp: 300,   title_ar: 'متحمس',     title_en: 'Enthusiast' },
  { level: 4,  xp: 600,   title_ar: 'نشيط',      title_en: 'Active' },
  { level: 5,  xp: 1000,  title_ar: 'ماهر',      title_en: 'Skilled' },
  { level: 6,  xp: 1500,  title_ar: 'متميز',     title_en: 'Distinguished' },
  { level: 7,  xp: 2100,  title_ar: 'محترف',     title_en: 'Professional' },
  { level: 8,  xp: 2800,  title_ar: 'خبير',      title_en: 'Expert' },
  { level: 9,  xp: 3600,  title_ar: 'أستاذ',     title_en: 'Master' },
  { level: 10, xp: 4500,  title_ar: 'نجم',       title_en: 'Star' },
  { level: 11, xp: 5500,  title_ar: 'ملهم',      title_en: 'Inspirational' },
  { level: 12, xp: 6600,  title_ar: 'قائد',      title_en: 'Leader' },
  { level: 13, xp: 7800,  title_ar: 'عبقري',     title_en: 'Genius' },
  { level: 14, xp: 9100,  title_ar: 'بطل',       title_en: 'Champion' },
  { level: 15, xp: 10500, title_ar: 'أسطوري',    title_en: 'Legendary' },
  { level: 16, xp: 12000, title_ar: 'خارق',      title_en: 'Extraordinary' },
  { level: 17, xp: 13600, title_ar: 'فريد',      title_en: 'Unique' },
  { level: 18, xp: 15300, title_ar: 'لامع',      title_en: 'Brilliant' },
  { level: 19, xp: 17100, title_ar: 'عظيم',      title_en: 'Great' },
  { level: 20, xp: 19000, title_ar: 'طلاقة',     title_en: 'Fluentia' },
]

// ─── Academic Level Info ───────────────────────────────────
export const ACADEMIC_LEVELS = {
  1: { cefr: 'A1', name_ar: 'الخطوة الأولى', name_en: 'First Step', track: 'foundation', book: 'Explorer Foundation', months: 4 },
  2: { cefr: 'A2', name_ar: 'بداية الثقة',   name_en: 'Building Confidence', track: 'foundation', book: 'Explorer 1', months: 4 },
  3: { cefr: 'B1', name_ar: 'صار يتكلم',     name_en: 'Finding Voice', track: 'development', book: 'Explorer 2', months: 4 },
  4: { cefr: 'B2', name_ar: 'ثقة كاملة',     name_en: 'Full Confidence', track: 'development', book: 'Explorer 3', months: 4 },
  5: { cefr: 'C1', name_ar: 'جاهز للعالم',   name_en: 'World Ready', track: 'development', book: 'Explorer 4-5', months: 4 },
}

// ─── Package Info ──────────────────────────────────────────
export const PACKAGES = {
  asas:    { name_ar: 'باقة أساس',  name_en: 'Asas',    price: 750,  color: 'sky',   classes: 8, private: 0,  report: 'monthly',   writing_limit: 2,  chatbot_limit: 10 },
  talaqa:  { name_ar: 'باقة طلاقة', name_en: 'Talaqa',  price: 1100, color: 'gold',  classes: 8, private: 1,  report: 'biweekly',  writing_limit: 4,  chatbot_limit: 20 },
  tamayuz: { name_ar: 'باقة تميّز', name_en: 'Tamayuz', price: 1500, color: 'violet', classes: 8, private: 4, report: 'weekly',    writing_limit: 8,  chatbot_limit: 999 },
  ielts:   { name_ar: 'دورة IELTS', name_en: 'IELTS',   price: 2000, color: 'rose',  classes: 8, private: 4,  report: 'weekly',    writing_limit: 8,  chatbot_limit: 20 },
}

// ─── Track Names ───────────────────────────────────────────
export const TRACKS = {
  foundation:  { name_ar: 'تأسيس', name_en: 'Foundation' },
  development: { name_ar: 'تطوير', name_en: 'Development' },
  ielts:       { name_ar: 'آيلتس', name_en: 'IELTS' },
}

// ─── Student Status Labels ─────────────────────────────────
export const STUDENT_STATUS = {
  active:    { label_ar: 'نشط',     color: 'green' },
  paused:    { label_ar: 'متوقف',   color: 'yellow' },
  graduated: { label_ar: 'متخرج',   color: 'gold' },
  withdrawn: { label_ar: 'منسحب',   color: 'red' },
}

// ─── Assignment Type Labels ────────────────────────────────
export const ASSIGNMENT_TYPES = {
  reading:        { label_ar: 'قراءة',       label_en: 'Reading',        icon: '📖' },
  speaking:       { label_ar: 'محادثة',      label_en: 'Speaking',       icon: '🎤' },
  listening:      { label_ar: 'استماع',      label_en: 'Listening',      icon: '🎧' },
  writing:        { label_ar: 'كتابة',       label_en: 'Writing',        icon: '✍️' },
  grammar:        { label_ar: 'قرامر',       label_en: 'Grammar',        icon: '📐' },
  vocabulary:     { label_ar: 'مفردات',      label_en: 'Vocabulary',     icon: '📚' },
  irregular_verbs:{ label_ar: 'أفعال شاذة',  label_en: 'Irregular Verbs', icon: '🔄' },
  custom:         { label_ar: 'مخصص',        label_en: 'Custom',         icon: '⭐' },
}

// ─── Submission Status Labels ──────────────────────────────
export const SUBMISSION_STATUS = {
  draft:              { label_ar: 'مسودة',          color: 'muted' },
  submitted:          { label_ar: 'تم التسليم',     color: 'blue' },
  graded:             { label_ar: 'تم التقييم',     color: 'green' },
  resubmit_requested: { label_ar: 'أعد التسليم',    color: 'yellow' },
}

// ─── Grade Labels ──────────────────────────────────────────
export const GRADE_LABELS = {
  'A+': { label_ar: 'ممتاز+',      color: 'green',  min: 95 },
  'A':  { label_ar: 'ممتاز',       color: 'green',  min: 90 },
  'B+': { label_ar: 'جيد جداً+',   color: 'sky',    min: 85 },
  'B':  { label_ar: 'جيد جداً',    color: 'sky',    min: 80 },
  'C+': { label_ar: 'جيد+',        color: 'yellow', min: 75 },
  'C':  { label_ar: 'جيد',         color: 'yellow', min: 70 },
  'D':  { label_ar: 'مقبول',       color: 'orange', min: 60 },
  'F':  { label_ar: 'يحتاج تحسين', color: 'red',    min: 0 },
}

// ─── Notification Type Config ──────────────────────────────
export const NOTIFICATION_TYPES = {
  assignment_new:      { label_ar: 'واجب جديد',          icon: '📝', color: 'sky' },
  assignment_deadline: { label_ar: 'موعد تسليم قريب',    icon: '⏰', color: 'yellow' },
  assignment_graded:   { label_ar: 'تم تقييم واجبك',     icon: '✅', color: 'green' },
  class_reminder:      { label_ar: 'تذكير بالحصة',       icon: '🔔', color: 'sky' },
  trainer_note:        { label_ar: 'ملاحظة من مدربك',    icon: '💬', color: 'sky' },
  achievement:         { label_ar: 'إنجاز جديد',         icon: '🏆', color: 'gold' },
  peer_recognition:    { label_ar: 'شكر من زميلك',       icon: '🤝', color: 'green' },
  team_update:         { label_ar: 'تحديث الفريق',       icon: '👥', color: 'violet' },
  payment_reminder:    { label_ar: 'تذكير بالدفع',       icon: '💳', color: 'yellow' },
  level_up:            { label_ar: 'ترقية مستوى',        icon: '⬆️', color: 'gold' },
  streak_warning:      { label_ar: 'تحذير الـ Streak',   icon: '🔥', color: 'orange' },
  system:              { label_ar: 'تنبيه النظام',       icon: '⚙️', color: 'muted' },
  weekly_tasks_ready:  { label_ar: 'مهام أسبوعية جديدة', icon: '📋', color: 'sky' },
  weekly_tasks_remind: { label_ar: 'تذكير بالمهام',      icon: '📝', color: 'yellow' },
  weekly_tasks_urgent: { label_ar: 'آخر يوم للمهام',     icon: '⏰', color: 'red' },
  spelling_milestone:  { label_ar: 'إنجاز إملائي',       icon: '✏️', color: 'green' },
  smart_nudge:         { label_ar: 'نصيحة ذكية',         icon: '💡', color: 'violet' },
  test_result:         { label_ar: 'نتيجة اختبار',       icon: '📊', color: 'sky' },
  curriculum_progress: { label_ar: 'تقدم في المنهج',     icon: '📚', color: 'emerald' },
  speaking_feedback:   { label_ar: 'تقييم المحادثة',     icon: '🎤', color: 'violet' },
  announcement:        { label_ar: 'إعلان',              icon: '📢', color: 'sky' },
  competition_event:   { label_ar: 'المسابقة',           icon: '⚔️', color: 'sky' },
  task_completed:      { label_ar: 'مهمة مكتملة',        icon: '✅', color: 'green' },
}

// ─── Payment Status Labels ─────────────────────────────────
export const PAYMENT_STATUS = {
  paid:    { label_ar: 'مدفوع',         color: 'green' },
  partial: { label_ar: 'دفع جزئي',     color: 'yellow' },
  pending: { label_ar: 'بانتظار الدفع', color: 'blue' },
  overdue: { label_ar: 'متأخر',         color: 'red' },
  failed:  { label_ar: 'فشل الدفع',     color: 'red' },
}

// ─── Weekly Task Types ────────────────────────────────────
export const WEEKLY_TASK_TYPES = {
  speaking:        { label_ar: 'تحدث',       label_en: 'Speaking',        icon: '🎤', color: 'sky' },
  reading:         { label_ar: 'قراءة',      label_en: 'Reading',         icon: '📖', color: 'emerald' },
  writing:         { label_ar: 'كتابة',      label_en: 'Writing',         icon: '✍️', color: 'violet' },
  listening:       { label_ar: 'استماع',     label_en: 'Listening',       icon: '🎧', color: 'amber' },
  irregular_verbs: { label_ar: 'أفعال شاذة', label_en: 'Irregular Verbs', icon: '🔄', color: 'rose' },
}

// ─── Weekly Task Status ───────────────────────────────────
export const WEEKLY_TASK_STATUS = {
  pending:             { label_ar: 'قيد الانتظار', color: 'muted' },
  submitted:           { label_ar: 'تم التسليم',   color: 'blue' },
  graded:              { label_ar: 'تم التقييم',   color: 'green' },
  resubmit_requested:  { label_ar: 'أعد التسليم',  color: 'yellow' },
  skipped:             { label_ar: 'تم التخطي',    color: 'red' },
}

// ─── Academy Info ──────────────────────────────────────────
export const ACADEMY = {
  name: 'Fluentia Academy',
  name_ar: 'أكاديمية طلاقة',
  phone: '+966 55 866 9974',
  tiktok: '@fluentia_',
  instagram: '@fluentia__',
  landing: 'fluentia-site.vercel.app',
  // CRITICAL: Correct terminology for the free initial session
  free_session_name: 'لقاء مبدئي مجاني مع المدرب',
  // NEVER use: 'كلاس تجريبي مجاني'
}
