import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { Radar, ClipboardCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { nowBothZones, viewerTz } from './utils/tz'
import './lc-console.css'

/**
 * The Learning Coach console shell — an LTR English island inside the RTL
 * Arabic app.
 *
 * It never touches document.documentElement.dir: the whole flip is a scoped
 * `dir="ltr"` on this wrapper plus the rules in lc-console.css. The
 * rest of the platform stays Arabic and right-to-left while this subtree reads
 * left-to-right.
 *
 * No background is mounted here — App.jsx already renders <AuroraBackground/>
 * globally at z-index:-1, and a second one would stack a duplicate set of
 * drifting orbs over the first.
 */

const TABS = [
  { to: '/coach', label: 'Radar', icon: Radar, end: true },
  { to: '/coach/log', label: 'Daily Log', icon: ClipboardCheck },
]

export default function CoachLayout() {
  // R2 — every hook runs before the role gate below. No early return above this line.
  const profile = useAuthStore((s) => s.profile)
  const loading = useAuthStore((s) => s.loading)
  const tz = useMemo(() => viewerTz(profile), [profile])
  // He leaves this tab open all day. Computed once at mount, the header still
  // read "Riyadh 9:05 pm" at midnight.
  const [clock, setClock] = useState(() => nowBothZones(tz))
  useEffect(() => {
    setClock(nowBothZones(tz))
    const id = setInterval(() => setClock(nowBothZones(tz)), 30_000)
    return () => clearInterval(id)
  }, [tz])

  // ── gate (last) ────────────────────────────────────────────────────────
  if (loading) return null
  if (profile && profile.role !== 'coach' && profile.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div dir="ltr" className="lc-console w-full">
      <header className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p
              className="cc-eyebrow mb-1"
              style={{ color: 'var(--ds-accent-primary)', letterSpacing: '0.14em' }}
            >
              Student Success
            </p>
            <h1
              className="text-2xl sm:text-3xl font-extrabold leading-tight"
              style={{ color: 'var(--ds-text-primary)' }}
            >
              Learning Coach
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>
              Every active student, worst first — reach the quiet ones, and find out what is actually blocking them.
            </p>
          </div>
          <p
            className="cc-num text-xs sm:text-sm shrink-0"
            style={{ color: 'var(--ds-text-tertiary)' }}
            title="The academy runs on Riyadh time"
          >
            {clock}
          </p>
        </div>
      </header>

      <nav
        className="flex items-center gap-1 mb-7 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--ds-border-subtle)' }}
      >
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors"
            style={({ isActive }) => ({
              color: isActive ? 'var(--ds-text-primary)' : 'var(--ds-text-tertiary)',
              borderBottom: `2px solid ${isActive ? 'var(--ds-accent-primary)' : 'transparent'}`,
              marginBottom: '-1px',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
