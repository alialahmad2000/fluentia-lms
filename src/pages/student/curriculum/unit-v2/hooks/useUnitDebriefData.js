import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useUnitDebriefData(unitId) {
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id

  return useQuery({
    queryKey: ['unit-debrief', unitId, studentId],
    enabled: !!unitId && !!studentId,
    staleTime: 60_000,
    queryFn: async () => {
      // 1. Unit + level
      const { data: unit } = await supabase
        .from('curriculum_units')
        .select('*, curriculum_levels!inner(level_number, cefr, name_ar)')
        .eq('id', unitId)
        .single()

      // 2. Snapshot (before scores)
      const { data: snapshot } = await supabase
        .from('student_unit_skill_snapshots')
        .select('*')
        .eq('student_id', studentId)
        .eq('unit_id', unitId)
        .maybeSingle()

      // 3. Current scores (after)
      const { data: currentArr } = await supabase
        .rpc('get_student_skill_scores', { p_student_id: studentId })
      const current = currentArr?.[0] || {}

      // 4. XP + vocab + time gained since snapshot (or last 14 days as fallback)
      const sinceTs = snapshot?.snapshot_at
        || new Date(Date.now() - 14 * 86400000).toISOString()

      const { data: xpRows } = await supabase
        .from('xp_transactions')
        .select('amount')
        .eq('student_id', studentId)
        .gte('created_at', sinceTs)
      const unitXp = (xpRows || []).reduce((s, r) => s + (r.amount || 0), 0)

      const { count: vocabGained } = await supabase
        .from('student_saved_words')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .gte('created_at', sinceTs)

      const minutes = Math.round(unitXp * 0.6)

      // 5. Social proof — only show if ≥ 3 other completions exist
      const { data: medianMin } = await supabase
        .rpc('get_unit_median_completion_minutes', { p_unit_id: unitId })
      const fasterThanPct = medianMin && minutes > 0 && medianMin > 0
        ? Math.max(0, Math.min(99, Math.round((1 - minutes / medianMin) * 100)))
        : null

      // 6. Next unit in same level
      const { data: levelUnits } = await supabase
        .from('curriculum_units')
        .select('id, unit_number, theme_ar, theme_en')
        .eq('level_id', unit.level_id)
        .order('unit_number')
      const idx = (levelUnits || []).findIndex(u => u.id === unitId)
      const nextUnit = idx >= 0 && idx < (levelUnits || []).length - 1
        ? levelUnits[idx + 1]
        : null

      // 7. Streak from studentData (already in memory)
      const streak = studentData?.current_streak ?? 0

      return {
        unit,
        level: unit.curriculum_levels,
        snapshot: snapshot || null,
        current,
        stats: { unitXp, vocabGained: vocabGained || 0, minutes, fasterThanPct },
        nextUnit,
        streak,
      }
    },
  })
}
