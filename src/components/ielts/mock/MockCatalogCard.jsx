import { GlassPanel } from '@/design-system/components'
import { Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default function MockCatalogCard({ mock, onStart }) {
  const { isComplete, title_ar, title_en, test_number, total_time_minutes } = mock
  return (
    <GlassPanel
      hover
      style={{
        padding: 20, cursor: isComplete ? 'pointer' : 'default',
        border: isComplete ? '1px solid rgba(56,189,248,0.2)' : '1px solid rgba(255,255,255,0.06)',
        opacity: isComplete ? 1 : 0.6,
      }}
      onClick={isComplete ? onStart : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', letterSpacing: '0.06em', marginBottom: 4 }}>
            MOCK TEST #{test_number}
          </p>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
            {title_ar || title_en || `اختبار تجريبي ${test_number}`}
          </p>
        </div>
        {isComplete
          ? <CheckCircle size={18} style={{ color: '#4ade80', flexShrink: 0 }} />
          : <AlertCircle size={18} style={{ color: '#fb923c', flexShrink: 0 }} />
        }
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isComplete ? 14 : 0 }}>
        <Clock size={12} style={{ color: 'var(--text-tertiary)' }} />
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          {total_time_minutes ? `${total_time_minutes} دقيقة` : '165 دقيقة'}
        </p>
      </div>
      {!isComplete && (
        <p style={{ fontSize: 11, color: '#fb923c', fontFamily: 'Tajawal' }}>
          لم يكتمل إعداد هذا الاختبار بعد
        </p>
      )}
      {isComplete && (
        <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, fontFamily: 'Tajawal' }}>ابدأ الاختبار →</span>
      )}
    </GlassPanel>
  )
}
