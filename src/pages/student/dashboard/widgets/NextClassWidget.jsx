import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, ArrowLeft, Users, User } from 'lucide-react'
import GlassPanel from '../../../../design-system/components/GlassPanel'
import { getArabicDay, formatTime } from '../../../../utils/dateHelpers'
import { supabase } from '../../../../lib/supabase'

const AR_DOW = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const riyadhTime = (iso) =>
  new Intl.DateTimeFormat('ar-SA-u-nu-latn', { timeZone: 'Asia/Riyadh', hour: 'numeric', minute: '2-digit' })
    .format(new Date(iso))
const riyadhDowOf = (iso) =>
  new Date(new Date(iso).getTime() + 3 * 3600 * 1000).getUTCDay()

// Real coordinator-managed sessions (class_sessions) — the new source of truth.
function useUpcomingSessions() {
  return useQuery({
    queryKey: ['student-upcoming-sessions'],
    staleTime: 60_000, refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase.rpc('student_upcoming_sessions', { p_limit: 4 })
      if (error) throw error
      return data || []
    },
  })
}

// Arabic count words (1 يوم / يومين / 3-10 أيام / 11+ يوم)
const arDays = (n) => n === 1 ? 'يوم واحد' : n === 2 ? 'يومين' : n <= 10 ? `${n} أيام` : `${n} يومًا`
const arHours = (n) => n === 1 ? 'ساعة' : n === 2 ? 'ساعتين' : n <= 10 ? `${n} ساعات` : `${n} ساعة`
const arMins = (n) => n === 1 ? 'دقيقة' : n === 2 ? 'دقيقتين' : n <= 10 ? `${n} دقائق` : `${n} دقيقة`

function useSessionCountdown(startIso, endIso) {
  const [text, setText] = useState('')
  const [live, setLive] = useState(false)
  useEffect(() => {
    if (!startIso) return
    function calc() {
      const now = Date.now()
      const start = new Date(startIso).getTime()
      const end = endIso ? new Date(endIso).getTime() : start + 3600_000
      if (now >= start && now <= end) { setLive(true); setText('الحصة جارية الآن'); return }
      setLive(false)
      const diff = start - now
      if (diff <= 0) { setText(''); return }
      const hours = Math.floor(diff / 3600_000)
      const mins = Math.floor((diff % 3600_000) / 60_000)
      if (hours > 24) setText(`بعد ${arDays(Math.floor(hours / 24))}`)
      else if (hours > 0) setText(`بعد ${arHours(hours)} و${arMins(mins)}`)
      else setText(`بعد ${arMins(mins)}`)
    }
    calc()
    const id = setInterval(calc, 30_000)
    return () => clearInterval(id)
  }, [startIso, endIso])
  return { text, live }
}

// Legacy countdown for the groups.schedule JSONB fallback path.
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
          if (hours > 24) return `بعد ${arDays(Math.floor(hours / 24))}`
          return `بعد ${arHours(hours)} و${arMins(mins)}`
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

function Header({ countdown, live, hideTitle = false }) {
  // hideTitle: when the parent section already labels the widget (e.g. the
  // Spotlight dashboard's "حصّتك القادمة" section), skip the duplicate title
  // and show only the countdown chip.
  if (hideTitle) {
    if (!countdown) return null
    return (
      <div className="flex items-center mb-4">
        <span className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{
            background: live ? 'rgba(74, 222, 128, 0.12)' : 'var(--ds-surface-2)',
            color: live ? 'var(--ds-accent-success, #4ade80)' : 'var(--ds-accent-primary)',
          }}>
          <Clock size={12} strokeWidth={1.5} />
          {countdown}
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--ds-surface-2)' }}>
        <Calendar size={18} strokeWidth={1.5} style={{ color: 'var(--ds-accent-primary)' }} />
      </div>
      <h3 className="text-[16px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>
        الحصة القادمة
      </h3>
      {countdown && (
        <span className="me-auto text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{
            background: live ? 'rgba(74, 222, 128, 0.12)' : 'var(--ds-surface-2)',
            color: live ? 'var(--ds-accent-success, #4ade80)' : 'var(--ds-accent-primary)',
          }}>
          <Clock size={12} strokeWidth={1.5} />
          {countdown}
        </span>
      )}
    </div>
  )
}

