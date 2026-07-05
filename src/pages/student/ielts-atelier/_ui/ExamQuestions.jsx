import React from 'react'

/* ============================================================================
   Authentic IELTS question renderers. Each question type draws in the control
   the real computer-delivered exam uses: MCQ radios, TRUE/FALSE/NOT GIVEN
   selectors, matching paragraph-pickers, inline gap-fills. English content is
   LTR; the Arabic instruction chrome is RTL. Styled through --iel tokens.
   ========================================================================== */

const QNUM = { flex: 'none', minWidth: 30, height: 30, borderRadius: 8, background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13.5, fontFamily: "'Tajawal', sans-serif" }
const STEM = { margin: 0, fontSize: 15, color: 'var(--iel-ink)', fontFamily: "'Source Serif 4', Georgia, serif", lineHeight: 1.6, direction: 'ltr', textAlign: 'left', flex: 1 }
const INSTR = { fontSize: 12, color: 'var(--iel-ink-3)', fontWeight: 700, margin: '0 0 4px', direction: 'ltr', textAlign: 'left', letterSpacing: '.01em' }

function normType(t) {
  const k = String(t || '').toLowerCase()
  if (k === 'mcq') return 'multiple_choice'
  if (k === 'tfng') return 'true_false_not_given'
  if (k === 'completion') return 'sentence_completion'
  return k
}
function stemText(q) {
  return q.question_text || q.statement || q.incomplete_sentence || q.sentence || q.text || q.question || ''
}
function optionEntries(q) {
  const o = q.options
  if (!o) return []
  if (Array.isArray(o)) return o.map((v, i) => [String.fromCharCode(65 + i), typeof v === 'string' ? v.replace(/^[A-Z]:\s*/, '') : v])
  if (typeof o === 'object') return Object.entries(o)
  return []
}

