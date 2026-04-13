import { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Volume2, CheckCircle, XCircle, Lightbulb, MessageSquare, ChevronDown, RotateCcw, History, Clock, ImageOff, Eye, EyeOff, StickyNote, Headphones, FileText, Loader2, Zap } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import { toast } from '../../../../components/ui/FluentiaToast'
import { awardCurriculumXP } from '../../../../utils/curriculumXP'
import TextSelectionTooltip from '../../../../components/student/TextSelectionTooltip'

const QUESTION_TYPE_LABELS = {
  main_idea: 'الفكرة الرئيسية',
  detail: 'تفاصيل',
  vocabulary: 'مفردات',
  inference: 'استنتاج',
}

const QUESTION_TYPE_COLORS = {
  main_idea: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  detail: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  vocabulary: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  inference: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

function estimateReadingTime(wordCount) {
  if (!wordCount || wordCount <= 0) return null
  return Math.max(1, Math.ceil(wordCount / 200))
}

// ─── Premium Image with fallback ─────────────────────
function PremiumImage({ src, alt, className, aspectClass = 'aspect-[16/9]' }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className={`${aspectClass} bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center ${className || ''}`}>
        <ImageOff size={32} className="text-slate-600" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${aspectClass} w-full object-cover ${className || ''}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

// ─── Main Component ─────────────────────────────────
export default function ReadingTab({ unitId }) {
  const [activeReading, setActiveReading] = useState(0)
  const { user } = useAuthStore()

  const { data: readings, isLoading } = useQuery({
    queryKey: ['unit-readings', unitId],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_readings')
        .select('*')
        .eq('unit_id', unitId)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!unitId,
  })

  if (isLoading) return <ReadingSkeleton />

  if (!readings?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <BookOpen size={40} className="text-slate-600" />
        <p className="text-slate-500 font-['Tajawal']">لا توجد قراءة لهذه الوحدة بعد</p>
      </div>
    )
  }

  const reading = readings[activeReading]

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Sub-tabs for Reading A / B */}
      {readings.length > 1 && (
        <div className="flex gap-2">
          {readings.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setActiveReading(i)}
              className={`px-5 h-10 rounded-xl text-sm font-bold border transition-all duration-200 font-['Tajawal'] ${
                activeReading === i
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-lg shadow-sky-500/5'
                  : 'bg-slate-900/50 text-slate-400 border-slate-800/60 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              القراءة {r.reading_label || String.fromCharCode(65 + i)}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={reading.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <ReadingContent reading={reading} studentId={user?.id} unitId={unitId} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Reading Content (passage + vocab + questions + critical thinking) ───
function ReadingContent({ reading, studentId, unitId }) {
  const [savedProgress, setSavedProgress] = useState(null)
  const [progressLoading, setProgressLoading] = useState(true)
  const [isCompleted, setIsCompleted] = useState(false)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [attemptHistory, setAttemptHistory] = useState([])
  const [retrying, setRetrying] = useState(false)
  const retryKeyRef = useRef(0)
  const timeRef = useRef(0)
  const timerRef = useRef(null)

  // Time tracker — starts on mount, stops on unmount
  useEffect(() => {
    timerRef.current = setInterval(() => { timeRef.current += 1 }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Load existing progress
  useEffect(() => {
    if (!studentId || !reading?.id) { setProgressLoading(false); return }
    let isMounted = true
    const load = async () => {
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('reading_id', reading.id)
        .maybeSingle()
      if (!isMounted) return
      if (data) {
        setSavedProgress(data)
        setIsCompleted(data.status === 'completed')
        if (data.time_spent_seconds) timeRef.current = data.time_spent_seconds
        if (data.attempt_number) setAttemptNumber(data.attempt_number)
        if (Array.isArray(data.attempt_history)) setAttemptHistory(data.attempt_history)
      }
      setProgressLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [studentId, reading?.id])

  // Retry handler
  const handleRetry = () => {
    setRetrying(true)
    retryKeyRef.current += 1
  }

  // Save progress callback
  const handleComprehensionComplete = useCallback(async (answers, score) => {
    if (!studentId || !reading?.id) return
    const newAttemptNumber = retrying ? attemptNumber + 1 : attemptNumber
    const newHistory = retrying && savedProgress ? [
      ...attemptHistory,
      {
        attempt: attemptNumber,
        answers: savedProgress.answers,
        score: savedProgress.score,
        completed_at: savedProgress.completed_at,
      }
    ] : attemptHistory

    const { error } = await supabase
      .from('student_curriculum_progress')
      .upsert({
        student_id: studentId,
        unit_id: unitId,
        reading_id: reading.id,
        section_type: 'reading',
        status: 'completed',
        score,
        answers,
        time_spent_seconds: timeRef.current,
        completed_at: new Date().toISOString(),
        attempt_number: newAttemptNumber,
        attempt_history: newHistory,
      }, {
        onConflict: 'student_id,reading_id',
      })
    if (error) {
      console.error('[ReadingTab] Save failed for reading_id:', reading.id, error)
      toast({ type: 'error', title: 'حدث خطأ أثناء الحفظ — حاول مرة ثانية' })
    } else {
      setAttemptNumber(newAttemptNumber)
      setAttemptHistory(newHistory)
      setSavedProgress({ ...savedProgress, answers, score, completed_at: new Date().toISOString(), attempt_number: newAttemptNumber, attempt_history: newHistory })
      setRetrying(false)
      setIsCompleted(true)
      toast({ type: 'success', title: 'تم حفظ تقدمك' })
      awardCurriculumXP(studentId, 'reading', score, unitId)
    }
  }, [studentId, reading?.id, unitId, retrying, attemptNumber, attemptHistory, savedProgress])

  const { data: vocabulary } = useQuery({
    queryKey: ['reading-vocab', reading.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_vocabulary')
        .select('*')
        .eq('reading_id', reading.id)
        .order('sort_order')
      return data || []
    },
    enabled: !!reading?.id,
  })

  const { data: questions } = useQuery({
    queryKey: ['reading-questions', reading.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_comprehension_questions')
        .select('*')
        .eq('reading_id', reading.id)
        .order('sort_order')
      return data || []
    },
    enabled: !!reading?.id,
  })

  const vocabMap = useMemo(() => {
    const map = {}
    vocabulary?.forEach(v => { map[v.word.toLowerCase()] = v })
    return map
  }, [vocabulary])

  const readingTime = estimateReadingTime(reading.passage_word_count)
  const passageRef = useRef(null)
  const queryClient = useQueryClient()
  const [focusMode, setFocusMode] = useState(false)
  const [focusParagraph, setFocusParagraph] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [savedWordSet, setSavedWordSet] = useState(new Set())
  const [summaryAr, setSummaryAr] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [vocabQuiz, setVocabQuiz] = useState(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState({})

  // Fetch student's saved words to highlight them
  const { data: savedWords } = useQuery({
    queryKey: ['saved-words-set', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_saved_words')
        .select('word')
        .eq('student_id', studentId)
      return data || []
    },
    enabled: !!studentId,
  })

  useEffect(() => {
    if (savedWords) {
      setSavedWordSet(new Set(savedWords.map(w => w.word.toLowerCase())))
    }
  }, [savedWords])

  const handleWordSaved = useCallback((word) => {
    if (word.startsWith('__remove__')) {
      const removed = word.replace('__remove__', '').toLowerCase()
      setSavedWordSet(prev => {
        const next = new Set(prev)
        next.delete(removed)
        return next
      })
    } else {
      setSavedWordSet(prev => new Set([...prev, word.toLowerCase()]))
    }
    queryClient.invalidateQueries({ queryKey: ['saved-words-set', studentId] })
    queryClient.invalidateQueries({ queryKey: ['saved-words', studentId] })
  }, [studentId, queryClient])

  // AI Arabic Summary
  const handleSummary = useCallback(async () => {
    if (summaryAr || summaryLoading) return
    setSummaryLoading(true)
    try {
      const passageText = (reading.passage_content?.paragraphs || []).join('\n\n')
      const resp = await fetch('/api/passage-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passage_id: reading.id, passage_text: passageText }),
      })
      const data = await resp.json()
      if (data.summary_ar) setSummaryAr(data.summary_ar)
    } catch {
      toast({ type: 'error', title: 'فشل تحميل الملخص' })
    } finally {
      setSummaryLoading(false)
    }
  }, [reading, summaryAr, summaryLoading])

  // Auto vocab quiz from saved words
  const handleVocabQuiz = useCallback(async () => {
    if (quizLoading || vocabQuiz) return
    setQuizLoading(true)
    try {
      const wordsArr = Array.from(savedWordSet).slice(0, 5).map(w => ({ word: w }))
      const resp = await fetch('/api/generate-vocab-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: wordsArr }),
      })
      const data = await resp.json()
      if (data.questions?.length) setVocabQuiz(data.questions)
    } catch {
      toast({ type: 'error', title: 'فشل إنشاء الاختبار' })
    } finally {
      setQuizLoading(false)
    }
  }, [savedWordSet, quizLoading, vocabQuiz])

  // Reading progress bar — track scroll
  useEffect(() => {
    const container = passageRef.current
    if (!container) return
    const handler = () => {
      const rect = container.getBoundingClientRect()
      const total = container.scrollHeight - container.clientHeight
      if (total <= 0) { setScrollProgress(100); return }
      const scrolled = -rect.top + window.innerHeight / 2
      const pct = Math.min(100, Math.max(0, (scrolled / container.scrollHeight) * 100))
      setScrollProgress(Math.round(pct))
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Focus mode — IntersectionObserver
  useEffect(() => {
    if (!focusMode || !passageRef.current) return
    const paragraphs = passageRef.current.querySelectorAll('[data-paragraph-index]')
    if (!paragraphs.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.dataset.paragraphIndex, 10)
            if (!isNaN(idx)) setFocusParagraph(idx)
          }
        })
      },
      { threshold: 0.5 }
    )
    paragraphs.forEach(p => observer.observe(p))
    return () => observer.disconnect()
  }, [focusMode])

  // Fetch reading notes per paragraph
  const { data: readingNotes = [] } = useQuery({
    queryKey: ['reading-notes', studentId, reading.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reading_notes')
        .select('*')
        .eq('student_id', studentId)
        .eq('reading_id', reading.id)
        .order('paragraph_index')
      return data || []
    },
    enabled: !!studentId && !!reading?.id,
  })

  const notesByParagraph = useMemo(() => {
    const map = {}
    readingNotes.forEach(n => { map[n.paragraph_index] = n })
    return map
  }, [readingNotes])

  return (
    <div className="space-y-6">
      {/* Reading Progress Bar */}
      <div className="sticky top-16 z-20 -mx-4 px-4">
        <div className="h-1 rounded-full overflow-hidden bg-slate-800/50">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #38bdf8, #fbbf24)' }}
            animate={{ width: `${scrollProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Completed badge + retry */}
      {isCompleted && (
        <CompletedBanner
          attemptNumber={attemptNumber}
          attemptHistory={attemptHistory}
          score={savedProgress?.score}
          retrying={retrying}
          onRetry={handleRetry}
        />
      )}

      {/* ─── Premium Passage Card ─── */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900/50 border border-slate-800/60 hover:border-slate-700 transition-colors duration-300">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />

        {/* A/B Badge */}
        {reading.reading_label && (
          <div className="absolute top-4 left-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-bold font-['Inter'] backdrop-blur-sm">
              Passage {reading.reading_label}
            </span>
          </div>
        )}

        {/* Hero Image */}
        {reading.before_read_image_url && (
          <div className="rounded-t-2xl overflow-hidden border-b border-slate-700/40">
            <PremiumImage
              src={reading.before_read_image_url}
              alt={reading.title_en}
              className="shadow-2xl shadow-black/30"
            />
          </div>
        )}

        {/* Card Body */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Title Block + Toolbar */}
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-['Inter']" dir="ltr">
              {reading.title_en}
            </h2>
            {reading.title_ar && (
              <p className="text-base md:text-lg text-slate-400 font-medium font-['Tajawal']">{reading.title_ar}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              {readingTime && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-['Inter']">
                  <Clock size={12} className="text-slate-500" />
                  {readingTime} min read
                </span>
              )}
              {reading.passage_word_count > 0 && (
                <span className="text-xs text-slate-500 font-['Inter']">
                  {reading.passage_word_count} words
                </span>
              )}
              {reading.passage_audio_url && (
                <AudioButton url={reading.passage_audio_url} label="استمع للقراءة" />
              )}
              {!reading.passage_audio_url && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-['Tajawal'] cursor-default" title="قريبا">
                  <Headphones size={12} />
                  استماع
                </span>
              )}
              {/* Focus Mode Toggle */}
              <button
                onClick={() => setFocusMode(!focusMode)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 font-['Tajawal'] border ${
                  focusMode
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-slate-200'
                }`}
              >
                {focusMode ? <EyeOff size={12} /> : <Eye size={12} />}
                {focusMode ? 'إلغاء التركيز' : 'وضع التركيز'}
              </button>
              {/* AI Arabic Summary */}
              <button
                onClick={handleSummary}
                disabled={summaryLoading}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 font-['Tajawal'] border ${
                  summaryAr
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-emerald-400 hover:border-emerald-500/30'
                }`}
              >
                {summaryLoading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                ملخص بالعربي
              </button>
              {/* Vocab Quiz (show when ≥3 saved words) */}
              {savedWordSet.size >= 3 && (
                <button
                  onClick={handleVocabQuiz}
                  disabled={quizLoading}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 font-['Tajawal'] border ${
                    vocabQuiz
                      ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-violet-400 hover:border-violet-500/30'
                  }`}
                >
                  {quizLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  اختبار مفرداتي
                </button>
              )}
            </div>
            <div className="border-b border-slate-800/50 pb-0" />
          </div>

          {/* Before You Read */}
          {reading.before_read_exercise_a && (
            <BeforeReadSection content={reading.before_read_exercise_a} />
          )}

          {/* Passage Images (inline) */}
          {reading.passage_image_urls?.length > 0 && (
            <div className="space-y-3">
              {reading.passage_image_urls.map((url, idx) => (
                <div key={idx} className="max-w-xl mx-auto my-6">
                  <div className="rounded-lg overflow-hidden border border-slate-700/40 shadow-lg">
                    <PremiumImage
                      src={url}
                      alt={`${reading.title_en} — illustration ${idx + 1}`}
                      aspectClass="aspect-[16/10]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Passage with text selection + focus mode */}
          <div ref={passageRef} className="relative">
            <PassageDisplay
              paragraphs={reading.passage_content?.paragraphs || []}
              vocabMap={vocabMap}
              savedWordSet={savedWordSet}
              focusMode={focusMode}
              focusParagraph={focusParagraph}
              notesByParagraph={notesByParagraph}
              studentId={studentId}
              readingId={reading.id}
              unitId={unitId}
            />
            {/* Text selection tooltip */}
            {studentId && (
              <TextSelectionTooltip
                containerRef={passageRef}
                studentId={studentId}
                unitId={unitId}
                readingId={reading.id}
                onWordSaved={handleWordSaved}
                savedWordSet={savedWordSet}
              />
            )}
          </div>
        </div>
      </div>

      {/* AI Arabic Summary */}
      <AnimatePresence>
        {summaryAr && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl p-5 sm:p-6 space-y-2"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(56,189,248,0.06))',
                border: '1px solid rgba(16,185,129,0.15)',
              }}
              dir="rtl"
            >
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-400 font-['Tajawal']">ملخص بالعربي</h3>
              </div>
              <p className="text-sm text-slate-200 font-['Tajawal'] leading-relaxed">{summaryAr}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vocab Quiz from saved words */}
      <AnimatePresence>
        {vocabQuiz && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl overflow-hidden bg-slate-900/50 border border-slate-800/60 p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2" dir="rtl">
                <Zap size={16} className="text-violet-400" />
                <h3 className="text-sm font-bold text-violet-400 font-['Tajawal']">اختبار مفرداتك المحفوظة</h3>
              </div>
              {vocabQuiz.map((q, qi) => (
                <div key={qi} className="space-y-2">
                  <p className="text-sm text-white font-['Inter']" dir="ltr">{qi + 1}. {q.question}</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {q.options?.map((opt, oi) => {
                      const answered = quizAnswers[qi] !== undefined
                      const isSelected = quizAnswers[qi] === oi
                      const isCorrect = oi === q.correct_index
                      return (
                        <button
                          key={oi}
                          onClick={() => !answered && setQuizAnswers(prev => ({ ...prev, [qi]: oi }))}
                          disabled={answered}
                          dir="ltr"
                          className={`text-start px-3 py-2 rounded-xl text-sm font-['Inter'] border transition-all ${
                            answered && isCorrect
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                              : answered && isSelected && !isCorrect
                                ? 'bg-red-500/15 border-red-500/40 text-red-400'
                                : answered
                                  ? 'bg-slate-800/30 border-slate-700/30 text-slate-500 opacity-50'
                                  : 'bg-slate-800/30 border-slate-700/40 text-slate-200 hover:border-violet-500/40 cursor-pointer'
                          }`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                  {quizAnswers[qi] !== undefined && q.explanation_ar && (
                    <p className="text-xs text-slate-400 font-['Tajawal'] pr-2" dir="rtl">
                      {q.explanation_ar}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Infographic */}
      {reading.infographic_image_url && (
        <div className="max-w-xl mx-auto">
          <div className="rounded-xl overflow-hidden border border-slate-700/40 shadow-lg">
            <PremiumImage
              src={reading.infographic_image_url}
              alt={`Infographic: ${reading.title_en}`}
              aspectClass=""
              className="w-full"
            />
          </div>
          <p className="text-sm text-slate-500 text-center mt-2 italic font-['Inter']">
            Infographic
          </p>
        </div>
      )}

      {/* Vocabulary Box */}
      {vocabulary?.length > 0 && (
        <VocabularyBox vocabulary={vocabulary} />
      )}

      {/* Reading Skill */}
      {reading.reading_skill_name_en && (
        <ReadingSkillBox reading={reading} />
      )}

      {/* Comprehension Questions */}
      {questions?.length > 0 && (
        <ComprehensionSection
          key={retryKeyRef.current}
          questions={questions}
          savedAnswers={retrying ? null : savedProgress?.answers}
          progressLoading={progressLoading}
          onComplete={handleComprehensionComplete}
        />
      )}

      {/* Critical Thinking */}
      {reading.critical_thinking_prompt_en && (
        <CriticalThinkingBox reading={reading} />
      )}
    </div>
  )
}

// ─── Before Read Section ─────────────────────────────
function BeforeReadSection({ content }) {
  return (
    <div className="rounded-xl p-5 space-y-3 bg-amber-500/5 border border-amber-500/15">
      <div className="flex items-center gap-2">
        <Lightbulb size={16} className="text-amber-400" />
        <h3 className="text-sm font-bold text-amber-400 font-['Tajawal']">قبل القراءة</h3>
      </div>
      <div className="text-sm text-slate-300 font-['Inter'] leading-relaxed" dir="ltr">
        {typeof content === 'string' ? content : JSON.stringify(content)}
      </div>
    </div>
  )
}

// ─── Smart tooltip position (viewport-aware, sidebar-aware) ────
function computeTooltipPosition(targetEl, tooltipW = 280, tooltipH = 240) {
  const rect = targetEl.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const margin = 12

  const sidebar = document.querySelector('[data-sidebar]') || document.querySelector('aside') || document.querySelector('.sidebar')
  const sidebarRect = sidebar?.getBoundingClientRect()

  let minX = margin
  let maxX = vw - tooltipW - margin
  if (sidebarRect) {
    if (sidebarRect.left > vw / 2) maxX = Math.min(maxX, sidebarRect.left - margin)
    else minX = Math.max(minX, sidebarRect.right + margin)
  }

  let left = rect.left + rect.width / 2 - tooltipW / 2
  left = Math.max(minX, Math.min(maxX, left))

  let top = rect.bottom + 8
  let placement = 'bottom'
  if (top + tooltipH + margin > vh) {
    top = rect.top - tooltipH - 8
    placement = 'top'
    if (top < margin) top = margin
  }

  return { top, left, placement }
}

// ─── Portal-based vocab tooltip ────────────────────
function VocabTooltipPortal({ vocab, targetRef, onMouseEnter, onMouseLeave }) {
  const tooltipRef = useRef(null)
  const [pos, setPos] = useState(null)

  useLayoutEffect(() => {
    if (!targetRef) return
    const update = () => {
      const p = computeTooltipPosition(targetRef, 280, 240)
      setPos(p)
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [targetRef])

  if (!pos) return null

  const arrowSide = pos.placement === 'bottom' ? 'top' : 'bottom'

  return createPortal(
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, y: pos.placement === 'bottom' ? 4 : -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: pos.placement === 'bottom' ? 4 : -4 }}
      transition={{ duration: 0.15 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="w-[280px] rounded-xl p-3 space-y-1.5 text-sm"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 70,
        background: 'rgba(15,23,42,0.95)',
        border: '1px solid rgba(51,65,85,0.8)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {vocab.image_url && (
        <img src={vocab.image_url} alt={vocab.word} className="w-full h-20 rounded-lg object-cover -mt-1" loading="lazy" />
      )}
      <div className="flex items-center justify-between">
        <span className="font-bold text-white font-['Inter']">{vocab.word}</span>
        <span className="text-[10px] text-slate-400 font-['Inter']">{vocab.part_of_speech}</span>
      </div>
      <p className="text-slate-300 font-['Inter'] text-xs leading-relaxed">{vocab.definition_en}</p>
      <p className="text-slate-400 font-['Tajawal'] text-xs" dir="rtl">{vocab.definition_ar}</p>
      {vocab.audio_url && <VocabAudioBtn url={vocab.audio_url} />}
      {/* Arrow */}
      <div
        className="absolute w-3 h-3 rotate-45"
        style={{
          [arrowSide]: '-6px',
          left: '50%',
          marginLeft: '-6px',
          background: 'rgba(15,23,42,0.95)',
          borderRight: arrowSide === 'top' ? '1px solid rgba(51,65,85,0.8)' : 'none',
          borderBottom: arrowSide === 'top' ? '1px solid rgba(51,65,85,0.8)' : 'none',
          borderLeft: arrowSide === 'bottom' ? '1px solid rgba(51,65,85,0.8)' : 'none',
          borderTop: arrowSide === 'bottom' ? '1px solid rgba(51,65,85,0.8)' : 'none',
        }}
      />
    </motion.div>,
    document.body
  )
}

// ─── Passage Display ─────────────────────────────────
function PassageDisplay({ paragraphs, vocabMap, savedWordSet, focusMode, focusParagraph, notesByParagraph, studentId, readingId, unitId }) {
  const [activeTooltip, setActiveTooltip] = useState(null)
  const [activeTooltipEl, setActiveTooltipEl] = useState(null)
  const [editingNote, setEditingNote] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [hoverMeaning, setHoverMeaning] = useState(null) // { word, meaning_ar, x, y }
  const tooltipTimeout = useRef(null)
  const hoverTimeout = useRef(null)
  const hoverLeaveTimeout = useRef(null)
  const meaningCache = useRef({})
  const queryClient = useQueryClient()

  const showTooltip = useCallback((word, el) => {
    clearTimeout(tooltipTimeout.current)
    setActiveTooltip(word)
    if (el) setActiveTooltipEl(el)
  }, [])

  const hideTooltip = useCallback(() => {
    tooltipTimeout.current = setTimeout(() => { setActiveTooltip(null); setActiveTooltipEl(null) }, 200)
  }, [])

  // Close vocab tooltip on Escape or significant scroll
  useEffect(() => {
    if (!activeTooltip) return
    const onKey = (e) => { if (e.key === 'Escape') { setActiveTooltip(null); setActiveTooltipEl(null) } }
    const onScroll = () => { setActiveTooltip(null); setActiveTooltipEl(null) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll, true) }
  }, [activeTooltip])

  // Hover quick meaning for any word
  const handleWordHover = useCallback(async (e, word) => {
    const cleanWord = word.replace(/[.,!?;:'"()\[\]]/g, '').trim()
    if (!cleanWord || cleanWord.length < 2) return
    // Skip if it's a curriculum vocab word (already has tooltip)
    if (vocabMap[cleanWord.toLowerCase()]) return

    clearTimeout(hoverTimeout.current)
    clearTimeout(hoverLeaveTimeout.current)
    hoverTimeout.current = setTimeout(async () => {
      // Check cache first
      if (meaningCache.current[cleanWord.toLowerCase()]) {
        const rect = e.target.getBoundingClientRect()
        setHoverMeaning({ word: cleanWord, ...meaningCache.current[cleanWord.toLowerCase()], x: rect.left + rect.width / 2, y: rect.top })
        return
      }
      try {
        const resp = await fetch('/api/vocab-quick-meaning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: cleanWord }),
        })
        if (resp.ok) {
          const data = await resp.json()
          if (data.meaning_ar) {
            meaningCache.current[cleanWord.toLowerCase()] = data
            const rect = e.target.getBoundingClientRect()
            setHoverMeaning({ word: cleanWord, ...data, x: rect.left + rect.width / 2, y: rect.top })
          }
        }
      } catch {}
    }, 500)
  }, [vocabMap])

  const handleWordLeave = useCallback(() => {
    clearTimeout(hoverTimeout.current)
    hoverLeaveTimeout.current = setTimeout(() => setHoverMeaning(null), 300)
  }, [])

  // Save/update paragraph note
  const saveNote = async (paragraphIndex) => {
    if (!studentId || !readingId || !noteText.trim()) return
    const existing = notesByParagraph[paragraphIndex]
    if (existing) {
      await supabase.from('reading_notes').update({ note_text: noteText.trim(), updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('reading_notes').insert({
        student_id: studentId,
        reading_id: readingId,
        unit_id: unitId,
        paragraph_index: paragraphIndex,
        note_text: noteText.trim(),
      })
    }
    queryClient.invalidateQueries({ queryKey: ['reading-notes', studentId, readingId] })
    setEditingNote(null)
    setNoteText('')
  }

  const renderWord = (word, wordIdx, pIdx) => {
    // Check if this word is in saved words
    const cleanWord = word.replace(/[.,!?;:'"()]/g, '').toLowerCase()
    const isSaved = savedWordSet?.has(cleanWord)

    return (
      <span
        key={`${pIdx}-w-${wordIdx}`}
        data-word-index={wordIdx}
        className={`cursor-default transition-colors hover:text-sky-200 ${isSaved ? 'bg-amber-400/20 border-b-2 border-amber-400 rounded px-0.5' : ''}`}
        title={isSaved ? 'محفوظة في قاموسك' : undefined}
        onMouseEnter={(e) => handleWordHover(e, word)}
        onMouseLeave={handleWordLeave}
      >
        {word}{' '}
      </span>
    )
  }

  const renderParagraph = (text, pIdx) => {
    // Split by *word* patterns (vocab highlights)
    const parts = text.split(/\*([^*]+)\*/)
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        // This is a highlighted vocab word
        const vocab = vocabMap[part.toLowerCase()]
        if (vocab) {
          const tooltipKey = `${pIdx}-${i}`
          return (
            <span key={i} className="relative inline">
              <button
                onMouseEnter={(e) => showTooltip(tooltipKey, e.currentTarget)}
                onMouseLeave={hideTooltip}
                onClick={(e) => {
                  if (activeTooltip === tooltipKey) { setActiveTooltip(null); setActiveTooltipEl(null) }
                  else showTooltip(tooltipKey, e.currentTarget)
                }}
                className="text-sky-300 font-semibold border-b border-dotted border-sky-400/50 hover:border-sky-400 transition-colors cursor-pointer"
              >
                {part}
              </button>
              <AnimatePresence>
                {activeTooltip === tooltipKey && activeTooltipEl && (
                  <VocabTooltipPortal
                    vocab={vocab}
                    targetRef={activeTooltipEl}
                    onMouseEnter={() => showTooltip(tooltipKey)}
                    onMouseLeave={hideTooltip}
                  />
                )}
              </AnimatePresence>
            </span>
          )
        }
        // Vocab word not found in map — render bold with accent color
        return <strong key={i} className="font-semibold text-sky-300">{part}</strong>
      }
      // Regular text — wrap each word in a span for saved-word highlighting + audio sync
      const words = part.split(/(\s+)/)
      let wordIdx = 0
      return words.map((word, wi) => {
        if (/^\s+$/.test(word)) return <span key={`${i}-${wi}`}> </span>
        return renderWord(word, wordIdx++, pIdx)
      })
    })
  }

  return (
    <div dir="ltr" className="space-y-6 relative">
      {/* Hover quick meaning tooltip — portal to body */}
      {hoverMeaning && createPortal(
        <AnimatePresence>
          <motion.div
            key="hover-meaning"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none"
            style={{
              position: 'fixed',
              zIndex: 70,
              left: Math.max(12, Math.min(hoverMeaning.x - 90, window.innerWidth - 192)),
              top: hoverMeaning.y < 60 ? hoverMeaning.y + 28 : hoverMeaning.y - 48,
            }}
          >
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg"
              style={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(56,189,248,0.25)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span className="text-sky-300 font-['Inter'] font-semibold">{hoverMeaning.word}</span>
              {hoverMeaning.part_of_speech && (
                <span className="text-slate-500 text-[10px] ml-1.5">{hoverMeaning.part_of_speech}</span>
              )}
              <span className="text-slate-300 font-['Tajawal'] mr-2 ml-1">—</span>
              <span className="text-amber-300 font-['Tajawal']">{hoverMeaning.meaning_ar}</span>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {paragraphs.map((para, idx) => {
        const isFocused = !focusMode || focusParagraph === idx
        const hasNote = notesByParagraph[idx]
        return (
          <div
            key={idx}
            data-paragraph-index={idx}
            className={`group flex gap-4 transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-20'}`}
          >
            <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-1.5">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center text-sm font-semibold">
                {idx + 1}
              </div>
              {/* Note indicator/button */}
              {studentId && (
                <button
                  onClick={() => { setEditingNote(editingNote === idx ? null : idx); setNoteText(hasNote?.note_text || '') }}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                    hasNote
                      ? 'text-amber-400 opacity-100'
                      : 'text-slate-600 opacity-0 group-hover:opacity-100'
                  }`}
                  title={hasNote ? 'تعديل الملاحظة' : 'إضافة ملاحظة'}
                >
                  <StickyNote size={12} />
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg leading-[1.9] text-slate-200 font-['Inter']">
                {renderParagraph(para, idx)}
              </p>
              {/* Inline note editor */}
              <AnimatePresence>
                {editingNote === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/40 space-y-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="اكتب ملاحظتك هنا..."
                        dir="rtl"
                        rows={2}
                        className="w-full resize-none rounded-lg px-3 py-2 text-sm font-['Tajawal'] bg-slate-900/50 text-slate-200 border border-slate-700/40 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                      />
                      <div className="flex gap-2 justify-end" dir="rtl">
                        <button
                          onClick={() => saveNote(idx)}
                          disabled={!noteText.trim()}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium font-['Tajawal'] bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 transition-colors disabled:opacity-30"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => setEditingNote(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium font-['Tajawal'] text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Saved note display */}
              {hasNote && editingNote !== idx && (
                <div
                  className="mt-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15 cursor-pointer hover:bg-amber-500/10 transition-colors"
                  onClick={() => { setEditingNote(idx); setNoteText(hasNote.note_text) }}
                  dir="rtl"
                >
                  <p className="text-xs text-amber-300/80 font-['Tajawal'] leading-relaxed">{hasNote.note_text}</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Small audio button for vocab tooltip ────────────
function VocabAudioBtn({ url }) {
  const audioRef = useRef(null)
  useEffect(() => () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null } }, [])
  const play = (e) => {
    e.stopPropagation()
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(url)
    audioRef.current.play().catch(() => {})
  }
  return (
    <button
      onClick={play}
      className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
    >
      <Volume2 size={11} /> استمع
    </button>
  )
}

// ─── Audio Button ────────────────────────────────────
function AudioButton({ url, label }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null } }, [])
  const play = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlaying(false); return }
    const a = new Audio(url)
    audioRef.current = a
    setPlaying(true)
    a.onended = () => { setPlaying(false); audioRef.current = null }
    a.play().catch(() => setPlaying(false))
  }
  return (
    <button
      onClick={play}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 font-['Tajawal'] ${
        playing
          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
          : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-sky-400 hover:border-sky-500/30'
      }`}
    >
      <Volume2 size={12} />
      {label}
    </button>
  )
}

// ─── Vocabulary Box ──────────────────────────────────
function VocabularyBox({ vocabulary }) {
  const [expanded, setExpanded] = useState(false)
  const audioRef = useRef(null)

  const playAudio = (url, e) => {
    e.stopPropagation()
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(url)
    audioRef.current.play().catch(() => {})
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-slate-900/50 border border-slate-800/60">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-800/20"
      >
        <div className="flex items-center gap-2.5">
          <BookOpen size={16} className="text-emerald-400" />
          <span className="text-sm font-bold text-white font-['Tajawal']">
            مفردات القراءة ({vocabulary.length})
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 space-y-2 border-t border-slate-800/50">
              <div className="pt-4 space-y-2">
                {vocabulary.map(v => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/30"
                  >
                    <div className="flex-1 min-w-0" dir="ltr">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white font-['Inter']">{v.word}</span>
                        <span className="text-[10px] text-slate-500 font-['Inter']">{v.part_of_speech}</span>
                      </div>
                      <p className="text-xs text-slate-300 font-['Inter'] mt-0.5">{v.definition_en}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400 font-['Tajawal']">{v.definition_ar}</span>
                      {v.audio_url && (
                        <button
                          onClick={(e) => playAudio(v.audio_url, e)}
                          className="w-7 h-7 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center hover:bg-sky-500/20 transition-colors flex-shrink-0"
                        >
                          <Volume2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Comprehension Questions ─────────────────────────
function ComprehensionSection({ questions, savedAnswers, progressLoading, onComplete }) {
  const [answers, setAnswers] = useState({})
  const hasSaved = useRef(false)

  // Restore saved answers on load
  useEffect(() => {
    if (savedAnswers && typeof savedAnswers === 'object') {
      setAnswers(savedAnswers)
      hasSaved.current = true
    }
  }, [savedAnswers])

  const total = questions.length
  const answered = Object.keys(answers).length
  const correctCount = Object.values(answers).filter(a => a.correct).length

  // Auto-save when all questions answered (only once)
  useEffect(() => {
    if (answered === total && total > 0 && !hasSaved.current) {
      hasSaved.current = true
      const score = Math.round((correctCount / total) * 100)
      onComplete?.(answers, score)
    }
  }, [answered, total, correctCount, answers, onComplete])

  if (progressLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 rounded-lg bg-slate-800 animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-slate-800 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white font-['Tajawal']">أسئلة الفهم</h3>
        {answered > 0 && (
          <span className="text-xs text-slate-400 font-['Tajawal']">
            {correctCount}/{answered} صحيحة
          </span>
        )}
      </div>
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <MCQQuestion
            key={q.id}
            question={q}
            index={idx}
            answer={answers[q.id]}
            onAnswer={(ans) => setAnswers(prev => ({ ...prev, [q.id]: ans }))}
          />
        ))}
      </div>
      {answered === total && total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{
            background: correctCount === total ? 'rgba(16,185,129,0.1)' : 'rgba(56,189,248,0.1)',
            border: `1px solid ${correctCount === total ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.2)'}`,
          }}
        >
          <CheckCircle size={20} className={correctCount === total ? 'text-emerald-400' : 'text-sky-400'} />
          <p className="text-sm font-medium font-['Tajawal']" style={{ color: correctCount === total ? '#34d399' : '#38bdf8' }}>
            {correctCount === total
              ? 'ممتاز! أجبت على جميع الأسئلة بشكل صحيح'
              : `أجبت على ${correctCount} من ${total} بشكل صحيح`
            }
          </p>
        </motion.div>
      )}
    </div>
  )
}

// ─── Single MCQ Question ─────────────────────────────
function MCQQuestion({ question, index, answer, onAnswer }) {
  const handleSelect = (choice) => {
    if (answer) return
    const correct = choice.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()
    onAnswer({ selected: choice, correct })
  }

  const typeBadge = QUESTION_TYPE_LABELS[question.question_type] || question.question_type
  const typeColor = QUESTION_TYPE_COLORS[question.question_type] || QUESTION_TYPE_COLORS.detail

  return (
    <div className="rounded-2xl p-5 sm:p-6 space-y-3 bg-slate-900/50 border border-slate-800/60">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeColor} font-['Tajawal']`}>
              {typeBadge}
            </span>
          </div>
          <p className="text-sm sm:text-[15px] font-medium text-white font-['Inter'] leading-relaxed" dir="ltr">
            {question.question_en}
          </p>
          {question.question_ar && (
            <p className="text-xs text-slate-400 font-['Tajawal']">{question.question_ar}</p>
          )}
        </div>
      </div>

      {/* Choices */}
      <div className="grid grid-cols-1 gap-2 mt-1">
        {question.choices?.map((choice, i) => {
          const isSelected = answer?.selected === choice
          const isCorrectAnswer = choice.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()
          const showCorrect = answer && isCorrectAnswer
          const showWrong = answer && isSelected && !answer.correct

          return (
            <button
              key={i}
              onClick={() => handleSelect(choice)}
              disabled={!!answer}
              dir="ltr"
              className={`text-start px-4 py-3 rounded-xl text-sm font-['Inter'] transition-all duration-200 border ${
                showCorrect
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : showWrong
                    ? 'bg-red-500/15 border-red-500/40 text-red-400'
                    : answer
                      ? 'bg-slate-800/30 border-slate-700/30 text-slate-500 opacity-60'
                      : 'bg-slate-800/30 border-slate-700/40 text-slate-200 hover:border-sky-500/40 hover:bg-sky-500/5 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{
                    background: showCorrect ? 'rgba(16,185,129,0.2)' : showWrong ? 'rgba(239,68,68,0.2)' : 'rgba(51,65,85,0.5)',
                    color: showCorrect ? '#34d399' : showWrong ? '#f87171' : '#94a3b8',
                  }}
                >
                  {showCorrect ? <CheckCircle size={14} /> : showWrong ? <XCircle size={14} /> : String.fromCharCode(65 + i)}
                </span>
                <span>{choice}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {answer && (question.explanation_en || question.explanation_ar) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="p-3.5 rounded-xl mt-1 space-y-1"
              style={{
                background: answer.correct ? 'rgba(16,185,129,0.06)' : 'rgba(56,189,248,0.06)',
                border: `1px solid ${answer.correct ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.15)'}`,
              }}
            >
              {question.explanation_en && (
                <p className="text-xs text-slate-300 font-['Inter'] leading-relaxed" dir="ltr">
                  {question.explanation_en}
                </p>
              )}
              {question.explanation_ar && (
                <p className="text-xs text-slate-400 font-['Tajawal']" dir="rtl">
                  {question.explanation_ar}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Reading Skill Box ───────────────────────────────
function ReadingSkillBox({ reading }) {
  return (
    <div className="rounded-2xl p-5 sm:p-6 space-y-3 bg-slate-900/50 border border-slate-800/60">
      <div className="flex items-center gap-2">
        <Lightbulb size={16} className="text-amber-400" />
        <h3 className="text-sm font-bold text-white font-['Tajawal']">
          مهارة القراءة: <span className="font-['Inter']">{reading.reading_skill_name_en}</span>
          {reading.reading_skill_name_ar && ` — ${reading.reading_skill_name_ar}`}
        </h3>
      </div>
      {reading.reading_skill_explanation && (
        <p className="text-sm text-slate-300 font-['Inter'] leading-relaxed" dir="ltr">
          {reading.reading_skill_explanation}
        </p>
      )}
    </div>
  )
}

// ─── Critical Thinking Box ───────────────────────────
function CriticalThinkingBox({ reading }) {
  return (
    <div
      className="rounded-2xl p-5 sm:p-6 space-y-3"
      style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(56,189,248,0.06))',
        border: '1px solid rgba(168,85,247,0.15)',
      }}
    >
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-purple-400" />
        <h3 className="text-sm font-bold text-purple-400 font-['Tajawal']">تفكير ناقد</h3>
      </div>
      <p className="text-sm text-slate-200 font-['Inter'] leading-relaxed" dir="ltr">
        {reading.critical_thinking_prompt_en}
      </p>
      {reading.critical_thinking_prompt_ar && (
        <p className="text-sm text-slate-400 font-['Tajawal']" dir="rtl">
          {reading.critical_thinking_prompt_ar}
        </p>
      )}
    </div>
  )
}

// ─── Completed Banner with Retry ─────────────────────
function CompletedBanner({ attemptNumber, attemptHistory, score, retrying, onRetry }) {
  const [showHistory, setShowHistory] = useState(false)
  const hasHistory = attemptHistory?.length > 0

  if (retrying) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25">
        <RotateCcw size={16} className="text-sky-400" />
        <span className="text-sm font-medium text-sky-400 font-['Tajawal']">
          إعادة المحاولة {attemptNumber + 1} — أجب على الأسئلة من جديد
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400 font-['Tajawal']">
            تم إكمال هذا القسم
          </span>
          {attemptNumber > 1 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-['Tajawal']">
              المحاولة {attemptNumber}
            </span>
          )}
          {score != null && (
            <span className="text-xs text-emerald-400/70 font-['Tajawal']">— {score}%</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasHistory && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors font-['Tajawal']"
            >
              <History size={12} />
              المحاولات السابقة
            </button>
          )}
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors font-['Tajawal'] border border-slate-700/50"
          >
            <RotateCcw size={12} />
            إعادة المحاولة
          </button>
        </div>
      </div>
      <AnimatePresence>
        {showHistory && hasHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1.5 border-t border-emerald-500/15">
              <div className="pt-2.5 space-y-1.5">
                {attemptHistory.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-slate-400 font-['Tajawal']">
                    <span className="font-medium">المحاولة {h.attempt}</span>
                    <span>{h.score != null ? `${h.score}%` : '—'}</span>
                    {h.completed_at && (
                      <span dir="ltr">{new Date(h.completed_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}</span>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-3 text-xs text-emerald-400 font-['Tajawal'] font-medium">
                  <span>المحاولة {attemptNumber}</span>
                  <span>{score != null ? `${score}%` : '—'}</span>
                  <span className="text-[10px] text-emerald-400/60">(الحالية)</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────
function ReadingSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex gap-2">
        <div className="h-10 w-24 rounded-xl bg-slate-800 animate-pulse" />
        <div className="h-10 w-24 rounded-xl bg-slate-800 animate-pulse" />
      </div>
      <div className="rounded-2xl overflow-hidden bg-slate-900/50 border border-slate-800/60">
        <div className="aspect-[16/9] bg-slate-800 animate-pulse" />
        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <div className="h-8 w-3/4 rounded-lg bg-slate-800 animate-pulse" />
            <div className="h-5 w-1/2 rounded-lg bg-slate-800 animate-pulse" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-slate-800 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 rounded bg-slate-800 animate-pulse" />
                <div className="h-5 w-5/6 rounded bg-slate-800 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-slate-800 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
