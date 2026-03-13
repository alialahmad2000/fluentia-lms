import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, Edit3, Loader2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function AdminTrainers() {
  const queryClient = useQueryClient()
  const [editTrainer, setEditTrainer] = useState(null)

  // Trainers
  const { data: trainers, isLoading } = useQuery({
    queryKey: ['admin-trainers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, display_name, email, phone, role')
        .in('role', ['trainer', 'admin'])
        .order('full_name')

      // Get groups for each trainer
      if (data) {
        for (const t of data) {
          const { data: groups } = await supabase
            .from('groups')
            .select('id, name, code')
            .eq('trainer_id', t.id)
            .eq('is_active', true)
          t.groups = groups || []
        }
      }
      return data || []
    },
  })

  // All groups for assignment
  const { data: allGroups } = useQuery({
    queryKey: ['all-groups'],
    queryFn: async () => {
      const { data } = await supabase.from('groups').select('id, name, code, level, trainer_id').order('level')
      return data || []
    },
  })

  // Update trainer
  const updateMutation = useMutation({
    mutationFn: async ({ trainerId, profileUpdates, groupIds }) => {
      if (profileUpdates) {
        const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', trainerId).select()
        if (error) throw error
      }
      // Update group assignments
      if (groupIds !== undefined) {
        // Remove trainer from all groups first
        const { error: removeErr } = await supabase.from('groups').update({ trainer_id: null }).eq('trainer_id', trainerId).select()
        if (removeErr) throw removeErr
        // Assign to selected groups
        for (const gid of groupIds) {
          const { error: assignErr } = await supabase.from('groups').update({ trainer_id: trainerId }).eq('id', gid).select()
          if (assignErr) throw assignErr
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainers'] })
      queryClient.invalidateQueries({ queryKey: ['all-groups'] })
      setEditTrainer(null)
    },
    onError: (err) => {
      console.error('Update trainer error:', err)
    },
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <Briefcase size={22} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة المدربين</h1>
          <p className="text-muted text-sm mt-1">{trainers?.length || 0} مدرب</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted" size={24} /></div>
      ) : trainers?.length === 0 ? (
        <div className="text-center py-12 text-muted">لا يوجد مدربون</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trainers?.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5 hover:translate-y-[-2px] transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 text-lg font-bold">
                    {(t.display_name || t.full_name || '?')[0]}
                  </div>
                  <div>
                    <p className="text-white font-medium">{t.display_name || t.full_name}</p>
                    <p className="text-xs text-muted">{t.email}</p>
                    {t.role === 'admin' && <span className="badge-gold">مدير</span>}
                  </div>
                </div>
                <button onClick={() => setEditTrainer(t)} className="btn-icon w-8 h-8 text-muted hover:text-sky-400 transition-all duration-200">
                  <Edit3 size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted">المجموعات:</p>
                {t.groups?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {t.groups.map(g => (
                      <span key={g.id} className="badge-blue">{g.code}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">لا توجد مجموعات</p>
                )}
              </div>
              {t.phone && <p className="text-xs text-muted mt-3" dir="ltr">{t.phone}</p>}
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editTrainer && (
          <TrainerEditModal
            trainer={editTrainer}
            allGroups={allGroups}
            onClose={() => setEditTrainer(null)}
            onSave={(updates) => updateMutation.mutate(updates)}
            saving={updateMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TrainerEditModal({ trainer, allGroups, onClose, onSave, saving }) {
  const [fullName, setFullName] = useState(trainer.full_name || '')
  const [phone, setPhone] = useState(trainer.phone || '')
  const [selectedGroups, setSelectedGroups] = useState(trainer.groups?.map(g => g.id) || [])

  function toggleGroup(gid) {
    setSelectedGroups(prev =>
      prev.includes(gid) ? prev.filter(id => id !== gid) : [...prev, gid]
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      trainerId: trainer.id,
      profileUpdates: { full_name: fullName, phone },
      groupIds: selectedGroups,
    })
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
          <h2 className="text-lg font-semibold text-white">تعديل بيانات المدرب</h2>
          <button onClick={onClose} className="btn-icon w-8 h-8 text-muted hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">الاسم</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="input-label">الهاتف</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" dir="ltr" />
          </div>
          <div>
            <label className="input-label mb-2">المجموعات المسندة</label>
            <div className="space-y-2">
              {allGroups?.map(g => (
                <label key={g.id} className="flex items-center gap-3 p-2.5 rounded-xl glass-card cursor-pointer hover:translate-y-[-2px] transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(g.id)}
                    onChange={() => toggleGroup(g.id)}
                  />
                  <span className="text-sm text-white">{g.code} — {g.name}</span>
                  {g.trainer_id && g.trainer_id !== trainer.id && (
                    <span className="badge-yellow mr-auto">(مسند لمدرب آخر)</span>
                  )}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 pt-3">
            <button type="submit" disabled={saving} className="btn-primary text-sm py-2 flex items-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />}
              حفظ التعديلات
            </button>
            <button type="button" onClick={onClose} className="btn-ghost text-sm py-2">إلغاء</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
