// Self-contained comprehension quiz: shuffles options (kills position bias), instant
// per-question feedback + explanation, reports final % score once all are answered.
// Mirrors BizQuiz. «نتيجتك» is the plain form — reads correctly for both genders.
import { useMemo, useState, useEffect, useRef } from 'react'
import { Check, X } from 'lucide-react'

function shuffle(arr, seed) {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function EnvQuiz({ questions = [], accent = '#22c55e', onScore }) {
  const [answers, setAnswers] = useState({}) // qIndex -> selected text
  const reported = useRef(false)

  const shuffled = useMemo(
    () => questions.map((q, i) => shuffle(q.options || [], i * 7 + 3)),
    [questions]
  )

  const total = questions.length
  const answeredCount = Object.keys(answers).length
  const correctCount = questions.reduce((n, q, i) => n + (answers[i] === q.correct ? 1 : 0), 0)

  useEffect(() => {
    if (total > 0 && answeredCount === total && !reported.current) {
      reported.current = true
      onScore?.(Math.round((correctCount / total) * 100))
    }
  }, [answeredCount, total, correctCount, onScore])

  return (
    <div className="tt-quiz">
      {questions.map((q, qi) => {
        const picked = answers[qi]
        const locked = picked != null
        return (
          <div className="tt-q" key={qi}>
            <div className="tt-q-text">{qi + 1}. {q.question}</div>
            {shuffled[qi].map((opt, oi) => {
              const isPicked = picked === opt
              const isCorrect = opt === q.correct
              let cls = 'tt-opt'
              if (locked && isCorrect) cls += ' is-correct'
              else if (locked && isPicked && !isCorrect) cls += ' is-wrong'
              return (
                <button key={oi} className={cls} disabled={locked}
                  onClick={() => !locked && setAnswers((a) => ({ ...a, [qi]: opt }))}>
                  <span className="tt-opt-letter">{String.fromCharCode(65 + oi)}</span>
                  <span style={{ flex: 1 }}>{opt}</span>
                  {locked && isCorrect && <Check size={18} style={{ color: '#4ade80', flexShrink: 0 }} />}
                  {locked && isPicked && !isCorrect && <X size={18} style={{ color: '#f87171', flexShrink: 0 }} />}
                </button>
              )
            })}
            {locked && q.explanation_ar && <p className="tt-explain">{q.explanation_ar}</p>}
          </div>
        )
      })}
      {total > 0 && (
        <div style={{ fontSize: 14, color: 'var(--ds-text-tertiary)', textAlign: 'center', marginTop: 6 }}>
          {answeredCount === total
            ? <span style={{ color: accent, fontWeight: 700 }}>نتيجتك: {Math.round((correctCount / total) * 100)}% ({correctCount}/{total})</span>
            : `${answeredCount}/${total}`}
        </div>
      )}
    </div>
  )
}
