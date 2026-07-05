import { useState, useEffect, Suspense } from 'react'
import lazyRetry from '../../utils/lazyRetry'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Search, Edit3, Trash2, Loader2, X, UserPlus, Download, ArrowUpCircle, Briefcase, Copy, Eye, EyeOff, Mail, CheckCircle2, AlertCircle, GraduationCap, UserCog, BarChart3, FlaskConical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS, PACKAGES } from '../../lib/constants'
import { exportToCSV } from '../../utils/exportData'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import { ListSkeleton } from '../../components/ui/PageSkeleton'
import EmptyState from '../../components/ui/EmptyState'
import ImpersonateButton from '../../components/ImpersonateButton'
import UserAvatar from '../../components/common/UserAvatar'
import './adminDashboard.css'
import './adminPeople.css'

const AdminGroups = lazyRetry(() => import('./AdminGroups'))
const AdminTrainers = lazyRetry(() => import('./AdminTrainers'))

const TABS = [
  { key: 'students', label: 'الطلاب', icon: GraduationCap },
  { key: 'groups', label: 'المجموعات', icon: Users },
  { key: 'trainers', label: 'المدربون', icon: UserCog },
  { key: 'emails', label: 'تحديث البيانات', icon: Mail },
]

const STATUS_LABELS = { active: 'نشط', paused: 'متوقف', graduated: 'متخرج', withdrawn: 'منسحب' }
const STATUS_COLORS = { active: '#4ade80', paused: '#fbbf24', graduated: '#7dd3fc', withdrawn: '#f87171' }

/* relative "last seen" — western digits, matching the dashboard convention;
   Arabic plurals: يومين (dual), 3-10 أيام, 11+ يومًا */
function lastSeen(ts) {
  if (!ts) return { text: '—', tone: 'muted' }
  const days = Math.floor((Date.now() - new Date(ts).getTime()) / 86_400_000)
  if (days <= 0) return { text: 'اليوم', tone: 'good' }
  if (days === 1) return { text: 'أمس', tone: 'ok' }
  if (days === 2) return { text: 'منذ يومين', tone: 'ok' }
  if (days <= 10) return { text: `منذ ${days} أيام`, tone: days > 7 ? 'cold' : 'ok' }
  return { text: `منذ ${days} يومًا`, tone: 'cold' }
}
// cold = churn-risk → rose, NOT amber (amber reads as the gold accent and
// breaks the one-gold-datum-per-row contract)
const SEEN_TONES = { good: '#4ade80', ok: 'var(--ds-text-secondary, #cbd5e1)', cold: 'rgba(248,113,113,0.85)', muted: 'var(--ds-text-tertiary, #64748b)' }

/* neutral glass avatar — the roster stays obsidian+gold, no legacy sky/violet */
const AVATAR_GLASS = 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))'

