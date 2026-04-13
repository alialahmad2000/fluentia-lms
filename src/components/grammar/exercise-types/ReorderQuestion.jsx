import { useState } from 'react'
import { validateAnswer } from '../../../utils/answerValidator'

export default function ReorderQuestion({ item, answer, onAnswer }) {
  const [selected, setSelected] = useState([])
  const [available, setAvailable] = useState(item.options || [])

  const handleWordClick = (word) => {
    if (answer) return
    setSelected(prev => [...prev, word])
    setAvailable(prev => {
      const idx = prev.indexOf(word)
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
    })
  }

  const handleSelectedClick = (idx) => {
    if (answer) return
    const word = selected[idx]
    setAvailable(prev => [...prev, word])
    setSelected(prev => [...prev.slice(0, idx), ...prev.slice(idx + 1)])
  }

  const handleCheck = () => {
    if (answer || selected.length === 0) return
    const builtSentence = selected.join(' ')
    const acceptedAnswers = item.accepted_answers || [item.correct_answer]
    const correct = validateAnswer(builtSentence, acceptedAnswers)
    onAnswer({ selected: builtSentence, correct })
  }

  return (
    <div className="space-y-3" dir="ltr">
      {/* Answer area */}
      <div
        className={`min-h-[48px] rounded-xl px-3 py-2.5 flex flex-wrap gap-2 border transition-colors ${
          answer?.correct
            ? 'bg-emerald-500/8 border-emerald-500/30'
            : answer && !answer.correct
              ? 'bg-rose-500/8 border-rose-500/30'
              : 'bg-white/[0.02] border-white/[0.06] border-dashed'
        }`}
      >
        {selected.length === 0 && !answer && (
          <span className="text-xs text-white/20 py-1.5 font-['Tajawal']" dir="rtl">اضغط على الكلمات لترتيبها...</span>
        )}
        {selected.map((w, i) => (
          <button
            key={i}
            onClick={() => handleSelectedClick(i)}
            disabled={!!answer}
            className={`grammar-chip grammar-chip--selected ${answer?.correct ? '!text-emerald-400 !border-emerald-500/40' : ''} ${answer && !answer.correct ? '!text-rose-400 !border-rose-500/40' : ''}`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Available words */}
      {!answer && (
        <div className="flex flex-wrap gap-2">
          {available.map((w, i) => (
            <button key={i} onClick={() => handleWordClick(w)} className="grammar-chip">
              {w}
            </button>
          ))}
        </div>
      )}

      {/* Check button */}
      {!answer && selected.length > 0 && (
        <button
          onClick={handleCheck}
          className="grammar-option px-5 w-auto inline-flex font-['Tajawal'] font-bold text-sm text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
        >
          تحقق
        </button>
      )}

      {answer && answer.correct && (
        <p className="text-sm text-emerald-400 font-['Tajawal'] font-medium" dir="rtl">أحسنت! ✨</p>
      )}

      {answer && !answer.correct && (
        <div className="grammar-explanation-bar text-xs" dir="rtl">
          <span className="text-white/40 font-['Tajawal']">الإجابة الصحيحة: </span>
          <span className="text-emerald-400 font-semibold font-['Inter']" dir="ltr">{item.correct_answer}</span>
        </div>
      )}
    </div>
  )
}
