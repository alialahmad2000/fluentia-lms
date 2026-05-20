import { AlertTriangle, Lightbulb } from 'lucide-react'

const SEVERITY_LABEL_AR = {
  high: 'خطر عالي',
  medium: 'متوسط',
  low: 'منخفض',
}

const SEVERITY_COLORS = {
  high: { bg: 'rgba(239,68,68,0.18)', text: 'rgb(239,68,68)', border: 'rgba(239,68,68,0.45)' },
  medium: { bg: 'rgba(245,158,11,0.18)', text: 'rgb(245,158,11)', border: 'rgba(245,158,11,0.45)' },
  low: { bg: 'rgba(250,204,21,0.15)', text: 'rgb(202,138,4)', border: 'rgba(250,204,21,0.35)' },
}

/**
 * PronunciationSection — red-tinted alert card.
 * CONDITIONAL — renders null when no pronunciation_alert data exists.
 *
 * Production JSONB shape (verified Phase A.2):
 *   ipa, severity, has_alert, rule_category, similar_words[],
 *   explanation_ar, practice_tip_ar, problem_letters[],
 *   correct_approximation_ar, common_mispronunciation_ar
 */
export default function PronunciationSection({ alert }) {
  if (!alert || alert.has_alert === false) return null

  const severity = alert.severity || 'medium'
  const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium

  return (
    <section
      className="space-y-3"
      style={{ marginBottom: 20 }}
      dir="rtl"
    >
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-1.5 font-['Tajawal'] font-bold"
          style={{
            color: 'var(--text-secondary)',
            fontSize: 13,
          }}
        >
          <AlertTriangle size={14} style={{ color: 'rgb(239,68,68)' }} />
          <span>تحذير في النطق</span>
        </div>
        {SEVERITY_LABEL_AR[severity] && (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full font-['Tajawal'] font-bold"
            style={{
              background: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              fontSize: 11,
            }}
          >
            {SEVERITY_LABEL_AR[severity]}
          </span>
        )}
      </div>

      <div
        className="rounded-xl p-3 space-y-3"
        style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.22)',
        }}
      >
        {alert.ipa && (
          <div
            className="font-['Inter'] text-center"
            dir="ltr"
            style={{
              color: 'var(--text-tertiary, rgba(255,255,255,0.55))',
              fontSize: 14,
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {alert.ipa}
          </div>
        )}

        <div className="space-y-1.5">
          {alert.correct_approximation_ar && (
            <div className="flex items-baseline gap-2 font-['Tajawal']" dir="rtl">
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>الصحيح:</span>
              <span
                style={{
                  color: 'rgb(34,197,94)',
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                {alert.correct_approximation_ar}
              </span>
            </div>
          )}
          {alert.common_mispronunciation_ar && (
            <div className="flex items-baseline gap-2 font-['Tajawal']" dir="rtl">
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>لا تنطقها:</span>
              <span
                style={{
                  color: 'rgb(239,68,68)',
                  textDecoration: 'line-through',
                  fontSize: 15,
                }}
              >
                {alert.common_mispronunciation_ar}
              </span>
            </div>
          )}
        </div>

        {alert.explanation_ar && (
          <p
            className="font-['Tajawal']"
            dir="rtl"
            style={{
              color: 'var(--text-primary, #faf5e6)',
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {alert.explanation_ar}
          </p>
        )}

        {alert.practice_tip_ar && (
          <div
            className="rounded-lg p-2.5 flex items-start gap-2"
            style={{
              background: 'rgba(250,204,21,0.10)',
              border: '1px solid rgba(250,204,21,0.25)',
            }}
          >
            <Lightbulb size={14} style={{ color: 'rgb(250,204,21)', marginTop: 2 }} />
            <p
              className="font-['Tajawal']"
              dir="rtl"
              style={{
                color: 'var(--text-secondary)',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {alert.practice_tip_ar}
            </p>
          </div>
        )}

        {Array.isArray(alert.similar_words) && alert.similar_words.length > 0 && (
          <div>
            <div
              className="font-['Tajawal']"
              dir="rtl"
              style={{
                color: 'var(--text-tertiary)',
                fontSize: 11,
                marginBottom: 6,
              }}
            >
              كلمات لها نفس النمط:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {alert.similar_words.map((w, i) => (
                <span
                  key={`${w}-${i}`}
                  dir="ltr"
                  className="font-['Inter']"
                  style={{
                    background: 'var(--surface-raised, rgba(255,255,255,0.06))',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {alert.rule_category && (
          <div
            className="font-['Inter']"
            dir="ltr"
            style={{
              color: 'var(--text-tertiary)',
              fontSize: 10,
              fontFamily: 'ui-monospace, monospace',
              opacity: 0.65,
            }}
          >
            pattern: {alert.rule_category}
          </div>
        )}
      </div>
    </section>
  )
}
