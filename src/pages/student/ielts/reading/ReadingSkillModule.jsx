import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, BookOpen, AlertTriangle, Lightbulb, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useReadingSkill, usePassagesForPractice, useSubmitReadingSession } from '@/hooks/ielts/useReadingLab'
import { gradeQuestions } from '@/lib/ielts/grading'

const TABS = [
  { id: 'strategy',  label: 'شرح الاستراتيجية', icon: Lightbulb },
  { id: 'mistakes',  label: 'الفخاخ الشائعة',    icon: AlertTriangle },
  { id: 'example',   label: 'مثال محلول',          icon: BookOpen },
  { id: 'practice',  label: 'التدريب',              icon: Clock },
]

// ─── Strategy Tab ────────────────────────────────────────────
function StrategyTab({ skill }) {
  return (
    <div style={{ padding: 4 }}>
      {skill.explanation_ar ? (
        <GlassPanel style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#38bdf8', fontFamily: 'Tajawal', marginBottom: 14 }}>
            ما هو هذا النوع؟
          </h3>
          <p style={{ fontSize: 15, color: 'var(--text-primary)', fontFamily: 'Tajawal', lineHeight: 2 }}>
            {skill.explanation_ar}
          </p>
        </GlassPanel>
      ) : (
        <ComingSoonContent label="شرح الاستراتيجية" />
      )}

      {Array.isArray(skill.strategy_steps) && skill.strategy_steps.length > 0 && (
        <GlassPanel style={{ padding: 24, marginTop: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 14 }}>
            خطوات الحل
          </h3>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {skill.strategy_steps.map((step, i) => (
              <li key={i} style={{ display: 'flex', gap: 12 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                <span style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'Tajawal', lineHeight: 1.8 }}>
                  {typeof step === 'string' ? step : (step.title || step.body || JSON.stringify(step))}
                </span>
              </li>
            ))}
          </ol>
        </GlassPanel>
      )}

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 12 }}>
          جاهز للتدريب؟
        </p>
        <button
          onClick={() => document.getElementById('tab-practice')?.click()}
          style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.35)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}
        >
          انتقل للتدريب ←
        </button>
      </div>
    </div>
  )
}

// ─── Mistakes Tab ────────────────────────────────────────────
function MistakesTab({ skill }) {
  const mistakes = Array.isArray(skill.common_mistakes_ar) && skill.common_mistakes_ar.length > 0
    ? skill.common_mistakes_ar
    : null

  if (!mistakes) return <ComingSoonContent label="الفخاخ الشائعة" />

  return (
    <GlassPanel style={{ padding: 24, border: '1px solid rgba(251,146,60,0.2)', background: 'rgba(251,146,60,0.03)' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fb923c', fontFamily: 'Tajawal', marginBottom: 16 }}>
        الأخطاء الأكثر شيوعاً ⚠️
      </h3>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mistakes.map((m, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--text-primary)', fontFamily: 'Tajawal', lineHeight: 1.8 }}>
            <span style={{ color: '#fb923c', flexShrink: 0 }}>•</span>
            {typeof m === 'string' ? m : (m.text || m.title || JSON.stringify(m))}
          </li>
        ))}
      </ul>
    </GlassPanel>
  )
}

// ─── Worked Example Tab ──────────────────────────────────────
function ExampleTab({ skill }) {
  const example = skill.worked_example
  if (!example || (typeof example === 'object' && Object.keys(example).length === 0)) {
    return <ComingSoonContent label="مثال محلول" />
  }

  return (
    <GlassPanel style={{ padding: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#4ade80', fontFamily: 'Tajawal', marginBottom: 16 }}>
        مثال محلول بالتفصيل
      </h3>
      <pre style={{ fontSize: 13, color: 'var(--text-secondary)', direction: 'ltr', textAlign: 'left', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
        {JSON.stringify(example, null, 2)}
      </pre>
    </GlassPanel>
  )
}

// ─── Coming Soon placeholder ─────────────────────────────────
function ComingSoonContent({ label }) {
  return (
    <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ fontSize: 32, marginBottom: 12 }}>🔧</p>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 6 }}>
        {label} — قريباً
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
        نعمل على إضافة هذا المحتوى. جرّب التدريب في هذه الأثناء!
      </p>
    </GlassPanel>
  )
}

