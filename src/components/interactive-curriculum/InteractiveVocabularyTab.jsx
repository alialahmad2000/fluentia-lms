import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Languages, Users, BookOpen, CheckCircle, Clock, ChevronDown, ChevronUp, Puzzle, PenLine, ListChecks, Shuffle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function InteractiveVocabularyTab({ unitId, students = [] }) {
  // Fetch vocabulary for this unit (two-step: readings → vocabulary via reading_id)
  const { data: vocabulary, isLoading: vocabLoading } = useQuery({
    queryKey: ['unit-vocabulary-ic', unitId],
    queryFn: async () => {
      // Step 1: Get readings for this unit
      const { data: readings } = await supabase
        .from('curriculum_readings')
        .select('id, reading_label')
        .eq('unit_id', unitId)
        .order('sort_order')
      if (!readings?.length) return []
      // Step 2: Get vocabulary for each reading
      const readingIds = readings.map(r => r.id)
      const { data: vocab } = await supabase
        .from('curriculum_vocabulary')
        .select('*')
        .in('reading_id', readingIds)
        .order('sort_order')
      if (!vocab?.length) return []
      // Attach reading label to each word
      const readingMap = Object.fromEntries(readings.map(r => [r.id, r]))
      return vocab.map(v => ({ ...v, reading: readingMap[v.reading_id] || null }))
    },
    enabled: !!unitId,
  })

  // Fetch student progress for vocabulary
  const { data: studentProgress } = useQuery({
    queryKey: ['ic-vocabulary-progress', unitId, students.map(s => s.user_id).sort().join()],
    queryFn: async () => {
      const studentIds = students.map(s => s.user_id)
      if (!studentIds.length) return []
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, answers, score, status, completed_at')
        .eq('unit_id', unitId)
        .eq('section_type', 'vocabulary')
        .in('student_id', studentIds)
      return data || []
    },
    enabled: !!unitId && students.length > 0,
    staleTime: 30000,
  })

  // Fetch student progress for vocabulary exercises
  const { data: exerciseProgress } = useQuery({
    queryKey: ['ic-vocab-exercise-progress', unitId, students.map(s => s.user_id).sort().join()],
    queryFn: async () => {
      const studentIds = students.map(s => s.user_id)
      if (!studentIds.length) return []
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, answers, score, status, completed_at')
        .eq('unit_id', unitId)
        .eq('section_type', 'vocabulary_exercise')
        .in('student_id', studentIds)
      return data || []
    },
    enabled: !!unitId && students.length > 0,
    staleTime: 30000,
  })

  const exerciseMap = useMemo(() => {
    const map = {}
    exerciseProgress?.forEach(p => { map[p.student_id] = p })
    return map
  }, [exerciseProgress])

  const progressMap = useMemo(() => {
    const map = {}
    studentProgress?.forEach(p => { map[p.student_id] = p })
    return map
  }, [studentProgress])

  if (vocabLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
        ))}
      </div>
    )
  }

  if (!vocabulary?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Languages size={40} className="text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد مفردات لهذه الوحدة بعد</p>
      </div>
    )
  }

  const completedCount = studentProgress?.filter(p => p.status === 'completed').length || 0

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)' }}>
        <Users size={16} className="text-sky-400" />
        <span className="text-sm font-medium text-sky-400 font-['Tajawal']">
          {completedCount}/{students.length} طلاب أكملوا مراجعة المفردات
        </span>
      </div>

      {/* Vocabulary words list */}
      <div className="space-y-1">
        <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">المفردات ({vocabulary.length} كلمة)</h3>
      </div>

      <div className="space-y-2">
        {vocabulary.map(v => (
          <div
            key={v.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
          >
            {v.image_url && (
              <img src={v.image_url} alt={v.word} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" loading="lazy" />
            )}
            <div className="flex-1 min-w-0" dir="ltr">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[var(--text-primary)] font-['Inter']">{v.word}</span>
                <span className="text-[10px] text-[var(--text-muted)] font-['Inter']">{v.part_of_speech}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-['Inter'] mt-0.5">{v.definition_en}</p>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-['Tajawal'] flex-shrink-0">{v.definition_ar}</span>
          </div>
        ))}
      </div>

      {/* Student completion status */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">حالة المراجعة لكل طالب</h3>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="divide-y divide-[rgba(255,255,255,0.04)]">
            {students.map((student, idx) => {
              const progress = progressMap[student.user_id]
              const reviewedCount = progress?.answers?.reviewedWords?.length || 0
              const totalWords = vocabulary.length
              const isCompleted = progress?.status === 'completed'

              return (
                <div
                  key={student.user_id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                >
                  {isCompleted ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.15)' }}>
                      <CheckCircle size={13} style={{ color: '#22c55e' }} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(100,116,139,0.15)' }}>
                      <Clock size={13} style={{ color: '#64748b' }} />
                    </div>
                  )}

                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
                      {student.avatar_url ? (
                        <img src={student.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        student.full_name?.charAt(0) || '?'
                      )}
                    </div>
                    <span className="text-sm text-[var(--text-primary)] font-['Tajawal'] truncate">{student.full_name}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {progress ? (
                      <>
                        <span className="text-xs font-['Tajawal']" style={{ color: isCompleted ? '#22c55e' : '#f59e0b' }}>
                          {reviewedCount}/{totalWords} كلمة
                        </span>
                        {/* Mini progress bar */}
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-base)' }}>
                          <div className="h-full rounded-full" style={{ width: `${totalWords > 0 ? (reviewedCount / totalWords) * 100 : 0}%`, background: isCompleted ? '#22c55e' : '#f59e0b' }} />
                        </div>
                      </>
                    ) : (
                      <span className="text-xs font-['Tajawal']" style={{ color: '#64748b' }}>لم تبدأ</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Exercise Results */}
      <ExerciseResults students={students} exerciseMap={exerciseMap} />
    </div>
  )
}

const EXERCISE_LABELS = {
  match: { label: 'اربط الكلمة بمعناها', icon: Puzzle },
  fill_blank: { label: 'أكمل الفراغ', icon: PenLine },
  choose: { label: 'اختر المعنى الصحيح', icon: ListChecks },
  scramble: { label: 'رتّب الحروف', icon: Shuffle },
}

function ExerciseResults({ students, exerciseMap }) {
  const [expanded, setExpanded] = useState(null)

  const exerciseTypes = ['match', 'fill_blank', 'choose', 'scramble']
  const hasAnyData = students.some(s => exerciseMap[s.user_id])

  if (!hasAnyData) return null

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">تمارين المفردات</h3>

      {exerciseTypes.map(type => {
        const info = EXERCISE_LABELS[type]
        const studentsWithData = students.filter(s => {
          const p = exerciseMap[s.user_id]
          return p?.answers?.exercises?.[type]?.completed
        })
        if (!studentsWithData.length) return null

        const isExpanded = expanded === type

        return (
          <div
            key={type}
            className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              onClick={() => setExpanded(isExpanded ? null : type)}
              className="w-full flex items-center justify-between px-4 py-3 text-right"
            >
              <div className="flex items-center gap-2">
                <info.icon size={14} className="text-sky-400" />
                <span className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>{info.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Users size={12} className="text-sky-400" />
                  <span className="text-xs font-['Tajawal']" style={{ color: '#38bdf8' }}>{studentsWithData.length}</span>
                </div>
                {isExpanded ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-3 space-y-1.5">
                {students.map(student => {
                  const p = exerciseMap[student.user_id]
                  const exData = p?.answers?.exercises?.[type]
                  if (!exData?.completed) return null
                  return (
                    <div
                      key={student.user_id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <span className="text-xs font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>{student.full_name}</span>
                      <span
                        className="text-xs font-bold font-['Tajawal']"
                        style={{ color: exData.score >= exData.maxScore * 0.7 ? '#22c55e' : '#f59e0b' }}
                      >
                        {exData.score}/{exData.maxScore}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
