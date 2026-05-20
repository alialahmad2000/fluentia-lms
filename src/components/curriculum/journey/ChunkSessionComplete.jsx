import { motion } from 'framer-motion'
import { Trophy, Unlock, ArrowLeft } from 'lucide-react'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

/**
 * ChunkSessionComplete — rendered inline inside ChunkMiniSession after
 * the queue empties (or when the chunk is already 100% mastered).
 *
 * Props:
 *   chunk: ChunkData with masteryPct / total / mastered
 *   wordsRevisitedCount: how many words the student went through this session
 *   nextChunk: ChunkData | null (the next unlocked chunk after this one)
 *   onClose: () => void
 *   onContinueNext: () => void  (called when "تابع للمجموعة التالية" is tapped)
 */
export default function ChunkSessionComplete({
  chunk,
  wordsRevisitedCount = 0,
  nextChunk = null,
  onClose,
  onContinueNext,
}) {
  const crossedThreshold = chunk?.masteryPct >= 80
  const nextAvailable = !!nextChunk && nextChunk.isUnlocked && !nextChunk.isCompleted

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
      dir="rtl"
    >
      {/* Confetti — small premium burst */}
      <div className="relative h-2">
        {Array.from({ length: 14 }).map((_, i) => {
          const left = `${(i / 14) * 100}%`
          const colors = ['#fbbf24', '#34d399', '#38bdf8', '#a78bfa', '#f472b6']
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: [0, 1, 0], y: [-8, 14, 38] }}
              transition={{ duration: 1.4, delay: i * 0.04, ease: 'easeOut' }}
              className="absolute top-0 w-2 h-2 rounded-full"
              style={{ left, background: colors[i % colors.length] }}
            />
          )
        })}
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center mb-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, rgba(251,191,36,0.20), rgba(245,158,11,0.06))',
              color: '#fbbf24',
              boxShadow: '0 10px 30px rgba(251,191,36,0.22)',
            }}
          >
            <Trophy size={26} />
          </div>
        </div>
        <h2
          className="font-['Tajawal'] font-bold"
          style={{
            color: 'var(--text-primary, #faf5e6)',
            fontSize: 22,
            lineHeight: 1.2,
          }}
        >
          {chunk?.title} — خلصت!
        </h2>
        <p
          className="font-['Tajawal'] mt-2"
          style={{
            color: 'var(--text-secondary, rgba(255,255,255,0.75))',
            fontSize: 14,
          }}
        >
          راجعت {toArabicNum(wordsRevisitedCount)} كلمة في هذه الجلسة
        </p>
      </div>

      {/* Stats — 3 tiles */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="عدد الكلمات" value={toArabicNum(chunk?.total ?? 0)} />
        <StatTile label="أتقنت" value={toArabicNum(chunk?.mastered ?? 0)} />
        <StatTile
          label="تقدّم المجموعة"
          value={`${toArabicNum(chunk?.masteryPct ?? 0)}٪`}
          accent={chunk?.masteryPct >= 80 ? 'gold' : 'default'}
        />
      </div>

      {/* Unlock banner */}
      {crossedThreshold && nextAvailable && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-2xl flex items-center gap-3"
          style={{
            background:
              'linear-gradient(135deg, rgba(34,197,94,0.16), rgba(16,185,129,0.06))',
            border: '1px solid rgba(34,197,94,0.4)',
          }}
        >
          <div
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.20)', color: 'rgb(34,197,94)' }}
          >
            <Unlock size={16} />
          </div>
          <div className="font-['Tajawal']">
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              المجموعة التالية مفتوحة
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {nextChunk.title} — {nextChunk.rangeLabel}
            </p>
          </div>
        </motion.div>
      )}

      {/* Buttons */}
      <div className="flex flex-col md:flex-row gap-3 pt-2">
        {nextAvailable && (
          <button
            type="button"
            onClick={onContinueNext}
            className="flex-1 py-3 rounded-xl font-bold font-['Tajawal'] inline-flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #d97706)',
              color: '#0a1225',
              minHeight: 48,
            }}
          >
            تابع للمجموعة التالية
            <ArrowLeft size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 rounded-xl font-bold font-['Tajawal']"
          style={{
            background: 'var(--surface, rgba(255,255,255,0.04))',
            color: 'var(--text-primary, #faf5e6)',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            minHeight: 48,
          }}
        >
          ارجع للوحدة
        </button>
      </div>
    </motion.div>
  )
}

function StatTile({ label, value, accent = 'default' }) {
  const isGold = accent === 'gold'
  return (
    <div
      className="p-3 rounded-xl text-center"
      style={{
        background: isGold
          ? 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.04))'
          : 'var(--surface, rgba(255,255,255,0.04))',
        border: `1px solid ${isGold ? 'rgba(251,191,36,0.30)' : 'var(--border, rgba(255,255,255,0.08))'}`,
      }}
    >
      <div
        className="font-bold"
        style={{
          color: isGold ? 'rgb(251,191,36)' : 'var(--text-primary, #faf5e6)',
          fontSize: 18,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        className="font-['Tajawal'] mt-1"
        style={{
          color: 'var(--text-tertiary, rgba(255,255,255,0.55))',
          fontSize: 11,
        }}
      >
        {label}
      </div>
    </div>
  )
}
