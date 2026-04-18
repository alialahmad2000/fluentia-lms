import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Clock, FileCheck, Bell, Clapperboard } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useInterventionPreview } from '@/hooks/trainer/useInterventionPreview'

function useNextClass(trainerId) {
  return useQuery({
    queryKey: ['trainer-next-class', trainerId],
    queryFn: async () => {
      if (!trainerId) return null
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('classes')
        .select('id, date, start_time, end_time, title, topic, google_meet_link, status, group_id, groups(name, level)')
        .eq('trainer_id', trainerId)
        .eq('status', 'scheduled')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle()
      return data
    },
    enabled: !!trainerId,
    staleTime: 60000,
  })
}

function useGradingCount(trainerId) {
  return useQuery({
    queryKey: ['trainer-grading-count', trainerId],
    queryFn: async () => {
      if (!trainerId) return 0
      const { count } = await supabase
        .from('student_curriculum_progress')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .eq('section_type', 'writing')
        .is('trainer_graded_at', null)
      return count || 0
    },
    enabled: !!trainerId,
    staleTime: 60000,
  })
}

function buildClassDateTime(cls) {
  if (!cls) return null
  return new Date(`${cls.date}T${cls.start_time}`)
}

function formatCountdown(ms) {
  if (ms <= 0) return 'الآن'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}س ${m}د`
  return `${m}د`
}

export default function AgendaStrip({ groupCount }) {
  const profile = useAuthStore((s) => s.profile)
  const trainerId = profile?.id
  const { data: nextClass } = useNextClass(trainerId)
  const { data: gradingCount = 0 } = useGradingCount(trainerId)
  const { data: interventions = [] } = useInterventionPreview(20)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const classDate = buildClassDateTime(nextClass)
  const msTillClass = classDate ? classDate.getTime() - now : null
  const isWithin24h = msTillClass !== null && msTillClass > 0 && msTillClass < 86400000
  const isWithin6h = msTillClass !== null && msTillClass > 0 && msTillClass < 21600000
  const isPast = msTillClass !== null && msTillClass <= 0

  return (
    <div className="tr-agenda">
      {/* Next class */}
      <div className="tr-agenda__item">
        <Clock size={14} className="tr-agenda__icon" aria-hidden="true" />
        {!nextClass ? (
          <span className="tr-agenda__text tr-agenda__text--muted">لا كلاسات مجدولة</span>
        ) : isWithin24h && !isPast ? (
          <span className="tr-agenda__text tr-agenda__text--live">
            الكلاس بعد {formatCountdown(msTillClass)} · {nextClass.groups?.name}
          </span>
        ) : (
          <span className="tr-agenda__text">
            الكلاس القادم: {nextClass.date} · {nextClass.start_time?.slice(0, 5)} · {nextClass.groups?.name}
          </span>
        )}
        {isWithin6h && (
          <Link to="/trainer/prep" className="tr-agenda__prep-btn" aria-label="تحضير الكلاس">
            <Clapperboard size={12} />
            تحضير
          </Link>
        )}
      </div>

      {/* Grading */}
      <div className="tr-agenda__item">
        <FileCheck size={14} className="tr-agenda__icon" aria-hidden="true" />
        {gradingCount > 0 ? (
          <Link to="/trainer/grading" className="tr-agenda__text tr-agenda__text--alert">
            {gradingCount} واجب ينتظر التصحيح
          </Link>
        ) : (
          <span className="tr-agenda__text tr-agenda__text--muted">لا تصحيحات معلّقة</span>
        )}
      </div>

      {/* Interventions */}
      <div className="tr-agenda__item">
        <Bell size={14} className="tr-agenda__icon" aria-hidden="true" />
        {interventions.length > 0 ? (
          <Link to="/trainer/interventions" className="tr-agenda__text tr-agenda__text--alert">
            {interventions.length} {interventions.length === 1 ? 'طالب يحتاج متابعة' : 'طلاب يحتاجون متابعة'}
          </Link>
        ) : (
          <span className="tr-agenda__text tr-agenda__text--muted">لا متابعات عاجلة</span>
        )}
      </div>

      {/* Groups */}
      <div className="tr-agenda__item">
        <span className="tr-agenda__dot" aria-hidden="true" />
        <span className="tr-agenda__text tr-agenda__text--muted">
          {groupCount > 0 ? `${groupCount} ${groupCount === 1 ? 'مجموعة' : 'مجموعات'} نشطة` : 'لا مجموعات'}
        </span>
      </div>
    </div>
  )
}
