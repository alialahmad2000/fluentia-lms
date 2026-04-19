import { CheckCircle, XCircle } from 'lucide-react'

const INPUT_STYLE = {
  width: '100%', padding: '8px 12px', borderRadius: 9, fontSize: 13,
  background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)',
  border: '1px solid rgba(255,255,255,0.12)', outline: 'none',
  direction: 'ltr', boxSizing: 'border-box', fontFamily: 'sans-serif',
}

const COMPLETION_TYPES = new Set([
  'form_completion', 'sentence_completion', 'note_completion',
  'summary_completion', 'completion', 'short_answer',
  'table_completion', 'note_table_flowchart', 'diagram_label', 'diagram_labelling',
])

const MCQ_TYPES = new Set(['mcq', 'multiple_choice', 'multiple_choice_multiple_answers'])
const MATCHING_TYPES = new Set(['matching', 'matching_information', 'matching_features', 'matching_headings', 'matching_sentence_endings', 'list_selection', 'paragraph_matching'])
const TFNG_TYPES = new Set(['true_false_not_given', 'tfng'])
const YNNG_TYPES = new Set(['yes_no_not_given'])

function OptionButton({ label, value, selected, correct, wrong, disabled, onClick }) {
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      style={{
        padding: '8px 12px', borderRadius: 9, textAlign: 'left', fontSize: 13,
        cursor: disabled ? 'default' : 'pointer', display: 'block', width: '100%',
        background: correct ? 'rgba(74,222,128,0.15)' : wrong ? 'rgba(239,68,68,0.1)' : selected ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.03)',
        color: correct ? '#4ade80' : wrong ? '#ef4444' : selected ? '#38bdf8' : 'var(--text-secondary)',
        border: correct ? '1.5px solid rgba(74,222,128,0.4)' : wrong ? '1.5px solid rgba(239,68,68,0.3)' : selected ? '1.5px solid rgba(56,189,248,0.35)' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {label && <strong>{label} </strong>}{value}
    </button>
  )
}

/**
 * Renders a single IELTS question for student interaction.
 *
 * Props:
 *   q            – question object (type, text/question_text/statement, options, number/question_number)
 *   qKey         – string key for answers state (String(q.number ?? q.question_number))
 *   answer       – current student answer (string)
 *   onChange(val)– callback with new string value
 *   disabled     – locks all inputs (post-submit)
 *   feedback     – { isCorrect, expected, explanation } from gradeResult (post-submit)
 */
export default function QuestionRenderer({ q, qKey, answer, onChange, disabled, feedback }) {
  const qType = q.type || q.question_type || ''
  const qText = q.question_text || q.text || q.statement || q.stem || ''
  const options = Array.isArray(q.options) ? q.options : []
  const isCorrect = feedback?.isCorrect
  const expected = feedback?.expected

  const renderFeedback = () => {
    if (!feedback) return null
    return (
      <div style={{ marginTop: 6 }}>
        {feedback.isCorrect
          ? <span style={{ fontSize: 11, color: '#4ade80', fontFamily: 'Tajawal' }}>✓ إجابة صحيحة</span>
          : (
            <div>
              <span style={{ fontSize: 11, color: '#ef4444', fontFamily: 'Tajawal' }}>
                ✗ الإجابة الصحيحة: <strong style={{ direction: 'ltr', display: 'inline-block' }}>{expected}</strong>
              </span>
              {feedback.explanation && (
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, direction: 'ltr', fontStyle: 'italic' }}>
                  💡 {feedback.explanation}
                </p>
              )}
            </div>
          )
        }
      </div>
    )
  }

  // ── MCQ / Matching — radio buttons ──────────────────────────
  if (MCQ_TYPES.has(qType) || MATCHING_TYPES.has(qType) || (options.length >= 2 && !TFNG_TYPES.has(qType) && !YNNG_TYPES.has(qType))) {
    const labels = options.every(o => /^[A-E]$/.test(String(o).trim())) ? null : null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {options.map((opt, idx) => {
          const optVal = String(opt)
          const selected = answer === optVal
          const isRight = disabled && feedback && expected === optVal
          const isWrong = disabled && selected && !isCorrect
          return (
            <OptionButton
              key={idx}
              label={options.length === 4 && options.every(o => /^[A-E]$/.test(String(o).trim())) ? null : `${String.fromCharCode(65 + idx)}.`}
              value={optVal}
              selected={selected}
              correct={isRight}
              wrong={isWrong}
              disabled={disabled}
              onClick={() => onChange(optVal)}
            />
          )
        })}
        {renderFeedback()}
      </div>
    )
  }

  // ── True/False/Not Given ─────────────────────────────────────
  if (TFNG_TYPES.has(qType)) {
    const tfOpts = ['True', 'False', 'Not Given']
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tfOpts.map(opt => {
          const selected = answer?.toLowerCase() === opt.toLowerCase()
          const isRight = disabled && feedback && expected?.toLowerCase() === opt.toLowerCase()
          const isWrong = disabled && selected && !isCorrect
          return (
            <OptionButton key={opt} value={opt} selected={selected} correct={isRight} wrong={isWrong} disabled={disabled} onClick={() => onChange(opt)} />
          )
        })}
        {renderFeedback()}
      </div>
    )
  }

  // ── Yes/No/Not Given ─────────────────────────────────────────
  if (YNNG_TYPES.has(qType)) {
    const ynOpts = ['Yes', 'No', 'Not Given']
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ynOpts.map(opt => {
          const selected = answer?.toLowerCase() === opt.toLowerCase()
          const isRight = disabled && feedback && expected?.toLowerCase() === opt.toLowerCase()
          const isWrong = disabled && selected && !isCorrect
          return (
            <OptionButton key={opt} value={opt} selected={selected} correct={isRight} wrong={isWrong} disabled={disabled} onClick={() => onChange(opt)} />
          )
        })}
        {renderFeedback()}
      </div>
    )
  }

  // ── Completion / Short answer / Fallback — text input ────────
  const inputBorder = disabled
    ? isCorrect != null
      ? isCorrect ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(239,68,68,0.4)'
      : '1px solid rgba(255,255,255,0.12)'
    : '1px solid rgba(255,255,255,0.12)'

  return (
    <div>
      <input
        value={answer || ''}
        onChange={e => !disabled && onChange(e.target.value)}
        disabled={disabled}
        placeholder="اكتب إجابتك..."
        style={{ ...INPUT_STYLE, border: inputBorder }}
      />
      {renderFeedback()}
    </div>
  )
}
