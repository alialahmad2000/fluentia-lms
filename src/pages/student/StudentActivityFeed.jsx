import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, Zap, Flame, Trophy, Award, Users, FileText, Bell } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/dateHelpers'

const ACTIVITY_ICONS = {
  submission: { icon: '✅', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  achievement: { icon: '🏆', color: 'text-gold-400', bg: 'bg-gold-500/10' },
  streak: { icon: '🔥', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  level_up: { icon: '⬆️', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  team_rank: { icon: '👥', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  peer_recognition: { icon: '🤝', color: 'text-rose-400', bg: 'bg-rose-500/10' },
  challenge_complete: { icon: '🎯', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  new_member: { icon: '👋', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  class_summary: { icon: '📝', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  announcement: { icon: '📢', color: 'text-gold-400', bg: 'bg-gold-500/10' },
}

export default function StudentActivityFeed() {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const groupId = studentData?.group_id

  // Fetch activity feed
  const { data: activities, isLoading } = useQuery({
    queryKey: ['activity-feed', groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_feed')
        .select(`
          id, type, title, description, data, created_at,
          student:student_id(profiles(full_name, display_name))
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(50)
      return (data || []).map(a => ({
        ...a,
        studentName: a.student?.profiles?.display_name || a.student?.profiles?.full_name || null,
      }))
    },
    enabled: !!groupId,
    // Real-time subscription handles updates — no polling needed
  })

  // Subscribe to real-time updates
  useEffect(() => {
    if (!groupId) return

    const channel = supabase
      .channel(`activity-feed-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['activity-feed', groupId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, queryClient])

  // Group stats
  const { data: groupStats } = useQuery({
    queryKey: ['group-stats', groupId],
    queryFn: async () => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      // Count submissions this month (join via assignments to filter by group)
      const { data: groupAssignments } = await supabase
        .from('assignments')
        .select('id')
        .eq('group_id', groupId)
        .is('deleted_at', null)
      const assignmentIds = (groupAssignments || []).map(a => a.id)
      const { count: submissionCount } = assignmentIds.length
        ? await supabase
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .in('assignment_id', assignmentIds)
            .gte('created_at', monthStart.toISOString())
            .is('deleted_at', null)
        : { count: 0 }

      // Count active students
      const { count: activeStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('deleted_at', null)

      return {
        submissions: submissionCount || 0,
        activeStudents: activeStudents || 0,
      }
    },
    enabled: !!groupId,
  })

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Activity className="text-sky-400" size={20} />
          </div>
          نشاط المجموعة
        </h1>
        <p className="text-muted text-sm mt-1">آخر أنشطة زملائك في المجموعة</p>
      </motion.div>

      {/* Group stats */}
      {groupStats && (
        <div className="grid grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 text-center hover:translate-y-[-2px] transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center mx-auto mb-2">
              <FileText size={18} className="text-sky-400" />
            </div>
            <p className="text-2xl font-bold text-sky-400">{groupStats.submissions}</p>
            <p className="text-xs text-muted mt-1">واجب هذا الشهر</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card p-5 text-center hover:translate-y-[-2px] transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
              <Users size={18} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">{groupStats.activeStudents}</p>
            <p className="text-xs text-muted mt-1">طالب نشط</p>
          </motion.div>
        </div>
      )}

      {/* Feed */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton h-16 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && activities?.length > 0 && (
        <div className="space-y-2">
          {activities.map((activity, index) => {
            const config = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.submission
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="glass-card flex items-start gap-3 p-4 hover:translate-y-[-2px] transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center text-lg shrink-0`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    {activity.studentName && (
                      <span className="font-medium text-sky-400">{activity.studentName} </span>
                    )}
                    {activity.title}
                  </p>
                  {activity.description && (
                    <p className="text-xs text-muted mt-0.5">{activity.description}</p>
                  )}
                  <p className="text-[10px] text-muted mt-1">{timeAgo(activity.created_at)}</p>
                </div>
                {activity.data?.xp && (
                  <span className="badge-green shrink-0">
                    +{activity.data.xp} XP
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {!isLoading && (!activities || activities.length === 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <Activity size={48} className="text-muted mx-auto mb-3 opacity-30" />
          <p className="text-muted">لا يوجد نشاط بعد</p>
          <p className="text-xs text-muted mt-1">سيظهر هنا نشاط المجموعة تلقائياً</p>
        </motion.div>
      )}
    </div>
  )
}
