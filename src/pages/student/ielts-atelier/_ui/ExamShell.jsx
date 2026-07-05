import React from 'react'

/* ============================================================================
   Full-screen IELTS exam chrome — a fixed overlay that takes over the viewport
   (no app nav, no distractions) like the real computer-delivered test.
   Top bar: brand + section + live timer + finish. Bottom: question palette.
   The body (split passage/questions, audio, editor) is passed as children.
   ========================================================================== */

function fmt(s) {
  const v = Math.max(0, Math.floor(s || 0))
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`
}

export function ExamShell({ sectionLabel, partLabel, secsLeft, onSubmit, submitting, footer, children }) {
  const urgent = secsLeft != null && secsLeft < 600
  const critical = secsLeft != null && secsLeft < 120
  React.useEffect(() => {
    document.body.classList.add('ielts-exam')
    return () => document.body.classList.remove('ielts-exam')
  }, [])
  return (
    <div className="iel-root" dir="rtl" style={{ position: 'fixed', inset: 0, zIndex: 130, background: 'var(--iel-ground)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ flex: 'none', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '0 20px', background: 'var(--iel-panel)', borderBottom: '1px solid var(--iel-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--iel-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flex: 'none' }}>ط</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>{sectionLabel}</div>
            {partLabel && <div className="iel-exam-part" style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', fontWeight: 600, direction: 'ltr', textAlign: 'right' }}>{partLabel}</div>}
          </div>
        </div>
        {secsLeft != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 10, flexShrink: 0, background: critical ? 'color-mix(in srgb, var(--iel-bad) 16%, transparent)' : urgent ? 'color-mix(in srgb, var(--iel-warn) 14%, transparent)' : 'var(--iel-surface)', border: `1px solid ${critical ? 'color-mix(in srgb, var(--iel-bad) 40%, transparent)' : urgent ? 'color-mix(in srgb, var(--iel-warn) 34%, transparent)' : 'var(--iel-border)'}` }}>
            <span className="iel-exam-tlabel" style={{ fontSize: 11, fontWeight: 700, color: 'var(--iel-ink-3)', whiteSpace: 'nowrap' }}>الوقت المتبقّي</span>
            <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontFamily: "'IBM Plex Mono', monospace", color: critical ? 'var(--iel-bad)' : urgent ? 'var(--iel-warn)' : 'var(--iel-ink)' }}>{fmt(secsLeft)}</span>
          </div>
        )}
        <button onClick={onSubmit} disabled={submitting} style={{ flex: 'none', padding: '9px 20px', borderRadius: 10, border: 0, background: 'var(--iel-accent)', color: '#fff', fontSize: 13.5, fontWeight: 800, fontFamily: "'Tajawal', sans-serif", cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>{submitting ? 'جارٍ…' : 'إنهاء القسم'}</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>

      {/* Bottom palette */}
      {footer && (
        <div style={{ flex: 'none', minHeight: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px', background: 'var(--iel-panel)', borderTop: '1px solid var(--iel-border)', overflowX: 'auto' }}>
          {footer}
        </div>
      )}
    </div>
  )
}

/* Numbered question palette — answered (filled), current (ring), else outline. */
export function QuestionPalette({ groups, answered, onJump, current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', minWidth: 0 }}>
      {groups.map((g, gi) => (
        <div key={gi} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--iel-ink-3)', whiteSpace: 'nowrap' }}>{g.label}</span>
          <div style={{ display: 'flex', gap: 5 }}>
            {g.numbers.map((n) => {
              const on = answered.has(`${gi}_${n}`)
              const cur = current === `${gi}_${n}`
              return (
                <button key={n} onClick={() => onJump(gi, n)} title={`سؤال ${n}`} style={{
                  width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, flex: 'none',
                  fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
                  border: `1.5px solid ${cur ? 'var(--iel-accent)' : on ? 'transparent' : 'var(--iel-border)'}`,
                  background: on ? 'var(--iel-accent)' : cur ? 'var(--iel-accent-soft)' : 'transparent',
                  color: on ? '#fff' : cur ? 'var(--iel-accent-ink)' : 'var(--iel-ink-3)', transition: 'all .12s',
                }}>{n}</button>
              )
            })}
          </div>
          {gi < groups.length - 1 && <span style={{ color: 'var(--iel-ink-3)', opacity: .4 }}>·</span>}
        </div>
      ))}
    </div>
  )
}
