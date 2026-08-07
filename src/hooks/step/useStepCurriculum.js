import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/**
 * «المنهج» — the teaching layer over the bank.
 *
 * A topic groups lessons; a lesson IS a grammar point, carrying the rule, how
 * the point actually shows up in STEP, its trap, and worked examples drawn from
 * REAL bank items — so what a student is taught on is what they are tested on.
 *
 * Nothing here reads step_item_keys. The worked examples carry their own
 * `answer_index` because they are meant to be shown solved; the answer key for
 * unseen questions stays server-side.
 */

function useEffectiveStudentId() {
  // Admin "view-as" swaps `profile`, not the session, so auth.uid() would be
  // the admin. Always profile.id.
  return useAuthStore((s) => s.profile?.id) ?? null
}

export function useStepTopics() {
  return useQuery({
    queryKey: ['step-topics'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data: topics, error } = await supabase
        .from('step_topics')
        .select('id,key,title_ar,blurb_ar,section,sort_order')
        .eq('is_published', true)
        .order('sort_order')
      if (error) throw error

      const { data: lessons, error: lErr } = await supabase
        .from('step_grammar_points')
        .select('key,title_ar,rule_ar,topic_key,item_count,sort_order')
        .eq('is_published', true)
        .order('sort_order')
      if (lErr) throw lErr

      const byTopic = {}
      for (const l of lessons ?? []) {
        if (!l.topic_key) continue
        ;(byTopic[l.topic_key] ??= []).push(l)
      }
      return (topics ?? []).map((t) => ({
        ...t,
        lessons: byTopic[t.key] ?? [],
        itemCount: (byTopic[t.key] ?? []).reduce((n, l) => n + (l.item_count ?? 0), 0),
      }))
    },
  })
}

export function useStepLesson(key) {
  return useQuery({
    queryKey: ['step-lesson', key],
    enabled: !!key,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('step_grammar_points')
        .select('key,title_ar,teach_ar,rule_ar,in_step_ar,trap_ar,examples,topic_key,item_count')
        .eq('key', key)
        .eq('is_published', true)
        .maybeSingle()
      if (error) throw error
      if (!data) return null

      const { data: topic } = await supabase
        .from('step_topics')
        .select('key,title_ar')
        .eq('key', data.topic_key)
        .maybeSingle()

      // Siblings power prev/next, so a lesson is a place in a sequence rather
      // than a dead end.
      const { data: siblings } = await supabase
        .from('step_grammar_points')
        .select('key,title_ar,sort_order')
        .eq('topic_key', data.topic_key)
        .eq('is_published', true)
        .order('sort_order')

      const list = siblings ?? []
      const i = list.findIndex((s) => s.key === key)
      return {
        ...data,
        topic: topic ?? null,
        prev: i > 0 ? list[i - 1] : null,
        next: i >= 0 && i < list.length - 1 ? list[i + 1] : null,
        position: i >= 0 ? { at: i + 1, of: list.length } : null,
      }
    },
  })
}

/** Per-lesson accuracy, so the curriculum shows where the student actually stands. */
export function useStepLessonProgress() {
  const studentId = useEffectiveStudentId()
  return useQuery({
    queryKey: ['step-lesson-progress', studentId],
    enabled: !!studentId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('step_student_progress')
        .select('grammar_point,attempts_count,correct_count')
        .eq('student_id', studentId)
        .not('grammar_point', 'is', null)
      if (error) throw error
      const out = {}
      for (const r of data ?? []) {
        out[r.grammar_point] = {
          attempts: r.attempts_count,
          correct: r.correct_count,
          accuracy: r.attempts_count ? r.correct_count / r.attempts_count : null,
        }
      }
      return out
    },
  })
}
