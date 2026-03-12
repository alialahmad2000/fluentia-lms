import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FileBarChart, Loader2, Sparkles, User, TrendingUp, TrendingDown, Star, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

export default function TrainerProgressReports() {
  const { profile } = useAuthStore()
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [periodDays, setPeriodDays] = useState(30)
  const [report, setReport] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const isAdmin = profile?.role === 'admin'

  const { data: groups } = useQuery({
    queryKey: ['trainer-groups-reports'],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code')
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  const { data: students } = useQuery({
    queryKey: ['group-students-reports', selectedGroup],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name)')
        .eq('group_id', selectedGroup)
        .eq('status', 'active')
        .is('deleted_at', null)
      return data || []
    },
    enabled: !!selectedGroup,
  })

  async function generateReport() {
    if (!selectedStudent) return
    setGenerating(true)
    setError('')
    setReport(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await supabase.functions.invoke('generate-report', {
        body: { student_id: selectedStudent, period_days: periodDays },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      if (res.error) throw new Error(typeof res.error === 'object' ? (res.error.message || 'خطأ في إنشاء التقرير') : String(res.error))
      if (res.data?.error) throw new Error(res.data.error)

      setReport(res.data.report)
    } catch (err) {
      setError(err.message || 'تعذر إنشاء التقرير')
    } finally {
      setGenerating(false)
    }
  }

  const ratingColors = {
    'ممتاز': 'text-emerald-400',
    'جيد جداً': 'text-sky-400',
    'جيد': 'text-yellow-400',
    'يحتاج تحسين': 'text-red-400',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileBarChart size={24} className="text-sky-400" />
          تقارير التقدم
        </h1>
        <p className="text-muted text-sm mt-1">تقارير أداء الطلاب بالذكاء الاصطناعي</p>
      </div>

      {/* Controls */}
      <div className="glass-card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted mb-1 block">المجموعة</label>
            <select
              className="input-field"
              value={selectedGroup}
              onChange={(e) => { setSelectedGroup(e.target.value); setSelectedStudent(''); setReport(null) }}
            >
              <option value="">اختر المجموعة</option>
              {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">الطالب</label>
            <select
              className="input-field"
              value={selectedStudent}
              onChange={(e) => { setSelectedStudent(e.target.value); setReport(null) }}
              disabled={!selectedGroup}
            >
              <option value="">اختر الطالب</option>
              {students?.map(s => (
                <option key={s.id} value={s.id}>
                  {s.profiles?.display_name || s.profiles?.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">الفترة</label>
            <select className="input-field" value={periodDays} onChange={(e) => setPeriodDays(Number(e.target.value))}>
              <option value={7}>أسبوع</option>
              <option value={14}>أسبوعين</option>
              <option value={30}>شهر</option>
            </select>
          </div>
        </div>
        <button
          onClick={generateReport}
          disabled={!selectedStudent || generating}
          className="btn-primary py-2.5 flex items-center gap-2"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          إنشاء التقرير
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Report display */}
      <AnimatePresence>
        {report && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
                    <User size={20} className="text-sky-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{report.student_name}</h2>
                    <p className="text-xs text-muted">آخر {report.period_days} يوم</p>
                  </div>
                </div>
                <div className="text-center">
                  <span className={`text-lg font-bold ${ratingColors[report.progress_rating] || 'text-white'}`}>
                    {report.progress_rating}
                  </span>
                  {report.engagement_score && (
                    <p className="text-xs text-muted">{report.engagement_score}/10 تفاعل</p>
                  )}
                </div>
              </div>
              {report.overview && <p className="text-sm text-white/80">{report.overview}</p>}
            </div>

            {/* Stats */}
            {report.stats && (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'التسليمات', value: report.stats.total_submissions },
                  { label: 'متوسط الدرجة', value: report.stats.avg_grade ? `${report.stats.avg_grade}%` : '—' },
                  { label: 'الحضور', value: report.stats.attendance_rate ? `${report.stats.attendance_rate}%` : '—' },
                  { label: 'XP', value: `+${report.stats.xp_earned}` },
                ].map((s, i) => (
                  <div key={i} className="glass-card p-3 text-center">
                    <p className="text-lg font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {/* Strengths */}
              {report.strengths?.length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="text-sm font-medium text-emerald-400 flex items-center gap-2 mb-3">
                    <TrendingUp size={16} />
                    نقاط القوة
                  </h3>
                  <ul className="space-y-2">
                    {report.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                        <Star size={12} className="text-emerald-400 mt-1 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {report.weaknesses?.length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="text-sm font-medium text-yellow-400 flex items-center gap-2 mb-3">
                    <TrendingDown size={16} />
                    نقاط تحتاج تحسين
                  </h3>
                  <ul className="space-y-2">
                    {report.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                        <AlertCircle size={12} className="text-yellow-400 mt-1 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {report.recommendations?.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-medium text-sky-400 flex items-center gap-2 mb-3">
                  <Sparkles size={16} />
                  توصيات
                </h3>
                <ul className="space-y-2">
                  {report.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-white/80">• {r}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.comparison_note && (
              <p className="text-xs text-muted text-center">{report.comparison_note}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
