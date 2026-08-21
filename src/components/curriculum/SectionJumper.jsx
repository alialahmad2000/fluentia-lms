// In-section navigator for a unit tab.
//
// WHY THIS EXISTS
// A unit section is one long scroll: article, audio, vocabulary, the study
// sheet, the questions, critical thinking. A student who wants the questions
// had to scroll past everything else every single time. This is the rail that
// lets her jump straight there — and, just as importantly, tells her at a
// glance what this section even contains.
//
// It is deliberately generic: pass the sections a tab actually renders and it
// works in reading, listening, grammar or anywhere else. Nothing is hardcoded
// to reading.
//
// Two layout facts it has to respect, both of which have bitten this codebase:
//   • the app header is a FIXED element whose height lives in --header-height
//     (kept live by SidebarMetricsObserver), so scroll targets must be offset
//     by header + rail or every jump lands with the heading hidden under it.
//   • the rail does NOT position itself. The reading tab already owns a sticky
//     cluster at the header offset (the progress bar), and two sticky siblings
//     at slightly different offsets tear as you scroll. The caller places this
//     inside its own sticky container instead.
import { useEffect, useMemo, useRef, useState } from 'react'

// The rail's height is MEASURED, never assumed: the chips grow on a coarse
// pointer to clear the 44px touch floor, so a hardcoded constant would send
// every jump on a phone to the wrong place.

/**
 * @param {{id: string, label: string, icon?: React.ComponentType<{size?: number, className?: string}>}[]} sections
 *        Only sections whose element is actually in the DOM are shown, so a
 *        caller can pass the full list and let absent blocks fall away.
 */
export default function SectionJumper({ sections = [], className = '' }) {
  const [present, setPresent] = useState([])
  const [active, setActive] = useState(null)
  const navRef = useRef(null)
  const railRef = useRef(null)
  const activeChipRef = useRef(null)

  const chrome = () => {
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) || 64
    const railH = navRef.current?.getBoundingClientRect().height ?? 52
    return headerH + railH
  }

  const ids = useMemo(() => sections.map((s) => s.id).join('|'), [sections])

  // Which of the requested sections actually rendered? A reading with no
  // vocabulary should not advertise a vocabulary tab.
  useEffect(() => {
    const check = () => setPresent(sections.filter((s) => document.getElementById(s.id)))
    check()
    // Content arrives from several queries, so re-check as the tab fills in.
    const t = setTimeout(check, 400)
    const t2 = setTimeout(check, 1200)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track the section the reader is actually in.
  useEffect(() => {
    if (!present.length) return
    const top = chrome()
    const observer = new IntersectionObserver(
      (entries) => {
        // The section whose top has most recently crossed the rail wins.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      {
        // Treat the band just under the rail as "the current section".
        rootMargin: `-${top}px 0px -55% 0px`,
        threshold: 0,
      }
    )
    present.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [present])

  // Keep the active chip in view on a narrow screen without yanking the page.
  useEffect(() => {
    const chip = activeChipRef.current
    const rail = railRef.current
    if (!chip || !rail) return
    const c = chip.getBoundingClientRect()
    const r = rail.getBoundingClientRect()
    if (c.left < r.left || c.right > r.right) {
      rail.scrollTo({ left: chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' })
    }
  }, [active])

  const jump = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - chrome() - 12
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
    setActive(id)
  }

  // One destination is not a navigator.
  if (present.length < 2) return null

  // Chrome colours come from the --ds-* token layer. The first version used a
  // cold navy rail and a SKY-BLUE active chip — a second accent hue dropped into
  // a section whose whole palette is one warm gold, which is why it read as
  // belonging to a different app.
  const gold = 'var(--ds-accent-primary, #e9b949)'
  const goldWash = 'var(--ds-accent-wash, rgba(233,185,73,.08))'

  return (
    <nav ref={navRef} dir="rtl" aria-label="أقسام هذه الصفحة" className={className}>
      <div
        ref={railRef}
        className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border px-2 py-2 shadow-lg shadow-black/40 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          background: 'var(--ds-bg-overlay, rgba(11,15,24,0.86))',
          borderColor: 'var(--ds-border-subtle, rgba(255,255,255,0.07))',
        }}
      >
        {present.map((s) => {
          const isActive = active === s.id
          const Icon = s.icon
          return (
            <button
              key={s.id}
              ref={isActive ? activeChipRef : null}
              onClick={() => jump(s.id)}
              aria-current={isActive ? 'true' : undefined}
              style={
                isActive
                  ? { background: goldWash, color: gold, boxShadow: 'inset 0 0 0 1px rgba(233,185,73,0.30)' }
                  : { color: 'var(--ds-text-tertiary, #8b8578)' }
              }
              className={`flex min-h-[38px] flex-none items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-['Tajawal'] text-[12.5px] font-medium transition-colors duration-200 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:px-4 ${
                isActive ? '' : 'hover:bg-white/[0.06] hover:text-[var(--ds-text-primary,#faf5e6)]'
              }`}
            >
              {Icon && <Icon size={13} style={{ color: isActive ? gold : 'currentColor', opacity: isActive ? 1 : 0.75 }} />}
              {s.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
