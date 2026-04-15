import { useState, useRef } from 'react'
import { validateAnswer } from '../../../utils/answerValidator'

const CORRECT_MSGS = ['ممتازة! إجابة صحيحة 🎯', 'أحسنتِ! بالضبط ✨', 'صحيح! رائع 💫', 'إجابة موفقة! 🌟']

export default function FillBlankQuestion({ item, answer, onAnswer }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)
  const acceptedAnswers = item.accepted_answers || [item.correct_answer]
  const expectedWordCount = (acceptedAnswers[0] || '').split(/\s+/).filter(Boolean).length

  const handleSubmit = (e) => {
    e.preventDefault()
    if (answer || !input.trim()) return
    const correct = validateAnswer(input.trim(), acceptedAnswers, {
      fullSentence: item.question,
    })
    onAnswer({ selected: input.trim(), correct })
  }

  let inputCls = 'grammar-input w-full font-[\'Inter\']'
  if (answer?.correct) inputCls += ' grammar-input--correct'
  else if (answer && !answer.correct) inputCls += ' grammar-input--wrong'

  return (
    <form onSubmit={handleSubmit} className="space-y-3" dir="ltr">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={answer ? answer.selected : input}
          onChange={e => setInput(e.target.value)}
          disabled={!!answer}
          placeholder={expectedWordCount <= 1 ? '____ (one word)' : `____ (${expectedWordCount} words)`}
          aria-describedby="fill-blank-hint"
          className={inputCls}
        />
        {!answer && (
          <button
            type="submit"
            disabled={!input.trim()}
            className="grammar-option px-5 font-['Tajawal'] font-bold text-sm disabled:opacity-30 active:scale-95 transition-transform"
            style={{ color: 'var(--accent-sky)', borderColor: 'var(--info-border)' }}
          >
            تحقق
          </button>
        )}
      </div>
      {!answer && (
        <p id="fill-blank-hint" className="text-[11px] font-['Tajawal']" dir="rtl" style={{ color: 'var(--text-tertiary)' }}>
          اكتبي الكلمة الناقصة فقط — لا تعيدي كتابة الجملة كاملة
        </p>
      )}

      {answer && answer.correct && (
        <p className="text-sm font-['Tajawal'] font-bold" dir="rtl" style={{ color: 'var(--success)' }}>
          {CORRECT_MSGS[Math.floor(Math.random() * CORRECT_MSGS.length)]}
        </p>
      )}

      {answer && !answer.correct && (
        <div className="grammar-explanation-bar text-xs" dir="rtl">
          <span className="font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>الإجابة الصحيحة: </span>
          <span className="font-semibold font-['Inter']" dir="ltr" style={{ color: 'var(--success)' }}>{item.correct_answer}</span>
        </div>
      )}
    </form>
  )
}
