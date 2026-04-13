import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import ExplainModal from './ExplainModal'
import MCQQuestion from './exercise-types/MCQQuestion'
import FillBlankQuestion from './exercise-types/FillBlankQuestion'
import ErrorCorrectionQuestion from './exercise-types/ErrorCorrectionQuestion'
import ReorderQuestion from './exercise-types/ReorderQuestion'
import TransformQuestion from './exercise-types/TransformQuestion'

const TYPE_LABELS = {
  fill_blank: 'أكمل الفراغ',
  choose: 'اختيار من متعدد',
  error_correction: 'صحّح الخطأ',
  reorder: 'رتّب الكلمات',
  transform: 'حوّل الجملة',
  make_question: 'كوّن سؤالاً',
}

export default function ExerciseCard({ exercise, index, total, answer, onAnswer, grammarTopic, studentLevel, ruleSnippet }) {
  const [explainOpen, setExplainOpen] = useState(false)
  const item = exercise.items?.[0]
  if (!item) return null

  const typeLabel = TYPE_LABELS[exercise.exercise_type] || exercise.exercise_type
  const num = String(index + 1).padStart(2, '0')

  // Build payload for AI explanation
  const explainPayload = answer ? {
    questionText: item.question,
    studentAnswer: answer.selected,
    correctAnswer: item.correct_answer,
    isCorrect: answer.correct,
    grammarTopic: grammarTopic || '',
    studentLevel: studentLevel || 'A1',
    ruleSnippet: ruleSnippet || '',
  } : null

  return (
    <div data-grammar-exercise-card className="grammar-glass p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold font-['Inter']" style={{ color: 'var(--text-tertiary)' }}>
            {num} / {String(total).padStart(2, '0')}
          </span>
        </div>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-md font-['Tajawal']"
          style={{ background: 'var(--info-bg)', color: 'var(--accent-sky)', border: '1px solid var(--info-border)' }}
        >
          {typeLabel}
        </span>
      </div>

      {/* Question text */}
      <p className="text-[17px] font-medium font-['Inter'] leading-relaxed" dir="ltr" style={{ color: 'var(--text-primary)' }}>
        {item.question}
      </p>

      {/* Question type renderer */}
      {exercise.exercise_type === 'choose' && (
        <MCQQuestion item={item} answer={answer} onAnswer={onAnswer} />
      )}
      {exercise.exercise_type === 'fill_blank' && (
        <FillBlankQuestion item={item} answer={answer} onAnswer={onAnswer} />
      )}
      {exercise.exercise_type === 'error_correction' && (
        <ErrorCorrectionQuestion item={item} answer={answer} onAnswer={onAnswer} />
      )}
      {exercise.exercise_type === 'reorder' && (
        <ReorderQuestion item={item} answer={answer} onAnswer={onAnswer} />
      )}
      {(exercise.exercise_type === 'transform' || exercise.exercise_type === 'make_question') && (
        <TransformQuestion item={item} answer={answer} onAnswer={onAnswer} exerciseType={exercise.exercise_type} />
      )}

      {/* Explanation after answer */}
      {answer && item.explanation_ar && (
        <div className="grammar-explanation-bar text-xs font-['Tajawal']" dir="rtl">
          {item.explanation_ar}
        </div>
      )}

      {/* "اشرح لي" AI tutor button — shown after any answer */}
      {answer && (
        <button
          className="grammar-explain-btn"
          onClick={() => setExplainOpen(true)}
        >
          <Sparkles size={14} />
          اشرح لي
        </button>
      )}

      {/* AI Explain Modal */}
      <ExplainModal
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        payload={explainPayload}
      />
    </div>
  )
}
