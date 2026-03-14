import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  CalendarDays, Play, Loader2, CheckCircle2, Clock, AlertTriangle,
  Users, BarChart3, Zap, ChevronDown, RefreshCw, DollarSign,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

function toArabicNum(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])
}

function getSunday(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

function formatWeekRange(sunday) {
  const saturday = new Date(sunday)
  saturday.setDate(saturday.getDate() + 6)
  return `${toArabicNum(sunday.getDate())} – ${toArabicNum(saturday.getDate())} ${AR_MONTHS[saturday.getMonth()]}`
}

export default function AdminWeeklyTasks() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedGroup, setSelectedGroup] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState(null)

  const currentSunday = useMemo(() => getSunday(new Date()), [])
  const weekStart = currentSunday.toISOString().split('T')[0]

  // Groups
  const { data: groups } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: async () => {
      const { data } = await supabase.from('groups').select('id, name, code')
      return data || []
    },
  })

  // Task sets for this week
  const { data: taskSets, isLoading } = useQuery({
    queryKey: ['admin-task-sets', weekStart, selectedGroup],
    queryFn: async () => {
      let query = supabase
        .from('weekly_task_sets')
        .select('*, students:student_id(profiles(full_name, display_name), group_id, academic_level)')
        .eq('week_start', weekStart)
        .order('created_at', { ascending: false })

      if (selectedGroup) {
        const { data: sids } = await supabase.from('students').select('id').eq('group_id', selectedGroup)
        if (sids) query = query.in('student_id', sids.map(s => s.id))
      }

      const { data } = await query
      return data || []
    },
  })

  // AI usage cost this week
  const { data: aiUsage } = useQuery({
    queryKey: ['admin-ai-usage-weekly', weekStart],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_usage')
        .select('input_tokens, output_tokens, estimated_cost_sar')
        .gte('created_at', weekStart)
        .in('type', ['weekly_tasks'])

      if (!data) return { totalCost: 0, totalCalls: 0 }
      const totalCost = data.reduce((sum, r) => sum + (r.estimated_cost_sar || 0), 0)
      return { totalCost: totalCost.toFixed(2), totalCalls: data.length }
    },
  })

  // Stats
  const stats = useMemo(() => {
    if (!taskSets) return { total: 0, completed: 0, avgCompletion: 0, avgDifficulty: 0 }
    const total = taskSets.length
    const completed = taskSets.filter(s => s.status === 'completed').length
    const avgCompletion = total > 0
      ? Math.round(taskSets.reduce((sum, s) => sum + (s.completion_percentage || 0), 0) / total)
      : 0
    const avgDifficulty = total > 0
      ? (taskSets.reduce((sum, s) => sum + (s.difficulty_score || 0.5), 0) / total).toFixed(2)
      : '0.50'
    return { total, completed, avgCompletion, avgDifficulty }
  }, [taskSets])

  // Generate now
  async function handleGenerate() {
    setGenerating(true)
    setGenResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error } = await invokeWithRetry('generate-weekly-tasks', {
        body: {},
        headers: { Authorization: `Bearer ${session?.access_token}` },
      }, { timeoutMs: 120000 })

      if (error) {
        setGenResult({ success: false, message: error })
      } else {
        setGenResult({
          success: true,
          message: `تم إنشاء المهام لـ ${data?.generated || 0} طالب. تم تخطي ${data?.skipped || 0}.`,
          holidays: data?.holidays,
        })
        queryClient.invalidateQueries({ queryKey: ['admin-task-sets'] })
      }
    } catch (err) {
      setGenResult({ success: false, message: 'حدث خطأ أثناء الإنشاء' })
    } finally {
      setGenerating(false)
    }
  }

  function getStudentName(set) {
    return set.students?.profiles?.display_name || set.students?.profiles?.full_name || 'طالب'
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 flex items-center justify-center ring-1 ring-sky-500/20">
              <CalendarDays size={20} className="text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">المهام الأسبوعية</h1>
              <p className="text-white/30 text-sm mt-0.5">{formatWeekRange(currentSunday)}</p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 self-start sm:self-auto"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            إنشاء المهام الآن
          </button>
        </div>
      </motion.div>

      {/* Generation result */}
      {genResult && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 border text-sm ${
            genResult.success
              ? 'bg-emerald-500/[0.08] border-emerald-500/15 text-emerald-400'
              : 'bg-red-500/[0.08] border-red-500/15 text-red-400'
          }`}
        >
          {genResult.message}
          {genResult.holidays && (
            <p className="mt-1 text-xs opacity-70">العطل: {genResult.holidays.join(', ')}</p>
          )}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap gap-3"
      >
        <div className="relative">
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm px-3 py-2 min-w-[150px] text-white/70 appearance-none focus:outline-none focus:border-white/[0.12]"
          >
            <option value="">كل المجموعات</option>
            {groups?.map(g => (
              <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'طلاب بمهام', value: toArabicNum(stats.total), icon: Users, gradient: 'from-sky-500/15 to-cyan-500/5', iconColor: 'text-sky-400' },
          { label: 'أكملوا الكل', value: toArabicNum(stats.completed), icon: CheckCircle2, gradient: 'from-emerald-500/15 to-teal-500/5', iconColor: 'text-emerald-400' },
          { label: 'متوسط الإنجاز', value: `${toArabicNum(stats.avgCompletion)}%`, icon: BarChart3, gradient: 'from-violet-500/15 to-purple-500/5', iconColor: 'text-violet-400' },
          { label: 'تكلفة AI', value: `${aiUsage?.totalCost || '٠'} ر.س`, icon: DollarSign, gradient: 'from-amber-500/15 to-yellow-500/5', iconColor: 'text-amber-400' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className={`rounded-xl bg-gradient-to-br ${card.gradient} border border-white/[0.04] p-4`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <card.icon size={14} className={card.iconColor} />
              <span className="text-[11px] text-white/30 font-medium">{card.label}</span>
            </div>
            <p className="text-lg font-bold text-white">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Students list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.02)' }} />
          ))}
        </div>
      ) : taskSets?.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] p-14 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <AlertTriangle size={28} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/30 text-sm">لم يتم إنشاء مهام هذا الأسبوع بعد</p>
          <p className="text-white/15 text-xs mt-1">اضغط "إنشاء المهام الآن" للبدء</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-white/40">الطلاب ({toArabicNum(taskSets?.length || 0)})</h2>
          {taskSets?.map((set, i) => {
            const pct = set.completion_percentage || 0
            const isComplete = set.status === 'completed'

            return (
              <motion.div
                key={set.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-white/[0.06] p-4 hover:border-white/[0.1] transition-all"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-white/80 truncate">{getStudentName(set)}</h3>
                      {isComplete && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
                      <span className="text-[10px] text-white/20 shrink-0">
                        مستوى {set.level_at_generation || '?'}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isComplete ? 'bg-emerald-400' : 'bg-sky-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-white/25 w-8 text-left">{pct}%</span>
                    </div>
                  </div>

                  <div className="text-center shrink-0">
                    <p className="text-[10px] text-white/20">الصعوبة</p>
                    <p className="text-xs font-medium text-white/50">{(set.difficulty_score || 0.50).toFixed(2)}</p>
                  </div>

                  <div className="text-center shrink-0">
                    <p className="text-[10px] text-white/20">مهام</p>
                    <p className="text-xs font-medium text-white/50">
                      {set.completed_tasks || 0}/{set.total_tasks || 8}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
