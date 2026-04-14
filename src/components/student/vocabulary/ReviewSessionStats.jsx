import { motion } from 'framer-motion'

export default function ReviewSessionStats({ stats, onClose }) {
  const { reviewed, correct, xpEarned, mastered } = stats
  const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-sm mx-4 rounded-2xl p-6 text-center space-y-6"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Celebration */}
      <div className="space-y-2">
        <p className="text-5xl">{accuracy >= 80 ? '🎉' : accuracy >= 50 ? '💪' : '📚'}</p>
        <h2 className="text-lg font-bold text-white font-['Tajawal']">
          {accuracy >= 80 ? 'أداء ممتاز!' : accuracy >= 50 ? 'جهد طيب!' : 'واصل التمرين!'}
        </h2>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="راجعت" value={reviewed} unit="كلمة" color="#38bdf8" />
        <StatBox label="صح" value={`${correct}/${reviewed}`} unit={`${accuracy}%`} color="#22c55e" />
        <StatBox label="نقاط مكتسبة" value={`+${xpEarned}`} unit="XP" color="#f59e0b" />
        {mastered > 0 && (
          <StatBox label="أتقنت" value={mastered} unit="كلمة جديدة" color="#a855f7" />
        )}
      </div>

      {/* Back button */}
      <button
        onClick={onClose}
        className="w-full py-3 rounded-xl text-sm font-bold text-white font-['Tajawal'] transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(129,140,248,0.2))', border: '1px solid rgba(56,189,248,0.25)' }}
      >
        العودة للرئيسية
      </button>
    </motion.div>
  )
}

function StatBox({ label, value, unit, color }) {
  return (
    <div className="rounded-xl p-3" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
      <p className="text-2xl font-black font-['Inter']" style={{ color }}>{value}</p>
      <p className="text-[11px] text-white/40 font-['Tajawal'] mt-0.5">{label}</p>
      <p className="text-[10px] font-['Tajawal']" style={{ color: `${color}80` }}>{unit}</p>
    </div>
  )
}
