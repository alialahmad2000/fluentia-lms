import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NabihInlineCard({ students = [], interventions = [], trainerName }) {
  const { t } = useTranslation()
  const firstName = trainerName?.split(' ').pop() || 'أستاذ'

  const suggestion = useMemo(() => {
    const urgentCount = interventions.filter(i => i.severity === 'urgent').length

    if (urgentCount > 0) {
      const top = interventions.find(i => i.severity === 'urgent')
      return top
        ? `${top.student_name} تحتاج انتباهك الآن — ${top.reason_ar || top.reason_code}. اسألني كيف أتعامل معها.`
        : `لديك ${urgentCount} حالات عاجلة — اسألني عن أفضل طريقة للتدخل.`
    }

    const silent = students.filter(s => {
      if (!s.last_active_at) return true
      return (Date.now() - new Date(s.last_active_at).getTime()) / 3600000 >= 48
    })

    if (silent.length > 0) {
      const name = silent[0].full_name
      return `${name} لم تدخل المنصة منذ ٤٨ ساعة. جرّب ترسل لها رسالة تشجيعية — اسألني عن النص المناسب.`
    }

    if (students.length > 0) {
      const top = [...students].sort((a, b) => (b.xp_total || 0) - (a.xp_total || 0))[0]
      return top
        ? `${top.full_name} في القمة بـ ${(top.xp_total || 0).toLocaleString('ar-SA')} نقطة. اسألني كيف تحافظ على هذا الزخم لبقية المجموعة.`
        : 'طلابك نشطون. اسألني عن أفضل خطوة تالية.'
    }

    return null
  }, [students, interventions, firstName])

  if (!suggestion) return null

  return (
    <section className="db-section">
      <h2 className="db-section__title">
        <span style={{ color: 'var(--tr-primary)', fontWeight: 800 }}>ن</span>
        {t('trainer.cockpit.nabih')}
      </h2>

      <p className="db-nabih__suggestion">"{suggestion}"</p>
      <p className="db-nabih__meta">{t('trainer.cockpit.nabih_meta', 'مُشتق من بيانات طلابك الحقيقية الآن')}</p>

      <div className="db-section__footer">
        <Link to="/trainer" className="db-section__link">
          💬 {t('trainer.cockpit.title')} ←
        </Link>
      </div>
    </section>
  )
}
