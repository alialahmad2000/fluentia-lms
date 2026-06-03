import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, RotateCcw, Brain, CheckCircle, Star, AlertTriangle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthProfile } from '../../stores/authStore'
import { useBodyLock } from '../../hooks/useBodyLock'
import { supabase } from '../../lib/supabase'
import { applyRating, previewAllRatings, RATING } from '../../services/vocab'
import SrsSessionComplete from './SrsSessionComplete'
import { emitXP } from '../ui/XPFloater'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

function dueLabel(due, now = new Date()) {
  if (!due) return '—'
  const ms = new Date(due).getTime() - now.getTime()
  if (ms <= 0) return 'الآن'
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `بعد ${toArabicNum(mins)} د`
  const hrs = Math.round(ms / (60 * 60 * 1000))
  if (hrs < 24) return `بعد ${toArabicNum(hrs)} س`
  const days = Math.round(ms / (24 * 60 * 60 * 1000))
  return `بعد ${toArabicNum(days)} يوم`
}

// Direction the card flies out by rating — visual cue distinguishes the 4 outcomes
const EXIT_VECTORS = {
  [RATING.AGAIN]: { x: -260, y: 60, rotate: -8 },
  [RATING.HARD]: { x: -120, y: -180, rotate: -4 },
  [RATING.GOOD]: { x: 260, y: -60, rotate: 4 },
  [RATING.EASY]: { x: 420, y: -100, rotate: 8 },
}

/**
 * Full-screen review session. Each card: hidden answer → reveal → rate.
 * 4-button rating row with FSRS-predicted interval previews under each button.
 * Keyboard: Space = reveal; 1/2/3/4 = ratings.
 */
