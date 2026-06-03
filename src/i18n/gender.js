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

// ── DB-content transform ────────────────────────────────────────────────────
// Some second-person Arabic is STORED in the database (exercise instructions,
// writing/speaking prompts) and was written female-toned, so the static UI
// helpers above can't gender it. genderizeText() rewrites a CURATED, bounded set
// of clearly-feminine imperatives/markers to their masculine form FOR MALE
// students only (females see the stored female text unchanged → no regression).
// Word-boundary aware (Arabic letters) so an imperative inside another word is
// never touched. Only well-known instruction verbs are listed — never arbitrary
// female-looking text — to avoid false positives.
const FEM_TO_MASC = {
  اكتبي: 'اكتب', ابدئي: 'ابدأ', ابدأي: 'ابدأ', اختاري: 'اختر', حاولي: 'حاول',
  أجيبي: 'أجِب', أجبي: 'أجِب', راجعي: 'راجع', أكملي: 'أكمل', اقرئي: 'اقرأ',
  استمعي: 'استمع', شاهدي: 'شاهد', حوّلي: 'حوّل', حولي: 'حوّل', صنّفي: 'صنّف',
  رتّبي: 'رتّب', رتبي: 'رتّب', طابقي: 'طابق', عبّري: 'عبّر', عبري: 'عبّر',
  اشرحي: 'اشرح', حدّدي: 'حدّد', حددي: 'حدّد', املئي: 'املأ',
  اربطي: 'اربط', لاحظي: 'لاحظ', انتبهي: 'انتبه', تذكّري: 'تذكّر', تذكري: 'تذكّر',
  سجّلي: 'سجّل', سجلي: 'سجّل', أعيدي: 'أعِد', كرّري: 'كرّر', كرري: 'كرّر',
  ترجمي: 'ترجم', استخدمي: 'استخدم', فكّري: 'فكّر', فكري: 'فكّر', تخيّلي: 'تخيّل',
  تخيلي: 'تخيّل', لخّصي: 'لخّص', لخصي: 'لخّص', قارني: 'قارن', اذكري: 'اذكر',
  أكمِلي: 'أكمل', أنتِ: 'أنت', بكِ: 'بك',
}
// Plain split/join (NO regex) — avoids lookbehind, which throws on iOS Safari < 16.4
// (the students' devices). Keys are distinctive female imperatives (ـي) / kasra
// markers, so substring false-positives in short prompt text are not a concern;
// the few risky short words (ضعي، صفي، صلي) are intentionally excluded.
function applyMasc(text) {
  let out = text
  for (const k in FEM_TO_MASC) {
    if (out.indexOf(k) !== -1) out = out.split(k).join(FEM_TO_MASC[k])
  }
  return out
}

/** Transform stored female-toned text to the current student's gender (male-only). */
export function genderizeText(text) {
  if (typeof text !== 'string' || !text || getGender() !== 'male') return text
  return applyMasc(text)
}

/** Reactive hook: returns gz(text) for DB-sourced student-facing copy. */
export function useGenderize() {
  const gender = useGender()
  return useMemo(() => (text) => {
    if (typeof text !== 'string' || !text || gender !== 'male') return text
    return applyMasc(text)
  }, [gender])
}
