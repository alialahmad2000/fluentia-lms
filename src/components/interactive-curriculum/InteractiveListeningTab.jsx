import { useState, useRef, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, Volume2, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import StudentAnswersOverlay from './StudentAnswersOverlay'

const QUESTION_TYPE_LABELS = {
  main_idea: 'الفكرة الرئيسية',
  detail: 'تفاصيل',
  vocabulary: 'مفردات',
  inference: 'استنتاج',
}

const QUESTION_TYPE_COLORS = {
  main_idea: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  detail: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  vocabulary: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  inference: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

export default function InteractiveListeningTab({ unitId, groupId, students = [] }) {
  const [activeListening, setActiveListening] = useState(0)

  const { data: listenings, isLoading } = useQuery({
    queryKey: ['unit-listening', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_listening')
        .select('*')
        .eq('unit_id', unitId)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!unitId,
  })

  if (isLoading) return <ListeningSkeleton />

  if (!listenings?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Headphones size={40} className="text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد استماع لهذه الوحدة بعد</p>
      </div>
    )
  }

  const listening = listenings[activeListening]

  return (
    <div className="space-y-5">
      {listenings.length > 1 && (
        <div className="flex gap-2">
          {listenings.map((l, i) => (
            <button
              key={l.id}
              onClick={() => setActiveListening(i)}
              className={`px-4 h-9 rounded-xl text-xs font-bold border transition-colors font-['Tajawal'] flex-shrink-0 ${
                activeListening === i
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              الاستماع {String.fromCharCode(65 + i)}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={listening.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <ListeningContent listening={listening} unitId={unitId} groupId={groupId} students={students} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function ListeningContent({ listening, unitId, groupId, students }) {
  const questions = listening.exercises?.questions || listening.exercises || []

  // Fetch student progress
  const { data: studentProgress } = useQuery({
    queryKey: ['ic-listening-progress', listening.id, groupId],
    queryFn: async () => {
      const studentIds = students.map(s => s.user_id)
      if (!studentIds.length) return []
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, answers, score, status, completed_at')
        .eq('listening_id', listening.id)
        .eq('section_type', 'listening')
        .in('student_id', studentIds)
      return data || []
    },
    enabled: !!listening?.id && !!groupId && students.length > 0,
    staleTime: 30000,
  })

  const progressMap = useMemo(() => {
    const map = {}
    studentProgress?.forEach(p => { map[p.student_id] = p })
    return map
  }, [studentProgress])

  const completedCount = studentProgress?.filter(p => p.status === 'completed').length || 0

  const getStudentAnswersForQuestion = useCallback((questionIndex, correctAnswerIndex, choices) => {
    return students.map(s => {
      const progress = progressMap[s.user_id]
      const qAnswers = progress?.answers?.questions || []
      const qAnswer = qAnswers.find(q => q.questionIndex === questionIndex)
      const selectedIdx = qAnswer?.studentAnswer
      const answerText = selectedIdx != null && choices ? choices[selectedIdx] : ''
      return {
        student_id: s.user_id,
        full_name: s.full_name,
        avatar_url: s.avatar_url,
        attempted: qAnswer != null,
        answer: answerText || `Option ${(selectedIdx ?? -1) + 1}`,
        isCorrect: qAnswer?.isCorrect ?? false,
      }
    })
  }, [students, progressMap])

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)' }}>
        <Users size={16} className="text-sky-400" />
        <span className="text-sm font-medium text-sky-400 font-['Tajawal']">
          {completedCount}/{students.length} طلاب أكملوا الاستماع
        </span>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Inter']" dir="ltr">{listening.title_en}</h2>
        {listening.title_ar && <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">{listening.title_ar}</p>}
      </div>

      {/* Audio player */}
      {listening.audio_url && <AudioPlayer url={listening.audio_url} duration={listening.audio_duration_seconds} />}

      {/* Transcript */}
      {listening.transcript && (
        <TranscriptBox transcript={listening.transcript} />
      )}

      {/* Questions */}
      {questions.length > 0 && (
        <InteractiveListeningQuestions
          questions={questions}
          getStudentAnswers={getStudentAnswersForQuestion}
        />
      )}
    </div>
  )
}

function AudioPlayer({ url, duration }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url)
      audioRef.current.onended = () => { setPlaying(false); audioRef.current = null }
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play().catch(() => setPlaying(false))
      setPlaying(true)
    }
  }

  const formatDuration = (s) => s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : ''

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium transition-colors font-['Tajawal'] ${
        playing ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-sky-400'
      }`}
    >
      <Volume2 size={16} />
      {playing ? 'إيقاف' : 'تشغيل الصوت'}
      {duration > 0 && <span className="text-xs opacity-60">({formatDuration(duration)})</span>}
    </button>
  )
}

function TranscriptBox({ transcript }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[rgba(255,255,255,0.02)]">
        <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">النص المكتوب</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 pb-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-sm text-[var(--text-secondary)] font-['Inter'] leading-relaxed pt-3 whitespace-pre-wrap" dir="ltr">{transcript}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function InteractiveListeningQuestions({ questions, getStudentAnswers }) {
  const [openOverlay, setOpenOverlay] = useState(null)

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">أسئلة الفهم</h3>
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const questionText = q.question_en || q.question || q.text
          const choices = q.choices || q.options || []
          const correctIdx = q.correct_answer ?? q.correctAnswer
          const qType = q.question_type || 'detail'
          const typeBadge = QUESTION_TYPE_LABELS[qType] || qType
          const typeColor = QUESTION_TYPE_COLORS[qType] || QUESTION_TYPE_COLORS.detail

          return (
            <div key={idx} className="rounded-xl p-4 sm:p-5 space-y-3" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{idx + 1}</div>
                <div className="flex-1 space-y-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeColor} font-['Tajawal']`}>{typeBadge}</span>
                  <p className="text-sm sm:text-[15px] font-medium text-[var(--text-primary)] font-['Inter'] leading-relaxed" dir="ltr">{questionText}</p>
                </div>
                <StudentAnswersOverlay
                  questionId={`listening-${idx}`}
                  correctAnswer={choices[correctIdx] || null}
                  studentsData={getStudentAnswers(idx, correctIdx, choices)}
                  isOpen={openOverlay === idx}
                  onToggle={() => setOpenOverlay(prev => prev === idx ? null : idx)}
                />
              </div>

              {choices.length > 0 && (
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {choices.map((choice, i) => {
                    const isCorrect = i === correctIdx
                    return (
                      <div key={i} dir="ltr" className={`px-4 py-3 rounded-xl text-sm font-['Inter'] border ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[var(--surface-base)] border-[var(--border-subtle)] text-[var(--text-secondary)]'}`}>
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: isCorrect ? 'rgba(16,185,129,0.2)' : 'var(--surface-raised)', color: isCorrect ? '#34d399' : 'var(--text-muted)' }}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span>{choice}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {(q.explanation_en || q.explanation) && (
                <div className="p-3.5 rounded-xl space-y-1" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
                  <p className="text-xs text-[var(--text-secondary)] font-['Inter'] leading-relaxed" dir="ltr">{q.explanation_en || q.explanation}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ListeningSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-48 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
      <div className="h-10 w-40 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-36 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      ))}
    </div>
  )
}
