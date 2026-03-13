import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Calendar, Trophy, Users, Zap, Clock, Star, Crown,
  Loader2, CheckCircle2, Target, Flame,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const TYPE_CONFIG = {
  seasonal: { label: 'موسمي', color: 'gold', icon: Star },
  competition: { label: 'مسابقة', color: 'red', icon: Trophy },
  challenge: { label: 'تحدي', color: 'violet', icon: Target },
  special: { label: 'مميز', color: 'sky', icon: Flame },
}

const EVENT_COLOR_CLASSES = {
  gold: { border: 'border-gold-500/20', bar: 'bg-gold-500', iconBox: 'bg-gold-500/10', text: 'text-gold-400', badge: 'bg-gold-500/10 text-gold-400' },
  red: { border: 'border-red-500/20', bar: 'bg-red-500', iconBox: 'bg-red-500/10', text: 'text-red-400', badge: 'bg-red-500/10 text-red-400' },
  violet: { border: 'border-violet-500/20', bar: 'bg-violet-500', iconBox: 'bg-violet-500/10', text: 'text-violet-400', badge: 'bg-violet-500/10 text-violet-400' },
  sky: { border: 'border-sky-500/20', bar: 'bg-sky-500', iconBox: 'bg-sky-500/10', text: 'text-sky-400', badge: 'bg-sky-500/10 text-sky-400' },
}

export default function StudentEvents() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('active')

  const { data: events, isLoading } = useQuery({
    queryKey: ['student-events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('seasonal_events')
        .select('*, event_participants(id, student_id, score, rank)')
        .eq('is_active', true)
        .order('start_date', { ascending: false })
      return data || []
    },
  })

  const joinMutation = useMutation({
    mutationFn: async (eventId) => {
      await supabase.from('event_participants').insert({
        event_id: eventId,
        student_id: profile?.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-events'] })
    },
    onError: (err) => {
      console.error('[StudentEvents] join error:', err)
    },
  })

  const now = new Date()
  const activeEvents = events?.filter(e => new Date(e.end_date) > now) || []
  const pastEvents = events?.filter(e => new Date(e.end_date) <= now) || []
  const displayed = tab === 'active' ? activeEvents : pastEvents

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
            <Calendar size={20} className="text-gold-400" />
          </div>
          الفعاليات والمسابقات
        </h1>
        <p className="text-muted text-sm mt-1">شارك في الفعاليات وتنافس مع زملائك</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('active')}
          className={`text-sm px-4 py-2 rounded-xl transition-all ${
            tab === 'active' ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' : 'bg-white/5 text-muted'
          }`}
        >
          نشطة ({activeEvents.length})
        </button>
        <button
          onClick={() => setTab('past')}
          className={`text-sm px-4 py-2 rounded-xl transition-all ${
            tab === 'past' ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' : 'bg-white/5 text-muted'
          }`}
        >
          منتهية ({pastEvents.length})
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-sky-400" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Calendar size={48} className="mx-auto text-muted mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">
            {tab === 'active' ? 'لا توجد فعاليات نشطة حالياً' : 'لا توجد فعاليات سابقة'}
          </h3>
          <p className="text-muted text-sm">ترقب الفعاليات القادمة!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {displayed.map((event, i) => {
            const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.special
            const Icon = config.icon
            const isJoined = event.event_participants?.some(p => p.student_id === profile?.id)
            const participants = event.event_participants?.length || 0
            const daysLeft = Math.max(0, Math.ceil((new Date(event.end_date) - now) / (1000 * 60 * 60 * 24)))
            const myParticipation = event.event_participants?.find(p => p.student_id === profile?.id)

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card overflow-hidden hover:translate-y-[-2px] transition-all duration-200 ${EVENT_COLOR_CLASSES[config.color]?.border || 'border-sky-500/20'}`}
              >
                <div className={`h-1 ${EVENT_COLOR_CLASSES[config.color]?.bar || 'bg-sky-500'}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${EVENT_COLOR_CLASSES[config.color]?.iconBox || 'bg-sky-500/10'} flex items-center justify-center`}>
                        <Icon size={24} className={EVENT_COLOR_CLASSES[config.color]?.text || 'text-sky-400'} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{event.title}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${EVENT_COLOR_CLASSES[config.color]?.badge || 'bg-sky-500/10 text-sky-400'}`}>
                          {config.label}
                        </span>
                      </div>
                    </div>
                    {tab === 'active' && (
                      <div className="text-left">
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Clock size={10} />
                          {daysLeft} يوم متبقي
                        </span>
                      </div>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-sm text-muted mb-3">{event.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted mb-3">
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {participants} مشارك
                    </span>
                    {event.rewards?.xp && (
                      <span className="flex items-center gap-1 text-violet-400">
                        <Zap size={12} /> {event.rewards.xp} XP
                      </span>
                    )}
                  </div>

                  {/* Join / Status */}
                  {tab === 'active' && !isJoined && (
                    <button
                      onClick={() => joinMutation.mutate(event.id)}
                      disabled={joinMutation.isPending}
                      className="btn-primary w-full text-sm py-2.5"
                    >
                      {joinMutation.isPending ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'انضم الآن'}
                    </button>
                  )}

                  {isJoined && (
                    <div className="flex items-center justify-between bg-emerald-500/5 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 size={14} />
                        <span className="text-xs">مشارك</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {myParticipation?.score > 0 && (
                          <span className="text-xs text-white">النقاط: {myParticipation.score}</span>
                        )}
                        {myParticipation?.rank && (
                          <span className="text-xs text-gold-400 flex items-center gap-1">
                            <Crown size={10} /> #{myParticipation.rank}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
