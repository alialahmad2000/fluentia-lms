import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const PHRASES = {
  14: 'الاستعداد الجيد يبدأ الآن.',
  10: 'أنت في المسار الصحيح.',
  7: 'أسبوع واحد. كل يوم يُحدث فرقاً.',
  3: 'ثلاثة أيام. ثق بتدريبك.',
  1: 'غداً هو اليوم. نَم باكراً.',
  0: 'اليوم هو اختبارك. بسم الله.',
}

function getPhrase(days) {
  const keys = Object.keys(PHRASES).map(Number).sort((a, b) => a - b)
  for (const k of keys) {
    if (days <= k) return PHRASES[k]
  }
  return PHRASES[14]
}

function calcTimeLeft(isoDate) {
  const now = Date.now()
  const exam = new Date(isoDate).getTime()
  const diff = exam - now
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, past: diff < -86400000 }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  return { days, hours, minutes, past: false }
}

const EXAM_TYPE_LABEL = {
  academic: 'Academic',
  general_training: 'General Training',
}

export default function ExamCountdown({
  examDate,
  studentName,
  examType = 'academic',
  onStartReadinessMode,
  className = '',
}) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(examDate))

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calcTimeLeft(examDate)), 60000)
    return () => clearInterval(id)
  }, [examDate])

  const { days, hours, minutes, past } = timeLeft
  const isToday = days === 0 && !past
  const phrase = getPhrase(days)

  return (
    <div
      dir="rtl"
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-5)',
        padding: 'var(--space-7)',
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-tertiary)', fontFamily: "'Tajawal', sans-serif" }}>
        {studentName} · IELTS {EXAM_TYPE_LABEL[examType]}
      </p>

      {past ? (
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            margin: 0,
            fontSize: 'clamp(24px, 5vw, 36px)',
            fontWeight: 700,
            fontFamily: "'Tajawal', sans-serif",
            color: 'var(--ds-text-primary)',
          }}
        >
          انتهى الاختبار. نتمنى لك التوفيق!
        </motion.h2>
      ) : isToday ? (
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            margin: 0,
            fontSize: 'clamp(28px, 6vw, 48px)',
            fontWeight: 800,
            fontFamily: "'Tajawal', sans-serif",
            color: 'var(--ds-accent-primary)',
            lineHeight: 1.3,
          }}
        >
          اليوم هو اختبارك. بسم الله.
        </motion.h2>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--ds-text-tertiary)', fontFamily: "'Tajawal', sans-serif" }}>
              اختبارك
            </p>
            {days > 0 ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', justifyContent: 'center' }}>
                <span style={{
                  fontSize: 'clamp(64px, 12vw, 96px)',
                  fontWeight: 900,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: 'var(--ds-accent-primary)',
                  lineHeight: 1,
                }}>
                  {days}
                </span>
                <span style={{ fontSize: 24, color: 'var(--ds-text-secondary)', fontFamily: "'Tajawal', sans-serif", fontWeight: 600 }}>
                  {days === 1 ? 'يوم متبقي' : 'أيام متبقية'}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', justifyContent: 'center' }}>
                <span style={{
                  fontSize: 'clamp(48px, 10vw, 80px)',
                  fontWeight: 900,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: 'var(--ds-amber)',
                  lineHeight: 1,
                }}>
                  {hours}h {minutes}m
                </span>
              </div>
            )}
          </motion.div>

          <p style={{
            margin: 0,
            fontSize: 16,
            color: 'var(--ds-text-secondary)',
            fontFamily: "'Tajawal', sans-serif",
            fontStyle: 'italic',
          }}>
            {phrase}
          </p>
        </>
      )}

      {onStartReadinessMode && !past && (
        <button
          onClick={onStartReadinessMode}
          style={{
            marginTop: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-6)',
            background: 'var(--ds-surface-2)',
            border: '1px solid var(--ds-border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--ds-text-primary)',
            fontSize: 15,
            fontFamily: "'Tajawal', sans-serif",
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'border-color var(--motion-fast) var(--ease-out)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ds-accent-primary)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ds-border-subtle)'}
        >
          وضع الجاهزية ←
        </button>
      )}
    </div>
  )
}
