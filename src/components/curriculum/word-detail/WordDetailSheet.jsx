import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, CheckCircle2, Dumbbell, Zap } from 'lucide-react'
import { useBodyLock } from '../../../hooks/useBodyLock'
import { toast } from '../../ui/FluentiaToast'
import { addWordToImmediateReview } from '../../../services/srs'
import DefinitionSection from './DefinitionSection'
import PronunciationSection from './PronunciationSection'
import RelationshipsSection from './RelationshipsSection'
import WordFamilySection from './WordFamilySection'
import ProgressSection from './ProgressSection'

/**
 * WordDetailSheet — premium drawer (mobile) / side panel (desktop)
 * that surfaces all 4 enrichment columns plus per-word progress.
 *
 * The word object is fully read from the parent's already-fetched
 * curriculum_vocabulary row + the existing mastery map. Only the SRS
 * personal stats (ProgressSection) issue a fresh query.
 *
 * Props:
 *   word: full vocab row (id, word, definition_ar, audio_url, etc.)
 *   mastery: vocabulary_word_mastery row for this word (or null)
 *   studentId: profile.id
 *   isOpen: boolean
 *   onClose: () => void
 *   onRequestPractice: (wordObj) => void   // hooks into existing setExerciseWord
 *   onOpenRelated?: (vocabularyId) => void  // recursive open of another word
 */
