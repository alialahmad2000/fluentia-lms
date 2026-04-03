import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Languages, Volume2, LayoutGrid, List, RotateCcw, CheckCircle } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import { toast } from '../../../../components/ui/FluentiaToast'

const POS_AR = {
  noun: 'اسم',
  verb: 'فعل',
  adjective: 'صفة',
  adverb: 'ظرف',
  preposition: 'حرف جر',
  conjunction: 'حرف عطف',
  pronoun: 'ضمير',
}

// ─── Main Component ─────────────────────────────────
export default function VocabularyTab({ unitId }) {
  const { user } = useAuthStore()
  const [viewMode, setViewMode] = useState('cards') // cards | list
  const [practiceMode, setPracticeMode] = useState(false)
  const [reviewedWords, setReviewedWords] = useState(new Set())
  const [isCompleted, setIsCompleted] = useState(false)
  const [progressLoading, setProgressLoading] = useState(true)
  const hasSavedComplete = useRef(false)
  const timeRef = useRef(0)
  const timerRef = useRef(null)
  const saveTimer = useRef(null)
  const progressIdRef = useRef(null)

  const { data, isLoading } = useQuery({
    queryKey: ['unit-vocabulary', unitId],
    queryFn: async () => {
      const { data: readings } = await supabase
        .from('curriculum_readings')
        .select('id, reading_label')
        .eq('unit_id', unitId)
        .order('sort_order')
      if (!readings?.length) return []

      const result = []
      for (const r of readings) {
        const { data: vocab } = await supabase
          .from('curriculum_vocabulary')
          .select('*')
          .eq('reading_id', r.id)
          .order('sort_order')
        result.push({ reading: r, vocabulary: vocab || [] })
      }
      return result
    },
    enabled: !!unitId,
  })

  const allWords = data?.flatMap(d => d.vocabulary) || []
  const totalWords = allWords.length

  // Time tracker
  useEffect(() => {
    timerRef.current = setInterval(() => { timeRef.current += 1 }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Load saved progress
  useEffect(() => {
    if (!user?.id || !unitId) { setProgressLoading(false); return }
    let isMounted = true
    const load = async () => {
      const { data: row } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', user.id)
        .eq('unit_id', unitId)
        .eq('section_type', 'vocabulary')
        .maybeSingle()
      if (!isMounted) return
      if (row) {
        progressIdRef.current = row.id
        if (row.answers?.reviewedWords) {
          setReviewedWords(new Set(row.answers.reviewedWords))
        }
        setIsCompleted(row.status === 'completed')
        if (row.time_spent_seconds) timeRef.current = row.time_spent_seconds
        if (row.status === 'completed') hasSavedComplete.current = true
      }
      setProgressLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [user?.id, unitId])

  // Save progress to DB
  const saveProgress = useCallback(async (reviewed, total) => {
    if (!user?.id || !unitId) return
    const reviewedAll = reviewed.size >= total && total > 0
    const row = {
      student_id: user.id,
      unit_id: unitId,
      section_type: 'vocabulary',
      status: reviewedAll ? 'completed' : 'in_progress',
      score: total > 0 ? Math.round((reviewed.size / total) * 100) : 0,
      answers: { reviewedWords: [...reviewed], totalWords: total },
      time_spent_seconds: timeRef.current,
      completed_at: reviewedAll ? new Date().toISOString() : null,
    }

    if (progressIdRef.current) {
      // Update existing
      const { error } = await supabase
        .from('student_curriculum_progress')
        .update(row)
        .eq('id', progressIdRef.current)
      if (!error && reviewedAll && !hasSavedComplete.current) {
        hasSavedComplete.current = true
        setIsCompleted(true)
        toast({ type: 'success', title: 'تم حفظ تقدمك ✅' })
      }
    } else {
      // Insert new
      const { data: inserted, error } = await supabase
        .from('student_curriculum_progress')
        .insert(row)
        .select('id')
        .single()
      if (!error && inserted) {
        progressIdRef.current = inserted.id
        if (reviewedAll && !hasSavedComplete.current) {
          hasSavedComplete.current = true
          setIsCompleted(true)
          toast({ type: 'success', title: 'تم حفظ تقدمك ✅' })
        }
      }
    }
  }, [user?.id, unitId])

  // Mark a word as reviewed
  const markReviewed = useCallback((wordId) => {
    setReviewedWords(prev => {
      if (prev.has(wordId)) return prev
      const next = new Set(prev)
      next.add(wordId)
      // Debounced save
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveProgress(next, totalWords), 2000)
      return next
    })
  }, [totalWords, saveProgress])

  // Handle flashcard practice completion
  const handlePracticeComplete = useCallback((reviewedIds) => {
    setReviewedWords(prev => {
      const next = new Set(prev)
      reviewedIds.forEach(id => next.add(id))
      saveProgress(next, totalWords)
      return next
    })
  }, [totalWords, saveProgress])

  if (isLoading || progressLoading) return <VocabSkeleton />

  if (allWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Languages size={40} className="text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد مفردات لهذه الوحدة بعد</p>
      </div>
    )
  }

  if (practiceMode) {
    return <FlashcardPractice words={allWords} onBack={() => setPracticeMode(false)} onComplete={handlePracticeComplete} />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">مفردات الوحدة</h3>
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
            راجعت {reviewedWords.size} من {totalWords} كلمة
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-[var(--border-subtle)] overflow-hidden">
            <button
              onClick={() => setViewMode('cards')}
              className={`w-9 h-9 flex items-center justify-center transition-colors ${viewMode === 'cards' ? 'bg-sky-500/15 text-sky-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-9 h-9 flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-sky-500/15 text-sky-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <List size={15} />
            </button>
          </div>
          {/* Practice button */}
          <button
            onClick={() => setPracticeMode(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors font-['Tajawal']"
          >
            <RotateCcw size={13} />
            تدريب
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-[var(--surface-base)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${totalWords > 0 ? (reviewedWords.size / totalWords) * 100 : 0}%`,
            background: reviewedWords.size >= totalWords && totalWords > 0 ? '#10b981' : '#0ea5e9',
          }}
        />
      </div>

      {/* Completed badge */}
      {isCompleted && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
          <CheckCircle size={16} className="text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400 font-['Tajawal']">تم مراجعة جميع المفردات</span>
        </div>
      )}

      {/* Sections by reading */}
      {data.map(({ reading, vocabulary }) => (
        <div key={reading.id} className="space-y-3">
          {data.length > 1 && (
            <h4 className="text-sm font-bold text-[var(--text-secondary)] font-['Tajawal']">
              مفردات القراءة {reading.reading_label}
            </h4>
          )}
          {viewMode === 'cards' ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            >
              {vocabulary.map(v => (
                <motion.div
                  key={v.id}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                >
                  <WordCard word={v} reviewed={reviewedWords.has(v.id)} onView={() => markReviewed(v.id)} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <WordListView vocabulary={vocabulary} reviewedWords={reviewedWords} onView={markReviewed} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Word Card ───────────────────────────────────────
function WordCard({ word, reviewed, onView }) {
  const audioRef = useRef(null)
  const viewedRef = useRef(false)

  // Mark as reviewed when card comes into view / is interacted with
  useEffect(() => {
    if (!viewedRef.current && onView) {
      viewedRef.current = true
      onView()
    }
  }, [onView])

  const playAudio = (e) => {
    e.stopPropagation()
    if (!word.audio_url) return
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(word.audio_url)
    audioRef.current.play().catch(() => {})
  }

  return (
    <div
      className="rounded-xl overflow-hidden relative"
      style={{ background: 'var(--surface-raised)', border: `1px solid ${reviewed ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}` }}
    >
      {reviewed && (
        <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle size={12} className="text-emerald-400" />
        </div>
      )}
      {word.image_url && (
        <img
          src={word.image_url}
          alt={word.word}
          className="w-full h-28 object-cover"
          loading="lazy"
        />
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-bold text-[var(--text-primary)] font-['Inter']" dir="ltr">{word.word}</p>
            <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
              {POS_AR[word.part_of_speech] || word.part_of_speech} · {word.definition_ar}
            </p>
          </div>
          {word.audio_url && (
            <button
              onClick={playAudio}
              className="w-9 h-9 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center hover:bg-sky-500/25 transition-colors flex-shrink-0"
            >
              <Volume2 size={16} />
            </button>
          )}
        </div>
        {word.example_sentence && (
          <p className="text-xs text-[var(--text-secondary)] font-['Inter'] leading-relaxed italic" dir="ltr">
            "{word.example_sentence}"
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Word List View ──────────────────────────────────
function WordListView({ vocabulary, reviewedWords, onView }) {
  const audioRef = useRef(null)

  const playAudio = (url, e) => {
    e.stopPropagation()
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(url)
    audioRef.current.play().catch(() => {})
  }

  return (
    <div
      className="rounded-xl overflow-hidden divide-y"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', divideColor: 'var(--border-subtle)' }}
    >
      {vocabulary.map(v => {
        const reviewed = reviewedWords?.has(v.id)
        return (
          <WordListItem key={v.id} word={v} reviewed={reviewed} onView={() => onView?.(v.id)} playAudio={playAudio} />
        )
      })}
    </div>
  )
}

function WordListItem({ word, reviewed, onView, playAudio }) {
  const viewedRef = useRef(false)
  useEffect(() => {
    if (!viewedRef.current && onView) { viewedRef.current = true; onView() }
  }, [onView])

  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1" dir="ltr">
        {reviewed && <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />}
        <span className="text-sm font-semibold text-[var(--text-primary)] font-['Inter']">{word.word}</span>
        <span className="text-[10px] text-[var(--text-muted)] font-['Inter']">{word.part_of_speech}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">{word.definition_ar}</span>
        {word.audio_url && (
          <button
            onClick={(e) => playAudio(word.audio_url, e)}
            className="w-7 h-7 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center hover:bg-sky-500/20 transition-colors"
          >
            <Volume2 size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Flashcard Practice ──────────────────────────────
function FlashcardPractice({ words, onBack, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [shuffled] = useState(() => [...words].sort(() => Math.random() - 0.5))
  const [seenIds] = useState(() => new Set())
  const audioRef = useRef(null)

  const word = shuffled[currentIndex]
  if (!word) return null

  // Track current word as seen
  seenIds.add(word.id)

  const next = () => {
    setFlipped(false)
    setTimeout(() => setCurrentIndex(i => Math.min(i + 1, shuffled.length - 1)), 150)
  }

  const prev = () => {
    setFlipped(false)
    setTimeout(() => setCurrentIndex(i => Math.max(i - 1, 0)), 150)
  }

  const playAudio = () => {
    if (!word.audio_url) return
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(word.audio_url)
    audioRef.current.play().catch(() => {})
  }

  const isLast = currentIndex >= shuffled.length - 1

  const handleFinish = () => {
    onComplete?.([...seenIds])
    onBack()
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Progress */}
      <div className="w-full flex items-center justify-between text-xs text-[var(--text-muted)] font-['Tajawal']">
        <span>{currentIndex + 1} / {shuffled.length}</span>
        <button onClick={handleFinish} className="text-sky-400 hover:text-sky-300 font-bold">العودة للقائمة</button>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <div className="h-full rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / shuffled.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped(!flipped)}
        className="w-full max-w-sm aspect-[3/2] rounded-2xl cursor-pointer select-none flex items-center justify-center p-6"
        style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--border-subtle)',
          perspective: '1000px',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={flipped ? 'back' : 'front'}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            {!flipped ? (
              <>
                <p className="text-2xl font-bold text-[var(--text-primary)] font-['Inter']">{word.word}</p>
                <p className="text-xs text-[var(--text-muted)] font-['Inter']">{word.part_of_speech}</p>
                <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">اضغط لقلب البطاقة</p>
              </>
            ) : (
              <>
                {word.image_url && (
                  <img src={word.image_url} alt={word.word} className="w-16 h-16 rounded-lg object-cover" />
                )}
                <p className="text-lg font-bold text-amber-400 font-['Tajawal']">{word.definition_ar}</p>
                <p className="text-sm text-[var(--text-secondary)] font-['Inter']">{word.definition_en}</p>
                {word.example_sentence && (
                  <p className="text-xs text-[var(--text-muted)] font-['Inter'] italic" dir="ltr">"{word.example_sentence}"</p>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={prev}
          disabled={currentIndex === 0}
          className="h-10 px-5 rounded-xl text-sm font-bold bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30 font-['Tajawal']"
        >
          السابق
        </button>
        {word.audio_url && (
          <button
            onClick={playAudio}
            className="w-10 h-10 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center hover:bg-sky-500/25 transition-colors"
          >
            <Volume2 size={18} />
          </button>
        )}
        {isLast ? (
          <button
            onClick={handleFinish}
            className="h-10 px-5 rounded-xl text-sm font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors font-['Tajawal']"
          >
            إنهاء
          </button>
        ) : (
          <button
            onClick={next}
            className="h-10 px-5 rounded-xl text-sm font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 transition-colors font-['Tajawal']"
          >
            التالي
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────
function VocabSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 rounded bg-[var(--surface-raised)] animate-pulse" />
        <div className="h-9 w-20 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
        ))}
      </div>
    </div>
  )
}
