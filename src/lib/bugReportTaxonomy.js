// Bug-report taxonomy — shared by the student report sheet (BugReportModal) and
// the admin triage page (AdminBugReports) so labels never drift.
//
// The goal: help a (often frustrated) student point us at EXACTLY where the
// problem is, with as few taps as possible. The area is auto-detected from the
// page they're on and pre-selected, so the common path is: open → confirm area
// → tap a problem type → send.
//
// v1 is storage-light: these selections ride in the report's `description`
// header (instant readability in the staff notification/email) AND in the
// `device_info` JSON (so the admin page can render/filter them). No DB columns
// needed yet — promote to real columns in a later phase if we want analytics.

// ── Areas (mirror the live student sidebar sections) ────────────────────────
// `match` is tested against window.location.pathname (longest match wins).
export const AREAS = [
  {
    id: 'curriculum', label: 'المنهج', emoji: '📚', match: ['/student/curriculum', '/trainer/curriculum'],
    subsections: [
      { id: 'reading', label: 'القراءة' },
      { id: 'listening', label: 'الاستماع' },
      { id: 'grammar', label: 'القواعد' },
      { id: 'vocabulary', label: 'المفردات' },
      { id: 'writing', label: 'الكتابة' },
      { id: 'speaking', label: 'التحدّث' },
      { id: 'pronunciation', label: 'النطق' },
      { id: 'video', label: 'الفيديو' },
      { id: 'assessment', label: 'الاختبار القصير' },
    ],
  },
  {
    id: 'vocabulary', label: 'المفردات', emoji: '✨', match: ['/student/vocab-journey', '/student/flashcards'],
    subsections: [
      { id: 'journey', label: 'الرحلة (الكوكبات)' },
      { id: 'cards', label: 'البطاقات والتصفّح' },
      { id: 'quiz', label: 'الاختبار' },
    ],
  },
  { id: 'daily-review', label: 'مراجعة المفردات', emoji: '🔁', match: ['/student/srs'] },
  { id: 'hard-words', label: 'الكلمات الصعبة', emoji: '🏋️', match: ['/student/hard-words'] },
  { id: 'spelling', label: 'مختبر الإملاء', emoji: '✍️', match: ['/student/spelling-lab', '/student/spelling'] },
  { id: 'mock-exam', label: 'الاختبار التجريبي', emoji: '📝', match: ['/student/mock-exam'] },
  { id: 'ielts', label: 'IELTS Atelier', emoji: '🎓', match: ['/student/ielts-atelier'] },
  { id: 'chat', label: 'المحادثة', emoji: '💬', match: ['/chat'] },
  { id: 'leaderboard', label: 'لوحة الشرف والمبارزات', emoji: '🏆', match: ['/student/leaderboard', '/student/duels', '/student/competition'] },
  { id: 'dashboard', label: 'الرئيسية', emoji: '🏠', match: ['/student'] }, // keep last among /student/* (shortest)
  { id: 'account', label: 'حسابي', emoji: '👤', match: ['/student/profile', '/account'] },
  { id: 'other', label: 'شيء آخر / لست متأكدة', emoji: '❓', match: [] },
]

// ── Problem types (the "what kind" — drives triage at a glance) ─────────────
export const PROBLEM_TYPES = [
  { id: 'audio', label: 'الصوت لا يعمل', emoji: '🔊' },
  { id: 'blank', label: 'الصفحة لا تفتح / شاشة فارغة', emoji: '⬛' },
  { id: 'button', label: 'زر أو رابط لا يعمل', emoji: '🔘' },
  { id: 'wrong-content', label: 'محتوى أو إجابة غير صحيحة', emoji: '❌' },
  { id: 'wrong-text', label: 'نص أو ترجمة خاطئة', emoji: '📝' },
  { id: 'slow', label: 'بطء أو تعليق', emoji: '🐢' },
  { id: 'visual', label: 'مشكلة في الشكل أو الترتيب', emoji: '🎨' },
  { id: 'suggestion', label: 'اقتراح أو تحسين', emoji: '💡' },
  { id: 'other', label: 'شيء آخر', emoji: '❓' },
]

// ── Severity (optional, one tap — helps us prioritise) ──────────────────────
export const SEVERITIES = [
  { id: 'blocking', label: 'أوقفتني تماماً', emoji: '🔴', color: '#ef4444' },
  { id: 'annoying', label: 'أكملت بصعوبة', emoji: '🟡', color: '#f59e0b' },
  { id: 'minor', label: 'بسيطة', emoji: '🟢', color: '#22c55e' },
]

// Look up helpers (used by the admin page to render chips from stored ids).
export const areaById = (id) => AREAS.find((a) => a.id === id) || null
export const problemTypeById = (id) => PROBLEM_TYPES.find((p) => p.id === id) || null
export const severityById = (id) => SEVERITIES.find((s) => s.id === id) || null
export const subsectionById = (areaId, subId) =>
  (areaById(areaId)?.subsections || []).find((s) => s.id === subId) || null

// Auto-detect the area from a pathname (longest matching prefix wins so
// "/student/curriculum" beats the bare "/student" dashboard match).
export function detectArea(pathname = '') {
  let best = null
  let bestLen = -1
  for (const a of AREAS) {
    for (const m of a.match) {
      if (pathname === m || pathname.startsWith(m + '/') || pathname.startsWith(m)) {
        if (m.length > bestLen) { best = a.id; bestLen = m.length }
      }
    }
  }
  return best
}
