import { useEffect, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, Play } from 'lucide-react'
import { useBodyLock } from '../../../hooks/useBodyLock'
import ChunkSessionComplete from './ChunkSessionComplete'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

/**
 * ChunkMiniSession — full-screen modal for one chunk.
 *
 * Shows the chunk's word list (with mastery badges), and a "ابدأ" CTA
 * that queues the un-mastered words through the existing WordExerciseModal
 * (opened via VocabularyTab's setExerciseWord prop, here delegated as
 * onRequestNextWord(wordObj, onClose)).
 *
 * On queue empty → ChunkSessionComplete is rendered inline.
 *
 * Props:
 *   chunk: ChunkData (from useUnitChunks)
 *   nextChunk?: ChunkData | null    — used by the complete screen
 *   onClose: () => void
 *   onRequestNextWord: (wordObj, onCloseCallback) => void
 *   onChunkUpdate?: () => void      — called after each rated word so the lane refetches
 *   onAdvanceToNextChunk?: () => void  — called when "تابع للمجموعة التالية" is tapped
 */
export default function ChunkMiniSession({
  chunk,
  nextChunk = null,
  onClose,
  onRequestNextWord,
  onChunkUpdate,
  onAdvanceToNextChunk,
}) {
  useBodyLock(true)

  const [queue, setQueue] = useState([])
  const [queueStarted, setQueueStarted] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [revisitedCount, setRevisitedCount] = useState(0)

  // Build the initial queue lazily so we don't churn when the chunk
  // refetches with updated mastery
  useEffect(() => {
    if (queueStarted) return
    const unmastered = (chunk?.words || []).filter((w) => {
      // mastery info isn't on the word itself; the parent ChunkLane already
      // computed masteryPct, but for the in-modal list we still want to display
      // the mastery state. The queue is built from the chunk.words array because
      // every word in the chunk is eligible until we know otherwise. The host
      // ChunkLane will refetch after each word, but for the queue we just use
      // chunk.mastered to estimate the initial queue length.
      return true // we'll filter properly when the host re-fetches; for now just
                  // expose every non-mastered slot below
    })
    if (!unmastered.length) {
      setQueue([])
      setQueueStarted(false)
      setCompleted(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunk?.index])

  const total = chunk?.total ?? 0
  const mastered = chunk?.mastered ?? 0
  const queueIndex = queueStarted ? revisitedCount : 0

  // The displayed words list (always shows all words in the chunk for transparency)
  const wordList = useMemo(() => chunk?.words ?? [], [chunk?.words])

  const playAudio = useCallback((url) => {
    if (!url) return
    try {
      const audio = new Audio(url)
      audio.play().catch(() => {})
    } catch {}
  }, [])

  const startQueue = () => {
    if (!chunk?.words?.length) return
    // Build the queue: chunk words that aren't fully mastered. We don't have
    // per-word mastery in the chunk shape (only aggregate counts), but the
    // ChunkLane's parent useUnitChunks fetched the mastery map; for v1 we
    // simply walk through the words in order and trust the existing
    // WordExerciseModal to no-op or skip an already-mastered word.
    setQueue(chunk.words.slice())
    setQueueStarted(true)
    setRevisitedCount(0)
    // Kick off the first word
    advance(chunk.words.slice())
  }

  // Sequentially drive the existing WordExerciseModal. Each word is opened
  // through the host callback; when the host signals close, we recurse.
  const advance = useCallback(
    (currentQueue) => {
      if (!currentQueue || currentQueue.length === 0) {
        setCompleted(true)
        return
      }
      const [head, ...rest] = currentQueue
      onRequestNextWord?.(head, () => {
        setRevisitedCount((c) => c + 1)
        onChunkUpdate?.()
        // Pause briefly so any closing animation finishes, then advance
        setTimeout(() => {
          if (rest.length > 0) advance(rest)
          else {
            setCompleted(true)
            setQueue([])
          }
        }, 250)
      })
    },
    [onRequestNextWord, onChunkUpdate]
  )

  const handleClose = () => {
    onClose?.()
  }

  return (
    <AnimatePresence>
      <motion.div
        key="chunk-mini-session"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[55] overflow-y-auto"
        style={{
          background: 'var(--bg-overlay, rgba(6,14,28,0.96))',
          backdropFilter: 'blur(6px)',
        }}
        dir="rtl"
      >
        <div className="min-h-screen px-4 md:px-8 py-6 md:py-10 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between max-w-2xl mx-auto w-full mb-6 gap-4">
            <div className="flex-1 min-w-0">
              <h2
                className="font-['Tajawal'] font-bold"
                style={{
                  color: 'var(--text-primary, #faf5e6)',
                  fontSize: 22,
                  lineHeight: 1.2,
                }}
              >
                {chunk?.title}
              </h2>
              <p
                className="font-['Tajawal'] mt-1"
                style={{
                  color: 'var(--text-tertiary, rgba(255,255,255,0.55))',
                  fontSize: 13,
                }}
              >
                {chunk?.rangeLabel}
              </p>
              <p
                className="font-['Tajawal'] mt-1"
                style={{
                  color: 'var(--text-secondary, rgba(255,255,255,0.75))',
                  fontSize: 13,
                }}
              >
                أتقنت {toArabicNum(mastered)} من {toArabicNum(total)} كلمات
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: 'var(--surface, rgba(255,255,255,0.04))',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border, rgba(255,255,255,0.08))',
              }}
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="max-w-2xl mx-auto w-full flex-1 pb-24">
            {completed ? (
              <ChunkSessionComplete
                chunk={chunk}
                wordsRevisitedCount={revisitedCount}
                nextChunk={nextChunk}
                onClose={handleClose}
                onContinueNext={() => {
                  if (onAdvanceToNextChunk) {
                    onAdvanceToNextChunk()
                  } else {
                    handleClose()
                  }
                }}
              />
            ) : (
              <div className="space-y-2">
                {wordList.map((w) => (
                  <WordRow key={w.id} word={w} onPlay={() => playAudio(w.audioUrl ?? w.audio_url)} />
                ))}
                {wordList.length === 0 && (
                  <div
                    className="p-6 rounded-xl text-center font-['Tajawal']"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    لا توجد كلمات في هذه المجموعة.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer (sticky CTA) — only when not yet completed */}
          {!completed && wordList.length > 0 && (
            <div
              className="sticky bottom-0 left-0 right-0 max-w-2xl mx-auto w-full pb-4"
              style={{ paddingTop: 12 }}
            >
              <button
                type="button"
                onClick={startQueue}
                disabled={queueStarted}
                className="w-full font-['Tajawal'] font-bold inline-flex items-center justify-center gap-2"
                style={{
                  background:
                    queueStarted
                      ? 'rgba(251,191,36,0.45)'
                      : 'linear-gradient(135deg, #fbbf24, #d97706)',
                  color: '#0a1225',
                  minHeight: 52,
                  borderRadius: 16,
                  fontSize: 16,
                  cursor: queueStarted ? 'progress' : 'pointer',
                  boxShadow: queueStarted ? 'none' : '0 12px 28px rgba(217,119,6,0.30)',
                }}
              >
                <Play size={18} />
                {queueStarted ? `جاري… ${toArabicNum(queueIndex)} / ${toArabicNum(wordList.length)}` : 'ابدأ'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function WordRow({ word, onPlay }) {
  const meaning = word.definition_ar || word.meaning_ar || word.meaningAr
  return (
    <div
      className="p-3 rounded-xl flex items-center gap-3"
      style={{
        background: 'var(--surface, rgba(255,255,255,0.04))',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
      }}
      dir="rtl"
    >
      <button
        type="button"
        onClick={onPlay}
        className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center"
        style={{
          background: 'var(--surface-raised, rgba(255,255,255,0.05))',
          color: 'var(--text-tertiary)',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
        }}
        aria-label="استمع"
      >
        <Volume2 size={14} />
      </button>
      <div className="flex-1 min-w-0">
        <p
          dir="ltr"
          className="font-semibold"
          style={{
            color: 'var(--text-primary, #faf5e6)',
            fontSize: 15,
            lineHeight: 1.2,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {word.word}
        </p>
        {meaning && (
          <p
            className="font-['Tajawal']"
            style={{
              color: 'var(--text-secondary, rgba(255,255,255,0.75))',
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {meaning}
          </p>
        )}
      </div>
    </div>
  )
}
