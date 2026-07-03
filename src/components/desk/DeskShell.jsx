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
  const mobileItems = DESK_NAV.slice(0, 4) // 2 live + 2 upcoming (shown disabled)

  return (
    <div className="desk-root">
      <NocBackdrop />
      <div className="desk-scrim" />

      {/* ── Desktop sidebar (RTL → right) ── */}
      <aside
        className="hidden lg:flex fixed inset-y-0 right-0 w-[264px] flex-col z-30 px-4 py-5"
        style={{ background: 'linear-gradient(180deg, rgba(8,11,18,0.72), rgba(6,8,14,0.82))', borderInlineStart: '1px solid rgba(201,162,92,0.14)', backdropFilter: 'blur(16px)' }}
      >
        {/* brand */}
        <div className="flex items-center gap-3 px-1 pb-6">
          <div className="desk-brand-mark">ط</div>
          <div className="leading-tight">
            <p className="font-['Tajawal'] font-extrabold text-[15px]" style={{ color: 'var(--cream)' }}>طلاقة</p>
            <p className="font-['Tajawal'] text-[11px] tracking-wide" style={{ color: 'var(--brass)' }}>مركز العمليات</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {DESK_NAV.map((item) => {
            const Icon = item.icon
            if (item.soon) {
              return (
                <div key={item.id} className="desk-side-link is-soon" aria-disabled>
                  <Icon size={18} strokeWidth={2} />
                  <span>{item.ar}</span>
                  <span className="desk-soon-chip">قريباً</span>
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
                <span>{item.ar}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* footer — identity + escape hatch to the classic account */}
        <div className="pt-4 desk-hair">
          {displayName && (
            <p className="px-1 pb-2 font-['Tajawal'] text-[12px]" style={{ color: 'rgba(243,238,226,0.55)' }}>{displayName}</p>
          )}
          <Link to="/student" className="flex items-center gap-2 px-2 py-2 rounded-lg font-['Tajawal'] text-[12px] transition-colors" style={{ color: 'rgba(243,238,226,0.4)' }}>
            <ArrowLeft size={14} /> الحساب العادي
          </Link>
        </div>
      </aside>

      {/* ── Mobile top header ── */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(8,11,18,0.8)', borderBottom: '1px solid rgba(201,162,92,0.12)', backdropFilter: 'blur(14px)' }}>
        <div className="desk-brand-mark" style={{ width: 32, height: 32, fontSize: 14 }}>ط</div>
        <div className="leading-tight">
          <p className="font-['Tajawal'] font-extrabold text-[13px]" style={{ color: 'var(--cream)' }}>طلاقة · مركز العمليات</p>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="lg:mr-[264px] relative z-[2]">
        <main className="desk-stage px-4 py-6 lg:px-10 lg:py-9 pb-28 lg:pb-12" style={{ maxWidth: 1180, margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom bar ── */}
      <nav className="desk-mobilebar lg:hidden">
        {mobileItems.map((item) => {
          const Icon = item.icon
          if (item.soon) {
            return (
              <div key={item.id} className="desk-mob-soon" aria-disabled>
                <Icon size={19} strokeWidth={2} />
                <span>{item.ar}</span>
              </div>
            )
          }
          return (
            <NavLink key={item.id} to={item.to} end={item.to === '/desk'} className={({ isActive }) => (isActive ? 'is-active' : '')}>
              <Icon size={19} strokeWidth={2} />
              <span>{item.ar}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
