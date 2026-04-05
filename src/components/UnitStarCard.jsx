import { motion } from 'framer-motion'

const BREAKDOWN_META = {
  completion: { icon: '📊', label: 'الإكمال' },
  quality: { icon: '⭐', label: 'الجودة' },
  vocabulary: { icon: '📚', label: 'المفردات' },
  speed: { icon: '⚡', label: 'السرعة' },
  effort: { icon: '💪', label: 'الجهد' },
}

const BONUS_ICONS = {
  full_completion: '💯',
  excellence_writing: '✍️',
  excellence_speaking: '🎙️',
  first_submit: '🥇',
  improved: '📈',
}

function getGapMessage(gap, rank) {
  if (rank === 2 && gap <= 5) return 'قريب جداً من النجم/ة! شوية تركيز وتوصل/ين 🔥'
  if (rank === 2) return 'المركز الثاني — أداء ممتاز! واصل/ي 🚀'
  if (rank === 3) return 'في المراكز المتقدمة — خطوة واحدة وتتصدر/ين! 💪'
  if (gap <= 10) return 'الفارق بسيط — مع شوية جهد تقدر/ين توصل/ين! ✨'
  return 'كل محاولة = تقدّم! واصل/ي وبتشوف/ين الفرق 🌟'
}

function getRankLabel(rank) {
  const labels = { 1: 'الأول/ى', 2: 'الثاني/ة', 3: 'الثالث/ة', 4: 'الرابع/ة', 5: 'الخامس/ة' }
  return labels[rank] || `#${rank}`
}

export default function UnitStarCard({ star, rankings, currentStudentId }) {
  if (!star) return null

  const isMe = star.studentId === currentStudentId
  const myRanking = rankings?.find(r => r.studentId === currentStudentId)
  const gap = myRanking ? Math.round((star.totalScore - myRanking.totalScore) * 10) / 10 : 0
  const onlyOne = rankings?.length === 1

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-[20px] p-6 sm:p-7 relative overflow-hidden"
      style={{
        background: isMe
          ? 'linear-gradient(165deg, rgba(251,191,36,0.1) 0%, rgba(245,158,11,0.05) 50%, rgba(217,119,6,0.1) 100%)'
          : 'linear-gradient(165deg, rgba(251,191,36,0.06) 0%, rgba(245,158,11,0.03) 50%, rgba(217,119,6,0.06) 100%)',
        border: `1px solid rgba(251,191,36,${isMe ? '0.3' : '0.15'})`,
      }}
    >
      {/* Sparkle decorations */}
      <div className="absolute top-3 right-4 text-amber-400/20 text-lg select-none">✦</div>
      <div className="absolute top-5 left-6 text-amber-400/15 text-sm select-none">✦</div>
      <div className="absolute bottom-4 right-8 text-amber-400/10 text-xs select-none">✦</div>

      {/* Header */}
      <div className="text-center mb-5">
        <div className="text-2xl mb-1">⭐</div>
        <h3 className="text-base font-bold text-amber-300 font-['Tajawal']">
          نجم/ة الوحدة
        </h3>
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center mb-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold mb-2"
          style={{
            border: '3px solid rgba(251,191,36,0.5)',
            boxShadow: '0 0 20px rgba(251,191,36,0.2)',
            background: star.avatar ? 'transparent' : 'rgba(251,191,36,0.1)',
            color: 'rgba(251,191,36,0.6)',
          }}
        >
          {star.avatar ? (
            <img src={star.avatar} className="w-full h-full rounded-full object-cover" alt="" />
          ) : (
            star.name?.charAt(0) || '?'
          )}
        </div>
        <span className="text-sm font-bold text-white font-['Tajawal']">{star.name}</span>
        {isMe && (
          <span className="text-xs text-amber-400 font-['Tajawal'] mt-0.5">مبروك! أنت نجم/ة هذه الوحدة! 👑</span>
        )}
        {onlyOne && !isMe && (
          <span className="text-[11px] text-white/40 font-['Tajawal'] mt-0.5">الوحيد/ة اللي سلّم/ت — واصل/ي!</span>
        )}
      </div>

      {/* Score Breakdown — mini bars */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {Object.entries(star.breakdown).map(([key, data]) => {
          const meta = BREAKDOWN_META[key]
          if (!meta) return null
          const pct = data.max > 0 ? (data.score / data.max) * 100 : 0
          return (
            <div key={key} className="text-center">
              <div className="text-[11px] text-white/50 font-['Tajawal'] mb-1">
                {meta.icon} {meta.label}
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mx-auto max-w-[80px]" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                  }}
                />
              </div>
              <div className="text-[10px] text-amber-400/70 font-['Inter'] tabular-nums mt-0.5">
                {data.score}/{data.max}
              </div>
            </div>
          )
        })}
      </div>

      {/* Total Score */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.12)' }}>
          <span className="text-sm">🏆</span>
          <span className="text-sm font-bold text-amber-300 font-['Tajawal']">النتيجة:</span>
          <span className="text-base font-bold text-amber-300 font-['Inter'] tabular-nums">{star.totalScore}</span>
          <span className="text-xs text-white/40 font-['Tajawal']">نقطة</span>
        </div>
      </div>

      {/* Bonuses */}
      {star.bonuses?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 mb-4">
          {star.bonuses.map((b, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-['Tajawal']"
              style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.1)', color: 'rgba(251,191,36,0.7)' }}
            >
              {BONUS_ICONS[b.type] || '🎯'} {b.label}
              <span className="text-amber-400/50 font-['Inter'] text-[10px]">+{b.points}</span>
            </span>
          ))}
        </div>
      )}

      {/* Current student's position (if not the star) */}
      {!isMe && myRanking && !onlyOne && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(251,191,36,0.08)' }}>
          <div className="text-center">
            <div className="text-xs text-white/40 font-['Tajawal'] mb-1">
              ترتيبك: {getRankLabel(myRanking.rank)} — فارق {gap} نقطة عن النجم/ة
            </div>
            <div className="text-xs text-white/50 font-['Tajawal']">
              {getGapMessage(gap, myRanking.rank)}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
