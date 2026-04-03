import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SpellCheck, Trophy, Target, Zap, Play, RotateCcw, Check, X, Volume2
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { tracker } from '../../services/activityTracker'

// ─── Constants ──────────────────────────────────────────────
const WORDS_PER_SESSION = 15
const XP_THRESHOLD_80 = 15
const XP_THRESHOLD_100 = 30

const MASTERY_COLORS = {
  new: 'bg-gray-400/20 text-gray-300',
  learning: 'bg-yellow-400/20 text-yellow-300',
  familiar: 'bg-blue-400/20 text-blue-300',
  mastered: 'bg-emerald-400/20 text-emerald-300',
}

// ─── Text-to-Speech ─────────────────────────────────────────
function speakWord(word) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = 'en-US'
  utterance.rate = 0.8
  speechSynthesis.speak(utterance)
}

// ─── Main Component ─────────────────────────────────────────
export default function StudentSpelling() {
  const [view, setView] = useState('dashboard') // dashboard | practice | results
  const [sessionWords, setSessionWords] = useState([])
  const [sessionResults, setSessionResults] = useState(null)

  const startPractice = (words) => {
    setSessionWords(words)
    setView('practice')
  }

  const finishPractice = (results) => {
    setSessionResults(results)
    setView('results')
  }

  const backToDashboard = () => {
    setView('dashboard')
    setSessionWords([])
    setSessionResults(null)
  }

  return (
    <div className="space-y-8" dir="rtl">
      <AnimatePresence mode="wait">
        {view === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SpellingDashboard onStart={startPractice} />
          </motion.div>
        )}
        {view === 'practice' && (
          <motion.div
            key="practice"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SpellingPractice words={sessionWords} onFinish={finishPractice} onBack={backToDashboard} />
          </motion.div>
        )}
        {view === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <SpellingResults
              results={sessionResults}
              onTryAgain={() => startPractice(sessionWords)}
              onBack={backToDashboard}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// VIEW 1: Dashboard
// ═══════════════════════════════════════════════════════════
function SpellingDashboard({ onStart }) {
  const { profile, studentData } = useAuthStore()
  const [loadingWords, setLoadingWords] = useState(false)

  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['spelling-stats'],
    queryFn: async () => {
      const [progressRes, sessionsRes] = await Promise.all([
        supabase
          .from('student_spelling_progress')
          .select('mastery, accuracy_rate, times_tested')
          .eq('student_id', profile.id),
        supabase
          .from('spelling_sessions')
          .select('*')
          .eq('student_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])
      const progress = progressRes.data || []
      const sessions = sessionsRes.data || []
      const mastered = progress.filter(p => p.mastery === 'mastered').length
      const totalTested = progress.filter(p => p.times_tested > 0).length
      const avgAccuracy = totalTested > 0
        ? Math.round(progress.reduce((s, p) => s + (p.accuracy_rate || 0), 0) / totalTested)
        : 0

      // Calculate streak from consecutive sessions with 60%+ accuracy
      let streak = 0
      for (const session of sessions) {
        if (session.accuracy_percentage >= 60) {
          streak++
        } else {
          break
        }
      }

      return { mastered, totalTested, avgAccuracy, sessions, sessionCount: sessions.length, streak }
    },
    enabled: !!profile?.id,
  })

  // Fetch words for practice
  async function handleStartPractice() {
    setLoadingWords(true)
    try {
      const studentLevel = studentData?.academic_level || 1
      const { data } = await supabase
        .from('spelling_words')
        .select('*')
        .lte('level_appropriate', studentLevel)
        .order('difficulty')
        .limit(50)

      if (!data || data.length === 0) {
        setLoadingWords(false)
        return
      }

      const shuffled = [...data].sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, WORDS_PER_SESSION)
      onStart(selected)
    } catch (err) {
      console.error('Error fetching spelling words:', err)
    } finally {
      setLoadingWords(false)
    }
  }

  const statCards = [
    {
      label: 'كلمات متقنة',
      value: stats?.mastered ?? 0,
      icon: Trophy,
      color: 'from-emerald-500/20 to-emerald-600/10',
      iconColor: 'text-emerald-400',
      variant: 'emerald',
    },
    {
      label: 'نسبة الدقة',
      value: `${stats?.avgAccuracy ?? 0}%`,
      icon: Target,
      color: 'from-blue-500/20 to-blue-600/10',
      iconColor: 'text-blue-400',
      variant: 'sky',
    },
    {
      label: 'جلسات مكتملة',
      value: stats?.sessionCount ?? 0,
      icon: SpellCheck,
      color: 'from-violet-500/20 to-violet-600/10',
      iconColor: 'text-violet-400',
      variant: 'violet',
    },
    {
      label: 'سلسلة متتالية',
      value: stats?.streak ?? 0,
      icon: Zap,
      color: 'from-amber-500/20 to-amber-600/10',
      iconColor: 'text-amber-400',
      variant: 'amber',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-600/20 flex items-center justify-center">
          <SpellCheck className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">مدرب الإملاء</h1>
          <p className="text-[var(--text-tertiary)] text-sm">تدرّب على تهجئة الكلمات الإنجليزية</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`fl-stat-card fl-stat-card-${stat.variant} fl-card-static p-5 hover:translate-y-[-2px] transition-transform`}
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{isLoading ? '...' : stat.value}</p>
            <p className="text-[var(--text-tertiary)] text-sm mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Start Practice Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="fl-card-static p-8 text-center"
      >
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/30 to-purple-600/20 flex items-center justify-center mb-4">
          <Play className="w-8 h-8 text-violet-400" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">هل أنت مستعد؟</h2>
        <p className="text-[var(--text-tertiary)] mb-6">ستتدرب على تهجئة {WORDS_PER_SESSION} كلمة إنجليزية</p>
        <button
          onClick={handleStartPractice}
          disabled={loadingWords}
          className="btn-primary px-8 py-3 text-lg inline-flex items-center gap-3"
        >
          {loadingWords ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <RotateCcw className="w-5 h-5" />
              </motion.div>
              جاري التحميل...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              ابدأ التدريب
            </>
          )}
        </button>
      </motion.div>

      {/* Recent Sessions */}
      {stats?.sessions?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="fl-card-static p-6"
        >
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">الجلسات الأخيرة</h3>
          <div className="space-y-3">
            {stats.sessions.slice(0, 5).map((session, i) => (
              <div
                key={session.id || i}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-base)] hover:bg-[var(--surface-raised)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    session.accuracy_percentage >= 80
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : session.accuracy_percentage >= 60
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                  }`}>
                    {session.accuracy_percentage >= 80 ? <Trophy className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-[var(--text-primary)] text-sm font-medium">
                      {session.words_correct}/{session.words_tested} كلمات صحيحة
                    </p>
                    <p className="text-[var(--text-tertiary)] text-xs">
                      {new Date(session.created_at).toLocaleDateString('ar-EG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge-${
                    session.accuracy_percentage >= 80 ? 'green' : session.accuracy_percentage >= 60 ? 'yellow' : 'red'
                  } text-xs px-2 py-1 rounded-full`}>
                    {session.accuracy_percentage}%
                  </span>
                  {session.xp_awarded > 0 && (
                    <span className="text-amber-400 text-xs flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      +{session.xp_awarded}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// VIEW 2: Practice
// ═══════════════════════════════════════════════════════════
function SpellingPractice({ words, onFinish, onBack }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [results, setResults] = useState([])
  const [startTime] = useState(Date.now())
  const inputRef = useRef(null)

  const currentWord = words[currentIndex]
  const progress = ((currentIndex) / words.length) * 100

  useEffect(() => {
    if (!checked && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentIndex, checked])

  const handleCheck = useCallback(() => {
    if (!answer.trim() || checked) return
    const correct = answer.trim().toLowerCase() === currentWord.word.toLowerCase()
    setIsCorrect(correct)
    setChecked(true)

    setResults(prev => [
      ...prev,
      {
        word_id: currentWord.id,
        english_word: currentWord.word,
        arabic_meaning: currentWord.meaning_ar,
        student_answer: answer.trim(),
        correct,
      },
    ])
  }, [answer, checked, currentWord])

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= words.length) {
      // Session complete
      const correct = results.length > 0
        ? results.filter(r => r.correct).length + (isCorrect ? 0 : 0) // already added in handleCheck
        : 0
      const totalCorrect = results.filter(r => r.correct).length
      const duration = Math.round((Date.now() - startTime) / 1000)
      const accuracyPct = Math.round((totalCorrect / words.length) * 100)
      let xp = 0
      if (accuracyPct === 100) xp = XP_THRESHOLD_100
      else if (accuracyPct >= 80) xp = XP_THRESHOLD_80

      onFinish({
        total: words.length,
        correct: totalCorrect,
        accuracy: accuracyPct,
        duration,
        xp,
        details: results,
      })
    } else {
      setCurrentIndex(prev => prev + 1)
      setAnswer('')
      setChecked(false)
      setIsCorrect(false)
    }
  }, [currentIndex, words.length, results, isCorrect, startTime, onFinish])

  // Auto-advance after correct answer
  useEffect(() => {
    if (checked) {
      const timer = setTimeout(() => {
        handleNext()
      }, isCorrect ? 1200 : 2500)
      return () => clearTimeout(timer)
    }
  }, [checked, isCorrect, handleNext])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (!checked) {
        handleCheck()
      } else {
        handleNext()
      }
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000)
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="btn-ghost text-sm flex items-center gap-2">
          <X className="w-4 h-4" />
          إنهاء
        </button>
        <span className="text-[var(--text-tertiary)] text-sm">
          {currentIndex + 1} / {words.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-[var(--surface-raised)] overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-l from-violet-500 to-purple-600"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + (checked ? 1 : 0)) / words.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Word Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={`fl-card-static p-8 text-center transition-colors duration-300 ${
            checked
              ? isCorrect
                ? 'ring-2 ring-emerald-500/50'
                : 'ring-2 ring-red-500/50'
              : ''
          }`}
        >
          {/* Arabic Meaning */}
          <p className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            {currentWord.meaning_ar}
          </p>

          {/* Pronunciation Button */}
          {currentWord.word && (
            <button
              onClick={() => speakWord(currentWord.word)}
              className="btn-ghost text-sm inline-flex items-center gap-2 mb-6 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              title="استمع للنطق"
            >
              <Volume2 className="w-4 h-4" />
              استمع
            </button>
          )}

          {/* Input */}
          <div className="relative max-w-md mx-auto mb-4">
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب الكلمة بالإنجليزية..."
              disabled={checked}
              className={`input-field w-full text-center text-lg tracking-wide ${
                checked
                  ? isCorrect
                    ? 'border-emerald-500/50 text-emerald-300'
                    : 'border-red-500/50 text-red-300'
                  : ''
              }`}
              dir="ltr"
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          {/* Check Button */}
          {!checked && (
            <button
              onClick={handleCheck}
              disabled={!answer.trim()}
              className="btn-primary px-6 py-2.5 inline-flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              تحقق
            </button>
          )}

          {/* Feedback */}
          {checked && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              {isCorrect ? (
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <Check className="w-6 h-6" />
                  <span className="text-lg font-bold">إجابة صحيحة!</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-red-400">
                    <X className="w-6 h-6" />
                    <span className="text-lg font-bold">إجابة خاطئة</span>
                  </div>
                  <p className="text-[var(--text-tertiary)]">
                    الإجابة الصحيحة:{' '}
                    <span className="text-[var(--text-primary)] font-bold tracking-wide" dir="ltr">
                      {currentWord.word}
                    </span>
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Hint: difficulty */}
      {currentWord.difficulty && (
        <p className="text-center text-[var(--text-tertiary)] text-xs">
          مستوى الصعوبة: {currentWord.difficulty}
        </p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// VIEW 3: Results
// ═══════════════════════════════════════════════════════════
function SpellingResults({ results, onTryAgain, onBack }) {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)

  const accuracyPct = results.accuracy
  const minutes = Math.floor(results.duration / 60)
  const seconds = results.duration % 60

  // Animated circular progress
  const [animatedProgress, setAnimatedProgress] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(accuracyPct), 300)
    return () => clearTimeout(timer)
  }, [accuracyPct])

  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference

  // Save session mutation
  const saveSession = useMutation({
    mutationFn: async (sessionData) => {
      // Save spelling session
      const { error } = await supabase.from('spelling_sessions').insert({
        student_id: profile.id,
        words_tested: sessionData.total,
        words_correct: sessionData.correct,
        accuracy_percentage: Math.round((sessionData.correct / sessionData.total) * 100),
        duration_seconds: sessionData.duration,
        xp_awarded: sessionData.xp,
        details: sessionData.details,
      })
      if (error) throw error

      // Update spelling progress for each word
      for (const word of sessionData.details) {
        const { data: existing } = await supabase
          .from('student_spelling_progress')
          .select('*')
          .eq('student_id', profile.id)
          .eq('word_id', word.word_id)
          .single()

        if (existing) {
          const newTimesTested = existing.times_tested + 1
          const newTimesCorrect = existing.times_correct + (word.correct ? 1 : 0)
          const newAccuracy = Math.round((newTimesCorrect / newTimesTested) * 100)
          let mastery = 'learning'
          if (newTimesCorrect >= 5) mastery = 'mastered'
          else if (newTimesCorrect >= 3) mastery = 'familiar'
          else if (newTimesCorrect >= 1) mastery = 'learning'
          else mastery = 'new'

          await supabase.from('student_spelling_progress').update({
            times_tested: newTimesTested,
            times_correct: newTimesCorrect,
            accuracy_rate: newAccuracy,
            mastery,
            last_wrong_spelling: word.correct ? existing.last_wrong_spelling : word.student_answer,
            last_tested_at: new Date().toISOString(),
          }).eq('id', existing.id)
        } else {
          await supabase.from('student_spelling_progress').insert({
            student_id: profile.id,
            word_id: word.word_id,
            times_tested: 1,
            times_correct: word.correct ? 1 : 0,
            accuracy_rate: word.correct ? 100 : 0,
            mastery: word.correct ? 'learning' : 'new',
            last_wrong_spelling: word.correct ? null : word.student_answer,
            last_tested_at: new Date().toISOString(),
          })
        }
      }

      // Award XP if 80%+
      // Only insert into xp_transactions — the DB trigger auto-increments students.xp_total
      if (sessionData.xp > 0) {
        await supabase.from('xp_transactions').insert({
          student_id: profile.id,
          amount: sessionData.xp,
          reason: 'spelling',
          description: `تدريب إملاء — ${sessionData.correct}/${sessionData.total} صحيح`,
        })
      }
    },
    onSuccess: (_, sessionData) => {
      try { tracker.track('spelling_complete', { correct: sessionData.correct, total: sessionData.total, xp: sessionData.xp }) } catch {}
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: ['spelling-stats'] })
    },
  })

  // Auto-save on mount
  useEffect(() => {
    if (!saved && results && profile?.id) {
      saveSession.mutate(results)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const wrongWords = results.details.filter(d => !d.correct)
  const correctWords = results.details.filter(d => d.correct)

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/30 to-purple-600/20 flex items-center justify-center mb-4"
        >
          <Trophy className={`w-8 h-8 ${accuracyPct >= 80 ? 'text-amber-400' : 'text-violet-400'}`} />
        </motion.div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          {accuracyPct === 100 ? 'ممتاز! أداء مثالي!' : accuracyPct >= 80 ? 'عمل رائع!' : accuracyPct >= 60 ? 'جيد، واصل التدريب!' : 'لا بأس، حاول مرة أخرى!'}
        </h2>
      </div>

      {/* Score Circle + Stats */}
      <div className="fl-card-static p-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
          {/* Circular Progress */}
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
              />
              <motion.circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={accuracyPct >= 80 ? '#10b981' : accuracyPct >= 60 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-[var(--text-primary)]">{accuracyPct}%</span>
              <span className="text-[var(--text-tertiary)] text-xs">دقة</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-400" />
              <span className="text-[var(--text-primary)]">
                {results.correct}/{results.total} كلمات صحيحة
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-blue-400" />
              <span className="text-[var(--text-primary)]">
                الوقت: {minutes > 0 ? `${minutes} دقيقة و ` : ''}{seconds} ثانية
              </span>
            </div>
            {results.xp > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 }}
                className="flex items-center gap-3"
              >
                <Zap className="w-5 h-5 text-amber-400" />
                <span className="text-amber-400 font-bold">+{results.xp} XP</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Wrong Words Review */}
      {wrongWords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="fl-card-static p-6"
        >
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <X className="w-5 h-5 text-red-400" />
            كلمات تحتاج مراجعة ({wrongWords.length})
          </h3>
          <div className="space-y-2">
            {wrongWords.map((word, i) => (
              <div
                key={word.word_id || i}
                className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[var(--text-tertiary)]">{word.arabic_meaning}</span>
                </div>
                <div className="flex items-center gap-4 text-sm" dir="ltr">
                  <span className="text-red-400 line-through">{word.student_answer}</span>
                  <span className="text-emerald-400 font-medium">{word.english_word}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Correct Words */}
      {correctWords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="fl-card-static p-6"
        >
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" />
            كلمات صحيحة ({correctWords.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {correctWords.map((word, i) => (
              <span
                key={word.word_id || i}
                className="badge-green px-3 py-1.5 rounded-lg text-sm"
                dir="ltr"
              >
                {word.english_word}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={onTryAgain} className="btn-primary px-6 py-2.5 inline-flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          تدريب آخر
        </button>
        <button onClick={onBack} className="btn-secondary px-6 py-2.5 inline-flex items-center gap-2">
          العودة
        </button>
      </div>

      {/* Save Status */}
      {saveSession.isPending && (
        <p className="text-center text-[var(--text-tertiary)] text-sm">جاري حفظ النتائج...</p>
      )}
      {saveSession.isError && (
        <p className="text-center text-red-400 text-sm">خطأ في حفظ النتائج</p>
      )}
    </div>
  )
}
