import { useState, useRef } from 'react'
import { validateAnswer } from '../../../utils/answerValidator'

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
            className="grammar-option px-5 font-['Tajawal'] font-bold text-sm text-sky-400 border-sky-500/30 hover:bg-sky-500/10 disabled:opacity-30"
          >
            تحقق
          </button>
        )}
      </div>
      {!answer && (
        <p id="fill-blank-hint" className="text-[11px] text-white/25 font-['Tajawal']" dir="rtl">
          اكتب الكلمة الناقصة فقط — لا تعيد كتابة الجملة كاملة
        </p>
      )}

      {answer && answer.correct && (
        <p className="text-sm text-emerald-400 font-['Tajawal'] font-medium">أحسنت! ✨</p>
      )}

      {answer && !answer.correct && (
        <div className="grammar-explanation-bar text-xs" dir="rtl">
          <span className="text-white/40 font-['Tajawal']">الإجابة الصحيحة: </span>
          <span className="text-emerald-400 font-semibold font-['Inter']" dir="ltr">{item.correct_answer}</span>
        </div>
      )}
    </form>
  )
}
