import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../../stores/authStore'
import { supabase } from '../../../../lib/supabase'
import { useUnitProgress } from '../../../../hooks/useUnitProgress'
import { useUnitStar } from '../../../../hooks/useUnitStar'

// ---------------------------------------------------------------------------
// Activity map — mirrors the TABS order in UnitContent.jsx
// ---------------------------------------------------------------------------
const ACTIVITY_MAP = [
  { key: 'reading',      label: 'القراءة',  labelEn: 'Reading A',    icon: 'BookOpen',       color: '#22d3ee', weight: 10 },
  { key: 'grammar',      label: 'القواعد',  labelEn: 'Grammar',      icon: 'PenLine',        color: '#a78bfa', weight: 13 },
  { key: 'vocabulary',   label: 'المفردات', labelEn: 'Vocabulary',   icon: 'Sparkles',       color: '#f5c842', weight: 18 },
  { key: 'listening',    label: 'الاستماع', labelEn: 'Listening',    icon: 'Headphones',     color: '#4ade80', weight:  8 },
  { key: 'writing',      label: 'الكتابة',  labelEn: 'Writing',      icon: 'FileEdit',       color: '#f472b6', weight: 13 },
  { key: 'speaking',     label: 'المحادثة', labelEn: 'Speaking',     icon: 'Mic',            color: '#fb923c', weight: 13 },
  { key: 'pronunciation',label: 'النطق',    labelEn: 'Pronunciation',icon: 'Volume2',        color: '#818cf8', weight: 10 },
  { key: 'recording',    label: 'التسجيل',  labelEn: 'Recording',    icon: 'Video',          color: '#38bdf8', weight:  0 },
]

// ---------------------------------------------------------------------------
// Helper — derive nextStep from activities array
// ---------------------------------------------------------------------------
function deriveNextStep(activities) {
  const inProgress = activities.filter(a => a.status === 'in_progress')
  const completed  = activities.filter(a => a.status === 'completed')
  const noneStarted = activities.every(a => a.status === 'not_started')

  if (noneStarted) {
    const first = activities[0]
    return {
      key: first?.key ?? null,
      action: 'start',
      label: 'ابدأ رحلة هذه الوحدة →',
    }
  }

  if (inProgress.length > 0) {
    // Use the last in_progress activity (most recent by ACTIVITY_MAP order)
    const activity = inProgress[inProgress.length - 1]
    return {
      key: activity.key,
      action: 'continue',
      label: `أكمل ${activity.label}`,
    }
  }

  // All completed (or at least no in_progress and some done)
  const first = completed[0] ?? activities[0]
  return {
    key: first?.key ?? null,
    action: 'review',
    label: `راجع ${first?.label ?? ''}`,
  }
}

// ---------------------------------------------------------------------------
// Helper — derive starRanking extras for the current student
// ---------------------------------------------------------------------------
function deriveStarRanking(unitStarData, studentId) {
  const rankings = unitStarData?.rankings || []
  const star      = unitStarData?.star || null

  const myRanking = rankings.find(r => r.studentId === studentId)
  const currentStudentRank  = myRanking?.rank ?? null
  const currentStudentScore = myRanking?.totalScore ?? 0

  const starScore = star?.totalScore ?? 0
  const gap = starScore > 0 && currentStudentScore < starScore
    ? Math.round(starScore - currentStudentScore)
    : 0

  return { star, rankings, currentStudentRank, currentStudentScore, gap }
}

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------
export function useUnitData(unitId) {
  const { studentData } = useAuthStore()
  const studentId = studentData?.id ?? null
  const groupId   = studentData?.group_id ?? null

  // 1. Unit row (same query pattern as UnitContent.jsx)
  const {
    data: unit,
    isLoading: unitLoading,
    error: unitError,
  } = useQuery({
    queryKey: ['unit-content', unitId],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_units')
        .select('*, level:curriculum_levels(*)')
        .eq('id', unitId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!unitId,
  })

  // 2. Unit progress (wraps existing hook)
  const {
    data: unitProgress,
    isLoading: progressLoading,
    error: progressError,
  } = useUnitProgress(studentId, unitId)

  // 3. Star rankings (wraps existing hook)
  const {
    data: unitStarData,
    isLoading: starLoading,
    error: starError,
  } = useUnitStar(unitId, groupId)

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const level = unit?.level ?? null

  // Activities array
  const tabStatus = unitProgress?.tabStatus ?? {}
  const tabs      = unitProgress?.tabs      ?? {}

  const activities = ACTIVITY_MAP.map(({ key, label, labelEn, icon, color }) => ({
    key,
    label,
    labelEn,
    icon,
    color,
    status:           tabStatus[key] ?? 'not_started',
    progress:         tabs[key]?.progress ?? 0,
    locked:           false,
    estimatedMinutes: 10,
  }))

  // Progress summary
  const completedCount = activities.filter(a => a.status === 'completed').length
  const activeCount    = ACTIVITY_MAP.filter(a => a.weight > 0).length
  const totalCount     = activeCount
  const percentage     = unitProgress?.overall ?? 0
  const progress = {
    completedCount,
    totalCount,
    percentage,
    totalXpEarned: 0,
  }

  // Next step
  const nextStep = deriveNextStep(activities)

  // Star ranking
  const starRanking = deriveStarRanking(unitStarData, studentId)

  // ---------------------------------------------------------------------------
  // Combined loading / error
  // ---------------------------------------------------------------------------
  const loading = unitLoading || progressLoading || starLoading
  const error   = unitError   || progressError   || starError || null

  return {
    unit,
    level,
    activities,
    progress,
    starRanking,
    nextStep,
    loading,
    error,
  }
}
