import { GlassPanel } from '@/design-system/components'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const READINESS_CONFIG = {
  green: { color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)', label: 'جاهز للامتحان', desc: 'أداؤك الأخير يتجاوز هدفك — حافظ على هذا المستوى' },
  amber: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', label: 'قريب من الهدف', desc: 'فارق صغير — اختبار أو اثنان وستصل' },
  red: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'تحتاج تدريباً أكثر', desc: 'فجوة في الأداء — ركّز على أضعف المهارات أولاً' },
}

function TrendIcon({ trend }) {
  if (trend === 'up') return <TrendingUp size={16} style={{ color: '#4ade80' }} />
  if (trend === 'down') return <TrendingDown size={16} style={{ color: '#ef4444' }} />
  return <Minus size={16} style={{ color: 'var(--text-tertiary)' }} />
}

export default function ReadinessIndicator({ readiness, avgLastTwo, gap, trend, targetBand }) {
  if (!readiness || avgLastTwo == null) {
    return (
      <GlassPanel style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          أجرِ أول اختبار تجريبي لمعرفة مستوى جاهزيتك
        </p>
      </GlassPanel>
    )
  }

  const cfg = READINESS_CONFIG[readiness]

  return (
    <GlassPanel style={{ padding: 16, marginBottom: 16, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, display: 'inline-block', flexShrink: 0 }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: cfg.color, fontFamily: 'Tajawal' }}>{cfg.label}</p>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.6 }}>{cfg.desc}</p>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0, marginRight: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <TrendIcon trend={trend} />
            <span style={{ fontSize: 22, fontWeight: 900, color: cfg.color, fontFamily: 'Tajawal' }}>
              {avgLastTwo.toFixed(1)}
            </span>
          </div>
          {targetBand && (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
              الهدف: {targetBand}
            </p>
          )}
        </div>
      </div>
    </GlassPanel>
  )
}
