import { useState, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useSpeakingQuestions, useSubmitSpeakingSession } from '@/hooks/ielts/useSpeakingLab'
import SpeakingRecorder from '@/components/ielts/speaking/SpeakingRecorder'
import CueCardDisplay from '@/components/ielts/speaking/CueCardDisplay'
import PrepTimer from '@/components/ielts/speaking/PrepTimer'

const PART_META = {
  1: { label_ar: 'الجزء الأول', minSec: 8, maxSec: 40 },
  2: { label_ar: 'الجزء الثاني', minSec: 45, maxSec: 120 },
  3: { label_ar: 'الجزء الثالث', minSec: 15, maxSec: 60 },
}

// Stages: overview → (prep — Part 2 only) → recording → done → submitting
const STAGE = {
  OVERVIEW: 'overview',
  PREP: 'prep',
  RECORDING: 'recording',
  DONE: 'done',
  SUBMITTING: 'submitting',
  ERROR: 'error',
}

function QuestionNav({ questions, currentIdx, recordings }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {questions.map((_, i) => {
        const done = recordings[i] != null
        const active = i === currentIdx
        return (
          <div
            key={i}
            style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, fontFamily: 'Tajawal',
              background: done ? 'rgba(74,222,128,0.15)' : active ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
              border: done ? '1.5px solid rgba(74,222,128,0.4)' : active ? '1.5px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.1)',
              color: done ? '#4ade80' : active ? '#ef4444' : 'var(--text-tertiary)',
            }}
          >
            {done ? '✓' : i + 1}
          </div>
        )
      })}
    </div>
  )
}

