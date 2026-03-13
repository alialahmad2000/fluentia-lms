import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Clock, Zap, Trophy, CheckCircle2, Loader2, Users } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/dateHelpers'

const CHALLENGE_TYPE_LABELS = {
  weekly: { label: 'أسبوعي', color: 'sky', icon: '📅' },
  team: { label: 'فريق', color: 'violet', icon: '👥' },
  one_v_one: { label: '1 ضد 1', color: 'rose', icon: '⚔️' },
  thirty_day: { label: '30 يوم', color: 'gold', icon: '🔥' },
  trainer_custom: { label: 'من المدرب', color: 'sky', icon: '⭐' },
  social: { label: 'اجتماعي', color: 'green', icon: '📱' },
}

const TAB_FILTERS = [
  { value: 'active', label: 'النشطة' },
  { value: 'completed', label: 'المكتملة' },
  { value: 'all', label: 'الكل' },
]

export default function StudentChallenges() {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('active')
  const [toast, setToast] = useState(null)

  const groupId = studentData?.group_id

  // Fetch challenges for this group
  const { data: challenges, isLoading } = useQuery({
    queryKey: ['student-challenges', groupId, tab],
    queryFn: async () => {
      const now = new Date().toISOString()
      let query = supabase
        .from('challenges')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (tab === 'active') {
        query = query.gte('end_date', now).lte('start_date', now)
      } else if (tab === 'completed') {
        query = query.lt('end_date', now)
      }

      const { data } = await query
      return data || []
    },
    enabled: !!groupId,
  })

  // Fetch my participation status for all challenges
  const { data: myParticipation } = useQuery({
    queryKey: ['challenge-participation', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('challenge_participants')
        .select('challenge_id, status, progress, completed_at')
        .eq('student_id', profile?.id)
      const map = {}
      ;(data || []).forEach(p => { map[p.challenge_id] = p })
      return map
    },
    enabled: !!profile?.id,
  })

  // Fetch participant counts for challenges
  const { data: participantCounts } = useQuery({
    queryKey: ['challenge-counts', groupId],
    queryFn: async () => {
      const challengeIds = (challenges || []).map(c => c.id)
      if (!challengeIds.length) return {}

      const { data } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .in('challenge_id', challengeIds)

      const counts = {}
      ;(data || []).forEach(p => {
        counts[p.challenge_id] = (counts[p.challenge_id] || 0) + 1
      })
      return counts
    },
    enabled: !!challenges?.length,
  })

  // Join a challenge
  const joinChallenge = useMutation({
    mutationFn: async (challengeId) => {
      const { error } = await supabase.from('challenge_participants').insert({
        challenge_id: challengeId,
        student_id: profile?.id,
        status: 'joined',
        progress: {},
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenge-participation'] })
      queryClient.invalidateQueries({ queryKey: ['challenge-counts'] })
      setToast('تم الانضمام للتحدي!')
      setTimeout(() => setToast(null), 2500)
    },
    onError: (err) => {
      setToast(err.message || 'حدث خطأ — حاول مرة أخرى')
      setTimeout(() => setToast(null), 3000)
    },
  })

  function getDaysLeft(endDate) {
    const diff = new Date(endDate) - new Date()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'انتهى'
    if (days === 1) return 'يوم واحد'
    if (days <= 10) return `${days} أيام`
    return `${days} يوم`
  }

  function isActive(challenge) {
    const now = new Date()
    return new Date(challenge.start_date) <= now && new Date(challenge.end_date) >= now
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Target className="text-sky-400" size={24} />
          التحديات
        </h1>
        <p className="text-muted text-sm mt-1">شارك في التحديات واكسب نقاط إضافية</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TAB_FILTERS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.value
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'bg-white/5 text-muted hover:text-white border border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-32 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Challenge List */}
      {!isLoading && challenges && (
        <div className="space-y-3">
          {challenges.map((challenge, index) => {
            const typeConfig = CHALLENGE_TYPE_LABELS[challenge.type] || CHALLENGE_TYPE_LABELS.weekly
            const participation = myParticipation?.[challenge.id]
            const joined = !!participation
            const completed = participation?.status === 'completed'
            const active = isActive(challenge)
            const count = participantCounts?.[challenge.id] || 0

            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`glass-card p-5 ${completed ? 'border-emerald-500/20' : active ? 'border-sky-500/10' : 'opacity-60'}`}
              >
                <div className="flex items-start gap-4">
                  {/* Type icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                    typeConfig.color === 'gold' ? 'bg-gold-500/10' :
                    typeConfig.color === 'rose' ? 'bg-rose-500/10' :
                    typeConfig.color === 'violet' ? 'bg-violet-500/10' :
                    typeConfig.color === 'green' ? 'bg-emerald-500/10' :
                    'bg-sky-500/10'
                  }`}>
                    {typeConfig.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        typeConfig.color === 'gold' ? 'bg-gold-500/10 text-gold-400' :
                        typeConfig.color === 'rose' ? 'bg-rose-500/10 text-rose-400' :
                        typeConfig.color === 'violet' ? 'bg-violet-500/10 text-violet-400' :
                        typeConfig.color === 'green' ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-sky-500/10 text-sky-400'
                      }`}>
                        {typeConfig.label}
                      </span>
                      {completed && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium flex items-center gap-0.5">
                          <CheckCircle2 size={10} /> مكتمل
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white">{challenge.title_ar}</h3>
                    {challenge.description_ar && (
                      <p className="text-xs text-muted mt-1">{challenge.description_ar}</p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Zap size={12} className="text-sky-400" /> {challenge.xp_reward} XP
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {active ? getDaysLeft(challenge.end_date) : 'انتهى'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {count} مشارك
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="shrink-0">
                    {!joined && active && (
                      <button
                        onClick={() => joinChallenge.mutate(challenge.id)}
                        disabled={joinChallenge.isPending}
                        className="btn-primary text-xs py-2 px-4"
                      >
                        {joinChallenge.isPending ? <Loader2 size={12} className="animate-spin" /> : 'شارك'}
                      </button>
                    )}
                    {joined && !completed && active && (
                      <div className="text-center">
                        <span className="badge-blue">مشارك</span>
                      </div>
                    )}
                    {completed && (
                      <div className="text-center">
                        <Trophy size={20} className="text-gold-400 mx-auto" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar for joined challenges */}
                {joined && challenge.target && (
                  <div className="mt-3">
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(((participation.progress?.current || 0) / (challenge.target.count || 1)) * 100, 100)}%` }}
                        className="h-full bg-gradient-to-l from-sky-400 to-sky-600 rounded-full"
                      />
                    </div>
                    <p className="text-[10px] text-muted mt-1">
                      {participation.progress?.current || 0} / {challenge.target.count || '?'}
                    </p>
                  </div>
                )}
              </motion.div>
            )
          })}

          {challenges.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-12 text-center"
            >
              <Target size={48} className="text-muted mx-auto mb-3 opacity-30" />
              <p className="text-muted">
                {tab === 'active' ? 'لا توجد تحديات نشطة حالياً' : 'لا توجد تحديات'}
              </p>
              <p className="text-xs text-muted mt-1">سيقوم المدرب بإنشاء تحديات جديدة قريباً</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-sky-500/20 border border-sky-500/30 text-sky-400 px-6 py-3 rounded-2xl text-sm font-medium z-50 backdrop-blur-xl"
          >
            <Target size={14} className="inline ml-1" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
