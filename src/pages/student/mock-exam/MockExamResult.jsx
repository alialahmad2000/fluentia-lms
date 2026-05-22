import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Trophy, Frown, BookOpen, Check, X, Clock, ShieldCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AuroraBackground, GlassPanel, PrimaryButton } from '@/design-system/components'

const SECTIONS = [
  { key: 'score_grammar',    label: 'القواعد',  section: 'grammar',    max: 30 },
  { key: 'score_reading',    label: 'القراءة',  section: 'reading',    max: 25 },
  { key: 'score_vocabulary', label: 'المفردات', section: 'vocabulary', max: 20 },
  { key: 'score_spelling',   label: 'الإملاء',  section: 'spelling',   max: 15 },
  { key: 'score_writing',    label: 'الكتابة',  section: 'writing',    max: 10 },
]

export default function MockExamResult() {
  const [params] = useSearchParams()
  const attemptId = params.get('attempt_id')
  const navigate = useNavigate()

  const { data: result, isLoading } = useQuery({
    queryKey: ['mock-exam-result-rpc', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('mock_exam_get_result', {
        p_attempt_id: attemptId,
      })
      if (error) throw error
      return data
    },
    enabled: !!attemptId,
    // Poll every 30s if pending so the student sees the reveal without manual refresh.
    refetchInterval: (q) => {
      const d = q.state.data
      if (!d) return false
      // Poll while result is gated OR while AI writing grade is still pending.
      if (d.pending_review) return 30_000
      if (d.ai_writing_status === 'pending') return 5_000
      return false
    },
  })

  // Score count-up — only run when revealed (we have score_total)
  const [displayScore, setDisplayScore] = useState(0)
  useEffect(() => {
    if (result?.pending_review) return
    if (result?.score_total === null || result?.score_total === undefined) return
    const target = Number(result.score_total)
    const startTime = Date.now()
    const duration = 1200
    let raf
    const tick = () => {
      const t = Math.min(1, (Date.now() - startTime) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayScore(eased * target)
      if (t < 1) raf = requestAnimationFrame(tick)
      else setDisplayScore(target)
    }
    raf = requestAnimationFrame(tick)
    return () => raf && cancelAnimationFrame(raf)
  }, [result?.score_total, result?.pending_review])

  if (isLoading || !result) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
        <div style={{ color: 'var(--ds-text-tertiary)' }}>...جاري التحميل</div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────
  // State A — pending review
  // ──────────────────────────────────────────────────────────────
  if (result.pending_review) {
    return (
      <>
        <AuroraBackground variant="subtle" />
        <div className="relative min-h-[80vh] px-4 py-8 sm:py-12" dir="rtl">
          <div className="max-w-2xl mx-auto">
            <GlassPanel className="p-8 sm:p-10 text-center space-y-5">
              <div
                className="mx-auto flex items-center justify-center"
                style={{
                  width: 96, height: 96, borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 30%, rgba(233,185,73,0.30), rgba(233,185,73,0.06))',
                  border: '1px solid rgba(233,185,73,0.45)',
                }}
              >
                <ShieldCheck size={42} style={{ color: 'var(--ds-accent-primary, #e9b949)' }} />
              </div>
              <h1
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: 'var(--ds-text-primary)', fontFamily: "'Tajawal', sans-serif" }}
              >
                تم استلام إجابتك بنجاح
              </h1>
              <p className="text-base" style={{ color: 'var(--ds-text-secondary)' }}>
                نتيجتك ستظهر هنا فور انتهاء المدرب من المراجعة.
              </p>
              <div
                className="text-sm py-2 px-3 rounded-lg inline-flex items-center gap-2 mx-auto"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--ds-text-tertiary)',
                }}
              >
                <Clock size={14} />
                <span>وقت التسليم: {fmtRelativeAr(result.submitted_at)}</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
                نقدّر صبركِ — وفّقكِ الله في الاختبار الفعلي.
              </p>
              <PrimaryButton onClick={() => navigate('/student/curriculum')} className="w-full">
                <BookOpen size={18} />
                العودة إلى المنهج
              </PrimaryButton>
            </GlassPanel>
          </div>
        </div>
      </>
    )
  }

  // ──────────────────────────────────────────────────────────────
  // State B — revealed
  // ──────────────────────────────────────────────────────────────
  const passed = result.passed === true
  const questions = result.questions || []
  const sectionGroups = SECTIONS.map((s) => ({
    ...s,
    score: Number(result[s.key] ?? 0),
    questions: questions.filter((q) => q.section === s.section),
  })).filter((g) => g.questions.length > 0)

  return (
    <>
      <AuroraBackground variant={passed ? 'intense' : 'default'} />
      <div className="relative min-h-[80vh] px-4 py-8 sm:py-12" dir="rtl">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <header className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>
              نتيجتك في {result.exam_title}
            </h1>
          </header>

          {/* Big score reveal */}
          <GlassPanel className="p-8 text-center space-y-4">
            <div className="flex items-center justify-center">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 132, height: 132, borderRadius: '50%',
                  background: passed
                    ? 'radial-gradient(circle at 35% 30%, rgba(233,185,73,0.30), rgba(233,185,73,0.05))'
                    : 'radial-gradient(circle at 35% 30%, rgba(148,163,184,0.25), rgba(148,163,184,0.04))',
                  border: passed
                    ? '2px solid rgba(233,185,73,0.55)'
                    : '2px solid rgba(148,163,184,0.45)',
                }}
              >
                <div className="text-center">
                  <div
                    className="text-4xl sm:text-5xl font-bold tabular-nums"
                    style={{ color: passed ? 'var(--ds-accent-primary, #e9b949)' : 'var(--ds-text-primary)' }}
                  >
                    {displayScore.toFixed(0)}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
                    من 100
                  </div>
                </div>
              </div>
            </div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
              style={{
                background: passed ? 'rgba(34,197,94,0.14)' : 'rgba(148,163,184,0.12)',
                color: passed ? '#86efac' : 'var(--ds-text-secondary)',
                border: passed ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(148,163,184,0.25)',
              }}
            >
              {passed ? <Trophy size={16} /> : <Frown size={16} />}
              <strong>{passed ? 'نجحتِ ✓' : 'للأسف لم تتجاوزي حد النجاح'}</strong>
              <span style={{ color: 'var(--ds-text-tertiary)' }}>
                · حد النجاح {result.pass_threshold || 60}
              </span>
            </div>
          </GlassPanel>

          {/* Section breakdown cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {SECTIONS.map((s) => {
              const score = Number(result[s.key] ?? 0)
              const pct = (score / s.max) * 100
              return (
                <div
                  key={s.key}
                  className="p-3 rounded-xl text-center"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>{s.label}</div>
                  <div
                    className="text-xl font-bold tabular-nums my-1"
                    style={{ color: 'var(--ds-text-primary)' }}
                  >
                    {score.toFixed(score % 1 ? 1 : 0)} <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>/ {s.max}</span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <div
                      style={{
                        width: `${Math.max(2, Math.min(100, pct))}%`,
                        height: '100%',
                        background: pct >= 60 ? 'var(--ds-accent-success, #22c55e)' : 'var(--ds-accent-primary, #e9b949)',
                        transition: 'width 800ms ease-out',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Per-section accordion w/ per-question feedback */}
          <div className="space-y-3">
            {sectionGroups.map((g) => (
              <SectionAccordion key={g.section} group={g} result={result} />
            ))}
          </div>

          {/* Mock notice */}
          <div
            className="p-4 rounded-xl text-sm"
            style={{
              background: 'rgba(56,189,248,0.08)',
              border: '1px solid rgba(56,189,248,0.25)',
              color: 'var(--ds-text-secondary)',
            }}
          >
            هذا اختبار <strong>تجريبي</strong> للتعوّد على شكل الاختبار. الاختبار الفعلي بعدين — راجعي نقاط ضعفك واستعدّي.
          </div>

          {/* CTA */}
          <Link to="/student/curriculum">
            <PrimaryButton className="w-full">
              <BookOpen size={18} />
              العودة إلى المنهج
            </PrimaryButton>
          </Link>
        </div>
      </div>
    </>
  )
}

