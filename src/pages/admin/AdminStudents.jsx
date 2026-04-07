import { useState, lazy, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Search, Edit3, Trash2, Loader2, X, UserPlus, Download, ArrowUpCircle, Briefcase, Copy, Eye, EyeOff, Mail, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS, PACKAGES, STUDENT_STATUS } from '../../lib/constants'
import { formatDateAr } from '../../utils/dateHelpers'
import { exportToCSV } from '../../utils/exportData'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import SubTabs from '../../components/common/SubTabs'
import { ListSkeleton } from '../../components/ui/PageSkeleton'
import EmptyState from '../../components/ui/EmptyState'
import ImpersonateButton from '../../components/ImpersonateButton'

const AdminGroups = lazy(() => import('./AdminGroups'))
const AdminTrainers = lazy(() => import('./AdminTrainers'))

const TABS = [
  { key: 'students', label: 'الطلاب', icon: Users },
  { key: 'emails', label: 'تحديث البيانات', icon: Mail },
  { key: 'groups', label: 'المجموعات', icon: Users },
  { key: 'trainers', label: 'المدربين', icon: Briefcase },
]

export default function AdminStudents() {
  const [activeTab, setActiveTab] = useState('students')
  return (
    <div className="space-y-8">
      <SubTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} accent="gold" />
      <Suspense fallback={<div className="skeleton h-96 w-full" />}>
        {activeTab === 'students' && <StudentsContent />}
        {activeTab === 'emails' && <BulkEmailUpdate />}
        {activeTab === 'groups' && <AdminGroups />}
        {activeTab === 'trainers' && <AdminTrainers />}
      </Suspense>
    </div>
  )
}

