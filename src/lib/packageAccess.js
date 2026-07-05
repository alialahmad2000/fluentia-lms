// Single source of truth for IELTS access check.
// Takes studentData (package + custom_access live in students table, not profiles).
// Tamayuz is the premium tier — it includes IELTS prep (decision: 2026-05-20 Atelier launch).
export function hasIELTSAccess(studentData) {
  if (!studentData) return false
  // An IELTS-first account (uses_ielts_home) implies access by definition, so the
  // student never lands on the locked panel their whole account is gated behind.
  if (studentData.uses_ielts_home === true) return true
  const pkg = studentData.package
  const custom = Array.isArray(studentData.custom_access) ? studentData.custom_access : []
  return pkg === 'ielts' || pkg === 'tamayuz' || custom.includes('ielts')
}
