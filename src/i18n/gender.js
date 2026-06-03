// ── Arabic grammatical-gender tone ─────────────────────────────────────────
// Arabic addresses people differently by gender: imperatives (ابدأ vs ابدئي),
// adjectives (مستعد vs مستعدة), pronouns (أنت vs أنتِ), greetings (بك vs بكِ).
// The original copy was written female-toned because the academy is mostly women;
// male students (Ali, Abdur Rahman, …) were being addressed as female. These
// helpers resolve the right form from the logged-in/impersonated student's gender
// (`students.gender`, already populated), so every second-person string can match.
//
// DEFAULT = 'female': the academy is overwhelmingly female and the existing copy is
// female-toned, so an unknown/null gender safely preserves the prior behavior — no
// regression for current students. Only an explicit 'male' flips to the male form.
//
// USAGE (React components):
//   import { useG } from '@/i18n/gender'
//   const g = useG()
//   <h1>{g('مرحباً بك', 'مرحباً بكِ')}</h1>     // g(MALE_form, FEMALE_form)
//   <button>{g('ابدأ', 'ابدئي')}</button>
//
// USAGE (non-React: utils, constants built at call time, toast helpers):
//   import { pickGender } from '@/i18n/gender'
//   toast(pickGender('أحسنت!', 'أحسنتِ!'))
//
// Only wrap strings whose male/female forms actually DIFFER in spelling
// (imperatives ـي, adjectives ـة, explicit kasra ـكِ/ـتِ). Plain unvocalized forms
// like "حسابك" / "أكملت" read correctly for BOTH genders — leave them alone.

import { useMemo } from 'react'
import { useAuthStore } from '../stores/authStore'

function normalize(g) {
  return g === 'male' ? 'male' : 'female'
}

/** Reactive grammatical gender of the current student: 'male' | 'female' (default 'female'). */
export function useGender() {
  const raw = useAuthStore((s) => s.studentData?.gender)
  return normalize(raw)
}

/**
 * Returns g(maleForm, femaleForm) → the form matching the current student's gender.
 * Reactive: re-renders when the student/gender changes (incl. admin impersonation).
 */
export function useG() {
  const gender = useGender()
  return useMemo(() => (male, female) => (gender === 'male' ? male : female), [gender])
}

/** Non-reactive read for non-component code. Reads the store at call time. */
export function getGender() {
  try {
    return normalize(useAuthStore.getState().studentData?.gender)
  } catch {
    return 'female'
  }
}

/** Non-hook picker for utils/constants. pickGender(maleForm, femaleForm). */
export function pickGender(male, female) {
  return getGender() === 'male' ? male : female
}
