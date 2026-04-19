// Single source of truth for IELTS access check.
// Takes studentData (package + custom_access live in students table, not profiles).
export function hasIELTSAccess(studentData) {
  if (!studentData) return false
  const pkg = studentData.package
  const custom = Array.isArray(studentData.custom_access) ? studentData.custom_access : []
  return pkg === 'ielts' || custom.includes('ielts')
}
