import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Flame, Calendar, FileText, BarChart3, ChevronLeft, CheckCircle2, XCircle,
  AlertCircle, TrendingUp, TrendingDown, Minus, CreditCard, Brain, Sparkles,
  Loader2, BookOpen, PenLine, Mic, Target, Filter, MessageSquare, Award,
} from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Legend, ResponsiveContainer, Tooltip,
} from 'recharts'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import { formatDateAr } from '../../utils/dateHelpers'
import StudentAIProfile from '../../components/ai/StudentAIProfile'

// ─── Constants ─────────────────────────────────────────────

const STATUS_LABELS = {
  present: { label: 'حاضر', color: 'text-emerald-400', bg: 'bg-emerald-400', icon: CheckCircle2 },
  absent: { label: 'غائب', color: 'text-red-400', bg: 'bg-red-400', icon: XCircle },
  excused: { label: 'معذور', color: 'text-amber-400', bg: 'bg-amber-400', icon: AlertCircle },
}

const XP_REASON_LABELS = {
  class_attendance: 'حضور حصة',
  assignment_on_time: 'واجب في الوقت',
  assignment_late: 'واجب متأخر',
  correct_answer: 'إجابة صحيحة',
  helped_peer: 'مساعدة زميل',
  shared_summary: 'مشاركة ملخص',
  streak_bonus: 'مكافأة سلسلة',
  achievement: 'إنجاز',
  voice_note_bonus: 'مشاركة صوتية',
  writing_bonus: 'مشاركة كتابية',
  early_bird: 'حضور مبكر',
  daily_challenge: 'تحدي يومي',
  custom: 'مخصص',
  penalty_absent: 'غياب',
  penalty_unknown_word: 'كلمة غير معروفة',
  penalty_pronunciation: 'نطق خاطئ',
}

const TYPE_LABELS = {
  reading: { label: 'قراءة', icon: BookOpen, color: 'text-sky-400' },
  writing: { label: 'كتابة', icon: PenLine, color: 'text-violet-400' },
  speaking: { label: 'محادثة', icon: Mic, color: 'text-emerald-400' },
  listening: { label: 'استماع', icon: Mic, color: 'text-amber-400' },
  grammar: { label: 'قرامر', icon: FileText, color: 'text-red-400' },
  vocabulary: { label: 'مفردات', icon: Brain, color: 'text-sky-400' },
  irregular_verbs: { label: 'أفعال شاذة', icon: Target, color: 'text-gold-400' },
  custom: { label: 'مخصص', icon: Target, color: 'text-muted' },
}

const SKILL_LABELS = {
  grammar: 'القرامر',
  vocabulary: 'المفردات',
  speaking: 'المحادثة',
  listening: 'الاستماع',
  reading: 'القراءة',
  writing: 'الكتابة',
}

const TABS = [
  { key: 'overview', label: 'الملخص', icon: BarChart3 },
  { key: 'ai-profile', label: 'الملف الذكي', icon: Brain },
  { key: 'assignments', label: 'الواجبات', icon: FileText },
  { key: 'skills', label: 'المهارات', icon: Brain },
  { key: 'attendance', label: 'الحضور', icon: Calendar },
  { key: 'analysis', label: 'التحليل', icon: Sparkles },
]

const PACKAGE_LABELS = { asas: 'أساس', talaqa: 'طلاقة', tamayuz: 'تميّز', ielts: 'آيلتس' }

function getStudentName(s) {
  return s?.profiles?.display_name || s?.profiles?.full_name || s?.display_name || s?.full_name || 'طالب'
}

// ─── Main Component ────────────────────────────────────────

