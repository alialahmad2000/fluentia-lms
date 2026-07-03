import React from 'react'

// ── Icons (single, coherent line set — no emoji anywhere in the section) ──────
const svg = (d, extra) => (p) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={p.sw || 1.8} strokeLinecap="round" strokeLinejoin="round"
    style={p.style} aria-hidden="true">{d}{extra}</svg>
)
export const Icon = {
  overview: svg(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>),
  diagnostic: svg(<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>),
  reading: svg(<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>),
  listening: svg(<><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="6" rx="1"/><rect x="17" y="14" width="4" height="6" rx="1"/></>),
  writing: svg(<><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></>),
  speaking: svg(<><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></>),
  plan: svg(<><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/></>),
  errors: svg(<><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></>),
  mock: svg(<><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M9 13l2 2 4-4"/></>),
  readiness: svg(<><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></>),
  coach: svg(<><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></>),
  back: svg(<path d="M9 18l6-6-6-6"/>),
  chevron: svg(<path d="M15 18l-6-6 6-6"/>),
  play: svg(<path d="M6 3l14 9-14 9V3z"/>),
  home: svg(<><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></>),
}
export const SKILL_ICON = { reading: Icon.reading, listening: Icon.listening, writing: Icon.writing, speaking: Icon.speaking }

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, style, focus, ...p }) {
  return (
    <div style={{
      background: 'var(--iel-surface)', borderRadius: 16,
      border: `1px solid ${focus ? 'color-mix(in srgb, var(--iel-gold) 55%, var(--iel-border))' : 'var(--iel-border)'}`,
      boxShadow: 'var(--iel-shadow)', ...style,
    }} {...p}>{children}</div>
  )
}

// ── Section header ────────────────────────────────────────────────────────
export function SectionHeader({ title, actionLabel, onAction, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 14px', ...style }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--iel-ink)', margin: 0, letterSpacing: '-.01em' }}>{title}</h2>
      {actionLabel && (
        <button onClick={onAction} style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--iel-accent)', fontFamily: 'inherit' }}>{actionLabel} ←</button>
      )}
    </div>
  )
}

export function Chip({ children, dot, muted }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 13px', borderRadius: 11,
      background: 'var(--iel-surface)', border: '1px solid var(--iel-border)', boxShadow: 'var(--iel-shadow-sm)',
      fontSize: 13, fontWeight: 700, color: muted ? 'var(--iel-ink-2)' : 'var(--iel-ink)', fontFamily: "'Tajawal', sans-serif" }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--iel-accent)' }} />}
      {children}
    </div>
  )
}

// ── Band track (current → target on the 4–9 scale) ────────────────────────
export function BandTrack({ current, target, min = 4, max = 9, height = 8 }) {
  const pos = (b) => `${Math.max(0, Math.min(100, ((Number(b) - min) / (max - min)) * 100))}%`
  const has = current != null
  return (
    <div>
      <div style={{ height, borderRadius: 20, background: 'var(--iel-track)', position: 'relative', marginTop: 14 }}>
        {has && <div style={{ position: 'absolute', top: 0, bottom: 0, insetInlineStart: 0, width: pos(current), borderRadius: 20, background: 'linear-gradient(90deg, var(--iel-good), var(--iel-accent))' }} />}
        {target != null && <div style={{ position: 'absolute', top: -4, insetInlineStart: pos(target), width: 2, height: height + 8, background: 'var(--iel-gold)', borderRadius: 2 }} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--iel-ink-3)', marginTop: 7, fontWeight: 600 }}>
        <span>{min}.0</span>{target != null && <span>الهدف {Number(target).toFixed(1)}</span>}<span>{max}.0</span>
      </div>
    </div>
  )
}

// ── Skill card ────────────────────────────────────────────────────────────
export function SkillCard({ skill, label, current, target, last, focus, onClick }) {
  const I = SKILL_ICON[skill] || Icon.reading
  const pct = current != null && target ? Math.max(8, Math.min(100, (Number(current) / Number(target)) * 100)) : 0
  return (
    <Card focus={focus} style={{ padding: '16px', paddingTop: 26, position: 'relative', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      {focus && <div style={{ position: 'absolute', top: 12, insetInlineEnd: 14, fontSize: 10, fontWeight: 800, color: 'var(--iel-gold)', letterSpacing: '.05em' }}>نقطة التركيز</div>}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--iel-ink-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ color: 'var(--iel-ink-3)', display: 'flex' }}><I size={15} /></span>{label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="iel-serif" style={{ fontSize: 29, fontWeight: 600, color: 'var(--iel-ink)' }}>{current != null ? Number(current).toFixed(1) : '—'}</span>
        {target && <span style={{ fontSize: 12, color: 'var(--iel-ink-3)', fontWeight: 700 }}>/ {Number(target).toFixed(1)}</span>}
      </div>
      <div style={{ height: 5, borderRadius: 20, background: 'var(--iel-track)', marginTop: 12, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, insetInlineStart: 0, width: `${pct}%`, borderRadius: 20, background: focus ? 'var(--iel-warn)' : 'var(--iel-accent)' }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--iel-ink-3)', marginTop: 9, fontWeight: 600 }}>{last || 'لم تتدرّبي بعد'}</div>
    </Card>
  )
}

// ── Task row (today's plan / actionable items) ────────────────────────────
export function TaskRow({ tag, title, sub, time, first, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 4px', cursor: 'pointer',
      borderTop: first ? 0 : '1px solid var(--iel-border)' }}>
      <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 8, background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', flex: 'none', minWidth: 56, textAlign: 'center' }}>{tag}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--iel-ink)' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--iel-ink-3)', fontWeight: 600, marginTop: 2 }}>{sub}</div>}
      </div>
      {time && <span style={{ fontSize: 12, color: 'var(--iel-ink-2)', fontWeight: 700 }}>{time}</span>}
      <span style={{ color: 'var(--iel-ink-3)', display: 'flex' }}><Icon.chevron size={18} sw={2} /></span>
    </div>
  )
}

// ── Nav item ──────────────────────────────────────────────────────────────
export function NavItem({ icon: I, label, badge, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 10, width: '100%',
      border: 0, cursor: 'pointer', textAlign: 'start', fontFamily: "'Tajawal', sans-serif", fontSize: 14, fontWeight: 600,
      color: active ? 'var(--iel-nav-active)' : 'var(--iel-ink-2)',
      background: active ? 'var(--iel-nav-active-bg)' : 'transparent',
      transition: 'background .15s, color .15s',
    }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'var(--iel-surface-2)'; e.currentTarget.style.color = 'var(--iel-ink)' } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--iel-ink-2)' } }}
    >
      <span style={{ display: 'flex', flex: 'none' }}><I size={18} /></span>
      {label}
      {badge != null && badge !== '' && (
        <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 700, background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', padding: '1px 8px', borderRadius: 20 }}>{badge}</span>
      )}
    </button>
  )
}

export function PrimaryButton({ children, onClick, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 22px', borderRadius: 12,
      border: 0, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 15, fontWeight: 700,
      color: disabled ? 'var(--iel-ink-3)' : '#fff', background: disabled ? 'var(--iel-surface-2)' : 'var(--iel-accent)',
      opacity: disabled ? 0.7 : 1, ...style,
    }}>{children}</button>
  )
}
