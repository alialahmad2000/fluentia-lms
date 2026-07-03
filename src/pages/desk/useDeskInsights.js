// Reads the student's real roleplay outcomes — desk_module_progress joined with the graded
// speaking_conversations (ai_evaluation) behind each scenario's best call — and aggregates them
// into the numbers Growth (تقدّمي) and Phrasebook (دفتري) render. All client-side, RLS-safe:
// the student selects only their OWN desk_module_progress + speaking_conversations rows.
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null)
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)

export function useDeskInsights() {
  const profileId = useAuthStore((s) => s.profile?.id)

  return useQuery({
    queryKey: ['desk-insights', profileId],
    enabled: !!profileId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: prog } = await supabase
        .from('desk_module_progress')
        .select('module_id, status, best_score, best_conversation_id')
        .eq('student_id', profileId)
        .is('deleted_at', null)
      const rows = prog || []

      const convoIds = rows.map((r) => r.best_conversation_id).filter(Boolean)
      let evalByConvo = new Map()
      if (convoIds.length) {
        const { data: convos } = await supabase
          .from('speaking_conversations')
          .select('id, ai_evaluation, created_at')
          .in('id', convoIds)
        evalByConvo = new Map((convos || []).map((c) => [c.id, c]))
      }

      // per-attempt evaluations (only scenarios with a graded best call)
      const graded = rows
        .map((r) => {
          const c = r.best_conversation_id ? evalByConvo.get(r.best_conversation_id) : null
          const ev = c?.ai_evaluation || null
          if (!ev) return null
          return { module_id: r.module_id, best_score: r.best_score, at: c?.created_at || null, ev }
        })
        .filter(Boolean)

      // competency gauges — average the 0–10 subscores across graded calls
      const pick = (key) => graded.map((g) => num(g.ev?.[key])).filter((v) => v !== null)
      const gauges = {
        grammar:  avg(pick('grammar_score')),
        vocabulary: avg(pick('vocabulary_score')),
        fluency:  avg(pick('fluency_score')),
        task:     avg(pick('task_completion_score')),
      }
      const overalls = graded.map((g) => num(g.ev?.overall_score) ?? num(g.best_score)).filter((v) => v !== null)
      const readiness = avg(overalls) // 0–10

      // "you said X → a native says Y" — pulled from every graded call
      const betterExpressions = graded.flatMap((g) =>
        (Array.isArray(g.ev?.better_expressions) ? g.ev.better_expressions : [])
          .filter((b) => b?.basic && b?.natural)
          .map((b) => ({ ...b, module_id: g.module_id }))
      )
      // recurring correction points (grammar/vocabulary), deduped by corrected form
      const errorsRaw = graded.flatMap((g) => (Array.isArray(g.ev?.errors) ? g.ev.errors : []))
        .filter((e) => e?.corrected || e?.rule)
      const seen = new Set()
      const errors = []
      for (const e of errorsRaw) {
        const key = (e.corrected || e.rule || '').toLowerCase().trim()
        if (key && !seen.has(key)) { seen.add(key); errors.push(e) }
      }
      // one warm next-step, if the grader gave one
      const tips = graded.map((g) => g.ev?.improvement_tip).filter(Boolean)

      return {
        attempts: graded.length,
        completed: rows.filter((r) => r.status === 'completed').length,
        started: rows.length,
        readiness,
        gauges,
        betterExpressions,
        errors,
        tip: tips[tips.length - 1] || null,
        scoreByModule: new Map(graded.map((g) => [g.module_id, num(g.ev?.overall_score) ?? num(g.best_score)])),
      }
    },
  })
}
