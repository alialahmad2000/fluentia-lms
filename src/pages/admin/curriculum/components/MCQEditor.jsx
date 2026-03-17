import { Plus, Trash2 } from 'lucide-react'

export default function MCQEditor({ questions = [], onChange }) {
  const add = () => {
    onChange([...questions, {
      question_en: '', question_ar: '', question_type: 'DETAIL',
      section: 'mcq', choices: [{ text: '', is_correct: false }],
      correct_answer: '', explanation_en: '', explanation_ar: '',
    }])
  }

  const remove = (i) => onChange(questions.filter((_, idx) => idx !== i))

  const update = (i, field, val) => {
    const next = [...questions]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }

  const updateChoice = (qi, ci, field, val) => {
    const next = [...questions]
    const choices = [...next[qi].choices]
    if (field === 'is_correct') {
      choices.forEach((c, idx) => { c.is_correct = idx === ci })
    } else {
      choices[ci] = { ...choices[ci], [field]: val }
    }
    next[qi] = { ...next[qi], choices }
    onChange(next)
  }

  const addChoice = (qi) => {
    const next = [...questions]
    next[qi] = { ...next[qi], choices: [...(next[qi].choices || []), { text: '', is_correct: false }] }
    onChange(next)
  }

  const removeChoice = (qi, ci) => {
    const next = [...questions]
    next[qi] = { ...next[qi], choices: next[qi].choices.filter((_, idx) => idx !== ci) }
    onChange(next)
  }

  const questionTypes = ['GIST', 'DETAIL', 'INFERENCE', 'VOCABULARY', 'REFERENCE', 'PURPOSE', 'SEQUENCE', 'COMPARE', 'CAUSE_EFFECT', 'OPINION']

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => (
        <div
          key={qi}
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
              سؤال {qi + 1}
            </span>
            <button onClick={() => remove(qi)} className="p-1 rounded hover:bg-red-500/10" style={{ color: 'var(--text-muted)' }}>
              <Trash2 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select
              value={q.section || 'mcq'}
              onChange={e => update(qi, 'section', e.target.value)}
              className="px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            >
              <option value="mcq">MCQ</option>
              <option value="summary">Summary</option>
            </select>
            <select
              value={q.question_type || 'DETAIL'}
              onChange={e => update(qi, 'question_type', e.target.value)}
              className="px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            >
              {questionTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <input
            value={q.question_en || ''}
            onChange={e => update(qi, 'question_en', e.target.value)}
            placeholder="Question (English)"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={inputStyle}
          />
          <input
            value={q.question_ar || ''}
            onChange={e => update(qi, 'question_ar', e.target.value)}
            placeholder="السؤال (عربي)"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={inputStyle}
            dir="rtl"
          />

          {/* Choices */}
          <div className="space-y-2 mr-4">
            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>الخيارات:</span>
            {(q.choices || []).map((c, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`q-${qi}-correct`}
                  checked={c.is_correct}
                  onChange={() => updateChoice(qi, ci, 'is_correct', true)}
                  className="accent-emerald-500"
                />
                <input
                  value={c.text || ''}
                  onChange={e => updateChoice(qi, ci, 'text', e.target.value)}
                  placeholder={`خيار ${ci + 1}`}
                  className="flex-1 px-3 py-1.5 rounded-lg text-sm"
                  style={inputStyle}
                />
                <button onClick={() => removeChoice(qi, ci)} className="p-1 rounded hover:bg-red-500/10" style={{ color: 'var(--text-muted)' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addChoice(qi)}
              className="text-xs px-2 py-1 rounded"
              style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)' }}
            >
              + خيار
            </button>
          </div>

          <textarea
            value={q.explanation_en || ''}
            onChange={e => update(qi, 'explanation_en', e.target.value)}
            placeholder="Explanation (English)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none"
            style={inputStyle}
          />
        </div>
      ))}

      <button
        onClick={add}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px dashed rgba(255,255,255,0.12)',
          color: 'var(--text-secondary)',
          fontFamily: 'Tajawal',
        }}
      >
        <Plus size={14} />
        إضافة سؤال
      </button>
    </div>
  )
}
