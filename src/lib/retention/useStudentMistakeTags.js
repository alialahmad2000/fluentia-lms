// useStudentMistakeTags — returns the calling student's recent mistake tags
// (last 14 days, top N by frequency). Used by Module 2 to pick personalized
// exercises that target the student's actual weaknesses.
//
// Data lives in retention_student_mistake_tags (populated by retention-daily-cron
// via a rule-based regex pass over recent writing_submissions / speaking_submissions /
// wrong submissions). Until that table is populated this returns [] cleanly.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useAuthProfileId } from '../../stores/authStore'

// Centralised tag vocabulary — these are the categories the rule-based tagger
// emits AND the categories Module 2 exercises are filtered against. Keep in
// sync with scripts/retention/tag-mistakes.cjs (Module 2 / Block 3).
export const MISTAKE_TAGS = Object.freeze([
  'missing_article',
  'wrong_article_a_an',
  'subject_verb_agreement',
  'present_perfect_confusion',
  'past_simple_irregular',
  'tense_consistency',
  'preposition_in_on_at',
  'preposition_for_since',
  'word_order_question',
  'word_order_adjective_noun',
  'plural_singular',
  'pronoun_case',
  'comparative_superlative',
  'modal_verb_form',
  'gerund_vs_infinitive',
  'conditional_form',
  'spelling_double_letter',
  'spelling_silent_letter',
  'capitalization',
  'punctuation',
])

const DEFAULT_LIMIT = 5
const LOOKBACK_DAYS = 14

export function useStudentMistakeTags({ limit = DEFAULT_LIMIT, lookbackDays = LOOKBACK_DAYS } = {}) {
  const userId = useAuthProfileId()

  return useQuery({
    queryKey: ['retention-student-mistake-tags', userId, limit, lookbackDays],
    queryFn: async () => {
      if (!userId) return []
      const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('retention_student_mistake_tags')
        .select('mistake_tag')
        .eq('student_id', userId)
        .gte('detected_at', cutoff)
      if (error) {
        // Table may not exist yet (Module 2 ships in Block 3) — fail soft.
        if (error.code === '42P01') return []
        throw error
      }
      // Aggregate client-side: top-N tags by frequency
      const counts = new Map()
      for (const row of data || []) {
        counts.set(row.mistake_tag, (counts.get(row.mistake_tag) || 0) + 1)
      }
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }))
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}
