import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Languages, Volume2, LayoutGrid, List, RotateCcw } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

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
  const [viewMode, setViewMode] = useState('cards') // cards | list
  const [practiceMode, setPracticeMode] = useState(false)

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

  if (isLoading) return <VocabSkeleton />

  const allWords = data?.flatMap(d => d.vocabulary) || []
  if (allWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Languages size={40} className="text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد مفردات لهذه الوحدة بعد</p>
      </div>
    )
  }

  if (practiceMode) {
    return <FlashcardPractice words={allWords} onBack={() => setPracticeMode(false)} />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">مفردات الوحدة</h3>
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{allWords.length} كلمة</p>
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
                  <WordCard word={v} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <WordListView vocabulary={vocabulary} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Word Card ───────────────────────────────────────
function WordCard({ word }) {
  const audioRef = useRef(null)

  const playAudio = (e) => {
    e.stopPropagation()
    if (!word.audio_url) return
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(word.audio_url)
    audioRef.current.play().catch(() => {})
  }

  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
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
  )
}

// ─── Word List View ──────────────────────────────────
function WordListView({ vocabulary }) {
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
      {vocabulary.map(v => (
        <div key={v.id} className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1" dir="ltr">
            <span className="text-sm font-semibold text-[var(--text-primary)] font-['Inter']">{v.word}</span>
            <span className="text-[10px] text-[var(--text-muted)] font-['Inter']">{v.part_of_speech}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">{v.definition_ar}</span>
            {v.audio_url && (
              <button
                onClick={(e) => playAudio(v.audio_url, e)}
                className="w-7 h-7 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center hover:bg-sky-500/20 transition-colors"
              >
                <Volume2 size={12} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Flashcard Practice ──────────────────────────────
function FlashcardPractice({ words, onBack }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [shuffled] = useState(() => [...words].sort(() => Math.random() - 0.5))
  const audioRef = useRef(null)

  const word = shuffled[currentIndex]
  if (!word) return null

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

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Progress */}
      <div className="w-full flex items-center justify-between text-xs text-[var(--text-muted)] font-['Tajawal']">
        <span>{currentIndex + 1} / {shuffled.length}</span>
        <button onClick={onBack} className="text-sky-400 hover:text-sky-300 font-bold">العودة للقائمة</button>
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
            onClick={onBack}
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
