import { Suspense } from 'react'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import TrainerPresence from '@/design-system/components/masterclass/TrainerPresence'

const PAGE_TITLES = {
  '/student/ielts-atelier': 'القياس',
  '/student/ielts-atelier/diagnostic': 'التشخيص',
  '/student/ielts-atelier/reading': 'القراءة',
  '/student/ielts-atelier/listening': 'الاستماع',
  '/student/ielts-atelier/writing': 'الكتابة',
  '/student/ielts-atelier/speaking': 'المحادثة',
  '/student/ielts-atelier/journey': 'الخطة',
  '/student/ielts-atelier/errors': 'بنك الدروس',
  '/student/ielts-atelier/mock': 'المحاكاة',
  '/student/ielts-atelier/trainer': 'مدربك',
  '/student/ielts-atelier/readiness': 'الجاهزية',
}

// The Instrument palette — overrides the warm "sunset" tokens the 21 Atelier
// pages consume, re-theming the whole section to cool graphite + one signal teal.
const INSTRUMENT_TOKENS = {
  '--sunset-base-deep': '#090b0e',
  '--sunset-base-mid':  '#13181d',
  '--sunset-base-warm': '#1a2128',
  '--sunset-amber':     '#35c9b0',
  '--sunset-orange':    '#3fdcc0',
  '--sunset-bronze':    '#2c6f63',
  '--sunset-cream':     '#eceff1',
  '--sunset-gold':      '#9fe9db',
  '--ds-accent-primary': '#3fdcc0',
  '--ds-accent-gold':    '#3fdcc0',
}

const LoadingFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
    <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,.1)', borderTopColor: '#3fdcc0', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
)

export default function IELTSMasterclassLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const title = PAGE_TITLES[pathname] || 'IELTS'
  const isHome = pathname === '/student/ielts-atelier' || pathname === '/student/ielts-atelier/'

  return (
    <div
      dir="rtl"
      style={{
        ...INSTRUMENT_TOKENS,
        minHeight: '100vh',
        background: '#090b0e',
        backgroundImage:
          'radial-gradient(120% 70% at 88% -12%, rgba(63,220,192,.05), transparent 55%),' +
          'linear-gradient(rgba(255,255,255,.012) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(255,255,255,.012) 1px, transparent 1px)',
        backgroundSize: 'auto, 48px 48px, 48px 48px',
        color: 'var(--ds-text-primary)',
        fontFamily: "'Tajawal', sans-serif",
        position: 'relative',
      }}
    >
      {/* Sticky header — instrument chrome */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          background: 'color-mix(in srgb, #0d1114 84%, transparent)',
          borderBottom: '1px solid rgba(255,255,255,.07)',
        }}
      >
        <div
          style={{
            maxWidth: 1060,
            margin: '0 auto',
            padding: '13px var(--space-5)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <button
            onClick={() => navigate('/student/dashboard')}
            aria-label="العودة إلى اللوحة"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
              color: 'var(--ds-text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'border-color .16s ease-out',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.18)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'}
          >
            <ArrowRight size={14} style={{ transform: 'scaleX(-1)' }} aria-hidden="true" />
            اللوحة
          </button>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span aria-hidden="true" style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'rgba(63,220,192,.13)', border: '1px solid rgba(63,220,192,.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3fdcc0', fontWeight: 800, fontSize: 15,
            }}>ط</span>
            <Link to="/student/ielts-atelier" style={{ fontSize: 15, fontWeight: 800, color: 'var(--ds-text-primary)', textDecoration: 'none', letterSpacing: '-.01em' }}>طلاقة</Link>
            <span style={{ color: 'var(--ds-text-tertiary)', fontSize: 12, fontFamily: "'SF Mono', ui-monospace, monospace", letterSpacing: '.06em' }} aria-hidden="true">/ IELTS</span>
            {!isHome && (
              <>
                <span style={{ color: 'var(--ds-text-tertiary)', fontSize: 13 }} aria-hidden="true">·</span>
                <h1 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h1>
              </>
            )}
          </div>

          <TrainerPresence trainerName="د. علي" size="sm" />
        </div>
      </header>

      {/* Main outlet */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1060,
          margin: '0 auto',
          padding: 'var(--space-7) var(--space-5) var(--space-9)',
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
