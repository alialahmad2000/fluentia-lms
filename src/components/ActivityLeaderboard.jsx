import { motion } from 'framer-motion'

const getRankBadge = (rank) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

const scoreColor = (s) => s >= 8 ? '#22c55e' : s >= 6 ? '#fbbf24' : '#ef4444'

const getMotivationalMessage = (rank, total, avgScore, scoreDiffFromFirst) => {
  if (rank === 1) {
    if (avgScore >= 9) return { emoji: '👑', title: 'أداء أسطوري!', message: 'أنت الأول/ى على مجموعتك بتقييم استثنائي! واصل/ي هالمستوى الخرافي 🔥' }
    return { emoji: '🥇', title: 'مبروك المركز الأول!', message: 'أنت في القمة! واصل/ي التألق وكن/كوني قدوة لزملائك 🌟' }
  }
  if (rank === 2) {
    if (scoreDiffFromFirst <= 0.5) return { emoji: '🔥', title: 'قريب جداً من القمة!', message: `فارق ${scoreDiffFromFirst} نقطة بس عن المركز الأول — المرة الجاية تقدر/ين تتصدر/ين! 💪` }
    return { emoji: '🥈', title: 'المركز الثاني — ممتاز!', message: 'أداء رائع! شوية تركيز زيادة وتوصل/ين للأول 🚀' }
  }
  if (rank === 3) return { emoji: '🥉', title: 'في المراكز المتقدمة!', message: `أداؤك أفضل من ${Math.round(((total - rank) / total) * 100)}% من زملائك — واصل/ي الصعود! 📈` }
  if (rank <= Math.ceil(total / 2)) return { emoji: '💪', title: 'في الطريق الصحيح!', message: `فارق ${scoreDiffFromFirst} نقطة بس عن المركز الأول — مع شوية جهد إضافي تقدر/ين توصل/ين! ✨` }
  if (scoreDiffFromFirst <= 2) return { emoji: '🌱', title: 'الفارق بسيط جداً!', message: `ترى الفارق بينك وبين الأول بس ${scoreDiffFromFirst} نقطة — يعني مافيه شي يمنعك توصل/ين! جهد بسيط وتنقلب المعادلة 🎯` }
  return { emoji: '🚀', title: 'كل محاولة = تقدّم!', message: 'كل مرة تسلم/ين فيها نشاط أنت تتحسن/ين — واصل/ي والنتائج بتبهرك! 🌟' }
}

export { getMotivationalMessage, scoreColor as leaderboardScoreColor }

export default function ActivityLeaderboard({ rankings, currentStudentId, totalInGroup }) {
  if (!rankings?.length || rankings.length < 2) return null

  const myRanking = rankings.find(r => r.studentId === currentStudentId)
  const firstScore = rankings[0]?.avgScore || 0
  const scoreDiff = myRanking ? Math.round((firstScore - myRanking.avgScore) * 10) / 10 : 0
  const motivation = myRanking ? getMotivationalMessage(myRanking.rank, rankings.length, myRanking.avgScore, scoreDiff) : null

  const motiveBg = myRanking?.rank === 1
    ? 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(245,158,11,0.04))'
    : myRanking?.rank <= 3
      ? 'linear-gradient(135deg, rgba(56,189,248,0.06), rgba(129,140,248,0.04))'
      : 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(16,185,129,0.04))'
  const motiveBorder = myRanking?.rank === 1
    ? 'rgba(251,191,36,0.15)'
    : myRanking?.rank <= 3
      ? 'rgba(56,189,248,0.1)'
      : 'rgba(34,197,94,0.1)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="rounded-2xl p-5 space-y-4"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <h3 className="text-base font-bold text-white font-['Tajawal']">ترتيب الأداء</h3>
        </div>
        <p className="text-xs text-white/40 font-['Tajawal'] mt-0.5">
          سلّم {rankings.length} من {totalInGroup} طلاب
        </p>
      </div>

      {/* Rankings */}
      <div className="space-y-1.5">
        {rankings.map((r, i) => {
          const isMe = r.studentId === currentStudentId
          const badge = getRankBadge(r.rank)
          const sc = scoreColor(r.avgScore)
          const barWidth = `${(r.avgScore / 10) * 100}%`

          return (
            <motion.div
              key={r.studentId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 py-2.5 px-3.5 rounded-xl transition-all ${
                isMe
                  ? 'border border-sky-500/20'
                  : r.rank === 1
                    ? 'border border-amber-500/10'
                    : 'border border-transparent'
              }`}
              style={{
                background: isMe
                  ? 'rgba(56,189,248,0.08)'
                  : r.rank === 1
                    ? 'rgba(251,191,36,0.04)'
                    : 'rgba(255,255,255,0.015)',
              }}
            >
              {/* Rank */}
              <div className="w-7 flex items-center justify-center flex-shrink-0">
                {badge ? (
                  <span className="text-base">{badge}</span>
                ) : (
                  <span className="text-xs font-bold text-white/30 font-['Inter'] tabular-nums">{r.rank}</span>
                )}
              </div>

              {/* Avatar */}
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                {r.avatar ? (
                  <img src={r.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                ) : (
                  r.name?.charAt(0) || '?'
                )}
              </div>

              {/* Name */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className={`text-sm font-semibold font-['Tajawal'] truncate ${isMe ? 'text-sky-400' : 'text-white/70'}`}>
                  {r.name}
                </span>
                {isMe && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-400 flex-shrink-0">أنت</span>
                )}
              </div>

              {/* Score bar + number */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: barWidth, background: sc, transition: 'width 0.5s' }} />
                </div>
                <span className="text-xs font-bold tabular-nums font-['Inter'] w-10 text-left" style={{ color: sc }}>
                  {r.avgScore}/10
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Motivational message */}
      {motivation && (
        <div className="rounded-xl px-5 py-4 text-center" style={{ background: motiveBg, border: `1px solid ${motiveBorder}` }}>
          <div className="text-2xl mb-2">{motivation.emoji}</div>
          <div className="text-sm font-bold text-white font-['Tajawal']">{motivation.title}</div>
          <div className="text-xs text-white/50 font-['Tajawal'] leading-relaxed mt-1">{motivation.message}</div>
        </div>
      )}
    </motion.div>
  )
}
