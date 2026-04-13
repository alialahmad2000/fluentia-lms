import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PenLine } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import GrammarPageShell from '../../../../components/grammar/GrammarPageShell'
import GrammarHeader from '../../../../components/grammar/GrammarHeader'
import LessonCard from '../../../../components/grammar/LessonCard'
import CommonMistakesCard from '../../../../components/grammar/CommonMistakesCard'
import ExerciseSection from '../../../../components/grammar/ExerciseSection'

// ─── Main Component ─────────────────────────────────
export default function GrammarTab({ unitId }) {
  const { user } = useAuthStore()

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
      // Sort exercises within each topic
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
        <PenLine size={40} className="text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد قواعد لهذه الوحدة بعد</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {topics.map((topic) => (
        <GrammarTopic key={topic.id} topic={topic} studentId={user?.id} unitId={unitId} />
      ))}
    </div>
  )
}

// ─── Grammar Topic — thin composer ──────────────────
function GrammarTopic({ topic, studentId, unitId }) {
  const [bestScore, setBestScore] = useState(null)
  const [attemptNumber, setAttemptNumber] = useState(1)

  const sections = topic.explanation_content?.sections || []

  // Split sections: common_mistakes go to their own card
  const lessonSections = sections.filter(s => s.type !== 'common_mistakes')
  const mistakesSection = sections.find(s => s.type === 'common_mistakes')

  return (
    <GrammarPageShell>
      {/* Header with topic name, best score, attempt pills */}
      <GrammarHeader
        topic={topic}
        attemptNumber={attemptNumber}
        bestScore={bestScore}
      />

      {/* Lesson content — explanation, formulas, examples */}
      <LessonCard sections={lessonSections} />

      {/* Common mistakes — separate card */}
      <CommonMistakesCard items={mistakesSection?.items} />

      {/* Exercises — always inline, no toggle button */}
      {topic.exercises?.length > 0 && (
        <ExerciseSection
          exercises={topic.exercises}
          studentId={studentId}
          unitId={unitId}
          grammarId={topic.id}
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
          <div className="h-8 w-48 rounded-lg bg-[rgba(255,255,255,0.06)] animate-pulse" />
          <div className="h-40 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse" />
          <div className="h-32 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse" />
        </div>
      ))}
    </div>
  )
}
