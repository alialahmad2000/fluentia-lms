import { PenLine } from 'lucide-react'

export default function GrammarHeader({ topic, attemptNumber, bestScore }) {
  return (
    <div className="mb-8 space-y-3">
      <div className="flex items-center gap-2 text-xs font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
        <PenLine size={14} style={{ color: 'var(--accent-sky)' }} />
        <span>القواعد</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold font-['Inter'] tracking-tight" dir="ltr" style={{ color: 'var(--text-primary)' }}>
        {topic.topic_name_en}
      </h1>

      {topic.topic_name_ar && topic.topic_name_ar !== topic.topic_name_en && (
        <p className="text-base font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
          {topic.topic_name_ar}
        </p>
      )}

      {/* Progress pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {bestScore != null && (
          <span
            className="text-[11px] font-bold px-3 py-1 rounded-full font-['Tajawal']"
            style={{ background: 'var(--info-bg)', color: 'var(--accent-sky)', border: '1px solid var(--info-border)' }}
          >
            أفضل درجة: {bestScore}%
          </span>
        )}
        {attemptNumber > 1 && (
          <span
            className="text-[11px] font-bold px-3 py-1 rounded-full font-['Tajawal']"
            style={{ background: 'var(--glass-card)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}
          >
            محاولة {attemptNumber}
          </span>
        )}
      </div>
    </div>
  )
}
