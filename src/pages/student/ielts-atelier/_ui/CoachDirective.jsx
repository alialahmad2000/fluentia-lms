import React from 'react'
import { PrimaryButton, Icon } from './primitives'

// ── The Coach Directive — the guide's heartbeat ──────────────────────────────
// One warm, prominent "do this now" card driven by generatePlan's
// next_recommended_action, with today's balanced-rotation tasks beneath.
// This is the single most important thing on the Overview: it always answers
// "what do I do right now?" while the rest of the account stays free to explore.

const SKILL_ROUTE = {
  diagnostic: 'diagnostic', errors: 'errors', mock: 'mock',
  reading: 'reading', listening: 'listening', writing: 'writing', speaking: 'speaking',
}
const TASK_META = {
  reading: 'قراءة', listening: 'استماع', writing: 'كتابة', speaking: 'محادثة',
  errors: 'مراجعة', mock: 'محاكاة', vocab: 'مفردات',
}

function resolveRoute(action, weakest) {
  let s = action?.skill_type || ''
  if (!s || s.includes('$')) s = weakest || 'reading'
  return SKILL_ROUTE[s] || 'reading'
}

export default function CoachDirective({ action, todayTasks = [], weakest, onGo }) {
  if (!action) return null
  const route = resolveRoute(action, weakest)
  const title = action.title_ar || 'تابع تدريبك اليومي'
  const subtitle = action.subtitle_ar || ''
  const reason = action.reason_ar || ''
  const cta = action.cta_ar || 'ابدأ الآن'

  // today's rotation, de-duplicated by task_type, excluding the primary directive skill
  const seen = new Set()
  const chips = []
  for (const t of todayTasks) {
    const k = t?.task_type
    if (!k || seen.has(k)) continue
    seen.add(k); chips.push(t)
  }

  return (
    <div className="iel-coach" dir="rtl">
      <style>{`
        @keyframes iel-coach-ping{0%{transform:scale(1);opacity:.55}70%,100%{transform:scale(2.4);opacity:0}}
        @media (prefers-reduced-motion: reduce){ .iel-coach-ring{animation:none!important} }
      `}</style>
      <div className="iel-coach-glow" aria-hidden />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {/* coach presence orb */}
        <div style={{ position: 'relative', flex: 'none', width: 44, height: 44, marginTop: 2 }}>
          <span className="iel-coach-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--iel-accent)', animation: 'iel-coach-ping 2.6s cubic-bezier(0,0,.2,1) infinite' }} />
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(140deg, var(--iel-accent), var(--iel-gold))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), 0 6px 16px -6px color-mix(in srgb, var(--iel-accent) 70%, #000)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Icon.coach size={20} sw={2} />
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800, color: 'var(--iel-accent)', letterSpacing: '.06em', marginBottom: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--iel-accent)', boxShadow: '0 0 8px var(--iel-accent)' }} />
            خطوتك الآن
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--iel-ink)', margin: 0, lineHeight: 1.4 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 13.5, color: 'var(--iel-ink-2)', margin: '7px 0 0', lineHeight: 1.75, maxWidth: '52ch' }}>{subtitle}</p>}
          {reason && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, fontWeight: 700, color: 'var(--iel-gold-ink, var(--iel-gold))', background: 'var(--iel-gold-soft)', border: '1px solid color-mix(in srgb, var(--iel-gold) 30%, transparent)', padding: '5px 11px', borderRadius: 9 }}>
              <Icon.diagnostic size={13} sw={2} /> لماذا؟ {reason}
            </div>
          )}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <PrimaryButton onClick={() => onGo(route)}>{cta} <Icon.chevron size={16} sw={2.4} /></PrimaryButton>
            {chips.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--iel-ink-3)' }}>خطة اليوم أيضاً:</span>
                {chips.slice(0, 4).map((t, i) => (
                  <button key={i} onClick={() => onGo(SKILL_ROUTE[t.task_type] || 'reading')} style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', color: 'var(--iel-ink-2)' }}>
                    {TASK_META[t.task_type] || t.task_type}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
