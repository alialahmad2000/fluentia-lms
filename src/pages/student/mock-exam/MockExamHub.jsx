import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, ShieldCheck, AlertCircle, ChevronRight, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { GlassPanel, PrimaryButton, AuroraBackground } from '@/design-system/components'

/**
 * MockExamHub — the intro / lock / already-submitted screen.
 *
 * Three states based on now() vs open_at/close_at and existing attempt:
 *   1. BEFORE open_at  → locked screen with live countdown
 *   2. OPEN + no submitted attempt → intro card with "ابدئي الاختبار"
 *   3. Already submitted → "اطلعي على نتيجتك"
 */
export default function MockExamHub() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { examInfo } = useOutletContext() || {}
  const profile = useAuthStore((s) => s.profile)
  const studentId = profile?.id

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // VISIBILITY-FIX (2026-05-23): on every hub mount, force the per-student
  // attempt + exam-row queries to refetch. Cached "submitted" or stale
  // attempt rows (e.g. after a server-side archive+reset) caused students
  // to be stuck on the wrong screen during the second-chance window.
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['mock-exam-row'] })
    queryClient.invalidateQueries({ queryKey: ['mock-exam-attempt'] })
    // intentionally one-shot per hub mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: examFull } = useQuery({
    queryKey: ['mock-exam-row', examInfo?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_exams')
        .select('*')
        .eq('id', examInfo.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!examInfo?.id,
    staleTime: 30_000,
  })

  const { data: existingAttempt, refetch: refetchAttempt } = useQuery({
    queryKey: ['mock-exam-attempt', examInfo?.id, studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_exam_attempts')
        .select('id, is_submitted, submitted_at, score_total, passed, expires_at')
        .eq('exam_id', examInfo.id)
        .eq('student_id', studentId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!examInfo?.id && !!studentId,
    staleTime: 0,                  // VISIBILITY-FIX (2026-05-23): always read live
    refetchOnMount: 'always',      // ditto — never serve stale attempt rows on entry
  })

  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState(null)

  const stateKind = useMemo(() => {
    if (!examFull) return 'loading'
    const open = new Date(examFull.open_at)
    const close = new Date(examFull.close_at)
    if (existingAttempt?.is_submitted) return 'submitted'
    if (now < open) return 'locked'
    if (now > close && !existingAttempt) return 'closed'
    if (existingAttempt && !existingAttempt.is_submitted) return 'resume'
    return 'intro'
  }, [examFull, existingAttempt, now])

  async function handleStart() {
    if (starting) return
    setStarting(true)
    setStartError(null)
    try {
      const { data, error } = await supabase.rpc('mock_exam_start', { p_exam_code: examInfo.code })
      if (error) throw error
      navigate('/student/mock-exam/attempt', { state: { attemptId: data.attempt_id } })
    } catch (e) {
      console.error('mock_exam_start failed:', e)
      const friendly = friendlyRpcError(e?.message || String(e))
      setStartError(friendly)
      await refetchAttempt()
    } finally {
      setStarting(false)
    }
  }

  if (!examFull) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
        <div className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>...جاري التحميل</div>
      </div>
    )
  }

  return (
    <>
      <AuroraBackground variant="default" />
      <div className="relative min-h-[80vh] px-4 py-8 sm:py-12" dir="rtl">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <header className="text-center space-y-3">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: 'rgba(233,185,73,0.10)',
                border: '1px solid rgba(233,185,73,0.30)',
                color: 'var(--ds-accent-primary, #e9b949)',
              }}
            >
              <ShieldCheck size={14} />
              <span>اختبار تجريبي • Mock Exam</span>
            </div>
            <h1
              className="text-3xl sm:text-4xl font-bold"
              style={{
                color: 'var(--ds-text-primary)',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              {examFull.title_ar}
            </h1>
            {examFull.subtitle_ar && (
              <p style={{ color: 'var(--ds-text-secondary)' }}>{examFull.subtitle_ar}</p>
            )}
          </header>

          {/* State-specific card */}
          {stateKind === 'locked' && (
            <LockedCard openAt={new Date(examFull.open_at)} now={now} />
          )}

          {stateKind === 'closed' && (
            <GlassPanel className="p-6 text-center space-y-3">
              <AlertCircle size={36} className="mx-auto" style={{ color: 'var(--ds-accent-warning, #f59e0b)' }} />
              <h2 className="text-xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>
                انتهى وقت الاختبار التجريبي
              </h2>
              <p style={{ color: 'var(--ds-text-secondary)' }}>
                لقد أغلقت نافذة الاختبار. الاختبار الفعلي بعدين إن شاء الله.
              </p>
            </GlassPanel>
          )}

          {(stateKind === 'intro' || stateKind === 'resume') && (
            <IntroCard
              exam={examFull}
              isResume={stateKind === 'resume'}
              onStart={handleStart}
              starting={starting}
              error={startError}
            />
          )}

          {stateKind === 'submitted' && existingAttempt && (
            <GlassPanel className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <ShieldCheck size={36} className="mx-auto" style={{ color: 'var(--ds-accent-success, #22c55e)' }} />
                <h2 className="text-xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>
                  تم تسليم اختبارك ✓
                </h2>
                <p style={{ color: 'var(--ds-text-secondary)' }}>
                  درجتك: <strong>{existingAttempt.score_total}</strong> / 100
                  {existingAttempt.passed ? ' — نجحتِ' : ''}
                </p>
              </div>
              <PrimaryButton
                onClick={() => navigate(`/student/mock-exam/result?attempt_id=${existingAttempt.id}`)}
                className="w-full"
              >
                اطلعي على نتيجتك التفصيلية
                <ChevronRight size={18} />
              </PrimaryButton>
            </GlassPanel>
          )}
        </div>
      </div>
    </>
  )
}

