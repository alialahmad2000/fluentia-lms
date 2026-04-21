// Maps a week number (1-12) to an IELTS phase with title + theme + description.

export const IELTS_PHASES = [
  {
    id: 'build',
    title: 'بناء المهارات',
    subtitle: 'Phase 1 — Foundation',
    weekRange: [1, 4],
    description: 'أساس متين في كل مهارة — قراءة يومية، استماع، كتابة أسبوعية، محادثة. اختبار تجريبي أول يقيس البداية.',
    milestone: 'Mock #1 — baseline score',
    milestoneWeek: 4,
  },
  {
    id: 'intensify',
    title: 'التكثيف',
    subtitle: 'Phase 2 — Intensify',
    weekRange: [5, 8],
    description: 'ترفع الجرعة — قطع أصعب، كتابة مرتين أسبوعياً، محادثة بأجزائها الثلاثة، استماع كامل.',
    milestone: 'Mock #2 — progress check',
    milestoneWeek: 8,
  },
  {
    id: 'ready',
    title: 'الجاهزية',
    subtitle: 'Phase 3 — Final Prep',
    weekRange: [9, 12],
    description: 'محاكاة كاملة ليوم الاختبار — قطع أصعب من الامتحان الحقيقي، كتابة ٣ مرات أسبوعياً، مقابلات محاكاة.',
    milestone: 'Final Mock — exam readiness',
    milestoneWeek: 12,
  },
];

export function getPhaseForWeek(week) {
  if (!week) return IELTS_PHASES[0];
  return IELTS_PHASES.find((p) => week >= p.weekRange[0] && week <= p.weekRange[1]) || IELTS_PHASES[0];
}

export function getWeekLabel(week) {
  if (!week) return 'ابدأ رحلتك';
  return `الأسبوع ${week}`;
}

export function getWeekStatus(week, currentWeek) {
  if (!currentWeek) return 'upcoming';
  if (week < currentWeek) return 'completed';
  if (week === currentWeek) return 'current';
  return 'upcoming';
}
