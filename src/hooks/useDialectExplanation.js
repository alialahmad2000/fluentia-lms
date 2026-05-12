import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useDialectExplanation(grammarLessonId) {
  return useQuery({
    queryKey: ['dialect-explanation', grammarLessonId],
    queryFn: async () => {
      if (!grammarLessonId) return null
      const { data, error } = await supabase
        .from('dialect_explanations')
        .select('id, concept_title, explanation_najdi, audio_url_najdi, cefr_level, tags, word_count')
        .eq('grammar_lesson_id', grammarLessonId)
        .eq('is_published', true)
        .maybeSingle()
      if (error) throw error
      return data ?? null
    },
    enabled: Boolean(grammarLessonId),
    staleTime: 1000 * 60 * 60,
  })
}
