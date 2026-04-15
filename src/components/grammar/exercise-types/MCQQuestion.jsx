import { CheckCircle, XCircle } from 'lucide-react'
import { validateAnswer } from '../../../utils/answerValidator'

const CORRECT_MSGS = ['أحسنتِ! إجابة صحيحة 🎯', 'ممتازة! ✨', 'صحيح! رائع 💫', 'بالضبط! 🌟', 'إجابة موفقة! 🔥']
const WRONG_MSGS = ['لا بأس — راجعي القاعدة 📖', 'حاولي تذكّر القاعدة 💡', 'قريب! راجعي الشرح 🔍']

function randomMsg(arr) { return arr[Math.floor(Math.random() * arr.length)] }

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

          const label = String.fromCharCode(65 + i)

          let cls = 'grammar-option active:scale-[0.97] transition-transform'
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
              <span className="text-xs font-bold mr-1 font-['Inter']" style={{ color: 'var(--text-tertiary)' }}>({label})</span>
              <span className="font-['Inter'] font-medium" style={{ color: 'var(--text-primary)' }}>{opt}</span>
              {showCorrect && <CheckCircle size={16} className="mr-auto flex-shrink-0" style={{ color: 'var(--success)' }} />}
              {showWrong && <XCircle size={16} className="mr-auto flex-shrink-0" style={{ color: 'var(--danger)' }} />}
            </button>
          )
        })}
      </div>

      {answer && answer.correct && (
        <p className="text-sm font-['Tajawal'] font-bold" dir="rtl" style={{ color: 'var(--success)' }}>{randomMsg(CORRECT_MSGS)}</p>
      )}
      {answer && !answer.correct && (
        <p className="text-sm font-['Tajawal']" dir="rtl" style={{ color: 'var(--text-secondary)' }}>{randomMsg(WRONG_MSGS)}</p>
      )}
    </div>
  )
}
