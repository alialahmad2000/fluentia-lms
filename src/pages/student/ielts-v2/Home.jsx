import { Link } from 'react-router-dom'
import { Compass, ChevronLeft } from 'lucide-react'
import PlaceholderPage from './_layout/PlaceholderPage'
import BandDisplay from '@/design-system/components/masterclass/BandDisplay'

const SACRED_PAGES = [
  { path: '/student/ielts-v2/diagnostic', title: 'الاختبار التشخيصي', desc: 'نقطة البداية', phase: 'Phase 2' },
  { path: '/student/ielts-v2/reading',    title: 'القراءة — The Study', desc: 'غرفة الدراسة', phase: 'Phase 3' },
  { path: '/student/ielts-v2/listening',  title: 'الاستماع — The Theater', desc: 'المسرح', phase: 'Phase 3' },
  { path: '/student/ielts-v2/writing',    title: 'الكتابة — The Workshop', desc: 'الورشة', phase: 'Phase 3' },
  { path: '/student/ielts-v2/speaking',   title: 'المحادثة — The Interview Room', desc: 'غرفة المقابلة', phase: 'Phase 3' },
  { path: '/student/ielts-v2/mock',       title: 'الاختبار التجريبي', desc: 'بلا تنازل عن الواقع', phase: 'Phase 4' },
  { path: '/student/ielts-v2/journey',    title: 'الرحلة الكاملة', desc: '١٢ أسبوع', phase: 'Phase 1' },
  { path: '/student/ielts-v2/errors',     title: 'بنك الدروس', desc: 'أخطاؤك معلّموك', phase: 'Phase 5' },
  { path: '/student/ielts-v2/trainer',    title: 'مدربك', desc: 'الطبقة الإنسانية', phase: 'Phase 5' },
  { path: '/student/ielts-v2/readiness',  title: 'أسبوع الجاهزية', desc: 'الأسبوع ١٢', phase: 'Phase 6' },
]

export default function Home() {
  return (
    <>
      <PlaceholderPage
        icon={Compass}
        eyebrow="Masterclass Scaffold"
        headline="ابدأ بالرحلة. البقية تأتي."
        lines={[
          'هذا المكان سيكون بوابتك إلى البنتة.',
          'رحلة ١٢ أسبوع — مُحسوبة، هادئة، لا سباق فيها.',
          'كل ما تحتاجه — في بيت واحد.',
        ]}
      >
        <div style={{
          marginTop: 20,
          padding: '28px 24px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--ds-surface-1)',
          border: '1px solid var(--ds-border-subtle)',
          maxWidth: 360,
          margin: '20px auto 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ds-text-tertiary)', letterSpacing: 1.5, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            BAND PREVIEW
          </div>
          <BandDisplay band={7.0} size="lg" label="هدفك" animate />
        </div>
      </PlaceholderPage>

      {/* Sacred pages grid */}
      <div style={{ maxWidth: 980, margin: '72px auto 0' }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--ds-text-tertiary)',
          letterSpacing: 2,
          marginBottom: 20,
          textAlign: 'center',
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}>
          ━━━  الصفحات المقدّسة  ━━━
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 14,
        }}>
          {SACRED_PAGES.map((p) => (
            <Link
              key={p.path}
              to={p.path}
              style={{
                padding: '18px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--ds-surface-1)',
                border: '1px solid var(--ds-border-subtle)',
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                transition: 'border-color var(--motion-base) var(--ease-out), transform var(--motion-base) var(--ease-out)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ds-sky)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ds-border-subtle)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ds-amber)', letterSpacing: 1.5, fontFamily: "'IBM Plex Sans', sans-serif" }}>{p.phase}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ds-text-primary)', fontFamily: "'Tajawal', sans-serif" }}>{p.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ds-text-tertiary)', fontFamily: "'Tajawal', sans-serif" }}>{p.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: 'var(--ds-sky)', fontWeight: 700, fontFamily: "'Tajawal', sans-serif" }}>
                <ChevronLeft size={12} aria-hidden="true" />
                افتح
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
