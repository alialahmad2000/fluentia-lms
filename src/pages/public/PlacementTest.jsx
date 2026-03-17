import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Config ──────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1/adaptive-test`

const WHATSAPP_NUMBER = '966558669974'
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`

const ACADEMIC_LEVELS = {
  1: { cefr: 'A1', name_ar: '\u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u0623\u0648\u0644\u0649', name_en: 'First Step' },
  2: { cefr: 'A2', name_ar: '\u0628\u062f\u0627\u064a\u0629 \u0627\u0644\u062b\u0642\u0629', name_en: 'Building Confidence' },
  3: { cefr: 'B1', name_ar: '\u0635\u0627\u0631 \u064a\u062a\u0643\u0644\u0645', name_en: 'Finding Voice' },
  4: { cefr: 'B2', name_ar: '\u062b\u0642\u0629 \u0643\u0627\u0645\u0644\u0629', name_en: 'Full Confidence' },
  5: { cefr: 'C1', name_ar: '\u062c\u0627\u0647\u0632 \u0644\u0644\u0639\u0627\u0644\u0645', name_en: 'World Ready' },
}

const SKILL_LABELS = {
  grammar: '\u0627\u0644\u0642\u0648\u0627\u0639\u062f',
  vocabulary: '\u0627\u0644\u0645\u0641\u0631\u062f\u0627\u062a',
  reading: '\u0627\u0644\u0642\u0631\u0627\u0621\u0629',
  listening: '\u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0639',
  writing: '\u0627\u0644\u0643\u062a\u0627\u0628\u0629',
  speaking: '\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629',
}

const SKILL_COLORS = {
  grammar: 'var(--accent-violet)',
  vocabulary: 'var(--accent-sky)',
  reading: 'var(--accent-emerald)',
  listening: '#f472b6',
  writing: 'var(--accent-gold)',
  speaking: '#c084fc',
}

const OPTION_LABELS = ['A', 'B', 'C', 'D']

