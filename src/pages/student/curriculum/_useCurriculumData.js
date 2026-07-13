import { useParams, useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useContext } from 'react'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { useLevelProgress } from '../../../hooks/useUnitProgress'
import { CurriculumPreviewContext } from '../../../contexts/CurriculumPreviewContext'

const CHAPTER_NAMES = [
  { name: 'الفصل الأول', theme: 'أساسيات' },
  { name: 'الفصل الثاني', theme: 'توسّع' },
  { name: 'الفصل الثالث', theme: 'إتقان' },
  { name: 'الفصل الرابع', theme: 'تطبيق' },
  { name: 'الفصل الخامس', theme: 'تميّز' },
]

function chunkUnits(units, size = 4) {
  const chapters = []
  for (let i = 0; i < units.length; i += size) {
    const chapterIndex = Math.floor(i / size)
    const cn = CHAPTER_NAMES[chapterIndex] || { name: `الفصل ${chapterIndex + 1}`, theme: '' }
    chapters.push({
      index: chapterIndex,
      name: cn.name,
      theme: cn.theme,
      units: units.slice(i, i + size),
    })
  }
  return chapters
}

export function useCurriculumData() {
  const { levelNumber } = useParams()
  const navigate = useNavigate()
  const { profile, studentData } = useAuthStore(useShallow((s) => ({ profile: s.profile, studentData: s.studentData })))
  const { canSeeAllLevels, basePath } = useContext(CurriculumPreviewContext) || {}
  const currentLevel = canSeeAllLevels ? 999 : (studentData?.academic_level ?? 0)
  const levelNum = parseInt(levelNumber)
  // Teacher-preview accounts may enter levels BELOW their academic_level.
  const canAccessLower = studentData?.can_access_lower_levels === true
  // Precise per-student extra levels (e.g. a B1 student granted revisit access to A2).
  const extraLevels = Array.isArray(studentData?.extra_curriculum_levels) ? studentData.extra_curriculum_levels : []
  const extraKey = extraLevels.join(',')

  useEffect(() => {
    const isCurrent = levelNum === currentLevel
    const isAllowedLower = canAccessLower && levelNum < currentLevel
    const isExtraGranted = extraLevels.includes(levelNum)
    if (!canSeeAllLevels && !isNaN(levelNum) && !isCurrent && !isAllowedLower && !isExtraGranted) {
      navigate(basePath || '/student/curriculum', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelNum, currentLevel, canAccessLower, extraKey, navigate, canSeeAllLevels, basePath])

  const { data: level, isLoading: loadingLevel } = useQuery({
    queryKey: ['curriculum-level', levelNum],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_levels')
        .select('*')
        .eq('level_number', levelNum)
        .single()
      if (error) throw error
      return data
    },
    enabled: !isNaN(levelNum),
  })

  // Fardi custom-curriculum flag (from studentData, impersonation-safe). NULL/false → unchanged behaviour.
  const useCustomCurriculum = studentData?.uses_custom_curriculum === true

  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: ['curriculum-units', useCustomCurriculum ? `custom:${profile?.id}` : level?.id],
    queryFn: async () => {
      if (useCustomCurriculum) {
        // This student has their own curriculum → show ONLY their units, ordered by custom_sort.
        const { data, error } = await supabase
          .from('curriculum_units')
          .select('*')
          .eq('owner_student_id', profile.id)
          .order('custom_sort', { ascending: true, nullsFirst: false })
        if (error) throw error
        return data || []
      }
      // Default path — generic level units only (owner_student_id IS NULL). Behaviour unchanged for everyone else.
      const { data, error } = await supabase
        .from('curriculum_units')
        .select('*')
        .eq('level_id', level.id)
        .is('owner_student_id', null)
        .order('unit_number')
      if (error) throw error
      return data || []
    },
    enabled: useCustomCurriculum ? !!profile?.id : !!level?.id,
  })

  const { data: progressMap = {} } = useLevelProgress(profile?.id, units)

  const chapters = useMemo(() => chunkUnits(units), [units])

  const levelProgress = useMemo(() => {
    const total = units.length
    let completed = 0
    let inProgress = 0
    let totalPercent = 0
    for (const u of units) {
      const p = progressMap[u.id]
      const overall = p?.overall || 0
      totalPercent += overall
      if (overall === 100) completed++
      else if (overall > 0) inProgress++
    }
    return {
      totalUnits: total,
      completedUnits: completed,
      inProgressUnits: inProgress,
      overallPercent: total > 0 ? Math.round(totalPercent / total) : 0,
    }
  }, [units, progressMap])

  const nextUnit = useMemo(() => {
    for (const u of units) {
      const p = progressMap[u.id]
      const overall = p?.overall || 0
      if (overall < 100) return u
    }
    return units[0] || null
  }, [units, progressMap])

  return {
    level,
    units,
    chapters,
    progressMap,
    levelProgress,
    nextUnit,
    loading: loadingLevel || loadingUnits,
    levelColor: level?.color || '#38bdf8',
    levelNum,
    navigate,
    profile,
  }
}
