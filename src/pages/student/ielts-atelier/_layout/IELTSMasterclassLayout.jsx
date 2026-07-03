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

// The Dawn palette — overrides the "sunset" tokens the 21 Atelier pages consume,
// re-theming the whole section to a warm, cinematic dawn: deep warm-plum grounds
// with a luminous gold/amber accent. (Replaces the earlier cool "instrument".)
const DAWN_TOKENS = {
  '--sunset-base-deep': '#0d0812',
  '--sunset-base-mid':  '#1a1024',
  '--sunset-base-warm': '#241634',
  '--sunset-amber':     '#f6b45a',
  '--sunset-orange':    '#ffcf7a',
  '--sunset-bronze':    '#b5763a',
  '--sunset-cream':     '#f8f1e8',
  '--sunset-gold':      '#ffd27a',
  '--ds-accent-primary': '#ffcf7a',
  '--ds-accent-gold':    '#ffcf7a',
}

const LoadingFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
    <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,.1)', borderTopColor: '#ffcf7a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
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
        ...DAWN_TOKENS,
        minHeight: '100dvh',
        background: '#0d0812',
        backgroundImage:
          'radial-gradient(130% 62% at 50% 118%, rgba(246,180,90,.16), rgba(233,123,116,.06) 34%, transparent 62%),' +
          'radial-gradient(90% 46% at 50% -8%, rgba(255,207,122,.06), transparent 55%),' +
          'linear-gradient(180deg, #0d0812 0%, #160e22 52%, #1d1332 100%)',
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
          background: 'color-mix(in srgb, #140c1e 82%, transparent)',
          borderBottom: '1px solid rgba(246,180,90,.10)',
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
              background: 'rgba(255,207,122,.14)', border: '1px solid rgba(255,207,122,.42)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffcf7a', fontWeight: 800, fontSize: 15,
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
