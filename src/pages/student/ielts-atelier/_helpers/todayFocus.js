// Derives 3 concrete action items for "today" from the adaptive plan.
// Actual plan.weekly_schedule keys: sunday/monday/.../saturday
// Each item: { task_type, duration_min, description_ar, target_lab_route }

import { BookOpen, Headphones, PenLine, Mic } from 'lucide-react';

const ICON_MAP = {
  reading:  BookOpen,
  listening: Headphones,
  writing:  PenLine,
  speaking: Mic,
};

const COLOR_MAP = {
  reading:  '#fbbf24',
  listening: '#f97316',
  writing:  '#fb923c',
  speaking: '#f59e0b',
};

// V1 lab routes → V2 routes
const V2_ROUTE_MAP = {
  reading:  '/student/ielts-v2/reading',
  listening: '/student/ielts-v2/listening',
  writing:  '/student/ielts-v2/writing',
  speaking: '/student/ielts-v2/speaking',
  mock:     '/student/ielts-v2/mock',
  errors:   '/student/ielts-v2/errors',
  diagnostic: '/student/ielts-v2/diagnostic',
};

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const STARTER_DAY = [
  {
    id: 'diagnostic',
    icon: BookOpen,
    title: 'ابدأ الاختبار التشخيصي',
    subtitle: 'لنعرف من أين نبدأ',
    duration: '~60 دقيقة',
    path: '/student/ielts-v2/diagnostic',
    skillColor: '#a78bfa',
  },
];

function pickDailyItems(plan) {
  if (!plan || !plan.weekly_schedule) return null;

  const todayKey = DAY_KEYS[new Date().getDay()];
  const todayItems = plan.weekly_schedule[todayKey] || [];

  // If today (Friday) is empty, fall back to Sunday schedule
  const items = todayItems.length > 0
    ? todayItems
    : plan.weekly_schedule[DAY_KEYS[0]] || [];

  if (items.length === 0) return null;

  // Deduplicate by task_type, prefer skill-based tasks, take up to 3
  const seen = new Set();
  const picks = [];
  for (const a of items) {
    const key = a.task_type;
    if (!seen.has(key) && picks.length < 3) {
      seen.add(key);
      picks.push(a);
    }
  }

  if (picks.length === 0) return null;

  return picks.map((a, i) => ({
    id: `${a.task_type}-${i}`,
    icon: ICON_MAP[a.task_type] || BookOpen,
    title: a.description_ar || `تمرين ${a.task_type}`,
    subtitle: '',
    duration: a.duration_min ? `~${a.duration_min} دقيقة` : '',
    path: V2_ROUTE_MAP[a.task_type] || `/student/ielts-v2/${a.task_type}`,
    skillColor: COLOR_MAP[a.task_type] || '#fbbf24',
  }));
}

export function deriveTodayFocus(plan) {
  const fromPlan = pickDailyItems(plan);
  if (fromPlan && fromPlan.length > 0) return fromPlan;
  return STARTER_DAY;
}
