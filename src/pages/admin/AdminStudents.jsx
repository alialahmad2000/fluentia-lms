import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Search, Edit3, Trash2, Loader2, X, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS, PACKAGES, STUDENT_STATUS } from '../../lib/constants'
import { formatDateAr } from '../../utils/dateHelpers'

export default function AdminStudents() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [filterStatus, setFilterStatus] = useState('active')
  const [editStudent, setEditStudent] = useState(null)
  const [showForm, setShowForm] = useState(false)

  // Groups
  const { data: groups } = useQuery({
    queryKey: ['all-groups'],
    queryFn: async () => {
      const { data } = await supabase.from('groups').select('id, name, code, level').order('level')
      return data || []
    },
  })

  // Students
  const { data: students, isLoading } = useQuery({
    queryKey: ['admin-students', filterGroup, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('id, academic_level, package, group_id, xp_total, current_streak, status, enrollment_date, custom_price, payment_day, profiles(full_name, display_name, email, phone), groups(name, code)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (filterGroup) query = query.eq('group_id', filterGroup)
      if (filterStatus) query = query.eq('status', filterStatus)

      const { data } = await query
      return data || []
    },
  })

  const filtered = students?.filter(s => {
    if (!search) return true
    const name = s.profiles?.full_name || s.profiles?.display_name || ''
    const email = s.profiles?.email || ''
    return name.includes(search) || email.includes(search)
  })

  // Update student
  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const { studentId, profileUpdates, studentUpdates } = updates
      if (profileUpdates && Object.keys(profileUpdates).length > 0) {
        const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', studentId).select()
        if (error) throw error
      }
      if (studentUpdates && Object.keys(studentUpdates).length > 0) {
        const { error } = await supabase.from('students').update(studentUpdates).eq('id', studentId).select()
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] })
      setEditStudent(null)
      setShowForm(false)
    },
  })

  // Soft delete
  const deleteMutation = useMutation({
    mutationFn: async (studentId) => {
      const { error } = await supabase.from('students').update({ deleted_at: new Date().toISOString() }).eq('id', studentId).select()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] })
    },
  })

  function getStudentName(s) {
    return s.profiles?.display_name || s.profiles?.full_name || 'طالب'
  }

  const statusColors = {
    active: 'text-emerald-400 bg-emerald-500/10',
    paused: 'text-amber-400 bg-amber-500/10',
    graduated: 'text-sky-400 bg-sky-500/10',
    withdrawn: 'text-red-400 bg-red-500/10',
  }
  const statusLabels = { active: 'نشط', paused: 'متوقف', graduated: 'متخرج', withdrawn: 'منسحب' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة الطلاب</h1>
          <p className="text-muted text-sm mt-1">{filtered?.length || 0} طالب</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الإيميل..."
            className="input-field pr-10 py-2 text-sm"
          />
        </div>
        <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className="input-field py-2 px-3 text-sm w-auto">
          <option value="">كل المجموعات</option>
          {groups?.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field py-2 px-3 text-sm w-auto">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="paused">متوقف</option>
          <option value="graduated">متخرج</option>
          <option value="withdrawn">منسحب</option>
        </select>
      </div>

      {/* Student table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted" size={24} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs border-b border-border-subtle">
                <th className="text-right py-3 px-3">الطالب</th>
                <th className="text-right py-3 px-3">المجموعة</th>
                <th className="text-right py-3 px-3">المستوى</th>
                <th className="text-right py-3 px-3">الباقة</th>
                <th className="text-right py-3 px-3">XP</th>
                <th className="text-right py-3 px-3">الحالة</th>
                <th className="text-right py-3 px-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map(s => (
                <tr key={s.id} className="border-b border-border-subtle/50 hover:bg-white/5">
                  <td className="py-3 px-3">
                    <p className="text-white font-medium">{getStudentName(s)}</p>
                    <p className="text-xs text-muted">{s.profiles?.email}</p>
                  </td>
                  <td className="py-3 px-3 text-muted">{s.groups?.code || '—'}</td>
                  <td className="py-3 px-3 text-muted">{ACADEMIC_LEVELS[s.academic_level]?.cefr || s.academic_level}</td>
                  <td className="py-3 px-3 text-muted">{PACKAGES[s.package]?.name_ar || s.package}</td>
                  <td className="py-3 px-3 text-gold-400 font-medium">{s.xp_total}</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[s.status] || ''}`}>
                      {statusLabels[s.status] || s.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditStudent(s); setShowForm(true) }} className="text-muted hover:text-sky-400 transition-colors">
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('هل تريد حذف هذا الطالب؟')) deleteMutation.mutate(s.id)
                        }}
                        className="text-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered?.length === 0 && (
            <div className="text-center py-12 text-muted">لا يوجد طلاب</div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {showForm && editStudent && (
          <EditStudentModal
            student={editStudent}
            groups={groups}
            onClose={() => { setShowForm(false); setEditStudent(null) }}
            onSave={(updates) => updateMutation.mutate(updates)}
            saving={updateMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function EditStudentModal({ student, groups, onClose, onSave, saving }) {
  const [fullName, setFullName] = useState(student.profiles?.full_name || '')
  const [phone, setPhone] = useState(student.profiles?.phone || '')
  const [groupId, setGroupId] = useState(student.group_id || '')
  const [academicLevel, setAcademicLevel] = useState(student.academic_level || 1)
  const [pkg, setPkg] = useState(student.package || 'asas')
  const [status, setStatus] = useState(student.status || 'active')
  const [customPrice, setCustomPrice] = useState(student.custom_price || '')
  const [paymentDay, setPaymentDay] = useState(student.payment_day || '')

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      studentId: student.id,
      profileUpdates: { full_name: fullName, phone },
      studentUpdates: {
        group_id: groupId || null,
        academic_level: parseInt(academicLevel),
        package: pkg,
        status,
        custom_price: customPrice ? parseInt(customPrice) : null,
        payment_day: paymentDay ? parseInt(paymentDay) : null,
      },
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-navy-950 border border-border-subtle rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">تعديل بيانات الطالب</h2>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">الاسم الكامل</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">الهاتف</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted mb-1">المجموعة</label>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input-field">
                <option value="">بدون مجموعة</option>
                {groups?.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">المستوى</label>
              <select value={academicLevel} onChange={(e) => setAcademicLevel(e.target.value)} className="input-field">
                {Object.entries(ACADEMIC_LEVELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.cefr} — {v.name_ar}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted mb-1">الباقة</label>
              <select value={pkg} onChange={(e) => setPkg(e.target.value)} className="input-field">
                {Object.entries(PACKAGES).map(([k, v]) => (
                  <option key={k} value={k}>{v.name_ar} — {v.price} ريال</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">الحالة</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
                <option value="active">نشط</option>
                <option value="paused">متوقف</option>
                <option value="graduated">متخرج</option>
                <option value="withdrawn">منسحب</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted mb-1">سعر مخصص (ريال)</label>
              <input type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} className="input-field" dir="ltr" placeholder="اختياري" />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">يوم الدفع</label>
              <input type="number" min={1} max={31} value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} className="input-field" dir="ltr" placeholder="1-31" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm py-2 flex items-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />}
              حفظ التعديلات
            </button>
            <button type="button" onClick={onClose} className="btn-secondary text-sm py-2">إلغاء</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