function LockedCard({ openAt, now }) {
  const diff = Math.max(0, Math.floor((openAt - now) / 1000))
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  return (
    <GlassPanel className="p-8 text-center space-y-5">
      <div
        className="mx-auto flex items-center justify-center"
        style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: 'rgba(233,185,73,0.10)',
          border: '1px solid rgba(233,185,73,0.30)',
        }}
      >
        <Lock size={36} style={{ color: 'var(--ds-accent-primary, #e9b949)' }} />
      </div>
      <h2 className="text-xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>
        الاختبار يفتح خلال
      </h2>
      <div className="text-4xl font-mono tabular-nums" style={{ color: 'var(--ds-accent-primary, #e9b949)' }}>
        {String(h).padStart(2, '0')}
        <span className="text-2xl mx-1" style={{ color: 'var(--ds-text-secondary)' }}>س</span>
        {String(m).padStart(2, '0')}
        <span className="text-2xl mx-1" style={{ color: 'var(--ds-text-secondary)' }}>د</span>
        {String(s).padStart(2, '0')}
        <span className="text-2xl mx-1" style={{ color: 'var(--ds-text-secondary)' }}>ث</span>
      </div>
      <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
        هذا اختبار تجريبي للتعوّد على شكل الاختبار. الاختبار الفعلي بعدين.
      </p>
    </GlassPanel>
  )
}

function IntroCard({ exam, isResume, onStart, starting, error }) {
  return (
    <GlassPanel className="p-6 sm:p-8 space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)' }}>
          {isResume ? 'استكملي اختبارك من حيث توقفتِ' : 'تعليمات قبل البدء'}
        </h2>
      </div>
      <ul className="space-y-3 text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
        <Bullet>الاختبار من ١٠٠ درجة. النجاح من ٦٠.</Bullet>
        <Bullet>
          مدته <strong>{exam.duration_minutes}</strong> دقيقة من لحظة الضغط على «ابدئي».
        </Bullet>
        <Bullet>محاولة واحدة فقط — تأكدي من اتصالك بالإنترنت قبل البدء.</Bullet>
        <Bullet>تُحفظ إجاباتك تلقائياً. لو الصفحة أعادت تحميل، تستكملين من نفس النقطة.</Bullet>
        <Bullet>
          الكتابة: لا تقل عن <strong>{exam.min_writing_words}</strong> كلمة.
        </Bullet>
        <Bullet>ركّزي. خذي نفس. وفّقك الله.</Bullet>
      </ul>
      {error && (
        <div
          className="p-3 rounded-lg text-sm flex items-start gap-2"
          style={{
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.30)',
            color: 'var(--ds-accent-error, #ef4444)',
          }}
        >
          <AlertCircle size={16} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <PrimaryButton onClick={onStart} disabled={starting} className="w-full">
        {starting ? (
          <span className="flex items-center gap-2">
            <Clock size={18} className="animate-spin" />
            <span>...جاري التحميل</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            {isResume ? 'استكملي اختبارك' : 'ابدئي الاختبار الآن'}
            <ChevronRight size={18} />
          </span>
        )}
      </PrimaryButton>
    </GlassPanel>
  )
}

function Bullet({ children }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className="inline-block mt-2 shrink-0"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--ds-accent-primary, #e9b949)',
        }}
      />
      <span>{children}</span>
    </li>
  )
}

function friendlyRpcError(msg) {
  if (msg.includes('exam_in_preview_mode')) return 'الاختبار حالياً في وضع المعاينة. هذا الاختبار غير متاح لك بعد.'
  if (msg.includes('exam_not_open_yet')) return 'الاختبار لم يفتح بعد. أعيدي تحميل الصفحة لاحقاً.'
  if (msg.includes('exam_closed')) return 'انتهت نافذة الاختبار التجريبي.'
  if (msg.includes('already_submitted')) return 'لقد سلّمتِ اختبارك مسبقاً.'
  if (msg.includes('student_level_mismatch')) return 'هذا الاختبار غير متاح لمستواك.'
  if (msg.includes('exam_not_found_or_inactive')) return 'الاختبار غير متاح حالياً.'
  return 'تعذّر بدء الاختبار. حاولي مرة أخرى أو تواصلي مع المدرب.'
}
