import React from 'react'

/* ============================================================================
   Authentic IELTS question renderers — modeled on the real computer-delivered
   test: clinical sans-serif English body, the question number as a plain bold
   numeral at the inline-start (left), radios for MCQ, TRUE/FALSE/NOT GIVEN
   selectors, matching paragraph-pickers, inline gap-fills. Green is used only
   for the SELECTED state, nothing decorative. Cards carry a hairline + soft
   depth. Each card is LTR (English exam content); styled via --iel tokens.
   ========================================================================== */

const SANS = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
const NUM = { flex: 'none', fontWeight: 800, fontSize: 15, color: 'var(--iel-ink)', fontFamily: SANS, minWidth: 22, textAlign: 'right' }
const STEM = { margin: 0, fontSize: 15.5, color: 'var(--iel-ink)', fontFamily: SANS, lineHeight: 1.55, textAlign: 'left' }
const INSTR = { fontSize: 12.5, color: 'var(--iel-ink-3)', fontWeight: 600, margin: '0 0 6px', textAlign: 'left', fontFamily: SANS, fontStyle: 'italic' }

function normType(t) {
  const k = String(t || '').toLowerCase()
  if (k === 'mcq') return 'multiple_choice'
  if (k === 'tfng') return 'true_false_not_given'
  if (k === 'completion') return 'sentence_completion'
  return k
}
function stemText(q) { return q.question_text || q.statement || q.incomplete_sentence || q.sentence || q.text || q.question || '' }
function optionEntries(q) {
  const o = q.options
  if (!o) return []
  if (Array.isArray(o)) return o.map((v, i) => [String.fromCharCode(65 + i), typeof v === 'string' ? v.replace(/^[A-Z]:\s*/, '') : v])
  if (typeof o === 'object') return Object.entries(o)
  return []
}

