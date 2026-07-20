import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

// A shared, premium right-anchored drawer for the reading strategy content
// (lessons + question types). Hero header with a colored medallion + glow, an
// accent top-rail, and composable body blocks so both callers look identical.

export function ReadingDrawer({ open, onClose, icon: I, color = 'var(--iel-accent)', kicker, title, subtitle, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 10060, background: 'rgba(4,6,10,.62)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'flex-start' }}
        >
          <motion.div
            dir="rtl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 38, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="iel-root iel-drawer2"
            style={{ width: 'min(560px, 100%)', height: '100%', overflowY: 'auto', fontFamily: "'Tajawal', sans-serif" }}
          >
            {/* hero header */}
            <div className="iel-drawer2-head" style={{ '--dc': color }}>
              <div className="glow" aria-hidden />
              <button onClick={onClose} aria-label="إغلاق" className="closebtn"><X size={17} /></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, position: 'relative' }}>
                <span className="medallion" style={{ '--dc': color }}>{I && <I size={22} />}</span>
                <div style={{ minWidth: 0 }}>
                  {kicker && <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 5 }}>{kicker}</div>}
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--iel-ink)', margin: 0, lineHeight: 1.25, letterSpacing: '-.01em' }}>{title}</h2>
                  {subtitle && <div style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', fontWeight: 600, marginTop: 4 }}>{subtitle}</div>}
                </div>
              </div>
            </div>

            {/* body */}
            <div style={{ padding: '20px 26px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Lead paragraph (concept / explanation).
export function DrawerLede({ children }) {
  return <p style={{ margin: 0, fontSize: 15, lineHeight: 1.95, color: 'var(--iel-ink-2)' }}>{children}</p>
}

// Numbered strategy timeline with a connector line.
export function DrawerSteps({ title = 'الخطوات', steps = [], color = 'var(--iel-accent)' }) {
  if (!steps.length) return null
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 800, color, marginBottom: 12 }}>{title}</div>
      <ol className="iel-steps" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {steps.map((s, i) => (
          <li key={i} className="iel-step" style={{ '--dc': color }}>
            <span className="n">{i + 1}</span>
            <span className="t">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// A framed worked-example / example block.
export function DrawerExample({ title = 'مثال', children }) {
  return (
    <div className="iel-drawer2-ex">
      <div className="lbl">{title}</div>
      {children}
    </div>
  )
}

// A soft callout (tip / common mistakes). tone: 'gold' | 'warn' | 'accent'
export function DrawerCallout({ icon: I, tone = 'gold', title, children }) {
  const c = tone === 'warn' ? 'var(--iel-warn, #f59e0b)' : tone === 'accent' ? 'var(--iel-accent)' : 'var(--iel-gold, #e6ba68)'
  return (
    <div style={{ display: 'flex', gap: 11, padding: '14px 16px', borderRadius: 14, background: `color-mix(in srgb, ${c} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 28%, transparent)` }}>
      {I && <span style={{ flex: 'none', color: c, marginTop: 1 }}><I size={17} /></span>}
      <div style={{ minWidth: 0 }}>
        {title && <div style={{ fontSize: 12.5, fontWeight: 800, color: c, marginBottom: 5 }}>{title}</div>}
        <div style={{ fontSize: 13.5, lineHeight: 1.8, color: 'var(--iel-ink-2)' }}>{children}</div>
      </div>
    </div>
  )
}
