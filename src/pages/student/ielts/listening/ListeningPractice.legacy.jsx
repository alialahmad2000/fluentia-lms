import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, CheckCircle, XCircle, Volume2, FileText } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import AudioPlayer from '@/components/ielts/diagnostic/AudioPlayer'
import QuestionRenderer from '@/components/ielts/shared/QuestionRenderer'
import { gradeQuestions } from '@/lib/ielts/grading'
import { useListeningSection, useSubmitListeningSession } from '@/hooks/ielts/useListeningLab'

const SECTION_META = {
  1: { icon: '🗣️', label_ar: 'القسم ١' },
  2: { icon: '🎤', label_ar: 'القسم ٢' },
  3: { icon: '🎓', label_ar: 'القسم ٣' },
  4: { icon: '📚', label_ar: 'القسم ٤' },
}

function PracticeSkeleton() {
  const pulse = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }} dir="rtl">
      <div style={{ ...pulse, height: 56, marginBottom: 20 }} />
      <div style={{ ...pulse, height: 100, marginBottom: 16 }} />
      <div style={{ ...pulse, height: 300 }} />
    </div>
  )
}

function PracticeError({ onBack }) {
  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: 16, textAlign: 'center' }} dir="rtl">
      <GlassPanel style={{ padding: 40 }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 16 }}>
          تعذّر تحميل الجلسة
        </p>
        <button onClick={onBack} style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
          العودة
        </button>
      </GlassPanel>
    </div>
  )
}

// ── Elapsed timer ─────────────────────────────────────────────
function useTimer(active) {
  const [elapsed, setElapsed] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (active) ref.current = setInterval(() => setElapsed(e => e + 1), 1000)
    else clearInterval(ref.current)
    return () => clearInterval(ref.current)
  }, [active])
  return elapsed
}

