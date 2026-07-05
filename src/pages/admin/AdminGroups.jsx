import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Edit3, Loader2, X, Video, UserCog } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS } from '../../lib/constants'
import { ListSkeleton } from '../../components/ui/PageSkeleton'
import EmptyState from '../../components/ui/EmptyState'
import './adminDashboard.css'
import './adminPeople.css'

const DAY_AR = {
  sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء',
  thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت',
}

// level accent for the card's top hairline
const LEVEL_ACCENTS = {
  1: 'rgba(125, 211, 252, 0.55)',
  2: 'rgba(251, 191, 36, 0.55)',
  3: 'rgba(167, 139, 250, 0.55)',
  4: 'rgba(74, 222, 128, 0.55)',
  5: 'rgba(244, 114, 182, 0.55)',
}

export default function AdminGroups({ embedded = false }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editGroup, setEditGroup] = useState(null)

  // Groups + active-student counts in TWO queries (was N+1: one count query per group)
  const { data: groups, isLoading } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: async () => {
      const [{ data: groupRows }, { data: memberRows }] = await Promise.all([
        supabase
          .from('groups')
          // trainer_id now points at the `trainers` extension table (1:1 with
          // profiles) — the old bare profiles:trainer_id embed 400s since that
          // FK repoint, which left the legacy page silently showing 0 groups
          .select('id, name, code, level, max_students, google_meet_link, schedule, is_active, trainer_id, trainer:trainers!groups_trainer_id_fkey(profiles(full_name, display_name))')
          .order('level'),
        supabase
          .from('students')
          .select('group_id')
          .eq('status', 'active')
          .is('deleted_at', null)
          .not('group_id', 'is', null),
      ])
      const counts = (memberRows || []).reduce((acc, r) => { acc[r.group_id] = (acc[r.group_id] || 0) + 1; return acc }, {})
      return (groupRows || [])
        .map(g => ({ ...g, student_count: counts[g.id] || 0 }))
        // live groups first — the disabled ones shouldn't be the tab's first impression
        .sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0) || a.level - b.level)
    },
  })

  // Trainers for assignment — sourced from the `trainers` table so the
  // dropdown can never offer an id the groups.trainer_id FK would reject
  const { data: trainers } = useQuery({
    queryKey: ['all-trainers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('trainers')
        .select('id, is_active, profiles(full_name, display_name)')
        .eq('is_active', true)
      return (data || []).map(t => ({ id: t.id, full_name: t.profiles?.full_name, display_name: t.profiles?.display_name }))
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
      queryClient.invalidateQueries({ queryKey: ['admin-people-tab-counts'] })
      setShowForm(false)
      setEditGroup(null)
    },
    onError: (err) => {
      console.error('Save group error:', err)
    },
  })

  const body = (
    <div className="space-y-5">
      {/* title row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold font-['Tajawal']" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>المجموعات</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>{groups?.length || 0} مجموعة</p>
        </div>
        <button
          onClick={() => { setEditGroup(null); setShowForm(true) }}
          className="adp-btn-gold"
        >
          <Plus size={16} /> مجموعة جديدة
        </button>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : groups?.length === 0 ? (
        <EmptyState icon={Users} title="لا توجد مجموعات" description="لم يتم إنشاء أي مجموعة بعد" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups?.map((g, i) => {
            const max = g.max_students || 7
            const pct = Math.min(100, Math.round((g.student_count / max) * 100))
            const full = g.student_count >= max
            const near = !full && g.student_count >= max - 1
            const meterColor = full ? '#f87171' : near ? '#fbbf24' : 'linear-gradient(to left, #fde68a, #d9a13c)'
            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
                className={`adp-gcard ${!g.is_active ? 'is-muted' : ''}`}
                style={{ '--adp-accent': LEVEL_ACCENTS[g.level] || 'rgba(251,191,36,0.5)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[16px] font-bold font-['Tajawal']" style={{ color: 'var(--ds-text-primary)' }}>{g.name}</h3>
                      <span className="adp-code">{g.code}</span>
                      {!g.is_active && <span className="adp-pill adp-pill--muted">معطلة</span>}
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>
                      {ACADEMIC_LEVELS[g.level]?.cefr || g.level} · {ACADEMIC_LEVELS[g.level]?.name_ar || ''}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditGroup(g); setShowForm(true) }}
                    className="adp-act"
                    title="تعديل المجموعة"
                  >
                    <Edit3 size={15} />
                  </button>
                </div>

                {/* occupancy */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>الإشغال</span>
                    <span className="text-[12px] font-bold tabular-nums" style={{ color: full ? '#f87171' : near ? '#fbbf24' : 'var(--ds-text-primary)' }}>
                      {g.student_count} / {max}
                      {full && ' · مكتملة'}
                      {near && ' · اقتربت من الحد'}
                    </span>
                  </div>
                  <div className="adx-meter">
                    <div className="adx-meter__fill" style={{ width: `${pct}%`, background: meterColor }} />
                  </div>
                </div>

                <div className="adp-gcard__row">
                  <span className="k flex items-center gap-1.5"><UserCog size={13} /> المدرب</span>
                  <span className="v">{g.trainer?.profiles?.full_name || g.trainer?.profiles?.display_name || '—'}</span>
                </div>
                {Array.isArray(g.schedule?.days) && g.schedule.days.length > 0 && (
                  <div className="adp-gcard__row">
                    <span className="k">الأيام</span>
                    <span className="v text-xs">{g.schedule.days.map(d => DAY_AR[String(d).toLowerCase()] || d).join('، ')}</span>
                  </div>
                )}
                {g.google_meet_link && (
                  <div className="mt-auto pt-2">
                    <a
                      href={g.google_meet_link}
                      target="_blank"
                      rel="noreferrer"
                      className="adp-code gold"
                      style={{ display: 'inline-flex' }}
                    >
                      <Video size={12} /> رابط الحصة
                    </a>
                  </div>
                )}
              </motion.div>
            )
          })}
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

  // standalone route (/admin/groups) gets its own bridge atmosphere; inside the
  // hub the parent already renders it
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
        initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="adp-modal max-w-md"
      >
        <div className="adp-modal__head">
          <h2 className="adp-modal__title">{group ? 'تعديل المجموعة' : 'مجموعة جديدة'}</h2>
          <button onClick={onClose} className="adp-act" aria-label="إغلاق"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="adp-modal__body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">اسم المجموعة</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="input-label">الرمز</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} className="input-field" dir="ltr" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
              {trainers?.map(t => <option key={t.id} value={t.id}>{t.full_name || t.display_name}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">رابط Google Meet</label>
            <input value={meetLink} onChange={(e) => setMeetLink(e.target.value)} className="input-field" dir="ltr" placeholder="https://meet.google.com/..." />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} id="is-active" />
            <label htmlFor="is-active" className="text-sm" style={{ color: 'var(--ds-text-primary)' }}>مجموعة نشطة</label>
          </div>
          <div className="adp-modal__foot flex items-center gap-3">
            <button type="submit" disabled={saving} className="adp-btn-gold text-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {group ? 'حفظ التعديلات' : 'إنشاء المجموعة'}
            </button>
            <button type="button" onClick={onClose} className="adp-btn-ghost text-sm">إلغاء</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
