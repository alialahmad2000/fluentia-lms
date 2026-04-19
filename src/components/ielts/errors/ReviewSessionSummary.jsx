import { useNavigate } from 'react-router-dom'
import { GlassPanel } from '@/design-system/components'

export default function ReviewSessionSummary({ correct, wrong, mastered, onRestart }) {
  const navigate = useNavigate()
  const total = correct + wrong
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0

  return (
    <GlassPanel style={{ padding: 40, textAlign: 'center' }} dir="rtl">
      <div style={{ fontSize: 52, marginBottom: 16 }}>{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 8 }}>
        انتهت جلسة المراجعة
      </h2>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#4ade80', fontFamily: 'Tajawal' }}>{correct}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>إجابات صحيحة</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#ef4444', fontFamily: 'Tajawal' }}>{wrong}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>تحتاج مراجعة</div>
        </div>
        {mastered > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fbbf24', fontFamily: 'Tajawal' }}>{mastered}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>تم إتقانها 🏆</div>
          </div>
        )}
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.6, marginBottom: 24 }}>
        {pct >= 80
          ? 'أداء ممتاز! استمر في هذا المستوى.'
          : pct >= 50
          ? 'جيد — الأخطاء التي راجعتها ستُجدوَل بشكل أذكى.'
          : 'لا بأس — المراجعة المتكررة هي السر. ستتحسن قريباً.'}
      </p>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/student/ielts/errors')}
          style={{ padding: '11px 22px', borderRadius: 12, background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1.5px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}
        >
          بنك الأخطاء
        </button>
        <button
          onClick={() => navigate('/student/ielts/plan')}
          style={{ padding: '11px 22px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}
        >
          خطتي
        </button>
      </div>
    </GlassPanel>
  )
}