export default function WordDetailSheet({
  word,
  mastery,
  studentId,
  isOpen,
  onClose,
  onRequestPractice,
  onOpenRelated,
}) {
  useBodyLock(isOpen)

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    if (mq.addEventListener) mq.addEventListener('change', sync)
    else mq.addListener(sync)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', sync)
      else mq.removeListener(sync)
    }
  }, [])

  // ESC closes
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const audioRef = useRef(null)
  const [addingToReview, setAddingToReview] = useState(false)

  const playAudio = useCallback((url) => {
    if (!url) return
    try {
      if (audioRef.current) audioRef.current.pause()
      audioRef.current = new Audio(url)
      audioRef.current.play().catch(() => {})
    } catch {}
  }, [])

  // Cleanup audio on unmount/close
  useEffect(() => {
    if (!isOpen && audioRef.current) {
      try { audioRef.current.pause() } catch {}
      audioRef.current = null
    }
  }, [isOpen])

  // Parsing helpers — JSONB columns sometimes arrive as already-parsed
  // values from Supabase, but the helpers are defensive.
  const synonyms = useMemo(() => safeArray(word?.synonyms), [word?.synonyms])
  const antonyms = useMemo(() => safeArray(word?.antonyms), [word?.antonyms])
  const family = useMemo(() => safeArray(word?.word_family), [word?.word_family])
  const pronAlert = useMemo(() => safeObj(word?.pronunciation_alert), [word?.pronunciation_alert])

  // Mastery badge — based on mastery_level text
  const masteryLevel = mastery?.mastery_level || 'new'
  const masteryBadge = MASTERY_BADGE[masteryLevel] || MASTERY_BADGE.new

  const handlePracticeClick = () => {
    if (!word) return
    onClose?.()
    // Defer to next tick so the sheet's close animation can start before
    // the WordExerciseModal opens (smoother visual handoff)
    setTimeout(() => {
      onRequestPractice?.(word)
    }, 80)
  }

  const handleAddToReview = async () => {
    if (!word?.id || !studentId || addingToReview) return
    setAddingToReview(true)
    try {
      await addWordToImmediateReview(studentId, word.id)
      toast({
        type: 'success',
        title: 'تمت الإضافة',
        description: 'أُضيفت الكلمة لمراجعتك اليومية ✓',
      })
    } catch (e) {
      toast({
        type: 'error',
        title: 'تعذر الإضافة',
        description: e?.message || 'حاول مرة أخرى.',
      })
    } finally {
      setAddingToReview(false)
    }
  }

  if (!word) return null

  // Variants — bottom drawer on mobile, side panel on desktop
  const variants = isMobile
    ? {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
      }
    : {
        initial: { x: '-100%' }, // RTL: start edge is the left
        animate: { x: 0 },
        exit: { x: '-100%' },
      }

  const panelStyle = isMobile
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '85vh',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }
    : {
        position: 'fixed',
        top: 0,
        bottom: 0,
        insetInlineStart: 0, // left in RTL
        width: 'min(480px, 95vw)',
      }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="word-detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-[58] premium-glass"
            style={{
              background: 'rgba(2,6,15,0.62)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.aside
            key="word-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="word-detail-title"
            drag={isMobile ? 'y' : false}
            dragConstraints={isMobile ? { top: 0, bottom: 0 } : undefined}
            dragElastic={isMobile ? 0.15 : 0}
            onDragEnd={(_, info) => {
              if (!isMobile) return
              if (info.offset.y > 140 || info.velocity.y > 600) onClose?.()
            }}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="z-[59] flex flex-col"
            style={{
              ...panelStyle,
              background:
                'linear-gradient(180deg, rgba(10,18,37,0.98) 0%, rgba(10,18,37,1) 60%)',
              borderInlineEnd: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
              borderTop: isMobile ? '1px solid rgba(255,255,255,0.06)' : 'none',
              color: 'var(--text-primary, #faf5e6)',
              boxShadow: isMobile
                ? '0 -16px 40px rgba(0,0,0,0.45)'
                : '8px 0 40px rgba(0,0,0,0.45)',
            }}
            dir="rtl"
          >
            {/* Drag handle (mobile only) */}
            {isMobile && (
              <div className="flex justify-center pt-2">
                <span
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 9999,
                    background: 'rgba(255,255,255,0.18)',
                  }}
                  aria-hidden="true"
                />
              </div>
            )}

            {/* Header (sticky) */}
            <header
              className="flex items-start justify-between gap-3 px-5 py-4 shrink-0"
              style={{
                borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
                background: 'rgba(10,18,37,0.92)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  {word.audio_url && (
                    <button
                      type="button"
                      onClick={() => playAudio(word.audio_url)}
                      className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(56,189,248,0.20), rgba(168,85,247,0.10))',
                        color: 'rgb(56,189,248)',
                        border: '1px solid rgba(168,85,247,0.30)',
                      }}
                      aria-label="استمع للنطق"
                    >
                      <Volume2 size={18} />
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2
                      id="word-detail-title"
                      dir="ltr"
                      className="font-['Inter'] font-bold"
                      style={{
                        fontSize: 26,
                        lineHeight: 1.1,
                        color: 'var(--text-primary)',
                        wordBreak: 'break-word',
                      }}
                    >
                      {word.word}
                    </h2>
                    {(word.pronunciation_ipa || pronAlert?.ipa) && (
                      <div
                        dir="ltr"
                        className="mt-0.5"
                        style={{
                          color: 'var(--text-tertiary)',
                          fontSize: 13,
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      >
                        {word.pronunciation_ipa || pronAlert?.ipa}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mastery badge */}
                <span
                  className="inline-flex items-center gap-1.5 mt-3 font-['Tajawal'] font-bold"
                  style={{
                    background: masteryBadge.bg,
                    color: masteryBadge.color,
                    border: `1px solid ${masteryBadge.border}`,
                    padding: '4px 10px',
                    borderRadius: 9999,
                    fontSize: 11,
                  }}
                >
                  {masteryBadge.icon}
                  {masteryBadge.label}
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--surface, rgba(255,255,255,0.04))',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </header>

            {/* Body */}
            <div
              className="flex-1 overflow-y-auto px-5 py-4"
              style={{ overscrollBehavior: 'contain' }}
            >
              <DefinitionSection word={word} onPlayAudio={playAudio} />
              <PronunciationSection alert={pronAlert} />
              <RelationshipsSection
                synonyms={synonyms}
                antonyms={antonyms}
                onOpenRelated={onOpenRelated}
              />
              <WordFamilySection family={family} onOpenRelated={onOpenRelated} />
              <ProgressSection
                studentId={studentId}
                vocabularyId={word.id}
                mastery={mastery}
              />
            </div>

            {/* Sticky bottom CTAs */}
            <footer
              className="shrink-0 px-5 py-3 grid gap-2"
              style={{
                background: 'rgba(10,18,37,0.95)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderTop: '1px solid var(--border, rgba(255,255,255,0.06))',
                gridTemplateColumns: '1fr 1fr',
              }}
            >
              <button
                type="button"
                onClick={handlePracticeClick}
                className="font-['Tajawal'] font-bold inline-flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                  color: '#0a1225',
                  minHeight: 48,
                  borderRadius: 14,
                  fontSize: 14,
                  boxShadow: '0 10px 22px rgba(217,119,6,0.30)',
                }}
              >
                <Dumbbell size={16} />
                تدرّب على هذي الكلمة
              </button>
              <button
                type="button"
                onClick={handleAddToReview}
                disabled={addingToReview}
                className="font-['Tajawal'] font-bold inline-flex items-center justify-center gap-2"
                style={{
                  background: 'var(--surface, rgba(255,255,255,0.04))',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border, rgba(255,255,255,0.10))',
                  minHeight: 48,
                  borderRadius: 14,
                  fontSize: 13,
                  opacity: addingToReview ? 0.6 : 1,
                  cursor: addingToReview ? 'progress' : 'pointer',
                }}
              >
                <Zap size={14} />
                {addingToReview ? 'جاري الإضافة…' : 'أضفها للمراجعة الفورية'}
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

const MASTERY_BADGE = {
  mastered: {
    label: 'أتقنت',
    icon: <CheckCircle2 size={11} />,
    bg: 'rgba(34,197,94,0.18)',
    color: 'rgb(34,197,94)',
    border: 'rgba(34,197,94,0.40)',
  },
  learning: {
    label: 'تتعلم',
    icon: null,
    bg: 'rgba(245,158,11,0.18)',
    color: 'rgb(245,158,11)',
    border: 'rgba(245,158,11,0.40)',
  },
  new: {
    label: 'جديدة',
    icon: null,
    bg: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.65)',
    border: 'rgba(255,255,255,0.12)',
  },
}

function safeArray(v) {
  if (!v) return []
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v)
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }
  return []
}

function safeObj(v) {
  if (!v) return null
  if (typeof v === 'object' && !Array.isArray(v)) return v
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v)
      return p && typeof p === 'object' && !Array.isArray(p) ? p : null
    } catch {
      return null
    }
  }
  return null
}
