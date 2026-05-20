import { useQuery } from '@tanstack/react-query'
import { TrendingUp, BookOpen, PenLine, Headphones } from 'lucide-react'
import { getWordSrsStats } from '../../../services/srs'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

function dueLabel(due, now = new Date()) {
  if (!due) return '—'
  const d = due instanceof Date ? due : new Date(due)
  if (Number.isNaN(d.getTime())) return '—'
  const ms = d.getTime() - now.getTime()
  if (ms <= 0) return 'الآن'
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `بعد ${toArabicNum(mins)} د`
  const hrs = Math.round(ms / (60 * 60 * 1000))
  if (hrs < 24) return `بعد ${toArabicNum(hrs)} س`
  const days = Math.round(ms / (24 * 60 * 60 * 1000))
  return `بعد ${toArabicNum(days)} يوم`
}

const EXERCISES = [
  { key: 'meaning',   icon: BookOpen,    labelAr: 'اختيار المعنى',  passedField: 'meaning_exercise_passed',   attemptsField: 'meaning_exercise_attempts' },
  { key: 'sentence',  icon: PenLine,     labelAr: 'إكمال الجملة',   passedField: 'sentence_exercise_passed',  attemptsField: 'sentence_exercise_attempts' },
  { key: 'listening', icon: Headphones,  labelAr: 'استمع واختر',    passedField: 'listening_exercise_passed', attemptsField: 'listening_exercise_attempts' },
]

/**
 * ProgressSection — 3 exercise dots + SRS personal stats.
 *
 * Per the mastery schema (verified Phase A.4), the 3 exercises are
 * per-row booleans + attempt counts (meaning_exercise_*, sentence_exercise_*,
 * listening_exercise_*).
 */
export default function ProgressSection({ studentId, vocabularyId, mastery }) {
  const enabled = !!studentId && !!vocabularyId
  const { data: srs, isLoading } = useQuery({
    queryKey: ['word-srs-stats', studentId, vocabularyId],
    enabled,
    queryFn: () => getWordSrsStats(studentId, vocabularyId),
    staleTime: 30_000,
  })

  return (
    <section
      style={{ marginBottom: 20 }}
      dir="rtl"
      aria-labelledby="progress-section-heading"
    >
      <div
        id="progress-section-heading"
        className="flex items-center gap-1.5 font-['Tajawal'] font-bold"
        style={{
          color: 'var(--text-secondary)',
          fontSize: 13,
          marginBottom: 10,
        }}
      >
        <TrendingUp size={14} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
        <span>تقدّمك مع هذي الكلمة</span>
      </div>

      {/* Exercise dots */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {EXERCISES.map((ex) => {
          const passed = mastery?.[ex.passedField] === true
          const attempts = mastery?.[ex.attemptsField] ?? 0
          const inProgress = !passed && attempts > 0
          const Icon = ex.icon
          const dotColor = passed
            ? 'rgb(34,197,94)'
            : inProgress
            ? 'rgb(245,158,11)'
            : 'rgba(255,255,255,0.20)'
          const dotBg = passed
            ? 'rgba(34,197,94,0.18)'
            : inProgress
            ? 'rgba(245,158,11,0.16)'
            : 'rgba(255,255,255,0.04)'
          return (
            <div key={ex.key} className="flex flex-col items-center gap-1.5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center relative"
                style={{
                  background: dotBg,
                  color: dotColor,
                  border: `1.5px solid ${dotColor}`,
                }}
              >
                <Icon size={16} />
              </div>
              <span
                className="font-['Tajawal']"
                style={{
                  color: passed
                    ? 'var(--text-primary)'
                    : 'var(--text-tertiary)',
                  fontSize: 10,
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {ex.labelAr}
              </span>
            </div>
          )
        })}
      </div>

      {/* SRS personal stats */}
      <div
        className="rounded-xl p-3 space-y-2"
        style={{
          background: 'var(--surface, rgba(255,255,255,0.04))',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
        }}
      >
        <StatRow
          label="الموعد القادم للمراجعة:"
          value={isLoading ? '—' : dueLabel(srs?.due)}
        />
        <StatRow
          label="مرّات السقوط:"
          value={isLoading ? '—' : toArabicNum(srs?.lapses ?? 0)}
        />
        <DifficultyRow difficulty={srs?.difficulty ?? null} loading={isLoading} />
      </div>
    </section>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-2 font-['Tajawal']" dir="rtl">
      <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>
        {value}
      </span>
    </div>
  )
}

function DifficultyRow({ difficulty, loading }) {
  // FSRS difficulty is 0..10. Map to 5 dots (0..5 filled).
  const dots = Math.max(0, Math.min(5, Math.round((difficulty ?? 0) / 2)))
  const tone =
    dots >= 4
      ? { fill: 'rgb(239,68,68)', empty: 'rgba(239,68,68,0.12)' }
      : dots >= 2
      ? { fill: 'rgb(245,158,11)', empty: 'rgba(245,158,11,0.12)' }
      : { fill: 'rgb(34,197,94)', empty: 'rgba(34,197,94,0.12)' }

  return (
    <div className="flex items-baseline justify-between gap-2 font-['Tajawal']" dir="rtl">
      <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>الصعوبة:</span>
      <div className="flex items-center gap-1">
        {loading || difficulty == null ? (
          <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>
            —
          </span>
        ) : (
          Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: 9999,
                background: i < dots ? tone.fill : tone.empty,
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}
