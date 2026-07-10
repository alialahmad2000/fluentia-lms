// DeskMobileBar — the Desk bottom bar. As the Desk grew past 4 live surfaces,
// the bar shows the 4 primary destinations + a «المزيد» sheet holding the rest
// (so everything stays reachable on the iPhone-first surface). Self-contained so
// DeskShell only mounts <DeskMobileBar/>.
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal, X } from 'lucide-react'
import { DESK_NAV } from '@/config/deskNavigation'

export default function DeskMobileBar() {
  const [open, setOpen] = useState(false)
  const live = DESK_NAV.filter((i) => !i.soon)
  const primary = live.slice(0, 4)
  const overflow = live.slice(4)
  const soon = DESK_NAV.filter((i) => i.soon)
  const hasMore = overflow.length > 0 || soon.length > 0

  return (
    <>
      {/* the sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="desk-more-backdrop lg:hidden" onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="desk-more-sheet lg:hidden"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.32 }}>
              <div className="flex items-center justify-between px-1 pb-3">
                <span className="font-['Hanken_Grotesk'] font-bold text-[14px]" dir="ltr" style={{ color: 'var(--cream)' }}>More</span>
                <button onClick={() => setOpen(false)} className="desk-ghost-btn" aria-label="Close"><X size={16} /></button>
              </div>
              <div className="space-y-1.5">
                {overflow.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink key={item.id} to={item.to} onClick={() => setOpen(false)}
                      className={({ isActive }) => `desk-side-link ${isActive ? 'is-active' : ''}`}>
                      <Icon size={18} strokeWidth={2} />
                      <span>{item.en}</span>
                    </NavLink>
                  )
                })}
                {soon.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.id} className="desk-side-link is-soon" aria-disabled>
                      <Icon size={18} strokeWidth={2} />
                      <span>{item.en}</span>
                      <span className="desk-soon-chip">Soon</span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* the bar */}
      <nav className="desk-mobilebar lg:hidden">
        {primary.map((item) => {
          const Icon = item.icon
          return (
            <NavLink key={item.id} to={item.to} end={item.to === '/desk'}
              className={({ isActive }) => (isActive ? 'is-active' : '')}>
              <Icon size={19} strokeWidth={2} />
              <span>{item.en}</span>
            </NavLink>
          )
        })}
        {hasMore && (
          <button className={open ? 'is-active' : ''} onClick={() => setOpen((o) => !o)} aria-label="More">
            <MoreHorizontal size={19} strokeWidth={2} />
            <span>More</span>
          </button>
        )}
      </nav>
    </>
  )
}