export default function SrsReviewSession({ isOpen, cards, autoplayAudio = true, onComplete }) {
  const profile = useAuthProfile()
  const queryClient = useQueryClient()
  useBodyLock(isOpen)

  // All hooks declared before any conditional return
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exitVector, setExitVector] = useState(null)
  const [sessionDone, setSessionDone] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [xpGained, setXpGained] = useState(0)
  const [startedAt] = useState(() => Date.now())

  const totalCards = cards?.length ?? 0
  const currentCard = cards?.[currentIndex] ?? null
  // Unified vocab_cards carry denormalized word/meaning; fall back to them when a
  // card has no curriculum_vocabulary row (e.g. a word saved while reading).
  const cv = currentCard?.curriculum_vocabulary ?? null
  const vocab = currentCard
    ? {
        ...(cv || {}),
        word: cv?.word ?? currentCard.word,
        definition_ar: cv?.definition_ar ?? currentCard.meaning_ar,
        definition_en: cv?.definition_en ?? currentCard.meaning_en,
        example_sentence: cv?.example_sentence ?? currentCard.context_sentence,
      }
    : null

  // Reset state when the session opens with a fresh card list
  useEffect(() => {
    if (!isOpen) return
    setCurrentIndex(0)
    setRevealed(false)
    setExitVector(null)
    setSessionDone(false)
    setCorrectCount(0)
    setXpGained(0)
    setSaving(false)
  }, [isOpen, cards])

  // FSRS interval previews — pure, no DB
  const previews = useMemo(() => {
    if (!currentCard) return null
    return previewAllRatings(currentCard)
  }, [currentCard])

  const playAudio = useCallback(() => {
    if (!vocab?.audio_url) return
    try { new Audio(vocab.audio_url).play() } catch {}
  }, [vocab?.audio_url])

  // Optional autoplay on new card front-face
  const lastPlayedId = useRef(null)
  useEffect(() => {
    if (!autoplayAudio || !vocab || sessionDone) return
    if (lastPlayedId.current === currentCard?.id) return
    if (revealed) return
    lastPlayedId.current = currentCard?.id
    playAudio()
  }, [autoplayAudio, vocab, revealed, sessionDone, currentCard?.id, playAudio])

  const handleRate = useCallback(
    async (rating) => {
      if (!currentCard || saving || sessionDone) return
      setSaving(true)
      setExitVector(EXIT_VECTORS[rating] || null)

      try {
        await applyRating(currentCard.id, rating, profile.id)

        // Light XP: 2 for any non-Again rating, 0 for Again (anti-farming + non-punishing)
        const xp = rating === RATING.AGAIN ? 0 : 2
        if (xp > 0 && profile?.id) {
          // Best-effort XP row (fire-and-forget)
          supabase.from('xp_transactions').insert({
            student_id: profile.id,
            amount: xp,
            reason: 'correct_answer',
            description: `مراجعة SRS: ${vocab?.word ?? ''}`,
          }).then(() => {
            try { emitXP(xp, 'مراجعة') } catch {}
          })
          setXpGained((prev) => prev + xp)
        }
        if (rating !== RATING.AGAIN) {
          setCorrectCount((prev) => prev + 1)
        }
      } catch (err) {
        console.error('[SrsReviewSession] applyRating failed:', err?.message)
      }

      // Animation buffer, then advance
      setTimeout(() => {
        if (currentIndex + 1 >= totalCards) {
          setSessionDone(true)
          queryClient.invalidateQueries({ queryKey: ['srs-dashboard'] })
          queryClient.invalidateQueries({ queryKey: ['srs-due-count'] })
          queryClient.invalidateQueries({ queryKey: ['srs-due-cards'] })
        } else {
          setCurrentIndex((prev) => prev + 1)
          setRevealed(false)
          setExitVector(null)
        }
        setSaving(false)
      }, 340)
    },
    [currentCard, saving, sessionDone, profile?.id, vocab?.word, currentIndex, totalCards, queryClient]
  )

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen || sessionDone) return
    function onKey(e) {
      if (e.repeat) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (!revealed) setRevealed(true)
      } else if (revealed && !saving) {
        if (e.key === '1') handleRate(RATING.AGAIN)
        else if (e.key === '2') handleRate(RATING.HARD)
        else if (e.key === '3') handleRate(RATING.GOOD)
        else if (e.key === '4') handleRate(RATING.EASY)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, revealed, saving, sessionDone, handleRate])

  if (!isOpen) return null

  // Session complete
  if (sessionDone) {
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    return (
      <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: 'var(--ds-bg-base, var(--surface-base, #060e1c))' }}>
        <button
          onClick={onComplete}
          className="absolute top-4 left-4 p-2 rounded-lg hover:bg-white/5"
          aria-label="إغلاق"
        >
          <X size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <SrsSessionComplete
          totalReviewed={totalCards}
          correctCount={correctCount}
          xpGained={xpGained}
          elapsedSec={elapsedSec}
          onClose={onComplete}
        />
      </div>
    )
  }

  // No cards
  if (totalCards === 0 || !currentCard) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center" style={{ background: 'var(--ds-bg-base, var(--surface-base, #060e1c))' }}>
        <div className="text-center px-6" dir="rtl">
          <p className="text-base font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
            ما في كلمات للمراجعة الآن
          </p>
          <button onClick={onComplete} className="mt-4 fl-btn-primary px-6 py-2.5 text-sm">
            رجوع
          </button>
        </div>
      </div>
    )
  }

  const progressPct = ((currentIndex + (saving ? 1 : 0)) / totalCards) * 100

  return (
    <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: 'var(--ds-bg-base, var(--surface-base, #060e1c))' }} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
        <button onClick={onComplete} className="p-2 rounded-lg hover:bg-white/5" aria-label="إغلاق الجلسة">
          <X size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div className="flex items-center gap-2">
          <Brain size={16} style={{ color: 'var(--accent-violet)' }} />
          <span className="text-sm font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
            {toArabicNum(currentIndex + 1)} / {toArabicNum(totalCards)}
          </span>
        </div>
        <span className="w-8" aria-hidden />
      </div>

      {/* Progress */}
      <div className="fl-progress-track" style={{ height: '3px' }}>
        <motion.div className="fl-progress-fill" animate={{ width: `${progressPct}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentCard.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
            exit={exitVector ? { opacity: 0, x: exitVector.x, y: exitVector.y, rotate: exitVector.rotate, scale: 0.94 } : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md"
          >
            <div
              className="relative rounded-2xl p-7 min-h-[300px] flex flex-col items-center justify-center text-center"
              style={{
                background: 'var(--glass-card, rgba(255,255,255,0.035))',
                border: '1px solid var(--border-default, rgba(255,255,255,0.08))',
                boxShadow: '0 24px 80px -20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              {/* High-severity pronunciation badge */}
              {vocab?.pronunciation_alert?.severity === 'high' && (
                <div
                  className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-['Tajawal']"
                  style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--accent-gold, #fbbf24)' }}
                >
                  <AlertTriangle size={12} />
                  انتباه للنطق
                </div>
              )}

              {/* English word + IPA + audio */}
              <p className="text-4xl font-bold font-['Inter']" style={{ color: 'var(--text-primary)' }}>
                {vocab?.word}
              </p>
              {vocab?.pronunciation_ipa && (
                <p className="mt-1 text-sm font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  /{vocab.pronunciation_ipa.replace(/^\/|\/$/g, '')}/
                </p>
              )}
              {vocab?.part_of_speech && (
                <span
                  className="mt-2 text-[11px] px-2.5 py-1 rounded-full font-['Tajawal']"
                  style={{ background: 'var(--surface-raised, rgba(255,255,255,0.05))', color: 'var(--text-tertiary)' }}
                >
                  {vocab.part_of_speech}
                </span>
              )}
              {vocab?.audio_url && (
                <button
                  onClick={playAudio}
                  className="mt-4 p-3 rounded-full hover:bg-white/5 transition-colors"
                  aria-label="تشغيل النطق"
                >
                  <Volume2 size={22} style={{ color: 'var(--accent-sky)' }} />
                </button>
              )}

              {/* Reveal section */}
              <AnimatePresence>
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mt-5 pt-5 w-full"
                    style={{ borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}
                  >
                    <p className="text-2xl font-bold font-['Tajawal']" style={{ color: 'var(--accent-violet)' }}>
                      {vocab?.definition_ar}
                    </p>
                    {vocab?.definition_en && (
                      <p className="text-sm mt-2 font-['Inter']" style={{ color: 'var(--text-secondary)' }}>
                        {vocab.definition_en}
                      </p>
                    )}
                    {vocab?.example_sentence && (
                      <p
                        className="text-[13px] italic mt-4 px-3 py-2.5 rounded-lg font-['Inter']"
                        style={{ background: 'var(--surface-raised, rgba(255,255,255,0.04))', color: 'var(--text-secondary)' }}
                      >
                        "{vocab.example_sentence}"
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom action bar */}
      <div className="px-4 pb-4" style={{ paddingBottom: 'calc(16px + var(--sab, 0px))' }}>
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-3.5 rounded-xl text-sm font-bold font-['Tajawal'] transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: 'var(--accent-violet)',
              color: '#fff',
              boxShadow: '0 12px 32px -12px rgba(167,139,250,0.5)',
            }}
          >
            أظهر الإجابة <span className="opacity-70 text-[11px]">(مسافة)</span>
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <RateButton
              icon={RotateCcw}
              label="مرة أخرى"
              shortcut="١"
              interval={previews ? dueLabel(previews.again.card.due) : '—'}
              color="rgb(244,63,94)"
              bg="rgba(244,63,94,0.1)"
              border="rgba(244,63,94,0.25)"
              disabled={saving}
              onClick={() => handleRate(RATING.AGAIN)}
            />
            <RateButton
              icon={AlertTriangle}
              label="صعبة"
              shortcut="٢"
              interval={previews ? dueLabel(previews.hard.card.due) : '—'}
              color="rgb(251,146,60)"
              bg="rgba(251,146,60,0.1)"
              border="rgba(251,146,60,0.25)"
              disabled={saving}
              onClick={() => handleRate(RATING.HARD)}
            />
            <RateButton
              icon={Brain}
              label="جيد"
              shortcut="٣"
              interval={previews ? dueLabel(previews.good.card.due) : '—'}
              color="var(--accent-sky)"
              bg="rgba(56,189,248,0.1)"
              border="rgba(56,189,248,0.25)"
              disabled={saving}
              onClick={() => handleRate(RATING.GOOD)}
            />
            <RateButton
              icon={CheckCircle}
              label="سهلة"
              shortcut="٤"
              interval={previews ? dueLabel(previews.easy.card.due) : '—'}
              color="rgb(52,211,153)"
              bg="rgba(52,211,153,0.1)"
              border="rgba(52,211,153,0.25)"
              disabled={saving}
              onClick={() => handleRate(RATING.EASY)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function RateButton({ icon: Icon, label, shortcut, interval, color, bg, border, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <Icon size={18} style={{ color }} />
      <span className="text-[12px] font-bold font-['Tajawal']" style={{ color }}>
        {label}
      </span>
      <span className="text-[10px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
        {interval}
      </span>
      <span className="text-[9px] opacity-60 font-mono" style={{ color: 'var(--text-tertiary)' }}>
        {shortcut}
      </span>
    </button>
  )
}
