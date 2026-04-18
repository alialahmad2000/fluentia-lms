import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Search, Flame, Zap, BarChart3, StickyNote } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/dateHelpers'
import UserAvatar from '../../components/common/UserAvatar'
import EmptyState from '../../components/ui/EmptyState'

function getStatus(lastActive) {
  if (!lastActive) return { dot: '🔴', label: 'غائب', color: 'rgb(239,68,68)' }
  const days = (Date.now() - new Date(lastActive).getTime()) / 86400000
  if (days < 2) return { dot: '🟢', label: 'نشط', color: 'rgb(52,211,153)' }
  if (days <= 5) return { dot: '🟡', label: 'خامل', color: 'rgb(251,191,36)' }
  return { dot: '🔴', label: 'غائب', color: 'rgb(239,68,68)' }
}

export default function MyStudents() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'admin'
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTeam, setFilterTeam] = useState('all')

  // Fetch groups
  const { data: groups = [] } = useQuery({
    queryKey: ['my-students-groups', profile?.id, isAdmin],
    queryFn: async () => {
      let q = supabase.from('groups').select('id, name').eq('is_active', true)
      if (!isAdmin) q = q.eq('trainer_id', profile?.id)
      const { data, error } = await q
      if (error) { console.error('[MyStudents] groups:', error); return [] }
      return data || []
    },
    enabled: !!profile?.id,
  })

  const groupIds = useMemo(() => groups.map(g => g.id), [groups])

  // Fetch students
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['my-students-list', groupIds],
    queryFn: async () => {
      if (!groupIds.length) return []
      const { data, error } = await supabase
        .from('students')
        .select('id, xp_total, current_streak, team_id, group_id, profiles!inner(full_name, display_name, avatar_url, last_active_at)')
        .in('group_id', groupIds)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('xp_total', { ascending: false })
      if (error) { console.error('[MyStudents] students:', error); return [] }
      return data || []
    },
    enabled: groupIds.length > 0,
  })

  // Fetch teams
  const { data: teams = [] } = useQuery({
    queryKey: ['my-students-teams', groupIds],
    queryFn: async () => {
      if (!groupIds.length) return []
      const { data } = await supabase.from('teams').select('id, name, emoji, color, group_id').in('group_id', groupIds)
      return data || []
    },
    enabled: groupIds.length > 0,
  })

  const teamsMap = useMemo(() => {
    const m = {}
    teams.forEach(t => { m[t.id] = t })
    return m
  }, [teams])

  const uniqueTeams = useMemo(() => {
    const seen = new Set()
    return teams.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true })
  }, [teams])

  // Filter
  const filtered = useMemo(() => {
    return students.filter(s => {
      if (filterTeam !== 'all' && s.team_id !== filterTeam) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const name = (s.profiles?.full_name || s.profiles?.display_name || '').toLowerCase()
        return name.includes(q)
      }
      return true
    })
  }, [students, filterTeam, searchQuery])

  const anim = (i) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.04 },
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 flex items-center justify-center ring-1 ring-sky-500/20">
            <Users size={20} className="text-sky-400" />
          </div>
          <h1 className="text-page-title">طلابي ({students.length})</h1>
        </div>
      </motion.div>

      {/* Search + Team filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="بحث بالاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pr-10 w-full"
          />
        </div>
        {uniqueTeams.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterTeam('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                filterTeam === 'all' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-muted hover:text-[var(--text-primary)]'
              }`}
            >
              الكل
            </button>
            {uniqueTeams.map(t => (
              <button
                key={t.id}
                onClick={() => setFilterTeam(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  filterTeam === t.id ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-muted hover:text-[var(--text-primary)]'
                }`}
              >
                {t.emoji} {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Students list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-24 skeleton rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد طلاب" description={searchQuery ? 'لا توجد نتائج للبحث' : 'لم يتم تسجيل طلاب بعد'} />
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => {
            const name = s.profiles?.full_name || s.profiles?.display_name || 'طالب'
            const lastActive = s.profiles?.last_active_at
            const status = getStatus(lastActive)
            const team = s.team_id ? teamsMap[s.team_id] : null

            return (
              <motion.div
                key={s.id}
                {...anim(i)}
                className="rounded-2xl p-5 cursor-pointer transition-all hover:translate-y-[-1px]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                onClick={() => navigate(`/trainer/student/${s.id}/progress`)}
              >
                <div className="flex items-center gap-4">
                  <UserAvatar user={s.profiles} size={44} rounded="xl" gradient="linear-gradient(135deg, var(--accent-sky), var(--accent-violet))" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
                      <span className="text-sm">{status.dot}</span>
                      <span className="text-[10px]" style={{ color: status.color }}>{status.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      <span className="flex items-center gap-1"><Zap size={12} className="text-amber-400" /> {(s.xp_total || 0).toLocaleString('ar-SA')}</span>
                      <span className="flex items-center gap-1"><Flame size={12} className="text-orange-400" /> {s.current_streak || 0} يوم</span>
                      {team && <span>{team.emoji} {team.name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {lastActive ? timeAgo(lastActive) : 'لم يدخل'}
                    </span>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 mt-3 mr-14">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/trainer/student/${s.id}/progress`) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                    style={{ background: 'rgba(56,189,248,0.1)', color: 'rgb(56,189,248)' }}
                  >
                    <BarChart3 size={12} /> الملف
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/trainer/my-notes', { state: { studentId: s.id } }) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                    style={{ background: 'rgba(168,85,247,0.1)', color: 'rgb(168,85,247)' }}
                  >
                    <StickyNote size={12} /> ملاحظة
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/trainer/points', { state: { studentId: s.id } }) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                    style={{ background: 'rgba(251,191,36,0.1)', color: 'rgb(251,191,36)' }}
                  >
                    <Zap size={12} /> نقاط
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