// ─── API helper ──────────────────────────────────────────────
async function callAdaptiveTest(body) {
  const res = await fetch(FUNCTIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Helpers ─────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getLevelFromCEFR(cefr) {
  for (const [num, info] of Object.entries(ACADEMIC_LEVELS)) {
    if (info.cefr === cefr) return { level: Number(num), ...info }
  }
  return { level: 1, ...ACADEMIC_LEVELS[1] }
}

// ─── SVG Circular Gauge ─────────────────────────────────────
function CircularGauge({ percentage, size = 180, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-raised)"
          strokeWidth={strokeWidth}
        />
        {/* Animated arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent-sky)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-4xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          {percentage}%
        </motion.span>
        <span className="text-xs mt-1" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.5))' }}>
          النتيجة الكلية
        </span>
      </div>
    </div>
  )
}

// ─── Skill Bar ───────────────────────────────────────────────
function SkillBar({ label, score, color, delay = 0 }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span style={{ color: 'var(--text-primary)' }}>{label}</span>
        <span className="font-medium" style={{ color }}>{score}%</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, delay: delay + 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export default function PlacementTest() {
  const [phase, setPhase] = useState('welcome') // welcome | test | analyzing | result
  const [userName, setUserName] = useState('')
  const [userPhone, setUserPhone] = useState('')

  // Test state
  const [sessionId, setSessionId] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalEstimated, setTotalEstimated] = useState('20-30')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answerFeedback, setAnswerFeedback] = useState(null) // 'correct' | 'incorrect' | null
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Result state
  const [results, setResults] = useState(null)

  // Timer
  const timerRef = useRef(null)
  const questionStartRef = useRef(Date.now())

  // ─── Timer effect ────────────────────────────────────────
  useEffect(() => {
    if (phase === 'test') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [phase])

  // ─── Start Test ──────────────────────────────────────────
  const handleStart = useCallback(async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const data = await callAdaptiveTest({
        action: 'start',
        test_type: 'placement',
        test_mode: 'public',
        student_name: userName || undefined,
        student_phone: userPhone || undefined,
        skills: ['grammar', 'vocabulary', 'reading'],
      })
      setSessionId(data.session_id)
      setCurrentQuestion(data.question)
      setQuestionNumber(data.question_number || 1)
      setTotalEstimated(data.total_estimated_questions || '20-30')
      setElapsedTime(0)
      questionStartRef.current = Date.now()
      setPhase('test')
    } catch (err) {
      setError(err.message || 'حدث خطأ في بدء الاختبار')
    } finally {
      setIsSubmitting(false)
    }
  }, [userName, userPhone])

  // ─── Submit Answer ───────────────────────────────────────
  const handleAnswer = useCallback(async (answer) => {
    if (isSubmitting || selectedAnswer !== null) return
    setSelectedAnswer(answer)
    setIsSubmitting(true)

    const responseTime = Math.round((Date.now() - questionStartRef.current) / 1000)

    try {
      const data = await callAdaptiveTest({
        action: 'answer',
        session_id: sessionId,
        question_id: currentQuestion.id,
        answer,
        time_spent_seconds: responseTime,
      })

      // Show feedback
      setAnswerFeedback(data.is_correct ? 'correct' : 'incorrect')

      // Wait for visual feedback then move on
      setTimeout(async () => {
        if (data.test_complete) {
          // Test is done -- get final results
          setPhase('analyzing')
          try {
            const completeData = await callAdaptiveTest({
              action: 'complete',
              session_id: sessionId,
            })
            setResults(completeData.results)
            setPhase('result')
          } catch (err) {
            // Even if analysis fails, show what we have
            if (data.stats) {
              setResults({
                estimated_level: data.stats.estimated_level,
                overall_score: data.stats.accuracy,
                skill_scores: data.stats.skill_scores || {},
                questions_answered: data.stats.questions_answered,
                correct_answers: data.stats.correct_answers,
              })
            }
            setPhase('result')
          }
        } else if (data.question) {
          setCurrentQuestion(data.question)
          setQuestionNumber(data.question_number || questionNumber + 1)
          setSelectedAnswer(null)
          setAnswerFeedback(null)
          questionStartRef.current = Date.now()
        }
        setIsSubmitting(false)
      }, 600)
    } catch (err) {
      setError(err.message || 'حدث خطأ')
      setIsSubmitting(false)
      setSelectedAnswer(null)
      setAnswerFeedback(null)
    }
  }, [isSubmitting, selectedAnswer, sessionId, currentQuestion, questionNumber])

  // ─── Share ───────────────────────────────────────────────
  const [copied, setCopied] = useState(false)
  const handleShare = useCallback(() => {
    if (!results) return
    const levelInfo = getLevelFromCEFR(results.estimated_level)
    const text = `حصلت على ${results.overall_score}% في اختبار Fluentia لتحديد المستوى!\nمستواي: المستوى ${levelInfo.level} — ${levelInfo.name_ar} (${levelInfo.cefr})\n\nاختبر مستواك مجاناً:\n${window.location.href}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }).catch(() => {
      // Fallback for mobile
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }, [results])

  // ─── Retry ───────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setPhase('welcome')
    setSessionId(null)
    setCurrentQuestion(null)
    setQuestionNumber(0)
    setElapsedTime(0)
    setSelectedAnswer(null)
    setAnswerFeedback(null)
    setResults(null)
    setError(null)
  }, [])

  // ─── Render ──────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      className="min-h-screen font-tajawal selection:bg-sky-500/30 overflow-x-hidden"
      style={{
        background: 'var(--page-bg-gradient, linear-gradient(135deg, #050d1a 0%, #0a1628 50%, #050d1a 100%))',
        color: 'var(--text-primary)',
      }}
    >
      <AnimatePresence mode="wait">
        {phase === 'welcome' && (
          <WelcomeScreen
            key="welcome"
            userName={userName}
            setUserName={setUserName}
            userPhone={userPhone}
            setUserPhone={setUserPhone}
            onStart={handleStart}
            isSubmitting={isSubmitting}
            error={error}
          />
        )}
        {phase === 'test' && currentQuestion && (
          <TestScreen
            key="test"
            question={currentQuestion}
            questionNumber={questionNumber}
            totalEstimated={totalEstimated}
            elapsedTime={elapsedTime}
            selectedAnswer={selectedAnswer}
            answerFeedback={answerFeedback}
            onAnswer={handleAnswer}
            isSubmitting={isSubmitting}
            error={error}
          />
        )}
        {phase === 'analyzing' && <AnalyzingScreen key="analyzing" />}
        {phase === 'result' && (
          <ResultScreen
            key="result"
            results={results}
            userName={userName}
            elapsedTime={elapsedTime}
            onShare={handleShare}
            onRetry={handleRetry}
            copied={copied}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
// WELCOME SCREEN
// ═════════════════════════════════════════════════════════════
function WelcomeScreen({ userName, setUserName, userPhone, setUserPhone, onStart, isSubmitting, error }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
    >
      <div className="text-center max-w-md w-full space-y-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1
            className="text-5xl md:text-6xl font-playfair tracking-wide"
            style={{ color: 'var(--accent-sky)' }}
          >
            Fluentia
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--accent-gold)' }}>
            Academy
          </p>
        </motion.div>

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <p className="text-lg" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.6))' }}>
            أهلاً وسهلاً بك
          </p>
          <h2 className="text-2xl md:text-3xl font-bold leading-relaxed">
            اختبار تحديد المستوى
          </h2>
          <p
            className="text-base leading-relaxed mx-auto max-w-sm"
            style={{ color: 'var(--text-secondary, rgba(255,255,255,0.5))' }}
          >
            هذا الاختبار يحدد مستواك في اللغة الإنجليزية. يتكيف مع إجاباتك ليعطيك نتيجة دقيقة.
          </p>
        </motion.div>

        {/* Input fields */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-3 max-w-xs mx-auto"
        >
          <input
            type="text"
            placeholder="اسمك (اختياري)"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200
                       placeholder:text-white/30 focus:ring-2"
            style={{
              background: 'var(--surface-raised)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              '--tw-ring-color': 'var(--accent-sky)',
            }}
            dir="rtl"
          />
          <input
            type="tel"
            placeholder="رقم الجوال (اختياري)"
            value={userPhone}
            onChange={e => setUserPhone(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200
                       placeholder:text-white/30 focus:ring-2"
            style={{
              background: 'var(--surface-raised)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              '--tw-ring-color': 'var(--accent-sky)',
            }}
            dir="ltr"
          />
        </motion.div>

        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-400 px-4"
          >
            {error}
          </motion.p>
        )}

        {/* Start Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          disabled={isSubmitting}
          className="w-full max-w-xs mx-auto block py-4 rounded-2xl text-xl font-bold
                     transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, var(--accent-sky) 0%, #0284c7 100%)',
            color: '#fff',
            boxShadow: '0 8px 32px rgba(56, 189, 248, 0.25)',
          }}
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              جاري التحميل...
            </span>
          ) : (
            'ابدأ الاختبار'
          )}
        </motion.button>

        {/* Time note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-sm"
          style={{ color: 'var(--text-secondary, rgba(255,255,255,0.35))' }}
        >
          الاختبار يأخذ حوالي ١٥-٢٠ دقيقة
        </motion.p>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="flex justify-center gap-5 text-xs pt-2 flex-wrap"
          style={{ color: 'var(--text-secondary, rgba(255,255,255,0.3))' }}
        >
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            ٢٠-٣٠ سؤال
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            يتكيف مع مستواك
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
            نتيجة تفصيلية
          </span>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="text-xs pt-6"
          style={{ color: 'rgba(255,255,255,0.15)' }}
        >
          <p>TikTok: @fluentia_ | Instagram: @fluentia__</p>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════
// TEST SCREEN
// ═════════════════════════════════════════════════════════════
function TestScreen({ question, questionNumber, totalEstimated, elapsedTime, selectedAnswer, answerFeedback, onAnswer, isSubmitting, error }) {
  // Parse total estimated for progress bar
  const maxQ = typeof totalEstimated === 'string'
    ? parseInt(totalEstimated.split(/[–-]/).pop()) || 25
    : totalEstimated || 25

  const options = question.options || question.choices || []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-5 py-8"
    >
      <div className="w-full max-w-lg space-y-6">
        {/* Header: Progress + Timer */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span style={{ color: 'var(--text-secondary, rgba(255,255,255,0.5))' }}>
              السؤال {questionNumber} من ~{maxQ}
            </span>
            <span
              className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full"
              style={{
                background: 'var(--surface-raised)',
                color: 'var(--text-secondary, rgba(255,255,255,0.4))',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              {formatTime(elapsedTime)}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--accent-sky) 0%, var(--accent-emerald) 100%)' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((questionNumber / maxQ) * 100, 100)}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Skill badge */}
        {question.skill && (
          <div className="flex justify-center">
            <span
              className="text-xs px-3 py-1 rounded-full"
              style={{
                background: 'var(--surface-raised)',
                color: SKILL_COLORS[question.skill] || 'var(--accent-sky)',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
              }}
            >
              {SKILL_LABELS[question.skill] || question.skill}
            </span>
          </div>
        )}

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-5"
          >
            {/* Question text */}
            <div
              className="p-6 rounded-2xl text-center"
              dir="ltr"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
              }}
            >
              <p
                className="text-lg md:text-xl font-inter font-medium leading-relaxed"
                style={{ color: 'var(--text-primary)' }}
              >
                {question.question_text || question.sentence || question.text}
              </p>
              {/* Context/passage if available */}
              {question.context && (
                <p
                  className="text-sm mt-3 leading-relaxed"
                  style={{ color: 'var(--text-secondary, rgba(255,255,255,0.5))' }}
                >
                  {question.context}
                </p>
              )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {options.map((option, idx) => {
                const isSelected = selectedAnswer === option
                const isCorrectAnswer = answerFeedback && isSelected && answerFeedback === 'correct'
                const isWrongAnswer = answerFeedback && isSelected && answerFeedback === 'incorrect'

                let borderColor = 'var(--border-subtle, rgba(255,255,255,0.08))'
                let bgColor = 'var(--surface-raised)'
                if (isCorrectAnswer) {
                  borderColor = 'var(--accent-emerald)'
                  bgColor = 'rgba(52, 211, 153, 0.1)'
                } else if (isWrongAnswer) {
                  borderColor = '#f87171'
                  bgColor = 'rgba(248, 113, 113, 0.1)'
                }

                return (
                  <motion.button
                    key={`${question.id}-${idx}`}
                    whileHover={!selectedAnswer ? { scale: 1.015, y: -2 } : {}}
                    whileTap={!selectedAnswer ? { scale: 0.98 } : {}}
                    onClick={() => onAnswer(option)}
                    disabled={selectedAnswer !== null}
                    dir="ltr"
                    className="w-full py-4 px-5 rounded-xl text-base font-inter font-medium
                               transition-all duration-200 text-right flex items-center gap-3
                               disabled:cursor-default"
                    style={{
                      background: bgColor,
                      border: `1.5px solid ${borderColor}`,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{
                        background: isCorrectAnswer
                          ? 'var(--accent-emerald)'
                          : isWrongAnswer
                            ? '#f87171'
                            : 'rgba(255,255,255,0.06)',
                        color: (isCorrectAnswer || isWrongAnswer) ? '#fff' : 'var(--text-secondary, rgba(255,255,255,0.4))',
                      }}
                    >
                      {isCorrectAnswer ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : isWrongAnswer ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      ) : (
                        OPTION_LABELS[idx]
                      )}
                    </span>
                    <span className="flex-1">{option}</span>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}

        {/* No back button note */}
        <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
          لا يمكن العودة للأسئلة السابقة في الاختبار التكيفي
        </p>

        {/* Watermark */}
        <p className="text-center text-xs font-playfair pt-2" style={{ color: 'rgba(255,255,255,0.1)' }}>
          Fluentia
        </p>
      </div>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════
// ANALYZING SCREEN
// ═════════════════════════════════════════════════════════════
function AnalyzingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
    >
      <div className="text-center space-y-8 max-w-sm">
        {/* Animated brain/analyzing visual */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--accent-sky) 0%, var(--accent-violet) 100%)',
            boxShadow: '0 0 40px rgba(56, 189, 248, 0.3)',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/>
            <line x1="9" y1="21" x2="15" y2="21"/>
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            جاري تحليل إجاباتك...
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.5))' }}>
            الذكاء الاصطناعي يحلل أداءك لتحديد مستواك بدقة
          </p>
        </motion.div>

        {/* Animated dots */}
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{ background: 'var(--accent-sky)' }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════
// RESULT SCREEN
// ═════════════════════════════════════════════════════════════
function ResultScreen({ results, userName, elapsedTime, onShare, onRetry, copied }) {
  if (!results) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center px-5"
      >
        <div className="text-center space-y-4">
          <p style={{ color: 'var(--text-primary)' }}>حدث خطأ في تحميل النتائج</p>
          <button
            onClick={onRetry}
            className="px-6 py-2 rounded-xl text-sm"
            style={{ background: 'var(--surface-raised)', color: 'var(--accent-sky)' }}
          >
            أعد الاختبار
          </button>
        </div>
      </motion.div>
    )
  }

  const levelInfo = getLevelFromCEFR(results.estimated_level || 'A1')
  const recommendedLevel = results.recommended_level || levelInfo.level
  const displayLevel = ACADEMIC_LEVELS[recommendedLevel] || levelInfo
  const overallScore = results.overall_score || 0
  const skillScores = results.skill_scores || {}
  const questionsAnswered = results.questions_answered || 0
  const correctAnswers = results.correct_answers || 0

  // Determine strengths and weaknesses
  const sortedSkills = Object.entries(skillScores)
    .filter(([_, score]) => score !== undefined)
    .sort(([, a], [, b]) => b - a)
  const strengths = sortedSkills.filter(([, score]) => score >= 60).slice(0, 2)
  const weaknesses = sortedSkills.filter(([, score]) => score < 60).slice(0, 2)

  const whatsappMessage = encodeURIComponent(
    `مرحباً، أنهيت اختبار تحديد المستوى في Fluentia وحصلت على مستوى ${displayLevel.cefr} — ${displayLevel.name_ar}.\nأرغب في حجز لقاء مبدئي مجاني مع المدرب.${userName ? `\nالاسم: ${userName}` : ''}`
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center px-5 py-10"
    >
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <h1 className="text-3xl font-playfair" style={{ color: 'var(--accent-sky)' }}>
            Fluentia
          </h1>
        </motion.div>

        {/* Greeting */}
        {userName && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center text-lg"
            style={{ color: 'var(--text-secondary, rgba(255,255,255,0.6))' }}
          >
            أحسنت يا {userName}!
          </motion.p>
        )}

        {/* Level reveal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 150, damping: 15 }}
          className="text-center space-y-3"
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.5))' }}>
            مستواك
          </p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="inline-block px-8 py-4 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, var(--accent-sky) 0%, var(--accent-violet) 100%)',
              boxShadow: '0 8px 40px rgba(56, 189, 248, 0.3)',
            }}
          >
            <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
              المستوى {recommendedLevel} — {displayLevel.name_ar}
            </p>
            <p className="text-lg text-white/80 mt-1">
              ({displayLevel.cefr})
            </p>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-sm"
            style={{ color: 'var(--text-secondary, rgba(255,255,255,0.4))' }}
          >
            {displayLevel.name_en}
          </motion.p>
        </motion.div>

        {/* Circular gauge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center"
        >
          <CircularGauge percentage={overallScore} />
        </motion.div>

        {/* Stats summary */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-3 gap-3 text-center"
        >
          <div
            className="p-3 rounded-xl"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}
          >
            <p className="text-xl font-bold" style={{ color: 'var(--accent-sky)' }}>{questionsAnswered}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.4))' }}>سؤال</p>
          </div>
          <div
            className="p-3 rounded-xl"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}
          >
            <p className="text-xl font-bold" style={{ color: 'var(--accent-emerald)' }}>{correctAnswers}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.4))' }}>إجابة صحيحة</p>
          </div>
          <div
            className="p-3 rounded-xl"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}
          >
            <p className="text-xl font-bold" style={{ color: 'var(--accent-gold)' }}>{formatTime(elapsedTime)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.4))' }}>الوقت</p>
          </div>
        </motion.div>

        {/* Skill breakdown */}
        {Object.keys(skillScores).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="p-5 rounded-2xl space-y-4"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            }}
          >
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              التفاصيل حسب المهارة
            </h3>
            {Object.entries(skillScores).map(([skill, score], idx) => (
              <SkillBar
                key={skill}
                label={SKILL_LABELS[skill] || skill}
                score={score}
                color={SKILL_COLORS[skill] || 'var(--accent-sky)'}
                delay={idx * 0.15}
              />
            ))}
          </motion.div>
        )}

        {/* Strengths & Weaknesses */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {strengths.length > 0 && (
              <div
                className="p-4 rounded-xl space-y-2"
                style={{
                  background: 'rgba(52, 211, 153, 0.06)',
                  border: '1px solid rgba(52, 211, 153, 0.15)',
                }}
              >
                <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--accent-emerald)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  نقاط القوة
                </p>
                {strengths.map(([skill]) => (
                  <p key={skill} className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {SKILL_LABELS[skill] || skill}
                  </p>
                ))}
              </div>
            )}
            {weaknesses.length > 0 && (
              <div
                className="p-4 rounded-xl space-y-2"
                style={{
                  background: 'rgba(251, 191, 36, 0.06)',
                  border: '1px solid rgba(251, 191, 36, 0.15)',
                }}
              >
                <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--accent-gold)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/></svg>
                  يمكن تطويرها
                </p>
                {weaknesses.map(([skill]) => (
                  <p key={skill} className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {SKILL_LABELS[skill] || skill}
                  </p>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* AI Analysis */}
        {results.ai_analysis_ar && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="p-5 rounded-2xl space-y-2"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            }}
          >
            <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--accent-violet)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/>
              </svg>
              تحليل الذكاء الاصطناعي
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.6))' }}>
              {results.ai_analysis_ar}
            </p>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="space-y-3 pt-2"
        >
          <a
            href={`${WHATSAPP_URL}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 rounded-2xl text-lg font-bold text-center text-white
                       transition-all duration-200 hover:translate-y-[-2px]"
            style={{
              background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
              boxShadow: '0 8px 32px rgba(37, 211, 102, 0.25)',
            }}
          >
            سجّل الآن في لقاء مبدئي مجاني مع المدرب
          </a>
          <p className="text-center text-xs" style={{ color: 'var(--text-secondary, rgba(255,255,255,0.3))' }}>
            +966 55 866 9974
          </p>
        </motion.div>

        {/* Share + Retry */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex gap-3"
        >
          <button
            onClick={onShare}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-y-[-2px]"
            style={{
              background: 'var(--surface-raised)',
              color: 'var(--accent-sky)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            }}
          >
            {copied ? 'تم النسخ!' : 'شارك نتيجتك'}
          </button>
          <button
            onClick={onRetry}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-y-[-2px]"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary, rgba(255,255,255,0.4))',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            }}
          >
            أعد الاختبار
          </button>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7 }}
          className="text-center text-xs pt-4"
          style={{ color: 'rgba(255,255,255,0.15)' }}
        >
          <p>TikTok: @fluentia_ | Instagram: @fluentia__</p>
        </motion.div>
      </div>
    </motion.div>
  )
}
