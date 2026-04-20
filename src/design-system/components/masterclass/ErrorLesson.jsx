import { motion } from 'framer-motion'

const ERROR_TYPE_META = {
  careless: { label: 'إهمال', color: 'var(--ds-amber)', icon: '⚡' },
  comprehension: { label: 'فهم', color: 'var(--ds-accent-danger)', icon: '🔍' },
  strategy: { label: 'استراتيجية', color: 'var(--ds-accent-secondary)', icon: '♟' },
  language: { label: 'لغة', color: 'var(--ds-accent-primary)', icon: '📖' },
}

function MasteryDots({ total = 5, correct = 0 }) {
  return (
    <div style={{ display: 'flex', gap: 4 }} aria-label={`${correct} من ${total} صحيحة`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 'var(--radius-full)',
            background: i < correct ? 'var(--ds-accent-success)' : 'var(--ds-border-subtle)',
            display: 'block',
          }}
        />
      ))}
    </div>
  )
}

export default function ErrorLesson({
  errorId,
  questionText,
  studentAnswer,
  correctAnswer,
  errorType = 'comprehension',
  lessonAr,
  timesSeen = 1,
  timesCorrect = 0,
  onTryAgain,
  onArchive,
  className = '',
}) {
  const meta = ERROR_TYPE_META[errorType] || ERROR_TYPE_META.comprehension

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      dir="rtl"
      className={className}
      aria-label={`خطأ في ${meta.label}`}
      style={{
        background: 'var(--ds-surface-1)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        maxWidth: 640,
        boxShadow: 'var(--ds-shadow-sm)',
      }}
    >
      {/* Header — error type badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--ds-surface-2)',
        borderBottom: '1px solid var(--ds-border-subtle)',
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "'Tajawal', sans-serif",
          color: meta.color,
          padding: '2px 10px',
          background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
          borderRadius: 'var(--radius-full)',
          border: `1px solid ${meta.color}`,
        }}>
          <span aria-hidden="true">{meta.icon}</span>
          {meta.label}
        </span>
        <MasteryDots total={5} correct={Math.min(timesCorrect, 5)} />
      </div>

      {/* Zone 1 — Question */}
      <div style={{ padding: 'var(--space-4)' }}>
        <p style={{
          margin: 0,
          fontSize: 13,
          color: 'var(--ds-text-tertiary)',
          fontFamily: "'Tajawal', sans-serif",
          marginBottom: 'var(--space-2)',
        }}>
          السؤال
        </p>
        <pre style={{
          margin: 0,
          padding: 'var(--space-3)',
          background: 'var(--ds-bg-base)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--ds-border-subtle)',
          fontSize: 13,
          color: 'var(--ds-text-primary)',
          fontFamily: "'IBM Plex Mono', 'Cascadia Code', monospace",
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          direction: 'ltr',
          textAlign: 'left',
        }}>
          {questionText}
        </pre>
      </div>

      {/* Zone 2 — Answers */}
      <div style={{
        padding: '0 var(--space-4) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 12, color: 'var(--ds-text-tertiary)', fontFamily: "'Tajawal', sans-serif", flexShrink: 0 }}>إجابتك:</span>
          <span style={{
            fontSize: 14,
            color: 'var(--ds-accent-danger)',
            textDecoration: 'line-through',
            fontFamily: "'IBM Plex Sans', sans-serif",
            direction: 'ltr',
          }}>
            {studentAnswer}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 12, color: 'var(--ds-text-tertiary)', fontFamily: "'Tajawal', sans-serif", flexShrink: 0 }}>الصحيح:</span>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--ds-accent-success)',
            fontFamily: "'IBM Plex Sans', sans-serif",
            direction: 'ltr',
          }}>
            {correctAnswer}
          </span>
        </div>
      </div>

      {/* Zone 3 — الدرس */}
      {lessonAr && (
        <div style={{
          padding: 'var(--space-4)',
          borderTop: '1px solid var(--ds-border-subtle)',
          borderRight: '3px solid var(--ds-accent-gold)',
          background: 'var(--ds-surface-2)',
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 11, color: 'var(--ds-accent-gold)', fontWeight: 700, fontFamily: "'Tajawal', sans-serif", flexShrink: 0, marginTop: 2 }}>
            الدرس
          </span>
          <p style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--ds-text-primary)',
            fontFamily: "'Tajawal', sans-serif",
            fontStyle: 'italic',
          }}>
            {lessonAr}
          </p>
        </div>
      )}

      {/* CTAs */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        display: 'flex',
        gap: 'var(--space-3)',
        borderTop: '1px solid var(--ds-border-subtle)',
      }}>
        {onTryAgain && (
          <button
            onClick={onTryAgain}
            style={{
              flex: 1,
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--ds-accent-primary)',
              color: 'var(--ds-text-inverse)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Tajawal', sans-serif",
              cursor: 'pointer',
            }}
          >
            جرّب مرة ثانية
          </button>
        )}
        {onArchive && (
          <button
            onClick={onArchive}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: 'transparent',
              border: '1px solid var(--ds-border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              color: 'var(--ds-text-tertiary)',
              fontFamily: "'Tajawal', sans-serif",
              cursor: 'pointer',
            }}
          >
            أرشفها
          </button>
        )}
        <span style={{
          marginInlineStart: 'auto',
          fontSize: 11,
          color: 'var(--ds-text-tertiary)',
          fontFamily: "'IBM Plex Sans', sans-serif",
          alignSelf: 'center',
        }}>
          {timesSeen}× رأيتها
        </span>
      </div>
    </motion.article>
  )
}
