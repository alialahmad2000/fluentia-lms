// Unit Movements V3 — activity → movement mapping
// V2's canonical activity keys are: reading, grammar, vocabulary, listening,
// writing, speaking, recording (pronunciation is shelved 2026-05-19).
// V3 groups them into 4 movements in canonical narrative order.

import { V3_MOVEMENTS } from './_v3Tokens'

export function getMovementForActivity(activityKey) {
  for (const movement of V3_MOVEMENTS) {
    if (movement.activityKeys.includes(activityKey)) return movement
  }
  if (typeof console !== 'undefined') {
    console.warn(`[unit-v3] Unmapped activityKey: ${activityKey} — defaulting to "master" movement`)
  }
  return V3_MOVEMENTS.find(m => m.id === 'master')
}

// Pure transform — input shape comes straight from useUnitData().activities
export function groupActivitiesByMovement(activities) {
  if (!Array.isArray(activities) || activities.length === 0) return []
  const groups = V3_MOVEMENTS.map(movement => ({
    movement,
    activities: activities.filter(a => movement.activityKeys.includes(a.key)),
  }))
  return groups.filter(g => g.activities.length > 0)
}

// 4-7 word Arabic short descriptions shown under the activity title in each station.
export const ACTIVITY_SHORT_DESCRIPTIONS_AR = {
  reading:       'القطع وقاموس الكلمات',
  vocabulary:    'كلمات الوحدة وتمارينها',
  grammar:       'القاعدة والتدريب عليها',
  listening:     'الاستماع وفهم المحادثة',
  writing:       'كتابة موجَّهة بتغذية راجعة',
  speaking:      'تسجيل صوتي بتقييم ذكي',
  pronunciation: 'نطق الكلمات الصعبة',
  recording:     'حفظ تسجيل ختامي',
}