function SectionAccordion({ group, result }) {
  return (
    <details
      className="group rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <summary
        className="cursor-pointer p-4 flex items-center justify-between gap-3 list-none"
        style={{ color: 'var(--ds-text-primary)' }}
      >
        <div className="flex items-center gap-2 text-sm sm:text-base font-semibold">
          <span>{group.label}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--ds-text-tertiary)',
            }}
          >
            {group.questions.length} سؤال
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="font-mono tabular-nums text-sm"
            style={{ color: group.score >= group.max * 0.6 ? '#86efac' : 'var(--ds-text-secondary)' }}
          >
            {group.score.toFixed(group.score % 1 ? 1 : 0)} / {group.max}
          </span>
          <ChevronArrow />
        </div>
      </summary>

      <div className="px-4 pb-4 pt-2 space-y-4">
        {group.section === 'writing'
          ? <WritingQuestionFeedback q={group.questions[0]} result={result} />
          : group.section === 'reading'
            ? <ReadingGroupFeedback questions={group.questions} />
            : group.questions.map((q) => (
                <QuestionFeedbackRow key={q.question_id} q={q} />
              ))
        }
      </div>
    </details>
  )
}

function ReadingGroupFeedback({ questions }) {
  // Group reading questions by passage_group; render the passage once at the top.
  const groups = {}
  for (const q of questions) {
    const key = q.passage_group || 1
    if (!groups[key]) groups[key] = { title: q.passage_title, text: q.passage_text, qs: [] }
    groups[key].qs.push(q)
  }
  return (
    <div className="space-y-5">
      {Object.values(groups).map((g, i) => (
        <div key={i} className="space-y-3">
          <div
            className="p-4 rounded-lg"
            dir="ltr"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {g.title && (
              <h4
                className="text-sm font-bold mb-2"
                style={{ color: 'var(--ds-text-primary)', fontFamily: "'Playfair Display', serif" }}
              >
                {g.title}
              </h4>
            )}
            <div className="text-[13px] leading-6 whitespace-pre-line" style={{ color: 'var(--ds-text-secondary)' }}>
              {g.text}
            </div>
          </div>
          {g.qs.map((q) => <QuestionFeedbackRow key={q.question_id} q={q} />)}
        </div>
      ))}
    </div>
  )
}

