import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PenLine } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import GrammarPageShell from '../../../../components/grammar/GrammarPageShell'
import GrammarHeader from '../../../../components/grammar/GrammarHeader'
import LessonCard from '../../../../components/grammar/LessonCard'
import CommonMistakesCard from '../../../../components/grammar/CommonMistakesCard'
import ExceptionsCard from '../../../../components/grammar/ExceptionsCard'
import ExerciseSection from '../../../../components/grammar/ExerciseSection'

// ─── Main Component ─────────────────────────────────
export default function GrammarTab({ unitId }) {
  const { user, profile } = useAuthStore()

  const { data: topics, isLoading } = useQuery({
    queryKey: ['unit-grammar', unitId],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_grammar')
        .select('*, exercises:curriculum_grammar_exercises(*)')
        .eq('unit_id', unitId)
        .order('sort_order')
      if (error) throw error
      data?.forEach(t => {
        if (t.exercises) t.exercises.sort((a, b) => a.sort_order - b.sort_order)
      })
      return data || []
    },
    enabled: !!unitId,
  })

  if (isLoading) return <GrammarSkeleton />

  if (!topics?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <PenLine size={40} style={{ color: 'var(--text-tertiary)' }} />
        <p style={{ color: 'var(--text-tertiary)' }} className="font-['Tajawal']">لا توجد قواعد لهذه الوحدة بعد</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {topics.map((topic) => (
        <GrammarTopic
          key={topic.id}
          topic={topic}
          studentId={user?.id}
          unitId={unitId}
          studentLevel={profile?.current_level || 'A1'}
        />
      ))}
    </div>
  )
}

// ─── Grammar Topic — thin composer ──────────────────
function GrammarTopic({ topic, studentId, unitId, studentLevel }) {
  const [bestScore, setBestScore] = useState(null)
  const [attemptNumber, setAttemptNumber] = useState(1)

  const sections = topic.explanation_content?.sections || []

  // Split sections: common_mistakes go to their own card
  const lessonSections = sections.filter(s => s.type !== 'common_mistakes')
  const mistakesSection = sections.find(s => s.type === 'common_mistakes')

  // Build a rule snippet from explanation sections for AI context
  const ruleSnippet = sections
    .filter(s => s.type === 'explanation')
    .map(s => s.content_en || '')
    .join(' ')
    .slice(0, 500)

  return (
    <GrammarPageShell>
      <GrammarHeader
        topic={topic}
        attemptNumber={attemptNumber}
        bestScore={bestScore}
      />

      {/* Lesson content */}
      <LessonCard sections={lessonSections} />

      {/* Exceptions — between lesson and common mistakes */}
      <ExceptionsCard exceptions={topic.exceptions} />

      {/* Common mistakes */}
      <CommonMistakesCard items={mistakesSection?.items} />

      {/* Exercises — always inline */}
      {topic.exercises?.length > 0 && (
        <ExerciseSection
          exercises={topic.exercises}
          studentId={studentId}
          unitId={unitId}
          grammarId={topic.id}
          grammarTopic={topic.topic_name_en}
          studentLevel={studentLevel}
          ruleSnippet={ruleSnippet}
          onAttemptUpdate={(score, attempt, best) => {
            if (best != null) setBestScore(best)
            if (attempt != null) setAttemptNumber(attempt)
          }}
        />
      )}
    </GrammarPageShell>
  )
}

// ─── Skeleton ───────────────────────────────────────
function GrammarSkeleton() {
  return (
    <div className="space-y-6 py-8">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="h-8 w-48 rounded-lg animate-pulse" style={{ background: 'var(--skeleton-from)' }} />
          <div className="h-40 rounded-2xl animate-pulse" style={{ background: 'var(--skeleton-from)' }} />
          <div className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--skeleton-from)' }} />
        </div>
      ))}
    </div>
  )
}
