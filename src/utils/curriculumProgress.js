const REQUIRED_SECTIONS = ['reading', 'grammar', 'listening', 'vocabulary', 'writing']

/**
 * Calculate unit completion from section progress records
 * @param {Array} sectionProgress - rows from student_curriculum_progress for one unit
 * @returns {{ status: string, completionPercent: number, sectionsCompleted: number, totalSections: number, sectionDetails: Array }}
 */
export function calculateUnitCompletion(sectionProgress = []) {
  const sectionDetails = REQUIRED_SECTIONS.map(type => {
    const entries = sectionProgress.filter(s => s.section_type === type)
    if (type === 'reading' && entries.length > 1) {
      // Multiple reading passages — only "completed" if ALL are completed
      const allCompleted = entries.every(e => e.status === 'completed')
      const anyStarted = entries.some(e => e.status === 'in_progress' || e.status === 'completed')
      const avgScore = entries.reduce((sum, e) => sum + (e.score ?? 0), 0) / entries.length
      return {
        type,
        status: allCompleted ? 'completed' : anyStarted ? 'in_progress' : 'not_started',
        score: allCompleted ? Math.round(avgScore) : null,
      }
    }
    const entry = entries[0]
    return {
      type,
      status: entry?.status || 'not_started',
      score: entry?.score ?? null,
    }
  })

  const completedCount = sectionDetails.filter(s => s.status === 'completed').length
  const inProgressCount = sectionDetails.filter(s => s.status === 'in_progress').length
  const completionPercent = Math.round((completedCount / REQUIRED_SECTIONS.length) * 100)

  let status = 'not_started'
  if (completedCount === REQUIRED_SECTIONS.length) status = 'completed'
  else if (completedCount > 0 || inProgressCount > 0) status = 'in_progress'

  return {
    status,
    completionPercent,
    sectionsCompleted: completedCount,
    totalSections: REQUIRED_SECTIONS.length,
    sectionDetails,
  }
}

/**
 * Group flat progress rows by unit_id
 * @param {Array} progressRows - rows from student_curriculum_progress
 * @returns {Object} { [unitId]: progressRow[] }
 */
export function groupProgressByUnit(progressRows = []) {
  const map = {}
  for (const p of progressRows) {
    if (!map[p.unit_id]) map[p.unit_id] = []
    map[p.unit_id].push(p)
  }
  return map
}
