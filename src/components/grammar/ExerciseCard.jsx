import { useFadeIn } from './useFadeIn'
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

export default function ExerciseCard({ exercise, index, total, answer, onAnswer }) {
  const ref = useFadeIn()
  const item = exercise.items?.[0]
  if (!item) return null

  const typeLabel = TYPE_LABELS[exercise.exercise_type] || exercise.exercise_type
  const num = String(index + 1).padStart(2, '0')

  return (
    <div ref={ref} className="grammar-glass grammar-fade-in p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-white/25 font-['Inter']">{num} / {String(total).padStart(2, '0')}</span>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-sky-500/8 text-sky-400/70 border border-sky-500/15 font-['Tajawal']">
          {typeLabel}
        </span>
      </div>

      {/* Question text */}
      <p className="text-[17px] font-medium text-white/90 font-['Inter'] leading-relaxed" dir="ltr">
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
    </div>
  )
}
