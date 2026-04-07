/**
 * Comprehensive unit progress calculation.
 * Tracks all activities with weighted progress.
 */

const ACTIVITY_DEFINITIONS = [
  {
    key: 'reading_a',
    tabKey: 'reading',
    label: 'القراءة A',
    weight: 10,
    existsCheck: (c) => c.readingA,
    getProgress: (sp, c) => {
      const record = sp.find(p => p.section_type === 'reading' && p.reading_id === c.readingA)
      if (!record) return 0
      return record.status === 'completed' ? 1 : 0.5
    },
  },
  {
    key: 'reading_b',
    tabKey: 'reading',
    label: 'القراءة B',
    weight: 10,
    existsCheck: (c) => c.readingB,
    getProgress: (sp, c) => {
      const record = sp.find(p => p.section_type === 'reading' && p.reading_id === c.readingB)
      if (!record) return 0
      return record.status === 'completed' ? 1 : 0.5
    },
  },
  {
    key: 'grammar',
    tabKey: 'grammar',
    label: 'القواعد',
    weight: 13,
    existsCheck: (c) => c.hasGrammar,
    getProgress: (sp) => {
      const record = sp.find(p => p.section_type === 'grammar')
      if (!record) return 0
      return record.status === 'completed' ? 1 : 0.5
    },
  },
  {
    key: 'listening',
    tabKey: 'listening',
    label: 'الاستماع',
    weight: 8,
    existsCheck: (c) => c.hasListening,
    getProgress: (sp) => {
      const record = sp.find(p => p.section_type === 'listening')
      if (!record) return 0
      return record.status === 'completed' ? 1 : 0.5
    },
  },
  {
    key: 'vocabulary',
    tabKey: 'vocabulary',
    label: 'المفردات',
    weight: 18,
    existsCheck: (c) => c.vocabTotal > 0,
    getProgress: (_sp, _c, vm) => {
      if (!vm || !vm.totalWords || vm.totalWords === 0) return 0
      return vm.masteredCount / vm.totalWords
    },
  },
  {
    key: 'writing',
    tabKey: 'writing',
    label: 'الكتابة',
    weight: 13,
    existsCheck: (c) => c.hasWriting,
    getProgress: (sp) => {
      const record = sp.find(p => p.section_type === 'writing')
      if (!record) return 0
      if (record.status === 'completed') return 1
      if (record.ai_feedback) return 0.75
      if (record.answers || record.status === 'in_progress') return 0.5
      return 0.25
    },
  },
  {
    key: 'speaking',
    tabKey: 'speaking',
    label: 'المحادثة',
    weight: 13,
    existsCheck: (c) => c.hasSpeaking,
    getProgress: (sp) => {
      const record = sp.find(p => p.section_type === 'speaking')
      if (!record) return 0
      if (record.status === 'completed') return 1
      if (record.ai_feedback) return 0.75
      if (record.status === 'in_progress') return 0.5
      return 0.25
    },
  },
  {
    key: 'pronunciation',
    tabKey: 'pronunciation',
    label: 'النطق',
    weight: 10,
    existsCheck: (c) => c.hasPronunciation,
    getProgress: (sp) => {
      const record = sp.find(p => p.section_type === 'pronunciation')
      if (!record) return 0
      return record.status === 'completed' ? 1 : 0.5
    },
  },
  {
    key: 'assessment',
    tabKey: 'assessment',
    label: 'التقييم',
    weight: 5,
    existsCheck: (c) => c.hasAssessment,
    getProgress: (sp) => {
      const record = sp.find(p => p.section_type === 'assessment')
      if (!record) return 0
      return record.status === 'completed' ? 1 : 0
    },
  },
]

/**
 * @param {Object} params
 * @param {Object} params.unitContent - Content availability info
 * @param {Array} params.studentProgress - student_curriculum_progress rows
 * @param {Object|null} params.vocabularyMastery - { masteredCount, totalWords }
 * @returns {{ overall: number, tabs: Object, activeCount: number, completedCount: number, tabStatus: Object }}
 */
export function calculateUnitProgress({ unitContent, studentProgress = [], vocabularyMastery = null }) {
  const activeActivities = ACTIVITY_DEFINITIONS.filter(a => a.existsCheck(unitContent))

  if (activeActivities.length === 0) {
    return { overall: 0, tabs: {}, activeCount: 0, completedCount: 0, tabStatus: {} }
  }

  const totalWeight = activeActivities.reduce((sum, a) => sum + a.weight, 0)

  const tabs = {}
  const tabStatus = {} // per tab-key status (merged for reading A+B)
  let weightedSum = 0

  for (const activity of activeActivities) {
    const progress = activity.getProgress(studentProgress, unitContent, vocabularyMastery)
    const normalizedWeight = activity.weight / totalWeight

    tabs[activity.key] = {
      label: activity.label,
      progress: Math.round(progress * 100),
      weight: activity.weight,
    }

    weightedSum += progress * normalizedWeight
  }

  // Build per-tab status (merge reading_a + reading_b into 'reading')
  const tabKeys = [...new Set(activeActivities.map(a => a.tabKey))]
  for (const tabKey of tabKeys) {
    const related = activeActivities.filter(a => a.tabKey === tabKey)
    const progresses = related.map(a => a.getProgress(studentProgress, unitContent, vocabularyMastery))
    const allDone = progresses.every(p => p === 1)
    const anyStarted = progresses.some(p => p > 0)
    tabStatus[tabKey] = allDone ? 'completed' : anyStarted ? 'in_progress' : 'not_started'
  }

  const completedCount = activeActivities.filter(a =>
    a.getProgress(studentProgress, unitContent, vocabularyMastery) === 1
  ).length

  return {
    overall: Math.round(weightedSum * 100),
    tabs,
    activeCount: activeActivities.length,
    completedCount,
    tabStatus,
  }
}

/**
 * Simplified version for batch/level browser use.
 * Uses only student_curriculum_progress status (no vocab mastery detail).
 */
export function calculateSimpleUnitProgress(progressRows = [], hasVocab = false, vocabMastery = null) {
  // Build a simplified unitContent from what progress rows exist
  const types = new Set(progressRows.map(p => p.section_type))
  const readingRows = progressRows.filter(p => p.section_type === 'reading')

  const unitContent = {
    readingA: readingRows[0]?.reading_id || (readingRows.length > 0 ? 'exists' : null),
    readingB: readingRows[1]?.reading_id || null,
    hasGrammar: types.has('grammar') || true, // assume exists
    hasListening: types.has('listening') || true,
    vocabTotal: hasVocab ? 1 : 0,
    hasWriting: types.has('writing') || true,
    hasSpeaking: types.has('speaking') || true,
    hasPronunciation: types.has('pronunciation'),
    hasAssessment: false,
  }

  return calculateUnitProgress({
    unitContent,
    studentProgress: progressRows,
    vocabularyMastery: vocabMastery,
  })
}
