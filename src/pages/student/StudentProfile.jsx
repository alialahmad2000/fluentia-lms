import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { User, Zap, Flame, Trophy, Award, Save, Loader2, Clock } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../lib/constants'
import { timeAgo } from '../../utils/dateHelpers'
import NotificationSettings from '../../components/layout/NotificationSettings'
import ImmersionToggle from '../../components/ImmersionToggle'

function getLevel(xp) {
  for (let i = GAMIFICATION_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= GAMIFICATION_LEVELS[i].xp) return GAMIFICATION_LEVELS[i]
  }
  return GAMIFICATION_LEVELS[0]
}

function getNextLevel(xp) {
  for (const lvl of GAMIFICATION_LEVELS) {
    if (xp < lvl.xp) return lvl
  }
  return null
}

export default function StudentProfile() {
  const { profile, studentData, fetchProfile, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [editing, setEditing] = useState(false)

  const xp = studentData?.xp_total || 0
  const streak = studentData?.current_streak || 0
  const currentLevel = getLevel(xp)
  const nextLevel = getNextLevel(xp)
  const xpRange = nextLevel ? (nextLevel.xp - currentLevel.xp) : 0
  const xpProgress = nextLevel && xpRange > 0 ? ((xp - currentLevel.xp) / xpRange) * 100 : 100
  const academicLevel = ACADEMIC_LEVELS[studentData?.academic_level] || ACADEMIC_LEVELS[1]
  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas

  // XP history
  const { data: xpHistory } = useQuery({
    queryKey: ['student-xp-history'],
    queryFn: async () => {
      const { data } = await supabase
        .from('xp_transactions')
        .select('id, amount, reason, description, created_at')
        .eq('student_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(20)
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Achievements
  const { data: achievements } = useQuery({
    queryKey: ['student-achievements'],
    queryFn: async () => {
      const { data: earned } = await supabase
        .from('student_achievements')
        .select('achievement_id, earned_at, achievements(code, name_ar, icon, description_ar, xp_reward)')
        .eq('student_id', profile?.id)
      const { data: all } = await supabase
        .from('achievements')
        .select('id, code, name_ar, icon, description_ar, xp_reward')
        .eq('is_active', true)
        .order('xp_reward')
      const earnedIds = new Set((earned || []).map(e => e.achievement_id))
      return {
        earned: earned || [],
        all: (all || []).map(a => ({ ...a, isEarned: earnedIds.has(a.id) })),
      }
    },
    enabled: !!profile?.id,
  })

  // Update display name
  const updateName = useMutation({
    mutationFn: async () => {
      const trimmed = displayName.trim()
      if (!trimmed) throw new Error('الاسم مطلوب')
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: trimmed })
        .eq('id', profile?.id)
        .select()
      if (error) throw error
    },
    onSuccess: () => {
      setEditing(false)
      if (user) fetchProfile(user)
    },
    onError: (err) => {
      console.error('Failed to update display name:', err)
    },
  })

  const XP_REASON_LABELS = {
    assignment_on_time: 'واجب في الوقت',
    assignment_late: 'واجب متأخر',
    class_attendance: 'حضور حصة',
    correct_answer: 'إجابة صحيحة',
    helped_peer: 'مساعدة زميل',
    shared_summary: 'مشاركة ملخص',
    streak_bonus: 'مكافأة سلسلة',
    achievement: 'إنجاز',
    peer_recognition: 'تقدير زميل',
    challenge: 'تحدي',
    voice_note_bonus: 'مكافأة صوتية',
    writing_bonus: 'مكافأة كتابة',
    daily_challenge: 'تحدي يومي',
    early_bird: 'حضور مبكر',
    custom: 'مخصص',
    penalty_absent: 'غياب',
    penalty_unknown_word: 'كلمة غير معروفة',
    penalty_pronunciation: 'نطق خاطئ',
  }

  return (
    <div className="space-y-12">
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card-raised p-7">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-2xl font-bold shrink-0">
            {(profile?.display_name || profile?.full_name)?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-page-title">{profile?.full_name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted mt-1">
              <span className="badge-blue">{pkg.name_ar}</span>
              <span className="badge-muted">{academicLevel.name_ar} ({academicLevel.cefr})</span>
            </div>

            {/* Edit display name */}
            <div className="mt-3">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    className="input-field text-sm py-1.5 flex-1"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="الاسم المعروض..."
                  />
                  <button
                    onClick={() => updateName.mutate()}
                    disabled={updateName.isPending}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    {updateName.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    حفظ
                  </button>
                  <button onClick={() => { setEditing(false); setDisplayName(profile?.display_name || '') }} className="btn-ghost text-xs">
                    إلغاء
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="text-xs text-sky-400 hover:text-sky-300 transition-all duration-200">
                  تعديل الاسم المعروض: {profile?.display_name || 'لم يُحدد'}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: 'XP', value: xp, icon: Zap, color: 'sky' },
          { label: 'السلسلة', value: `${streak} يوم`, icon: Flame, color: 'gold' },
          { label: 'المستوى', value: currentLevel.level, icon: Trophy, color: 'sky' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="stat-card hover:translate-y-[-2px] transition-all duration-200"
          >
            <div className="stat-icon">
              <div className={`w-10 h-10 rounded-xl ${stat.color === 'gold' ? 'bg-gold-500/10' : 'bg-sky-500/10'} flex items-center justify-center`}>
                <stat.icon size={20} className={stat.color === 'gold' ? 'text-gold-400' : 'text-sky-400'} />
              </div>
            </div>
            <p className="stat-number text-3xl font-bold text-white">{stat.value}</p>
            <p className="stat-label">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Level Progress */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-7">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white">المستوى {currentLevel.level} — <span className="text-gradient">{currentLevel.title_ar}</span></p>
          {nextLevel && <p className="text-xs text-white/40">{nextLevel.xp - xp} XP للتالي</p>}
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-surface-raised)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(xpProgress, 100)}%` }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="h-full bg-gradient-to-l from-sky-400 to-sky-600 rounded-full"
          />
        </div>
      </motion.div>

      {/* Immersion Mode */}
      <ImmersionToggle />

      {/* Notification Settings */}
      <NotificationSettings />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Achievements */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-7">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gold-500/10 flex items-center justify-center">
              <Award size={16} className="text-gold-400" />
            </div>
            <h3 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>الإنجازات</h3>
            <span className="badge-muted text-[10px]">{achievements?.earned?.length || 0}/{achievements?.all?.length || 0}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {achievements?.all?.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`rounded-xl p-3 text-center hover:translate-y-[-2px] transition-all duration-200 ${
                  a.isEarned
                    ? 'bg-gold-500/10 border border-gold-500/20'
                    : 'border border-border-subtle opacity-40'
                }`}
              >
                <span className="text-2xl">{a.icon}</span>
                <p className="text-xs font-medium text-white mt-1">{a.name_ar}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{a.description_ar}</p>
              </motion.div>
            ))}
          </div>
          {(!achievements?.all?.length) && <p className="text-muted text-sm text-center">لا توجد إنجازات</p>}
        </motion.div>

        {/* XP History */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="glass-card p-7">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Clock size={16} className="text-sky-400" />
            </div>
            <h3 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>سجل النقاط</h3>
          </div>
          {xpHistory?.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {xpHistory.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center justify-between rounded-xl p-3 hover:bg-white/[0.08] transition-all duration-200"
                  style={{ background: 'var(--color-bg-surface-raised)' }}
                >
                  <div>
                    <p className="text-xs text-white">{XP_REASON_LABELS[tx.reason] || tx.reason}</p>
                    <p className="text-[10px] text-white/40">{timeAgo(tx.created_at)}</p>
                  </div>
                  <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm text-center">لا توجد نقاط حتى الآن</p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
