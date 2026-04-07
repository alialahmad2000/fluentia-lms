import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookOpen, PenLine, Headphones, FileEdit, Gamepad2, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import UserAvatar from '../common/UserAvatar'

const SECTION_META = {
  reading: { icon: BookOpen, label: 'القراءة', color: 'text-sky-400' },
  grammar: { icon: PenLine, label: 'القواعد', color: 'text-emerald-400' },
  listening: { icon: Headphones, label: 'الاستماع', color: 'text-purple-400' },
  writing: { icon: FileEdit, label: 'الكتابة', color: 'text-rose-400' },
  vocabulary: { icon: BookOpen, label: 'المفردات', color: 'text-amber-400' },
  speaking: { icon: Headphones, label: 'المحادثة', color: 'text-violet-400' },
}

const GAME_TYPE_LABELS = {
  vocab_match: 'مطابقة المفردات',
  spelling: 'الإملاء',
  sentence_builder: 'بناء الجمل',
  word_search: 'البحث عن الكلمات',
}

function relativeTimeAr(date) {
  if (!date) return ''
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`
  return `قبل ${Math.floor(diff / 604800)} أسبوع`
}

export default function CurriculumActivityCard({ studentIds, groups, mode = 'trainer', delay = 0.45 }) {
  const [selectedGroup, setSelectedGroup] = useState('all')

  // Get students with profiles for name lookup
  const { data: studentsMap } = useQuery({
    queryKey: ['activity-card-students', studentIds?.join(',')],
    queryFn: async () => {
      if (!studentIds?.length) return {}
      const { data } = await supabase
        .from('students')
        .select('id, group_id, profiles(full_name, display_name, avatar_url)')
        .in('id', studentIds)
      const map = {}
      ;(data || []).forEach(s => {
        map[s.id] = {
          name: s.profiles?.full_name || s.profiles?.display_name || 'طالب',
          avatar_url: s.profiles?.avatar_url,
          group_id: s.group_id,
        }
      })
      return map
    },
    enabled: !!studentIds?.length,
  })

  // Filter student IDs by selected group
  const filteredIds = selectedGroup === 'all'
    ? studentIds
    : studentIds?.filter(id => studentsMap?.[id]?.group_id === selectedGroup)

  // Recent curriculum progress
  const { data: recentProgress, isLoading: progressLoading } = useQuery({
    queryKey: ['activity-card-progress', filteredIds?.join(',')],
    queryFn: async () => {
      if (!filteredIds?.length) return []
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, section_type, status, score, unit_id, updated_at')
        .in('student_id', filteredIds)
        .order('updated_at', { ascending: false })
        .limit(5)
      return data || []
    },
    enabled: !!filteredIds?.length,
  })

  // Recent game sessions
  const { data: recentGames, isLoading: gamesLoading } = useQuery({
    queryKey: ['activity-card-games', filteredIds?.join(',')],
    queryFn: async () => {
      if (!filteredIds?.length) return []
      const { data } = await supabase
        .from('game_sessions')
        .select('student_id, game_type, accuracy_percent, created_at')
        .in('student_id', filteredIds)
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    },
    enabled: !!filteredIds?.length,
  })

  // Weekly stats
  const { data: weeklyStats } = useQuery({
    queryKey: ['activity-card-weekly', filteredIds?.join(',')],
    queryFn: async () => {
      if (!filteredIds?.length) return { completed: 0, games: 0, inactive: 0, inactiveStudents: [] }
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekStr = weekAgo.toISOString()

      const [completedRes, gamesRes, activeRes] = await Promise.all([
        supabase
          .from('student_curriculum_progress')
          .select('id', { count: 'exact', head: true })
          .in('student_id', filteredIds)
          .eq('status', 'completed')
          .gte('completed_at', weekStr),
        supabase
          .from('game_sessions')
          .select('id', { count: 'exact', head: true })
          .in('student_id', filteredIds)
          .gte('created_at', weekStr),
        supabase
          .from('students')
          .select('id, last_active_at, profiles(full_name, display_name, avatar_url)')
          .in('id', filteredIds)
          .or(`last_active_at.is.null,last_active_at.lt.${weekStr}`)
          .order('last_active_at', { ascending: true, nullsFirst: true }),
      ])

      return {
        completed: completedRes.count || 0,
        games: gamesRes.count || 0,
        inactive: activeRes.data?.length || 0,
        inactiveStudents: (activeRes.data || []).map(s => ({
          id: s.id,
          name: s.profiles?.full_name || s.profiles?.display_name || 'طالب',
          avatar_url: s.profiles?.avatar_url,
          lastActive: s.last_active_at,
        })),
      }
    },
    enabled: !!filteredIds?.length,
  })

  // Merge and sort activities
  const activities = []
  ;(recentProgress || []).forEach(p => {
    const meta = SECTION_META[p.section_type] || SECTION_META.reading
    activities.push({
      type: 'curriculum',
      studentId: p.student_id,
      icon: meta.icon,
      iconColor: meta.color,
      label: meta.label,
      status: p.status,
      score: p.score,
      date: p.updated_at,
    })
  })
  ;(recentGames || []).forEach(g => {
    activities.push({
      type: 'game',
      studentId: g.student_id,
      icon: Gamepad2,
      iconColor: 'text-pink-400',
      label: GAME_TYPE_LABELS[g.game_type] || g.game_type,
      status: 'completed',
      score: g.accuracy_percent ? Math.round(g.accuracy_percent) : null,
      date: g.created_at,
    })
  })
  activities.sort((a, b) => new Date(b.date) - new Date(a.date))
  const topActivities = activities.slice(0, 5)

  const isLoading = progressLoading || gamesLoading
  const groupMap = {}
  ;(groups || []).forEach(g => { groupMap[g.id] = g.name || g.code })

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="fl-card-static p-7"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen size={20} className="text-sky-400" />
          <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>نشاط المنهج</h3>
        </div>
        {mode === 'admin' && groups?.length > 1 && (
          <div className="relative">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="appearance-none text-xs font-medium px-3 py-1.5 rounded-lg border outline-none cursor-pointer font-['Tajawal']"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                paddingLeft: '1.5rem',
              }}
            >
              <option value="all">جميع المجموعات</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name || g.code}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
        </div>
      ) : !studentIds?.length ? (
        <p className="text-muted text-sm text-center py-6 font-['Tajawal']">لا يوجد طلاب مسجلين</p>
      ) : (
        <div className="space-y-6">
          {/* Section A: Live Feed */}
          <div>
            <p className="text-xs font-bold mb-3 font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>آخر النشاطات</p>
            {topActivities.length > 0 ? (
              <div className="space-y-2">
                {topActivities.map((act, i) => {
                  const student = studentsMap?.[act.studentId]
                  const Icon = act.icon
                  const statusDot = act.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400'
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                      style={{ background: 'var(--surface-raised)' }}
                    >
                      <div className="relative">
                        <UserAvatar user={{ display_name: student?.name, avatar_url: student?.avatar_url }} size={32} rounded="full" />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${statusDot} border-2`} style={{ borderColor: 'var(--surface-raised)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {student?.name || 'طالب'}
                          {mode === 'admin' && student?.group_id && groupMap[student.group_id] && (
                            <span className="text-[10px] text-[var(--text-muted)] mr-1.5">({groupMap[student.group_id]})</span>
                          )}
                        </p>
                        <p className="text-xs text-muted truncate">
                          {act.status === 'completed' ? 'أكمل' : 'بدأ'} {act.label}
                          {act.score != null && ` — ${act.score}%`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Icon size={14} className={act.iconColor} />
                        <span className="text-[10px] text-muted font-['Tajawal'] whitespace-nowrap">{relativeTimeAr(act.date)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted text-sm text-center py-4 font-['Tajawal']">
                لا يوجد نشاط بعد — سيظهر هنا عندما يبدأ الطلاب بحل المنهج
              </p>
            )}
          </div>

          {/* Section B: Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-raised)' }}>
              <p className="text-xl font-bold text-emerald-400">{weeklyStats?.completed ?? 0}</p>
              <p className="text-[11px] text-muted mt-0.5 font-['Tajawal']">أكملوا هالأسبوع</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-raised)' }}>
              <p className="text-xl font-bold text-pink-400">{weeklyStats?.games ?? 0}</p>
              <p className="text-[11px] text-muted mt-0.5 font-['Tajawal']">ألعاب هالأسبوع</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-raised)' }}>
              <p className={`text-xl font-bold ${weeklyStats?.inactive > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {weeklyStats?.inactive ?? 0}
              </p>
              <p className="text-[11px] text-muted mt-0.5 font-['Tajawal']">غير نشطين</p>
            </div>
          </div>

          {/* Section C: Attention Needed */}
          {weeklyStats?.inactiveStudents?.length > 0 ? (
            <div>
              <p className="text-xs font-bold mb-2.5 font-['Tajawal'] flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <AlertTriangle size={12} className="text-amber-400" />
                الأقل نشاطاً
              </p>
              <div className="space-y-1.5">
                {weeklyStats.inactiveStudents.slice(0, 3).map(s => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2"
                    style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.1)' }}
                  >
                    <UserAvatar user={{ display_name: s.name, avatar_url: s.avatar_url }} size={24} rounded="full" />
                    <span className="text-xs font-medium flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
                    <span className="text-[10px] text-amber-400 font-['Tajawal'] whitespace-nowrap">
                      {s.lastActive ? `آخر نشاط: ${relativeTimeAr(s.lastActive)}` : 'لم يبدأ بعد'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : weeklyStats && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-xs text-emerald-400 font-['Tajawal']">جميع الطلاب نشطين هذا الأسبوع</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