/* Radio row (MCQ) */
function ChoiceRow({ label, text, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'flex-start', gap: 11, width: '100%', textAlign: 'left', direction: 'ltr', cursor: 'pointer',
      padding: '10px 13px', borderRadius: 11, fontFamily: "'Source Serif 4', Georgia, serif",
      border: `1.5px solid ${selected ? 'var(--iel-accent)' : 'var(--iel-border)'}`,
      background: selected ? 'var(--iel-accent-soft)' : 'transparent', transition: 'border-color .12s, background .12s',
    }}>
      <span style={{ flex: 'none', width: 20, height: 20, borderRadius: '50%', marginTop: 1, border: `2px solid ${selected ? 'var(--iel-accent)' : 'var(--iel-ink-3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {selected && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--iel-accent)' }} />}
      </span>
      <span style={{ fontSize: 14, color: selected ? 'var(--iel-ink)' : 'var(--iel-ink-2)', lineHeight: 1.5 }}>
        <b style={{ color: 'var(--iel-ink)', marginInlineEnd: 6 }}>{label}</b>{text}
      </span>
    </button>
  )
}

/* Segmented selector (TFNG / YNNG) */
function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const on = value === opt
        return (
          <button key={opt} type="button" onClick={() => onChange(opt)} style={{
            padding: '8px 15px', borderRadius: 9, cursor: 'pointer', fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
            fontSize: 12.5, fontWeight: 700, letterSpacing: '.02em', direction: 'ltr',
            border: `1.5px solid ${on ? 'var(--iel-accent)' : 'var(--iel-border)'}`,
            background: on ? 'var(--iel-accent)' : 'transparent', color: on ? '#fff' : 'var(--iel-ink-2)',
            transition: 'all .12s',
          }}>{opt}</button>
        )
      })}
    </div>
  )
}

function GapInput({ value, onChange, placeholder = '…' }) {
  return (
    <input type="text" dir="ltr" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ minWidth: 160, maxWidth: '100%', padding: '8px 12px', borderRadius: 9, boxSizing: 'border-box',
        border: `1.5px solid ${value ? 'var(--iel-accent)' : 'var(--iel-border)'}`, background: 'var(--iel-surface-2)',
        color: 'var(--iel-ink)', fontSize: 14, fontFamily: "'IBM Plex Sans', system-ui, sans-serif", outline: 'none', direction: 'ltr' }} />
  )
}

export function ExamQuestion({ q, value, onChange, paragraphLetters = [] }) {
  const type = normType(q.type)
  const num = q.question_number ?? q.number
  const stem = stemText(q)
  const instr = q.instruction

  // Inline gap-fill: split the stem on the blank and place the input inline.
  const gapTypes = ['sentence_completion', 'summary_completion', 'note_completion', 'table_completion', 'form_completion', 'short_answer', 'note_table_flowchart']
  const isGap = gapTypes.includes(type)

  const wrap = { display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', borderRadius: 13, scrollMarginTop: 90,
    border: `1px solid ${value ? 'color-mix(in srgb, var(--iel-accent) 40%, var(--iel-border))' : 'var(--iel-border)'}`,
    background: 'var(--iel-surface)' }

  const header = (extra) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={QNUM}>{num}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {instr && <p style={INSTR}>{instr}</p>}
        {extra}
      </div>
    </div>
  )

  if (type === 'multiple_choice') {
    const opts = optionEntries(q)
    return (
      <div style={wrap} data-q={num}>
        {header(<p style={{ ...STEM, flex: 'unset' }}>{stem}</p>)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingInlineStart: 42 }}>
          {opts.map(([k, t]) => <ChoiceRow key={k} label={k} text={t} selected={value === k} onClick={() => onChange(k)} />)}
        </div>
      </div>
    )
  }

  if (type === 'true_false_not_given' || type === 'yes_no_not_given') {
    const opts = type === 'true_false_not_given' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN']
    return (
      <div style={wrap} data-q={num}>
        {header(<p style={{ ...STEM, flex: 'unset', marginBottom: 10 }}>{stem}</p>)}
        <div style={{ paddingInlineStart: 42 }}><Segmented options={opts} value={value} onChange={onChange} /></div>
      </div>
    )
  }

  if (type === 'matching_information' || type === 'matching_headings' || type === 'matching_features' || type === 'matching_sentence_endings') {
    const opts = optionEntries(q)
    const letters = opts.length ? opts.map(([k]) => k) : (paragraphLetters.length ? paragraphLetters : ['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    return (
      <div style={wrap} data-q={num}>
        {header(<p style={{ ...STEM, flex: 'unset', marginBottom: 10 }}>{stem}</p>)}
        <div style={{ paddingInlineStart: 42, display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          {opts.length > 0 && opts.length <= 2 ? null : null}
          {letters.map((L) => {
            const on = value === L
            return <button key={L} type="button" onClick={() => onChange(L)} style={{
              width: 38, height: 38, borderRadius: 9, cursor: 'pointer', fontFamily: "'IBM Plex Sans', system-ui, sans-serif", fontWeight: 800, fontSize: 14,
              border: `1.5px solid ${on ? 'var(--iel-accent)' : 'var(--iel-border)'}`, background: on ? 'var(--iel-accent)' : 'transparent', color: on ? '#fff' : 'var(--iel-ink-2)', transition: 'all .12s' }}>{L}</button>
          })}
        </div>
        {opts.length > 2 && (
          <div style={{ paddingInlineStart: 42, marginTop: 4, direction: 'ltr' }}>
            {opts.map(([k, t]) => <div key={k} style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', lineHeight: 1.7, textAlign: 'left' }}><b style={{ color: 'var(--iel-ink-2)' }}>{k}</b> — {t}</div>)}
          </div>
        )}
      </div>
    )
  }

  if (isGap) {
    // If the stem contains a blank marker, render input inline; else stem then input.
    const parts = stem.split(/_{2,}|\.{3,}|\[.*?\]/)
    return (
      <div style={wrap} data-q={num}>
        {header(
          parts.length > 1 ? (
            <p style={{ ...STEM, flex: 'unset', display: 'block' }}>
              {parts[0]}<span style={{ display: 'inline-flex', verticalAlign: 'middle', margin: '0 4px' }}><GapInput value={value} onChange={onChange} /></span>{parts.slice(1).join(' ')}
            </p>
          ) : (
            <>
              <p style={{ ...STEM, flex: 'unset', marginBottom: 10 }}>{stem}</p>
              <div style={{ paddingInlineStart: 0 }}><GapInput value={value} onChange={onChange} placeholder="Your answer…" /></div>
            </>
          )
        )}
      </div>
    )
  }

  // Fallback (unclassified): stem + text input
  return (
    <div style={wrap} data-q={num}>
      {header(<><p style={{ ...STEM, flex: 'unset', marginBottom: 10 }}>{stem}</p><GapInput value={value} onChange={onChange} placeholder="Your answer…" /></>)}
    </div>
  )
}

/* A shared instruction banner shown once above a group of same-type questions. */
export function QuestionGroupInstruction({ children }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--iel-panel)', border: '1px solid var(--iel-border)', marginBottom: 4 }}>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--iel-ink-2)', fontWeight: 700, direction: 'ltr', textAlign: 'left', lineHeight: 1.6 }}>{children}</p>
    </div>
  )
}
