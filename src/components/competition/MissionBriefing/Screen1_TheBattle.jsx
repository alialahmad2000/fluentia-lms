import { motion } from 'framer-motion'
import { Swords } from 'lucide-react'

const REDUCED = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useCountUp(target, duration = 1000) {
  return target // Simplified for SSR safety — browser animation happens via CSS
}

export default function Screen1_TheBattle({ comp, ctx, myTeam }) {
  const teamA = comp?.team_a
  const teamB = comp?.team_b
  const endDate = comp?.end_at ? new Date(comp.end_at) : null
  const endLabel = endDate
    ? endDate.toLocaleDateString('ar-SA', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '30 أبريل 11:59 مساءً'

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8 text-center">
      {/* Aurora blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {!REDUCED && teamA && (
          <div
            className="absolute"
            style={{
              top: '10%', left: '-10%', width: '50%', height: '50%',
              background: `radial-gradient(ellipse, ${teamA.color}20 0%, transparent 70%)`,
            }}
          />
        )}
        {!REDUCED && teamB && (
          <div
            className="absolute"
            style={{
              top: '10%', right: '-10%', width: '50%', height: '50%',
              background: `radial-gradient(ellipse, ${teamB.color}20 0%, transparent 70%)`,
            }}
          />
        )}
      </div>

      {/* VS badge */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 280, delay: 0.1 }}
        className="relative z-10 mb-6"
      >
        <motion.div
          animate={REDUCED ? {} : { scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="text-7xl mb-3"
        >
          ⚔️
        </motion.div>
        <div className="text-2xl font-black text-white">تحدي طلاقة أبريل</div>
        <div className="text-sm text-slate-400 mt-1">فريقان · أسبوعان · فائز واحد</div>
      </motion.div>

      {/* Teams VS layout */}
      {teamA && teamB && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="relative z-10 grid grid-cols-2 gap-4 w-full max-w-xs mb-6"
        >
          {[teamA, teamB].map((t) => {
            const isMyTeam = myTeam?.name === t.name
            return (
              <div
                key={t.name}
                className="rounded-2xl p-4 text-center"
                style={{
                  background: `${t.color}12`,
                  border: `1px solid ${t.color}${isMyTeam ? '55' : '25'}`,
                  boxShadow: isMyTeam ? `0 0 20px ${t.color}18` : undefined,
                }}
              >
                {isMyTeam && (
                  <div className="text-[10px] font-black text-yellow-400 mb-1">← فريقك</div>
                )}
                <div className="text-3xl mb-1">{t.emoji}</div>
                <div className="font-bold text-white text-sm mb-2">{t.name}</div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl font-black tabular-nums"
                  style={{ color: t.color }}
                >
                  {t.victory_points}
                </motion.div>
                <div className="text-xs text-slate-500 mt-0.5">VP</div>
              </div>
            )
          })}
        </motion.div>
      )}

      {/* End date */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 flex items-center gap-2 text-sm text-slate-400"
      >
        <Swords size={14} className="text-slate-500" />
        <span>ينتهي {endLabel}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="relative z-10 mt-4 text-xs text-slate-600"
      >
        الشاشة 1 من 5 — اقرأ بتمعّن، هذا يؤثر على فريقك
      </motion.div>
    </div>
  )
}
