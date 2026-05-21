// Unit Movements V3.1 — activity → movement mapping
// V2's canonical activity keys: reading, grammar, vocabulary, listening,
// writing, speaking, recording (pronunciation shelved 2026-05-19).
// V3.1 groups them into 4 movements (Class / Master / Express / Test) with
// the exam (`assessment`) being non-activity — sourced via useUnitMasteryState.

import { V3_MOVEMENTS } from './_v3Tokens'

export function getMovementForActivity(activityKey) {
  for (const movement of V3_MOVEMENTS) {
    if (movement.activityKeys.includes(activityKey)) return movement
  }
  if (typeof console !== 'undefined') {
    console.warn(`[unit-v3.1] Unmapped activityKey: ${activityKey} — defaulting to "master"`)
  }
  return V3_MOVEMENTS.find(m => m.id === 'master')
}

// Returns canonical-order groups, filtering empty non-exam movements.
// Movements with isExamGate=true are ALWAYS returned (even with no activities)
// so the ExamGatePanel always renders — its state comes from useUnitMasteryState
// rather than activities[].
export function groupActivitiesByMovement(activities) {
  const safe = Array.isArray(activities) ? activities : []
  const groups = V3_MOVEMENTS.map(movement => ({
    movement,
    activities: safe.filter(a => movement.activityKeys.includes(a.key)),
  }))
  return groups.filter(g => g.movement.isExamGate || g.activities.length > 0)
}

// 4-7 word Arabic short descriptions shown under each activity title.
// V3.1 voice: warmer, more specific. Recording = trainer class video.
export const ACTIVITY_SHORT_DESCRIPTIONS_AR = {
  recording:     'تسجيل حصة المعلّمة',
  reading:       'القطعة والمفردات',
  vocabulary:    'كلمات الوحدة وتمارينها',
  grammar:       'القاعدة والتدريب عليها',
  listening:     'الاستماع وفهم المحادثة',
  writing:       'كتابة موجَّهة بتغذية راجعة',
  speaking:      'تسجيل صوتي بتقييم ذكي',
  pronunciation: 'نطق الكلمات الصعبة',
  assessment:    'اختبار الوحدة الشامل',
}

// Activity variants — drives Phase E (MovementPanel uses this to pick which
// station component to render). Activities without a variant get the default
// ActivityStation. Recording gets RecordingStation (media-aware).
export const ACTIVITY_VARIANT = {
  recording:  'media',
  assessment: 'exam_gate', // for reference — exam is rendered as a whole movement panel, not a station
}
