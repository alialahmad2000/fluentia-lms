import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useWordLensData } from './useWordLensData'
import { useWordLensAudio } from './useWordLensAudio'
import { positionLens } from './positionLens'
import { QuickRead } from './QuickRead'
import { DeepMenu } from './DeepMenu'
import { toast } from '../../ui/FluentiaToast'

const POPUP_WIDTH = 360
const DEFAULT_POPUP_HEIGHT = 280

export default function WordLens({
  open,
  word,
  contextSentence,
  position,
  readingId,
  unitId,
  studentId,
  passageAudioUrl,
  wordTimestamp,
  prefetched,
  onClose,
}) {
  // ── All hooks declared before any conditional return (React #310) ────
  const containerRef = useRef(null)
  const dragStartRef = useRef(null)
  const [view, setView] = useState('quick') // 'quick' | 'deep'
  const [computedPos, setComputedPos] = useState({ left: 16, top: 24, placement: 'centered' })
  const [dragY, setDragY] = useState(0)

  const data = useWordLensData({
    word: word || '',
    readingId,
    unitId,
    studentId,
    contextSentence,
    prefetched,
  })

  const audio = useWordLensAudio({
    word: word || '',
    wordTimestamp,
    passageAudioUrl,
    vocabAudioUrl: data.data?.audio_url || null,
  })

  // MEGA-FIX V2 Phase E — Save with destination-naming toast on success +
  // explicit error toast on RLS / network failure. The mutation already
  // does .select() so empty rowset / RLS errors become real exceptions.
  const handleSave = useCallback(async () => {
    try {
      await data.save()
      toast({
        type: 'success',
        title: 'تمت إضافة الكلمة',
        description: 'افتحي قسم "كلماتي المحفوظة" لمراجعتها',
      })
    } catch (e) {
      toast({
        type: 'error',
        title: 'ما قدرنا نحفظ الكلمة',
        description: 'جربي مرة ثانية. لو ظلّت ما تشتغل، تواصلي مع المدرب.',
      })
      console.error('[WordLens] save failed:', e?.message)
    }
  }, [data])

  const handleUnsave = useCallback(async () => {
    try {
      await data.unsave()
      toast({ type: 'info', title: 'أزلنا الكلمة من قاموسك' })
    } catch (e) {
      toast({ type: 'error', title: 'ما قدرنا نحذف الكلمة' })
      console.error('[WordLens] unsave failed:', e?.message)
    }
  }, [data])

  // Reset to quick view + clear drag whenever the word changes
  useEffect(() => {
    setView('quick')
    setDragY(0)
  }, [word])

  // Recompute position whenever the popup opens or its size changes (view swap)
  useLayoutEffect(() => {
    if (!open || typeof window === 'undefined') return
    const el = containerRef.current
    const popupHeight = el?.offsetHeight || DEFAULT_POPUP_HEIGHT
    const pos = positionLens({
      tapX: position?.x ?? window.innerWidth / 2,
      tapY: position?.y ?? window.innerHeight / 2,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      popupHeight,
      popupWidth: POPUP_WIDTH,
    })
    setComputedPos(pos)
  }, [open, position?.x, position?.y, view])

  // Dismiss on outside-click, Escape, and scroll
  useEffect(() => {
    if (!open) return

    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose?.()
      }
    }
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.() }
    const handleScroll = () => onClose?.()

    // Delay outside-click binding so the opening gesture doesn't immediately close
    const t = setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown, true)
    }, 0)
    window.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true })

    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open, onClose])

  const isMobileSheet = computedPos.placement === 'bottom-sheet'

  // Bottom-sheet drag-down dismissal
  const onTouchStart = (e) => {
    if (!isMobileSheet) return
    dragStartRef.current = e.touches?.[0]?.clientY ?? null
  }
  const onTouchMove = (e) => {
    if (dragStartRef.current == null) return
    const dy = (e.touches?.[0]?.clientY ?? 0) - dragStartRef.current
    if (dy > 0) setDragY(dy)
  }
  const onTouchEnd = () => {
    if (dragY > 80) onClose?.()
    else setDragY(0)
    dragStartRef.current = null
  }

  if (!open || typeof document === 'undefined') return null

  const positionStyle = isMobileSheet
    ? {
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        transform: `translateY(${Math.max(0, dragY)}px)`,
        maxHeight: 'calc(85vh - env(safe-area-inset-bottom))',
      }
    : {
        position: 'fixed',
        left: computedPos.left,
        top: computedPos.top,
        width: `min(${POPUP_WIDTH}px, calc(100vw - 32px))`,
      }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={containerRef}
          key="wordlens-card"
          initial={{ opacity: 0, scale: isMobileSheet ? 1 : 0.95, y: isMobileSheet ? 40 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: isMobileSheet ? 1 : 0.95, y: isMobileSheet ? 40 : 0 }}
          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="z-popup rounded-2xl backdrop-blur-xl overflow-hidden"
          style={{
            ...positionStyle,
            background: 'var(--ds-card, rgba(10,18,32,0.97))',
            border: '1px solid var(--ds-card-border, rgba(255,255,255,0.08))',
            boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
            color: 'var(--ds-text-primary, var(--text-primary))',
          }}
          dir="rtl"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Mobile drag handle */}
          {isMobileSheet && (
            <div className="flex justify-center pt-2 pb-0.5">
              <div
                className="w-12 h-1 rounded-full"
                style={{ background: 'var(--ds-text-muted, rgba(255,255,255,0.18))', opacity: 0.5 }}
                aria-hidden="true"
              />
            </div>
          )}

          {/* Close button — desktop only; mobile uses drag-down */}
          {!isMobileSheet && (
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'var(--ds-text-muted, var(--text-muted))' }}
            >
              <X size={14} />
            </button>
          )}

          <div className="max-h-[80vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              {view === 'quick' ? (
                <motion.div
                  key="quick"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <QuickRead
                    data={data.data}
                    isLoading={data.isLoading}
                    onPlayAudio={() => audio.play()}
                    isPlayingAudio={audio.isPlaying}
                    audioTier={audio.tier}
                    onSave={handleSave}
                    onUnsave={handleUnsave}
                    isSaved={data.data.isSaved}
                    isSaving={data.isSaving || data.isUnsaving}
                    onExpand={() => setView('deep')}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="deep"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <DeepMenu
                    data={data.data}
                    contextSentence={contextSentence}
                    onBack={() => setView('quick')}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
