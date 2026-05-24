// Retention system — shared client utilities and hooks.
// All retention modules import from this single barrel.

export { useRetentionModuleEnabled, useRetentionModuleStatus } from './useRetentionModule.js'
export { useStudentLevel } from './useStudentLevel.js'
export { useStudentMistakeTags, MISTAKE_TAGS } from './useStudentMistakeTags.js'
export { RETENTION_MODULES, MODULE_LABELS_AR } from './constants.js'
