// Module 1 hooks.
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useAuthUserId } from '../../stores/authStore'
import { useStudentLevel } from './useStudentLevel.js'

export function useTodayScenario() {
  const userId = useAuthUserId()
  const { data: studentLevel } = useStudentLevel()
  const levelStr = studentLevel?.academic_level ? `L${studentLevel.academic_level}` : null

  return useQuery({
    queryKey: ['retention-today-scenario', userId, levelStr],
    queryFn: async () => {
      if (!userId || !levelStr) return null
      // Exclude last 7 scenarios completed
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: recent } = await supabase
        .from('retention_dialogue_attempts')
        .select('scenario_id')
        .eq('student_id', userId)
        .gte('started_at', cutoff)
      const exclude = new Set((recent || []).map((r) => r.scenario_id).filter(Boolean))
      const { data, error } = await supabase
        .from('retention_scenarios')
        .select(`*, persona:retention_personas(id, slug, name_ar, name_en, voice_id, personality_description, avatar_url)`)
        .eq('target_level', levelStr)
        .eq('active', true)
      if (error) throw error
      const pool = (data || []).filter((s) => !exclude.has(s.id))
      if (pool.length === 0 && data && data.length > 0) return data[0] // recycle if all done
      // Pick deterministic-but-rotating: by day-of-year mod length
      const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000))
      return pool[day % pool.length] || null
    },
    enabled: Boolean(userId && levelStr),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useScenarioTurns(scenarioId) {
  return useQuery({
    queryKey: ['retention-scenario-turns', scenarioId],
    queryFn: async () => {
      if (!scenarioId) return []
      const { data, error } = await supabase
        .from('retention_dialogue_turns')
        .select('*')
        .eq('scenario_id', scenarioId)
        .order('turn_number', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: Boolean(scenarioId),
    staleTime: 60 * 60_000,
  })
}

export function useScenarioWithTurns(scenarioId) {
  return useQuery({
    queryKey: ['retention-scenario-with-turns', scenarioId],
    queryFn: async () => {
      if (!scenarioId) return null
      const [scRes, turnsRes] = await Promise.all([
        supabase
          .from('retention_scenarios')
          .select(`*, persona:retention_personas(id, slug, name_ar, name_en, voice_id, personality_description, avatar_url)`)
          .eq('id', scenarioId)
          .single(),
        supabase
          .from('retention_dialogue_turns')
          .select('*')
          .eq('scenario_id', scenarioId)
          .order('turn_number', { ascending: true }),
      ])
      if (scRes.error) throw scRes.error
      if (turnsRes.error) throw turnsRes.error
      return { scenario: scRes.data, turns: turnsRes.data || [] }
    },
    enabled: Boolean(scenarioId),
  })
}

export function useDialogueAttemptHistory({ limit = 5 } = {}) {
  const userId = useAuthUserId()
  return useQuery({
    queryKey: ['retention-dialogue-history', userId, limit],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('retention_dialogue_attempts')
        .select(`id, started_at, completed_at, vocab_hit_pct, xp_awarded,
                 scenario:retention_scenarios(title_ar)`)
        .eq('student_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data || []
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
}