// ── Post-submit result screen ─────────────────────────────────
function PracticeResult({ section, sectionNumber, gradeResult, studentAnswers, onBack, onNewSession }) {
  const [replayEnabled, setReplayEnabled] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const meta = SECTION_META[sectionNumber] || {}
  const band = gradeResult.band
  const bandColor = band ? (band >= 7 ? '#4ade80' : band >= 5.5 ? '#38bdf8' : '#fb923c') : '#38bdf8'
  const questions = Array.isArray(section.questions) ? section.questions : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      {/* Result header */}
      <GlassPanel elevation={2} style={{ padding: 28, marginBottom: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 8 }}>
          {meta.icon} {meta.label_ar} · {section.title}
        </p>
        <div style={{ fontSize: 52, fontWeight: 900, color: bandColor, fontFamily: 'Tajawal', lineHeight: 1, marginBottom: 8 }}>
          {band ? band.toFixed(1) : '—'}
        </div>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 20 }}>
          {gradeResult.correct} من {gradeResult.total} إجابة صحيحة
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setReplayEnabled(true); setShowTranscript(true) }}
            style={{ padding: '10px 20px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1.5px solid rgba(56,189,248,0.35)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            🔓 أعد الاستماع مع النص
          </button>
          <button
            onClick={onNewSession}
            style={{ padding: '10px 20px', borderRadius: 12, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1.5px solid rgba(74,222,128,0.3)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            تمرين جديد →
          </button>
          <button
            onClick={onBack}
            style={{ padding: '10px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            معمل الاستماع
          </button>
        </div>
      </GlassPanel>

      {/* Replay player (unlocked after submit) */}
      {replayEnabled && (
        <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 12 }}>
            🔓 الاستماع مجاناً بعد التقييم
          </p>
          <AudioPlayer
            src={section.audio_url}
            onePlayOnly={false}
            replayEnabled={true}
            label={section.title}
          />
          {showTranscript && section.transcript && (
            <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', maxHeight: 300, overflowY: 'auto' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 8 }}>النص الكامل</p>
              <pre style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left', fontFamily: 'sans-serif' }}>
                {section.transcript}
              </pre>
            </div>
          )}
        </GlassPanel>
      )}

      {/* Per-question review */}
      <GlassPanel style={{ padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 16 }}>
          مراجعة الإجابات
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {gradeResult.perQuestion.map((res, i) => {
            const q = questions[i] || {}
            return (
              <div key={res.qNum} style={{ paddingBottom: 14, borderBottom: i < gradeResult.perQuestion.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                  {res.isCorrect
                    ? <CheckCircle size={15} style={{ color: '#4ade80', flexShrink: 0, marginTop: 2 }} />
                    : <XCircle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                  }
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, direction: 'ltr', textAlign: 'left' }}>
                    {i + 1}. {res.text}
                  </p>
                </div>
                <QuestionRenderer
                  q={q}
                  qKey={String(res.qNum)}
                  answer={res.given || ''}
                  onChange={() => {}}
                  disabled={true}
                  feedback={res}
                />
              </div>
            )
          })}
        </div>
      </GlassPanel>
    </motion.div>
  )
}

// ── Main practice page ────────────────────────────────────────
export default function ListeningPractice() {
  const { sectionNumber: sectionNumberStr, sectionId } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id
  const sectionNumber = parseInt(sectionNumberStr, 10)

  const sectionQ = useListeningSection(sectionId)
  const submitMut = useSubmitListeningSession()

  const [answers, setAnswers] = useState({})
  const [notes, setNotes] = useState('')
  const [hasListened, setHasListened] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [gradeResult, setGradeResult] = useState(null)
  const [audioError, setAudioError] = useState(false)
  const startedAtRef = useRef(Date.now())

  const elapsed = useTimer(!submitted)

  const hasAccess = useMemo(() => {
    if (!studentData) return false
    if (studentData.package === 'ielts') return true
    if (Array.isArray(studentData.custom_access) && studentData.custom_access.includes('ielts')) return true
    return false
  }, [studentData])

  if (!studentId) return null
  if (!hasAccess) return <PracticeError onBack={() => navigate('/student/ielts/listening')} />
  if (sectionQ.isLoading) return <PracticeSkeleton />
  if (sectionQ.isError || !sectionQ.data) return <PracticeError onBack={() => navigate(`/student/ielts/listening/section/${sectionNumber}`)} />

  const section = sectionQ.data
  const questions = Array.isArray(section.questions) ? section.questions : []
  const meta = SECTION_META[sectionNumber] || {}

  const handleAnswer = (qKey, value) => {
    setAnswers(prev => ({ ...prev, [qKey]: value }))
  }

  const canSubmit = Object.keys(answers).length > 0 && hasListened && !submitted

  const handleSubmit = async () => {
    const result = gradeQuestions({
      questions,
      answerKey: section.answer_key,
      studentAnswers: answers,
    })
    setGradeResult(result)
    setSubmitted(true)

    const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000)
    try {
      await submitMut.mutateAsync({
        studentId,
        sectionId,
        sectionNumber,
        gradeResult: result,
        durationSeconds: durationSec,
      })
    } catch (e) {
      console.error('Session save failed:', e)
    }
  }

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  if (submitted && gradeResult) {
    return (
      <PracticeResult
        section={section}
        sectionNumber={sectionNumber}
        gradeResult={gradeResult}
        studentAnswers={answers}
        onBack={() => navigate('/student/ielts/listening')}
        onNewSession={() => navigate(`/student/ielts/listening/section/${sectionNumber}`)}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <button
          onClick={() => {
            if (Object.keys(answers).length && !window.confirm('سيتم فقدان تقدمك — متابعة؟')) return
            navigate(`/student/ielts/listening/section/${sectionNumber}`)
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer' }}
        >
          <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
          إنهاء الجلسة
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontVariantNumeric: 'tabular-nums' }}>
          ⏱ {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
        </span>
      </div>

      {/* Section info */}
      <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 24 }}>{meta.icon}</span>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
              {meta.label_ar} — {section.title}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
              {section.accent && (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                  🌍 {section.accent}
                </span>
              )}
              {section.audio_duration_seconds && (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                  ⏱ {Math.round(section.audio_duration_seconds / 60)} دقيقة
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                {questions.length} سؤال
              </span>
            </div>
          </div>
        </div>
        {section.context_description && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'sans-serif', direction: 'ltr', textAlign: 'left', lineHeight: 1.6 }}>
            {section.context_description}
          </p>
        )}
      </GlassPanel>

      {/* Audio player — one-play */}
      <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Volume2 size={16} style={{ color: '#38bdf8' }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>المقطع الصوتي</p>
          <span style={{ fontSize: 11, color: '#fb923c', fontFamily: 'Tajawal', marginRight: 'auto' }}>
            ⚠️ مرة واحدة — مثل الاختبار الحقيقي
          </span>
        </div>
        <AudioPlayer
          src={section.audio_url}
          onePlayOnly={true}
          onEnded={() => setHasListened(true)}
          label={section.title}
        />
        {!hasListened && (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginTop: 8, textAlign: 'center' }}>
            استمع للمقطع الصوتي ثم أجب على الأسئلة أدناه
          </p>
        )}
      </GlassPanel>

      {/* Notes area */}
      <GlassPanel style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <FileText size={14} style={{ color: 'var(--text-tertiary)' }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
            ملاحظاتي (اختياري — غير مصحّحة)
          </p>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="دوّن ملاحظاتك أثناء الاستماع..."
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13,
            background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)',
            border: '1px solid rgba(255,255,255,0.08)', outline: 'none',
            resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Tajawal',
            direction: 'rtl',
          }}
        />
      </GlassPanel>

      {/* Questions */}
      <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 18 }}>
          الأسئلة ({questions.length})
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {questions.map((q, i) => {
            const qKey = String(q.number ?? q.question_number ?? i + 1)
            return (
              <div key={qKey}>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, direction: 'ltr', textAlign: 'left', marginBottom: 8 }}>
                  {i + 1}. {q.text || q.question_text || q.statement || ''}
                  {q.instruction && (
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginTop: 2 }}>
                      {q.instruction}
                    </span>
                  )}
                </p>
                <QuestionRenderer
                  q={q}
                  qKey={qKey}
                  answer={answers[qKey] || ''}
                  onChange={val => handleAnswer(qKey, val)}
                  disabled={false}
                  feedback={null}
                />
              </div>
            )
          })}
        </div>
      </GlassPanel>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          width: '100%', padding: '14px 24px', borderRadius: 14,
          fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, cursor: canSubmit ? 'pointer' : 'default',
          background: canSubmit ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.04)',
          color: canSubmit ? '#38bdf8' : 'var(--text-tertiary)',
          border: `1.5px solid ${canSubmit ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.08)'}`,
        }}
      >
        {!hasListened ? 'اكمل الاستماع أولاً' : Object.keys(answers).length === 0 ? 'أجب على سؤال واحد على الأقل' : 'تسليم الإجابات ←'}
      </button>
    </motion.div>
  )
}
