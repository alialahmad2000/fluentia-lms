import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Flame, Play, Settings, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'

/**
 * Landing screen for daily Anki review.
 * Shows counts (new + due), streak, and the big "Start" button.
 */
export default function AnkiHome({ studentId, settings, onStart, onOpenSettings, onBack }) {
  const [counts, setCounts] = useState({ newCount: 0, dueCount: 0, total: 0 })
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!studentId) return
      setLoading(true)

      const nowIso = new Date().toISOString()

      const [newRes, dueRes, totalRes, stuRes] = await Promise.all([
        supabase
          .from('anki_cards')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('state', 'new'),
        supabase
          .from('anki_cards')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .neq('state', 'new')
          .lte('due_at', nowIso),
        supabase
          .from('anki_cards')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId),
        supabase
          .from('students')
          .select('anki_streak_current')
          .eq('id', studentId)
          .maybeSingle(),
      ])

      if (cancelled) return
      const rawNew = newRes.count || 0
      const cappedNew = Math.min(rawNew, settings?.daily_new_cards || 20)
      const rawDue = dueRes.count || 0
      const cappedDue = Math.min(rawDue, settings?.daily_max_reviews || 200)
      setCounts({
        newCount: cappedNew,
        dueCount: cappedDue,
        total: totalRes.count || 0,
      })
      setStreak(stuRes.data?.anki_streak_current || 0)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [studentId, settings])

  const totalToday = counts.newCount + counts.dueCount
  const hasWork = totalToday > 0

  return (
    <div dir="rtl" className="flex flex-col gap-5 max-w-xl mx-auto">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors w-fit"
        >
          <ArrowRight size={16} />
          <span className="font-['Tajawal']">رجوع</span>
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 text-center space-y-5"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 flex items-center justify-center">
            <Brain size={24} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal']">
              المراجعة اليومية
            </h2>
            <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
              تكرار متباعد بخوارزمية FSRS
            </p>
          </div>
        </div>

        {/* Streak */}
        <div className="flex items-center justify-center gap-2">
          <Flame size={18} className={streak > 0 ? 'text-orange-400' : 'text-slate-600'} />
          <span className="text-sm font-['Tajawal'] text-[var(--text-secondary)]">
            {streak > 0 ? `${streak} يوم متتالي` : 'ابدأ سلسلتك اليوم'}
          </span>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <CounterBlock
            label="كلمات جديدة"
            value={loading ? '…' : counts.newCount}
            accent="sky"
          />
          <CounterBlock
            label="مراجعات مستحقة"
            value={loading ? '…' : counts.dueCount}
            accent="emerald"
          />
        </div>

        <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] pt-1">
          إجمالي بطاقاتك: {counts.total}
        </p>

        {/* Start button */}
        <button
          onClick={onStart}
          disabled={!hasWork || loading}
          className={[
            'w-full h-14 rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-2',
            'font-[\'Tajawal\']',
            hasWork
              ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed',
          ].join(' ')}
        >
          <Play size={20} />
          {hasWork ? `ابدأ المراجعة (${totalToday})` : 'لا توجد مراجعات اليوم'}
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mx-auto font-['Tajawal']"
        >
          <Settings size={14} />
          إعدادات المراجعة
        </button>
      </motion.div>
    </div>
  )
}

function CounterBlock({ label, value, accent }) {
  const ring = accent === 'sky' ? 'border-sky-500/30' : 'border-emerald-500/30'
  const text = accent === 'sky' ? 'text-sky-400' : 'text-emerald-400'
  return (
    <div className={`rounded-2xl border ${ring} bg-[var(--surface-raised)] p-4`}>
      <div className={`text-3xl font-bold ${text}`}>{value}</div>
      <div className="text-xs text-[var(--text-muted)] mt-1 font-['Tajawal']">{label}</div>
    </div>
  )
}
