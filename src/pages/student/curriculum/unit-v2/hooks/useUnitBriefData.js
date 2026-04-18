import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../../../lib/supabase'
import { useAuthStore } from '../../../../../stores/authStore'

export function useUnitBriefData(unitId) {
  const profile = useAuthStore(s => s.profile)
  const studentId = profile?.id

  return useQuery({
    queryKey: ['unit-brief', unitId, studentId],
    queryFn: async () => {
      // 1. Unit with brief content + level info
      const { data: unit, error: unitErr } = await supabase
        .from('curriculum_units')
        .select(`
          id, unit_number, theme_ar, theme_en, description_ar, description_en,
          cover_image_url, estimated_minutes,
          why_matters, outcomes, brief_questions, brief_generated_at,
          curriculum_levels!inner(id, level_number, cefr, name_ar)
        `)
        .eq('id', unitId)
        .single()
      if (unitErr) throw unitErr

      const levelId = Array.isArray(unit.curriculum_levels)
        ? unit.curriculum_levels[0].id
        : unit.curriculum_levels.id
      const level = Array.isArray(unit.curriculum_levels)
        ? unit.curriculum_levels[0]
        : unit.curriculum_levels

      // 2. All units in same level (journey mini-map + prev/next)
      const { data: levelUnits } = await supabase
        .from('curriculum_units')
        .select('id, unit_number, theme_ar, theme_en')
        .eq('level_id', levelId)
        .order('unit_number')

      // 3. Student's visited unit IDs in this level (via student_curriculum_progress)
      let visitedUnitIds = new Set()
      if (studentId) {
        const { data: progress } = await supabase
          .from('student_curriculum_progress')
          .select('unit_id, completed_at')
          .eq('student_id', studentId)
          .not('completed_at', 'is', null)
        for (const p of progress || []) {
          if (p.unit_id) visitedUnitIds.add(p.unit_id)
        }
      }

      // 4. Vocab count via readings (discovery: vocab links to reading_id)
      const { data: readings } = await supabase
        .from('curriculum_readings')
        .select('id')
        .eq('unit_id', unitId)

      let vocabCount = 0
      for (const r of readings || []) {
        const { count } = await supabase
          .from('curriculum_vocabulary')
          .select('*', { count: 'exact', head: true })
          .eq('reading_id', r.id)
        vocabCount += count || 0
      }

      // 5. Listening count
      const { count: listeningCount } = await supabase
        .from('curriculum_listening')
        .select('*', { count: 'exact', head: true })
        .eq('unit_id', unitId)

      // 6. Reading word count from passage_content
      const { data: passages } = await supabase
        .from('curriculum_readings')
        .select('passage_content, passage_word_count')
        .eq('unit_id', unitId)
      const readingWords = (passages || []).reduce((sum, p) => {
        if (p.passage_word_count) return sum + p.passage_word_count
        return sum + (p.passage_content?.split(/\s+/).length || 0)
      }, 0)

      // 7. XP estimate (heuristic from activity weights)
      const XP_MAP = { reading: 25, vocabulary: 15, grammar: 20, writing: 30, speaking: 30, listening: 20, pronunciation: 15, assessment: 40 }
      const totalXp =
        (readings?.length || 1) * XP_MAP.reading +
        XP_MAP.vocabulary + XP_MAP.grammar + XP_MAP.writing + XP_MAP.speaking +
        (listeningCount || 0) * XP_MAP.listening + XP_MAP.pronunciation + XP_MAP.assessment

      // 8. Time estimate — use existing estimated_minutes if set
      const totalMinutes = unit.estimated_minutes || (
        (readings?.length || 1) * 15 + 20 + 20 + 30 + 30 +
        (listeningCount || 0) * 15 + 15 + 20
      )

      // 9. Next unit
      const currentIdx = (levelUnits || []).findIndex(u => u.id === unitId)
      const nextUnit = currentIdx >= 0 && currentIdx < (levelUnits || []).length - 1
        ? levelUnits[currentIdx + 1]
        : null

      return {
        unit,
        level,
        levelUnits: levelUnits || [],
        visitedUnitIds,
        stats: {
          vocabCount,
          readingsCount: readings?.length || 0,
          listeningCount: listeningCount || 0,
          totalXp,
          totalMinutes,
          readingWords,
        },
        nextUnit,
        currentIdx,
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!unitId,
  })
}
