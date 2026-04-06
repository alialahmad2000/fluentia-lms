import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, Users, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import StudentAnswersOverlay from './StudentAnswersOverlay'

const EXERCISE_TYPE_LABELS = {
  fill_blank: 'أكمل الفراغ',
  choose: 'اختر الإجابة',
  error_correction: 'صحّح الخطأ',
  reorder: 'رتّب الكلمات',
  transform: 'حوّل الجملة',
  make_question: 'كوّن سؤالاً',
}

export default function InteractiveGrammarTab({ unitId, students = [] }) {
  const [activeTopic, setActiveTopic] = useState(0)

  const { data: grammarTopics, isLoading } = useQuery({
    queryKey: ['unit-grammar', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_grammar')
        .select('*, curriculum_grammar_exercises(*)')
        .eq('unit_id', unitId)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!unitId,
  })

  if (isLoading) return <GrammarSkeleton />

  if (!grammarTopics?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <PenLine size={40} className="text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد قواعد لهذه الوحدة بعد</p>
      </div>
    )
  }

  const topic = grammarTopics[activeTopic]

  return (
    <div className="space-y-5">
      {grammarTopics.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {grammarTopics.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActiveTopic(i)}
              className={`px-4 h-9 rounded-xl text-xs font-bold border transition-colors font-['Tajawal'] flex-shrink-0 ${
                activeTopic === i
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.topic_name_ar || t.topic_name_en}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={topic.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <GrammarTopicContent topic={topic} unitId={unitId} students={students} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function GrammarTopicContent({ topic, unitId, students }) {
  const exercises = topic.curriculum_grammar_exercises || []

  // Fetch all student progress for this grammar topic
  const { data: studentProgress } = useQuery({
    queryKey: ['ic-grammar-progress', topic.id, students.map(s => s.user_id).sort().join()],
    queryFn: async () => {
      const studentIds = students.map(s => s.user_id)
      if (!studentIds.length) return []
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, answers, score, status, completed_at')
        .eq('grammar_id', topic.id)
        .eq('section_type', 'grammar')
        .in('student_id', studentIds)
      return data || []
    },
    enabled: !!topic?.id && students.length > 0,
    staleTime: 30000,
  })

  const progressMap = useMemo(() => {
    const map = {}
    studentProgress?.forEach(p => { map[p.student_id] = p })
    return map
  }, [studentProgress])

  const completedCount = studentProgress?.filter(p => p.status === 'completed').length || 0

  const getStudentAnswersForExercise = useCallback((exerciseId, correctAnswer) => {
    return students.map(s => {
      const progress = progressMap[s.user_id]
      const exerciseAnswers = progress?.answers?.exercises || []
      const exerciseAnswer = exerciseAnswers.find(e => e.id === exerciseId)
      return {
        student_id: s.user_id,
        full_name: s.full_name,
        avatar_url: s.avatar_url,
        attempted: !!exerciseAnswer,
        answer: exerciseAnswer?.studentAnswer || '',
        isCorrect: exerciseAnswer?.isCorrect ?? false,
      }
    })
  }, [students, progressMap])

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)' }}>
        <Users size={16} className="text-sky-400" />
        <span className="text-sm font-medium text-sky-400 font-['Tajawal']">
          {completedCount}/{students.length} طلاب أكملوا القواعد
        </span>
      </div>

      {/* Topic title */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Inter']" dir="ltr">{topic.topic_name_en}</h2>
        {topic.topic_name_ar && <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">{topic.topic_name_ar}</p>}
      </div>

      {/* Explanation */}
      {topic.explanation_content && (
        <GrammarExplanation content={topic.explanation_content} />
      )}

      {/* Exercises with overlay */}
      {exercises.length > 0 && (
        <InteractiveExercisesSection
          exercises={exercises}
          getStudentAnswers={getStudentAnswersForExercise}
        />
      )}
    </div>
  )
}

function GrammarExplanation({ content }) {
  const [expanded, setExpanded] = useState(true)

  const renderContent = () => {
    if (typeof content === 'string') return <p className="text-sm text-[var(--text-secondary)] font-['Inter'] leading-relaxed" dir="ltr">{content}</p>
    if (!content) return null

    return (
      <div className="space-y-4">
        {content.sections?.map((section, idx) => (
          <div key={idx} className="space-y-2">
            {section.title && <h4 className="text-sm font-bold text-[var(--text-primary)] font-['Inter']" dir="ltr">{section.title}</h4>}
            {section.explanation && <p className="text-sm text-[var(--text-secondary)] font-['Inter'] leading-relaxed" dir="ltr">{section.explanation}</p>}
            {section.formula && (
              <div className="px-4 py-3 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(168,85,247,0.08))', border: '1px solid rgba(56,189,248,0.15)' }}>
                <p className="text-sm font-mono text-sky-400 font-['Inter']" dir="ltr">{section.formula}</p>
              </div>
            )}
            {section.examples?.map((ex, i) => (
              <div key={i} className="px-3 py-2 rounded-lg text-sm font-['Inter']" dir="ltr" style={{ background: 'var(--surface-base)' }}>
                {typeof ex === 'string' ? ex : ex.sentence || ex.text || JSON.stringify(ex)}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[rgba(255,255,255,0.02)]">
        <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">الشرح</span>
        <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 pb-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="pt-3">{renderContent()}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function InteractiveExercisesSection({ exercises, getStudentAnswers }) {
  const [openOverlay, setOpenOverlay] = useState(null)

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">التمارين</h3>
      <div className="space-y-4">
        {exercises.map((ex, idx) => {
          const items = ex.items || []
          const firstItem = items[0]
          const questionText = firstItem?.question || ex.instructions_en || ex.instructions_ar || ''
          const correctAnswer = firstItem?.correct_answer
          const options = firstItem?.options || []

          return (
          <div
            key={ex.id}
            className="rounded-xl p-4 sm:p-5 space-y-3"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-amber-500/15 text-amber-400 border-amber-500/30 font-['Tajawal']">
                  {EXERCISE_TYPE_LABELS[ex.exercise_type] || ex.exercise_type}
                </span>
                {ex.instructions_en && (
                  <p className="text-xs text-[var(--text-muted)] font-['Inter']" dir="ltr">{ex.instructions_en}</p>
                )}
                {ex.instructions_ar && (
                  <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{ex.instructions_ar}</p>
                )}
                {/* Render each item/question in the exercise */}
                {items.map((item, itemIdx) => (
                  <div key={itemIdx} className="space-y-2">
                    {item.question && (
                      <p className="text-sm sm:text-[15px] font-medium text-[var(--text-primary)] font-['Inter'] leading-relaxed" dir="ltr">
                        {items.length > 1 && <span className="text-[var(--text-muted)] mr-1">{itemIdx + 1}.</span>}
                        {item.question}
                      </p>
                    )}

                    {/* Show choices if it's a choose type */}
                    {ex.exercise_type === 'choose' && item.options?.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 mt-1">
                        {item.options.map((opt, i) => {
                          const isCorrect = opt.toLowerCase?.().trim() === item.correct_answer?.toLowerCase?.().trim()
                          return (
                            <div key={i} dir="ltr" className={`px-4 py-3 rounded-xl text-sm font-['Inter'] border ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[var(--surface-base)] border-[var(--border-subtle)] text-[var(--text-secondary)]'}`}>
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: isCorrect ? 'rgba(16,185,129,0.2)' : 'var(--surface-raised)', color: isCorrect ? '#34d399' : 'var(--text-muted)' }}>
                                  {String.fromCharCode(65 + i)}
                                </span>
                                <span>{opt}</span>
                                {isCorrect && <span className="text-emerald-400 text-xs mr-auto">✅</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Show correct answer for non-choose types */}
                    {ex.exercise_type !== 'choose' && item.correct_answer && (
                      <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <span className="text-emerald-400 font-['Tajawal']">الإجابة الصحيحة: </span>
                        <span className="text-emerald-400 font-['Inter']" dir="ltr">{item.correct_answer}</span>
                      </div>
                    )}

                    {/* Show explanation if available */}
                    {item.explanation_ar && (
                      <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] px-3">{item.explanation_ar}</p>
                    )}
                  </div>
                ))}
              </div>

              <StudentAnswersOverlay
                questionId={ex.id}
                correctAnswer={correctAnswer}
                studentsData={getStudentAnswers(ex.id, correctAnswer)}
                isOpen={openOverlay === ex.id}
                onToggle={() => setOpenOverlay(prev => prev === ex.id ? null : ex.id)}
              />
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}

function GrammarSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-48 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
      <div className="h-32 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-28 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      ))}
    </div>
  )
}
