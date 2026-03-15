import { useState, useEffect, lazy, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Plus, Minus, Undo2, ChevronDown, Loader2, UserCheck } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import SubTabs from '../../components/common/SubTabs'

const TrainerAttendance = lazy(() => import('./TrainerAttendance'))

const TABS = [
  { key: 'points', label: 'النقاط السريعة', icon: Zap },
  { key: 'attendance', label: 'الحضور', icon: UserCheck },
]

const QUICK_REASONS = [
  { reason: 'correct_answer', label: 'إجابة صحيحة', amount: 5, icon: '✅' },
  { reason: 'helped_peer', label: 'ساعد زميل', amount: 10, icon: '🤝' },
  { reason: 'shared_summary', label: 'شارك ملخص', amount: 15, icon: '📝' },
  { reason: 'voice_note_bonus', label: 'مشاركة صوتية', amount: 5, icon: '🎤' },
  { reason: 'writing_bonus', label: 'مشاركة كتابية', amount: 5, icon: '✍️' },
  { reason: 'early_bird', label: 'حضور مبكر', amount: 5, icon: '🌅' },
  { reason: 'daily_challenge', label: 'تحدي يومي', amount: 5, icon: '🎯' },
  { reason: 'custom', label: 'مخصص', amount: 5, icon: '⭐' },
]

const PENALTY_REASONS = [
  { reason: 'penalty_absent', label: 'غياب', amount: -20, icon: '❌' },
  { reason: 'penalty_unknown_word', label: 'كلمة غير معروفة', amount: -5, icon: '📖' },
  { reason: 'penalty_pronunciation', label: 'نطق خاطئ', amount: -5, icon: '🗣️' },
]

export default function TrainerQuickPoints() {
  const [activeTab, setActiveTab] = useState('points')
  return (
    <div className="space-y-8">
      <SubTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} accent="emerald" />
      <Suspense fallback={<div className="skeleton h-96 w-full" />}>
        {activeTab === 'points' && <QuickPointsContent />}
        {activeTab === 'attendance' && <TrainerAttendance />}
      </Suspense>
    </div>
  )
}