export default function SpeakingSession() {
  const navigate = useNavigate()
  const { questionId } = useParams()
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id

  const [stage, setStage] = useState(STAGE.OVERVIEW)
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [recordings, setRecordings] = useState([])
  const [submitError, setSubmitError] = useState(null)

  const submitMut = useSubmitSpeakingSession()

  const q1 = useSpeakingQuestions(1)
  const q2 = useSpeakingQuestions(2)
  const q3 = useSpeakingQuestions(3)

  const questionRow = useMemo(() => {
    const all = [...(q1.data || []), ...(q2.data || []), ...(q3.data || [])]
    return all.find(r => String(r.id) === String(questionId)) || null
  }, [q1.data, q2.data, q3.data, questionId])

  const isLoading = q1.isLoading || q2.isLoading || q3.isLoading
  const isError = !isLoading && !questionRow && (q1.isFetched || q2.isFetched || q3.isFetched)

  const partNumber = questionRow?.part || null
  const meta = PART_META[partNumber] || PART_META[1]
  const isPartTwo = partNumber === 2

  const rawQuestions = useMemo(() => {
    if (!questionRow) return []
    const qs = Array.isArray(questionRow.questions) ? questionRow.questions : []
    return qs.map(q => (typeof q === 'string' ? q : q.q))
  }, [questionRow])

  const handleRecorded = useCallback((blob, mimeType, extension, durationSec) => {
    setRecordings(prev => {
      const next = [...prev]
      next[currentQIdx] = { blob, mimeType, extension, duration: durationSec }
      return next
    })
  }, [currentQIdx])

  const goNextQuestion = useCallback(() => {
    if (currentQIdx < rawQuestions.length - 1) {
      setCurrentQIdx(i => i + 1)
      setStage(STAGE.RECORDING)
    } else {
      setStage(STAGE.DONE)
    }
  }, [currentQIdx, rawQuestions.length])

  const handleSubmit = useCallback(async () => {
    if (!studentId || !questionRow) return
    setSubmitError(null)
    setStage(STAGE.SUBMITTING)

    try {
      const result = await submitMut.mutateAsync({
        studentId,
        partNum: partNumber,
        questionRowId: questionRow.id,
        questions: rawQuestions,
        cueCard: isPartTwo ? (questionRow.cue_card || null) : null,
        recordings: recordings.map(r => r || null),
      })
      navigate(`/student/ielts/speaking/feedback/${result.sessionId}`, { replace: true })
    } catch (err) {
      setSubmitError(err?.message || 'حدث خطأ أثناء التقييم')
      setStage(STAGE.ERROR)
    }
  }, [studentId, questionRow, partNumber, rawQuestions, isPartTwo, recordings, submitMut, navigate])

  // Guards after all hooks
  if (!studentId) return null

  if (isLoading) {
    return (
      <div style={{ maxWidth: 700, margin: '60px auto', padding: 16, textAlign: 'center' }} dir="rtl">
        <GlassPanel style={{ padding: 40 }}>
          <Loader size={24} style={{ color: 'var(--text-tertiary)', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>جاري تحميل الأسئلة…</p>
        </GlassPanel>
      </div>
    )
  }

  if (isError || !questionRow) {
    return (
      <div style={{ maxWidth: 700, margin: '60px auto', padding: 16 }} dir="rtl">
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', fontFamily: 'Tajawal', marginBottom: 12 }}>لم يتم العثور على الأسئلة</p>
          <button onClick={() => navigate('/student/ielts/speaking')} style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
            العودة لمعمل المحادثة
          </button>
        </GlassPanel>
      </div>
    )
  }

  const allRecorded = rawQuestions.length > 0 && rawQuestions.every((_, i) => recordings[i] != null)
  const currentQ = rawQuestions[currentQIdx]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 700, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      <button
        onClick={() => navigate(`/student/ielts/speaking/part/${partNumber}`)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
        {meta.label_ar}
      </button>

      {/* Header */}
      <GlassPanel elevation={2} style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', letterSpacing: '0.06em', marginBottom: 4 }}>
              {meta.label_ar} — {questionRow.topic}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
              {rawQuestions.length} سؤال
            </p>
          </div>
          <QuestionNav questions={rawQuestions} currentIdx={currentQIdx} recordings={recordings} />
        </div>
      </GlassPanel>

      <AnimatePresence mode="wait">

        {/* OVERVIEW */}
        {stage === STAGE.OVERVIEW && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassPanel style={{ padding: 24, marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 12 }}>
                {questionRow.topic}
              </p>
              {isPartTwo && <CueCardDisplay cueCard={questionRow.cue_card} topic={questionRow.topic} />}
              {!isPartTwo && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {rawQuestions.map((q, i) => (
                    <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 2 }}>س{i + 1}</p>
                      <p style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'sans-serif', direction: 'ltr', lineHeight: 1.6 }}>{q}</p>
                    </div>
                  ))}
                </div>
              )}
            </GlassPanel>

            <GlassPanel style={{ padding: 16, marginBottom: 16, background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.12)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7 }}>
                {isPartTwo
                  ? `ستحصل على ${isPartTwo ? 60 : 0} ثانية للتحضير، ثم تسجّل ردّك المتواصل (${meta.minSec}–${meta.maxSec} ثانية).`
                  : `ستُجيب على كل سؤال بشكل منفصل (${meta.minSec}–${meta.maxSec} ثانية لكل منهم). قرأ الأسئلة أعلاه وجهّز أفكارك.`
                }
              </p>
            </GlassPanel>

            <button
              onClick={() => isPartTwo ? setStage(STAGE.PREP) : setStage(STAGE.RECORDING)}
              style={{ width: '100%', padding: '14px 20px', borderRadius: 14, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.35)', fontFamily: 'Tajawal', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}
            >
              {isPartTwo ? 'ابدأ وقت التحضير (60 ثانية)' : 'ابدأ الجلسة'}
            </button>
          </motion.div>
        )}

        {/* PREP (Part 2 only) */}
        {stage === STAGE.PREP && (
          <motion.div key="prep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
              <CueCardDisplay cueCard={questionRow.cue_card} topic={questionRow.topic} />
            </GlassPanel>
            <PrepTimer durationSec={60} onDone={() => setStage(STAGE.RECORDING)} />
          </motion.div>
        )}

        {/* RECORDING */}
        {stage === STAGE.RECORDING && (
          <motion.div key={`recording-${currentQIdx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassPanel style={{ padding: 24, marginBottom: 16 }}>
              {!isPartTwo && (
                <>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 8 }}>
                    السؤال {currentQIdx + 1} من {rawQuestions.length}
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'sans-serif', direction: 'ltr', lineHeight: 1.6, marginBottom: 20 }}>
                    {currentQ}
                  </p>
                </>
              )}
              {isPartTwo && (
                <div style={{ marginBottom: 20 }}>
                  <CueCardDisplay cueCard={questionRow.cue_card} topic={questionRow.topic} />
                </div>
              )}

              <SpeakingRecorder
                key={currentQIdx}
                minSeconds={meta.minSec}
                maxSeconds={meta.maxSec}
                onRecorded={(blob, mimeType, extension, durationSec) => {
                  handleRecorded(blob, mimeType, extension, durationSec)
                }}
              />

              {recordings[currentQIdx] && (
                <button
                  onClick={goNextQuestion}
                  style={{ width: '100%', marginTop: 16, padding: '12px 20px', borderRadius: 12, background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1.5px solid rgba(74,222,128,0.3)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  {currentQIdx < rawQuestions.length - 1 ? 'السؤال التالي →' : 'إنهاء التسجيل'}
                </button>
              )}
            </GlassPanel>
          </motion.div>
        )}

        {/* DONE */}
        {stage === STAGE.DONE && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassPanel style={{ padding: 24, marginBottom: 16, textAlign: 'center' }}>
              <CheckCircle size={40} style={{ color: '#4ade80', margin: '0 auto 16px', display: 'block' }} />
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 8 }}>
                انتهيت من جميع الأسئلة!
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 20 }}>
                {recordings.filter(Boolean).length} تسجيل جاهز — اضغط للحصول على تقييمك
              </p>

              {/* Summary of recordings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, textAlign: 'right' }}>
                {rawQuestions.map((q, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: recordings[i] ? 'rgba(74,222,128,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${recordings[i] ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                    <span style={{ fontSize: 16 }}>{recordings[i] ? '✓' : '✗'}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, color: recordings[i] ? '#4ade80' : '#ef4444', fontFamily: 'Tajawal', fontWeight: 700 }}>
                        {isPartTwo ? 'الحديث المتواصل' : `السؤال ${i + 1}`}
                      </p>
                      {recordings[i] && (
                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                          {recordings[i].duration}s
                        </p>
                      )}
                    </div>
                    {!recordings[i] && (
                      <button
                        onClick={() => { setCurrentQIdx(i); setStage(STAGE.RECORDING) }}
                        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontFamily: 'Tajawal', cursor: 'pointer' }}
                      >
                        سجّل
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!allRecorded}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 14,
                  background: allRecorded ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                  color: allRecorded ? '#ef4444' : 'var(--text-tertiary)',
                  border: `1.5px solid ${allRecorded ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  fontFamily: 'Tajawal', fontWeight: 800, fontSize: 15,
                  cursor: allRecorded ? 'pointer' : 'default',
                }}
              >
                احصل على تقييمك
              </button>
            </GlassPanel>
          </motion.div>
        )}

        {/* SUBMITTING */}
        {stage === STAGE.SUBMITTING && (
          <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassPanel style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Loader size={28} style={{ color: '#ef4444', animation: 'spin 1s linear infinite' }} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 8 }}>
                جاري تحليل تسجيلاتك…
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                قد يستغرق الأمر حتى دقيقتين — لا تغلق الصفحة
              </p>
            </GlassPanel>
          </motion.div>
        )}

        {/* ERROR */}
        {stage === STAGE.ERROR && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassPanel style={{ padding: 32, textAlign: 'center' }}>
              <AlertCircle size={36} style={{ color: '#ef4444', margin: '0 auto 16px', display: 'block' }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: '#ef4444', fontFamily: 'Tajawal', marginBottom: 8 }}>
                فشل التقييم
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7, marginBottom: 20 }}>
                {submitError}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 16 }}>
                تسجيلاتك محفوظة — يمكنك إعادة المحاولة
              </p>
              <button
                onClick={handleSubmit}
                style={{ padding: '12px 28px', borderRadius: 12, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.35)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                إعادة المحاولة
              </button>
            </GlassPanel>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  )
}
