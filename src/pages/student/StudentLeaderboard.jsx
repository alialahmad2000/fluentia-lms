import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Crown, Medal, Users, Flame, Share2, BarChart3 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { ListSkeleton } from '../../components/ui/PageSkeleton'
import EmptyState from '../../components/ui/EmptyState'
import { supabase } from '../../lib/supabase'
import { GAMIFICATION_LEVELS } from '../../lib/constants'
import { shareToWhatsApp, shareToTwitter, copyToClipboard, generateShareText } from '../../utils/socialShare'

function getLevel(xp) {
  for (let i = GAMIFICATION_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= GAMIFICATION_LEVELS[i].xp) return GAMIFICATION_LEVELS[i]
  }
  return GAMIFICATION_LEVELS[0]
}

const RANK_STYLES = {
  0: { bg: 'bg-gold-500/10', border: 'border-gold-500/30', text: 'text-gold-400', icon: Crown },
  1: { bg: 'bg-slate-300/10', border: 'border-slate-300/30', text: 'text-slate-300', icon: Medal },
  2: { bg: 'bg-amber-600/10', border: 'border-amber-600/30', text: 'text-amber-500', icon: Medal },
}

const PERIOD_OPTIONS = [
  { value: 'week', label: 'هذا الأسبوع' },
  { value: 'month', label: 'هذا الشهر' },
  { value: 'all', label: 'كل الأوقات' },
]

const TAB_OPTIONS = [
  { value: 'group', label: 'المجموعة', icon: Users },
  { value: 'teams', label: 'الفرق', icon: Users },
  { value: 'academy', label: 'الأكاديمية', icon: Trophy },
]

