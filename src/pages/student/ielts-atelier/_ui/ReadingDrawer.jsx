import React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, Info, ListChecks, BookOpen } from 'lucide-react'

// A shared, premium lesson modal for the strategy content (reading lessons +
// question types + listening lessons). Bento card-deck: a header identity card
// plus composable content cards (concept · steps · example · callout). Each card
// takes an optional `span` (1 or 2) so callers control the grid rhythm; the
// exports keep the same names/props they always had, so every caller still works.

// Per-card entrance — each tile fades+lifts, staggered by the bento container.
function useCardVariants() {
  const reduce = useReducedMotion()
  return {
    hidden: { opacity: 0, y: reduce ? 0 : 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
  }
}

export function ReadingDrawer({ open, onClose, icon: I, color = 'var(--iel-accent)', kicker, title, subtitle, children }) {
  const reduce = useReducedMotion()
  const headV = useCardVariants()
  const container = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.05, delayChildren: 0.04 } } }
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="iel-root"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 10060, background: 'rgba(4,6,10,.66)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <motion.div
            dir="rtl"
            initial={{ opacity: 0, y: 22, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="iel-lmodal"
            style={{ '--dc': color, fontFamily: "'Tajawal', sans-serif" }}
          >
            <button onClick={onClose} aria-label="إغلاق" className="iel-lmodal-x"><X size={17} /></button>
            <motion.div className="iel-bento" initial="hidden" animate="show" variants={container}>
              {/* header identity card */}
              <motion.div className="iel-bcard iel-bcard--head" data-span="2" variants={headV}>
                <span className="med">{I && <I size={22} />}</span>
                <div className="ht">
                  {kicker && <div className="kick">{kicker}</div>}
                  <h2>{title}</h2>
                  {subtitle && <div className="sub">{subtitle}</div>}
                </div>
              </motion.div>
              {children}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Concept / explanation card.
export function DrawerLede({ children, label = 'الفكرة', span = 2 }) {
  const v = useCardVariants()
  return (
    <motion.div className="iel-bcard" data-span={span} variants={v}>
      <div className="iel-blab"><span className="d"><Info size={14} /></span>{label}</div>
      <p className="iel-btext">{children}</p>
    </motion.div>
  )
}

// Strategy steps — compact numbered chips (no long timeline).
export function DrawerSteps({ title = 'الخطوات', steps = [], color = 'var(--iel-accent)', span = 2 }) {
  const v = useCardVariants()
  if (!steps.length) return null
  return (
    <motion.div className="iel-bcard" data-span={span} variants={v} style={{ '--dc': color }}>
      <div className="iel-blab"><span className="d"><ListChecks size={14} /></span>{title}</div>
      <ol className="iel-bsteps">
        {steps.map((s, i) => (
          <li key={i}><span className="n">{i + 1}</span><span className="t">{s}</span></li>
        ))}
      </ol>
    </motion.div>
  )
}

// Worked-example / example card.
export function DrawerExample({ title = 'مثال', children, span = 1 }) {
  const v = useCardVariants()
  return (
    <motion.div className="iel-bcard" data-span={span} variants={v}>
      <div className="iel-blab"><span className="d"><BookOpen size={14} /></span>{title}</div>
      <div className="iel-bex">{children}</div>
    </motion.div>
  )
}

// A tinted callout card (tip / common mistakes). tone: 'gold' | 'warn' | 'accent'
export function DrawerCallout({ icon: I, tone = 'gold', title, children, span = 1 }) {
  const v = useCardVariants()
  return (
    <motion.div className={`iel-bcard iel-bcard--callout tone-${tone}`} data-span={span} variants={v}>
      <div className="iel-blab">{I && <span className="d"><I size={14} /></span>}{title}</div>
      <div className="iel-btext">{children}</div>
    </motion.div>
  )
}
