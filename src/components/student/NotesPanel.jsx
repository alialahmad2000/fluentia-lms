import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

export default function NotesPanel({ unitId, onClose }) {
  const { studentData } = useAuthStore()
  const studentId = studentData?.id
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const saveTimerRef = useRef(null)
  const textareaRef = useRef(null)

  // Fetch notes for this unit
  const { data: notes = [] } = useQuery({
    queryKey: ['student-notes', studentId, unitId],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_notes')
        .select('*')
        .eq('student_id', studentId)
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!studentId && !!unitId,
  })

  // Add note
  const addMutation = useMutation({
    mutationFn: async (content) => {
      const { error } = await supabase.from('student_notes').insert({
        student_id: studentId,
        unit_id: unitId,
        content,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-notes', studentId, unitId] })
      setDraft('')
    },
  })

  // Update note
  const updateMutation = useMutation({
    mutationFn: async ({ id, content }) => {
      const { error } = await supabase.from('student_notes').update({ content, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-notes', studentId, unitId] })
      setEditingId(null)
    },
  })

  // Delete note
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('student_notes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student-notes', studentId, unitId] }),
  })

  // Auto-save draft with debounce
  const saveDraft = useCallback(() => {
    if (!draft.trim()) return
    addMutation.mutate(draft.trim())
  }, [draft, addMutation])

  useEffect(() => {
    if (!draft.trim()) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(saveDraft, 2000)
    return () => clearTimeout(saveTimerRef.current)
  }, [draft])

  // Handle Enter to save immediately
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      clearTimeout(saveTimerRef.current)
      if (draft.trim()) saveDraft()
    }
  }

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'الآن'
    if (mins < 60) return `${mins} د`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} س`
    return `${Math.floor(hours / 24)} ي`
  }

  return (
    <>
      {/* Backdrop (mobile) */}
      <div className="fixed inset-0 z-[41] bg-black/30 lg:hidden" onClick={onClose} />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="fixed z-[42] lg:top-0 lg:right-0 lg:w-[340px] lg:h-full bottom-0 left-0 right-0 lg:left-auto lg:bottom-auto max-h-[60vh] lg:max-h-full rounded-t-2xl lg:rounded-none overflow-hidden"
        style={{
          background: 'var(--surface-raised)',
          borderInlineStart: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(20px)',
        }}
        dir="rtl"
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center py-2 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-default)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="text-sm font-bold font-['Tajawal'] flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>📝</span> ملاحظاتي
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Input */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب ملاحظتك..."
            rows={2}
            className="w-full resize-none rounded-xl px-3 py-2.5 text-sm font-['Tajawal'] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            style={{
              background: 'var(--surface-overlay)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          />
          {draft.trim() && (
            <p className="text-[10px] mt-1 font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
              يُحفظ تلقائياً... أو اضغط Enter
            </p>
          )}
        </div>

        {/* Notes list */}
        <div className="overflow-y-auto px-4 py-3 space-y-2" style={{ maxHeight: 'calc(60vh - 160px)' }}>
          {notes.length === 0 && (
            <p className="text-xs text-center py-6 font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
              لا توجد ملاحظات بعد
            </p>
          )}
          {notes.map((note) => (
            <div
              key={note.id}
              className="group rounded-xl px-3 py-2.5 transition-colors"
              style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)' }}
            >
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full resize-none rounded-lg px-2 py-1.5 text-sm font-['Tajawal'] focus:outline-none"
                    style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateMutation.mutate({ id: note.id, content: editText })}
                      className="text-[11px] px-2 py-1 rounded-lg font-['Tajawal']"
                      style={{ background: 'rgba(56,189,248,0.15)', color: 'var(--accent-sky)' }}
                    >
                      حفظ
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-[11px] px-2 py-1 rounded-lg font-['Tajawal']"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => { setEditingId(note.id); setEditText(note.content) }}
                  className="cursor-pointer"
                >
                  <p className="text-sm font-['Tajawal'] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(note.created_at)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(note.id) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/10"
                    >
                      <Trash2 size={12} className="text-red-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </>
  )
}