function StudentsContent() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [filterStatus, setFilterStatus] = useState('active')
  const [editStudent, setEditStudent] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

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
        .order('enrollment_date', { ascending: false })

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
    onError: (err) => {
      console.error('Update student error:', err)
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
    onError: (err) => {
      console.error('Delete student error:', err)
    },
  })

  function getStudentName(s) {
    return s.profiles?.full_name || s.profiles?.display_name || 'طالب'
  }

  function handleExportCSV() {
    if (!filtered?.length) return
    const columns = [
      { key: (s) => s.profiles?.full_name || s.profiles?.display_name || '', label: 'الاسم' },
      { key: (s) => s.profiles?.email || '', label: 'البريد' },
      { key: (s) => ACADEMIC_LEVELS[s.academic_level]?.cefr || s.academic_level, label: 'المستوى' },
      { key: (s) => s.groups?.code || '', label: 'المجموعة' },
      { key: (s) => PACKAGES[s.package]?.name_ar || s.package, label: 'الباقة' },
      { key: (s) => s.custom_price || PACKAGES[s.package]?.price || '', label: 'السعر' },
      { key: (s) => statusLabels[s.status] || s.status, label: 'الحالة' },
      { key: 'xp_total', label: 'XP' },
      { key: 'current_streak', label: 'السلسلة' },
    ]
    exportToCSV(filtered, 'students', columns)
  }

  const statusBadge = {
    active: 'badge-green',
    paused: 'badge-yellow',
    graduated: 'badge-blue',
    withdrawn: 'badge-red',
  }
  const statusLabels = { active: 'نشط', paused: 'متوقف', graduated: 'متخرج', withdrawn: 'منسحب' }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Users size={22} className="text-sky-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-page-title" style={{ color: 'var(--text-primary)' }}>إدارة الطلاب</h1>
            <p className="text-muted text-sm mt-1">{filtered?.length || 0} طالب</p>
          </div>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm py-2 flex items-center gap-2">
          <UserPlus size={16} /> إضافة طالب
        </button>
      </div>

      {/* Filters */}
      <div className="fl-card-static p-7">
        <div className="flex items-center gap-4 flex-wrap">
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
          <button
            onClick={handleExportCSV}
            disabled={!filtered?.length}
            className="btn-secondary text-sm py-2 flex items-center gap-2 whitespace-nowrap"
          >
            <Download size={16} /> تصدير CSV
          </button>
        </div>
      </div>

      {/* Student table */}
      {isLoading ? (
        <ListSkeleton />
      ) : (
        <div className="fl-card-static overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-right">الطالب</th>
                  <th className="text-right">المجموعة</th>
                  <th className="text-right">المستوى</th>
                  <th className="text-right">الباقة</th>
                  <th className="text-right">XP</th>
                  <th className="text-right">الحالة</th>
                  <th className="text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map(s => (
                  <tr key={s.id}>
                    <td>
                      <p className="text-[var(--text-primary)] font-medium">{getStudentName(s)}</p>
                      <p className="text-xs text-muted">{s.profiles?.email}</p>
                    </td>
                    <td className="text-muted">{s.groups?.code || '—'}</td>
                    <td className="text-muted">{ACADEMIC_LEVELS[s.academic_level]?.cefr || s.academic_level}</td>
                    <td className="text-muted">{PACKAGES[s.package]?.name_ar || s.package}</td>
                    <td className="text-gold-400 font-medium">{s.xp_total}</td>
                    <td>
                      <span className={statusBadge[s.status] || 'badge-muted'}>
                        {statusLabels[s.status] || s.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <ImpersonateButton userId={s.id} role="student" name={getStudentName(s)} />
                        <button onClick={() => { setEditStudent(s); setShowForm(true) }} className="btn-icon w-8 h-8 text-muted hover:text-sky-400 transition-all duration-200">
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('هل تريد حذف هذا الطالب؟')) deleteMutation.mutate(s.id)
                          }}
                          className="btn-icon w-8 h-8 text-muted hover:text-red-400 transition-all duration-200"
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
              <EmptyState icon={Users} title="لا يوجد طلاب" description="لم يتم العثور على طلاب مطابقين لمعايير البحث" />
            )}
          </div>
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
            queryClient={queryClient}
          />
        )}
      </AnimatePresence>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddStudentModal
            groups={groups}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => { setShowAddModal(false); queryClient.invalidateQueries({ queryKey: ['admin-students'] }) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function EditStudentModal({ student, groups, onClose, onSave, saving, queryClient }) {
  const [fullName, setFullName] = useState(student.profiles?.full_name || '')
  const [phone, setPhone] = useState(student.profiles?.phone || '')
  const [groupId, setGroupId] = useState(student.group_id || '')
  const [academicLevel, setAcademicLevel] = useState(student.academic_level || 1)
  const [pkg, setPkg] = useState(student.package || 'asas')
  const [status, setStatus] = useState(student.status || 'active')
  const [customPrice, setCustomPrice] = useState(student.custom_price || '')
  const [paymentDay, setPaymentDay] = useState(student.payment_day || '')
  const [ieltsWriting, setIeltsWriting] = useState(
    Array.isArray(student.custom_access) && student.custom_access.includes('ielts_writing')
  )
  const [promoting, setPromoting] = useState(false)
  const [promotionMsg, setPromotionMsg] = useState('')
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false)

  // Fetch exit test status for current level
  const { data: exitStatus } = useQuery({
    queryKey: ['exit-status', student.id, academicLevel],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_level_exit_status')
        .select('*')
        .eq('student_id', student.id)
        .eq('level_number', parseInt(academicLevel))
        .maybeSingle()
      return data
    },
    enabled: !!student.id,
  })

  async function handlePromoteLevel() {
    const currentLevel = parseInt(academicLevel)
    if (currentLevel >= 5) {
      setPromotionMsg('الطالب في أعلى مستوى بالفعل')
      return
    }
    setPromoting(true)
    setPromotionMsg('')
    try {
      const newLevel = currentLevel + 1
      const newLevelInfo = ACADEMIC_LEVELS[newLevel]

      // Update student academic_level
      const { error: updateErr } = await supabase
        .from('students')
        .update({ academic_level: newLevel })
        .eq('id', student.id)
      if (updateErr) throw updateErr

      // Create notification for the student
      await supabase.from('notifications').insert({
        user_id: student.id,
        type: 'level_up',
        title: 'ترقية مستوى',
        body: `تمت ترقيتك إلى المستوى ${newLevelInfo?.cefr} — ${newLevelInfo?.name_ar}`,
      })

      // Create activity_feed entry
      await supabase.from('activity_feed').insert({
        student_id: student.id,
        group_id: student.group_id,
        type: 'level_up',
        title: 'ترقية مستوى',
        description: `ترقية إلى المستوى ${newLevelInfo?.cefr}`,
        data: { xp_earned: 100 },
      })

      // Award XP via xp_transactions — trigger auto-increments students.xp_total
      await supabase.from('xp_transactions').insert({
        student_id: student.id,
        amount: 100,
        reason: 'achievement',
        description: `ترقية إلى المستوى ${newLevelInfo?.cefr}`,
      })

      setAcademicLevel(newLevel)
      setPromotionMsg(`تمت الترقية إلى ${newLevelInfo?.cefr} — ${newLevelInfo?.name_ar} بنجاح`)
      queryClient?.invalidateQueries({ queryKey: ['admin-students'] })
    } catch (err) {
      setPromotionMsg('حدث خطأ أثناء الترقية')
      console.error(err)
    } finally {
      setPromoting(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    // Build custom_access array
    const customAccess = []
    if (ieltsWriting) customAccess.push('ielts_writing')

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
        custom_access: customAccess.length > 0 ? customAccess : null,
      },
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg fl-card-static p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-section-title" style={{ color: 'var(--text-primary)' }}>تعديل بيانات الطالب</h2>
          <button onClick={onClose} className="btn-icon w-8 h-8 text-muted hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">الاسم الكامل</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="input-label">الهاتف</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="input-label">المجموعة</label>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input-field">
                <option value="">بدون مجموعة</option>
                {groups?.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">المستوى</label>
              <select value={academicLevel} onChange={(e) => setAcademicLevel(e.target.value)} className="input-field">
                {Object.entries(ACADEMIC_LEVELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.cefr} — {v.name_ar}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Exit Test Status + Level Promotion */}
          {exitStatus && (
            <div className={`flex items-center gap-2 py-2 px-3 rounded-xl text-sm ${exitStatus.has_passed ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              {exitStatus.has_passed ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-emerald-400 font-medium">اجتاز اختبار نهاية المستوى ({exitStatus.best_score}%)</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} className="text-red-400" />
                  <span className="text-red-400 font-medium">لم يجتاز الاختبار بعد</span>
                  {exitStatus.total_attempts > 0 && (
                    <span className="text-red-400/60 text-xs">({exitStatus.total_attempts} محاولات)</span>
                  )}
                </>
              )}
            </div>
          )}
          <div className="flex items-center gap-3">
            {exitStatus?.has_passed ? (
              <button
                type="button"
                onClick={handlePromoteLevel}
                disabled={promoting || parseInt(academicLevel) >= 5}
                className="btn-secondary text-sm py-2 flex items-center gap-2 whitespace-nowrap"
              >
                {promoting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpCircle size={16} />}
                ترقية للمستوى التالي
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowOverrideConfirm(true)}
                disabled={promoting || parseInt(academicLevel) >= 5}
                className="btn-secondary text-sm py-2 flex items-center gap-2 whitespace-nowrap text-amber-400 border-amber-500/30"
              >
                {promoting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpCircle size={16} />}
                ترقية يدوياً (تخطي الشرط)
              </button>
            )}
            {promotionMsg && (
              <span className={`text-xs ${promotionMsg.includes('بنجاح') ? 'text-emerald-400' : promotionMsg.includes('خطأ') ? 'text-red-400' : 'text-amber-400'}`}>
                {promotionMsg}
              </span>
            )}
          </div>

          {/* Manual override confirmation */}
          <AnimatePresence>
            {showOverrideConfirm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <p className="text-amber-400 text-sm font-medium mb-2">تحذير: الطالب لم يجتاز اختبار نهاية المستوى</p>
                  <p className="text-amber-400/70 text-xs mb-3">هل أنت متأكد من ترقية الطالب بدون اجتياز الاختبار؟</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowOverrideConfirm(false); handlePromoteLevel() }}
                      className="btn-primary text-xs py-1.5 px-3 bg-amber-600 hover:bg-amber-500"
                    >
                      تأكيد الترقية
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOverrideConfirm(false)}
                      className="btn-ghost text-xs py-1.5"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="input-label">الباقة</label>
              <select value={pkg} onChange={(e) => setPkg(e.target.value)} className="input-field">
                {Object.entries(PACKAGES).map(([k, v]) => (
                  <option key={k} value={k}>{v.name_ar} — {v.price} ريال</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">الحالة</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
                <option value="active">نشط</option>
                <option value="paused">متوقف</option>
                <option value="graduated">متخرج</option>
                <option value="withdrawn">منسحب</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="input-label">سعر مخصص (ريال)</label>
              <input type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} className="input-field" dir="ltr" placeholder="اختياري" />
            </div>
            <div>
              <label className="input-label">يوم الدفع</label>
              <input type="number" min={1} max={31} value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} className="input-field" dir="ltr" placeholder="1-31" />
            </div>
          </div>

          {/* IELTS Writing Access Toggle */}
          {pkg !== 'ielts' && (
            <div className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>صلاحية كتابة آيلتس</p>
                <p className="text-xs text-muted">منح الطالب صلاحية الوصول لتدريبات كتابة آيلتس</p>
              </div>
              <button
                type="button"
                onClick={() => setIeltsWriting(!ieltsWriting)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${ieltsWriting ? 'bg-sky-500' : 'bg-gray-600'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${ieltsWriting ? 'translate-x-0.5' : 'translate-x-[22px]'}`} />
              </button>
            </div>
          )}

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

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
}

function AddStudentModal({ groups, onClose, onSuccess }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [groupId, setGroupId] = useState(groups?.[0]?.id || '')
  const [academicLevel, setAcademicLevel] = useState(1)
  const [pkg, setPkg] = useState('asas')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdStudent, setCreatedStudent] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const tempPassword = useState(() => generateTempPassword())[0]

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      // Create auth user via Supabase admin API (using service role through edge function would be ideal,
      // but for now we use signUp - the admin will need to verify)
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password: tempPassword,
        options: { data: { full_name: fullName.trim() } },
      })
      if (authErr) throw authErr
      const userId = authData.user?.id
      if (!userId) throw new Error('فشل إنشاء الحساب')

      // Create profile
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        role: 'student',
        must_change_password: true,
      }, { onConflict: 'id' })

      // Create student record
      await supabase.from('students').upsert({
        id: userId,
        group_id: groupId || null,
        academic_level: parseInt(academicLevel),
        package: pkg,
        status: 'active',
        temp_password: tempPassword,
        enrollment_date: new Date().toISOString(),
      }, { onConflict: 'id' })

      setCreatedStudent({ email: email.trim(), password: tempPassword, name: fullName.trim() })
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء إنشاء الحساب')
    } finally {
      setSaving(false)
    }
  }

  function copyWhatsAppMessage() {
    const msg = `مرحباً ${createdStudent.name}! 🎓\n\nتم إنشاء حسابك في أكاديمية طلاقة:\n\n📧 الإيميل: ${createdStudent.email}\n🔑 كلمة المرور: ${createdStudent.password}\n\n🔗 رابط الدخول: https://fluentia-lms.vercel.app/login\n\nسيُطلب منك تغيير كلمة المرور عند أول تسجيل دخول.`
    navigator.clipboard.writeText(msg)
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
        className="w-full max-w-lg fl-card-static p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-section-title" style={{ color: 'var(--text-primary)' }}>إضافة طالب جديد</h2>
          <button onClick={onClose} className="btn-icon w-8 h-8 text-muted hover:text-white"><X size={20} /></button>
        </div>

        {createdStudent ? (
          <div className="space-y-5">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <p className="text-emerald-400 font-medium mb-3">تم إنشاء الحساب بنجاح!</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">الاسم</span>
                  <span style={{ color: 'var(--text-primary)' }}>{createdStudent.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">الإيميل</span>
                  <span style={{ color: 'var(--text-primary)' }} dir="ltr">{createdStudent.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">كلمة المرور</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono" style={{ color: 'var(--text-primary)' }} dir="ltr">
                      {showPassword ? createdStudent.password : '••••••••'}
                    </span>
                    <button onClick={() => setShowPassword(!showPassword)} className="text-muted hover:text-sky-400">
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={copyWhatsAppMessage} className="btn-primary text-sm py-2 flex items-center gap-2">
                <Copy size={14} /> نسخ رسالة واتساب
              </button>
              <button onClick={onSuccess} className="btn-ghost text-sm py-2">إغلاق</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">الاسم الكامل</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="input-label">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" dir="ltr" required />
            </div>
            <div>
              <label className="input-label">الهاتف (اختياري)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">المجموعة</label>
                <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input-field">
                  <option value="">بدون مجموعة</option>
                  {groups?.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">المستوى</label>
                <select value={academicLevel} onChange={(e) => setAcademicLevel(e.target.value)} className="input-field">
                  {Object.entries(ACADEMIC_LEVELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.cefr} — {v.name_ar}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="input-label">الباقة</label>
              <select value={pkg} onChange={(e) => setPkg(e.target.value)} className="input-field">
                {Object.entries(PACKAGES).map(([k, v]) => (
                  <option key={k} value={k}>{v.name_ar} — {v.price} ريال</option>
                ))}
              </select>
            </div>
            <div className="fl-card-static p-3">
              <p className="text-xs text-muted">كلمة المرور المؤقتة: <span className="font-mono text-sky-400" dir="ltr">{tempPassword}</span></p>
              <p className="text-xs text-muted mt-1">سيُطلب من الطالب تغييرها عند أول تسجيل دخول</p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary text-sm py-2 flex items-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                إنشاء الحساب
              </button>
              <button type="button" onClick={onClose} className="btn-ghost text-sm py-2">إلغاء</button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Bulk Email Update Tab ─────────────────────────────────
function BulkEmailUpdate() {
  const queryClient = useQueryClient()
  const [emailMap, setEmailMap] = useState({})
  const [updating, setUpdating] = useState(false)
  const [results, setResults] = useState({})
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: students, isLoading } = useQuery({
    queryKey: ['admin-students-emails'],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name, email), groups(code)')
        .is('deleted_at', null)
        .order('enrollment_date', { ascending: false })
      return data || []
    },
  })

  function setNewEmail(studentId, email) {
    setEmailMap(prev => ({ ...prev, [studentId]: email }))
  }

  const pendingUpdates = Object.entries(emailMap).filter(([, email]) => email?.trim())

  async function handleBulkUpdate() {
    setShowConfirm(false)
    setUpdating(true)
    const newResults = {}

    for (const [studentId, newEmail] of pendingUpdates) {
      const { data, error } = await invokeWithRetry('update-student-email', {
        body: { student_id: studentId, new_email: newEmail.trim() },
      })

      if (error) {
        newResults[studentId] = { success: false, error }
      } else {
        newResults[studentId] = { success: true }
      }
    }

    setResults(newResults)
    setUpdating(false)
    queryClient.invalidateQueries({ queryKey: ['admin-students-emails'] })
    queryClient.invalidateQueries({ queryKey: ['admin-students'] })
  }

  const getStatus = (id) => {
    if (results[id]?.success) return 'success'
    if (results[id]?.error) return 'error'
    return null
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Mail size={22} className="text-violet-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-page-title" style={{ color: 'var(--text-primary)' }}>تحديث بيانات الطلاب</h1>
            <p className="text-muted text-sm mt-1">تحديث البريد الإلكتروني للطلاب بشكل جماعي</p>
          </div>
        </div>
        {pendingUpdates.length > 0 && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={updating}
            className="btn-primary text-sm py-2.5 px-5 flex items-center gap-2"
          >
            {updating ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            تحديث الكل ({pendingUpdates.length})
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <ListSkeleton />
      ) : (
        <div className="fl-card-static overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-right">الطالب</th>
                  <th className="text-right">المجموعة</th>
                  <th className="text-right">الإيميل الحالي</th>
                  <th className="text-right min-w-[280px]">الإيميل الجديد</th>
                  <th className="text-right">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {students?.map(s => {
                  const status = getStatus(s.id)
                  return (
                    <tr key={s.id}>
                      <td>
                        <p className="text-[var(--text-primary)] font-medium">
                          {s.profiles?.full_name || s.profiles?.display_name || 'طالب'}
                        </p>
                      </td>
                      <td className="text-muted">{s.groups?.code || '—'}</td>
                      <td className="text-muted text-sm" dir="ltr">{s.profiles?.email}</td>
                      <td>
                        <input
                          type="email"
                          dir="ltr"
                          placeholder="new@email.com"
                          value={emailMap[s.id] || ''}
                          onChange={(e) => setNewEmail(s.id, e.target.value)}
                          disabled={updating}
                          className="input-field text-sm py-1.5"
                        />
                      </td>
                      <td>
                        {status === 'success' && (
                          <span className="flex items-center gap-1 text-emerald-400 text-sm">
                            <CheckCircle2 size={14} /> تم
                          </span>
                        )}
                        {status === 'error' && (
                          <span className="flex items-center gap-1 text-red-400 text-sm" title={results[s.id]?.error}>
                            <AlertCircle size={14} /> فشل
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {students?.length === 0 && (
              <EmptyState icon={Users} title="لا يوجد طلاب" description="لم يتم العثور على طلاب" />
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md fl-card-static p-6"
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={28} className="text-amber-400" />
                </div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>تأكيد تحديث البيانات</h3>
                <p className="text-muted text-sm mt-2">
                  سيتم تحديث إيميلات {pendingUpdates.length} طلاب — هل أنت متأكد؟
                </p>
              </div>
              <div className="max-h-48 overflow-y-auto mb-6 space-y-2">
                {pendingUpdates.map(([id, email]) => {
                  const student = students?.find(s => s.id === id)
                  return (
                    <div key={id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg" style={{ background: 'var(--surface-raised)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{student?.profiles?.full_name || student?.profiles?.display_name}</span>
                      <span className="text-muted" dir="ltr">{email}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-3 justify-center">
                <button onClick={handleBulkUpdate} className="btn-primary text-sm py-2.5 px-6">
                  تأكيد التحديث
                </button>
                <button onClick={() => setShowConfirm(false)} className="btn-ghost text-sm py-2.5">
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
