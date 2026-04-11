import { useEffect, useState } from 'react'
import { Brain, Flame, Layers } from 'lucide-react'
import { supabase } from '../../lib/supabase'

/**
 * Mini dashboard card for vocabulary home: due today + streak + mature count.
 */
export default function AnkiStatsCard({ studentId, onOpen }) {
  const [stats, setStats] = useState({ due: 0, streak: 0, mature: 0 })

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!studentId) return
      const nowIso = new Date().toISOString()
      const [dueRes, stuRes, matureRes] = await Promise.all([
        supabase
          .from('anki_cards')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .or(`state.eq.new,and(state.neq.new,due_at.lte.${nowIso})`),
        supabase
          .from('students')
          .select('anki_streak_current')
          .eq('id', studentId)
          .maybeSingle(),
        supabase
          .from('anki_cards')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('state', 'review')
          .gte('stability', 21),
      ])
      if (cancelled) return
      setStats({
        due: dueRes.count || 0,
        streak: stuRes.data?.anki_streak_current || 0,
        mature: matureRes.count || 0,
      })
    }
    load()
    return () => {
      cancelled = true
    }
  }, [studentId])

  return (
    <button
      onClick={onOpen}
      dir="rtl"
      className="w-full glass-card p-4 flex items-center justify-between text-right hover:bg-white/5 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 flex items-center justify-center">
          <Brain size={18} className="text-amber-400" />
        </div>
        <div>
          <div className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">
            المراجعة اليومية
          </div>
          <div className="text-xs text-[var(--text-muted)] font-['Tajawal']">
            FSRS — تكرار متباعد ذكي
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Mini icon={<Flame size={12} />} value={stats.streak} tint="text-orange-400" />
        <Mini icon={<Layers size={12} />} value={stats.mature} tint="text-emerald-400" />
        <div className="text-xl font-bold text-amber-400 min-w-[28px] text-center">
          {stats.due}
        </div>
      </div>
    </button>
  )
}

function Mini({ icon, value, tint }) {
  return (
    <div className={`flex items-center gap-1 text-[11px] ${tint}`}>
      {icon}
      <span className="font-bold">{value}</span>
    </div>
  )
}