export default function TrainerStudentView() {
  const { profile } = useAuthStore()
  const role = profile?.role
  const isAdmin = role === 'admin'
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)

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

  useEffect(() => {
    if (groups?.length > 0 && !selectedGroup) setSelectedGroup(groups[0].id)
  }, [groups, selectedGroup])

  const { data: students } = useQuery({
    queryKey: ['group-students-view', selectedGroup],
    queryFn: async () => {
      if (!selectedGroup) return []
      const { data } = await supabase
        .from('students')
        .select('id, xp_total, current_streak, longest_streak, gamification_level, academic_level, package, status, custom_price, group_id, team_id, profiles(full_name, display_name), groups(name, code), teams(name)')
        .eq('group_id', selectedGroup)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('xp_total', { ascending: false })
      return data || []
    },
    enabled: !!selectedGroup,
  })

  if (selectedStudent) {
    return (
      <StudentDetailView
        student={selectedStudent}
        isAdmin={isAdmin}
        onBack={() => setSelectedStudent(null)}
      />
    )
  }

  // ── List View ──
  return (
    <div className="space-y-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <Zap size={20} strokeWidth={1.5} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-page-title">ملفات الطلاب</h1>
          <p className="text-muted text-sm mt-1">اطلع على بيانات وأداء كل طالب بالتفصيل</p>
        </div>
      </div>

      {groups?.length > 1 && (
        <select
          value={selectedGroup}
          onChange={(e) => { setSelectedGroup(e.target.value); setSelectedStudent(null) }}
          className="input-field py-2 px-3 text-sm w-auto"
        >
          {groups.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
        </select>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {students?.map((s, i) => {
          const name = getStudentName(s)
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedStudent(s)}
              className="fl-card p-7 text-right hover:border-sky-500/20"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-lg font-bold">
                  {name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gradient">{name}</p>
                  <p className="text-xs text-muted">المستوى {s.academic_level} • {PACKAGE_LABELS[s.package] || s.package}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-gold-400">
                  <Zap size={12} /> {s.xp_total} XP
                </div>
                <div className="flex items-center gap-1 text-orange-400">
                  <Flame size={12} /> {s.current_streak} يوم
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {!students?.length && (
        <div className="fl-card-static p-12 text-center">
          <p className="text-muted">لا يوجد طلاب في هذه المجموعة</p>
        </div>
      )}
    </div>
  )
}

// ─── Student Detail View ───────────────────────────────────

function StudentDetailView({ student, isAdmin, onBack }) {
  const [activeTab, setActiveTab] = useState('overview')
  const name = getStudentName(student)

  const tabs = isAdmin
    ? [...TABS, { key: 'payments', label: 'المدفوعات', icon: CreditCard }]
    : TABS

  // ── Core queries (always loaded) ──
  const { data: allSubmissions } = useQuery({
    queryKey: ['student-all-subs', student.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id, status, grade, grade_numeric, is_late, submitted_at, trainer_feedback, ai_feedback, assignments(title, type, deadline)')
        .eq('student_id', student.id)
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false })
      return data || []
    },
  })

  const { data: allAttendance } = useQuery({
    queryKey: ['student-all-att', student.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select('id, status, xp_awarded, created_at, classes:class_id(title, date)')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const { data: xpHistory } = useQuery({
    queryKey: ['student-xp-full', student.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('xp_transactions')
        .select('id, amount, reason, description, created_at')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(50)
      return data || []
    },
  })

  const { data: skillSnapshots } = useQuery({
    queryKey: ['student-skills', student.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('skill_snapshots')
        .select('grammar, vocabulary, speaking, listening, reading, writing, snapshot_date')
        .eq('student_id', student.id)
        .order('snapshot_date', { ascending: false })
        .limit(5)
      return data || []
    },
  })

  // ── Derived stats ──
  const presentCount = allAttendance?.filter(a => a.status === 'present').length || 0
  const totalAttendance = allAttendance?.length || 0
  const attRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : null
  const gradedSubs = allSubmissions?.filter(s => s.grade_numeric != null) || []
  const avgGrade = gradedSubs.length > 0
    ? Math.round(gradedSubs.reduce((sum, s) => sum + s.grade_numeric, 0) / gradedSubs.length)
    : null

  // Performance trend: compare last 5 graded vs previous 5
  const trend = useMemo(() => {
    if (gradedSubs.length < 4) return 'neutral'
    const half = Math.floor(gradedSubs.length / 2)
    const recent = gradedSubs.slice(0, half)
    const older = gradedSubs.slice(half, half * 2)
    const recentAvg = recent.reduce((s, x) => s + x.grade_numeric, 0) / recent.length
    const olderAvg = older.reduce((s, x) => s + x.grade_numeric, 0) / older.length
    if (recentAvg > olderAvg + 3) return 'up'
    if (recentAvg < olderAvg - 3) return 'down'
    return 'neutral'
  }, [gradedSubs])

  return (
    <div className="space-y-12">
      <button onClick={onBack} className="btn-ghost flex items-center gap-2 text-sm">
        <ChevronLeft size={16} /> رجوع للقائمة
      </button>

      {/* ── Header Card ── */}
      <div className="fl-card-static p-7">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-xl bg-sky-500/20 border-2 border-sky-500/30 flex items-center justify-center text-sky-400 text-2xl font-bold">
            {name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-page-title text-gradient">{name}</h2>
              {trend === 'up' && <span className="badge-green flex items-center gap-1"><TrendingUp size={12} /> تحسّن</span>}
              {trend === 'down' && <span className="badge-red flex items-center gap-1"><TrendingDown size={12} /> تراجع</span>}
              {trend === 'neutral' && <span className="badge-muted flex items-center gap-1"><Minus size={12} /> مستقر</span>}
            </div>
            <p className="text-sm text-muted mt-0.5">
              المستوى {student.academic_level} • {PACKAGE_LABELS[student.package] || student.package}
              {student.groups?.code && ` • ${student.groups.code}`}
              {student.teams?.name && ` • فريق ${student.teams.name}`}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
          <StatCard icon={Zap} color="gold" value={student.xp_total} label="XP" />
          <StatCard icon={Flame} color="orange" value={student.current_streak} label="سلسلة حالية" />
          <StatCard icon={Calendar} color="emerald" value={attRate != null ? `${attRate}%` : '—'} label="الحضور" />
          <StatCard icon={BarChart3} color="sky" value={avgGrade != null ? `${avgGrade}%` : '—'} label="متوسط الدرجات" />
          <StatCard icon={Award} color="violet" value={`Lv.${student.gamification_level}`} label="مستوى اللعب" />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-[var(--surface-base)] text-muted hover:text-[var(--text-primary)] border border-transparent'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'ai-profile' && (
            <StudentAIProfile studentId={student.id} showGenerate showEnglishSummary />
          )}
          {activeTab === 'overview' && (
            <OverviewTab
              student={student}
              submissions={allSubmissions}
              attendance={allAttendance}
              xpHistory={xpHistory}
              gradedSubs={gradedSubs}
              avgGrade={avgGrade}
              attRate={attRate}
            />
          )}
          {activeTab === 'assignments' && (
            <AssignmentsTab submissions={allSubmissions} />
          )}
          {activeTab === 'skills' && (
            <SkillsTab snapshots={skillSnapshots} studentName={name} />
          )}
          {activeTab === 'attendance' && (
            <AttendanceTab attendance={allAttendance} />
          )}
          {activeTab === 'analysis' && (
            <AnalysisTab student={student} studentName={name} />
          )}
          {activeTab === 'payments' && isAdmin && (
            <PaymentsTab studentId={student.id} student={student} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Stat Card ─────────────────────────────────────────────

const STAT_COLOR_CLASSES = {
  sky: 'text-sky-400',
  emerald: 'text-emerald-400',
  gold: 'text-gold-400',
  violet: 'text-violet-400',
  red: 'text-red-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
}

function StatCard({ icon: Icon, color, value, label }) {
  const BG_CLASSES = {
    sky: 'bg-sky-500/10',
    emerald: 'bg-emerald-500/10',
    gold: 'bg-gold-500/10',
    violet: 'bg-violet-500/10',
    red: 'bg-red-500/10',
    amber: 'bg-amber-500/10',
    rose: 'bg-rose-500/10',
    orange: 'bg-orange-500/10',
  }
  return (
    <div className={`fl-stat-card fl-stat-card--${color}`} style={{ textAlign: 'center' }}>
      <div className={`w-9 h-9 rounded-xl ${BG_CLASSES[color] || 'bg-sky-500/10'} flex items-center justify-center mx-auto`}>
        <Icon size={16} className={STAT_COLOR_CLASSES[color] || 'text-sky-400'} />
      </div>
      <p className="text-page-title mt-2">{value}</p>
      <p className="stat-label text-xs">{label}</p>
    </div>
  )
}

// ─── Overview Tab ──────────────────────────────────────────

function OverviewTab({ student, submissions, attendance, xpHistory, gradedSubs, avgGrade, attRate }) {
  // Per-type completion rate
  const typeStats = useMemo(() => {
    const stats = {}
    for (const s of submissions || []) {
      const type = s.assignments?.type || 'custom'
      if (!stats[type]) stats[type] = { total: 0, graded: 0, grades: [], late: 0 }
      stats[type].total++
      if (s.status === 'graded') {
        stats[type].graded++
        if (s.grade_numeric != null) stats[type].grades.push(s.grade_numeric)
      }
      if (s.is_late) stats[type].late++
    }
    return Object.entries(stats).map(([type, s]) => ({
      type,
      ...(TYPE_LABELS[type] || TYPE_LABELS.custom),
      total: s.total,
      graded: s.graded,
      avg: s.grades.length ? Math.round(s.grades.reduce((a, b) => a + b, 0) / s.grades.length) : null,
      late: s.late,
    }))
  }, [submissions])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Per-type performance */}
      <div className="fl-card-static p-7 space-y-3">
        <h3 className="text-section-title flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center"><BarChart3 size={14} className="text-sky-400" /></div> أداء حسب نوع الواجب
        </h3>
        {typeStats.length === 0 && <p className="text-xs text-muted">لا توجد بيانات</p>}
        {typeStats.map(ts => {
          const Icon = ts.icon
          return (
            <div key={ts.type} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--surface-raised)' }}>
              <Icon size={16} className={ts.color} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-primary)]">{ts.label}</span>
                  <span className="text-xs text-muted">{ts.graded}/{ts.total} واجب</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 fl-progress-track">
                    <div
                      className="fl-progress-fill bg-sky-500"
                      style={{ width: `${ts.total > 0 ? (ts.graded / ts.total) * 100 : 0}%` }}
                    />
                  </div>
                  {ts.avg != null && (
                    <span className={`text-xs font-bold ${ts.avg >= 80 ? 'text-emerald-400' : ts.avg >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                      {ts.avg}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent XP */}
      <div className="fl-card-static p-7 space-y-3">
        <h3 className="text-section-title flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div className="w-8 h-8 rounded-xl bg-gold-500/10 flex items-center justify-center"><Zap size={14} className="text-gold-400" /></div> آخر النقاط
        </h3>
        {(xpHistory || []).slice(0, 8).map(xp => (
          <div key={xp.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--surface-raised)' }}>
            <div>
              <p className="text-xs text-[var(--text-primary)]">{XP_REASON_LABELS[xp.reason] || xp.reason}</p>
              {xp.description && <p className="text-xs text-muted mt-0.5">{xp.description}</p>}
              <p className="text-xs text-muted">{formatDateAr(xp.created_at)}</p>
            </div>
            <span className={`text-sm font-bold ${xp.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {xp.amount > 0 ? '+' : ''}{xp.amount}
            </span>
          </div>
        ))}
        {!xpHistory?.length && <p className="text-xs text-muted">لا توجد نقاط</p>}
      </div>
    </div>
  )
}

// ─── Assignments Tab ───────────────────────────────────────

function AssignmentsTab({ submissions }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    let result = submissions || []
    if (typeFilter !== 'all') result = result.filter(s => s.assignments?.type === typeFilter)
    if (statusFilter !== 'all') result = result.filter(s => s.status === statusFilter)
    return result
  }, [submissions, typeFilter, statusFilter])

  const types = useMemo(() => {
    const set = new Set((submissions || []).map(s => s.assignments?.type).filter(Boolean))
    return Array.from(set)
  }, [submissions])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-muted" />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="input-field text-xs py-1.5 w-auto"
        >
          <option value="all">كل الأنواع</option>
          {types.map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t]?.label || t}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-field text-xs py-1.5 w-auto"
        >
          <option value="all">كل الحالات</option>
          <option value="graded">مُقيّم</option>
          <option value="submitted">بانتظار التقييم</option>
        </select>
        <span className="text-xs text-muted">{filtered.length} نتيجة</span>
      </div>

      {/* Submissions list */}
      <div className="space-y-2">
        {filtered.map(s => {
          const typeInfo = TYPE_LABELS[s.assignments?.type] || TYPE_LABELS.custom
          const Icon = typeInfo.icon
          return (
            <div key={s.id} className="fl-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={14} className={typeInfo.color} />
                  <span className="text-sm text-[var(--text-primary)]">{s.assignments?.title || 'واجب'}</span>
                  {s.is_late && (
                    <span className="badge-yellow text-xs">متأخر</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {s.grade && (
                    <span className={`text-sm font-bold ${
                      (s.grade_numeric ?? 0) >= 80 ? 'text-emerald-400' : (s.grade_numeric ?? 0) >= 60 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {s.grade}{s.grade_numeric != null ? ` (${s.grade_numeric}%)` : ''}
                    </span>
                  )}
                  <span className={
                    s.status === 'graded' ? 'badge-green' :
                    s.status === 'submitted' ? 'badge-yellow' :
                    'badge-muted'
                  }>
                    {s.status === 'graded' ? 'مُقيّم' : s.status === 'submitted' ? 'معلّق' : s.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted">{formatDateAr(s.submitted_at)}</p>
                {s.trainer_feedback && (
                  <p className="text-xs text-muted max-w-[60%] truncate" title={s.trainer_feedback}>
                    💬 {s.trainer_feedback}
                  </p>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="fl-card-static p-6 text-center">
            <p className="text-xs text-muted">لا توجد واجبات مطابقة</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Skills Tab ────────────────────────────────────────────

function SkillsTab({ snapshots, studentName }) {
  const current = snapshots?.[0]
  const previous = snapshots?.[1]

  const radarData = useMemo(() => {
    if (!current) return []
    return Object.keys(SKILL_LABELS).map(key => ({
      skill: SKILL_LABELS[key],
      الحالي: current[key] || 0,
      ...(previous ? { السابق: previous[key] || 0 } : {}),
    }))
  }, [current, previous])

  // Calculate changes
  const changes = useMemo(() => {
    if (!current || !previous) return []
    return Object.keys(SKILL_LABELS).map(key => ({
      skill: SKILL_LABELS[key],
      key,
      current: current[key] || 0,
      previous: previous[key] || 0,
      diff: (current[key] || 0) - (previous[key] || 0),
    })).sort((a, b) => b.diff - a.diff)
  }, [current, previous])

  if (!current) {
    return (
      <div className="fl-card-static p-8 text-center">
        <Brain size={32} className="text-muted mx-auto mb-3" />
        <p className="text-sm text-muted">لا توجد بيانات مهارات بعد</p>
        <p className="text-xs text-muted mt-1">سيتم تحديث المهارات أسبوعياً بناءً على أداء الطالب</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Radar Chart */}
      <div className="fl-card-static p-7">
        <h3 className="text-section-title mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center"><Brain size={14} className="text-violet-400" /></div> مخطط المهارات
        </h3>
        <div style={{ width: '100%', height: 300 }} dir="ltr">
          <ResponsiveContainer>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                axisLine={false}
              />
              <Radar
                name="الحالي"
                dataKey="الحالي"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              {previous && (
                <Radar
                  name="السابق"
                  dataKey="السابق"
                  stroke="#64748b"
                  fill="#64748b"
                  fillOpacity={0.1}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              )}
              <Legend
                wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}
              />
              <Tooltip
                contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: '#fff' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {current.snapshot_date && (
          <p className="text-xs text-muted text-center mt-1">
            آخر تحديث: {formatDateAr(current.snapshot_date)}
          </p>
        )}
      </div>

      {/* Skill details + changes */}
      <div className="space-y-4">
        <div className="fl-card-static p-7 space-y-3">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">تفاصيل المهارات</h3>
          {Object.keys(SKILL_LABELS).map(key => {
            const val = current[key] || 0
            const prev = previous?.[key] || null
            const diff = prev !== null ? val - prev : null
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">{SKILL_LABELS[key]}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${val >= 70 ? 'text-emerald-400' : val >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {val}%
                    </span>
                    {diff !== null && diff !== 0 && (
                      <span className={`text-xs flex items-center gap-0.5 ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {diff > 0 ? '+' : ''}{diff}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="fl-progress-track">
                  <div
                    className={`fl-progress-fill ${val >= 70 ? 'bg-emerald-500' : val >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* AI Insight */}
        {changes.length > 0 && (
          <div className="fl-card-static p-4 bg-violet-500/5 border-violet-500/20">
            <p className="text-xs text-violet-400 font-medium mb-1.5 flex items-center gap-1">
              <Sparkles size={12} /> ملاحظة ذكية
            </p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {changes[0].diff > 0
                ? `${changes[0].skill} تحسنت بـ ${changes[0].diff}% — أداء ممتاز!`
                : `${changes[0].skill} تراجعت بـ ${Math.abs(changes[0].diff)}% — تحتاج اهتمام.`
              }
              {changes.length > 1 && changes[changes.length - 1].diff < -5 && (
                ` ${changes[changes.length - 1].skill} أيضاً تحتاج تركيز (${changes[changes.length - 1].diff}%).`
              )}
            </p>
          </div>
        )}

        {/* Historical snapshots */}
        {snapshots?.length > 2 && (
          <div className="fl-card-static p-4">
            <h4 className="text-xs text-muted mb-2">سجل التحديثات</h4>
            {snapshots.slice(0, 5).map((snap, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border-subtle last:border-0">
                <span className="text-xs text-muted">{formatDateAr(snap.snapshot_date)}</span>
                <div className="flex items-center gap-2 text-xs">
                  {Object.keys(SKILL_LABELS).map(key => (
                    <span key={key} className="text-muted">
                      {SKILL_LABELS[key][0]}: <span className="text-[var(--text-primary)]">{snap[key]}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Attendance Tab ────────────────────────────────────────

function AttendanceTab({ attendance }) {
  const presentCount = attendance?.filter(a => a.status === 'present').length || 0
  const absentCount = attendance?.filter(a => a.status === 'absent').length || 0
  const excusedCount = attendance?.filter(a => a.status === 'excused').length || 0
  const total = attendance?.length || 0
  const rate = total > 0 ? Math.round((presentCount / total) * 100) : null

  // Group by month for calendar dots
  const byMonth = useMemo(() => {
    const map = {}
    for (const a of attendance || []) {
      const date = a.classes?.date || a.created_at?.split('T')[0]
      if (!date) continue
      const month = date.substring(0, 7) // YYYY-MM
      if (!map[month]) map[month] = []
      map[month].push({ date, status: a.status })
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [attendance])

  // Trend: compare last 10 vs previous 10
  const trend = useMemo(() => {
    if (total < 8) return null
    const half = Math.floor(total / 2)
    const recent = (attendance || []).slice(0, half).filter(a => a.status === 'present').length / half
    const older = (attendance || []).slice(half, half * 2).filter(a => a.status === 'present').length / half
    if (recent > older + 0.1) return 'improving'
    if (recent < older - 0.1) return 'declining'
    return 'stable'
  }, [attendance, total])

  return (
    <div className="space-y-12">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <div className="fl-stat-card fl-stat-card--emerald text-center">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{rate != null ? `${rate}%` : '—'}</p>
          <p className="stat-label">نسبة الحضور</p>
        </div>
        <div className="fl-stat-card fl-stat-card--emerald text-center">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{presentCount}</p>
          <p className="stat-label">حاضر</p>
        </div>
        <div className="fl-stat-card fl-stat-card--amber text-center">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto">
            <XCircle size={16} className="text-red-400" />
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{absentCount}</p>
          <p className="stat-label">غائب</p>
        </div>
        <div className="fl-stat-card fl-stat-card--amber text-center">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto">
            <AlertCircle size={16} className="text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{excusedCount}</p>
          <p className="stat-label">معذور</p>
        </div>
      </div>

      {/* Trend */}
      {trend && (
        <div className={`fl-card-static p-3 flex items-center gap-2 ${
          trend === 'improving' ? 'bg-emerald-500/5 border-emerald-500/20' :
          trend === 'declining' ? 'bg-red-500/5 border-red-500/20' :
          'bg-[var(--surface-base)]'
        }`}>
          {trend === 'improving' && <TrendingUp size={14} className="text-emerald-400" />}
          {trend === 'declining' && <TrendingDown size={14} className="text-red-400" />}
          {trend === 'stable' && <Minus size={14} className="text-muted" />}
          <span className="text-xs text-[var(--text-primary)]">
            {trend === 'improving' ? 'الحضور يتحسن مقارنة بالفترة السابقة' :
             trend === 'declining' ? 'الحضور يتراجع — يحتاج متابعة' :
             'الحضور مستقر'}
          </span>
        </div>
      )}

      {/* Calendar dots by month */}
      <div className="space-y-4">
        {byMonth.map(([month, records]) => (
          <div key={month} className="fl-card-static p-4">
            <h4 className="text-xs font-medium text-muted mb-3">{month}</h4>
            <div className="flex flex-wrap gap-2">
              {records.map((r, i) => {
                const config = STATUS_LABELS[r.status] || STATUS_LABELS.absent
                return (
                  <div key={i} className="group relative">
                    <div className={`w-6 h-6 rounded-full ${config.bg} opacity-80 hover:opacity-100 transition-opacity cursor-default`} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-dark-800 text-[var(--text-primary)] text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {r.date} — {config.label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Full history list */}
      <div className="fl-card-static p-7 space-y-3">
        <h3 className="text-section-title mb-3" style={{ color: 'var(--text-primary)' }}>السجل الكامل</h3>
        {(attendance || []).map(a => {
          const config = STATUS_LABELS[a.status] || STATUS_LABELS.absent
          const Icon = config.icon
          return (
            <div key={a.id} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'var(--surface-raised)' }}>
              <div>
                <p className="text-xs text-[var(--text-primary)]">{a.classes?.title || 'حصة'}</p>
                <p className="text-xs text-muted">{formatDateAr(a.classes?.date || a.created_at)}</p>
              </div>
              <div className="flex items-center gap-1">
                <Icon size={12} className={config.color} />
                <span className={`text-xs ${config.color}`}>{config.label}</span>
              </div>
            </div>
          )
        })}
        {!attendance?.length && <p className="text-xs text-muted">لا يوجد سجل</p>}
      </div>
    </div>
  )
}

// ─── Analysis Tab ──────────────────────────────────────────

function AnalysisTab({ student, studentName }) {
  const [analysis, setAnalysis] = useState(null)
  const [plan, setPlan] = useState(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [editingPlan, setEditingPlan] = useState(false)
  const [editedPlan, setEditedPlan] = useState('')

  // Trainer notes for this student
  const { data: notes } = useQuery({
    queryKey: ['student-notes', student.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, created_at, type')
        .eq('user_id', student.id)
        .in('type', ['trainer_note', 'trainer_encouragement', 'trainer_observation', 'trainer_warning'])
        .order('created_at', { ascending: false })
        .limit(20)
      return data || []
    },
  })

  async function runAnalysis() {
    setLoadingAnalysis(true)
    try {
      const res = await invokeWithRetry('ai-trainer-assistant', {
        body: { confirmed_action: { action: 'WEAKNESS_ANALYSIS', params: { student_name: studentName } } },
        
      })
      if (res.data?.reply) setAnalysis(res.data.reply)
      else setAnalysis('لم يتم الحصول على تحليل — حاول مرة أخرى')
    } catch {
      setAnalysis('خطأ في التحليل — حاول مرة أخرى')
    } finally {
      setLoadingAnalysis(false)
    }
  }

  async function runPlan() {
    setLoadingPlan(true)
    try {
      const res = await invokeWithRetry('ai-trainer-assistant', {
        body: { message: `اسوِ خطة تحسين مفصلة لـ ${studentName} تشمل أهداف محددة وخطوات عملية`, history: [] },
        
      })
      if (res.data?.reply) {
        setPlan(res.data.reply)
        setEditedPlan(res.data.reply)
      }
    } catch {
      setPlan('خطأ — حاول مرة أخرى')
    } finally {
      setLoadingPlan(false)
    }
  }

  async function savePlan() {
    try {
      // Save as a trainer note on the student
      const { error } = await supabase.from('notifications').insert({
        user_id: student.id,
        type: 'trainer_observation',
        title: 'خطة تحسين',
        body: editedPlan,
      })
      if (error) throw error
      setPlan(editedPlan)
      setEditingPlan(false)
    } catch (err) {
      console.error('[AnalysisTab] savePlan error:', err)
    }
  }

  const NOTE_TYPE_LABELS = {
    trainer_note: { label: 'ملاحظة', color: 'text-sky-400' },
    trainer_encouragement: { label: 'تشجيع', color: 'text-emerald-400' },
    trainer_observation: { label: 'ملاحظة أداء', color: 'text-violet-400' },
    trainer_warning: { label: 'تنبيه', color: 'text-amber-400' },
  }

  return (
    <div className="space-y-12">
      {/* AI Weakness Analysis */}
      <div className="fl-card-static p-7">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-section-title flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center"><Brain size={14} className="text-violet-400" /></div> تحليل نقاط القوة والضعف
          </h3>
          <button
            onClick={runAnalysis}
            disabled={loadingAnalysis}
            className="flex items-center gap-1.5 text-xs bg-violet-500/10 border border-violet-500/20 text-violet-400 px-3 py-1.5 rounded-xl hover:bg-violet-500/20 transition-all"
          >
            {loadingAnalysis ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loadingAnalysis ? 'يحلّل...' : analysis ? 'تحديث' : 'تحليل بالذكاء الاصطناعي'}
          </button>
        </div>
        {analysis && (
          <div className="bg-violet-500/5 rounded-xl p-4">
            <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{analysis}</p>
          </div>
        )}
        {!analysis && !loadingAnalysis && (
          <p className="text-xs text-muted">اضغط الزر لتحليل أداء الطالب بالذكاء الاصطناعي</p>
        )}
      </div>

      {/* AI Improvement Plan */}
      <div className="fl-card-static p-7">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-section-title flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Target size={14} className="text-emerald-400" /></div> خطة التحسين
          </h3>
          <div className="flex items-center gap-2">
            {plan && !editingPlan && (
              <button
                onClick={() => setEditingPlan(true)}
                className="text-xs text-muted hover:text-[var(--text-primary)] transition-colors"
              >
                تعديل
              </button>
            )}
            <button
              onClick={runPlan}
              disabled={loadingPlan}
              className="flex items-center gap-1.5 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl hover:bg-emerald-500/20 transition-all"
            >
              {loadingPlan ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {loadingPlan ? 'يخطط...' : plan ? 'إعادة إنشاء' : 'إنشاء خطة'}
            </button>
          </div>
        </div>

        {editingPlan ? (
          <div className="space-y-3">
            <textarea
              value={editedPlan}
              onChange={e => setEditedPlan(e.target.value)}
              className="input-field w-full text-xs min-h-[200px] leading-relaxed"
              dir="rtl"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={savePlan}
                className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-xl hover:bg-emerald-500/20"
              >
                <CheckCircle2 size={12} /> حفظ وإرسال للطالب
              </button>
              <button
                onClick={() => { setEditingPlan(false); setEditedPlan(plan || '') }}
                className="text-xs text-muted hover:text-[var(--text-primary)] px-3 py-1.5"
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : plan ? (
          <div className="bg-emerald-500/5 rounded-xl p-4">
            <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{plan}</p>
          </div>
        ) : (
          <p className="text-xs text-muted">اضغط الزر لإنشاء خطة تحسين مخصصة بالذكاء الاصطناعي</p>
        )}
      </div>

      {/* Trainer Notes History */}
      <div className="fl-card-static p-7 space-y-3">
        <h3 className="text-section-title flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center"><MessageSquare size={14} className="text-sky-400" /></div> سجل الملاحظات
        </h3>
        {notes?.length === 0 && <p className="text-xs text-muted">لا توجد ملاحظات</p>}
        {notes?.map(n => {
          const typeInfo = NOTE_TYPE_LABELS[n.type] || NOTE_TYPE_LABELS.trainer_note
          return (
            <div key={n.id} className="rounded-xl p-3" style={{ background: 'var(--surface-raised)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                <span className="text-xs text-muted">{formatDateAr(n.created_at)}</span>
              </div>
              {n.title !== 'ملاحظة من المدرب' && (
                <p className="text-xs text-[var(--text-primary)] font-medium mb-0.5">{n.title}</p>
              )}
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{n.body}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Payments Tab (Admin Only) ─────────────────────────────

function PaymentsTab({ studentId, student }) {
  const { data: payments } = useQuery({
    queryKey: ['student-payments', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('id, amount, status, method, period_start, period_end, paid_at, notes, created_at')
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const METHOD_LABELS = {
    bank_transfer: 'تحويل بنكي',
    cash: 'نقدي',
    moyasar: 'بطاقة',
    free: 'مجاني',
  }

  const STATUS_COLORS = {
    paid: 'text-emerald-400 bg-emerald-500/10',
    pending: 'text-amber-400 bg-amber-500/10',
    overdue: 'text-red-400 bg-red-500/10',
    partial: 'text-sky-400 bg-sky-500/10',
    failed: 'text-red-400 bg-red-500/10',
  }

  const STATUS_TEXT = {
    paid: 'مدفوع',
    pending: 'معلّق',
    overdue: 'متأخر',
    partial: 'جزئي',
    failed: 'فشل',
  }

  // Current month status
  const currentMonth = new Date().toISOString().substring(0, 7)
  const thisMonthPayment = payments?.find(p =>
    p.status === 'paid' && p.paid_at?.substring(0, 7) === currentMonth
  )

  const totalPaid = (payments || [])
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  return (
    <div className="space-y-12">
      {/* Current status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className={`fl-stat-card fl-stat-card--emerald text-center ${thisMonthPayment ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
          <div className={`w-10 h-10 rounded-xl ${thisMonthPayment ? 'bg-emerald-500/10' : 'bg-red-500/10'} flex items-center justify-center mx-auto`}>
            <CreditCard size={20} className={thisMonthPayment ? 'text-emerald-400' : 'text-red-400'} />
          </div>
          <p className={`text-3xl font-bold mt-2 ${thisMonthPayment ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}>
            {thisMonthPayment ? 'مدفوع' : 'غير مدفوع'}
          </p>
          <p className="stat-label">الشهر الحالي</p>
        </div>
        <div className="fl-stat-card fl-stat-card--sky text-center">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center mx-auto">
            <CreditCard size={20} className="text-sky-400" />
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{totalPaid}</p>
          <p className="stat-label">إجمالي المدفوعات (ر.س)</p>
        </div>
        <div className="fl-stat-card fl-stat-card--violet text-center">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto">
            <CreditCard size={20} className="text-violet-400" />
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{student.custom_price || '—'}</p>
          <p className="stat-label">سعر مخصص (ر.س)</p>
        </div>
      </div>

      {/* Payment history */}
      <div className="fl-card-static p-7 space-y-3">
        <h3 className="text-section-title mb-3" style={{ color: 'var(--text-primary)' }}>سجل المدفوعات</h3>
        {payments?.length === 0 && <p className="text-xs text-muted">لا توجد مدفوعات</p>}
        {payments?.map(p => (
          <div key={p.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface-raised)' }}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--text-primary)]">{p.amount} ر.س</span>
                <span className={
                  p.status === 'paid' ? 'badge-green text-xs' :
                  p.status === 'pending' ? 'badge-yellow text-xs' :
                  p.status === 'overdue' || p.status === 'failed' ? 'badge-red text-xs' :
                  'badge-blue text-xs'
                }>
                  {STATUS_TEXT[p.status] || p.status}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                {METHOD_LABELS[p.method] || p.method || '—'}
                {p.period_start && ` • ${p.period_start} → ${p.period_end}`}
              </p>
              {p.notes && <p className="text-xs text-muted mt-0.5">{p.notes}</p>}
            </div>
            <p className="text-xs text-muted">{formatDateAr(p.paid_at || p.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
