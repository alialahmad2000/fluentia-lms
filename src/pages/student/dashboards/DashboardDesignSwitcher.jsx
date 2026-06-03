import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Palette, X } from 'lucide-react'

/* ------------------------------------------------------------------ *
 * DashboardDesignSwitcher — owner/staff-only floating control to flip
 * between the dashboard structures WITHOUT editing the URL. It just sets
 * the ?design= param (the StudentDashboard switch reads it). Gated by the
 * caller (StudentDashboard) so real students never see it.
 * ------------------------------------------------------------------ */

const OPTIONS = [
  { key: 'default', label: 'الأساسي' },
  { key: 'journey', label: 'المسار' },
  { key: 'spotlight', label: 'التركيز' },
  { key: 'observatory', label: 'المرصد' },
]

export default function DashboardDesignSwitcher() {
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(true)
  const current = params.get('design') || 'default'

  const choose = (key) => {
    const next = new URLSearchParams(params)
    if (key === 'default') next.delete('design')
    else next.set('design', key)
    setParams(next)
  }

  const wrap = {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 74px)',
    zIndex: 45,
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="معاينة تصميم اللوحة"
        style={{
          ...wrap,
          width: 44,
          height: 44,
          borderRadius: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ds-bg-overlay, rgba(10,20,40,0.72))',
          border: '1px solid var(--ds-border-subtle)',
          color: 'var(--ds-accent-primary)',
          boxShadow: 'var(--ds-shadow-md)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <Palette size={20} strokeWidth={1.8} />
      </button>
    )
  }

  return (
    <div
      dir="rtl"
      style={{
        ...wrap,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: 'calc(100vw - 24px)',
        padding: '7px 8px 7px 10px',
        borderRadius: 9999,
        background: 'var(--ds-bg-overlay, rgba(10,20,40,0.78))',
        border: '1px solid var(--ds-border-subtle)',
        boxShadow: 'var(--ds-shadow-md), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
      }}
    >
      <Palette size={15} strokeWidth={1.9} style={{ color: 'var(--ds-accent-primary)', flex: '0 0 auto' }} />
      <div
        className="scrollbar-hide"
        style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: '1 1 auto' }}
      >
        {OPTIONS.map((o) => {
          const active = current === o.key
          return (
            <button
              key={o.key}
              onClick={() => choose(o.key)}
              style={{
                flex: '0 0 auto',
                padding: '7px 13px',
                minHeight: 34,
                borderRadius: 9999,
                fontSize: 12.5,
                fontWeight: active ? 700 : 600,
                whiteSpace: 'nowrap',
                fontFamily: "'Tajawal', sans-serif",
                cursor: 'pointer',
                transition: 'all 180ms ease',
                background: active
                  ? 'linear-gradient(135deg, var(--ds-accent-primary), var(--ds-accent-gold, var(--ds-accent-primary)))'
                  : 'var(--ds-surface-2)',
                color: active ? 'var(--ds-text-inverse)' : 'var(--ds-text-secondary)',
                border: '1px solid',
                borderColor: active ? 'transparent' : 'var(--ds-border-subtle)',
                boxShadow: active ? '0 6px 16px -8px var(--ds-accent-primary-glow)' : 'none',
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      <button
        onClick={() => setOpen(false)}
        aria-label="إخفاء"
        style={{
          flex: '0 0 auto',
          width: 28,
          height: 28,
          borderRadius: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          color: 'var(--ds-text-tertiary)',
          cursor: 'pointer',
        }}
      >
        <X size={15} strokeWidth={2} />
      </button>
    </div>
  )
}
