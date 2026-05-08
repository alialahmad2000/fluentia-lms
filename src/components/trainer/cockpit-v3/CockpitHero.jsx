import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'

function greeting(h) {
  if (h < 12) return 'صباح الخير'
  if (h < 17) return 'مساء الخير'
  return 'مساء النور'
}

function greetingEmoji(h) {
  if (h < 12) return '🌅'
  if (h < 17) return '☀️'
  return '🌙'
}

function arabicNum(n) {
  return n.toLocaleString('ar-SA')
}

export function resolveHeroState({ nextClass, hasDoneMorningRitual, hourNow }) {
  if (nextClass) {
    const minutesUntil = nextClass.minutesUntil ?? null
    if (minutesUntil !== null && minutesUntil <= 0 && minutesUntil > -90) {
      return { kind: 'live', subtitle: `حصة جارية — ${nextClass.groupName}`, cta: 'افتح وضع الحصة', to: '/trainer', external: false }
    }
    if (minutesUntil !== null && minutesUntil > 0 && minutesUntil <= 30) {
      return {
        kind: 'pre-class',
        subtitle: `الحصة بعد ${arabicNum(minutesUntil)} دقيقة — ${nextClass.groupName}`,
        cta: 'تحضير الحصة',
        to: '/trainer',
        external: false,
      }
    }
  }
  if (hourNow < 10 && !hasDoneMorningRitual) {
    return { kind: 'morning', subtitle: 'ابدأ يومك بطقس الصباح — ٣ دقائق تفرق', cta: 'ابدأ طقس الصباح (+٣ XP)', to: null, external: false }
  }
  if (hourNow >= 18) {
    return { kind: 'evening', subtitle: 'نهاية اليوم — شوف كيف كان أداؤك', cta: 'شوف ملخص اليوم', to: '/trainer/students', external: false }
  }
  return { kind: 'default', subtitle: 'كل شيء جاهز — ابدأ بالطلاب', cta: 'افتح قائمة الطلاب', to: '/trainer/students', external: false }
}

export default function CockpitHero({ state, totals, students, trainerName, todayRitual }) {
  const { t } = useTranslation()
  const profile = useAuthStore((s) => s.profile)
  const qc = useQueryClient()
  const [ritualLoading, setRitualLoading] = useState(false)
  const h = new Date().getHours()
  const firstName = trainerName?.split(' ').pop() || trainerName || 'أستاذ'

  const todayXp = totals?.today_xp ?? 0
  const streak = totals?.streak?.current ?? 0
  const activeCount = students?.length ?? 0

  async function handleMorningRitual() {
    if (!profile?.id || ritualLoading) return
    setRitualLoading(true)
    await supabase.rpc('start_morning_ritual', { p_trainer_id: profile.id })
    setRitualLoading(false)
    qc.invalidateQueries({ queryKey: ['trainer-cockpit'] })
  }

  const CtaElement = state.to
    ? ({ children }) => <Link to={state.to} className={`db-hero__cta db-hero__cta--${state.kind}`}>{children}</Link>
    : ({ children }) => (
        <button
          className={`db-hero__cta db-hero__cta--${state.kind}`}
          onClick={handleMorningRitual}
          disabled={ritualLoading}
        >
          {children}
        </button>
      )

  return (
    <div className={`db-hero db-hero--${state.kind}`}>
      <div className="db-hero__greeting">
        {greetingEmoji(h)} {greeting(h)}، {firstName}
      </div>
      <div className="db-hero__subtitle">{state.subtitle}</div>
      <CtaElement>{state.cta} ←</CtaElement>

      <div className="db-hero__stats">
        <span className="db-hero__stat">
          <span>⚡</span>
          <span className="db-hero__stat-val">{arabicNum(todayXp)}</span>
          <span>{t('trainer.cockpit.xp_today', 'XP اليوم')}</span>
        </span>
        <span className="db-hero__stat-sep">•</span>
        <span className="db-hero__stat">
          <span>🔥</span>
          <span className="db-hero__stat-val">{arabicNum(streak)}</span>
          <span>{t('trainer.students.streak_days')}</span>
        </span>
        <span className="db-hero__stat-sep">•</span>
        <span className="db-hero__stat">
          <span className="db-hero__stat-val">{arabicNum(activeCount)}</span>
          <span>{t('trainer.cockpit.active_students', 'طالب نشط')}</span>
        </span>
      </div>
    </div>
  )
}
