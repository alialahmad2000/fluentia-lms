import { useState } from 'react'
import { validateAnswer } from '../../../utils/answerValidator'

export default function TransformQuestion({ item, answer, onAnswer, exerciseType }) {
  const [input, setInput] = useState('')
  const acceptedAnswers = item.accepted_answers || [item.correct_answer]
  const placeholder = exerciseType === 'make_question'
    ? 'Type your question here...'
    : 'Type the transformed sentence...'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (answer || !input.trim()) return
    const correct = validateAnswer(input.trim(), acceptedAnswers, {
      originalSentence: item.question,
      allowPartial: true,
    })
    onAnswer({ selected: input.trim(), correct })
  }

  let inputCls = 'grammar-input w-full font-[\'Inter\'] resize-none leading-relaxed'
  if (answer?.correct) inputCls += ' grammar-input--correct'
  else if (answer && !answer.correct) inputCls += ' grammar-input--wrong'

  return (
    <form onSubmit={handleSubmit} className="space-y-3" dir="ltr">
      <textarea
        value={answer ? answer.selected : input}
        onChange={e => setInput(e.target.value)}
        disabled={!!answer}
        placeholder={placeholder}
        rows={2}
        className={inputCls}
      />
      {!answer && (
        <button
          type="submit"
          disabled={!input.trim()}
          className="grammar-option px-5 w-auto inline-flex font-['Tajawal'] font-bold text-sm disabled:opacity-30"
          style={{ color: 'var(--accent-sky)', borderColor: 'var(--info-border)' }}
        >
          تحقق
        </button>
      )}

      {answer && answer.correct && (
        <p className="text-sm font-['Tajawal'] font-medium" dir="rtl" style={{ color: 'var(--success)' }}>أحسنت! ✨</p>
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
