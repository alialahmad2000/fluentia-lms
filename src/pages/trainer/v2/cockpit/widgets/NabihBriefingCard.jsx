import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useTrainerCockpit } from '@/hooks/trainer/useTrainerCockpit'
import { useStudentPulse } from '@/hooks/trainer/useStudentPulse'
import { useInterventionPreview } from '@/hooks/trainer/useInterventionPreview'
import { CommandCard } from '@/design-system/trainer'

function NabihMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="16.5" fill="none" stroke="var(--tr-primary)" strokeWidth="1.5" />
      <text
        x="18" y="25"
        textAnchor="middle"
        fontSize="20"
        fontFamily="Cairo, Tajawal, sans-serif"
        fontWeight="800"
        fill="var(--tr-primary)"
      >ن</text>
    </svg>
  )
}

export default function NabihBriefingCard() {
  const profile = useAuthStore((s) => s.profile)
  const { data: cockpit } = useTrainerCockpit()
  const { data: pulse } = useStudentPulse()
  const { data: interventions = [] } = useInterventionPreview(50)

  const students = pulse?.students || []
  const competition = cockpit?.competition
  const firstName = profile?.full_name?.split(' ')[0] || 'أستاذ'

  const silent48 = useMemo(() => {
    return students.filter(s => {
      if (!s.last_active_at) return true
      const hours = (Date.now() - new Date(s.last_active_at).getTime()) / 3600000
      return hours >= 48
    })
  }, [students])

  const topPerformer = useMemo(() => {
    if (students.length === 0) return null
    return [...students].sort((a, b) => (b.xp_total || 0) - (a.xp_total || 0))[0]
  }, [students])

  const daysRemaining = useMemo(() => {
    if (!competition?.end_at) return null
    return Math.ceil((new Date(competition.end_at) - Date.now()) / 86400000)
  }, [competition])

  const urgentCount = interventions.filter(i => i.severity === 'urgent').length

  const lines = useMemo(() => {
    const h = new Date().getHours()
    const greeting = h < 12 ? 'صباح الخير' : h < 17 ? 'مرحباً' : 'مساء الخير'
    return [
      `${greeting}، ${firstName}.`,
      urgentCount > 0
        ? `لديك ${urgentCount} ${urgentCount === 1 ? 'متابعة عاجلة' : 'متابعات عاجلة'} تنتظرك.`
        : students.length === 0
        ? 'لا يوجد طلاب في مجموعاتك حتى الآن.'
        : silent48.length > 0
        ? `${silent48.length} ${silent48.length === 1 ? 'طالب لم يدخل' : 'طلاب لم يدخلوا'} منذ ٤٨ ساعة — يستحقون رسالة منك.`
        : 'كل طلابك نشطون — بيئة صحية. أحسنت.',
      topPerformer && students.length > 0
        ? `${topPerformer.full_name} تتألق بـ ${(topPerformer.xp_total || 0).toLocaleString('ar')} نقطة.`
        : null,
      competition && daysRemaining !== null
        ? `المسابقة: ${daysRemaining} ${daysRemaining === 1 ? 'يوم متبقٍ' : 'أيام متبقية'}.`
        : null,
    ].filter(Boolean)
  }, [firstName, urgentCount, students, silent48, topPerformer, competition, daysRemaining])

  return (
    <CommandCard className="tr-nabih-card">
      <div className="tr-nabih-card__header">
        <div className="tr-nabih-card__mark">
          <NabihMark />
        </div>
        <div>
          <div className="tr-nabih-card__name">نبيه</div>
          <div className="tr-nabih-card__status">إشاراتك اليومية</div>
        </div>
      </div>

      <div className="tr-nabih-card__body" aria-live="polite">
        {lines.map((line, i) => (
          <p key={i} className={`tr-nabih-card__line ${i === 0 ? 'tr-nabih-card__line--greeting' : ''}`}>
            {line}
          </p>
        ))}
      </div>

      {urgentCount > 0 && (
        <Link to="/trainer/interventions" className="tr-nabih-card__cta tr-nabih-card__cta--urgent">
          افتح قائمة المتابعة ({urgentCount})
          <span aria-hidden="true"> ←</span>
        </Link>
      )}
      <Link to="/trainer/nabih" className="tr-nabih-card__cta tr-nabih-card__cta--chat">
        💬 تكلم مع نبيه
        <span aria-hidden="true"> ←</span>
      </Link>
    </CommandCard>
  )
}
