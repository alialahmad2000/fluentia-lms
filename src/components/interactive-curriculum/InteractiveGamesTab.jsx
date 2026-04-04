import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Gamepad2, Users, Trophy, Target, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const GAME_TYPE_LABELS = {
  anki: 'بطاقات ذكية',
  match: 'مطابقة',
  speed: 'سرعة',
  scramble: 'ترتيب حروف',
  fill: 'أكمل الفراغ',
  quiz: 'اختبار',
  memory: 'ذاكرة',
  speed_vocab: 'مفردات سريعة',
  matching: 'مطابقة',
  word_scramble: 'ترتيب كلمات',
  fill_blank: 'أكمل الفراغ',
  flashcards: 'بطاقات',
}

export default function InteractiveGamesTab({ unitId, groupId, students = [] }) {
  // Fetch game sessions for students in this group
  const { data: gameSessions, isLoading } = useQuery({
    queryKey: ['ic-game-sessions', groupId],
    queryFn: async () => {
      const studentIds = students.map(s => s.user_id)
      if (!studentIds.length) return []
      const { data } = await supabase
        .from('game_sessions')
        .select('*')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })
        .limit(200)
      return data || []
    },
    enabled: !!groupId && students.length > 0,
    staleTime: 30000,
  })

  const studentMap = useMemo(() => {
    const map = {}
    students.forEach(s => { map[s.user_id] = s })
    return map
  }, [students])

  // Aggregate stats per student
  const studentStats = useMemo(() => {
    if (!gameSessions?.length) return []
    const statsMap = {}
    gameSessions.forEach(g => {
      if (!statsMap[g.student_id]) {
        statsMap[g.student_id] = { totalGames: 0, totalAccuracy: 0, bestScore: 0, totalTime: 0 }
      }
      const s = statsMap[g.student_id]
      s.totalGames++
      s.totalAccuracy += g.accuracy_percent || 0
      if ((g.accuracy_percent || 0) > s.bestScore) s.bestScore = g.accuracy_percent || 0
      s.totalTime += g.time_seconds || 0
    })

    return students.map(student => {
      const stats = statsMap[student.user_id]
      return {
        ...student,
        totalGames: stats?.totalGames || 0,
        avgAccuracy: stats?.totalGames ? Math.round(stats.totalAccuracy / stats.totalGames) : 0,
        bestScore: Math.round(stats?.bestScore || 0),
        totalTime: stats?.totalTime || 0,
      }
    }).sort((a, b) => b.totalGames - a.totalGames)
  }, [students, gameSessions])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
        ))}
      </div>
    )
  }

  if (!gameSessions?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Gamepad2 size={40} className="text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد ألعاب مسجلة بعد</p>
      </div>
    )
  }

  const totalGamesPlayed = gameSessions.length
  const avgAccuracy = gameSessions.length > 0
    ? Math.round(gameSessions.reduce((sum, g) => sum + (g.accuracy_percent || 0), 0) / gameSessions.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Overall stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Gamepad2} label="إجمالي الألعاب" value={totalGamesPlayed} color="#38bdf8" />
        <StatCard icon={Target} label="متوسط الدقة" value={`${avgAccuracy}%`} color="#22c55e" />
        <StatCard icon={Users} label="الطلاب النشطون" value={studentStats.filter(s => s.totalGames > 0).length} color="#a78bfa" />
      </div>

      {/* Student leaderboard */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">ترتيب الطلاب</h3>
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="divide-y divide-[rgba(255,255,255,0.04)]">
            {studentStats.map((student, idx) => (
              <div
                key={student.user_id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
              >
                {/* Rank */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  idx === 0 ? 'bg-amber-500/20 text-amber-400' : idx === 1 ? 'bg-slate-400/20 text-slate-400' : idx === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-[var(--surface-raised)] text-[var(--text-muted)]'
                }`}>
                  {idx + 1}
                </div>

                {/* Avatar + name */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
                    {student.avatar_url ? <img src={student.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" /> : student.full_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm text-[var(--text-primary)] font-['Tajawal'] truncate">{student.full_name}</span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {student.totalGames > 0 ? (
                    <>
                      <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">{student.totalGames} لعبة</span>
                      <span className="text-xs font-bold font-['Inter']" style={{ color: student.avgAccuracy >= 70 ? '#22c55e' : student.avgAccuracy >= 40 ? '#f59e0b' : '#ef4444' }}>
                        {student.avgAccuracy}%
                      </span>
                      <div className="flex items-center gap-0.5">
                        <Trophy size={11} className="text-amber-400" />
                        <span className="text-[10px] text-amber-400 font-['Inter']">{student.bestScore}%</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">لم تلعب بعد</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent games */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">آخر الألعاب</h3>
        <div className="space-y-2">
          {gameSessions.slice(0, 15).map(game => {
            const student = studentMap[game.student_id]
            return (
              <div
                key={game.id}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
                  {student?.full_name?.charAt(0) || '?'}
                </div>
                <span className="text-xs text-[var(--text-primary)] font-['Tajawal'] truncate flex-1">{student?.full_name || 'طالب'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-base)] text-[var(--text-muted)] font-['Inter']">
                  {GAME_TYPE_LABELS[game.game_type] || game.game_type}
                </span>
                <span className="text-xs font-bold font-['Inter']" style={{ color: (game.accuracy_percent || 0) >= 70 ? '#22c55e' : '#f59e0b' }}>
                  {game.accuracy_percent || 0}%
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-['Tajawal']">
                  {formatTimeAgo(game.created_at)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl p-4" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
      <Icon size={18} style={{ color }} />
      <p className="text-lg font-bold text-[var(--text-primary)] mt-2 font-['Inter']">{value}</p>
      <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{label}</p>
    </div>
  )
}

function formatTimeAgo(date) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} د`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} س`
  const days = Math.floor(hours / 24)
  return `${days} ي`
}
