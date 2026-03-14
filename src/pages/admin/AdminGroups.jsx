import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Edit3, Loader2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS } from '../../lib/constants'

export default function AdminGroups() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editGroup, setEditGroup] = useState(null)

  // Groups with student count
  const { data: groups, isLoading } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: async () => {
      const { data } = await supabase
        .from('groups')
        .select('id, name, code, level, max_students, google_meet_link, schedule, is_active, trainer_id, profiles:trainer_id(full_name, display_name)')
        .order('level')
      // Get student counts
      if (data) {
        for (const g of data) {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', g.id)
            .eq('status', 'active')
            .is('deleted_at', null)
          g.student_count = count || 0
        }
      }
      return data || []
    },
  })

  // Trainers for assignment
  const { data: trainers } = useQuery({
    queryKey: ['all-trainers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .in('role', ['trainer', 'admin'])
        .order('full_name')
      return data || []
    },
  })

  // Save group
  const saveMutation = useMutation({
    mutationFn: async (groupData) => {
      if (groupData.id) {
        const { id, ...updates } = groupData
        const { error } = await supabase.from('groups').update(updates).eq('id', id).select()
        if (error) throw error
      } else {
        const { error } = await supabase.from('groups').insert(groupData).select()
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      setShowForm(false)
      setEditGroup(null)
    },
    onError: (err) => {
      console.error('Save group error:', err)
    },
  })

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Users size={22} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-page-title text-white">إدارة المجموعات</h1>
            <p className="text-muted text-sm mt-1">{groups?.length || 0} مجموعة</p>
          </div>
        </div>
        <button
          onClick={() => { setEditGroup(null); setShowForm(true) }}
          className="btn-primary text-sm py-2 flex items-center gap-2"
        >
          <Plus size={16} /> مجموعة جديدة
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted" size={24} /></div>
      ) : groups?.length === 0 ? (
        <div className="text-center py-12 text-muted">لا توجد مجموعات</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups?.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card p-7 hover:translate-y-[-2px] transition-all duration-200 ${!g.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>{g.name}</h3>
                  <p className="text-sm text-gradient">{g.code}</p>
                </div>
                <button
                  onClick={() => { setEditGroup(g); setShowForm(true) }}
                  className="btn-icon w-8 h-8 text-muted hover:text-sky-400 transition-all duration-200"
                >
                  <Edit3 size={16} />
                </button>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">المستوى</span>
                  <span className="text-white">{ACADEMIC_LEVELS[g.level]?.cefr || g.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">الطلاب</span>
                  <span className="text-white">{g.student_count}/{g.max_students}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">المدرب</span>
                  <span className="text-white">{g.profiles?.display_name || g.profiles?.full_name || '—'}</span>
                </div>
                {g.schedule && (
                  <div className="flex justify-between">
                    <span className="text-muted">الأيام</span>
                    <span className="text-white text-xs">{Array.isArray(g.schedule?.days) ? g.schedule.days.join('، ') : '—'}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted">الحالة</span>
                  <span className={g.is_active ? 'badge-green' : 'badge-red'}>
                    {g.is_active ? 'نشطة' : 'معطلة'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Group Form Modal */}
      <AnimatePresence>
        {showForm && (
          <GroupFormModal
            group={editGroup}
            trainers={trainers}
            onClose={() => { setShowForm(false); setEditGroup(null) }}
            onSave={(data) => saveMutation.mutate(data)}
            saving={saveMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function GroupFormModal({ group, trainers, onClose, onSave, saving }) {
  const [name, setName] = useState(group?.name || '')
  const [code, setCode] = useState(group?.code || '')
  const [level, setLevel] = useState(group?.level || 1)
  const [trainerId, setTrainerId] = useState(group?.trainer_id || '')
  const [maxStudents, setMaxStudents] = useState(group?.max_students || 7)
  const [meetLink, setMeetLink] = useState(group?.google_meet_link || '')
  const [isActive, setIsActive] = useState(group?.is_active ?? true)

  function handleSubmit(e) {
    e.preventDefault()
    const data = {
      name, code, level: parseInt(level),
      trainer_id: trainerId || null,
      max_students: parseInt(maxStudents),
      google_meet_link: meetLink || null,
      is_active: isActive,
    }
    if (group?.id) data.id = group.id
    onSave(data)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-card-raised p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>{group ? 'تعديل المجموعة' : 'مجموعة جديدة'}</h2>
          <button onClick={onClose} className="btn-icon w-8 h-8 text-muted hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="input-label">اسم المجموعة</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="input-label">الرمز</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} className="input-field" dir="ltr" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="input-label">المستوى</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="input-field">
                {Object.entries(ACADEMIC_LEVELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.cefr} — {v.name_ar}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">الحد الأقصى</label>
              <input type="number" min={1} max={20} value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} className="input-field" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="input-label">المدرب</label>
            <select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} className="input-field">
              <option value="">بدون مدرب</option>
              {trainers?.map(t => <option key={t.id} value={t.id}>{t.display_name || t.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">رابط Google Meet</label>
            <input value={meetLink} onChange={(e) => setMeetLink(e.target.value)} className="input-field" dir="ltr" placeholder="https://meet.google.com/..." />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} id="is-active" />
            <label htmlFor="is-active" className="text-sm text-white">مجموعة نشطة</label>
          </div>
          <div className="flex items-center gap-3 pt-3">
            <button type="submit" disabled={saving} className="btn-primary text-sm py-2 flex items-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {group ? 'حفظ التعديلات' : 'إنشاء المجموعة'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost text-sm py-2">إلغاء</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
