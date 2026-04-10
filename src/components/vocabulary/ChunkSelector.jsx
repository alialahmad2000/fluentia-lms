import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ChevronDown, Zap } from 'lucide-react'
import ChunkCard from './ChunkCard'
import { useVocabularyChunks, useChunkSizePreference } from '../../hooks/useVocabularyChunks'
import { CHUNK_SIZE_OPTIONS } from '../../utils/vocabularyChunks'

const FILTERS = [
  { key: 'all', label: 'جميع الكلمات' },
  { key: 'new', label: 'الكلمات الجديدة فقط' },
  { key: 'difficult', label: 'الكلمات الصعبة' },
]

/**
 * Entry screen for vocabulary practice — shows a grid of chunk cards with
 * filter chips + chunk size dropdown.
 *
 * @param {Array} unitWords       — filtered & sorted words for the current unit
 * @param {Object} masteryMap     — { [vocab_id]: mastery_record }
 * @param {string} unitLabel      — e.g. "الوحدة 3 — الأسرة"
 * @param {Function} onPractice   — (chunk) => void  — launch flashcard practice with chunk words
 * @param {Function} onQuiz       — (chunk) => void  — launch quiz with chunk words
 * @param {Function} onFullQuiz   — () => void       — launch quiz on entire unit
 */
export default function ChunkSelector({
  unitWords,
  masteryMap,
  unitLabel,
  onPractice,
  onQuiz,
  onFullQuiz,
}) {
  const { chunkSize, setChunkSize, isSaving } = useChunkSizePreference()
  const [filter, setFilter] = useState('all')
  const [saveError, setSaveError] = useState(null)

  const chunks = useVocabularyChunks(unitWords, masteryMap, chunkSize, filter)

  const handleChunkSizeChange = async (newSize) => {
    setSaveError(null)
    try {
      await setChunkSize(newSize)
    } catch (e) {
      setSaveError('لم نتمكن من حفظ تفضيلك — تم الرجوع للحجم الافتراضي')
    }
  }

  if (!unitWords || unitWords.length === 0) {
    return (
      <div className="glass-card p-12 text-center" dir="rtl">
        <BookOpen size={40} className="mx-auto text-[var(--text-muted)] opacity-40 mb-4" />
        <p className="text-[var(--text-muted)]">
          اختر وحدة محددة من الفلتر أعلاه لبدء التدريب بالدفعات
        </p>
      </div>
    )
  }

  const totalWords = unitWords.length
  const totalChunks = chunks.length

  return (
    <div dir="rtl" className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Zap size={18} className="text-sky-400" />
            التدريب بالدفعات
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {unitLabel} — {totalWords} كلمة في {totalChunks} دفعة
          </p>
        </div>

        {/* Chunk size dropdown */}
        <div className="relative">
          <label className="block text-[10px] text-[var(--text-muted)] mb-1 text-right">
            حجم الدفعة
          </label>
          <div className="relative">
            <select
              value={chunkSize}
              onChange={(e) => handleChunkSizeChange(Number(e.target.value))}
              disabled={isSaving}
              className="h-9 pl-7 pr-3 rounded-xl text-sm font-medium appearance-none cursor-pointer bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-sky-500/50 disabled:opacity-60"
            >
              {CHUNK_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} كلمات
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          </div>
        </div>
      </div>

      {saveError && (
        <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          {saveError}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`h-8 px-3 rounded-full text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
            }`}
          >
            {f.label}
          </button>
        ))}

        <button
          onClick={onFullQuiz}
          className="mr-auto h-8 px-4 rounded-full text-xs font-semibold bg-gradient-to-l from-sky-500 to-sky-600 text-white hover:from-sky-400 hover:to-sky-500 transition-colors"
        >
          اختبر نفسك على كل الوحدة
        </button>
      </div>

      {/* Chunks grid */}
      <motion.div
        layout
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      >
        {chunks.map((chunk) => (
          <ChunkCard
            key={chunk.index}
            chunk={chunk}
            onPractice={onPractice}
            onQuiz={onQuiz}
          />
        ))}
      </motion.div>
    </div>
  )
}