/* Radio row (MCQ) — hover brightens the border, focus shows a ring, selected fills. */
function ChoiceRow({ label, text, selected, onClick }) {
  const [hover, setHover] = React.useState(false)
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 11, width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: SANS,
        padding: '10px 13px', borderRadius: 10,
        border: `1.5px solid ${selected ? 'var(--iel-accent)' : hover ? 'var(--iel-border-strong)' : 'var(--iel-border)'}`,
        background: selected ? 'var(--iel-accent-soft)' : hover ? 'var(--iel-surface-2)' : 'transparent', transition: 'border-color .12s, background .12s',
      }}>
      <span style={{ flex: 'none', width: 19, height: 19, borderRadius: '50%', marginTop: 1, border: `2px solid ${selected ? 'var(--iel-accent)' : 'var(--iel-ink-3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {selected && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--iel-accent)' }} />}
      </span>
      <span style={{ fontSize: 14.5, color: selected ? 'var(--iel-ink)' : 'var(--iel-ink-2)', lineHeight: 1.45 }}>
        <b style={{ color: 'var(--iel-ink)', marginRight: 7 }}>{label}</b>{text}
      </span>
    </button>
  )
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', gap: 0, border: '1.5px solid var(--iel-border)', borderRadius: 9, overflow: 'hidden' }}>
      {options.map((opt, i) => {
        const on = value === opt
        return (
          <button key={opt} type="button" onClick={() => onChange(opt)} style={{
            padding: '8px 16px', cursor: 'pointer', fontFamily: SANS, fontSize: 12.5, fontWeight: 700, letterSpacing: '.02em',
            borderInlineStart: i === 0 ? 0 : '1.5px solid var(--iel-border)',
            background: on ? 'var(--iel-accent)' : 'transparent', color: on ? '#fff' : 'var(--iel-ink-2)', transition: 'all .12s',
          }}>{opt}</button>
        )
      })}
    </div>
  )
}

function GapInput({ value, onChange, placeholder = 'Type your answer' }) {
  return (
    <input type="text" dir="ltr" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ minWidth: 170, maxWidth: '100%', padding: '8px 12px', borderRadius: 8, boxSizing: 'border-box',
        border: `1.5px solid ${value ? 'var(--iel-accent)' : 'var(--iel-border)'}`, background: 'var(--iel-surface-2)',
        color: 'var(--iel-ink)', fontSize: 14.5, fontFamily: SANS, outline: 'none' }} />
  )
}

export function ExamQuestion({ q, value, onChange, paragraphLetters = [], showInstruction = true }) {
  const type = normType(q.type)
  const num = q.question_number ?? q.number
  const stem = stemText(q)
  const instr = q.instruction

  const gapTypes = ['sentence_completion', 'summary_completion', 'note_completion', 'table_completion', 'form_completion', 'short_answer', 'note_table_flowchart']
  const isGap = gapTypes.includes(type)

  const wrap = {
    display: 'flex', flexDirection: 'column', gap: (instr && showInstruction) ? 8 : 0, padding: '15px 17px', borderRadius: 12, scrollMarginTop: 90, direction: 'ltr',
    border: `1px solid ${value ? 'color-mix(in srgb, var(--iel-accent) 38%, var(--iel-border))' : 'var(--iel-border)'}`,
    background: 'var(--iel-surface)', boxShadow: 'var(--iel-shadow-sm)',
  }
  const body = (extra) => (
    <>
      {instr && showInstruction && <p style={INSTR}>{instr}</p>}
      <div style={{ display: 'flex', gap: 12, alignItems: isGap ? 'baseline' : 'flex-start' }}>
        <span style={NUM}>{num}</span>
        <div style={{ flex: 1, minWidth: 0 }}>{extra}</div>
      </div>
    </>
  )

  if (type === 'multiple_choice') {
    const opts = optionEntries(q)
    return (
      <div style={wrap} data-q={num}>{body(
        <>
          <p style={{ ...STEM, marginBottom: 10 }}>{stem}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {opts.map(([k, t]) => <ChoiceRow key={k} label={k} text={t} selected={value === k} onClick={() => onChange(k)} />)}
          </div>
        </>
      )}</div>
    )
  }

  if (type === 'true_false_not_given' || type === 'yes_no_not_given') {
    const opts = type === 'true_false_not_given' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN']
    return (
      <div style={wrap} data-q={num}>{body(
        <>
          <p style={{ ...STEM, marginBottom: 11 }}>{stem}</p>
          <Segmented options={opts} value={value} onChange={onChange} />
        </>
      )}</div>
    )
  }

  if (type.startsWith('matching')) {
    const opts = optionEntries(q)
    const letters = opts.length ? opts.map(([k]) => k) : (paragraphLetters.length ? paragraphLetters : ['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    return (
      <div style={wrap} data-q={num}>{body(
        <>
          <p style={{ ...STEM, marginBottom: 11 }}>{stem}</p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {letters.map((L) => {
              const on = value === L
              return <button key={L} type="button" onClick={() => onChange(L)} style={{ width: 38, height: 38, borderRadius: 9, cursor: 'pointer', fontFamily: SANS, fontWeight: 800, fontSize: 14, border: `1.5px solid ${on ? 'var(--iel-accent)' : 'var(--iel-border)'}`, background: on ? 'var(--iel-accent)' : 'transparent', color: on ? '#fff' : 'var(--iel-ink-2)', transition: 'all .12s' }}>{L}</button>
            })}
          </div>
          {opts.length > 2 && (
            <div style={{ marginTop: 9 }}>
              {opts.map(([k, t]) => <div key={k} style={{ fontSize: 13, color: 'var(--iel-ink-3)', lineHeight: 1.7, fontFamily: SANS }}><b style={{ color: 'var(--iel-ink-2)' }}>{k}</b> &nbsp;{t}</div>)}
            </div>
          )}
        </>
      )}</div>
    )
  }

  if (isGap) {
    const parts = stem.split(/_{2,}|\.{3,}|\[.*?\]/)
    return (
      <div style={wrap} data-q={num}>{body(
        parts.length > 1 ? (
          <p style={{ ...STEM }}>
            {parts[0]}<span style={{ display: 'inline-flex', verticalAlign: 'middle', margin: '0 5px' }}><GapInput value={value} onChange={onChange} /></span>{parts.slice(1).join(' ')}
          </p>
        ) : (
          <>
            <p style={{ ...STEM, marginBottom: 11 }}>{stem}</p>
            <GapInput value={value} onChange={onChange} />
          </>
        )
      )}</div>
    )
  }

  return (
    <div style={wrap} data-q={num}>{body(<><p style={{ ...STEM, marginBottom: 11 }}>{stem}</p><GapInput value={value} onChange={onChange} /></>)}</div>
  )
}

export function QuestionGroupInstruction({ children }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--iel-panel)', border: '1px solid var(--iel-border)', marginBottom: 4 }}>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--iel-ink-2)', fontWeight: 600, textAlign: 'left', lineHeight: 1.6, fontFamily: SANS, fontStyle: 'italic' }}>{children}</p>
    </div>
  )
}
