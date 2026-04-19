import { GlassPanel } from '@/design-system/components'
import { useArchiveError } from '@/hooks/ielts/useErrorBank'

const SKILL_AR = { reading: 'قراءة', listening: 'استماع', writing: 'كتابة', speaking: 'محادثة' }
const SKILL_COLOR = { reading: '#38bdf8', listening: '#a78bfa', writing: '#34d399', speaking: '#f472b6' }

function daysUntilReview(nextReviewAt) {
  if (!nextReviewAt) return 0
  const diff = new Date(nextReviewAt).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

export default function ErrorListItem({ error, studentId }) {
  const archiveMut = useArchiveError()

  const color = SKILL_COLOR[error.skill_type] || '#94a3b8'
  const daysLeft = daysUntilReview(error.next_review_at)
  const isDue = daysLeft <= 0

  return (
    <GlassPanel style={{ padding: '12px 16px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Skill badge */}
        <div style={{ padding: '2px 8px', borderRadius: 8, background: color + '18', border: '1px solid ' + color + '30', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: 'Tajawal' }}>{SKILL_AR[error.skill_type] || error.skill_type}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'sans-serif', direction: 'ltr', lineHeight: 1.5, marginBottom: 4 }}>
            {error.question_text || '–'}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
              صحيح: {error.correct_answer || '–'}
            </span>
            <span style={{ fontSize: 11, color: '#ef4444', fontFamily: 'Tajawal' }}>
              إجابتك: {error.student_answer || '–'}
            </span>
            <span style={{ fontSize: 11, color: isDue ? '#fb923c' : 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
              {isDue ? 'مستحق الآن' : `مراجعة بعد ${daysLeft} يوم`}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
              {error.times_correct || 0}/{error.times_seen || 1} صحيح
            </span>
          </div>
        </div>
        <button
          onClick={() => archiveMut.mutate({ studentId, errorId: error.id })}
          disabled={archiveMut.isPending || error.mastered}
          style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}
          title="أتقنت هذا السؤال"
        >
          أتقنت
        </button>
      </div>
    </GlassPanel>
  )
}
