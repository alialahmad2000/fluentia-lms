import { useMemo } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { validateAnswer } from '../../../utils/answerValidator'
import { useG } from '@/i18n/gender'

function randomMsg(arr) { return arr[Math.floor(Math.random() * arr.length)] }

/**
 * The stored option order is NOT neutral: 74.6% of four-option grammar items
 * and 68% of three-option ones keep the correct answer in slot A, because the
 * generator always wrote it first. A student who always taps the first choice
 * scores ~72% on the multiple-choice third of the bank without knowing any
 * grammar — so the score stops meaning what it looks like it means.
 *
 * Reading was fixed this way in e41544d4 and listening in the 2026-06-08 pass;
 * grammar was never swept. Grading compares the option TEXT via validateAnswer,
 * never the index, so reordering cannot break scoring.
 *
 * SEEDED on the question, so the order is stable across re-renders and reloads
 * — options must never jump under the student's finger mid-answer.
 */
function seededShuffle(options, seed) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const rand = () => {
    h ^= h << 13; h >>>= 0
    h ^= h >>> 17
    h ^= h << 5; h >>>= 0
    return h / 4294967296
  }
  const a = [...options]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}


export default function MCQQuestion({ item, answer, onAnswer }) {
  const g = useG()
  const CORRECT_MSGS = [g('أحسنت! إجابة صحيحة 🎯', 'أحسنتِ! إجابة صحيحة 🎯'), g('ممتاز! ✨', 'ممتازة! ✨'), 'صحيح! رائع 💫', 'بالضبط! 🌟', 'إجابة موفقة! 🔥']
  const WRONG_MSGS = [g('لا بأس — راجع القاعدة 📖', 'لا بأس — راجعي القاعدة 📖'), g('حاول تذكّر القاعدة 💡', 'حاولي تذكّر القاعدة 💡'), g('قريب! راجع الشرح 🔍', 'قريب! راجعي الشرح 🔍')]
  const acceptedAnswers = item.accepted_answers?.length ? item.accepted_answers : [item.correct_answer]
  const options = useMemo(
    () => seededShuffle(item.options || [], String(item.id ?? item.question ?? '')),
    [item.options, item.id, item.question]
  )

  const handleSelect = (opt) => {
    if (answer) return
    onAnswer({ selected: opt, correct: validateAnswer(opt, acceptedAnswers) })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {options.map((opt, i) => {
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