// New path: a real coordinator-scheduled session with its own link.
function SessionView({ sessions, hideTitle }) {
  const next = sessions[0]
  const rest = sessions.slice(1, 3)
  const { text: countdown, live } = useSessionCountdown(next.start_at, next.end_at)
  const isGroup = next.type === 'group'

  return (
    <GlassPanel padding="md">
      <Header countdown={countdown} live={live} hideTitle={hideTitle} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--ds-text-primary)' }}>
            {isGroup
              ? <Users size={14} strokeWidth={1.5} style={{ color: 'var(--ds-accent-primary)' }} />
              : <User size={14} strokeWidth={1.5} style={{ color: 'var(--ds-accent-primary)' }} />}
            <span className="truncate">
              {isGroup ? `حصة ${next.group_name || 'المجموعة'}` : 'حصتك الفردية'}
              {next.trainer_name ? ` مع ${next.trainer_name}` : ''}
            </span>
          </p>
          <p className="text-[13px]" style={{ color: 'var(--ds-text-tertiary)' }}>
            {AR_DOW[riyadhDowOf(next.start_at)]}
            <span className="font-bold mr-2" style={{ color: 'var(--ds-accent-primary)' }}>
              {riyadhTime(next.start_at)}
            </span>
          </p>
        </div>
        {next.meeting_link && (
          <a href={next.meeting_link} target="_blank" rel="noopener noreferrer"
            className="text-sm py-2.5 px-5 inline-flex items-center gap-2 rounded-xl font-semibold transition-all min-h-[44px]"
            style={{
              background: live ? 'var(--ds-accent-success, #4ade80)' : 'var(--ds-accent-primary)',
              color: 'var(--ds-text-inverse)',
            }}>
            <span>دخول الحصة</span>
            <ArrowLeft size={14} />
          </a>
        )}
      </div>

      {rest.length > 0 && (
        <div className="mt-4 pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.06))' }}>
          {rest.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-[12px]">
              <span className="truncate" style={{ color: 'var(--ds-text-tertiary)' }}>
                {s.type === 'group' ? (s.group_name || 'حصة جماعية') : 'حصة فردية'}
                {s.trainer_name ? ` · ${s.trainer_name}` : ''}
              </span>
              <span className="tabular-nums shrink-0" style={{ color: 'var(--ds-text-muted)' }}>
                {AR_DOW[riyadhDowOf(s.start_at)]} {riyadhTime(s.start_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  )
}

// Legacy path: fixed weekly group schedule from groups.schedule JSONB.
function LegacyView({ group, schedule, hideTitle }) {
  const countdown = useCountdown(schedule)
  const nextClassTime = schedule?.time

  return (
    <GlassPanel padding="md">
      <Header countdown={countdown} live={false} hideTitle={hideTitle} />
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
          <a href={group.google_meet_link} target="_blank" rel="noopener noreferrer"
            className="text-sm py-2.5 px-5 inline-flex items-center gap-2 rounded-xl font-semibold transition-all min-h-[44px]"
            style={{ background: 'var(--ds-accent-primary)', color: 'var(--ds-text-inverse)' }}>
            <span>دخول الحصة</span>
            <ArrowLeft size={14} />
          </a>
        )}
      </div>
    </GlassPanel>
  )
}

function NextClassEmpty() {
  return (
    <GlassPanel padding="md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--ds-surface-2)' }}>
          <Calendar size={18} strokeWidth={1.5} style={{ color: 'var(--ds-accent-primary)' }} />
        </div>
        <h3 className="text-[16px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>
          الحصة القادمة
        </h3>
      </div>
      <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
        لا توجد حصص مجدولة بعد — عندما تُحدَّد حصة، يظهر موعدها ورابطها هنا
      </p>
    </GlassPanel>
  )
}

export default function NextClassWidget({ group, schedule, hideTitle = false }) {
  const { data: sessions = [], isLoading } = useUpcomingSessions()

  // Coordinator-scheduled sessions win; legacy group schedule is the fallback.
  if (sessions.length > 0) return <SessionView sessions={sessions} hideTitle={hideTitle} />
  if (isLoading && !group) return <NextClassSkeleton />
  if (group && (schedule?.days?.length || group.google_meet_link)) {
    return <LegacyView group={group} schedule={schedule} hideTitle={hideTitle} />
  }
  return <NextClassEmpty />
}
