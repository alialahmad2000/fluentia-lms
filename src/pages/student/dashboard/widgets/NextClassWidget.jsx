import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowLeft } from 'lucide-react'
import GlassPanel from '../../../../design-system/components/GlassPanel'
import { getArabicDay, formatTime } from '../../../../utils/dateHelpers'

function useCountdown(schedule) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (!schedule?.days?.length || !schedule?.time) return
    function calc() {
      const now = new Date()
      const [h, m] = (schedule.time || '').split(':').map(Number)
      if (isNaN(h)) return ''
      for (let offset = 0; offset < 7; offset++) {
        const candidate = new Date(now)
        candidate.setDate(now.getDate() + offset)
        candidate.setHours(h, m || 0, 0, 0)
        const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][candidate.getDay()]
        if (schedule.days.includes(dayName) && candidate > now) {
          const diff = candidate - now
          const hours = Math.floor(diff / 3600000)
          const mins = Math.floor((diff % 3600000) / 60000)
          if (hours > 24) {
            const days = Math.floor(hours / 24)
            return `بعد ${days} يوم`
          }
          return `بعد ${hours} ساعة و ${mins} دقيقة`
        }
      }
      return ''
    }
    setText(calc())
    const id = setInterval(() => setText(calc()), 60000)
    return () => clearInterval(id)
  }, [schedule])
  return text
}

// Skeleton
export function NextClassSkeleton() {
  return (
    <GlassPanel padding="md">
      <div className="space-y-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--ds-surface-2)' }} />
          <div className="h-4 w-28 rounded" style={{ background: 'var(--ds-surface-2)' }} />
        </div>
        <div className="h-4 w-40 rounded" style={{ background: 'var(--ds-surface-2)' }} />
        <div className="h-4 w-56 rounded" style={{ background: 'var(--ds-surface-2)' }} />
      </div>
    </GlassPanel>
  )
}

// Empty state
function NextClassEmpty() {
  return (
    <GlassPanel padding="md">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--ds-surface-2)' }}
        >
          <Calendar size={18} strokeWidth={1.5} style={{ color: 'var(--ds-accent-primary)' }} />
        </div>
        <h3 className="text-[16px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>
          الحصة القادمة
        </h3>
      </div>
      <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
        لا توجد مجموعة مسجلة
      </p>
    </GlassPanel>
  )
}

export default function NextClassWidget({ group, schedule }) {
  const countdown = useCountdown(schedule)
  const nextClassTime = schedule?.time

  if (!group) return <NextClassEmpty />

  return (
    <GlassPanel padding="md">
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--ds-surface-2)' }}
        >
          <Calendar size={18} strokeWidth={1.5} style={{ color: 'var(--ds-accent-primary)' }} />
        </div>
        <h3 className="text-[16px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>
          الحصة القادمة
        </h3>
        {countdown && (
          <span
            className="me-auto text-[12px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{
              background: 'var(--ds-surface-2)',
              color: 'var(--ds-accent-primary)',
            }}
          >
            <Clock size={12} strokeWidth={1.5} />
            {countdown}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-sm font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
            {group.name}
          </p>
          {schedule && (
            <p className="text-[13px]" style={{ color: 'var(--ds-text-tertiary)' }}>
              {schedule.days?.map(d => getArabicDay(d)).join(' · ')}
              {nextClassTime && (
                <span className="font-bold mr-2" style={{ color: 'var(--ds-accent-primary)' }}>
                  {formatTime(nextClassTime)}
                </span>
              )}
            </p>
          )}
        </div>
        {group.google_meet_link && (
          <a
            href={group.google_meet_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm py-2.5 px-5 inline-flex items-center gap-2 rounded-xl font-semibold transition-all min-h-[44px]"
            style={{
              background: 'var(--ds-accent-primary)',
              color: 'var(--ds-text-inverse)',
            }}
          >
            <span>دخول الحصة</span>
            <ArrowLeft size={14} />
          </a>
        )}
      </div>
    </GlassPanel>
  )
}
