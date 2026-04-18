import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { GlassPanel } from '@/design-system/components'

const SECTION_LABELS = {
  reading:    'معمل القراءة',
  listening:  'معمل الاستماع',
  writing:    'معمل الكتابة',
  speaking:   'معمل المحادثة',
  mock:       'الاختبارات التجريبية',
  diagnostic: 'الاختبار التشخيصي',
  plan:       'خطتي الذكية',
  errors:     'بنك أخطائي',
}

export default function IELTSComingSoon() {
  const { section } = useParams()
  const navigate = useNavigate()
  const label = SECTION_LABELS[section] || 'هذه الصفحة'

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }} dir="rtl">
      <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, fontFamily: 'Tajawal' }}>
          {label}
        </h1>
        <p style={{ color: 'var(--text-tertiary)', marginBottom: 24, lineHeight: 1.8, fontFamily: 'Tajawal' }}>
          نحضّرها لك بعناية. ستكون جاهزة قريباً.
        </p>
        <button
          onClick={() => navigate('/student/ielts')}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            background: 'var(--accent-sky, #38bdf8)',
            color: '#fff',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Tajawal',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          رجوع للوحة IELTS
          <ArrowRight size={16} style={{ transform: 'scaleX(-1)' }} />
        </button>
      </GlassPanel>
    </div>
  )
}
