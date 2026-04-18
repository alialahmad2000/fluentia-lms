import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Flame } from 'lucide-react'
import { CommandCard } from '@/design-system/trainer'

function useCountUp(value, duration = 800) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) { setDisplay(value); return }
    const start = performance.now()
    const from = display
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])
  return display
}

export default function TrainerXpTicker({ totals }) {
  const today = totals?.today_xp || 0
  const total = totals?.total_xp || 0
  const streak = totals?.streak?.current || 0
  const mult = totals?.streak?.multiplier || 1.0

  const animatedToday = useCountUp(today)
  const animatedTotal = useCountUp(total)

  return (
    <CommandCard className="tr-xp-ticker">
      <div className="tr-xp-ticker__label">نمو اليوم</div>
      <div className="tr-xp-ticker__value" aria-live="polite">
        <span className="tr-xp-ticker__num">{animatedToday.toLocaleString('ar')}</span>
        <span className="tr-xp-ticker__unit">XP</span>
      </div>

      {streak > 0 && (
        <div className="tr-xp-ticker__streak">
          <Flame size={14} aria-hidden="true" />
          <span>{streak} يوم</span>
          {mult > 1.0 && (
            <span className="tr-xp-ticker__mult">×{mult}</span>
          )}
        </div>
      )}

      <div className="tr-xp-ticker__total">
        إجمالي: {animatedTotal.toLocaleString('ar')} XP
      </div>

      <Link to="/trainer/my-growth" className="tr-xp-ticker__link">
        <TrendingUp size={13} aria-hidden="true" />
        عرض الرحلة
      </Link>
    </CommandCard>
  )
}
