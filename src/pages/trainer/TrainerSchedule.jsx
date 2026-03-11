import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, Plus, Video, Users, X, Save, Loader2, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getArabicDay, formatTime, formatDateAr } from '../../utils/dateHelpers'

const DAYS_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function TrainerSchedule() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const role = profile?.role
  const isAdmin = role === 'admin'
  const [showForm, setShowForm] = useState(false)

  // Trainer's groups
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups', role],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code, level, schedule, google_meet_link').order('level')
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Upcoming classes
  const { data: classes, isLoading } = useQuery({
    queryKey: ['trainer-classes', role],
    queryFn: async () => {
      let query = supabase
        .from('classes')
        .select('*, groups(name, code)')
        .order('date')
        .order('start_time')
        .limit(30)
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  const today = new Date().toISOString().split('T')[0]
  const upcoming = classes?.filter(c => c.date >= today) || []
  const past = classes?.filter(c => c.date < today) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">الجدول</h1>
          <p className="text-muted text-sm mt-1">إدارة الحصص والمواعيد</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={18} /> حصة جديدة
        </button>
      </div>

      {/* Group Schedules Overview */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-sky-400" />
          <h3 className="font-medium text-white">الجدول الأسبوعي</h3>
        </div>
        {groups?.length > 0 ? (
          <div className="space-y-4">
            {groups.map((g) => {
              const days = g.schedule?.days || []
              return (
                <div key={g.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="badge-blue text-xs">{g.code}</span>
                      <span className="text-sm text-white">{g.name}</span>
                    </div>
                    {g.schedule?.time && (
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Clock size={12} /> {formatTime(g.schedule.time)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {DAYS_ORDER.map((day) => (
                      <span
                        key={day}
                        className={`text-[10px] px-2 py-1 rounded-lg ${
                          days.includes(day)
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'text-muted/30'
                        }`}
                      >
                        {getArabicDay(day).slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-muted text-sm">لا توجد مجموعات</p>
        )}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Upcoming */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-5">
          <h3 className="font-medium text-white mb-4">الحصص القادمة ({upcoming.length})</h3>
          {isLoading ? (
            <div className="space-y-2">{[1, 2].map(i => <div key={i} className="skeleton h-16 w-full" />)}</div>
          ) : upcoming.length > 0 ? (
            <div className="space-y-2">
              {upcoming.map((c) => (
                <div key={c.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">{c.title || c.topic || 'حصة'}</p>
                      <p className="text-xs text-muted mt-1">
                        <span className="badge-blue text-[10px] ml-2">{c.groups?.code}</span>
                        {formatDateAr(c.date)} &middot; {formatTime(c.start_time)}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg ${
                      c.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400'
                      : c.status === 'cancelled' ? 'bg-red-500/10 text-red-400'
                      : 'bg-sky-500/10 text-sky-400'
                    }`}>{c.status === 'completed' ? 'مكتمل' : c.status === 'cancelled' ? 'ملغي' : 'مجدول'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">لا توجد حصص قادمة</p>
          )}
        </motion.div>

        {/* Past */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-5">
          <h3 className="font-medium text-white mb-4">الحصص السابقة ({past.length})</h3>
          {past.length > 0 ? (
            <div className="space-y-2">
              {past.map((c) => (
                <div key={c.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">{c.title || c.topic || 'حصة'}</p>
                      <p className="text-xs text-muted mt-1">
                        <span className="badge-blue text-[10px] ml-2">{c.groups?.code}</span>
                        {formatDateAr(c.date)}
                      </p>
                    </div>
                    {c.recording_url && (
                      <a href={c.recording_url} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
                        <Video size={12} /> تسجيل
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">لا توجد حصص سابقة</p>
          )}
        </motion.div>
      </div>

      {/* New Class Form */}
      <AnimatePresence>
        {showForm && (
          <ClassForm
            groups={groups || []}
            trainerId={profile?.id}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ClassForm({ groups, trainerId, onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    group_id: groups[0]?.id || '',
    title: '',
    topic: '',
    date: '',
    start_time: '20:00',
    end_time: '21:30',
    google_meet_link: '',
  })
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.group_id) throw new Error('اختر المجموعة')
      if (!form.date) throw new Error('حدد التاريخ')
      const { error } = await supabase.from('classes').insert({
        group_id: form.group_id,
        trainer_id: trainerId,
        title: form.title.trim() || null,
        topic: form.topic.trim() || null,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time || null,
        google_meet_link: form.google_meet_link.trim() || null,
        status: 'scheduled',
      }).select()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-classes'] })
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
          <h2 className="text-lg font-bold text-white">حصة جديدة</h2>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">المجموعة</label>
            <select className="input-field" value={form.group_id} onChange={(e) => update('group_id', e.target.value)}>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-1">العنوان</label>
              <input className="input-field" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="اختياري..." />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">الموضوع</label>
              <input className="input-field" value={form.topic} onChange={(e) => update('topic', e.target.value)} placeholder="اختياري..." />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-muted mb-1">التاريخ</label>
              <input type="date" className="input-field" value={form.date} onChange={(e) => update('date', e.target.value)} dir="ltr" />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">البداية</label>
              <input type="time" className="input-field" value={form.start_time} onChange={(e) => update('start_time', e.target.value)} dir="ltr" />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">النهاية</label>
              <input type="time" className="input-field" value={form.end_time} onChange={(e) => update('end_time', e.target.value)} dir="ltr" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">رابط Google Meet</label>
            <input className="input-field" value={form.google_meet_link} onChange={(e) => update('google_meet_link', e.target.value)} placeholder="https://meet.google.com/..." dir="ltr" />
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
            إنشاء الحصة
          </button>
        </div>
      </motion.div>
    </>
  )
}
