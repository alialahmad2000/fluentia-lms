import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Eye, Loader2, BookOpen, Calendar, Trophy, Zap, Flame,
  CheckCircle2, BarChart3, CreditCard, Lock,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

const SKILL_LABELS = {
  grammar: 'القرامر',
  vocabulary: 'المفردات',
  speaking: 'المحادثة',
  listening: 'الاستماع',
  reading: 'القراءة',
  writing: 'الكتابة',
}

const ACADEMIC_LEVELS = {
  1: 'A1 - مبتدئ',
  2: 'A2 - أساسي',
  3: 'B1 - متوسط',
  4: 'B2 - فوق المتوسط',
  5: 'C1 - متقدم',
  6: 'C2 - إتقان',
}

const PAYMENT_STATUS = {
  paid: { label: 'مدفوع', color: 'emerald' },
  pending: { label: 'معلق', color: 'gold' },
  overdue: { label: 'متأخر', color: 'red' },
  partial: { label: 'جزئي', color: 'amber' },
}

const ICON_COLOR_CLASSES = {
  sky: 'text-sky-400',
  gold: 'text-gold-400',
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
}

const PAYMENT_COLOR_CLASSES = {
  emerald: 'bg-emerald-500/10 text-emerald-400',
  gold: 'bg-gold-500/10 text-gold-400',
  red: 'bg-red-500/10 text-red-400',
  amber: 'bg-amber-500/10 text-amber-400',
}

export default function ParentDashboard() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  async function handleAccess(e) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await invokeWithRetry('parent-dashboard', {
        body: { access_code: code.trim() },
      })

      if (res.error || res.data?.error) {
        setError(res.data?.error || 'رمز غير صالح')
        return
      }

      setData(res.data)
    } catch {
      setError('حدث خطأ — حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-bg-base)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-playfair font-bold text-gradient mb-2">Fluentia</h1>
            <p className="text-muted text-sm">لوحة متابعة ولي الأمر</p>
          </div>

          <div className="glass-card-raised p-7">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
                <Lock size={16} className="text-sky-400" />
              </div>
              <h2 className="font-medium text-white">أدخل رمز الوصول</h2>
            </div>

            <form onSubmit={handleAccess} className="space-y-4">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input-field w-full text-center text-lg tracking-widest"
                placeholder="XXXX-XXXX"
                dir="ltr"
              />
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <button
                type="submit"
                disabled={!code.trim() || loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                عرض التقدم
              </button>
            </form>

            <p className="text-[10px] text-muted text-center mt-4">
              يمكنك الحصول على رمز الوصول من المدرب أو إدارة الأكاديمية
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  const { student, grades = {}, attendance = {}, assignments = {}, skills, payments } = data

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--color-bg-base)' }}>
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-2xl font-playfair font-bold text-gradient mb-1">Fluentia</h1>
          <p className="text-muted text-xs">لوحة متابعة ولي الأمر</p>
        </motion.div>

        {/* Student info */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-7">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center text-xl font-bold text-sky-400">
              {student?.name?.[0] || '?'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{student.name}</h2>
              <p className="text-muted text-sm">
                {ACADEMIC_LEVELS[student.level] || 'غير محدد'} — {student.group || ''}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'النقاط', value: `${student?.xp ?? 0} XP`, icon: Zap, color: 'sky' },
            { label: 'السلسلة', value: `${student?.streak ?? 0} يوم`, icon: Flame, color: 'gold' },
            { label: 'الحضور', value: attendance?.rate != null ? `${attendance.rate}%` : '—', icon: Calendar, color: 'emerald' },
            { label: 'متوسط الدرجة', value: grades?.average ? `${grades.average}%` : '—', icon: Trophy, color: 'violet' },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-4 hover:translate-y-[-2px] transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted text-xs">{card.label}</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${card.color === 'sky' ? 'bg-sky-500/10' : card.color === 'gold' ? 'bg-gold-500/10' : card.color === 'emerald' ? 'bg-emerald-500/10' : 'bg-violet-500/10'}`}>
                  <card.icon size={16} className={ICON_COLOR_CLASSES[card.color] || 'text-sky-400'} />
                </div>
              </div>
              <p className="text-xl font-bold text-white">{card.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Assignment completion */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-7">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <BookOpen size={16} className="text-sky-400" />
            </div>
            <h3 className="font-medium text-white">الواجبات</h3>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">{assignments?.completed ?? 0} من {assignments?.total ?? 0} مكتملة</span>
            <span className="text-sm font-bold text-sky-400">{assignments?.rate || 0}%</span>
          </div>
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-sky-400 to-sky-600 rounded-full transition-all"
              style={{ width: `${assignments?.rate || 0}%` }}
            />
          </div>
        </motion.div>

        {/* Skills */}
        {skills && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-7">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <BarChart3 size={16} className="text-violet-400" />
            </div>
              <h3 className="font-medium text-white">المهارات</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(SKILL_LABELS).map(([key, label]) => {
                const value = skills[key] || 0
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted">{label}</span>
                      <span className="text-white font-medium">{value}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-sky-500' : value >= 40 ? 'bg-gold-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Recent grades */}
        {grades?.recent?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-7">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
              <h3 className="font-medium text-white">آخر الدرجات</h3>
            </div>
            <div className="space-y-2">
              {grades.recent.map((g, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                  <div>
                    <p className="text-sm text-white">{g.title}</p>
                    <p className="text-[10px] text-muted">{g.type}</p>
                  </div>
                  <span className={`text-sm font-bold ${
                    g.score >= 90 ? 'text-emerald-400' : g.score >= 70 ? 'text-sky-400' : g.score >= 50 ? 'text-gold-400' : 'text-red-400'
                  }`}>
                    {g.grade} ({g.score}%)
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Payments */}
        {payments?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-7">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gold-500/10 flex items-center justify-center">
              <CreditCard size={16} className="text-gold-400" />
            </div>
              <h3 className="font-medium text-white">المدفوعات</h3>
            </div>
            <div className="space-y-2">
              {payments.map((p, i) => {
                const ps = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.pending
                return (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                    <div>
                      <p className="text-sm text-white">{p.amount} ر.س</p>
                      <p className="text-[10px] text-muted">{p.period}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_COLOR_CLASSES[ps.color] || 'bg-sky-500/10 text-sky-400'}`}>
                      {ps.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        <p className="text-center text-[10px] text-muted py-4">
          Fluentia LMS — {data.parent_name ? `مرحباً ${data.parent_name}` : 'لوحة متابعة ولي الأمر'}
        </p>
      </div>
    </div>
  )
}
