import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Star, Trophy, Flame, Zap, BookOpen, Award,
  TrendingUp, Calendar, Target,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const ACHIEVEMENT_CONFIG = {
  streak_7: { title: 'سلسلة أسبوعية', icon: Flame, color: 'gold', desc: 'حققت سلسلة 7 أيام متتالية' },
  streak_30: { title: 'سلسلة شهرية', icon: Flame, color: 'red', desc: 'حققت سلسلة 30 يوم!' },
  xp_100: { title: 'جامع النقاط', icon: Zap, color: 'violet', desc: 'جمعت أكثر من 100 نقطة' },
  xp_500: { title: 'محترف النقاط', icon: Zap, color: 'gold', desc: 'جمعت أكثر من 500 نقطة' },
  xp_1000: { title: 'أسطورة النقاط', icon: Zap, color: 'red', desc: 'جمعت أكثر من 1000 نقطة!' },
  perfect_grade: { title: 'درجة كاملة', icon: Star, color: 'gold', desc: 'حصلت على A+ في واجب' },
  all_submitted: { title: 'ملتزم', icon: BookOpen, color: 'sky', desc: 'سلّمت كل واجباتك في الوقت' },
  level_up: { title: 'ترقية', icon: TrendingUp, color: 'emerald', desc: 'ارتقيت لمستوى جديد' },
  top_3: { title: 'من الأوائل', icon: Trophy, color: 'gold', desc: 'كنت ضمن أفضل 3 في مجموعتك' },
  first_assignment: { title: 'البداية', icon: Target, color: 'sky', desc: 'أكملت أول واجب لك' },
}

export default function StudentSuccessStories() {
  const { profile, studentData } = useAuthStore()

  // Compute achievements
  const { data: achievements, isLoading } = useQuery({
    queryKey: ['student-achievements'],
    queryFn: async () => {
      const earned = []

      // Streak achievements
      const streak = studentData?.current_streak || 0
      if (streak >= 7) earned.push({ ...ACHIEVEMENT_CONFIG.streak_7, key: 'streak_7', date: null })
      if (streak >= 30) earned.push({ ...ACHIEVEMENT_CONFIG.streak_30, key: 'streak_30', date: null })

      // XP achievements
      const xp = studentData?.xp_total || 0
      if (xp >= 100) earned.push({ ...ACHIEVEMENT_CONFIG.xp_100, key: 'xp_100' })
      if (xp >= 500) earned.push({ ...ACHIEVEMENT_CONFIG.xp_500, key: 'xp_500' })
      if (xp >= 1000) earned.push({ ...ACHIEVEMENT_CONFIG.xp_1000, key: 'xp_1000' })

      // Grade achievements
      const { data: submissions } = await supabase
        .from('submissions')
        .select('grade_letter, grade_numeric, submitted_at')
        .eq('student_id', profile?.id)
        .eq('status', 'graded')

      if (submissions?.length > 0) {
        earned.push({ ...ACHIEVEMENT_CONFIG.first_assignment, key: 'first_assignment', date: submissions[submissions.length - 1]?.submitted_at })
        const hasPerfect = submissions.some(s => s.grade_letter === 'A+' || s.grade_numeric >= 97)
        if (hasPerfect) earned.push({ ...ACHIEVEMENT_CONFIG.perfect_grade, key: 'perfect_grade' })
      }

      // Top 3 in group
      if (studentData?.group_id) {
        const { data: groupStudents } = await supabase
          .from('students')
          .select('id, xp_total')
          .eq('group_id', studentData.group_id)
          .eq('status', 'active')
          .order('xp_total', { ascending: false })
          .limit(3)

        if (groupStudents?.some(s => s.id === profile?.id)) {
          earned.push({ ...ACHIEVEMENT_CONFIG.top_3, key: 'top_3' })
        }
      }

      return earned
    },
    enabled: !!profile?.id,
  })

  // Journey stats
  const { data: stats } = useQuery({
    queryKey: ['student-journey-stats'],
    queryFn: async () => {
      const [submissionsRes, attendanceRes, vocabRes] = await Promise.all([
        supabase.from('submissions').select('id', { count: 'exact', head: true })
          .eq('student_id', profile?.id).eq('status', 'graded'),
        supabase.from('attendance').select('id', { count: 'exact', head: true })
          .eq('student_id', profile?.id).eq('status', 'present'),
        supabase.from('vocabulary_bank').select('id', { count: 'exact', head: true })
          .eq('student_id', profile?.id).eq('mastery', 'mastered'),
      ])
      return {
        totalGraded: submissionsRes.count || 0,
        totalPresent: attendanceRes.count || 0,
        vocabMastered: vocabRes.count || 0,
      }
    },
    enabled: !!profile?.id,
  })

  const allAchievements = Object.entries(ACHIEVEMENT_CONFIG).map(([key, config]) => {
    const earned = achievements?.find(a => a.key === key)
    return { ...config, key, earned: !!earned }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Award size={24} className="text-gold-400" />
          قصة نجاحي
        </h1>
        <p className="text-muted text-sm mt-1">رحلتك في تعلم الإنجليزية وإنجازاتك</p>
      </div>

      {/* Journey summary */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border-gold-500/20">
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gold-500/10 flex items-center justify-center mx-auto mb-3">
            <Star size={28} className="text-gold-400" />
          </div>
          <h2 className="text-xl font-bold text-white">{profile?.display_name || profile?.full_name}</h2>
          <p className="text-sm text-muted">
            عضو منذ {new Date(profile?.created_at || Date.now()).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'واجبات مكتملة', value: stats?.totalGraded || 0, icon: BookOpen },
            { label: 'حصص حضور', value: stats?.totalPresent || 0, icon: Calendar },
            { label: 'مفردات متقنة', value: stats?.vocabMastered || 0, icon: Target },
            { label: 'إنجازات', value: achievements?.length || 0, icon: Trophy },
          ].map((stat, i) => (
            <div key={i} className="text-center p-3 bg-white/5 rounded-xl">
              <stat.icon size={16} className="text-gold-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-[10px] text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Earned achievements */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">الإنجازات</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {allAchievements.map((achievement, i) => {
            const Icon = achievement.icon
            return (
              <motion.div
                key={achievement.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card p-4 text-center ${
                  achievement.earned
                    ? `border-${achievement.color}-500/30`
                    : 'opacity-40 grayscale'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center ${
                  achievement.earned ? `bg-${achievement.color}-500/10` : 'bg-white/5'
                }`}>
                  <Icon size={24} className={achievement.earned ? `text-${achievement.color}-400` : 'text-muted'} />
                </div>
                <h3 className="text-sm font-bold text-white mb-0.5">{achievement.title}</h3>
                <p className="text-[10px] text-muted">{achievement.desc}</p>
                {achievement.earned && (
                  <span className="text-[10px] text-emerald-400 mt-1 block">✓ حققته</span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
