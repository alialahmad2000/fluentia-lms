import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useUnitChunks } from '../../../hooks/useUnitChunks'
import { CHUNK_SIZE_OPTIONS } from '../../../utils/vocabularyChunks'
import { toast } from '../../ui/FluentiaToast'
import ChunkCard from './ChunkCard'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

/**
 * ChunkLane — header + chunk-size pill row + horizontal scrollable cards.
 *
 * Props:
 *   unitId, profileId
 *   onOpenChunk(chunkData): called when an unlocked card is tapped
 */
export default function ChunkLane({ unitId, profileId, onOpenChunk }) {
  const { chunks, chunkSize, setChunkSize, currentChunk, isLoading } = useUnitChunks(
    unitId,
    profileId
  )

  const laneRef = useRef(null)

  // Auto-scroll to currentChunk on first render (after chunks have loaded)
  const hasAutoScrolled = useRef(false)
  useEffect(() => {
    if (hasAutoScrolled.current) return
    if (!chunks.length || !currentChunk || !laneRef.current) return
    const node = laneRef.current.querySelector(`[data-chunk-index="${currentChunk.index}"]`)
    if (node) {
      hasAutoScrolled.current = true
      // Slight delay so layout is fully painted
      setTimeout(() => {
        try {
          node.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
        } catch {
          /* old browsers without smooth scrollIntoView options */
        }
      }, 250)
    }
  }, [chunks, currentChunk])

  // Lane is hidden entirely when the unit has no vocab
  if (!isLoading && chunks.length === 0) return null

  const handleLockedTap = () => {
    toast({
      type: 'info',
      title: 'مقفلة',
      description: 'أكمل المجموعة السابقة بنسبة ٨٠٪ لفتح هذه المجموعة.',
    })
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="vocab-journey-lane"
      dir="rtl"
      style={{ marginBottom: 24 }}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 mb-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3
            className="font-['Tajawal'] font-bold"
            style={{
              color: 'var(--text-primary, #faf5e6)',
              fontSize: 18,
              lineHeight: 1.2,
            }}
          >
            رحلة المفردات
          </h3>
          <p
            className="font-['Tajawal'] mt-0.5"
            style={{
              color: 'var(--text-tertiary, rgba(255,255,255,0.55))',
              fontSize: 13,
            }}
          >
            تعلّم الكلمات على مجموعات صغيرة
          </p>
        </div>

        {/* Size pills */}
        <div className="flex items-center gap-1.5 flex-wrap" role="radiogroup" aria-label="حجم المجموعة">
          <span
            className="font-['Tajawal']"
            style={{
              color: 'var(--text-tertiary)',
              fontSize: 12,
              marginInlineEnd: 6,
            }}
          >
            حجم المجموعة:
          </span>
          {CHUNK_SIZE_OPTIONS.map((size) => {
            const active = size === chunkSize
            return (
              <button
                key={size}
                role="radio"
                aria-checked={active}
                type="button"
                onClick={() => {
                  if (size === chunkSize) return
                  setChunkSize(size).catch((err) => {
                    toast({
                      type: 'error',
                      title: 'تعذر حفظ التفضيل',
                      description: err?.message || 'حاول مرة أخرى.',
                    })
                  })
                }}
                className="font-['Tajawal'] font-bold"
                style={{
                  minWidth: 36,
                  height: 32,
                  padding: '0 10px',
                  borderRadius: 9999,
                  fontSize: 13,
                  background: active
                    ? 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(168,85,247,0.18))'
                    : 'rgba(255,255,255,0.04)',
                  border: active
                    ? '1px solid rgba(168,85,247,0.45)'
                    : '1px solid rgba(255,255,255,0.08)',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 180ms ease',
                }}
              >
                {toArabicNum(size)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Horizontal lane */}
      <div
        ref={laneRef}
        className="chunk-lane-track"
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: 12,
          paddingTop: 4,
          scrollSnapType: 'x mandatory',
          touchAction: 'pan-x',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.18) transparent',
        }}
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <ChunkSkeleton key={i} />)
          : chunks.map((chunk) => (
              <div key={chunk.index} data-chunk-index={chunk.index}>
                <ChunkCard
                  chunk={chunk}
                  onTap={() => onOpenChunk?.(chunk)}
                  onLockedTap={handleLockedTap}
                />
              </div>
            ))}
      </div>
    </motion.section>
  )
}

function ChunkSkeleton() {
  return (
    <div
      style={{
        width: 180,
        height: 170,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        scrollSnapAlign: 'start',
        animation: 'pulse 2s ease-in-out infinite',
      }}
    />
  )
}
