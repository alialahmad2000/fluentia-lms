import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Flame, Swords, Trophy, Zap, Users, Clock, Crown,
  ArrowLeft, Loader2, Target, Medal,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const BATTLE_TYPES = [
  { id: 'streak', label: 'معركة السلاسل', icon: Flame, description: 'من يحافظ على أطول سلسلة نشاط؟', color: 'gold', duration: 7 },
  { id: 'xp', label: 'سباق النقاط', icon: Zap, description: 'اجمع أكبر عدد من النقاط في أسبوع', color: 'violet', duration: 7 },
  { id: 'assignments', label: 'تحدي الواجبات', icon: Target, description: 'أكمل واجباتك أسرع!', color: 'sky', duration: 5 },
]

export default function StudentStreakBattles() {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()

  // Get group students for battles
  const { data: groupStudents } = useQuery({
    queryKey: ['group-students-battle'],
    queryFn: async () => {
      if (!studentData?.group_id) return []
      const { data } = await supabase
        .from('students')
        .select('id, xp_total, current_streak, profiles(full_name, display_name, avatar_url)')
        .eq('group_id', studentData.group_id)
        .eq('status', 'active')
        .is('deleted_at', null)
      return data || []
    },
    enabled: !!studentData?.group_id,
  })

  // Sort by streak for streak battle
  const streakRanking = [...(groupStudents || [])].sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0))
  const xpRanking = [...(groupStudents || [])].sort((a, b) => (b.xp_total || 0) - (a.xp_total || 0))

  const myRank = streakRanking.findIndex(s => s.id === profile?.id) + 1
  const myXpRank = xpRanking.findIndex(s => s.id === profile?.id) + 1

  if (!studentData?.group_id) {
    return (
      <div className="space-y-12">
        <div>
          <h1 className="text-page-title flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
              <Swords size={20} className="text-gold-400" />
            </div>
            معارك وتحديات
          </h1>
        </div>
        <div className="fl-card-static p-8 text-center">
          <Users size={32} className="text-muted mx-auto mb-2" />
          <p className="text-muted">لم يتم تسجيلك في مجموعة بعد — تواصل مع الإدارة</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
            <Swords size={20} className="text-gold-400" />
          </div>
          معارك وتحديات
        </h1>
        <p className="text-muted text-sm mt-1">تنافس مع زملائك في المجموعة!</p>
      </div>

      {/* My stats */}
      <div className="grid grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="fl-card-static p-4 text-center hover:translate-y-[-2px] transition-all duration-200">
          <Flame size={20} className="text-gold-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{studentData?.current_streak || 0}</p>
          <p className="text-xs text-muted">سلسلة حالية</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="fl-card-static p-4 text-center hover:translate-y-[-2px] transition-all duration-200">
          <Trophy size={20} className="text-sky-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">#{myRank || '—'}</p>
          <p className="text-xs text-muted">ترتيب السلسلة</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="fl-card-static p-4 text-center hover:translate-y-[-2px] transition-all duration-200">
          <Zap size={20} className="text-violet-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">#{myXpRank || '—'}</p>
          <p className="text-xs text-muted">ترتيب النقاط</p>
        </motion.div>
      </div>

      {/* Streak Leaderboard */}
      <div className="fl-card-static p-7">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gold-500/10 flex items-center justify-center">
            <Flame size={16} className="text-gold-400" />
          </div>
          <h2 className="text-section-title" style={{ color: 'var(--text-primary)' }}>ترتيب السلاسل</h2>
        </div>
        <div className="space-y-2">
          {streakRanking.map((student, i) => {
            const sp = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles
            const name = sp?.display_name || sp?.full_name || 'طالب'
            const isMe = student.id === profile?.id
            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  isMe ? 'bg-gold-500/10 border border-gold-500/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-gold-500/20 text-gold-400' :
                    i === 1 ? 'bg-[var(--sidebar-hover-bg)] text-[var(--text-primary)]' :
                    i === 2 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-[var(--surface-raised)] text-muted'
                  }`}>
                    {i === 0 ? <Crown size={14} /> : i + 1}
                  </span>
                  <div>
                    <span className={`text-sm ${isMe ? 'text-gold-400 font-bold' : 'text-[var(--text-primary)]'}`}>
                      {name} {isMe && '(أنت)'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gold-400">
                  <Flame size={14} />
                  <span className="text-sm font-bold">{student.current_streak || 0}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* XP Leaderboard */}
      <div className="fl-card-static p-7">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Zap size={16} className="text-violet-400" />
          </div>
          <h2 className="text-section-title" style={{ color: 'var(--text-primary)' }}>ترتيب النقاط</h2>
        </div>
        <div className="space-y-2">
          {xpRanking.map((student, i) => {
            const sp = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles
            const name = sp?.display_name || sp?.full_name || 'طالب'
            const isMe = student.id === profile?.id
            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  isMe ? 'bg-violet-500/10 border border-violet-500/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-gold-500/20 text-gold-400' :
                    i === 1 ? 'bg-[var(--sidebar-hover-bg)] text-[var(--text-primary)]' :
                    i === 2 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-[var(--surface-raised)] text-muted'
                  }`}>
                    {i === 0 ? <Crown size={14} /> : i + 1}
                  </span>
                  <span className={`text-sm ${isMe ? 'text-violet-400 font-bold' : 'text-[var(--text-primary)]'}`}>
                    {name} {isMe && '(أنت)'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-violet-400">
                  <Zap size={14} />
                  <span className="text-sm font-bold">{student.xp_total || 0}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Quick challenges */}
      <div>
        <h2 className="text-section-title mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Target size={16} className="text-emerald-400" />
          </div>
          تحديات سريعة
        </h2>
        <div className="grid gap-6">
          {[
            { title: 'أكمل 3 واجبات اليوم', reward: 20, progress: 0, total: 3 },
            { title: 'حافظ على السلسلة 7 أيام', reward: 50, progress: studentData?.current_streak || 0, total: 7 },
            { title: 'اجمع 100 XP في المجموع', reward: 30, progress: Math.min(100, studentData?.xp_total || 0), total: 100 },
            { title: 'سجّل يوميات صوتية 5 مرات', reward: 25, progress: 0, total: 5 },
          ].map((challenge, i) => {
            const pct = challenge.total > 0 ? Math.min(100, Math.round((challenge.progress / challenge.total) * 100)) : 0
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="fl-card p-4 hover:translate-y-[-2px] transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--text-primary)]">{challenge.title}</span>
                  <span className="text-xs text-violet-400 flex items-center gap-1">
                    <Zap size={10} />+{challenge.reward} XP
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-1">{challenge.progress}/{challenge.total}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
