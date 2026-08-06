import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * STEP data hooks.
 *
 * These read step_items but NEVER step_item_keys — that table has no
 * `authenticated` policy on purpose, so the answer key is unreachable from the
 * browser. Grading happens in the `complete-step-attempt` edge function, and the
 * review screen renders from the result row that function writes.
 */

export function useStepBlueprint() {
  return useQuery({
    queryKey: ['step-blueprint'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('step_blueprint')
        .select('id,version,is_active,is_locked,total_questions,sections,unverified')
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Per-section counts of what is actually publishable — drives the home screen. */
export function useStepBankStats() {
  return useQuery({
    queryKey: ['step-bank-stats'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const sections = ['listening', 'reading', 'structure']
      const out = {}
      for (const s of sections) {
        const { count, error } = await supabase
          .from('step_items')
          .select('id', { count: 'exact', head: true })
          .eq('section', s)
          .eq('is_published', true)
        if (error) throw error
        out[s] = count ?? 0
      }
      // Listening audio readiness.
      //
      // Counting VOICED RECORDINGS alone is misleading: the clips were voiced
      // incrementally, so "at least one recording is voiced" would silence the
      // warning while most listening ITEMS still point at a silent clip. What a
      // student actually experiences is per-item, so measure that.
      const { count: voiced } = await supabase
        .from('step_recordings')
        .select('id', { count: 'exact', head: true })
        .eq('audio_status', 'voiced')
      out.recordings_voiced = voiced ?? 0

      const { data: linked, error: lErr } = await supabase
        .from('step_items')
        .select('id, step_recordings!inner(audio_status)')
        .eq('section', 'listening')
        .eq('is_published', true)
        .eq('step_recordings.audio_status', 'voiced')
      if (lErr) throw lErr
      out.listening_with_audio = linked?.length ?? 0
      out.listening_audio_ratio = out.listening
        ? out.listening_with_audio / out.listening
        : 0
      return out
    },
  })
}

export function useStepAttempts(studentId) {
  return useQuery({
    queryKey: ['step-attempts', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('step_attempts')
        .select('id,status,score_total,correct_total,started_at,completed_at')
        .eq('student_id', studentId)
        .order('started_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useStepGrammarPoints() {
  return useQuery({
    queryKey: ['step-grammar-points'],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('step_grammar_points')
        .select('key,title_ar,rule_ar,in_step_ar,trap_ar,item_count,is_fallback')
        .eq('is_published', true)
        .order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })
}
