import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, Edit3, Loader2, X, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ListSkeleton } from '../../components/ui/PageSkeleton'
import EmptyState from '../../components/ui/EmptyState'
import UserAvatar from '../../components/common/UserAvatar'
import ImpersonateButton from '../../components/ImpersonateButton'
import './adminDashboard.css'
import './adminPeople.css'

/* Arabic count agreement: 1 مجموعة واحدة · 2 مجموعتان · 3-10 مجموعات · 11+ مجموعة */
function groupCountAr(n) {
  if (n === 1) return 'مجموعة واحدة'
  if (n === 2) return 'مجموعتان'
  if (n <= 10) return `${n} مجموعات`
  return `${n} مجموعة`
}
function studentCountAr(n) {
  if (n === 0) return 'بدون طلاب'
  if (n === 1) return 'طالب واحد'
  if (n === 2) return 'طالبان'
  if (n <= 10) return `${n} طلاب`
  return `${n} طالبًا`
}

export default function AdminTrainers({ embedded = false }) {
  const queryClient = useQueryClient()
  const [editTrainer, setEditTrainer] = useState(null)

  // Trainers + their groups + student load in THREE parallel queries
  // (was N+1: one groups query per trainer, and no load numbers at all)
  const { data: trainers, isLoading } = useQuery({
    queryKey: ['admin-trainers'],
    queryFn: async () => {
      const [{ data: staff }, { data: groupRows }, { data: memberRows }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, display_name, email, phone, role, avatar_url, is_test_account')
          .in('role', ['trainer', 'admin'])
          .order('full_name'),
        supabase
          .from('groups')
          .select('id, name, code, trainer_id')
          .eq('is_active', true),
        supabase
          .from('students')
          .select('group_id')
          .eq('status', 'active')
          .is('deleted_at', null)
          .not('group_id', 'is', null),
      ])
      const groupSize = (memberRows || []).reduce((acc, r) => { acc[r.group_id] = (acc[r.group_id] || 0) + 1; return acc }, {})
      const byTrainer = (groupRows || []).reduce((acc, g) => {
        if (!g.trainer_id) return acc
        ;(acc[g.trainer_id] = acc[g.trainer_id] || []).push(g)
        return acc
      }, {})
      return (staff || []).map(t => {
        const groups = byTrainer[t.id] || []
        return { ...t, groups, studentCount: groups.reduce((n, g) => n + (groupSize[g.id] || 0), 0) }
      })
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
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      setEditTrainer(null)
    },
    onError: (err) => {
      console.error('Update trainer error:', err)
    },
  })

  // teaching coaches first (real ones, then test accounts dimmed); admins get
  // their own section — nothing hidden, just ordered
  const coaches = (trainers || []).filter(t => t.role !== 'admin').sort((a, b) => (a.is_test_account ? 1 : 0) - (b.is_test_account ? 1 : 0))
  const admins = (trainers || []).filter(t => t.role === 'admin')

  const renderCard = (t, i) => (
    <motion.div
      key={t.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className="adp-gcard"
      style={{
        '--adp-accent': t.role === 'admin' ? 'rgba(251,191,36,0.55)' : 'rgba(255,255,255,0.25)',
        ...(t.is_test_account ? { opacity: 0.55 } : null),
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar user={t} size={46} rounded="xl" gradient="linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[14.5px] font-bold font-['Tajawal']" style={{ color: 'var(--ds-text-primary)' }}>{t.full_name || t.display_name}</p>
              {t.role === 'admin' && <span className="adp-code gold">مدير</span>}
              {t.is_test_account && <span className="adp-code">تجريبي</span>}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ds-text-tertiary)' }} dir="ltr">{t.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {t.role !== 'admin' && <ImpersonateButton userId={t.id} role="trainer" name={t.full_name || t.display_name} />}
          <button onClick={() => setEditTrainer(t)} className="adp-act" title="تعديل">
            <Edit3 size={15} />
          </button>
        </div>
      </div>

      {/* load line — groups + students this person actually carries */}
      <p className="text-xs mb-2 font-semibold" style={{ color: 'var(--ds-text-secondary)' }}>
        {t.groups.length > 0
          ? <>{groupCountAr(t.groups.length)} · <span style={{ color: t.studentCount > 0 ? 'var(--adx-gold, #fbbf24)' : 'var(--ds-text-tertiary)' }}>{studentCountAr(t.studentCount)}</span></>
          : <span style={{ color: 'var(--ds-text-tertiary)' }}>بدون مجموعات مسندة</span>}
      </p>
      {t.groups?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {t.groups.map(g => (
            <span key={g.id} className="adp-code" title={g.name}>{g.code}</span>
          ))}
        </div>
      )}
      {t.phone && (
        <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: 'var(--ds-text-tertiary)' }}>
          <Phone size={11} /> <span dir="ltr">{t.phone}</span>
        </p>
      )}
    </motion.div>
  )

  const body = (
    <div className="space-y-5">
      {/* title row */}
      <div>
        <h1 className="text-[22px] font-bold font-['Tajawal']" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>المدربون</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>{trainers?.length || 0} في الفريق التعليمي</p>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : trainers?.length === 0 ? (
        <EmptyState icon={Briefcase} title="لا يوجد مدربون" description="لم يتم إضافة أي مدرب بعد" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map(renderCard)}
          </div>
          {admins.length > 0 && (
            <>
              <div className="adx-eyebrow" style={{ marginTop: 28 }}>
                <span className="adx-eyebrow__spark" />
                <span className="adx-eyebrow__label">الإدارة</span>
                <span className="adx-eyebrow__rule" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {admins.map(renderCard)}
              </div>
            </>
          )}
        </>
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

  // standalone route (/admin/trainers) gets its own bridge atmosphere
  if (embedded) return body
  return (
    <div className="adx-root">
      <div className="adx-atmo" aria-hidden="true">
        <div className="adx-atmo__beam" />
        <div className="adx-atmo__blob adx-atmo__blob--gold" />
        <div className="adx-atmo__blob adx-atmo__blob--steel" />
        <div className="adx-atmo__grain" />
      </div>
      <div className="adx-content">{body}</div>
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
        initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="adp-modal max-w-md"
      >
        <div className="adp-modal__head">
          <h2 className="adp-modal__title">تعديل بيانات المدرب</h2>
          <button onClick={onClose} className="adp-act" aria-label="إغلاق"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="adp-modal__body space-y-4">
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
                <label
                  key={g.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors duration-150"
                  style={{
                    background: selectedGroups.includes(g.id) ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selectedGroups.includes(g.id) ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(g.id)}
                    onChange={() => toggleGroup(g.id)}
                  />
                  <span className="text-sm" style={{ color: 'var(--ds-text-primary)' }}>{g.code} — {g.name}</span>
                  {g.trainer_id && g.trainer_id !== trainer.id && (
                    <span className="adp-pill adp-pill--paused ms-auto">مسندة لمدرب آخر</span>
                  )}
                </label>
              ))}
            </div>
          </div>
          <div className="adp-modal__foot flex items-center gap-3">
            <button type="submit" disabled={saving} className="adp-btn-gold text-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />}
              حفظ التعديلات
            </button>
            <button type="button" onClick={onClose} className="adp-btn-ghost text-sm">إلغاء</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
