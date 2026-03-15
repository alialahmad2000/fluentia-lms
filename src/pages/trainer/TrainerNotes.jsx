import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Plus, X, Save, Loader2, Pin } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { formatDateAr, timeAgo } from '../../utils/dateHelpers'

export default function TrainerNotes() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const role = profile?.role
  const isAdmin = role === 'admin'
  const [showForm, setShowForm] = useState(false)
  const [filterGroup, setFilterGroup] = useState('all')

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

  // Classes with notes
  const { data: classes, isLoading } = useQuery({
    queryKey: ['trainer-classes-with-notes', filterGroup, role],
    queryFn: async () => {
      let query = supabase
        .from('classes')
        .select('id, title, topic, date, start_time, groups(name, code), class_notes(id, content, is_pinned, is_trainer_summary, created_at, author_id, profiles:author_id(full_name))')
        .order('date', { ascending: false })
        .limit(20)
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      if (filterGroup !== 'all') query = query.eq('group_id', filterGroup)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <FileText size={20} strokeWidth={1.5} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-page-title">ملاحظات الحصص</h1>
            <p className="text-muted text-sm mt-1">ملخصات وملاحظات بعد كل حصة</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={18} /> ملاحظة جديدة
        </button>
      </div>

      {/* Group filter */}
      {groups?.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-muted text-sm">المجموعة:</span>
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="input-field py-2 px-3 text-sm"
          >
            <option value="all">الكل</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.code})</option>)}
          </select>
        </div>
      )}

      {/* Classes & Notes */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-24 w-full" />)}</div>
      ) : classes?.length === 0 ? (
        <div className="fl-card-static p-8 text-center">
          <FileText size={32} className="text-muted mx-auto mb-2" />
          <p className="text-muted">لا توجد حصص — أنشئ حصة من صفحة الجدول أولاً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="fl-card p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">{c.title || c.topic || 'حصة'}</h3>
                  <p className="text-xs text-muted mt-0.5">
                    <span className="badge-blue text-xs ml-2">{c.groups?.code}</span>
                    {formatDateAr(c.date)}
                  </p>
                </div>
              </div>

              {c.class_notes?.length > 0 ? (
                <div className="space-y-2">
                  {c.class_notes.map((note) => (
                    <div
                      key={note.id}
                      className={`rounded-xl p-3 ${note.is_pinned ? 'border border-gold-500/20' : ''}`}
                      style={{ background: 'var(--surface-raised)' }}
                    >
                      <div className="flex items-start gap-2">
                        {note.is_pinned && <Pin size={12} className="text-gold-400 mt-1 shrink-0" />}
                        <div className="flex-1">
                          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{note.content}</p>
                          <p className="text-xs text-muted mt-2">
                            {note.profiles?.full_name} &middot; {timeAgo(note.created_at)}
                            {note.is_trainer_summary && <span className="text-sky-400 mr-2">ملخص المدرب</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">لا توجد ملاحظات لهذه الحصة</p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Note Form */}
      <AnimatePresence>
        {showForm && (
          <NoteForm
            classes={classes || []}
            groups={groups || []}
            trainerId={profile?.id}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function NoteForm({ classes, groups, trainerId, onClose }) {
  const queryClient = useQueryClient()
  const [classId, setClassId] = useState(classes[0]?.id || '')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [isSummary, setIsSummary] = useState(true)
  const [error, setError] = useState('')

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!classId) throw new Error('اختر الحصة')
      if (!content.trim()) throw new Error('اكتب الملاحظة')
      const { error } = await supabase.from('class_notes').insert({
        class_id: classId,
        author_id: trainerId,
        content: content.trim(),
        is_pinned: isPinned,
        is_trainer_summary: isSummary,
      }).select()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-classes-with-notes'] })
      onClose()
    },
    onError: (err) => setError(err.message || 'حصل خطأ'),
  })

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 z-40" />
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
        className="fixed inset-x-4 top-[10vh] lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-lg bg-navy-950 border border-border-subtle rounded-2xl z-50 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">ملاحظة جديدة</h2>
          <button onClick={onClose} className="text-muted hover:text-[var(--text-primary)]"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="input-label">الحصة</label>
            <select className="input-field" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">اختر الحصة...</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.groups?.code} — {c.title || c.topic || 'حصة'} ({formatDateAr(c.date)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">المحتوى</label>
            <textarea
              className="input-field min-h-[150px] resize-y"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="ملخص الحصة، النقاط المهمة، الواجبات..."
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
              <input type="checkbox" checked={isSummary} onChange={(e) => setIsSummary(e.target.checked)} className="accent-sky-500" />
              ملخص المدرب
            </label>
            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
              <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="accent-gold-500" />
              تثبيت
            </label>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 text-center">{error}</div>}
        </div>
        <div className="px-6 py-4 border-t border-border-subtle flex justify-end">
          <button
            type="button"
            onClick={() => { setError(''); saveMutation.mutate() }}
            disabled={saveMutation.isPending}
            className="btn-primary text-sm py-2 flex items-center gap-2"
          >
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            حفظ الملاحظة
          </button>
        </div>
      </motion.div>
    </>
  )
}
