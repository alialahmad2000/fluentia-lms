import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useErrorsDueForReview, useSubmitErrorReview } from '@/hooks/ielts/useErrorBank'
import ErrorReviewCard from '@/components/ielts/errors/ErrorReviewCard'
import ReviewSessionSummary from '@/components/ielts/errors/ReviewSessionSummary'

export default function ErrorBankReview() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentId = profile?.id

  const dueQ = useErrorsDueForReview(studentId, 20)
  const submitMut = useSubmitErrorReview()

  const [currentIdx, setCurrentIdx] = useState(0)
  const [stats, setStats] = useState({ correct: 0, wrong: 0, mastered: 0 })
  const [done, setDone] = useState(false)

  if (!studentId) return null

  if (dueQ.isLoading) {
    return (
      <div style={{ maxWidth: 640, margin: '80px auto', padding: 16, textAlign: 'center' }} dir="rtl">
        <GlassPanel style={{ padding: 48 }}>
          <Loader size={28} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>جاري تحميل الأخطاء…</p>
        </GlassPanel>
      </div>
    )
  }

  const queue = dueQ.data || []

  if (queue.length === 0 || done) {
    if (done) {
      return (
        <div style={{ maxWidth: 560, margin: '60px auto', padding: 16 }} dir="rtl">
          <ReviewSessionSummary
            correct={stats.correct}
            wrong={stats.wrong}
            mastered={stats.mastered}
          />
        </div>
      )
    }
    return (
      <div style={{ maxWidth: 560, margin: '80px auto', padding: 16, textAlign: 'center' }} dir="rtl">
        <GlassPanel style={{ padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 8 }}>
            ممتاز! ما عندك أخطاء مستحقة الآن
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7, marginBottom: 24 }}>
            الأخطاء المجدولة ستظهر هنا في وقتها المناسب حسب الجدول الذكي
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/student/ielts/errors')}
              style={{ padding: '11px 22px', borderRadius: 12, background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1.5px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}
            >
              بنك الأخطاء
            </button>
            <button
              onClick={() => navigate('/student/ielts/plan')}
              style={{ padding: '11px 22px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}
            >
              خطتي
            </button>
          </div>
        </GlassPanel>
      </div>
    )
  }

  const currentError = queue[currentIdx]

  const handleAnswer = async (wasCorrect) => {
    const result = await submitMut.mutateAsync({
      studentId,
      errorId: currentError.id,
      wasCorrect,
      timesSeen: currentError.times_seen || 0,
      timesCorrect: currentError.times_correct || 0,
    })
    setStats(s => ({
      correct: s.correct + (wasCorrect ? 1 : 0),
      wrong: s.wrong + (wasCorrect ? 0 : 1),
      mastered: s.mastered + (result.mastered ? 1 : 0),
    }))
    if (currentIdx + 1 >= queue.length) {
      setDone(true)
    } else {
      setCurrentIdx(i => i + 1)
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }} dir="rtl">
      <button
        onClick={() => navigate('/student/ielts/errors')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        ← بنك الأخطاء
      </button>

      <AnimatePresence mode="wait">
        <ErrorReviewCard
          key={currentError.id}
          error={currentError}
          cardIndex={currentIdx}
          totalCards={queue.length}
          onCorrect={() => handleAnswer(true)}
          onWrong={() => handleAnswer(false)}
          isSubmitting={submitMut.isPending}
        />
      </AnimatePresence>
    </div>
  )
}
