import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './AIInsightCard.css'

export default function AIInsightCard({ insight, loading, onRefresh, refreshing }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const TONE_CONFIG = {
    urgent:    { label: t('trainer.student360.tone_urgent', 'عاجل'),      cls: 'ai-tone--urgent',    icon: '🚨' },
    celebrate: { label: t('trainer.student360.tone_celebrate', 'إنجاز'),  cls: 'ai-tone--celebrate', icon: '🎉' },
    nurture:   { label: t('trainer.student360.tone_nurture', 'متابعة'),   cls: 'ai-tone--nurture',   icon: '🌱' },
    observe:   { label: t('trainer.student360.tone_observe', 'مراقبة'),   cls: 'ai-tone--observe',   icon: '👁️' },
  }

  if (loading) {
    return (
      <div className="aic-card aic-card--loading">
        <div className="aic-skeleton aic-skeleton--title" />
        <div className="aic-skeleton aic-skeleton--body" />
        <div className="aic-skeleton aic-skeleton--action" />
      </div>
    )
  }

  if (!insight) {
    return (
      <div className="aic-card aic-card--empty">
        <span className="aic-empty-icon">🤖</span>
        <p>{t('trainer.student360.ai_no_insight', 'لا يوجد تحليل ذكاء اصطناعي بعد')}</p>
        <button className="aic-refresh-btn" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? t('trainer.student360.analyzing', 'يحلل…') : t('trainer.student360.generate_insight', 'توليد تحليل')}
        </button>
      </div>
    )
  }

  const tone = TONE_CONFIG[insight.tone] || TONE_CONFIG.observe
  const ageText = insight.cached && insight.age_hours != null
    ? `(منذ ${Math.round(insight.age_hours)} ساعة)`
    : ''

  return (
    <div className={`aic-card ${tone.cls}`}>
      <div className="aic-header">
        <div className="aic-title-row">
          <span className="aic-tone-badge">{tone.icon} {tone.label}</span>
          <span className="aic-age">{ageText}</span>
        </div>
        <button
          className="aic-refresh-btn aic-refresh-btn--icon"
          onClick={onRefresh}
          disabled={refreshing}
          title={t('trainer.student360.refresh_analysis', 'تحديث التحليل')}
        >
          {refreshing ? '⏳' : '🔄'}
        </button>
      </div>

      <p className="aic-diagnosis">{insight.diagnosis}</p>
      <p className="aic-action">{insight.recommended_action}</p>

      {insight.evidence?.length > 0 && (
        <button className="aic-evidence-toggle" onClick={() => setExpanded(v => !v)}>
          {expanded ? t('trainer.student360.hide_evidence', 'إخفاء الأدلة ▲') : t('trainer.student360.show_evidence', 'عرض الأدلة ▼')}
        </button>
      )}

      {expanded && (
        <ul className="aic-evidence-list">
          {insight.evidence.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </div>
  )
}