// ─── Share Rank Button ─────────────────────────────────────────────────────────
function ShareRankButton({ rank, total }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareText = generateShareText('leaderboard', { rank })

  async function handleCopy() {
    const ok = await copyToClipboard(shareText)
    if (ok) {
      setCopied(true)
      setTimeout(() => { setCopied(false); setOpen(false) }, 1500)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
      >
        <Share2 size={13} />
        شارك ترتيبك
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 top-full mt-1.5 z-50 w-44 fl-card-static rounded-xl overflow-hidden shadow-xl"
          >
            {/* WhatsApp */}
            <button
              onClick={() => { shareToWhatsApp(shareText); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-[var(--text-primary)] hover:bg-[var(--sidebar-hover-bg)] transition-all duration-200 text-right"
            >
              <span className="text-base leading-none">💬</span>
              <span>WhatsApp</span>
            </button>

            {/* Twitter / X */}
            <button
              onClick={() => { shareToTwitter(shareText); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-[var(--text-primary)] hover:bg-[var(--sidebar-hover-bg)] transition-all duration-200 border-t border-[var(--border-subtle)] text-right"
            >
              <span className="text-base leading-none font-bold" style={{ fontFamily: 'monospace' }}>𝕏</span>
              <span>Twitter / X</span>
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs border-t border-[var(--border-subtle)] hover:bg-[var(--sidebar-hover-bg)] transition-all duration-200 text-right"
              style={{ color: copied ? '#10b981' : 'var(--text-primary)' }}
            >
              <span className="text-base leading-none">{copied ? '✓' : '📋'}</span>
              <span>{copied ? 'تم النسخ!' : 'نسخ الرسالة'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function StudentLeaderboard() {
  const { profile, studentData } = useAuthStore()
  const [period, setPeriod] = useState('month')
  const [tab, setTab] = useState('group')

  const groupId = studentData?.group_id

  // Group leaderboard — fetch students in same group ranked by XP
  const { data: groupRanking, isLoading: groupLoading } = useQuery({
    queryKey: ['leaderboard-group', groupId, period],
    queryFn: async () => {
      if (period === 'all') {
        // Use xp_total directly
        const { data } = await supabase
          .from('students')
          .select('id, xp_total, current_streak, profiles(full_name, display_name)')
          .eq('group_id', groupId)
          .eq('status', 'active')
          .is('deleted_at', null)
          .order('xp_total', { ascending: false })
        return (data || []).map((s, i) => ({
          ...s,
          rank: i + 1,
          xp: s.xp_total,
          name: s.profiles?.display_name || s.profiles?.full_name || 'طالب',
          isMe: s.id === profile?.id,
        }))
      }

      // For week/month — sum XP from transactions
      const now = new Date()
      let startDate
      if (period === 'week') {
        const day = now.getDay()
        startDate = new Date(now)
        startDate.setDate(now.getDate() - day)
        startDate.setHours(0, 0, 0, 0)
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }

      const { data: students } = await supabase
        .from('students')
        .select('id, xp_total, current_streak, profiles(full_name, display_name)')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('deleted_at', null)

      const { data: transactions } = await supabase
        .from('xp_transactions')
        .select('student_id, amount')
        .in('student_id', (students || []).map(s => s.id))
        .gte('created_at', startDate.toISOString())

      const xpMap = {}
      ;(transactions || []).forEach(tx => {
        xpMap[tx.student_id] = (xpMap[tx.student_id] || 0) + tx.amount
      })

      return (students || [])
        .map(s => ({
          ...s,
          xp: xpMap[s.id] || 0,
          name: s.profiles?.display_name || s.profiles?.full_name || 'طالب',
          isMe: s.id === profile?.id,
        }))
        .sort((a, b) => b.xp - a.xp)
        .map((s, i) => ({ ...s, rank: i + 1 }))
    },
    enabled: !!groupId && tab === 'group',
  })

  // Team leaderboard
  const { data: teamRanking, isLoading: teamsLoading } = useQuery({
    queryKey: ['leaderboard-teams', groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, name, emoji, color, total_xp')
        .eq('group_id', groupId)
        .order('total_xp', { ascending: false })

      // Get member counts
      const teamIds = (data || []).map(t => t.id)
      const { data: members } = await supabase
        .from('team_members')
        .select('team_id')
        .in('team_id', teamIds)

      const memberCount = {}
      ;(members || []).forEach(m => {
        memberCount[m.team_id] = (memberCount[m.team_id] || 0) + 1
      })

      return (data || []).map((t, i) => ({
        ...t,
        rank: i + 1,
        memberCount: memberCount[t.id] || 0,
      }))
    },
    enabled: !!groupId && tab === 'teams',
  })

  // Weekly task completion map for weekly period indicator
  const { data: weeklyCompletionMap } = useQuery({
    queryKey: ['leaderboard-weekly-completion', groupId || 'academy'],
    queryFn: async () => {
      const now = new Date()
      const sunday = new Date(now)
      sunday.setDate(now.getDate() - now.getDay())
      sunday.setHours(0, 0, 0, 0)

      const { data } = await supabase
        .from('weekly_task_sets')
        .select('student_id, status, completion_percentage')
        .gte('week_start', sunday.toISOString())

      const map = {}
      ;(data || []).forEach(s => { map[s.student_id] = s })
      return map
    },
    enabled: period === 'week',
  })

  // Academy leaderboard — top performers across all groups
  const { data: academyData, isLoading: academyLoading } = useQuery({
    queryKey: ['leaderboard-academy', period],
    queryFn: async () => {
      if (period === 'all') {
        const { data } = await supabase
          .from('students')
          .select('id, xp_total, current_streak, group_id, profiles(full_name, display_name), groups(name, code)')
          .eq('status', 'active')
          .is('deleted_at', null)
          .order('xp_total', { ascending: false })
          .limit(20)
        return (data || []).map((s, i) => ({
          ...s,
          rank: i + 1,
          xp: s.xp_total,
          name: s.profiles?.display_name || s.profiles?.full_name || 'طالب',
          groupName: s.groups?.code || s.groups?.name || '',
          isMe: s.id === profile?.id,
        }))
      }

      const now = new Date()
      let startDate
      if (period === 'week') {
        const day = now.getDay()
        startDate = new Date(now)
        startDate.setDate(now.getDate() - day)
        startDate.setHours(0, 0, 0, 0)
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }

      const { data: students } = await supabase
        .from('students')
        .select('id, xp_total, current_streak, group_id, profiles(full_name, display_name), groups(name, code)')
        .eq('status', 'active')
        .is('deleted_at', null)

      const { data: transactions } = await supabase
        .from('xp_transactions')
        .select('student_id, amount')
        .gte('created_at', startDate.toISOString())

      const xpMap = {}
      ;(transactions || []).forEach(tx => {
        xpMap[tx.student_id] = (xpMap[tx.student_id] || 0) + tx.amount
      })

      return (students || [])
        .map(s => ({
          ...s,
          xp: xpMap[s.id] || 0,
          name: s.profiles?.display_name || s.profiles?.full_name || 'طالب',
          groupName: s.groups?.code || s.groups?.name || '',
          isMe: s.id === profile?.id,
        }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 20)
        .map((s, i) => ({ ...s, rank: i + 1 }))
    },
    enabled: tab === 'academy',
  })

  const isLoading = tab === 'group' ? groupLoading : tab === 'teams' ? teamsLoading : academyLoading
  const ranking = tab === 'group' ? groupRanking : tab === 'academy' ? academyData : null
  const myRank = ranking?.find(r => r.isMe)

  return (
    <div className="space-y-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
            <Trophy className="text-gold-400" size={22} />
          </div>
          <span className="text-gradient">لوحة المتصدرين</span>
        </h1>
        <p className="text-muted text-sm mt-1">تنافس مع زملائك واحصد النقاط</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TAB_OPTIONS.map((t, i) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              tab === t.value
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'text-muted hover:text-[var(--text-primary)] border border-transparent'
            }`}
            style={tab !== t.value ? { background: 'var(--surface-raised)' } : undefined}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Period filter (not for teams) */}
      {tab !== 'teams' && (
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                period === p.value
                  ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
                  : 'text-muted hover:text-[var(--text-primary)] border border-transparent'
              }`}
              style={period !== p.value ? { background: 'var(--surface-raised)' } : undefined}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* My Rank banner */}
      {myRank && tab !== 'teams' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fl-card-static p-7 border-sky-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-lg">
                {myRank.rank}
              </div>
              <div>
                <p className="text-sm text-[var(--text-primary)] font-medium">ترتيبك</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  المركز {myRank.rank} من {ranking?.length || 0}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-left">
                <p className="text-lg font-bold text-sky-400">{myRank.xp} XP</p>
                <p className="text-xs text-muted">{getLevel(myRank.xp_total || myRank.xp).title_ar}</p>
              </div>
              <ShareRankButton rank={myRank.rank} total={ranking?.length || 0} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && <ListSkeleton rows={5} />}

      {/* Group / Academy Ranking */}
      {!isLoading && tab !== 'teams' && ranking && (
        <div className="space-y-2">
          {ranking.map((player, index) => {
            const style = RANK_STYLES[index] || {}
            const level = getLevel(player.xp_total || player.xp)
            const RankIcon = style.icon || null

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 hover:translate-y-[-2px] ${
                  player.isMe
                    ? 'bg-sky-500/10 border-sky-500/20 ring-1 ring-sky-500/10'
                    : style.bg
                      ? `${style.bg} ${style.border}`
                      : 'border-border-subtle'
                }`}
                style={!player.isMe && !style.bg ? { background: 'var(--surface-raised)' } : undefined}
              >
                {/* Rank */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                  style.text || 'text-muted'
                } ${style.bg || ''}`}
                  style={!style.bg ? { background: 'var(--surface-raised)' } : undefined}>
                  {RankIcon ? <RankIcon size={16} /> : player.rank}
                </div>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
                  player.isMe ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-[var(--sidebar-hover-bg)] text-[var(--text-tertiary)]'
                }`}>
                  {player.name?.[0] || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {player.name}
                    {player.isMe && <span className="text-xs text-sky-400 mr-1">(أنت)</span>}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>Lv.{level.level} {level.title_ar}</span>
                    {player.current_streak > 0 && (
                      <span className="flex items-center gap-0.5 text-orange-400">
                        <Flame size={10} /> {player.current_streak}
                      </span>
                    )}
                    {tab === 'academy' && player.groupName && (
                      <span className="badge-blue text-xs">{player.groupName}</span>
                    )}
                  </div>
                </div>

                {/* XP */}
                <div className="text-left flex items-center gap-2">
                  <p className={`text-sm font-bold ${index === 0 ? 'text-gold-400' : 'text-[var(--text-primary)]'}`}>
                    {player.xp} XP
                  </p>
                  {period === 'week' && weeklyCompletionMap?.[player.id] && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      weeklyCompletionMap[player.id].status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-[var(--surface-raised)] text-muted'
                    }`}>
                      {weeklyCompletionMap[player.id].status === 'completed' ? '✓ مهام' : `${weeklyCompletionMap[player.id].completion_percentage || 0}%`}
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
          {ranking.length === 0 && (
            <EmptyState
              icon={BarChart3}
              title="لا توجد بيانات للفترة المحددة"
              description="ستظهر النتائج عند بدء النشاط"
            />
          )}
        </div>
      )}

      {/* Teams Ranking */}
      {!isLoading && tab === 'teams' && teamRanking && (
        <div className="space-y-3">
          {teamRanking.length > 0 ? teamRanking.map((team, index) => {
            const style = RANK_STYLES[index] || {}
            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`flex items-center gap-5 p-5 rounded-2xl border hover:translate-y-[-2px] transition-all duration-200 ${
                  style.bg ? `${style.bg} ${style.border}` : 'border-border-subtle'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${style.text || 'text-muted'}`}>
                  {team.rank}
                </div>
                <div className="text-3xl">{team.emoji || '🏆'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{team.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{team.memberCount} أعضاء</p>
                </div>
                <div className="text-left">
                  <p className={`text-lg font-bold ${index === 0 ? 'text-gold-400' : 'text-[var(--text-primary)]'}`}>
                    {team.total_xp || 0} XP
                  </p>
                </div>
              </motion.div>
            )
          }) : (
            <EmptyState
              icon={Users}
              title="لم يتم إنشاء فرق بعد"
              description="سيقوم المدرب بإنشاء الفرق قريباً"
            />
          )}
        </div>
      )}
    </div>
  )
}
