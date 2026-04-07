import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, Send, Trash2, Loader2, ThumbsUp, AlertTriangle, Eye } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { formatDateAr } from '../../utils/dateHelpers'

const NOTE_TYPES = [
  { type: 'encouragement', label: 'تشجيع', icon: '👏', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { type: 'observation', label: 'ملاحظة', icon: '👁️', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
  { type: 'warning', label: 'تنبيه', icon: '⚠️', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
]

export default function TrainerQuickNotes() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const role = profile?.role
  const isAdmin = role === 'admin'
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [noteType, setNoteType] = useState('observation')
  const [noteText, setNoteText] = useState('')

  // Groups
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups', role],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code').order('level')
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Auto-select first group
  useEffect(() => {
    if (groups?.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].id)
    }
  }, [groups, selectedGroup])

  // Students in group
  const { data: students } = useQuery({
    queryKey: ['group-students', selectedGroup],
    queryFn: async () => {
      if (!selectedGroup) return []
      const { data, error } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name)')
        .eq('group_id', selectedGroup)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('enrollment_date')
      if (error) console.error('[QuickNotes] Students query error:', error)
      return data || []
    },
    enabled: !!selectedGroup,
  })

  // Notes for selected student
  const { data: studentNotes } = useQuery({
    queryKey: ['student-notes', selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent) return []
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, type, created_at')
        .eq('user_id', selectedStudent.id)
        .in('type', ['trainer_encouragement', 'trainer_observation', 'trainer_warning'])
        .order('created_at', { ascending: false })
        .limit(20)
      return data || []
    },
    enabled: !!selectedStudent?.id,
  })

  function getStudentName(s) {
    return s.profiles?.full_name || s.profiles?.display_name || 'طالب'
  }

  // Send note
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent || !noteText.trim()) throw new Error('يرجى اختيار طالب وكتابة ملاحظة')
      const typeConfig = NOTE_TYPES.find(n => n.type === noteType)
      const { error } = await supabase.from('notifications').insert({
        user_id: selectedStudent.id,
        title: `${typeConfig?.icon} ${typeConfig?.label} من المدرب`,
        body: noteText.trim(),
        type: `trainer_${noteType}`,
      }).select()
      if (error) throw error
    },
    onSuccess: () => {
      setNoteText('')
      queryClient.invalidateQueries({ queryKey: ['student-notes', selectedStudent?.id] })
    },
    onError: (err) => {
      console.error('[QuickNotes] Send error:', err)
    },
  })

  // Delete note
  const deleteMutation = useMutation({
    mutationFn: async (noteId) => {
      const { error } = await supabase.from('notifications').delete().eq('id', noteId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-notes', selectedStudent?.id] })
    },
    onError: (err) => {
      console.error('[QuickNotes] Delete error:', err)
    },
  })

  function getNoteTypeConfig(type) {
    const key = type?.replace('trainer_', '')
    return NOTE_TYPES.find(n => n.type === key) || NOTE_TYPES[1]
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <StickyNote size={20} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-page-title">ملاحظات سريعة</h1>
          <p className="text-muted text-sm mt-1">اكتب ملاحظات قصيرة عن الطلاب</p>
        </div>
      </div>

      {/* Group selector */}
      {groups?.length > 1 && (
        <select
          value={selectedGroup}
          onChange={(e) => { setSelectedGroup(e.target.value); setSelectedStudent(null) }}
          className="input-field py-2 px-3 text-sm w-auto"
        >
          {groups.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
        </select>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student list */}
        <div className="space-y-2">
          <p className="text-sm text-muted">اختر طالب</p>
          {students?.map((s, i) => {
            const name = getStudentName(s)
            const isSelected = selectedStudent?.id === s.id
            return (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedStudent(isSelected ? null : s)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-500/30 ring-2 ring-sky-500/20'
                    : 'bg-[var(--surface-raised)] border-border-subtle hover:bg-[var(--sidebar-hover-bg)]'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold">
                  {name?.[0] || '?'}
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">{name}</span>
              </motion.button>
            )
          })}
          {!students?.length && (
            <div className="fl-card-static p-8 text-center">
              <p className="text-muted">لا يوجد طلاب</p>
            </div>
          )}
        </div>

        {/* Note form + history */}
        <AnimatePresence>
          {selectedStudent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              {/* Note form */}
              <div className="fl-card-static p-7 space-y-4">
                <p className="text-sm text-[var(--text-primary)]">
                  ملاحظة عن{' '}
                  <span className="text-sky-400 font-bold">{getStudentName(selectedStudent)}</span>
                </p>

                {/* Type selector */}
                <div className="flex gap-2">
                  {NOTE_TYPES.map(t => (
                    <button
                      key={t.type}
                      onClick={() => setNoteType(t.type)}
                      className={`flex-1 p-2 rounded-xl text-center border transition-all text-sm ${
                        noteType === t.type ? t.bg : 'bg-[var(--surface-raised)] border-border-subtle'
                      }`}
                    >
                      <span className="text-lg">{t.icon}</span>
                      <p className={`text-xs mt-1 ${noteType === t.type ? t.color : 'text-muted'}`}>{t.label}</p>
                    </button>
                  ))}
                </div>

                {/* Text */}
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="اكتب ملاحظتك هنا..."
                  rows={3}
                  className="input-field resize-none"
                />

                {/* Send */}
                <button
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending || !noteText.trim()}
                  className="btn-primary text-sm py-2 flex items-center gap-2"
                >
                  {sendMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  إرسال الملاحظة
                </button>
              </div>

              {/* Note history */}
              <div className="space-y-2">
                <p className="text-sm text-muted">الملاحظات السابقة</p>
                {studentNotes?.length === 0 && (
                  <p className="text-xs text-muted">لا توجد ملاحظات بعد</p>
                )}
                {studentNotes?.map(note => {
                  const config = getNoteTypeConfig(note.type)
                  return (
                    <div key={note.id} className={`p-3 rounded-xl border ${config.bg}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`text-xs font-medium ${config.color}`}>
                            {config.icon} {config.label}
                          </p>
                          <p className="text-sm text-[var(--text-primary)] mt-1">{note.body}</p>
                          <p className="text-xs text-muted mt-1">{formatDateAr(note.created_at)}</p>
                        </div>
                        <button
                          onClick={() => deleteMutation.mutate(note.id)}
                          className="text-muted hover:text-red-400 transition-colors shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
