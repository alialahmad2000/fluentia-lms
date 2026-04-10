import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, ArrowLeft } from 'lucide-react'

/**
 * Single quiz question card. Controlled by useVocabularyQuiz hook.
 */
export default function QuizQuestionCard({
  question,
  currentIdx,
  totalQuestions,
  selectedAnswer,
  onAnswer,
  onNext,
}) {
  if (!question) return null

  const answered = selectedAnswer !== null
  const isCorrect = answered && selectedAnswer === question.correctAnswer
  const progressPct = Math.round(((currentIdx + (answered ? 1 : 0)) / totalQuestions) * 100)

  return (
    <div dir="rtl" className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Top bar: counter + progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            السؤال {currentIdx + 1} من {totalQuestions}
          </span>
          <span className="text-xs font-semibold text-sky-400">{question.label}</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--surface-raised)] overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-l from-sky-400 to-sky-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
      </div>

      {/* Prompt */}
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 sm:p-8 text-center"
      >
        <p
          className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] leading-relaxed"
          dir={question.promptDir || 'ltr'}
        >
          {question.prompt}
        </p>
      </motion.div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {question.options.map((option, i) => {
          const isSelected = option === selectedAnswer
          const isCorrectOption = option === question.correctAnswer

          let stateClass =
            'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-sky-400/50 hover:bg-sky-500/5'
          if (answered) {
            if (isCorrectOption) {
              stateClass =
                'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
            } else if (isSelected) {
              stateClass = 'bg-rose-500/15 border-rose-500/50 text-rose-300'
            } else {
              stateClass =
                'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60'
            }
          }

          return (
            <motion.button
              key={`${question.id}_opt_${i}`}
              whileTap={{ scale: answered ? 1 : 0.98 }}
              disabled={answered}
              onClick={() => onAnswer(option)}
              className={`min-h-[56px] px-4 py-3 rounded-xl border text-sm sm:text-base font-medium text-right transition-colors ${stateClass}`}
              dir={question.type === 'en_to_ar' ? 'rtl' : 'ltr'}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex-1 text-right">{option}</span>
                {answered && isCorrectOption && (
                  <Check size={18} className="text-emerald-400 flex-shrink-0" />
                )}
                {answered && isSelected && !isCorrectOption && (
                  <X size={18} className="text-rose-400 flex-shrink-0" />
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Feedback + next */}
      <AnimatePresence mode="wait">
        {answered && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-xl border ${
              isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-rose-500/10 border-rose-500/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {isCorrect ? (
                <Check size={16} className="text-emerald-400" />
              ) : (
                <X size={16} className="text-rose-400" />
              )}
              <span
                className={`text-sm font-semibold ${
                  isCorrect ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {isCorrect ? 'ممتاز!' : 'حاول مرة ثانية'}
              </span>
            </div>
            {!isCorrect && (
              <p className="text-xs text-[var(--text-secondary)]">
                الإجابة الصحيحة: <span className="font-semibold">{question.correctAnswer}</span>
              </p>
            )}
            {question.example && (
              <p
                className="text-xs text-[var(--text-muted)] mt-2 italic"
                dir="ltr"
              >
                {question.example}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {answered && (
        <button
          onClick={onNext}
          className="h-12 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {currentIdx + 1 >= totalQuestions ? 'عرض النتيجة' : 'التالي'}
          <ArrowLeft size={16} />
        </button>
      )}
    </div>
  )
}
