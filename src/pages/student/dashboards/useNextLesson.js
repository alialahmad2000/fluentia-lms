import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

/* ------------------------------------------------------------------ *
 * useNextLesson — resolves a student's REAL next curriculum unit so the
 * dashboard hero can say "تابع: <unit>" and deep-link straight into it.
 *
 * Logic (mirrors the curriculum browser's own `nextUnit`): within the
 * student's current level (curriculum_levels.level_number === academicLevel),
 * the lowest-ordered unit whose completion is < 100. Returns null when the
 * data isn't available or every unit is complete → the hero falls back to
 * the generic "متابعة التعلّم → /student/curriculum". Nothing is faked.
 *
 * RLS-safe: curriculum_units is readable by any authenticated user;
 * unit_progress is row-scoped to the student (student_id = auth.uid()).
 * ------------------------------------------------------------------ */
export function useNextLesson(studentId, academicLevel) {
  const hasLevel = academicLevel !== null && academicLevel !== undefined

  const { data: level } = useQuery({
    queryKey: ['next-lesson', 'level', academicLevel],
    enabled: hasLevel,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_levels')
        .select('id, level_number')
        .eq('level_number', academicLevel)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const { data: units = [] } = useQuery({
    queryKey: ['next-lesson', 'units', level?.id],
    enabled: !!level?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_units')
        .select('id, theme_ar, unit_number, level_id')
        .eq('level_id', level.id)
        .order('unit_number', { ascending: true })
      if (error) throw error
      return data || []
    },
  })

  const unitIds = units.map((u) => u.id)

  const { data: progressMap = {} } = useQuery({
    queryKey: ['next-lesson', 'progress', studentId, level?.id, unitIds.length],
    enabled: !!studentId && unitIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unit_progress')
        .select('*')
        .eq('student_id', studentId)
        .in('unit_id', unitIds)
      if (error) throw error
      const map = {}
      for (const row of data || []) {
        // defensive: schema uses `percentage`; tolerate older column names
        map[row.unit_id] = row.percentage ?? row.completion_percentage ?? row.overall ?? 0
      }
      return map
    },
  })

  return useMemo(() => {
    if (!units.length) return null
    const firstIncomplete = units.find((u) => (progressMap[u.id] ?? 0) < 100)
    if (!firstIncomplete) return null // every unit complete → generic CTA fallback
    return {
      unitId: firstIncomplete.id,
      title_ar: firstIncomplete.theme_ar || null,
      unit_number: firstIncomplete.unit_number,
      levelNumber: academicLevel,
      to: `/student/curriculum/unit/${firstIncomplete.id}`,
    }
  }, [units, progressMap, academicLevel])
}

export default useNextLesson
