import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Bookmark, FileText, Trash2, Pencil, Plus, Check, X, Clock,
} from 'lucide-react'
import { useRecordingChapters } from '../../hooks/useRecordingChapters'
import { useRecordingBookmarks } from '../../hooks/useRecordingBookmarks'
import { useRecordingNotes } from '../../hooks/useRecordingNotes'

function formatTime(s) {
  if (!s && s !== 0) return '0:00'
  s = Math.floor(s)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
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

const TABS = [
  { id: 'chapters', label: 'الفصول', icon: BookOpen },
  { id: 'bookmarks', label: 'علاماتي', icon: Bookmark },
  { id: 'notes', label: 'ملاحظاتي', icon: FileText },
]

export default function RecordingPanel({
  recordingId,
  currentTime,
  onSeek,
  onClose,
  activeTab: initialTab = 'chapters',
  autoAddNote = false,
}) {
  const [tab, setTab] = useState(initialTab)

  // Sync when parent changes the initial tab
  useEffect(() => { setTab(initialTab) }, [initialTab])

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="
        fixed sm:relative inset-0 sm:inset-auto
        sm:w-96 sm:h-full sm:flex-shrink-0
        bg-slate-900/95 backdrop-blur-xl
        sm:border-r border-white/10
        flex flex-col z-30
        sm:rounded-l-2xl
      "
      dir="rtl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex gap-1">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold font-['Tajawal'] transition-all ${
                  tab === t.id
                    ? 'text-sky-400 bg-sky-500/10 border-b-2 border-sky-400'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition sm:hidden"
        >
          <X size={16} />
        </button>
      </div>

      <div className="border-b border-white/10" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {tab === 'chapters' && (
          <ChaptersTab recordingId={recordingId} currentTime={currentTime} onSeek={onSeek} />
        )}
        {tab === 'bookmarks' && (
          <BookmarksTab recordingId={recordingId} currentTime={currentTime} onSeek={onSeek} />
        )}
        {tab === 'notes' && (
          <NotesTab recordingId={recordingId} currentTime={currentTime} onSeek={onSeek} autoAdd={autoAddNote} />
        )}
      </div>
    </motion.div>
  )
}

// ─── Chapters Tab ──────────────────────────────────────
function ChaptersTab({ recordingId, currentTime, onSeek }) {
  const { chapters, isLoading } = useRecordingChapters(recordingId)

  if (isLoading) return <PanelSkeleton />

  if (chapters.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        text="لا توجد فصول لهذا التسجيل"
        sub="سيضيفها المدرب قريباً"
      />
    )
  }

  // Find current chapter
  const currentChapter = [...chapters].reverse().find(c => currentTime >= c.start_seconds)

  return (
    <div className="space-y-1">
      {chapters.map(ch => {
        const isCurrent = currentChapter?.id === ch.id
        return (
          <button
            key={ch.id}
            onClick={() => onSeek(ch.start_seconds)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-all ${
              isCurrent ? 'bg-sky-500/15 ring-1 ring-sky-500/30' : 'hover:bg-white/5'
            }`}
          >
            <span className="font-mono text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded flex-shrink-0">
              {formatTime(ch.start_seconds)}
            </span>
            <span className={`text-sm font-['Tajawal'] flex-1 ${isCurrent ? 'text-sky-400 font-bold' : 'text-white/80'}`}>
              {ch.title_ar}
            </span>
            {isCurrent && (
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse flex-shrink-0" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Bookmarks Tab ─────────────────────────────────────
function BookmarksTab({ recordingId, currentTime, onSeek }) {
  const { bookmarks, isLoading, addBookmark, deleteBookmark } = useRecordingBookmarks(recordingId)
  const [showAdd, setShowAdd] = useState(false)
  const [label, setLabel] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (showAdd && inputRef.current) inputRef.current.focus()
  }, [showAdd])

  const handleAdd = () => {
    addBookmark.mutate({ position_seconds: Math.floor(currentTime), label: label.trim() || null })
    setLabel('')
    setShowAdd(false)
  }

  const handleDelete = (id) => {
    if (confirm('حذف هذه العلامة؟')) deleteBookmark.mutate(id)
  }

  if (isLoading) return <PanelSkeleton />

  return (
    <div className="space-y-2">
      {/* Add button */}
      {showAdd ? (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5">
          <span className="font-mono text-xs text-sky-400 bg-sky-400/10 px-2 py-1 rounded flex-shrink-0">
            {formatTime(currentTime)}
          </span>
          <input
            ref={inputRef}
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="ملاحظة (اختياري)"
            className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/30 outline-none font-['Tajawal']"
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setShowAdd(false); setLabel('') }
            }}
          />
          <button onClick={handleAdd} className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/10 transition">
            <Check size={14} />
          </button>
          <button onClick={() => { setShowAdd(false); setLabel('') }} className="p-1.5 rounded-lg text-white/40 hover:bg-white/10 transition">
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-white/10 text-sky-400 text-xs font-bold font-['Tajawal'] hover:bg-sky-500/5 transition"
        >
          <Plus size={13} />
          إضافة علامة عند {formatTime(currentTime)}
        </button>
      )}

      {bookmarks.length === 0 && !showAdd ? (
        <EmptyState
          icon={Bookmark}
          text="لا توجد علامات بعد"
          sub="اضغط B أثناء المشاهدة لإضافة علامة"
        />
      ) : (
        bookmarks.map(bm => (
          <div
            key={bm.id}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition group"
          >
            <button onClick={() => onSeek(bm.position_seconds)} className="flex items-center gap-3 flex-1 text-right">
              <span className="font-mono text-xs text-sky-400 bg-sky-400/10 px-2 py-1 rounded flex-shrink-0">
                {formatTime(bm.position_seconds)}
              </span>
              <span className="text-sm text-white/70 font-['Tajawal'] flex-1">
                {bm.label || 'علامة مرجعية'}
              </span>
            </button>
            <button
              onClick={() => handleDelete(bm.id)}
              className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Notes Tab ─────────────────────────────────────────
function NotesTab({ recordingId, currentTime, onSeek, autoAdd }) {
  const { notes, isLoading, addNote, updateNote, deleteNote } = useRecordingNotes(recordingId)
  const [showAdd, setShowAdd] = useState(autoAdd)
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const inputRef = useRef(null)
  const editRef = useRef(null)

  useEffect(() => {
    if (showAdd && inputRef.current) inputRef.current.focus()
  }, [showAdd])

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus()
  }, [editingId])

  // Auto-add mode from keyboard shortcut N
  useEffect(() => {
    if (autoAdd) setShowAdd(true)
  }, [autoAdd])

  const handleAdd = () => {
    if (!content.trim()) return
    addNote.mutate({ position_seconds: Math.floor(currentTime), content: content.trim() })
    setContent('')
    setShowAdd(false)
  }

  const handleUpdate = (id) => {
    if (!editContent.trim()) return
    updateNote.mutate({ id, content: editContent.trim() })
    setEditingId(null)
    setEditContent('')
  }

  const handleDelete = (id) => {
    if (confirm('حذف هذه الملاحظة؟')) deleteNote.mutate(id)
  }

  if (isLoading) return <PanelSkeleton />

  return (
    <div className="space-y-2">
      {/* Add note */}
      {showAdd ? (
        <div className="p-3 rounded-xl bg-white/5 space-y-2">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-amber-400" />
            <span className="font-mono text-xs text-amber-400">{formatTime(currentTime)}</span>
          </div>
          <textarea
            ref={inputRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="اكتب ملاحظتك هنا..."
            rows={2}
            className="w-full bg-transparent text-sm text-white/90 placeholder:text-white/30 outline-none resize-none font-['Tajawal']"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() }
              if (e.key === 'Escape') { setShowAdd(false); setContent('') }
            }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowAdd(false); setContent('') }} className="px-3 py-1 rounded-lg text-xs text-white/40 hover:bg-white/10 transition font-['Tajawal']">
              إلغاء
            </button>
            <button onClick={handleAdd} disabled={!content.trim()} className="px-3 py-1 rounded-lg text-xs bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition font-['Tajawal'] disabled:opacity-30">
              حفظ
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-white/10 text-sky-400 text-xs font-bold font-['Tajawal'] hover:bg-sky-500/5 transition"
        >
          <Plus size={13} />
          إضافة ملاحظة عند {formatTime(currentTime)}
        </button>
      )}

      {notes.length === 0 && !showAdd ? (
        <EmptyState
          icon={FileText}
          text="لا توجد ملاحظات بعد"
          sub="اضغط N أثناء المشاهدة لإضافة ملاحظة"
        />
      ) : (
        notes.map(note => (
          <div
            key={note.id}
            className="p-3 rounded-xl hover:bg-white/5 transition group space-y-1.5"
          >
            {editingId === note.id ? (
              <div className="space-y-2">
                <textarea
                  ref={editRef}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={2}
                  className="w-full bg-transparent text-sm text-white/90 outline-none resize-none font-['Tajawal']"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUpdate(note.id) }
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="px-2 py-1 rounded text-xs text-white/40 font-['Tajawal']">إلغاء</button>
                  <button onClick={() => handleUpdate(note.id)} className="px-2 py-1 rounded text-xs bg-sky-500/20 text-sky-400 font-['Tajawal']">حفظ</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onSeek(note.position_seconds)}
                    className="font-mono text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded hover:bg-amber-400/20 transition"
                  >
                    {formatTime(note.position_seconds)}
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => { setEditingId(note.id); setEditContent(note.content) }}
                      className="p-1 rounded text-white/30 hover:text-sky-400 hover:bg-sky-500/10 transition"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                <p
                  className="text-sm text-white/70 font-['Tajawal'] cursor-pointer"
                  onClick={() => onSeek(note.position_seconds)}
                >
                  {note.content}
                </p>
              </>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ─── Shared ────────────────────────────────────────────
function EmptyState({ icon: Icon, text, sub }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center">
        <Icon size={20} className="text-white/20" />
      </div>
      <div className="text-center">
        <p className="text-sm text-white/40 font-['Tajawal']">{text}</p>
        {sub && <p className="text-xs text-white/25 font-['Tajawal'] mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="space-y-3 py-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
      ))}
    </div>
  )
}
