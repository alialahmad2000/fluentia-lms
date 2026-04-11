import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, X } from 'lucide-react'
import { useAnkiSession } from '../../hooks/useAnkiSession'
import { Rating, formatInterval } from '../../lib/fsrs'
import WordRelationships from '../vocabulary/WordRelationships'
import AnkiSessionComplete from './AnkiSessionComplete'

/**
 * Full Anki review flow for the day.
 */
export default function AnkiReviewSession({ studentId, settings, onExit, onSettingsChanged }) {
  const { loading, error, current, stats, previews, rate } = useAnkiSession(studentId, settings)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    setFlipped(false)
  }, [current?.card?._id])

  // Auto-play audio on card appearance (if enabled)
  useEffect(() => {
    if (!current || !settings?.autoplay_audio) return
    const url = current.vocab?.audio_url
    if (!url) return
    try {
      const audio = new Audio(url)
      audio.play().catch(() => {})
    } catch {}
  }, [current, settings?.autoplay_audio])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-[var(--text-muted)] font-['Tajawal']">جاري تحميل البطاقات…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-center space-y-3 max-w-md mx-auto">
        <p className="text-rose-400 font-['Tajawal']">حدث خطأ في تحميل البطاقات</p>
        <p className="text-xs text-[var(--text-muted)]">{error}</p>
        <button
          onClick={onExit}
          className="px-4 py-2 rounded-xl bg-slate-700 text-sm font-['Tajawal']"
        >
          رجوع
        </button>
      </div>
    )
  }

  if (stats.completed) {
    return <AnkiSessionComplete stats={stats} onExit={onExit} />
  }

  if (!current) {
    return (
      <div className="glass-card p-6 text-center space-y-3 max-w-md mx-auto">
        <p className="text-[var(--text-primary)] font-['Tajawal']">
          لا توجد بطاقات للمراجعة الآن 🎉
        </p>
        <button
          onClick={onExit}
          className="px-4 py-2 rounded-xl bg-slate-700 text-sm font-['Tajawal']"
        >
          رجوع
        </button>
      </div>
    )
  }

  const vocab = current.vocab
  const progress = stats.total > 0 ? (stats.reviewed / stats.total) * 100 : 0

  const playAudio = (e) => {
    e?.stopPropagation()
    if (!vocab?.audio_url) return
    try {
      new Audio(vocab.audio_url).play().catch(() => {})
    } catch {}
  }

  return (
    <div dir="rtl" className="max-w-xl mx-auto flex flex-col gap-4">
      {/* Header: progress + exit */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExit}
          className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
          aria-label="خروج"
        >
          <X size={16} className="text-slate-300" />
        </button>
        <div className="flex-1">
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-rose-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        <div className="text-xs text-[var(--text-muted)] font-['Tajawal'] min-w-[48px] text-left">
          {stats.reviewed}/{stats.total}
        </div>
      </div>

      {/* Card */}
      <div
        className="relative min-h-[320px] cursor-pointer select-none"
        onClick={() => setFlipped((f) => !f)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={(current.card._id || 'x') + (flipped ? '-b' : '-f')}
            initial={{ opacity: 0, rotateY: flipped ? 180 : -180 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-slate-800 border border-slate-700 shadow-2xl p-8 min-h-[320px] flex flex-col items-center justify-center gap-4"
          >
            {!flipped ? (
              <>
                <div className="text-5xl max-sm:text-4xl font-bold text-slate-100 text-center" dir="ltr">
                  {vocab.word}
                </div>
                {vocab.part_of_speech && (
                  <div className="text-xs uppercase tracking-widest text-slate-400" dir="ltr">
                    {vocab.part_of_speech}
                  </div>
                )}
                {vocab.audio_url && (
                  <button
                    onClick={playAudio}
                    className="mt-2 w-11 h-11 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center hover:bg-sky-500/30 transition-colors"
                  >
                    <Volume2 size={20} />
                  </button>
                )}
                <div className="mt-4 text-xs text-slate-500 font-['Tajawal']">
                  اضغط للقلب
                </div>
              </>
            ) : (
              <div className="w-full space-y-3 text-center">
                <div className="text-3xl max-sm:text-2xl font-bold text-slate-100" dir="ltr">
                  {vocab.word}
                </div>
                {vocab.definition_ar && (
                  <div className="text-lg text-emerald-300 font-['Tajawal']">
                    {vocab.definition_ar}
                  </div>
                )}
                {vocab.definition_en && (
                  <div className="text-sm text-slate-400" dir="ltr">
                    {vocab.definition_en}
                  </div>
                )}
                {vocab.example_sentence && (
                  <p className="text-sm italic text-slate-300 leading-relaxed max-w-[90%] mx-auto" dir="ltr">
                    {vocab.example_sentence}
                  </p>
                )}
                {(vocab.synonyms?.length > 0 || vocab.antonyms?.length > 0) && (
                  <div className="pt-2">
                    <WordRelationships
                      synonyms={vocab.synonyms || []}
                      antonyms={vocab.antonyms || []}
                      studentId={studentId}
                    />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Rating buttons — only shown after flip */}
      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          <RatingButton
            label="مرة أخرى"
            interval={formatInterval(previews?.[Rating.Again] || new Date())}
            color="rose"
            onClick={() => rate(Rating.Again)}
          />
          <RatingButton
            label="صعبة"
            interval={formatInterval(previews?.[Rating.Hard] || new Date())}
            color="amber"
            onClick={() => rate(Rating.Hard)}
          />
          <RatingButton
            label="جيد"
            interval={formatInterval(previews?.[Rating.Good] || new Date())}
            color="emerald"
            onClick={() => rate(Rating.Good)}
          />
          <RatingButton
            label="سهلة"
            interval={formatInterval(previews?.[Rating.Easy] || new Date())}
            color="sky"
            onClick={() => rate(Rating.Easy)}
          />
        </div>
      ) : (
        <button
          onClick={() => setFlipped(true)}
          className="h-14 rounded-2xl bg-slate-800 border border-slate-700 text-[var(--text-primary)] font-['Tajawal'] font-medium hover:bg-slate-700 transition-colors"
        >
          أظهر الترجمة
        </button>
      )}
    </div>
  )
}

function RatingButton({ label, interval, color, onClick }) {
  const colors = {
    rose: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800',
    amber: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
    sky: 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800',
  }
  return (
    <button
      onClick={onClick}
      className={[
        'flex flex-col items-center justify-center gap-0.5 rounded-2xl min-h-[56px] px-2 py-2 text-white transition-all',
        'font-[\'Tajawal\'] font-semibold text-sm',
        colors[color] || colors.emerald,
      ].join(' ')}
    >
      <span className="text-[11px] opacity-90" dir="ltr">{interval}</span>
      <span>{label}</span>
    </button>
  )
}