function QuickPointsContent() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const role = profile?.role
  const isAdmin = role === 'admin'
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [mode, setMode] = useState('add') // 'add' or 'deduct'
  const [customAmount, setCustomAmount] = useState(5)
  const [lastAction, setLastAction] = useState(null)
  const [toast, setToast] = useState(null)

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

  // Auto-select first group
  useEffect(() => {
    if (groups?.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].id)
    }
  }, [groups, selectedGroup])

  // Students in group
  const { data: students } = useQuery({
    queryKey: ['group-students', selectedGroup],
    queryFn: async () => {
      if (!selectedGroup) return []
      const { data, error } = await supabase
        .from('students')
        .select('id, xp_total, current_streak, profiles(full_name, display_name)')
        .eq('group_id', selectedGroup)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('enrollment_date')
      if (error) console.error('[QuickPoints] Students query error:', error)
      return data || []
    },
    enabled: !!selectedGroup,
  })

  function getStudentName(s) {
    return s.profiles?.display_name || s.profiles?.full_name || 'طالب'
  }

  // Award XP
  const awardMutation = useMutation({
    mutationFn: async ({ studentId, studentName, amount, reason }) => {
      const { data, error } = await supabase.from('xp_transactions').insert({
        student_id: studentId,
        amount,
        reason,
        awarded_by: profile?.id,
      }).select()
      if (error) throw error
      return { id: data[0].id, studentId, studentName, amount, reason }
    },
    onSuccess: (result) => {
      setLastAction(result)
      setSelectedStudent(null)
      queryClient.invalidateQueries({ queryKey: ['group-students'] })
      const sign = result.amount > 0 ? '+' : ''
      showToast(`${sign}${result.amount} XP → ${result.studentName}`)
    },
    onError: (err) => {
      showToast('حصل خطأ: ' + (err.message || 'حاول مرة أخرى'))
    },
  })

  // Undo last action
  const undoMutation = useMutation({
    mutationFn: async () => {
      if (!lastAction) return
      const { error } = await supabase.from('xp_transactions').delete().eq('id', lastAction.id)
      if (error) throw error
    },
    onSuccess: () => {
      showToast(`تم التراجع عن آخر إجراء`)
      setLastAction(null)
      queryClient.invalidateQueries({ queryKey: ['group-students'] })
    },
    onError: (err) => {
      showToast('فشل التراجع: ' + (err.message || 'حاول مرة أخرى'))
    },
  })

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function handleQuickAction(student, reasonObj) {
    awardMutation.mutate({
      studentId: student.id,
      studentName: getStudentName(student),
      amount: reasonObj.reason === 'custom' ? (mode === 'deduct' ? -customAmount : customAmount) : reasonObj.amount,
      reason: reasonObj.reason,
    })
  }

  const reasons = mode === 'add' ? QUICK_REASONS : PENALTY_REASONS

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
          <Zap size={20} strokeWidth={1.5} className="text-gold-400" />
        </div>
        <div>
          <h1 className="text-page-title">النقاط السريعة</h1>
          <p className="text-muted text-sm mt-1">منح وخصم نقاط XP أثناء الحصة</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Group selector */}
        {groups?.length > 1 && (
          <select
            value={selectedGroup}
            onChange={(e) => { setSelectedGroup(e.target.value); setSelectedStudent(null) }}
            className="input-field py-2 px-3 text-sm w-auto"
          >
            {groups.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
          </select>
        )}

        {/* Mode toggle */}
        <div className="flex rounded-xl p-1" style={{ background: 'var(--surface-raised)' }}>
          <button
            onClick={() => setMode('add')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'add' ? 'bg-emerald-500/20 text-emerald-400' : 'text-muted'
            }`}
          >
            <Plus size={14} className="inline ml-1" /> منح
          </button>
          <button
            onClick={() => setMode('deduct')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'deduct' ? 'bg-red-500/20 text-red-400' : 'text-muted'
            }`}
          >
            <Minus size={14} className="inline ml-1" /> خصم
          </button>
        </div>

        {/* Undo */}
        {lastAction && (
          <button
            onClick={() => undoMutation.mutate()}
            disabled={undoMutation.isPending}
            className="btn-secondary text-xs py-1.5 flex items-center gap-1"
          >
            <Undo2 size={14} /> تراجع
          </button>
        )}
      </div>

      {/* Student Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {students?.map((s, i) => {
          const name = getStudentName(s)
          const isSelected = selectedStudent?.id === s.id
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelectedStudent(isSelected ? null : s)}
              className={`p-4 rounded-2xl text-center hover:translate-y-[-2px] transition-all duration-200 border ${
                isSelected
                  ? 'bg-sky-500/10 border-sky-500/30 ring-2 ring-sky-500/20'
                  : 'bg-white/5 border-border-subtle hover:bg-white/10 hover:border-white/10'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-lg font-bold mx-auto mb-2">
                {name[0]}
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{name}</p>
              <p className="text-xs text-muted mt-0.5">{s.xp_total} XP</p>
            </motion.button>
          )
        })}
        {!students?.length && (
          <div className="col-span-full fl-card-static p-8 text-center">
            <p className="text-muted">لا يوجد طلاب في هذه المجموعة</p>
          </div>
        )}
      </div>

      {/* Reason Picker (shows when student selected) */}
      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fl-card-static p-7"
          >
            <p className="text-sm text-[var(--text-primary)] mb-3">
              {mode === 'add' ? 'منح نقاط لـ' : 'خصم نقاط من'}{' '}
              <span className="text-sky-400 font-bold">{getStudentName(selectedStudent)}</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {reasons.map((r) => (
                <button
                  key={r.reason}
                  onClick={() => handleQuickAction(selectedStudent, r)}
                  disabled={awardMutation.isPending}
                  className={`p-3 rounded-xl text-center transition-all border ${
                    mode === 'add'
                      ? 'bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10 hover:border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/10 hover:bg-red-500/10 hover:border-red-500/20'
                  }`}
                >
                  <span className="text-xl">{r.icon}</span>
                  <p className="text-xs text-[var(--text-primary)] mt-1">{r.label}</p>
                  <p className={`text-xs font-bold mt-0.5 ${mode === 'add' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {r.amount > 0 ? '+' : ''}{r.reason === 'custom' ? (mode === 'deduct' ? `-${customAmount}` : `+${customAmount}`) : r.amount}
                  </p>
                </button>
              ))}
            </div>
            {/* Custom amount input */}
            {mode === 'add' && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-muted">نقاط مخصصة:</span>
                <input
                  type="number"
                  min={1} max={100}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(parseInt(e.target.value) || 5)}
                  className="input-field py-1 px-2 w-20 text-sm text-center"
                  dir="ltr"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-sky-500/20 border border-sky-500/30 text-sky-400 px-6 py-3 rounded-2xl text-sm font-medium z-50 backdrop-blur-xl"
          >
            <Zap size={14} className="inline ml-1" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