function QuestionFeedbackRow({ q }) {
  const correct = q.is_correct === true
  const answered =
    Number.isInteger(q.student_selected_index) ||
    (q.student_text_answer && q.student_text_answer.trim().length > 0)

  return (
    <div
      className="p-4 rounded-lg space-y-3"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="text-sm sm:text-base leading-relaxed"
          dir={/[؀-ۿ]/.test(q.stem) ? 'rtl' : 'ltr'}
          style={{ color: 'var(--ds-text-primary)' }}
        >
          {q.stem}
        </div>
        <ScoreBadge correct={correct} answered={answered} points={q.points_awarded} max={q.points} />
      </div>

      {/* MCQ-like: show all options with correct/student markers */}
      {Array.isArray(q.options) && q.options.length > 0 && (
        <div className="space-y-1.5">
          {q.options.map((opt, idx) => {
            const isCorrect = idx === q.correct_index
            const isPicked = idx === q.student_selected_index
            let bg = 'rgba(255,255,255,0.02)'
            let border = '1px solid rgba(255,255,255,0.05)'
            let color = 'var(--ds-text-tertiary)'
            let icon = null
            if (isCorrect) {
              bg = 'rgba(34,197,94,0.12)'
              border = '1px solid rgba(34,197,94,0.40)'
              color = '#86efac'
              icon = <Check size={14} />
            } else if (isPicked && !isCorrect) {
              bg = 'rgba(239,68,68,0.10)'
              border = '1px solid rgba(239,68,68,0.30)'
              color = '#fca5a5'
              icon = <X size={14} />
            }
            const label = q.question_type === 'error_detection'
              ? String(idx + 1)
              : (['A','B','C','D'][idx] || String(idx + 1))
            return (
              <div
                key={idx}
                className="px-3 py-2 rounded-md flex items-center gap-2 text-sm"
                style={{ background: bg, border, color }}
              >
                <span
                  className="inline-flex items-center justify-center shrink-0 text-[11px]"
                  style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }}
                >
                  {label}
                </span>
                <span dir={/[؀-ۿ]/.test(opt) ? 'rtl' : 'ltr'}>{opt}</span>
                {icon && <span className="ms-auto">{icon}</span>}
                {isPicked && (
                  <span className="text-[10px]" style={{ color: 'var(--ds-text-tertiary)' }}>
                    إجابتك
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Fill-blank: show student answer + accepted list */}
      {q.question_type === 'fill_blank' && (
        <div className="space-y-1.5 text-sm">
          <div
            className="px-3 py-2 rounded-md"
            style={{
              background: correct ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.08)',
              border: correct ? '1px solid rgba(34,197,94,0.30)' : '1px solid rgba(239,68,68,0.25)',
              color: correct ? '#86efac' : 'var(--ds-text-primary)',
            }}
          >
            <span style={{ color: 'var(--ds-text-tertiary)' }}>إجابتك: </span>
            <span dir="auto">{q.student_text_answer || '— لم تجيبي —'}</span>
          </div>
          {Array.isArray(q.acceptable_answers) && q.acceptable_answers.length > 0 && (
            <div
              className="px-3 py-2 rounded-md"
              style={{
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.20)',
                color: '#86efac',
              }}
            >
              <span style={{ color: 'var(--ds-text-tertiary)' }}>الإجابة الصحيحة: </span>
              <span dir="auto">{q.acceptable_answers.join('، ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function WritingQuestionFeedback({ q, result }) {
  const wordCount = Number(result.writing_word_count || 0)
  const minWords = Number(result.min_writing_words || 0)
  const score = Number(result.score_writing ?? 0)
  const manual = result.manual_writing_score !== null && result.manual_writing_score !== undefined
  const aiStatus = result.ai_writing_status
  const aiScore = result.ai_writing_score
  const aiJustification = result.ai_writing_justification_ar
  const aiStrengths = Array.isArray(result.ai_writing_strengths_ar) ? result.ai_writing_strengths_ar : []
  const aiImprovements = Array.isArray(result.ai_writing_improvements_ar) ? result.ai_writing_improvements_ar : []
  const hasAiFeedback = aiStatus && aiStatus !== 'pending' && aiStatus !== 'failed'
  return (
    <div className="space-y-3">
      <div
        className="p-4 rounded-lg text-sm"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          color: 'var(--ds-text-primary)',
        }}
      >
        <div className="text-xs mb-2" style={{ color: 'var(--ds-text-tertiary)' }}>السؤال:</div>
        <div className="leading-relaxed" dir="rtl">{q?.stem}</div>
      </div>
      <div
        className="p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap"
        dir="ltr"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--ds-text-primary)',
          maxHeight: 320, overflowY: 'auto',
        }}
      >
        {result.writing_response || '— لم تكتبي شيئاً —'}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
        <span>كتبتِ <strong>{wordCount}</strong> كلمة (الحد الأدنى {minWords})</span>
        <span style={{ color: 'var(--ds-text-tertiary)' }}>·</span>
        <span>الدرجة: <strong>{score.toFixed(score % 1 ? 1 : 0)}</strong> / 10</span>
        {manual && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(56,189,248,0.10)',
              color: 'var(--ds-accent-info, #38bdf8)',
              border: '1px solid rgba(56,189,248,0.25)',
            }}
          >
            تم تعديل الدرجة من المدرب
          </span>
        )}
      </div>

      {aiStatus === 'pending' && (
        <div
          className="p-3 rounded-lg text-sm flex items-center gap-2"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            color: 'var(--ds-text-secondary)',
          }}
        >
          <span>⏳</span>
          <span>تقييم كتابتك قيد المعالجة بالذكاء الاصطناعي…</span>
        </div>
      )}

      {hasAiFeedback && (
        <div
          className="p-4 rounded-lg space-y-3"
          style={{
            background: aiStatus === 'fallback'
              ? 'rgba(245,158,11,0.06)'
              : 'rgba(139,92,246,0.06)',
            border: aiStatus === 'fallback'
              ? '1px solid rgba(245,158,11,0.30)'
              : '1px solid rgba(139,92,246,0.30)',
          }}
        >
          <div className="flex items-center justify-between gap-2 text-xs font-semibold">
            <span style={{ color: aiStatus === 'fallback' ? '#fcd34d' : '#c4b5fd' }}>
              {aiStatus === 'graded'   && '✦ تقييم بالذكاء الاصطناعي'}
              {aiStatus === 'fallback' && '⚠ تقييم أساسي — قيد مراجعة المدرب'}
              {aiStatus === 'manual'   && 'تقييم يدوي من المدرب'}
            </span>
            {Number.isFinite(Number(aiScore)) && (
              <span className="font-mono tabular-nums" style={{ color: 'var(--ds-text-secondary)' }}>
                درجة AI: <strong>{Number(aiScore).toFixed(Number(aiScore) % 1 ? 1 : 0)}/10</strong>
              </span>
            )}
          </div>
          {aiJustification && (
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--ds-text-tertiary)' }}>التبرير:</div>
              <div className="text-sm leading-relaxed" dir="rtl" style={{ color: 'var(--ds-text-primary)' }}>
                {aiJustification}
              </div>
            </div>
          )}
          {aiStrengths.length > 0 && (
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--ds-text-tertiary)' }}>نقاط القوة:</div>
              <ul className="text-sm space-y-1" dir="rtl" style={{ color: 'var(--ds-text-secondary)' }}>
                {aiStrengths.map((s, i) => (
                  <li key={i} className="flex gap-1.5 items-start">
                    <span style={{ color: '#86efac' }}>✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {aiImprovements.length > 0 && (
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--ds-text-tertiary)' }}>للتحسين:</div>
              <ul className="text-sm space-y-1" dir="rtl" style={{ color: 'var(--ds-text-secondary)' }}>
                {aiImprovements.map((s, i) => (
                  <li key={i} className="flex gap-1.5 items-start">
                    <span style={{ color: '#fcd34d' }}>→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScoreBadge({ correct, answered, points, max }) {
  const p = Number(points ?? 0)
  const m = Number(max ?? 0)
  if (!answered) {
    return (
      <span
        className="text-[11px] px-2 py-1 rounded-full shrink-0"
        style={{
          background: 'rgba(148,163,184,0.10)',
          color: 'var(--ds-text-tertiary)',
          border: '1px solid rgba(148,163,184,0.20)',
        }}
      >
        لم تجيبي · 0/{m}
      </span>
    )
  }
  return (
    <span
      className="text-[11px] px-2 py-1 rounded-full shrink-0 flex items-center gap-1"
      style={{
        background: correct ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.10)',
        color: correct ? '#86efac' : '#fca5a5',
        border: correct ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(239,68,68,0.30)',
      }}
    >
      {correct ? <Check size={11} /> : <X size={11} />}
      {p.toFixed(p % 1 ? 1 : 0)}/{m}
    </span>
  )
}

function ChevronArrow() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ color: 'var(--ds-text-tertiary)' }}
      className="transition-transform group-open:rotate-180"
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function fmtRelativeAr(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' })
}
