import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Flashcard from './Flashcard'
import { toArabicNum } from '../../../../lib/vocabFormat'

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
}

export default function FlashcardDeck({ words, masteryById = {} }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  // Reset index when words change
  useEffect(() => {
    setCurrentIndex(0)
    setDirection(0)
  }, [words])

  const goToNext = useCallback(() => {
    if (currentIndex < words.length - 1) {
      setDirection(1)
      setCurrentIndex((i) => i + 1)
    }
  }, [currentIndex, words.length])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex((i) => i - 1)
    }
  }, [currentIndex])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') goToPrevious() // RTL: right = previous
      if (e.key === 'ArrowLeft') goToNext() // RTL: left = next
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goToNext, goToPrevious])

  if (!words.length) return null

  const current = words[currentIndex]

  const navBtnStyle = {
    background: 'var(--vc-surface-2)',
    border: '1px solid var(--vc-border)',
    color: 'var(--vc-text-soft)',
  }

  return (
    <div className="flex flex-col items-center gap-6 lg:max-w-[420px] lg:me-auto">
      {/* Card area with swipe */}
      <motion.div
        className="relative w-full flex justify-center"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (info.offset.x > 100) goToPrevious()
          if (info.offset.x < -100) goToNext()
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex justify-center w-full"
          >
            <Flashcard word={current} mastery={masteryById[current.id]} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 transition-all"
          style={navBtnStyle}
          aria-label="الكلمة السابقة"
        >
          <ChevronRight size={20} />
        </button>

        <span className="text-sm min-w-[90px] text-center tabular-nums" dir="rtl" style={{ color: 'var(--vc-text-dim)' }}>
          كلمة {toArabicNum(currentIndex + 1)} من {toArabicNum(words.length)}
        </span>

        <button
          onClick={goToNext}
          disabled={currentIndex === words.length - 1}
          className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 transition-all"
          style={navBtnStyle}
          aria-label="الكلمة التالية"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-[380px] h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--vc-surface-2)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(135deg, var(--vc-sky), var(--vc-indigo))', boxShadow: '0 0 12px -2px rgba(56,189,248,0.6)' }}
          initial={false}
          animate={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  )
}
