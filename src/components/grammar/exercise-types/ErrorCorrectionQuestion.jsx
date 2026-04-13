import { useState } from 'react'
import { validateAnswer } from '../../../utils/answerValidator'

export default function ErrorCorrectionQuestion({ item, answer, onAnswer }) {
  const [input, setInput] = useState('')
  const acceptedAnswers = item.accepted_answers || [item.correct_answer]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (answer || !input.trim()) return
    const correct = validateAnswer(input.trim(), acceptedAnswers, {
      originalSentence: item.question,
      allowPartial: true,
    })
    onAnswer({ selected: input.trim(), correct })
  }

  let inputCls = 'grammar-input w-full font-[\'Inter\']'
  if (answer?.correct) inputCls += ' grammar-input--correct'
  else if (answer && !answer.correct) inputCls += ' grammar-input--wrong'

  return (
    <form onSubmit={handleSubmit} className="space-y-3" dir="ltr">
      <p className="text-xs text-white/30 font-['Tajawal']" dir="rtl">اكتب الجملة الصحيحة:</p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={answer ? answer.selected : input}
          onChange={e => setInput(e.target.value)}
          disabled={!!answer}
          placeholder="Type the corrected sentence..."
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
