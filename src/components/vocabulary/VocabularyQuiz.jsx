import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import QuizQuestionCard from './QuizQuestionCard'
import QuizResultScreen from './QuizResultScreen'
import { useVocabularyQuiz, saveQuizAttempt } from '../../hooks/useVocabularyQuiz'
import { useBodyLock } from '../../hooks/useBodyLock'

/**
 * Full-screen vocabulary quiz modal.
 *
 * @param {Array} chunkWords     — words the quiz should draw from
 * @param {Array} unitWords      — all words in the unit (distractor pool)
 * @param {string} unitId
 * @param {string} studentId
 * @param {number} chunkSize
 * @param {number|null} chunkIndex — null = full-unit quiz
 * @param {string} title
 * @param {Function} onClose
 */
export default function VocabularyQuiz({
  chunkWords,
  unitWords,
  unitId,
  studentId,
  chunkSize,
  chunkIndex,
  title,
  onClose,
}) {
  const [sessionKey, setSessionKey] = useState(0) // bump to restart
  const quiz = useVocabularyQuiz(chunkWords, unitWords, 10)
  const {
    phase,
    currentQuestion,
    currentIdx,
    totalQuestions,
    selectedAnswer,
    submitAnswer,
    nextQuestion,
    correctCount,
    wrongWordIds,
    durationSeconds,
    xpAwarded,
  } = quiz

  const [saveState, setSaveState] = useState({ saved: false, error: null })

  // Persist attempt when we reach the done phase
  useEffect(() => {
    if (phase !== 'done' || saveState.saved || totalQuestions === 0) return
    if (!studentId || !unitId) return

    saveQuizAttempt({
      studentId,
      unitId,
      chunkIndex,
      chunkSize,
      totalQuestions,
      correctCount,
      wrongWordIds,
      durationSeconds,
      xpAwarded,
    }).then((res) => {
      setSaveState({ saved: res.attemptSaved, error: res.error })
    })
  }, [phase, sessionKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const wrongWords = wrongWordIds
    .map((id) => unitWords.find((w) => w.id === id))
    .filter(Boolean)

  const retry = () => {
    setSaveState({ saved: false, error: null })
    setSessionKey((k) => k + 1)
  }

  // Lock body scroll + hide mobile nav (always active — this component is always a modal)
  useBodyLock(true)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-[var(--surface-void)]/95 backdrop-blur-sm overflow-y-auto"
      dir="rtl"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 h-14 bg-[var(--surface-void)]/80 backdrop-blur-md border-b border-[var(--border-subtle)]">
        <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
          {title || 'اختبار المفردات'}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
          aria-label="إغلاق"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 sm:p-6" style={{ paddingBottom: 'calc(48px + var(--sab))' }}>
        <AnimatePresence mode="wait">
          {phase === 'playing' && currentQuestion && (
            <motion.div
              key={`playing_${sessionKey}_${currentIdx}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <QuizQuestionCard
                question={currentQuestion}
                currentIdx={currentIdx}
                totalQuestions={totalQuestions}
                selectedAnswer={selectedAnswer}
                onAnswer={submitAnswer}
                onNext={nextQuestion}
              />
            </motion.div>
          )}

          {phase === 'playing' && !currentQuestion && totalQuestions === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-10 text-center max-w-md mx-auto"
            >
              <p className="text-[var(--text-muted)]">
                لا يوجد كلمات كافية لإنشاء اختبار. أكمل بعض التدريب أولاً.
              </p>
              <button
                onClick={onClose}
                className="mt-4 h-10 px-5 rounded-xl bg-sky-500 text-white text-sm font-semibold"
              >
                إغلاق
              </button>
            </motion.div>
          )}

          {phase === 'done' && (
            <motion.div
              key={`done_${sessionKey}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {saveState.error && !saveState.saved && (
                <div className="max-w-xl mx-auto mb-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  لم نتمكن من حفظ النتيجة — النتيجة محفوظة مؤقتاً
                </div>
              )}
              <QuizResultScreen
                correctCount={correctCount}
                totalQuestions={totalQuestions}
                durationSeconds={durationSeconds}
                xpAwarded={xpAwarded}
                wrongWords={wrongWords}
                studentId={studentId}
                onRetry={retry}
                onClose={onClose}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
