import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Frown, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AuroraBackground, GlassPanel, PrimaryButton } from '@/design-system/components'

const SECTIONS = [
  { key: 'score_grammar',    label: 'القواعد',  max: 30 },
  { key: 'score_reading',    label: 'القراءة',  max: 25 },
  { key: 'score_vocabulary', label: 'المفردات', max: 20 },
  { key: 'score_spelling',   label: 'الإملاء',  max: 15 },
  { key: 'score_writing',    label: 'الكتابة',  max: 10 },
]

export default function MockExamResult() {
  const [params] = useSearchParams()
  const attemptId = params.get('attempt_id')

  const { data, isLoading } = useQuery({
    queryKey: ['mock-exam-result', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_exam_attempts')
        .select('*, exam:mock_exams(*)')
        .eq('id', attemptId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!attemptId,
  })

  // Score count-up
  const [displayScore, setDisplayScore] = useState(0)
  useEffect(() => {
    if (!data?.score_total) return
    const target = Number(data.score_total)
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
  }, [data?.score_total])

  if (isLoading || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
        <div style={{ color: 'var(--ds-text-tertiary)' }}>...جاري التحميل</div>
      </div>
    )
  }

  const passed = data.passed === true
  return (
    <>
      <AuroraBackground variant={passed ? 'intense' : 'default'} />
      <div className="relative min-h-[80vh] px-4 py-8 sm:py-12" dir="rtl">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <header className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>
              نتيجتك في {data.exam?.title_ar}
            </h1>
            <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
              تم التسليم {data.is_auto_submitted ? '(تلقائياً عند انتهاء الوقت)' : ''}
            </p>
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
              <strong>
                {passed ? 'نجحتِ ✓' : 'للأسف لم تتجاوزي حد النجاح'}
              </strong>
              <span style={{ color: 'var(--ds-text-tertiary)' }}>
                · حد النجاح {data.exam?.pass_threshold || 60}
              </span>
            </div>
          </GlassPanel>

          {/* Section breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {SECTIONS.map((s) => {
              const score = Number(data[s.key] || 0)
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
            {data.score_writing === 0 && data.writing_word_count < (data.exam?.min_writing_words || 50) && (
              <span> · نصكِ في الكتابة أقل من الحد الأدنى ({data.exam?.min_writing_words} كلمة) فلم تُحتسب درجة الكتابة.</span>
            )}
            {data.score_writing > 0 && (
              <span> · نصكِ في الكتابة قد يُراجع لاحقاً من المدرب.</span>
            )}
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
