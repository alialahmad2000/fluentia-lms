import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, Plus, Search, Pencil, Trash2, X, Save, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/dateHelpers'
import EmptyState from '../../components/ui/EmptyState'

const NOTE_TYPES = {
  encouragement: { label: 'تشجيع', emoji: '👏', color: 'rgb(52,211,153)', bg: 'rgba(52,211,153,0.1)' },
  observation: { label: 'ملاحظة', emoji: '📝', color: 'rgb(56,189,248)', bg: 'rgba(56,189,248,0.1)' },
  warning: { label: 'تنبيه', emoji: '⚠️', color: 'rgb(251,191,36)', bg: 'rgba(251,191,36,0.1)' },
  reminder: { label: 'تذكير', emoji: '🔔', color: 'rgb(168,85,247)', bg: 'rgba(168,85,247,0.1)' },
}

function groupByDate(notes) {
  const groups = { today: [], yesterday: [], week: [], older: [] }
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart - 86400000)
  const weekStart = new Date(todayStart - 6 * 86400000)

  for (const note of notes) {
    const d = new Date(note.created_at)
    if (d >= todayStart) groups.today.push(note)
    else if (d >= yesterdayStart) groups.yesterday.push(note)
    else if (d >= weekStart) groups.week.push(note)
    else groups.older.push(note)
  }
  return groups
}

export default function MyNotes() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const isAdmin = profile?.role === 'admin'
  const [filterType, setFilterType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingNote, setEditingNote] = useState(null)

  // Fetch trainer's students
  const { data: students = [] } = useQuery({
    queryKey: ['trainer-note-students', profile?.id, isAdmin],
    queryFn: async () => {
      let q = supabase.from('groups').select('id').eq('is_active', true)
      if (!isAdmin) q = q.eq('trainer_id', profile?.id)
      const { data: groups } = await q
      if (!groups?.length) return []
      const { data, error } = await supabase
        .from('students')
        .select('id, profiles!inner(full_name, display_name)')
        .in('group_id', groups.map(g => g.id))
        .eq('status', 'active')
        .is('deleted_at', null)
      if (error) { console.error('[MyNotes] students:', error); return [] }
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['trainer-notes', profile?.id],
    queryFn: async () => {
      let q = supabase.from('trainer_notes')
        .select('*, students:student_id(profiles(full_name, display_name))')
        .order('created_at', { ascending: false })
      if (!isAdmin) q = q.eq('trainer_id', profile?.id)
      const { data, error } = await q
      if (error) { console.error('[MyNotes] notes:', error); return [] }
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Filter + search
  const filtered = notes.filter(n => {
    if (filterType !== 'all' && n.note_type !== filterType) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const name = (n.students?.profiles?.full_name || n.students?.profiles?.display_name || '').toLowerCase()
      return name.includes(q) || n.content.toLowerCase().includes(q)
    }
    return true
  })

  const grouped = groupByDate(filtered)

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (noteId) => {
      const { error } = await supabase.from('trainer_notes').delete().eq('id', noteId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainer-notes'] }),
  })

  const DATE_LABELS = { today: 'اليوم', yesterday: 'أمس', week: 'هذا الأسبوع', older: 'سابقاً' }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center ring-1 ring-violet-500/20">
              <StickyNote size={20} className="text-violet-400" />
            </div>
            <h1 className="text-page-title">ملاحظاتي</h1>
          </div>
          <button
            onClick={() => { setEditingNote(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--accent-sky)', color: '#fff' }}
          >
            <Plus size={16} />
            أضف ملاحظة
          </button>
        </div>
      </motion.div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="بحث في الملاحظات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pr-10 w-full"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[{ key: 'all', label: 'الكل' }, ...Object.entries(NOTE_TYPES).map(([k, v]) => ({ key: k, label: v.label }))].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                filterType === tab.key
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-muted hover:text-[var(--text-primary)] hover:bg-[var(--surface-base)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 skeleton rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="لا توجد ملاحظات"
          description="أضف ملاحظة عن طالب لتظهر هنا"
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([key, items]) => {
            if (items.length === 0) return null
            return (
              <div key={key}>
                <h3 className="text-xs font-bold mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  {DATE_LABELS[key]}
                </h3>
                <div className="space-y-3">
                  {items.map((note, i) => {
                    const type = NOTE_TYPES[note.note_type] || NOTE_TYPES.observation
                    const name = note.students?.profiles?.full_name || note.students?.profiles?.display_name || 'طالب'
                    return (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="rounded-2xl p-5"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl mt-0.5">{type.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{name}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: type.bg, color: type.color }}>{type.label}</span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{note.content}</p>
                            <div className="flex items-center gap-4 mt-3">
                              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(note.created_at)}</span>
                              <button
                                onClick={() => { setEditingNote(note); setShowModal(true) }}
                                className="text-[11px] flex items-center gap-1 transition-colors hover:text-sky-400"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                <Pencil size={12} /> تعديل
                              </button>
                              <button
                                onClick={() => { if (confirm('حذف هذه الملاحظة؟')) deleteMutation.mutate(note.id) }}
                                className="text-[11px] flex items-center gap-1 transition-colors hover:text-red-400"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                <Trash2 size={12} /> حذف
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <NoteModal
            students={students}
            editingNote={editingNote}
            trainerId={profile?.id}
            onClose={() => { setShowModal(false); setEditingNote(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function NoteModal({ students, editingNote, trainerId, onClose }) {
  const queryClient = useQueryClient()
  const [studentId, setStudentId] = useState(editingNote?.student_id || '')
  const [noteType, setNoteType] = useState(editingNote?.note_type || 'observation')
  const [content, setContent] = useState(editingNote?.content || '')
  const [error, setError] = useState('')

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error('اختر الطالب')
      if (!content.trim()) throw new Error('اكتب الملاحظة')

      if (editingNote) {
        const { error } = await supabase.from('trainer_notes')
          .update({ student_id: studentId, note_type: noteType, content: content.trim(), updated_at: new Date().toISOString() })
          .eq('id', editingNote.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('trainer_notes')
          .insert({ trainer_id: trainerId, student_id: studentId, note_type: noteType, content: content.trim() })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-notes'] })
      onClose()
    },
    onError: (err) => setError(err.message),
  })

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 z-40" />
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
        className="fixed inset-x-4 top-[10vh] lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-lg border rounded-2xl z-50 flex flex-col"
        style={{ background: 'var(--surface-overlay)', borderColor: 'var(--border-default)', maxHeight: '80vh' }}
      >
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {editingNote ? 'تعديل ملاحظة' : 'ملاحظة جديدة'}
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Student */}
          <div>
            <label className="input-label">الطالب</label>
            <select className="input-field w-full" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">اختر الطالب...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.profiles?.full_name || s.profiles?.display_name}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="input-label">النوع</label>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(NOTE_TYPES).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setNoteType(key)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                    noteType === key ? 'border-sky-500/30' : 'border-transparent'
                  }`}
                  style={{
                    background: noteType === key ? val.bg : 'rgba(255,255,255,0.03)',
                    color: noteType === key ? val.color : 'var(--text-secondary)',
                  }}
                >
                  {val.emoji} {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="input-label">الملاحظة</label>
            <textarea
              className="input-field min-h-[120px] resize-y w-full"
              placeholder="اكتب ملاحظتك هنا..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 text-center">{error}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm py-2">إلغاء</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn-primary text-sm py-2 flex items-center gap-2"
          >
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            حفظ
          </button>
        </div>
      </motion.div>
    </>
  )
}