// ─── Practice Tab ────────────────────────────────────────────
function PracticeTab({ skill, studentId, onSessionComplete }) {
  const passagesQ = usePassagesForPractice(4)
  const submitSession = useSubmitReadingSession()

  const [sessionStarted, setSessionStarted] = useState(false)
  const [passageIdx, setPassageIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [gradeResult, setGradeResult] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [sessionResult, setSessionResult] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (sessionStarted && !submitted) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [sessionStarted, submitted])

  const passages = passagesQ.data || []

  if (passagesQ.isLoading) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>جاري تحميل التمارين...</div>
  }
  if (passages.length === 0) {
    return (
      <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ fontSize: 28, marginBottom: 12 }}>📚</p>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 6 }}>
          لا توجد تمارين متاحة حالياً
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          نعمل على إضافة المزيد من النصوص — تحقق لاحقاً
        </p>
      </GlassPanel>
    )
  }

  // Show results screen
  if (sessionResult) {
    const band = sessionResult.band
    const bandColor = band >= 7 ? '#4ade80' : band >= 5.5 ? '#38bdf8' : '#fb923c'
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <GlassPanel style={{ padding: 32, textAlign: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>{band >= 7 ? '🏆' : band >= 5 ? '✅' : '📈'}</p>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 8 }}>نتيجة الجلسة</p>
          <div style={{ fontSize: 56, fontWeight: 900, color: bandColor, fontFamily: 'Tajawal', lineHeight: 1, marginBottom: 8 }}>
            {band?.toFixed(1) || '—'}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
            {sessionResult.correct}/{sessionResult.total} إجابة صحيحة
          </p>
        </GlassPanel>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setSessionResult(null); setSessionStarted(false); setPassageIdx(0); setAnswers({}); setSubmitted(false); setGradeResult(null); setElapsed(0) }}
            style={{ flex: 1, padding: '12px 20px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
            جلسة جديدة
          </button>
          <button onClick={() => onSessionComplete?.()}
            style={{ flex: 1, padding: '12px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
            العودة للمعمل
          </button>
        </div>
      </motion.div>
    )
  }

  // Start screen
  if (!sessionStarted) {
    return (
      <GlassPanel style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 36, marginBottom: 16 }}>📖</p>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 8 }}>
          جاهز للتدريب؟
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 8, lineHeight: 1.8 }}>
          {passages.length} نص قراءة متاح
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 24 }}>
          أجب على الأسئلة، ثم اطلع على الإجابات الصحيحة والتفسيرات
        </p>
        <button onClick={() => setSessionStarted(true)}
          style={{ padding: '14px 32px', borderRadius: 12, background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1.5px solid rgba(56,189,248,0.4)', fontFamily: 'Tajawal', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
          ابدأ التدريب ←
        </button>
      </GlassPanel>
    )
  }

  const passage = passages[passageIdx]
  const qs = Array.isArray(passage?.questions) ? passage.questions : []
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  const handleSubmit = () => {
    const result = gradeQuestions({ questions: qs, answerKey: passage.answer_key, studentAnswers: answers })
    setGradeResult(result)
    setSubmitted(true)
  }

  const handleNextPassage = async () => {
    if (passageIdx < passages.length - 1) {
      setPassageIdx(i => i + 1)
      setAnswers({})
      setSubmitted(false)
      setGradeResult(null)
    } else {
      // Compute combined result from this passage
      const result = gradeResult || gradeQuestions({ questions: qs, answerKey: passage.answer_key, studentAnswers: answers })
      clearInterval(timerRef.current)
      try {
        await submitSession.mutateAsync({
          studentId,
          questionType: skill.question_type,
          passageId: passage.id,
          gradeResult: result,
          durationSeconds: elapsed,
        })
      } catch (e) {
        console.warn('Session submit failed:', e)
      }
      setSessionResult(result)
    }
  }

  const allAnswered = qs.every(q => answers[String(q.question_number)] != null)

  return (
    <div>
      {/* Timer + progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          نص {passageIdx + 1} / {passages.length}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontVariantNumeric: 'tabular-nums' }}>
          ⏱ {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
        </span>
      </div>

      {/* Passage + questions side by side on desktop */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <GlassPanel style={{ flex: 1, padding: 20, maxHeight: '60vh', overflowY: 'auto' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 12 }}>
            {passage.title}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 2, direction: 'ltr', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
            {passage.content}
          </p>
        </GlassPanel>

        <div style={{ flex: 1, maxHeight: '60vh', overflowY: 'auto' }}>
          <GlassPanel style={{ padding: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 14 }}>
              {qs.length} سؤال
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {qs.map((q, i) => {
                const qNum = String(q.question_number ?? i + 1)
                const given = answers[qNum]
                const feedback = submitted ? gradeResult?.perQuestion?.find(r => String(r.qNum) === qNum) : null
                return (
                  <PracticeQuestion
                    key={qNum}
                    question={q}
                    qNum={qNum}
                    index={i + 1}
                    given={given}
                    feedback={feedback}
                    submitted={submitted}
                    onChange={val => setAnswers(a => ({ ...a, [qNum]: val }))}
                  />
                )
              })}
            </div>
          </GlassPanel>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            style={{
              flex: 1, padding: '12px 20px', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, cursor: allAnswered ? 'pointer' : 'default',
              background: allAnswered ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.04)',
              color: allAnswered ? '#38bdf8' : 'var(--text-tertiary)',
              border: `1.5px solid ${allAnswered ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {allAnswered ? 'تحقق من الإجابات ←' : `أجب على جميع الأسئلة (${Object.keys(answers).length}/${qs.length})`}
          </button>
        ) : (
          <button
            onClick={handleNextPassage}
            disabled={submitSession.isPending}
            style={{ flex: 1, padding: '12px 20px', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, cursor: 'pointer', background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1.5px solid rgba(74,222,128,0.35)' }}
          >
            {submitSession.isPending ? 'جاري الحفظ...' : passageIdx < passages.length - 1 ? 'النص التالي ←' : 'إنهاء الجلسة ✓'}
          </button>
        )}
      </div>
    </div>
  )
}

function PracticeQuestion({ question, qNum, index, given, feedback, submitted, onChange }) {
  const type = question.options ? 'multiple_choice' : 'short_answer'
  const stem = question.question_text || question.statement || `السؤال ${index}`
  const options = question.options

  const getFeedbackStyle = (optKey) => {
    if (!submitted || !feedback) return {}
    if (optKey === feedback.expected) return { background: 'rgba(74,222,128,0.15)', border: '1.5px solid rgba(74,222,128,0.4)', color: '#4ade80' }
    if (optKey === given && !feedback.isCorrect) return { background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)', color: '#ef4444' }
    return {}
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
        {submitted && feedback && (
          feedback.isCorrect
            ? <CheckCircle size={16} style={{ color: '#4ade80', flexShrink: 0, marginTop: 2 }} />
            : <XCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
        )}
        <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, direction: 'ltr', textAlign: 'left' }}>{index}. {stem}</p>
      </div>

      {options ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(options).map(([k, v]) => (
            <button
              key={k}
              onClick={!submitted ? () => onChange(k) : undefined}
              style={{
                padding: '8px 12px', borderRadius: 9, textAlign: 'left', fontSize: 13, cursor: submitted ? 'default' : 'pointer',
                background: given === k && !submitted ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.03)',
                color: given === k && !submitted ? '#38bdf8' : 'var(--text-secondary)',
                border: given === k && !submitted ? '1.5px solid rgba(56,189,248,0.35)' : '1px solid rgba(255,255,255,0.08)',
                ...getFeedbackStyle(k),
                transition: 'all 0.2s',
              }}
            >
              <strong>{k}.</strong> {v}
            </button>
          ))}
        </div>
      ) : (
        <input
          value={given || ''}
          onChange={e => !submitted && onChange(e.target.value)}
          disabled={submitted}
          placeholder="Answer..."
          style={{ width: '100%', padding: '8px 12px', borderRadius: 9, fontSize: 13, background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none', direction: 'ltr', boxSizing: 'border-box' }}
        />
      )}

      {submitted && feedback && !feedback.isCorrect && feedback.explanation && (
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6, fontFamily: 'sans-serif', direction: 'ltr', fontStyle: 'italic' }}>
          💡 {feedback.explanation}
        </p>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────
export default function ReadingSkillModule() {
  const { questionType } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('strategy')

  const profile = useAuthStore(s => s.profile)
  const studentId = profile?.id
  const skillQ = useReadingSkill(questionType)

  // Guards after hooks
  if (!studentId) return null

  if (skillQ.isLoading) {
    const pulse = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
        <div style={{ ...pulse, height: 56, width: 200, marginBottom: 20 }} />
        <div style={{ ...pulse, height: 48, marginBottom: 16 }} />
        <div style={{ ...pulse, height: 300 }} />
      </div>
    )
  }

  if (!skillQ.data) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: 16, textAlign: 'center' }} dir="rtl">
        <GlassPanel style={{ padding: 40 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 16 }}>نوع السؤال غير موجود</p>
          <button onClick={() => navigate('/student/ielts/reading')}
            style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
            العودة للمعمل
          </button>
        </GlassPanel>
      </div>
    )
  }

  const skill = skillQ.data

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      {/* Back */}
      <button
        onClick={() => navigate('/student/ielts/reading')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
        معمل القراءة
      </button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
          {skill.name_ar}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'sans-serif' }}>
          {skill.name_en}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', borderRadius: '10px 10px 0 0',
                fontFamily: 'Tajawal', fontWeight: active ? 700 : 500, fontSize: 13, cursor: 'pointer',
                background: active ? 'rgba(56,189,248,0.1)' : 'transparent',
                color: active ? '#38bdf8' : 'var(--text-tertiary)',
                border: 'none',
                borderBottom: active ? '2px solid #38bdf8' : '2px solid transparent',
              }}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'strategy' && <StrategyTab skill={skill} />}
          {activeTab === 'mistakes' && <MistakesTab skill={skill} />}
          {activeTab === 'example' && <ExampleTab skill={skill} />}
          {activeTab === 'practice' && (
            <PracticeTab
              skill={skill}
              studentId={studentId}
              onSessionComplete={() => navigate('/student/ielts/reading')}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
