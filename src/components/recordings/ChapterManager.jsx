import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, BookOpen, Sparkles, Clock } from 'lucide-react'
import { useRecordingChapters } from '../../hooks/useRecordingChapters'

function formatTime(s) {
  if (!s && s !== 0) return '0:00'
  s = Math.floor(s)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function parseTimeInput(str) {
  if (!str) return null
  const parts = str.trim().split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

export default function ChapterManager({ recordingId, onClose }) {
  const { chapters, isLoading, addChapter, deleteChapter } = useRecordingChapters(recordingId)
  const [timeInput, setTimeInput] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  const handleAdd = () => {
    const seconds = parseTimeInput(timeInput)
    if (seconds === null || !titleInput.trim()) return
    addChapter.mutate({ start_seconds: seconds, title_ar: titleInput.trim() })
    setTimeInput('')
    setTitleInput('')
    inputRef.current?.focus()
  }

  const handleDelete = (id) => {
    if (confirm('حذف هذا الفصل؟')) deleteChapter.mutate(id)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface-base)', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-amber-400" />
            <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">إدارة الفصول</h3>
            <span className="text-xs text-[var(--text-muted)]">({chapters.length})</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition">
            <X size={16} />
          </button>
        </div>

        {/* Add form */}
        <div className="px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Clock size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                ref={inputRef}
                value={timeInput}
                onChange={e => setTimeInput(e.target.value)}
                placeholder="0:00"
                dir="ltr"
                className="w-20 h-9 pr-7 pl-2 rounded-lg text-xs text-center font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              />
            </div>
            <input
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              placeholder="عنوان الفصل بالعربي"
              className="flex-1 h-9 px-3 rounded-lg text-sm font-['Tajawal'] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            />
            <button
              onClick={handleAdd}
              disabled={!timeInput.trim() || !titleInput.trim() || addChapter.isPending}
              className="h-9 px-3 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-bold font-['Tajawal'] border border-amber-500/30 hover:bg-amber-500/25 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Plus size={13} />
              إضافة
            </button>
          </div>
        </div>

        {/* Chapters list */}
        <div className="max-h-80 overflow-y-auto px-5 py-3 space-y-1.5">
          {isLoading ? (
            <div className="space-y-2 py-4">
              {[0, 1, 2].map(i => <div key={i} className="h-10 rounded-lg bg-[var(--surface-raised)] animate-pulse" />)}
            </div>
          ) : chapters.length === 0 ? (
            <div className="py-8 text-center">
              <BookOpen size={24} className="text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">لا توجد فصول بعد</p>
              <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] mt-1">أضف الوقت والعنوان أعلاه</p>
            </div>
          ) : (
            chapters.map((ch, i) => (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-raised)] transition group"
              >
                <span className="font-mono text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded flex-shrink-0 min-w-[3rem] text-center">
                  {formatTime(ch.start_seconds)}
                </span>
                <span className="text-sm text-[var(--text-primary)] font-['Tajawal'] flex-1">
                  {ch.title_ar}
                </span>
                <button
                  onClick={() => handleDelete(ch.id)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </motion.div>
            ))
          )}
        </div>

        {/* Auto-detect stub */}
        <div className="px-5 py-3 border-t border-white/5">
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-[var(--text-muted)] font-['Tajawal'] border border-dashed border-white/10 opacity-50 cursor-not-allowed"
          >
            <Sparkles size={13} />
            اكتشاف الفصول تلقائياً (قريباً)
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