export default function AdminStudents() {
  const [activeTab, setActiveTab] = useState('students')

  // light counts for the tab bar — one head-count each
  const { data: tabCounts } = useQuery({
    queryKey: ['admin-people-tab-counts'],
    queryFn: async () => {
      const [st, gr, tr] = await Promise.all([
        // exclude test accounts so the tab count matches the roster's default view
        supabase.from('students').select('id, profiles!inner(is_test_account)', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'active').eq('profiles.is_test_account', false),
        supabase.from('groups').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['trainer', 'admin']),
      ])
      return { students: st.count || 0, groups: gr.count || 0, trainers: tr.count || 0 }
    },
    staleTime: 60_000,
  })

  return (
    <div className="adx-root">
      {/* shared operations-bridge atmosphere */}
      <div className="adx-atmo" aria-hidden="true">
        <div className="adx-atmo__beam" />
        <div className="adx-atmo__blob adx-atmo__blob--gold" />
        <div className="adx-atmo__blob adx-atmo__blob--steel" />
        <div className="adx-atmo__grain" />
      </div>

      <div className="adx-content space-y-6">
        <div className="adx-eyebrow" style={{ marginBottom: 0 }}>
          <span className="adx-eyebrow__spark" />
          <span className="adx-eyebrow__label">الطلاب والفريق</span>
          <span className="adx-eyebrow__hint">إدارة شؤون الطلاب والمجموعات والمدربين</span>
          <span className="adx-eyebrow__rule" />
        </div>

        <div className="adp-tabs" role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon
            const count = t.key === 'students' ? tabCounts?.students : t.key === 'groups' ? tabCounts?.groups : t.key === 'trainers' ? tabCounts?.trainers : null
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
                className={`adp-tab ${activeTab === t.key ? 'is-active' : ''}`}
              >
                {activeTab === t.key && (
                  <motion.span
                    layoutId="adp-tab-pill"
                    className="adp-tab__pill"
                    style={{ zIndex: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon size={16} strokeWidth={2} />
                <span>{t.label}</span>
                {count != null && <span className="adp-tab__count">{count}</span>}
              </button>
            )
          })}
        </div>

        <Suspense fallback={<div className="skeleton h-96 w-full rounded-[20px]" />}>
          {activeTab === 'students' && <StudentsContent />}
          {activeTab === 'emails' && <BulkEmailUpdate />}
          {activeTab === 'groups' && <AdminGroups embedded />}
          {activeTab === 'trainers' && <AdminTrainers embedded />}
        </Suspense>
      </div>
    </div>
  )
}

