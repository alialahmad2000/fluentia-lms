import { useState, useMemo, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generateQuestions, calculateQuizXP } from '../utils/vocabularyChunks'

/**
 * State machine for a single vocabulary quiz session.
 *
 * Phases:
 *   'playing'  — student answering questions
 *   'done'     — quiz finished, results ready
 *
 * @param {Array} chunkWords   — words the quiz should draw from
 * @param {Array} unitWords    — all words in the unit, for distractors
 * @param {number} targetCount — max number of questions (default 10)
 */
export function useVocabularyQuiz(chunkWords, unitWords, targetCount = 10) {
  const questions = useMemo(
    () => generateQuestions(chunkWords, unitWords, targetCount),
    [chunkWords, unitWords, targetCount],
  )

  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState([]) // [{ questionId, wordId, selected, correct }]
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [phase, setPhase] = useState('playing')
  const [startTime] = useState(() => Date.now())
  const [endTime, setEndTime] = useState(null)

  const currentQuestion = questions[currentIdx] || null
  const totalQuestions = questions.length
  const correctCount = answers.filter((a) => a.correct).length
  const durationSeconds = Math.max(
    1,
    Math.round(((endTime ?? Date.now()) - startTime) / 1000),
  )

  const submitAnswer = useCallback(
    (option) => {
      if (!currentQuestion || selectedAnswer !== null) return
      setSelectedAnswer(option)
      const correct = option === currentQuestion.correctAnswer
      setAnswers((prev) => [
        ...prev,
        {
          questionId: currentQuestion.id,
          wordId: currentQuestion.word.id,
          selected: option,
          correct,
        },
      ])
    },
    [currentQuestion, selectedAnswer],
  )

  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 >= totalQuestions) {
      setEndTime(Date.now())
      setPhase('done')
      return
    }
    setCurrentIdx((idx) => idx + 1)
    setSelectedAnswer(null)
  }, [currentIdx, totalQuestions])

  // Handle the edge case of zero questions
  useEffect(() => {
    if (questions.length === 0 && phase === 'playing') {
      setPhase('done')
      setEndTime(Date.now())
    }
  }, [questions.length, phase])

  const wrongWordIds = answers.filter((a) => !a.correct).map((a) => a.wordId)
  const xpAwarded = calculateQuizXP(correctCount, totalQuestions)

  return {
    phase,
    currentQuestion,
    currentIdx,
    totalQuestions,
    selectedAnswer,
    submitAnswer,
    nextQuestion,
    answers,
    correctCount,
    wrongWordIds,
    durationSeconds,
    xpAwarded,
  }
}

/**
 * Persist a completed quiz attempt + award XP.
 * Returns { attemptSaved, xpSaved, error }.
 */
export async function saveQuizAttempt({
  studentId,
  unitId,
  chunkIndex,
  chunkSize,
  totalQuestions,
  correctCount,
  wrongWordIds,
  durationSeconds,
  xpAwarded,
}) {
  const result = { attemptSaved: false, xpSaved: false, error: null }

  try {
    const { data: inserted, error: insertErr } = await supabase
      .from('vocabulary_quiz_attempts')
      .insert({
        student_id: studentId,
        unit_id: unitId,
        chunk_index: chunkIndex,
        chunk_size: chunkSize,
        total_questions: totalQuestions,
        correct_count: correctCount,
        wrong_word_ids: wrongWordIds,
        duration_seconds: durationSeconds,
        xp_awarded: xpAwarded,
      })
      .select()
    if (insertErr) {
      result.error = insertErr
      console.error('Failed to save quiz attempt:', insertErr)
    } else if (!inserted?.length) {
      result.error = new Error('Quiz attempt insert returned 0 rows — possible RLS block')
      console.error('Silent RLS failure on vocabulary_quiz_attempts')
    } else {
      result.attemptSaved = true
    }
  } catch (e) {
    result.error = e
  }

  if (xpAwarded > 0) {
    try {
      const { error: xpErr } = await supabase.from('xp_transactions').insert({
        student_id: studentId,
        amount: xpAwarded,
        reason: 'challenge',
        description: `اختبار المفردات — ${correctCount}/${totalQuestions}`,
      })
      if (xpErr) {
        console.error('Failed to insert XP transaction:', xpErr)
        // Fallback to RPC
        const { error: rpcErr } = await supabase.rpc('award_curriculum_xp', {
          p_student_id: studentId,
          p_section_type: 'challenge',
          p_score: Math.round((correctCount / totalQuestions) * 100),
          p_unit_id: unitId,
          p_description: `اختبار المفردات — ${correctCount}/${totalQuestions}`,
        })
        if (!rpcErr) result.xpSaved = true
      } else {
        result.xpSaved = true
      }
    } catch (e) {
      console.error('XP insert threw:', e)
    }
  }

  return result
}
