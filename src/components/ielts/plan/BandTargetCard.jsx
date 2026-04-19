import { computeDaysLeft } from '@/lib/ielts/plan-generator'

function bandColor(b) {
  if (b == null) return 'var(--text-tertiary)'
  return b >= 7 ? '#4ade80' : b >= 5.5 ? '#38bdf8' : '#fb923c'
}

export default function BandTargetCard({ plan, onEdit }) {
  const current = plan?.current_band_estimate ? Number(plan.current_band_estimate) : null
  const target = plan?.target_band ? Number(plan.target_band) : null
  const daysLeft = computeDaysLeft(plan?.target_exam_date)
  const variant = plan?.test_variant || 'academic'
  const gap = current != null && target != null ? +(target - current).toFixed(1) : null

  return (
    <div style={{ padding: 24, borderRadius: 16, background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        {/* Current → Target */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: bandColor(current), fontFamily: 'Tajawal', lineHeight: 1 }}>
              {current != null ? current.toFixed(1) : '–'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginTop: 4 }}>مستواك الحالي</div>
          </div>
          <div style={{ fontSize: 22, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>←</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#38bdf8', fontFamily: 'Tajawal', lineHeight: 1 }}>
              {target != null ? target.toFixed(1) : '–'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginTop: 4 }}>هدفك</div>
          </div>
          {gap != null && gap > 0 && (
            <div style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fb923c', fontFamily: 'Tajawal' }}>{gap} نقطة للهدف</span>
            </div>
          )}
          {gap != null && gap <= 0 && (
            <div style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', fontFamily: 'Tajawal' }}>وصلت للهدف!</span>
            </div>
          )}
        </div>

        {/* Exam countdown + variant */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {daysLeft != null && daysLeft > 0 && (
            <div style={{ textAlign: 'center', padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: daysLeft <= 30 ? '#fb923c' : 'var(--text-primary)', fontFamily: 'Tajawal', lineHeight: 1 }}>{daysLeft}</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>يوم للامتحان</div>
            </div>
          )}
          {daysLeft != null && daysLeft <= 0 && (
            <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontFamily: 'Tajawal', border: '1px solid rgba(239,68,68,0.2)' }}>
              تاريخ الامتحان مضى
            </span>
          )}
          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)', fontFamily: 'sans-serif', border: '1px solid rgba(255,255,255,0.07)' }}>
            {variant === 'general_training' ? 'General Training' : 'Academic'}
          </span>
          <button
            onClick={onEdit}
            style={{ fontSize: 12, color: '#38bdf8', fontFamily: 'Tajawal', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            تعديل
          </button>
        </div>
      </div>
    </div>
  )
}
