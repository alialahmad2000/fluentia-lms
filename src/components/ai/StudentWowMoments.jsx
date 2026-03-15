import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Flame, Trophy, Zap, Star, Award, TrendingUp } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const MOMENT_TYPES = {
  streak_7: { icon: Flame, color: 'text-orange-400 bg-orange-500/10', label: 'سلسلة 7 أيام!' },
  streak_14: { icon: Flame, color: 'text-orange-400 bg-orange-500/10', label: 'سلسلة أسبوعين!' },
  streak_30: { icon: Flame, color: 'text-red-400 bg-red-500/10', label: 'سلسلة شهر كامل!' },
  xp_500: { icon: Zap, color: 'text-sky-400 bg-sky-500/10', label: 'وصلت 500 XP!' },
  xp_1000: { icon: Zap, color: 'text-sky-400 bg-sky-500/10', label: 'وصلت 1,000 XP!' },
  xp_2000: { icon: Star, color: 'text-violet-400 bg-violet-500/10', label: 'وصلت 2,000 XP!' },
  xp_5000: { icon: Star, color: 'text-gold-400 bg-gold-500/10', label: 'وصلت 5,000 XP!' },
  weekly_complete: { icon: Trophy, color: 'text-emerald-400 bg-emerald-500/10', label: 'أكملت كل المهام الأسبوعية!' },
  level_up: { icon: TrendingUp, color: 'text-sky-400 bg-sky-500/10', label: 'ترقية مستوى!' },
  first_submission: { icon: Award, color: 'text-gold-400 bg-gold-500/10', label: 'أول واجب مسلّم!' },
}

export default function StudentWowMoments() {
  const { profile, studentData } = useAuthStore()

  const { data: moments } = useQuery({
    queryKey: ['wow-moments', profile?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const results = []
      const xp = studentData?.xp_total || 0
      const streak = studentData?.current_streak || 0

      // Streak milestones
      if (streak >= 30) results.push({ type: 'streak_30', value: streak })
      else if (streak >= 14) results.push({ type: 'streak_14', value: streak })
      else if (streak >= 7) results.push({ type: 'streak_7', value: streak })

      // XP milestones
      if (xp >= 5000) results.push({ type: 'xp_5000', value: xp })
      else if (xp >= 2000) results.push({ type: 'xp_2000', value: xp })
      else if (xp >= 1000) results.push({ type: 'xp_1000', value: xp })
      else if (xp >= 500) results.push({ type: 'xp_500', value: xp })

      // Recent weekly task completion
      const { data: recentSet } = await supabase
        .from('weekly_task_sets')
        .select('status')
        .eq('student_id', profile?.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recentSet) results.push({ type: 'weekly_complete' })

      // Check for recent achievements (last 7 days)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const { data: recentAchievements } = await supabase
        .from('student_achievements')
        .select('id')
        .eq('student_id', profile?.id)
        .gte('earned_at', weekAgo.toISOString())
        .limit(1)

      if (recentAchievements?.length > 0) results.push({ type: 'level_up' })

      return results.slice(0, 3) // Max 3 moments
    },
    enabled: !!profile?.id && !!studentData,
  })

  if (!moments?.length) return null

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
      {moments.map((moment, i) => {
        const config = MOMENT_TYPES[moment.type]
        if (!config) return null
        const Icon = config.icon
        return (
          <motion.div
            key={moment.type}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="fl-card-static p-4 flex items-center gap-3 shrink-0"
          >
            <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center`}>
              <Icon size={18} />
            </div>
            <p className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
              {config.label}
            </p>
          </motion.div>
        )
      })}
    </div>
  )
}
