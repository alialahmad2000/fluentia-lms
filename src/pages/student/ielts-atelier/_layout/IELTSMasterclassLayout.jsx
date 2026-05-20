import { Suspense } from 'react'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Compass } from 'lucide-react'
import TrainerPresence from '@/design-system/components/masterclass/TrainerPresence'
import IELTSSunsetBackground from '@/design-system/masterclass/IELTSSunsetBackground'

const PAGE_TITLES = {
  '/student/ielts-v2': 'الرحلة',
  '/student/ielts-v2/diagnostic': 'الاختبار التشخيصي',
  '/student/ielts-v2/reading': 'القراءة — The Study',
  '/student/ielts-v2/listening': 'الاستماع — The Theater',
  '/student/ielts-v2/writing': 'الكتابة — The Workshop',
  '/student/ielts-v2/speaking': 'المحادثة — The Interview Room',
  '/student/ielts-v2/journey': 'الرحلة الكاملة',
  '/student/ielts-v2/errors': 'بنك الدروس',
  '/student/ielts-v2/mock': 'الاختبار التجريبي',
  '/student/ielts-v2/trainer': 'مدربك',
  '/student/ielts-v2/readiness': 'أسبوع الجاهزية',
}

const LoadingFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
    <div style={{ width: 24, height: 24, border: '2px solid var(--ds-border-subtle)', borderTopColor: 'var(--ds-accent-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
)

export default function IELTSMasterclassLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const title = PAGE_TITLES[pathname] || 'Fluentia IELTS'
  const isHome = pathname === '/student/ielts-v2' || pathname === '/student/ielts-v2/'

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: 'var(--sunset-base-deep, #1a0f08)',
        color: 'var(--ds-text-primary)',
        fontFamily: "'Tajawal', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <IELTSSunsetBackground />

      {/* Sticky header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          background: 'color-mix(in srgb, var(--sunset-base-mid, #2b1810) 78%, transparent)',
          borderBottom: '1px solid color-mix(in srgb, var(--sunset-amber, #f97316) 15%, transparent)',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '14px var(--space-5)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <button
            onClick={() => navigate('/student/dashboard')}
            aria-label="العودة إلى اللوحة"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--ds-surface-1)',
              border: '1px solid var(--ds-border-subtle)',
              color: 'var(--ds-text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'border-color var(--motion-fast) var(--ease-out)',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ds-border-strong)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ds-border-subtle)'}
          >
            <ArrowRight size={14} style={{ transform: 'scaleX(-1)' }} aria-hidden="true" />
            اللوحة
          </button>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Compass size={18} style={{ color: 'var(--sunset-orange, #fbbf24)', flexShrink: 0 }} aria-hidden="true" />
            {!isHome && (
              <Link
                to="/student/ielts-v2"
                style={{ fontSize: 13, color: 'var(--ds-text-tertiary)', textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                IELTS Masterclass
              </Link>
            )}
            {!isHome && <span style={{ color: 'var(--ds-text-tertiary)', fontSize: 13 }} aria-hidden="true">/</span>}
            <h1
              style={{
                fontSize: isHome ? 18 : 15,
                fontWeight: 800,
                color: 'var(--ds-text-primary)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {isHome ? 'Fluentia IELTS Masterclass' : title}
            </h1>
          </div>

          <TrainerPresence trainerName="د. علي" size="sm" />
        </div>
      </header>

      {/* Main outlet */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1280,
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