function StudentsContent() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [filterStatus, setFilterStatus] = useState('active')
  const [hideTest, setHideTest] = useState(true)
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

  // Students — one fetch, all filtering client-side (the roster is small; filters become instant)
  const { data: students, isLoading } = useQuery({
    queryKey: ['admin-students'],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, academic_level, package, group_id, xp_total, current_streak, status, enrollment_date, custom_price, payment_day, last_active_at, study_mode, profiles(full_name, display_name, email, phone, avatar_url, is_test_account), groups(name, code)')
        .is('deleted_at', null)
        .order('enrollment_date', { ascending: false })
      return data || []
    },
  })

  const base = (students || []).filter(s => !hideTest || !s.profiles?.is_test_account)
  const statusCounts = base.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc }, {})
  const filtered = base.filter(s => {
    if (filterStatus && s.status !== filterStatus) return false
    if (filterGroup && s.group_id !== filterGroup) return false
    if (search) {
      const name = s.profiles?.full_name || s.profiles?.display_name || ''
      const email = s.profiles?.email || ''
      if (!name.includes(search) && !email.includes(search)) return false
    }
    return true
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
      queryClient.invalidateQueries({ queryKey: ['admin-people-tab-counts'] })
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
      { key: (s) => STATUS_LABELS[s.status] || s.status, label: 'الحالة' },
      { key: 'xp_total', label: 'XP' },
      { key: 'current_streak', label: 'السلسلة' },
      { key: (s) => s.last_active_at ? new Date(s.last_active_at).toISOString().slice(0, 10) : '', label: 'آخر دخول' },
    ]
    exportToCSV(filtered, 'students', columns)
  }

  const SEG = [
    { key: '', label: 'الكل', color: '#cbd5e1', count: base.length },
    { key: 'active', label: 'نشط', color: STATUS_COLORS.active, count: statusCounts.active || 0 },
    { key: 'paused', label: 'متوقف', color: STATUS_COLORS.paused, count: statusCounts.paused || 0 },
    { key: 'graduated', label: 'متخرج', color: STATUS_COLORS.graduated, count: statusCounts.graduated || 0 },
    { key: 'withdrawn', label: 'منسحب', color: STATUS_COLORS.withdrawn, count: statusCounts.withdrawn || 0 },
  ]

  return (
    <div className="space-y-5">
      {/* title row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold font-['Tajawal']" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>سجلّ الطلاب</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
            {filtered.length} طالب في العرض الحالي
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="adp-btn-gold">
          <UserPlus size={16} /> إضافة طالب
        </button>
      </div>

      {/* status strip = the filter */}
      <div className="adp-seg" role="group" aria-label="تصفية حسب الحالة">
        {SEG.map((c) => (
          <button
            key={c.key || 'all'}
            onClick={() => setFilterStatus(c.key)}
            className={`adp-seg__chip ${filterStatus === c.key ? 'is-active' : ''}`}
            style={{ '--adp-seg-c': c.color }}
          >
            {c.label}
            <span className="n">{c.count}</span>
          </button>
        ))}
      </div>

      {/* toolbar */}
      <div className="adp-toolbar">
        <div className="adp-search">
          <Search size={15} className="adp-search__icon" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الإيميل…"
          />
        </div>
        <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className="adp-select">
          <option value="">كل المجموعات</option>
          {groups?.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
        </select>
        <button
          onClick={() => setHideTest(v => !v)}
          className={`adp-toggle ${hideTest ? 'is-on' : ''}`}
          title="الحسابات التجريبية مخفية افتراضياً"
        >
          <FlaskConical size={14} />
          {hideTest ? 'التجريبية مخفية' : 'التجريبية ظاهرة'}
        </button>
        <button onClick={handleExportCSV} disabled={!filtered?.length} className="adp-btn-ghost">
          <Download size={15} /> CSV
        </button>
      </div>

      {/* roster — table on ≥640px, cards on phones */}
      {isLoading ? (
        <ListSkeleton />
      ) : (
        <>
        <div className="adp-tablewrap hidden sm:block">
          <div className="scroller">
            <table className="adp-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>المجموعة</th>
                  <th>المستوى</th>
                  <th>الباقة</th>
                  <th>XP</th>
                  <th>آخر دخول</th>
                  {!filterStatus && <th>الحالة</th>}
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const seen = lastSeen(s.last_active_at)
                  const price = s.custom_price || PACKAGES[s.package]?.price
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="adp-who">
                          <UserAvatar user={s.profiles ? { ...s.profiles, id: s.id } : { id: s.id }} size={36} rounded="xl" gradient={AVATAR_GLASS} />
                          <div className="min-w-0">
                            <button
                              onClick={() => navigate(`/admin/student/${s.id}/progress`)}
                              className="adp-who__name"
                              title="فتح ملف التقدّم"
                            >
                              {getStudentName(s)}
                            </button>
                            <div className="adp-who__mail">{s.profiles?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {s.study_mode === 'individual' ? (
                          <span className="adp-code gold"><Briefcase size={11} /> فردي ١:١</span>
                        ) : s.groups?.code ? (
                          <span className="adp-code">{s.groups.code}</span>
                        ) : (
                          <span style={{ color: 'var(--ds-text-tertiary)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div className="text-[13px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>
                          {ACADEMIC_LEVELS[s.academic_level]?.cefr || s.academic_level}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
                          {ACADEMIC_LEVELS[s.academic_level]?.name_ar || ''}
                        </div>
                      </td>
                      <td>
                        <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ds-text-secondary)' }}>
                          {PACKAGES[s.package]?.name_ar || s.package}
                        </div>
                        {price && (
                          <div className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ds-text-tertiary)' }}>
                            {price} ر.س{s.custom_price ? ' · مخصص' : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        {/* the ONE gold datum per row */}
                        <div className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--adx-gold, #fbbf24)' }}>
                          {(s.xp_total || 0).toLocaleString('en-US')}
                        </div>
                        {s.current_streak > 0 && (
                          <div className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>🔥 {s.current_streak} يوم</div>
                        )}
                      </td>
                      <td>
                        <span className="text-xs font-semibold" style={{ color: SEEN_TONES[seen.tone] }}>{seen.text}</span>
                      </td>
                      {!filterStatus && (
                        <td>
                          <span className={`adp-pill adp-pill--${s.status}`}>{STATUS_LABELS[s.status] || s.status}</span>
                        </td>
                      )}
                      <td>
                        <div className="flex items-center gap-1">
                          <ImpersonateButton userId={s.id} role="student" name={getStudentName(s)} />
                          <button
                            onClick={() => navigate(`/admin/student/${s.id}/report`)}
                            className="adp-act gold"
                            title="تقرير النشاط التفصيلي"
                          >
                            <BarChart3 size={14} />
                          </button>
                          <button onClick={() => { setEditStudent(s); setShowForm(true) }} className="adp-act" title="تعديل">
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('هل تريد حذف هذا الطالب؟')) deleteMutation.mutate(s.id)
                            }}
                            className="adp-act danger"
                            title="حذف"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <EmptyState icon={Users} title="لا يوجد طلاب" description="لم يتم العثور على طلاب مطابقين لمعايير البحث" />
            )}
          </div>
        </div>

        {/* phone roster — no sideways-scrolling table on a 390px screen */}
        <div className="sm:hidden space-y-3">
          {filtered.length === 0 && (
            <EmptyState icon={Users} title="لا يوجد طلاب" description="لم يتم العثور على طلاب مطابقين لمعايير البحث" />
          )}
          {filtered.map(s => {
            const seen = lastSeen(s.last_active_at)
            return (
              <div key={s.id} className="adp-mcard">
                <div className="adp-who">
                  <UserAvatar user={s.profiles ? { ...s.profiles, id: s.id } : { id: s.id }} size={40} rounded="xl" gradient={AVATAR_GLASS} />
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => navigate(`/admin/student/${s.id}/progress`)}
                      className="adp-who__name"
                    >
                      {getStudentName(s)}
                    </button>
                    <div className="adp-who__mail">{s.profiles?.email}</div>
                  </div>
                  {!filterStatus && (
                    <span className={`adp-pill adp-pill--${s.status} shrink-0`}>{STATUS_LABELS[s.status] || s.status}</span>
                  )}
                </div>
                <div className="adp-mcard__meta">
                  {s.study_mode === 'individual' ? (
                    <span className="adp-code gold"><Briefcase size={11} /> فردي ١:١</span>
                  ) : s.groups?.code ? (
                    <span className="adp-code">{s.groups.code}</span>
                  ) : null}
                  <span className="adp-code">{ACADEMIC_LEVELS[s.academic_level]?.cefr || s.academic_level}</span>
                  <span className="adp-code" style={{ color: 'var(--adx-gold, #fbbf24)' }}>{(s.xp_total || 0).toLocaleString('en-US')} XP</span>
                  <span className="adp-code" style={{ color: SEEN_TONES[seen.tone] }}>{seen.text}</span>
                </div>
                <div className="adp-mcard__actions">
                  <ImpersonateButton userId={s.id} role="student" name={getStudentName(s)} />
                  <button onClick={() => navigate(`/admin/student/${s.id}/report`)} className="adp-act gold" title="تقرير النشاط">
                    <BarChart3 size={15} />
                  </button>
                  <button onClick={() => { setEditStudent(s); setShowForm(true) }} className="adp-act" title="تعديل">
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => { if (confirm('هل تريد حذف هذا الطالب؟')) deleteMutation.mutate(s.id) }}
                    className="adp-act danger"
                    title="حذف"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        </>
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
            onSuccess={() => {
              setShowAddModal(false)
              queryClient.invalidateQueries({ queryKey: ['admin-students'] })
              queryClient.invalidateQueries({ queryKey: ['admin-people-tab-counts'] })
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function FormSection({ label }) {
  return (
    <div className="adp-formsec">
      <span className="adp-formsec__label">{label}</span>
      <span className="adp-formsec__rule" />
    </div>
  )
}

function EditStudentModal({ student, groups, onClose, onSave, saving, queryClient }) {
  const [fullName, setFullName] = useState(student.profiles?.full_name || '')
  const [phone, setPhone] = useState(student.profiles?.phone || '')
  const [groupId, setGroupId] = useState(student.group_id || '')
  const [academicLevel, setAcademicLevel] = useState(student.academic_level || 1)
  const [pkg, setPkg] = useState(student.package || 'asas')
  const [gender, setGender] = useState(student.gender || 'female')
  const [status, setStatus] = useState(student.status || 'active')
  const [customPrice, setCustomPrice] = useState(student.custom_price || '')
  const [paymentDay, setPaymentDay] = useState(student.payment_day || '')
  const [ieltsWriting, setIeltsWriting] = useState(
    Array.isArray(student.custom_access) && student.custom_access.includes('ielts_writing')
  )
  const [promoting, setPromoting] = useState(false)
  const [promotionMsg, setPromotionMsg] = useState('')
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false)
  const [resettingTier, setResettingTier] = useState(false)

  // Fetch player preference for this student
  const { data: playerPref, refetch: refetchPref } = useQuery({
    queryKey: ['player-pref', student.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_player_preference')
        .select('*')
        .eq('student_id', student.id)
        .maybeSingle()
      return data
    },
    enabled: !!student.id,
  })

  async function handleResetPlayerTier() {
    setResettingTier(true)
    await supabase.from('student_player_preference').upsert({
      student_id: student.id,
      preferred_tier: 1,
      consecutive_tier1_failures: 0,
      updated_at: new Date().toISOString(),
    })
    await refetchPref()
    setResettingTier(false)
  }

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
        gender,
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
        initial={{ scale: 0.96, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 16 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="adp-modal max-w-lg"
      >
        <div className="adp-modal__head">
          <h2 className="adp-modal__title">تعديل بيانات الطالب</h2>
          <button onClick={onClose} className="adp-act" aria-label="إغلاق"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="adp-modal__body space-y-4">
          <FormSection label="البيانات الأساسية" />
          <div>
            <label className="input-label">الاسم الكامل</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">الهاتف</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" dir="ltr" />
            </div>
            <div>
              {/* Grammatical gender — drives the Arabic male/female tone the student sees */}
              <label className="input-label">الجنس (نبرة الخطاب)</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="input-field">
                <option value="female">أنثى</option>
                <option value="male">ذكر</option>
              </select>
            </div>
          </div>

          <FormSection label="الدراسة والمستوى" />
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
                className="adp-btn-ghost text-sm"
              >
                {promoting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpCircle size={16} />}
                ترقية للمستوى التالي
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowOverrideConfirm(true)}
                disabled={promoting || parseInt(academicLevel) >= 5}
                className="adp-btn-ghost text-sm"
                style={{ color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)' }}
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

          <FormSection label="الاشتراك والدفع" />
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">سعر مخصص (ريال)</label>
              <input type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} className="input-field" dir="ltr" placeholder="اختياري" />
            </div>
            <div>
              <label className="input-label">يوم الدفع</label>
              <input type="number" min={1} max={31} value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} className="input-field" dir="ltr" placeholder="1-31" />
            </div>
          </div>

          <FormSection label="الصلاحيات والأدوات" />
          {/* Player Tier Preference */}
          {playerPref && playerPref.preferred_tier > 1 && (
            <div className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ds-text-primary)' }}>مشغل الفيديو</p>
                <p className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
                  المشغل المفضل: Tier {playerPref.preferred_tier} · إخفاقات متتالية: {playerPref.consecutive_tier1_failures}
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetPlayerTier}
                disabled={resettingTier}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{ background: 'rgba(251,191,36,0.1)', color: 'var(--adx-gold, #fbbf24)', border: '1px solid rgba(251,191,36,0.2)' }}
              >
                {resettingTier ? <Loader2 size={12} className="animate-spin" /> : 'أعد ضبط للمشغل الكامل'}
              </button>
            </div>
          )}

          {/* IELTS Writing Access Toggle */}
          {pkg !== 'ielts' && (
            <div className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ds-text-primary)' }}>صلاحية كتابة آيلتس</p>
                <p className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>منح الطالب صلاحية الوصول لتدريبات كتابة آيلتس</p>
              </div>
              <button
                type="button"
                onClick={() => setIeltsWriting(!ieltsWriting)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${ieltsWriting ? 'bg-amber-500' : 'bg-gray-600'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${ieltsWriting ? 'translate-x-0.5' : 'translate-x-[22px]'}`} />
              </button>
            </div>
          )}

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
  const [gender, setGender] = useState('female')
  // Account type: group (default) or individual 1-on-1 with a profession-tailored track
  const [studyMode, setStudyMode] = useState('group')
  const [specializationId, setSpecializationId] = useState('')
  const { data: specializations = [] } = useQuery({
    queryKey: ['specializations-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specializations').select('id, slug, title_ar, title_en')
        .eq('is_active', true).order('sort_order')
      if (error) return []
      return data || []
    },
    staleTime: 5 * 60_000,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdStudent, setCreatedStudent] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const tempPassword = useState(() => generateTempPassword())[0]

  // Ref code attribution
  const [refCode, setRefCode] = useState('')
  const [refCodeValid, setRefCodeValid] = useState(null) // null | true | false
  const [refAffiliateName, setRefAffiliateName] = useState('')
  const [refAffiliateId, setRefAffiliateId] = useState(null)

  useEffect(() => {
    if (!refCode.trim()) {
      setRefCodeValid(null)
      setRefAffiliateName('')
      setRefAffiliateId(null)
      return
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('affiliates')
        .select('id, full_name, status')
        .eq('ref_code', refCode.trim().toUpperCase())
        .maybeSingle()
      if (data?.status === 'approved') {
        setRefCodeValid(true)
        setRefAffiliateName(data.full_name)
        setRefAffiliateId(data.id)
      } else if (data) {
        setRefCodeValid(false)
        setRefAffiliateName(`(${data.status})`)
        setRefAffiliateId(null)
      } else {
        setRefCodeValid(false)
        setRefAffiliateName('')
        setRefAffiliateId(null)
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [refCode])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
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

      // Create student record (individual students carry no group by design)
      await supabase.from('students').upsert({
        id: userId,
        group_id: studyMode === 'individual' ? null : (groupId || null),
        academic_level: parseInt(academicLevel),
        package: pkg,
        gender,
        study_mode: studyMode,
        specialization_id: studyMode === 'individual' ? (specializationId || null) : null,
        status: 'active',
        temp_password: tempPassword,
        enrollment_date: new Date().toISOString(),
      }, { onConflict: 'id' })

      // Manual ref code attribution (takes priority over auto lead-matching)
      const cleanRef = refCode.trim().toUpperCase()
      if (cleanRef && refCodeValid === true && refAffiliateId) {
        try {
          await supabase.from('students').update({
            affiliate_id: refAffiliateId,
            ref_code: cleanRef,
          }).eq('id', userId)

          const { error: convErr } = await supabase.from('affiliate_conversions').insert({
            affiliate_id: refAffiliateId,
            student_id: userId,
            ref_code: cleanRef,
            commission_amount: 100,
            status: 'pending',
          })
          if (convErr && !convErr.message?.includes('duplicate') && !convErr.code?.includes('23505')) {
            console.error('[AddStudent] conversion insert failed (non-fatal):', convErr)
          }
        } catch (linkErr) {
          console.error('[AddStudent] affiliate linking failed (non-fatal):', linkErr)
        }
      } else {
        // Fallback: auto-attribute via lead record
        import('../../utils/affiliateAttribution').then(({ attributeStudent }) => {
          attributeStudent({ studentId: userId, email: email.trim(), phone: phone.trim() || null })
            .then(r => { if (r.attributed) console.log('[Affiliate] Auto-attributed to', r.ref_code) })
            .catch(() => {})
        })
      }

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
        initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="adp-modal max-w-lg"
      >
        <div className="adp-modal__head">
          <h2 className="adp-modal__title">إضافة طالب جديد</h2>
          <button onClick={onClose} className="adp-act" aria-label="إغلاق"><X size={18} /></button>
        </div>

        {createdStudent ? (
          <div className="adp-modal__body space-y-5">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <p className="text-emerald-400 font-medium mb-3">تم إنشاء الحساب بنجاح!</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--ds-text-tertiary)' }}>الاسم</span>
                  <span style={{ color: 'var(--ds-text-primary)' }}>{createdStudent.name}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--ds-text-tertiary)' }}>الإيميل</span>
                  <span style={{ color: 'var(--ds-text-primary)' }} dir="ltr">{createdStudent.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--ds-text-tertiary)' }}>كلمة المرور</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono" style={{ color: 'var(--ds-text-primary)' }} dir="ltr">
                      {showPassword ? createdStudent.password : '••••••••'}
                    </span>
                    <button onClick={() => setShowPassword(!showPassword)} className="adp-act" style={{ width: 26, height: 26 }}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={copyWhatsAppMessage} className="adp-btn-gold text-sm">
                <Copy size={14} /> نسخ رسالة واتساب
              </button>
              <button onClick={onSuccess} className="adp-btn-ghost text-sm">إغلاق</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="adp-modal__body space-y-4">
            <FormSection label="البيانات الأساسية" />
            <div>
              <label className="input-label">الاسم الكامل</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">البريد الإلكتروني</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" dir="ltr" required />
              </div>
              <div>
                <label className="input-label">الهاتف (اختياري)</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" dir="ltr" />
              </div>
            </div>
            <div>
              {/* Grammatical gender — drives the Arabic male/female tone the student sees */}
              <label className="input-label">الجنس (نبرة الخطاب)</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="input-field">
                <option value="female">أنثى</option>
                <option value="male">ذكر</option>
              </select>
            </div>

            <FormSection label="نوع الدراسة" />
            <div>
              <label className="input-label">نوع الحساب</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStudyMode('group')}
                  className="input-field text-sm font-bold"
                  style={studyMode === 'group'
                    ? { borderColor: 'var(--adx-gold, #fbbf24)', color: 'var(--adx-gold, #fbbf24)', background: 'rgba(251,191,36,0.08)' }
                    : { color: 'var(--ds-text-secondary)' }}
                >
                  طالب مجموعات
                </button>
                <button
                  type="button"
                  onClick={() => setStudyMode('individual')}
                  className="input-field text-sm font-bold"
                  style={studyMode === 'individual'
                    ? { borderColor: 'var(--adx-gold, #fbbf24)', color: 'var(--adx-gold, #fbbf24)', background: 'rgba(251,191,36,0.08)' }
                    : { color: 'var(--ds-text-secondary)' }}
                >
                  فردي ١:١ — مسار مهني
                </button>
              </div>
            </div>
            {studyMode === 'individual' && (
              <div>
                <label className="input-label">التخصص المهني</label>
                <select value={specializationId} onChange={(e) => setSpecializationId(e.target.value)} className="input-field" required>
                  <option value="">— اختيار التخصص —</option>
                  {specializations.map(s => <option key={s.id} value={s.id}>{s.title_ar} — {s.title_en}</option>)}
                </select>
                <p className="text-xs mt-1.5" style={{ color: 'var(--ds-text-tertiary)' }}>يحدد التخصصُ المسارَ المهني الذي يظهر للطالب بدل منهج المجموعات</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {studyMode === 'group' && (
                <div>
                  <label className="input-label">المجموعة</label>
                  <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input-field">
                    <option value="">بدون مجموعة</option>
                    {groups?.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
                  </select>
                </div>
              )}
              <div className={studyMode === 'group' ? '' : 'col-span-2'}>
                <label className="input-label">المستوى</label>
                <select value={academicLevel} onChange={(e) => setAcademicLevel(e.target.value)} className="input-field">
                  {Object.entries(ACADEMIC_LEVELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.cefr} — {v.name_ar}</option>
                  ))}
                </select>
              </div>
            </div>

            <FormSection label="الاشتراك" />
            <div>
              <label className="input-label">الباقة</label>
              <select value={pkg} onChange={(e) => setPkg(e.target.value)} className="input-field">
                {Object.entries(PACKAGES).map(([k, v]) => (
                  <option key={k} value={k}>{v.name_ar} — {v.price} ريال</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.14)' }}>
              <p className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>كلمة المرور المؤقتة: <span className="font-mono font-bold" style={{ color: 'var(--adx-gold, #fbbf24)' }} dir="ltr">{tempPassword}</span></p>
              <p className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>سيُطلب من الطالب تغييرها عند أول تسجيل دخول</p>
            </div>
            <div>
              <label className="input-label">
                كود الإحالة <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>(اختياري)</span>
              </label>
              <input
                type="text"
                value={refCode}
                onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                placeholder="مثال: PAR5106"
                className="input-field font-mono"
                dir="ltr"
              />
              {refCode && refCodeValid === true && (
                <p className="text-emerald-400 text-xs mt-1.5">✓ مسوّق: {refAffiliateName}</p>
              )}
              {refCode && refCodeValid === false && (
                <p className="text-red-400 text-xs mt-1.5">✗ كود غير صحيح أو غير معتمد</p>
              )}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="adp-modal__foot flex items-center gap-3">
              <button type="submit" disabled={saving} className="adp-btn-gold text-sm">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                إنشاء الحساب
              </button>
              <button type="button" onClick={onClose} className="adp-btn-ghost text-sm">إلغاء</button>
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
        .select('id, profiles(full_name, display_name, email, is_test_account), groups(code)')
        .is('deleted_at', null)
        .order('enrollment_date', { ascending: false })
      // real students first — editing a demo account's email here has real
      // consequences, so test accounts sink to the bottom, dimmed + chipped
      return (data || []).sort((a, b) => (a.profiles?.is_test_account ? 1 : 0) - (b.profiles?.is_test_account ? 1 : 0))
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
      const { error } = await invokeWithRetry('update-student-email', {
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
    <div className="space-y-5">
      {/* title row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold font-['Tajawal']" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>تحديث بيانات الطلاب</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>تحديث البريد الإلكتروني للطلاب بشكل جماعي</p>
        </div>
        {pendingUpdates.length > 0 && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={updating}
            className="adp-btn-gold text-sm"
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
        <div className="adp-tablewrap">
          <div className="scroller">
            <table className="adp-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>المجموعة</th>
                  <th>الإيميل الحالي</th>
                  <th className="min-w-[280px]">الإيميل الجديد</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {students?.map(s => {
                  const status = getStatus(s.id)
                  const isTest = s.profiles?.is_test_account === true
                  return (
                    <tr key={s.id} style={isTest ? { opacity: 0.5 } : undefined}>
                      <td>
                        <div className="flex items-center gap-2">
                          <p className="text-[13.5px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>
                            {s.profiles?.full_name || s.profiles?.display_name || 'طالب'}
                          </p>
                          {isTest && <span className="adp-code">تجريبي</span>}
                        </div>
                      </td>
                      <td>{s.groups?.code ? <span className="adp-code">{s.groups.code}</span> : <span style={{ color: 'var(--ds-text-tertiary)' }}>—</span>}</td>
                      <td><span className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }} dir="ltr">{s.profiles?.email}</span></td>
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
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="adp-modal max-w-md"
            >
              <div className="adp-modal__body pt-6">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={28} className="text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)' }}>تأكيد تحديث البيانات</h3>
                  <p className="text-sm mt-2" style={{ color: 'var(--ds-text-tertiary)' }}>
                    سيتم تحديث إيميلات {pendingUpdates.length} طلاب — هل أنت متأكد؟
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto mb-6 space-y-2">
                  {pendingUpdates.map(([id, email]) => {
                    const student = students?.find(s => s.id === id)
                    return (
                      <div key={id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: 'var(--ds-text-primary)' }}>{student?.profiles?.full_name || student?.profiles?.display_name}</span>
                        <span style={{ color: 'var(--ds-text-tertiary)' }} dir="ltr">{email}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-3 justify-center pb-2">
                  <button onClick={handleBulkUpdate} className="adp-btn-gold text-sm">
                    تأكيد التحديث
                  </button>
                  <button onClick={() => setShowConfirm(false)} className="adp-btn-ghost text-sm">
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
