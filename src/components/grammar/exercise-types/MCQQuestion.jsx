import { CheckCircle, XCircle } from 'lucide-react'
import { validateAnswer } from '../../../utils/answerValidator'

export default function MCQQuestion({ item, answer, onAnswer }) {
  const acceptedAnswers = item.accepted_answers || [item.correct_answer]

  const handleSelect = (opt) => {
    if (answer) return
    onAnswer({ selected: opt, correct: validateAnswer(opt, acceptedAnswers) })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {item.options?.map((opt, i) => {
          const isSelected = answer?.selected === opt
          const isCorrect = validateAnswer(opt, acceptedAnswers)
          const showCorrect = answer && isCorrect
          const showWrong = answer && isSelected && !answer.correct

          const label = String.fromCharCode(65 + i) // A, B, C, D

          let cls = 'grammar-option'
          if (showCorrect) cls += ' grammar-option--correct'
          else if (showWrong) cls += ' grammar-option--wrong'
          else if (answer && !isSelected && !isCorrect) cls += ' grammar-option--dimmed'
          else if (answer && !isSelected && isCorrect) cls += ' grammar-option--reveal-correct'

          return (
            <button
              key={i}
              onClick={() => handleSelect(opt)}
              disabled={!!answer}
              aria-pressed={isSelected}
              className={cls}
              dir="ltr"
            >
              <span className="text-xs text-white/25 font-bold mr-1 font-['Inter']">({label})</span>
              <span className="font-['Inter'] font-medium text-white/90">{opt}</span>
              {showCorrect && <CheckCircle size={16} className="text-emerald-400 mr-auto flex-shrink-0" />}
              {showWrong && <XCircle size={16} className="text-rose-400 mr-auto flex-shrink-0" />}
            </button>
          )
        })}
      </div>

      {/* Inline feedback */}
      {answer && answer.correct && (
        <p className="text-sm text-emerald-400 font-['Tajawal'] font-medium">أحسنت! ✨</p>
      )}
    </div>
  )
}
