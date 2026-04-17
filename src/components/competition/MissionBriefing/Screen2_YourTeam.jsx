import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'

const REDUCED = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Screen2_YourTeam({ comp, ctx, myTeam, profile }) {
  const color = myTeam?.color ?? '#38bdf8'
  const studentName = profile?.display_name || profile?.full_name || 'أهلاً'
  const isRankOne = ctx?.my_rank === 1 && ctx?.team_size > 1
  const rankLabel = ctx?.my_rank ? `#${ctx.my_rank} من ${ctx.team_size}` : '—'
  const xpContributed = ctx?.my_xp_this_competition ?? 0

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8 text-center">
      {/* Background glow */}
      {!REDUCED && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% 30%, ${color}14 0%, transparent 70%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Team emoji — spring entrance */}
      <motion.div
        initial={{ scale: 0.2, opacity: 0, rotate: -15 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.05 }}
        className="relative z-10 text-8xl mb-5"
      >
        {myTeam?.emoji ?? '⚔️'}
      </motion.div>

      {/* Greeting */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 mb-6"
      >
        <div className="text-slate-400 text-base mb-1">مرحباً {studentName}، أنت الآن في</div>
        <div className="text-3xl font-black mb-1" style={{ color }}>
          {myTeam?.name ?? ''}
        </div>
        {myTeam?.battle_cry && (
          <div className="text-sm text-slate-400 italic mt-1">"{myTeam.battle_cry}"</div>
        )}
        {isRankOne && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.4 }}
            className="flex items-center justify-center gap-1.5 mt-3 text-yellow-400 font-bold text-sm"
          >
            <Crown size={16} />
            أنت القائد الآن!
          </motion.div>
        )}
      </motion.div>

      {/* Personal stats card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 w-full max-w-xs rounded-2xl p-5 mb-6"
        style={{ background: `${color}12`, border: `1px solid ${color}35` }}
      >
        <div className="text-xs font-bold text-slate-500 mb-4 text-center">مساهمتي الحالية</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-black tabular-nums" style={{ color }}>{xpContributed}</div>
            <div className="text-xs text-slate-500 mt-0.5">XP أضفته</div>
          </div>
          <div className="text-center" style={{ borderLeft: `1px solid ${color}25`, borderRight: `1px solid ${color}25` }}>
            <div className="text-2xl font-black tabular-nums" style={{ color }}>
              {ctx?.my_rank ? `#${ctx.my_rank}` : '—'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">ترتيبي</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black tabular-nums" style={{ color }}>{ctx?.team_size ?? '—'}</div>
            <div className="text-xs text-slate-500 mt-0.5">بالفريق</div>
          </div>
        </div>
      </motion.div>

      {/* Goal statement */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="relative z-10 space-y-1"
      >
        <div className="font-bold text-white">هدفك: اكسب XP قدر ما تقدر</div>
        <div className="text-sm text-slate-400">فوز فريقك = فوزك الشخصي 🏆</div>
      </motion.div>
    </div>
  )
}
