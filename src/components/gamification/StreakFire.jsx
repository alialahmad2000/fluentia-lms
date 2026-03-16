import { Flame } from 'lucide-react'

export default function StreakFire({ streak = 0 }) {
  // Glow intensity scales with streak length (capped at 30 for max glow)
  const glowIntensity = Math.min(streak / 30, 1)
  const glowOpacity = (0.2 + glowIntensity * 0.6).toFixed(2)
  const outerGlowOpacity = (0.1 + glowIntensity * 0.4).toFixed(2)

  return (
    <div className="flex flex-col items-center gap-1" dir="rtl">
      {/* Circular badge */}
      <div
        className={`fire-pulse relative flex items-center justify-center rounded-full`}
        style={{
          width: 56,
          height: 56,
          background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(245, 158, 11, 0.1))',
          border: '2px solid rgba(251, 146, 60, 0.4)',
          boxShadow: `0 0 16px rgba(251, 146, 60, ${glowOpacity}), 0 0 32px rgba(245, 158, 11, ${outerGlowOpacity})`,
        }}
      >
        <div className="flex flex-col items-center leading-none">
          <Flame
            size={16}
            style={{ color: '#fb923c', marginBottom: 1 }}
            fill="rgba(251, 146, 60, 0.3)"
          />
          <span
            className="font-bold text-base tabular-nums"
            style={{ color: '#fbbf24' }}
          >
            {streak}
          </span>
        </div>
      </div>

      {/* Arabic label */}
      <span
        className="text-xs font-medium"
        style={{ color: 'rgba(251, 146, 60, 0.8)' }}
      >
        يوم متتالي
      </span>
    </div>
  )
}
