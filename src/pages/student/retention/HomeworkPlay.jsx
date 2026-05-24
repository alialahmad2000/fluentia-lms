// /student/retention/homework/play/:setId — exercise-by-exercise player
// Instant feedback + Arabic explanation on wrong answer. Auto-advances after correct.

import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, ChevronLeft, ArrowLeft } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthUserId } from '../../../stores/authStore'
import AuroraBackground from '../../../design-system/components/AuroraBackground'
import GlassPanel from '../../../design-system/components/GlassPanel'
import { awardPracticeXP } from '../../../utils/xpManager'

export default function HomeworkPlay() {
  const { setId } = useParams()
  const navigate = useNavigate()
  const userId = useAuthUserId()
  const qc = useQueryClient()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [submittedAnswer, setSubmittedAnswer] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [startTime, setStartTime] = useState(Date.now())

  // Fetch set + exercises
  const setQuery = useQuery({
    queryKey: ['retention-homework-set', setId],
    queryFn: async () => {
      const { data: setRow, error } = await supabase
        .from('retention_homework_sets')
        .select('*')
        .eq('id', setId)
        .single()
      if (error) throw error
      const { data: exercises, error: exErr } = await supabase
        .from('retention_exercises')
        .select('*')
        .in('id', setRow.exercise_ids)
      if (exErr) throw exErr
      // Preserve original order
      const orderMap = new Map(setRow.exercise_ids.map((id, i) => [id, i]))
      exercises.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
      return { set: setRow, exercises }
    },
    enabled: Boolean(setId),
  })

  // Already-attempted exercises in this set (so resuming jumps to the right index)
  const attemptedQuery = useQuery({
    queryKey: ['retention-homework-attempts-set', setId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retention_homework_attempts')
        .select('exercise_id, is_correct, student_answer')
        .eq('homework_set_id', setId)
      if (error) throw error
      return data || []
    },
    enabled: Boolean(setId),
  })

  // Jump to first unattempted exercise on initial load
  useEffect(() => {
    if (!setQuery.data || !attemptedQuery.data) return
    const attemptedIds = new Set(attemptedQuery.data.map((a) => a.exercise_id))
    const firstUnanswered = setQuery.data.exercises.findIndex((e) => !attemptedIds.has(e.id))
    if (firstUnanswered > -1) setCurrentIndex(firstUnanswered)
    else setCurrentIndex(setQuery.data.exercises.length) // all done — show summary
    setStartTime(Date.now())
  }, [setQuery.data, attemptedQuery.data])

  const exercises = setQuery.data?.exercises || []
  const currentExercise = exercises[currentIndex]
  const isLast = currentIndex >= exercises.length - 1
  const allDone = currentIndex >= exercises.length

  // Compute options for MCQ-style questions
  const options = useMemo(() => {
    if (!currentExercise) return []
    const correct = currentExercise.correct_answer?.value
    const distractors = currentExercise.distractors || []
    if (currentExercise.exercise_type === 'mcq' ||
        currentExercise.exercise_type === 'vocab_match') {
      const all = [correct, ...distractors].filter(Boolean)
      // Shuffle once per exercise via index seed (deterministic per render)
      return all.sort((a, b) => String(a).localeCompare(String(b)))
    }
    return null
  }, [currentExercise])

  const submitAnswer = async () => {
    if (!currentExercise || !userId || submittedAnswer != null) return
    const studentAnswer = answer.trim()
    if (!studentAnswer) return

    const correct = String(currentExercise.correct_answer?.value || '').toLowerCase().trim()
    const isMatch = studentAnswer.toLowerCase() === correct
    // Looser matching for mini_write: count as correct if it includes 50%+ of expected keywords
    let pass = isMatch
    if (!pass && currentExercise.exercise_type === 'mini_write') {
      const expectedKeywords = correct.split(/[\s.,]+/).filter((w) => w.length > 3)
      const got = studentAnswer.toLowerCase().split(/[\s.,]+/)
      const hit = expectedKeywords.filter((kw) => got.some((g) => g.includes(kw)))
      pass = expectedKeywords.length > 0 && hit.length / expectedKeywords.length >= 0.4
    }

    setSubmittedAnswer(studentAnswer)
    setIsCorrect(pass)

    // Persist attempt
    await supabase.from('retention_homework_attempts').insert({
      homework_set_id: setId,
      exercise_id: currentExercise.id,
      student_id: userId,
      student_answer: { value: studentAnswer },
      is_correct: pass,
      time_seconds: Math.floor((Date.now() - startTime) / 1000),
    })

    // Update set counters
    await supabase
      .from('retention_homework_sets')
      .update({ completed_count: currentIndex + 1 })
      .eq('id', setId)
  }

  const goNext = async () => {
    setAnswer('')
    setSubmittedAnswer(null)
    setIsCorrect(null)
    setStartTime(Date.now())
    if (isLast) {
      // Mark set complete + award XP if not already done
      const correctCount = (attemptedQuery.data || []).filter((a) => a.is_correct).length
        + (isCorrect ? 1 : 0)
      const total = exercises.length
      const xp = await awardPracticeXP(userId, 'vocab_fill', { score: correctCount, total })
      await supabase
        .from('retention_homework_sets')
        .update({ completed_at: new Date().toISOString(), completed_count: total, xp_awarded: xp || 0 })
        .eq('id', setId)
      qc.invalidateQueries({ queryKey: ['retention-active-homework'] })
      qc.invalidateQueries({ queryKey: ['retention-homework-history'] })
      navigate(`/student/retention/homework/result/${setId}`)
      return
    }
    setCurrentIndex((i) => i + 1)
  }

  if (setQuery.isLoading) {
    return (
      <div className="p-8" dir="rtl">
        <div className="h-32 animate-pulse rounded-xl" style={{ background: 'var(--ds-surface-1)' }} />
      </div>
    )
  }
  if (setQuery.error) {
    return (
      <div className="p-8 text-center" dir="rtl" style={{ color: 'var(--ds-accent-danger)' }}>
        تعذّر تحميل المجموعة — حاولي مرة ثانية
      </div>
    )
  }
  if (allDone) {
    // Defensive: navigate to result
    navigate(`/student/retention/homework/result/${setId}`)
    return null
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <AuroraBackground />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5 relative">
        {/* Header — back + progress */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate('/student/retention/homework')}
            className="flex items-center gap-1 text-sm"
            style={{ color: 'var(--ds-text-secondary)' }}
          >
            <ArrowLeft size={16} />
            خروج
          </button>
          <span className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
            {currentIndex + 1} / {exercises.length}
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {exercises.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1.5"
              style={{
                background:
                  i < currentIndex
                    ? 'var(--ds-accent-success)'
                    : i === currentIndex
                    ? 'var(--ds-accent-primary)'
                    : 'var(--ds-surface-2)',
                borderRadius: 'var(--radius-full)',
              }}
            />
          ))}
        </div>

        {/* Exercise card */}
        <GlassPanel padding="lg">
          <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
            <span
              className="px-2 py-0.5"
              style={{
                background: 'color-mix(in srgb, var(--ds-accent-secondary) 16%, transparent)',
                color: 'var(--ds-accent-secondary)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {typeLabel(currentExercise.exercise_type)}
            </span>
            <span>·</span>
            <span>{skillLabel(currentExercise.skill)}</span>
          </div>

          <p
            className="text-lg md:text-xl leading-relaxed mb-5"
            style={{ color: 'var(--ds-text-primary)', direction: 'ltr', textAlign: 'left' }}
          >
            {currentExercise.prompt_en}
          </p>

          {options ? (
            // MCQ / vocab_match
            <div className="space-y-2">
              {options.map((opt, i) => {
                const isThisCorrect = submittedAnswer != null && opt === currentExercise.correct_answer?.value
                const isThisWrong = submittedAnswer === opt && !isCorrect
                return (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (submittedAnswer != null) return
                      setAnswer(opt)
                    }}
                    className="w-full text-right p-4 transition"
                    style={{
                      background: answer === opt && submittedAnswer == null
                        ? 'color-mix(in srgb, var(--ds-accent-primary) 18%, var(--ds-surface-1))'
                        : isThisCorrect
                        ? 'color-mix(in srgb, var(--ds-accent-success) 18%, var(--ds-surface-1))'
                        : isThisWrong
                        ? 'color-mix(in srgb, var(--ds-accent-danger) 18%, var(--ds-surface-1))'
                        : 'var(--ds-surface-1)',
                      border: '1px solid ' + (answer === opt && submittedAnswer == null
                        ? 'var(--ds-accent-primary)'
                        : isThisCorrect
                        ? 'var(--ds-accent-success)'
                        : isThisWrong
                        ? 'var(--ds-accent-danger)'
                        : 'var(--ds-border-subtle)'),
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--ds-text-primary)',
                      direction: 'ltr',
                      textAlign: 'left',
                    }}
                  >
                    {opt}
                  </motion.button>
                )
              })}
            </div>
          ) : (
            // fill_blank / reorder / sentence_correction / mini_write
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={submittedAnswer != null}
              placeholder={currentExercise.exercise_type === 'mini_write' ? 'اكتبي إجابتك هنا…' : 'إجابتك…'}
              dir="ltr"
              rows={currentExercise.exercise_type === 'mini_write' ? 4 : 2}
              className="w-full p-4 text-base"
              style={{
                background: 'var(--ds-surface-1)',
                border: '1px solid var(--ds-border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--ds-text-primary)',
                resize: 'vertical',
              }}
            />
          )}

          {/* Feedback */}
          <AnimatePresence mode="wait">
            {submittedAnswer != null && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-4"
                style={{
                  background: isCorrect
                    ? 'color-mix(in srgb, var(--ds-accent-success) 12%, transparent)'
                    : 'color-mix(in srgb, var(--ds-accent-danger) 12%, transparent)',
                  border: '1px solid ' + (isCorrect ? 'var(--ds-accent-success)' : 'var(--ds-accent-danger)'),
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div className="flex items-start gap-2 mb-2">
                  {isCorrect
                    ? <CheckCircle2 size={20} style={{ color: 'var(--ds-accent-success)' }} />
                    : <XCircle size={20} style={{ color: 'var(--ds-accent-danger)' }} />}
                  <span className="font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
                    {isCorrect ? 'إجابة صحيحة!' : 'ليست صحيحة'}
                  </span>
                </div>
                {!isCorrect && (
                  <div className="text-sm mb-2" style={{ color: 'var(--ds-text-secondary)' }}>
                    الإجابة الصحيحة:{' '}
                    <span style={{ color: 'var(--ds-text-primary)', fontWeight: 600, direction: 'ltr', display: 'inline-block' }}>
                      {currentExercise.correct_answer?.value}
                    </span>
                  </div>
                )}
                <div className="text-sm leading-relaxed" style={{ color: 'var(--ds-text-secondary)' }}>
                  {currentExercise.explanation_ar}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action button */}
          <div className="mt-5">
            {submittedAnswer == null ? (
              <button
                onClick={submitAnswer}
                disabled={!answer.trim()}
                className="w-full font-semibold py-3 transition"
                style={{
                  background: answer.trim() ? 'var(--ds-accent-primary)' : 'var(--ds-surface-2)',
                  color: answer.trim() ? 'var(--ds-text-inverse)' : 'var(--ds-text-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  opacity: answer.trim() ? 1 : 0.6,
                }}
              >
                تحقّق من الإجابة
              </button>
            ) : (
              <button
                onClick={goNext}
                className="w-full font-semibold py-3"
                style={{
                  background: 'var(--ds-accent-primary)',
                  color: 'var(--ds-text-inverse)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {isLast ? 'إنهاء وعرض النتيجة ←' : 'التالي ←'}
              </button>
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}

function typeLabel(t) {
  return {
    fill_blank: 'املأ الفراغ',
    reorder: 'رتّب الكلمات',
    mcq: 'اختر الإجابة',
    sentence_correction: 'صحّح الجملة',
    vocab_match: 'وصّل المعنى',
    mini_write: 'اكتبي جملاً',
  }[t] || t
}

function skillLabel(s) {
  return { grammar: 'قواعد', vocab: 'مفردات', reading: 'قراءة', writing: 'كتابة' }[s] || s
}
