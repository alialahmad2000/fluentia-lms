import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { GlassPanel } from '@/design-system/components'

export default function DiagnosticError({ message = 'حدث خطأ غير متوقع' }) {
  const navigate = useNavigate()
  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: 16 }} dir="rtl">
      <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 10 }}>
          تعذّر تحميل الاختبار
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 24 }}>
          {message}
        </p>
        <button
          onClick={() => navigate('/student/ielts')}
          style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}
        >
          العودة للوحة IELTS
        </button>
      </GlassPanel>
    </div>
  )
}
