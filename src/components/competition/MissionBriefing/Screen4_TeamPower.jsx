import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

const STREAK_MILESTONES = [
  { days: 3,  xp: 75,    icon: '🔥' },
  { days: 5,  xp: 200,   icon: '🔥' },
  { days: 7,  xp: 500,   icon: '⚡' },
  { days: 14, xp: 1500,  icon: '⚡' },
]

const WEEKLY_TIERS = [
  { pct: 50,  xp: 150,  icon: '🥉', label: 'برونز' },
  { pct: 70,  xp: 400,  icon: '🥈', label: 'فضي' },
  { pct: 90,  xp: 800,  icon: '🏅', label: 'ذهبي' },
  { pct: 100, xp: 1200, icon: '💎', label: 'ماسي' },
]

function Panel({ title, emoji, color, children, delay }) {
  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${color}30` }}
    >
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: `${color}12` }}>
        <span className="text-xl">{emoji}</span>
        <span className="font-bold text-sm" style={{ color }}>{title}</span>
      </div>
      <div className="px-4 py-3 space-y-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
        {children}
      </div>
    </motion.div>
  )
}

export default function Screen4_TeamPower({ comp, ctx, myTeam }) {
  const color = myTeam?.color ?? '#38bdf8'
  const teamSize = ctx?.team_size ?? '?'

  return (
    <div className="px-5 py-6">
      {/* Header */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="text-center mb-5"
      >
        <div className="text-4xl mb-2">🔥</div>
        <div className="text-lg font-black text-white">روح الفريق تصنع الفارق</div>
        <div className="text-xs text-slate-500 mt-1">مكافآت جماعية تُضاف تلقائياً لرصيد فريقك</div>
      </motion.div>

      <div className="space-y-3">
        {/* Streak panel */}
        <Panel title="ستريك الفريق اليومي" emoji="🔥" color="#fb923c" delay={0.1}>
          <div className="text-xs text-slate-400 mb-2">
            إذا نشط 80% من الفريق يومياً — الستريك يستمر
          </div>
          <div className="grid grid-cols-2 gap-2">
            {STREAK_MILESTONES.map((m) => (
              <div
                key={m.days}
                className="rounded-xl p-2.5 text-center"
                style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}
              >
                <div className="text-base">{m.icon}</div>
                <div className="text-xs text-slate-400 mt-0.5">{m.days} أيام</div>
                <div className="text-sm font-black text-orange-400">+{m.xp} XP</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Weekly goal panel */}
        <Panel title="تحدي الوحدة الأسبوعية" emoji="🎯" color="#22c55e" delay={0.2}>
          <div className="text-xs text-slate-400 mb-2">
            الأسبوع 1: وحدة 4 · الأسبوع 2: وحدة 5
          </div>
          <div className="space-y-1.5">
            {WEEKLY_TIERS.map((tier) => (
              <div key={tier.pct} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{tier.icon}</span>
                  <span className="text-xs text-slate-300">{tier.pct}% من الفريق يكمل</span>
                </div>
                <span className="text-sm font-black text-green-400">+{tier.xp} XP</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Encouragement panel */}
        <Panel title="تشجيع الزملاء" emoji="💪" color="#a78bfa" delay={0.3}>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-xl font-black text-purple-400">+2</div>
              <div className="text-xs text-slate-500">XP لك</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-purple-400">+3</div>
              <div className="text-xs text-slate-500">XP للزميل</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 text-center mt-1">
            حد 5 تشجيعات يومياً — زميلك قوي = فريقك قوي
          </div>
        </Panel>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="text-center mt-4"
      >
        <a
          href="/student/competition/rules"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300"
          style={{ textDecoration: 'none' }}
        >
          <ExternalLink size={12} />
          تفاصيل أكثر في صفحة القواعد
        </a>
      </motion.div>
    </div>
  )
}
