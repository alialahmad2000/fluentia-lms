import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Play, CheckCircle, RotateCcw, ArrowRight } from 'lucide-react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function VerbAnkiPractice({ verbs, onComplete, onBack }) {
  const [deck, setDeck] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [mastered, setMastered] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [direction, setDirection] = useState(1)
  const [showButtons, setShowButtons] = useState(false)
  const audioRef = useRef(null)
  const [playingForm, setPlayingForm] = useState(null)
  const [playingAll, setPlayingAll] = useState(false)

  // Initialize deck
  useEffect(() => {
    const shuffled = shuffle(verbs)
    setDeck(shuffled)
    setSessionTotal(shuffled.length)
    setCurrentIndex(0)
    setMastered(0)
    setIsFlipped(false)
    setIsComplete(false)
    setShowButtons(false)
  }, [verbs])

  const currentVerb = deck[currentIndex]

  const playAudio = useCallback((url, form, e) => {
    if (e) e.stopPropagation()
    if (!url) return
    if (audioRef.current) audioRef.current.pause()
    setPlayingForm(form)
    audioRef.current = new Audio(url)
    audioRef.current.onended = () => setPlayingForm(null)
    audioRef.current.onerror = () => setPlayingForm(null)
    audioRef.current.play().catch(() => setPlayingForm(null))
  }, [])

  const playAllForms = useCallback(async (e) => {
    if (e) e.stopPropagation()
    if (!currentVerb || playingAll) return
    setPlayingAll(true)

    const urls = [
      { url: currentVerb.audio_base_url, form: 'base' },
      { url: currentVerb.audio_past_url, form: 'past' },
      { url: currentVerb.audio_pp_url, form: 'pp' },
    ].filter(u => u.url)

    for (const { url, form } of urls) {
      setPlayingForm(form)
      await new Promise(resolve => {
        if (audioRef.current) audioRef.current.pause()
        const a = new Audio(url)
        audioRef.current = a
        a.onended = () => setTimeout(resolve, 400)
        a.onerror = resolve
        a.play().catch(resolve)
      })
    }
    setPlayingForm(null)
    setPlayingAll(false)
  }, [currentVerb, playingAll])

  const handleFlip = useCallback(() => {
    if (isFlipped) return
    setIsFlipped(true)
    setTimeout(() => setShowButtons(true), 300)
  }, [isFlipped])

  const advanceToNext = useCallback((newDeck, newIndex) => {
    setShowButtons(false)
    setIsFlipped(false)
    setDirection(1)
    setPlayingForm(null)
    setPlayingAll(false)
    if (audioRef.current) audioRef.current.pause()

    if (newDeck.length === 0 || newIndex >= newDeck.length) {
      setIsComplete(true)
      onComplete?.({ mastered: mastered + 1, total: sessionTotal })
      return
    }

    setDeck(newDeck)
    setCurrentIndex(newIndex >= newDeck.length ? 0 : newIndex)
  }, [mastered, sessionTotal, onComplete])

  const handleRate = useCallback((rating) => {
    if (!currentVerb) return

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
  }, [currentVerb, currentIndex, deck, mastered, sessionTotal, onComplete, advanceToNext])

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
    const shuffled = shuffle(verbs)
    setDeck(shuffled)
    setSessionTotal(shuffled.length)
    setCurrentIndex(0)
    setMastered(0)
    setIsFlipped(false)
    setIsComplete(false)
    setShowButtons(false)
    if (audioRef.current) audioRef.current.pause()
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

        <h2 className="text-2xl font-bold text-[var(--text-primary)] font-['Tajawal']">أحسنت!</h2>

        <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)] font-['Tajawal']">
          <p className="text-lg">
            أتقنت <span className="text-emerald-400 font-bold">{mastered}</span> فعل من{' '}
            <span className="font-bold">{sessionTotal}</span>
          </p>
          {almostCount > 0 && (
            <p className="text-sm text-[var(--text-muted)]">
              تحتاج مراجعة: {almostCount} فعل
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-2">
          <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-2xl font-bold text-emerald-400">{mastered}</span>
            <span className="text-xs text-emerald-400/70 font-['Tajawal']">أعرفها</span>
          </div>
          <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-2xl font-bold text-amber-400">{almostCount}</span>
            <span className="text-xs text-amber-400/70 font-['Tajawal']">تحتاج مراجعة</span>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 transition-colors font-['Tajawal']"
          >
            <RotateCcw size={16} />
            أعد التدريب
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)] transition-colors font-['Tajawal']"
          >
            العودة
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    )
  }

  if (!currentVerb) return null

  const progress = sessionTotal > 0 ? (mastered / sessionTotal) * 100 : 0

  const forms = [
    { label: 'Base', labelAr: 'المصدر', value: currentVerb.verb_base, audioUrl: currentVerb.audio_base_url, form: 'base' },
    { label: 'Past', labelAr: 'الماضي', value: currentVerb.verb_past, audioUrl: currentVerb.audio_past_url, form: 'past' },
    { label: 'Past Part.', labelAr: 'التصريف الثالث', value: currentVerb.verb_past_participle, audioUrl: currentVerb.audio_pp_url, form: 'pp' },
  ]

  return (
    <div className="flex flex-col items-center gap-5" dir="rtl">
      {/* Progress bar */}
      <div className="w-full max-w-[420px] space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-['Tajawal']">
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
          key={currentVerb.id + '-' + currentIndex}
          custom={direction}
          initial={{ x: 200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -200, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full flex justify-center"
        >
          <div
            className="relative w-full max-w-[420px] min-h-[280px] max-sm:min-h-[240px] cursor-pointer"
            style={{ perspective: '1000px' }}
            onClick={handleFlip}
          >
            <motion.div
              className="relative w-full min-h-[280px] max-sm:min-h-[240px]"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front — base form + meaning */}
              <div
                className="absolute inset-0 rounded-[20px] flex flex-col items-center justify-center gap-3 p-6"
                style={{
                  backfaceVisibility: 'hidden',
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span className="text-[32px] sm:text-[38px] font-bold text-[var(--text-primary)] font-['Inter']">
                  {currentVerb.verb_base}
                </span>

                <span className="text-lg text-[var(--text-secondary)] font-['Tajawal']">
                  {currentVerb.meaning_ar}
                </span>

                {currentVerb.audio_base_url && (
                  <button
                    onClick={(e) => playAudio(currentVerb.audio_base_url, 'base', e)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                      playingForm === 'base'
                        ? 'bg-sky-500 text-white'
                        : 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30'
                    }`}
                    aria-label="تشغيل النطق"
                  >
                    <Volume2 size={20} />
                  </button>
                )}

                <span className="absolute bottom-4 text-xs text-[var(--text-muted)] opacity-60 font-['Tajawal']">
                  اضغط لرؤية التصريفات
                </span>
              </div>

              {/* Back — all 3 forms */}
              <div
                className="absolute inset-0 rounded-[20px] flex flex-col items-center justify-center gap-4 p-6"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* 3 forms */}
                <div className="grid grid-cols-3 gap-4 w-full">
                  {forms.map(f => (
                    <div key={f.form} className="text-center">
                      <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-['Inter']">
                        {f.value}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1 font-['Tajawal']">{f.labelAr}</p>
                      {f.audioUrl && (
                        <button
                          onClick={(e) => playAudio(f.audioUrl, f.form, e)}
                          className={`mt-1.5 w-8 h-8 rounded-full inline-flex items-center justify-center transition-colors ${
                            playingForm === f.form
                              ? 'bg-sky-500 text-white'
                              : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
                          }`}
                        >
                          <Volume2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Play All */}
                <button
                  onClick={playAllForms}
                  disabled={playingAll}
                  className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors font-['Tajawal'] ${
                    playingAll
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
                  }`}
                >
                  <Play size={14} />
                  {playingAll ? 'جاري التشغيل...' : 'تشغيل الكل'}
                </button>

                {/* Meaning + example */}
                <div className="text-center space-y-1">
                  <p className="text-base text-[var(--text-secondary)] font-['Tajawal']">
                    {currentVerb.meaning_ar}
                  </p>
                  {currentVerb.example_sentence && (
                    <p className="text-sm italic text-[var(--text-muted)] font-['Inter']">
                      "{currentVerb.example_sentence}"
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Rating buttons */}
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
                className="flex-1 h-12 rounded-xl text-sm font-bold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 active:scale-[0.97] transition-all font-['Tajawal']"
              >
                ما أعرفها
              </button>
              <button
                onClick={() => handleRate('almost')}
                className="flex-1 h-12 rounded-xl text-sm font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 active:scale-[0.97] transition-all font-['Tajawal']"
              >
                تقريباً
              </button>
              <button
                onClick={() => handleRate('know')}
                className="flex-1 h-12 rounded-xl text-sm font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 active:scale-[0.97] transition-all font-['Tajawal']"
              >
                أعرفها
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-[var(--text-muted)] opacity-50 font-['Tajawal']">
        مسافة للقلب — 1/2/3 للتقييم
      </p>
    </div>
  )
}
