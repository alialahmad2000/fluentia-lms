import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, CheckCircle, RotateCcw, ArrowRight } from 'lucide-react'
import WordRelationships from '../../../../components/vocabulary/WordRelationships'

const POS_LABELS = {
  noun: 'اسم',
  verb: 'فعل',
  adjective: 'صفة',
  adverb: 'ظرف',
  preposition: 'حرف جر',
  conjunction: 'حرف عطف',
  pronoun: 'ضمير',
  interjection: 'تعجب',
  phrase: 'عبارة',
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function VocabularyPractice({ words, onComplete, onBack, studentId }) {
  const [deck, setDeck] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [mastered, setMastered] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [direction, setDirection] = useState(1)
  const [showButtons, setShowButtons] = useState(false)
  const audioRef = useRef(null)

  // Initialize deck
  useEffect(() => {
    const shuffled = shuffle(words)
    setDeck(shuffled)
    setSessionTotal(shuffled.length)
    setCurrentIndex(0)
    setMastered(0)
    setIsFlipped(false)
    setIsComplete(false)
    setShowButtons(false)
  }, [words])

  const currentWord = deck[currentIndex]

  const playAudio = useCallback((e) => {
    if (e) e.stopPropagation()
    if (!currentWord?.audio_url) return
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(currentWord.audio_url)
    audioRef.current.play().catch(() => {})
  }, [currentWord])

  const handleFlip = useCallback(() => {
    if (isFlipped) return
    setIsFlipped(true)
    setTimeout(() => setShowButtons(true), 300)
  }, [isFlipped])

  const advanceToNext = useCallback((newDeck, newIndex) => {
    setShowButtons(false)
    setIsFlipped(false)
    setDirection(1)

    if (newDeck.length === 0 || newIndex >= newDeck.length) {
      setIsComplete(true)
      onComplete?.({ mastered: mastered + 1, total: sessionTotal })
      return
    }

    setDeck(newDeck)
    setCurrentIndex(newIndex >= newDeck.length ? 0 : newIndex)
  }, [mastered, sessionTotal, onComplete])

  const handleRate = useCallback((rating) => {
    if (!currentWord) return

    if (rating === 'know') {
      const newMastered = mastered + 1
      setMastered(newMastered)
      const newDeck = [...deck]
      newDeck.splice(currentIndex, 1)

      if (newDeck.length === 0) {
        setShowButtons(false)
        setIsFlipped(false)
        setIsComplete(true)
        onComplete?.({ mastered: newMastered, total: sessionTotal })
        return
      }

      const nextIndex = currentIndex >= newDeck.length ? 0 : currentIndex
      advanceToNext(newDeck, nextIndex)
    } else {
      const offset = rating === 'dont_know' ? 3 : 5
      const newDeck = [...deck]
      const card = newDeck.splice(currentIndex, 1)[0]
      const insertAt = Math.min(currentIndex + offset, newDeck.length)
      newDeck.splice(insertAt, 0, card)

      const nextIndex = currentIndex >= newDeck.length ? 0 : currentIndex
      advanceToNext(newDeck, nextIndex)
    }
  }, [currentWord, currentIndex, deck, mastered, sessionTotal, onComplete, advanceToNext])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!isFlipped) handleFlip()
      }
      if (isFlipped && showButtons) {
        if (e.key === '1') handleRate('dont_know')
        if (e.key === '2') handleRate('almost')
        if (e.key === '3') handleRate('know')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isFlipped, showButtons, handleFlip, handleRate])

  const handleRestart = () => {
    const shuffled = shuffle(words)
    setDeck(shuffled)
    setSessionTotal(shuffled.length)
    setCurrentIndex(0)
    setMastered(0)
    setIsFlipped(false)
    setIsComplete(false)
    setShowButtons(false)
  }

  // End screen
  if (isComplete) {
    const almostCount = sessionTotal - mastered
    return (
      <motion.div
        className="flex flex-col items-center gap-6 py-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
        >
          <CheckCircle size={64} className="text-emerald-400" />
        </motion.div>

        <h2 className="text-2xl font-bold text-[var(--text-primary)]">أحسنت! 🎉</h2>

        <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
          <p className="text-lg">
            أتقنت <span className="text-emerald-400 font-bold">{mastered}</span> كلمة من{' '}
            <span className="font-bold">{sessionTotal}</span>
          </p>
          {almostCount > 0 && (
            <p className="text-sm text-[var(--text-muted)]">
              تحتاج مراجعة: {almostCount} كلمة
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-2">
          <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-2xl font-bold text-emerald-400">{mastered}</span>
            <span className="text-xs text-emerald-400/70">أعرفها</span>
          </div>
          <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-2xl font-bold text-amber-400">{almostCount}</span>
            <span className="text-xs text-amber-400/70">تحتاج مراجعة</span>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 transition-colors"
          >
            <RotateCcw size={16} />
            أعد التدريب
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)] transition-colors"
          >
            العودة
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    )
  }

  if (!currentWord) return null

  const remaining = deck.length - mastered
  const progress = sessionTotal > 0 ? (mastered / sessionTotal) * 100 : 0

  // Render example with bold word
  const renderExample = (sentence, targetWord) => {
    if (!sentence || !targetWord) return sentence
    const regex = new RegExp(`(${targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = sentence.split(regex)
    return parts.map((part, i) =>
      part.toLowerCase() === targetWord.toLowerCase()
        ? <strong key={i} className="text-sky-400 font-bold">{part}</strong>
        : part
    )
  }

  return (
    <div className="flex flex-col items-center gap-5" dir="rtl">
      {/* Progress bar */}
      <div className="w-full max-w-[420px] space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>أتقنت {mastered} من {sessionTotal}</span>
          <span>متبقي {deck.length}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Card */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentWord.id + '-' + currentIndex}
          custom={direction}
          initial={{ x: 200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -200, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full flex justify-center"
        >
          <div
            className="relative w-full max-w-[420px] min-h-[260px] max-sm:min-h-[220px] cursor-pointer"
            style={{ perspective: '1000px' }}
            onClick={handleFlip}
          >
            <motion.div
              className="relative w-full min-h-[260px] max-sm:min-h-[220px]"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front — English word */}
              <div
                className="absolute inset-0 rounded-[20px] flex flex-col items-center justify-center gap-3 p-6"
                style={{
                  backfaceVisibility: 'hidden',
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span className="text-[28px] sm:text-[32px] font-bold text-[var(--text-primary)]">
                  {currentWord.word}
                </span>

                {currentWord.part_of_speech && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[rgba(255,255,255,0.08)] text-[var(--text-muted)]">
                    {POS_LABELS[currentWord.part_of_speech] || currentWord.part_of_speech}
                  </span>
                )}

                {currentWord.audio_url && (
                  <button
                    onClick={playAudio}
                    className="w-11 h-11 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center hover:bg-sky-500/30 transition-colors"
                    aria-label="تشغيل النطق"
                  >
                    <Volume2 size={20} />
                  </button>
                )}

                <span className="absolute bottom-4 text-xs text-[var(--text-muted)] opacity-60">
                  اضغط للقلب
                </span>
              </div>

              {/* Back — Arabic meaning */}
              <div
                className="absolute inset-0 rounded-[20px] flex flex-col items-center justify-center gap-3 p-6"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span className="text-[24px] sm:text-[28px] font-bold text-[var(--text-primary)] font-[Tajawal] text-center leading-relaxed">
                  {currentWord.definition_ar}
                </span>

                {currentWord.definition_en && (
                  <span className="text-sm text-[var(--text-muted)] text-center max-w-[90%]">
                    {currentWord.definition_en}
                  </span>
                )}

                {currentWord.example_sentence && (
                  <p className="text-sm italic text-[var(--text-secondary)] text-center max-w-[90%] leading-relaxed">
                    {renderExample(currentWord.example_sentence, currentWord.word)}
                  </p>
                )}

                {((currentWord.synonyms && currentWord.synonyms.length > 0) ||
                  (currentWord.antonyms && currentWord.antonyms.length > 0)) && (
                  <div className="w-full max-w-[95%]">
                    <WordRelationships
                      synonyms={currentWord.synonyms || []}
                      antonyms={currentWord.antonyms || []}
                      studentId={studentId}
                    />
                  </div>
                )}

                {currentWord.audio_url && (
                  <button
                    onClick={playAudio}
                    className="w-11 h-11 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center hover:bg-sky-500/30 transition-colors"
                    aria-label="تشغيل النطق"
                  >
                    <Volume2 size={20} />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Rating buttons — appear after flip */}
      <div className="w-full max-w-[420px] h-[56px]">
        <AnimatePresence>
          {isFlipped && showButtons && (
            <motion.div
              className="flex gap-3 w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={() => handleRate('dont_know')}
                className="flex-1 h-12 rounded-xl text-sm font-bold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 active:scale-[0.97] transition-all"
              >
                ما أعرفها
              </button>
              <button
                onClick={() => handleRate('almost')}
                className="flex-1 h-12 rounded-xl text-sm font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 active:scale-[0.97] transition-all"
              >
                تقريباً
              </button>
              <button
                onClick={() => handleRate('know')}
                className="flex-1 h-12 rounded-xl text-sm font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 active:scale-[0.97] transition-all"
              >
                أعرفها
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
