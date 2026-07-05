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

export function ExamShell({ sectionLabel, partLabel, secsLeft, onSubmit, submitting, footer, children, submitLabel = 'إنهاء القسم', showSubmit = true }) {
  const urgent = secsLeft != null && secsLeft < 600
  const critical = secsLeft != null && secsLeft < 120
  const [confirming, setConfirming] = React.useState(false)
  React.useEffect(() => {
    document.body.classList.add('ielts-exam')
    return () => document.body.classList.remove('ielts-exam')
  }, [])
  return (
    <div className="iel-root iel-exam-clinical" dir="rtl" style={{ position: 'fixed', inset: 0, zIndex: 10050, background: 'var(--iel-ground)', display: 'flex', flexDirection: 'column' }}>
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
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>

      {/* Confirm end */}
      {confirming && (
        <div onClick={() => setConfirming(false)} style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--iel-surface)', border: '1px solid var(--iel-border)', borderRadius: 16, boxShadow: 'var(--iel-shadow)', padding: '24px 26px', maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--iel-ink)', margin: '0 0 8px' }}>إنهاء هذا القسم؟</h3>
            <p style={{ fontSize: 13.5, color: 'var(--iel-ink-3)', margin: '0 0 20px', lineHeight: 1.7 }}>لن تتمكن من العودة إليه بعد الإنهاء.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirming(false)} style={{ padding: '11px 22px', borderRadius: 10, border: '1.5px solid var(--iel-border)', background: 'transparent', color: 'var(--iel-ink-2)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>متابعة الحلّ</button>
              <button onClick={() => { setConfirming(false); onSubmit?.() }} style={{ padding: '11px 22px', borderRadius: 10, border: 0, background: 'var(--iel-accent)', color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>إنهاء القسم</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar: palette (scrolls) + the always-visible primary forward action */}
      {(footer || onSubmit) && (
        <div style={{ flex: 'none', minHeight: 62, display: 'flex', alignItems: 'center', gap: 14, padding: '9px 20px', background: 'var(--iel-panel)', borderTop: '1px solid var(--iel-border)' }}>
          <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>{footer}</div>
          {onSubmit && showSubmit && (
            <button onClick={() => setConfirming(true)} disabled={submitting} style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 11, border: 0, background: submitting ? 'var(--iel-ink-3)' : 'var(--iel-accent)', color: '#fff', fontSize: 14.5, fontWeight: 800, fontFamily: "'Tajawal', sans-serif", cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: submitting ? 'none' : 'var(--iel-shadow-sm)', whiteSpace: 'nowrap' }}>
              {submitting ? 'جارٍ…' : <>{submitLabel} <span style={{ fontSize: 16, lineHeight: 1 }}>←</span></>}
            </button>
          )}
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
