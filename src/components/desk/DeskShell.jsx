// DeskShell — the bespoke Pro Desk shell. A COMPLETELY different chrome from the student
// LayoutShell: its own brass sidebar + header + mobile bar over the Operations Room backdrop.
// It reuses NONE of the shared student Sidebar/Header/MobileBar, so building/altering it can
// never regress سلطان or any other student. Sets <html data-track="desk"> (brass accent),
// cleaned up on unmount.
import { useEffect } from 'react'
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { DESK_NAV } from '@/config/deskNavigation'
import NocBackdrop from './NocBackdrop'
import DeskBoot from './DeskBoot'
import DeskMobileBar from './DeskMobileBar'
import '../../pages/desk/desk.css'

export default function DeskShell() {
  const profile = useAuthStore((s) => s.profile)
  const location = useLocation()

  // Brass accent scoped to the whole Desk subtree (design-tokens.css remap).
  useEffect(() => {
    const el = document.documentElement
    const prev = el.getAttribute('data-track')
    el.setAttribute('data-track', 'desk')
    return () => {
      if (el.getAttribute('data-track') === 'desk') {
        if (prev && prev !== 'desk') el.setAttribute('data-track', prev)
        else el.removeAttribute('data-track')
      }
    }
  }, [])

  // scroll to top on navigation
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  const displayName = profile?.display_name || profile?.full_name || ''

  return (
    <div className="desk-root">
      <DeskBoot />
      <NocBackdrop />
      <div className="desk-scrim" />

      {/* ── Desktop sidebar (LTR → left) ── */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 w-[264px] flex-col z-30 px-4 py-5"
        style={{ background: 'linear-gradient(180deg, rgba(251,246,239,0.84), rgba(246,239,229,0.92))', borderInlineEnd: '1px solid rgba(58,42,84,0.10)', backdropFilter: 'blur(18px)' }}
      >
        {/* brand */}
        <div className="flex items-center gap-3 px-1 pb-6">
          <div className="desk-brand-mark"><img src="/brand/fluentia-mark.svg" alt="" /></div>
          <div className="leading-tight">
            <p className="font-['Fraunces'] font-semibold text-[19px] leading-none" dir="ltr" style={{ color: 'var(--ink)' }}>Fluentia</p>
            <p className="desk-mono text-[9.5px] tracking-[0.22em] uppercase mt-1" dir="ltr" style={{ color: 'var(--coral-deep,#cf4a1c)' }}>Pro Desk</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {DESK_NAV.map((item) => {
            const Icon = item.icon
            if (item.soon) {
              return (
                <div key={item.id} className="desk-side-link is-soon" aria-disabled>
                  <Icon size={18} strokeWidth={2} />
                  <span dir="ltr">{item.en}</span>
                  <span className="desk-soon-chip" style={{ marginInlineStart: 'auto' }}>Soon</span>
                </div>
              )
            }
            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.to === '/desk'}
                className={({ isActive }) => `desk-side-link ${isActive ? 'is-active' : ''}`}
              >
                <Icon size={18} strokeWidth={2} />
                <span dir="ltr">{item.en}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* footer — identity + escape hatch to the classic account */}
        <div className="pt-4 desk-hair">
          {displayName && (
            <p className="px-1 pb-2 font-['Tajawal'] text-[12px]" style={{ color: 'rgba(42,33,64,0.6)' }}>{displayName}</p>
          )}
          <Link to="/student" className="flex items-center gap-2 px-2 py-2 rounded-lg font-['Hanken_Grotesk'] text-[12px] transition-colors" dir="ltr" style={{ color: 'rgba(42,33,64,0.45)' }}>
            <ArrowLeft size={14} /> Standard account
          </Link>
        </div>
      </aside>

      {/* ── Mobile top header ── */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(250,244,236,0.88)', borderBottom: '1px solid rgba(58,42,84,0.10)', backdropFilter: 'blur(16px)' }}>
        <div className="desk-brand-mark" style={{ width: 32, height: 32, borderRadius: 10 }}><img src="/brand/fluentia-mark.svg" alt="" /></div>
        <div className="leading-tight">
          <p className="font-['Fraunces'] font-semibold text-[15px]" dir="ltr" style={{ color: 'var(--ink)' }}>Fluentia <span className="desk-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--coral-deep,#cf4a1c)' }}>· Pro Desk</span></p>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="lg:ml-[264px] relative z-[2]">
        <main className="desk-stage px-4 py-6 lg:px-10 lg:py-9 pb-28 lg:pb-12" style={{ maxWidth: 1180, margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom bar (+ «المزيد» sheet) ── */}
      <DeskMobileBar />
    </div>
  )
}
