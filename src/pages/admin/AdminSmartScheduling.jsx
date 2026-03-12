import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Calendar, Clock, Users, Loader2, Sparkles, AlertCircle,
  CheckCircle2, RefreshCw, ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']
const DAY_LABELS = {
  sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء', thursday: 'الخميس',
}
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00']

const ICON_COLOR_CLASSES = {
  sky: 'text-sky-400',
  violet: 'text-violet-400',
  emerald: 'text-emerald-400',
  red: 'text-red-400',
  gold: 'text-gold-400',
  amber: 'text-amber-400',
}

export default function AdminSmartScheduling() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedDay, setSelectedDay] = useState('sunday')

  const { data: groups } = useQuery({
    queryKey: ['admin-groups-schedule'],
    queryFn: async () => {
      const { data } = await supabase
        .from('groups')
        .select('id, name, code, level, schedule, trainer_id, profiles:trainer_id(full_name, display_name)')
        .order('name')
      return data || []
    },
  })

  const { data: trainers } = useQuery({
    queryKey: ['admin-trainers-schedule'],
    queryFn: async () => {
      const { data } = await supabase
        .from('trainers')
        .select('id, profiles(full_name, display_name)')
      return data || []
    },
  })

  const { data: classes } = useQuery({
    queryKey: ['admin-classes-week'],
    queryFn: async () => {
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 7)

      const { data } = await supabase
        .from('classes')
        .select('*, groups(name, code), profiles:trainer_id(full_name)')
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0])
        .order('start_time')
      return data || []
    },
  })

  // Build schedule grid from groups
  const scheduleByDay = {}
  for (const day of DAYS) {
    scheduleByDay[day] = []
    for (const group of (groups || [])) {
      const schedule = group.schedule
      if (schedule?.days?.includes(day)) {
        scheduleByDay[day].push({
          group,
          time: schedule.time || '—',
          trainer: group.profiles?.display_name || group.profiles?.full_name || '—',
        })
      }
    }
    scheduleByDay[day].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }

  // Detect conflicts (same trainer, same time, different groups)
  const conflicts = []
  for (const day of DAYS) {
    const daySchedule = scheduleByDay[day]
    for (let i = 0; i < daySchedule.length; i++) {
      for (let j = i + 1; j < daySchedule.length; j++) {
        if (daySchedule[i].group.trainer_id === daySchedule[j].group.trainer_id &&
            daySchedule[i].time === daySchedule[j].time) {
          conflicts.push({
            day,
            trainer: daySchedule[i].trainer,
            groups: [daySchedule[i].group.name, daySchedule[j].group.name],
            time: daySchedule[i].time,
          })
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar size={24} className="text-sky-400" />
          الجدولة الذكية
        </h1>
        <p className="text-muted text-sm mt-1">نظرة شاملة على جدول المجموعات واكتشاف التعارضات</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'المجموعات', value: groups?.length || 0, icon: Users, color: 'sky' },
          { label: 'المدربين', value: trainers?.length || 0, icon: Users, color: 'violet' },
          { label: 'حصص الأسبوع', value: classes?.length || 0, icon: Calendar, color: 'emerald' },
          { label: 'تعارضات', value: conflicts.length, icon: AlertCircle, color: conflicts.length > 0 ? 'red' : 'emerald' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted text-xs">{card.label}</span>
              <card.icon size={16} className={ICON_COLOR_CLASSES[card.color] || 'text-sky-400'} />
            </div>
            <p className="text-xl font-bold text-white">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="glass-card p-4 border-red-500/20">
          <h3 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-3">
            <AlertCircle size={16} /> تعارضات في الجدول
          </h3>
          <div className="space-y-2">
            {conflicts.map((c, i) => (
              <div key={i} className="bg-red-500/5 rounded-lg p-3 text-xs text-muted">
                <strong className="text-red-400">{DAY_LABELS[c.day]}</strong> الساعة {c.time} — المدرب {c.trainer}: {c.groups.join(' و ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`text-sm px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              selectedDay === day ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-white/5 text-muted'
            }`}
          >
            {DAY_LABELS[day]}
            <span className="text-[10px] mr-1">({scheduleByDay[day]?.length || 0})</span>
          </button>
        ))}
      </div>

      {/* Schedule for selected day */}
      <div className="glass-card p-5">
        <h2 className="text-lg font-bold text-white mb-4">{DAY_LABELS[selectedDay]}</h2>
        {scheduleByDay[selectedDay]?.length === 0 ? (
          <p className="text-muted text-sm text-center py-8">لا توجد حصص في هذا اليوم</p>
        ) : (
          <div className="space-y-3">
            {scheduleByDay[selectedDay].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <Clock size={14} className="text-sky-400 mx-auto" />
                    <span className="text-xs text-white font-mono">{item.time}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">{item.group.name}</h3>
                    <p className="text-[10px] text-muted">{item.group.code} — المستوى {item.group.level || '—'}</p>
                  </div>
                </div>
                <span className="text-xs text-muted">{item.trainer}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Trainer availability overview */}
      <div className="glass-card p-5">
        <h2 className="text-lg font-bold text-white mb-4">نظرة على المدربين</h2>
        <div className="space-y-3">
          {trainers?.map((trainer, i) => {
            const name = trainer.profiles?.display_name || trainer.profiles?.full_name || 'مدرب'
            const trainerGroups = groups?.filter(g => g.trainer_id === trainer.id) || []
            const totalSessions = trainerGroups.reduce((acc, g) => acc + (g.schedule?.days?.length || 0), 0)

            return (
              <div key={trainer.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                  <h3 className="text-sm font-medium text-white">{name}</h3>
                  <p className="text-[10px] text-muted">{trainerGroups.length} مجموعات</p>
                </div>
                <div className="text-left">
                  <span className={`text-sm font-bold ${totalSessions > 10 ? 'text-red-400' : totalSessions > 6 ? 'text-gold-400' : 'text-emerald-400'}`}>
                    {totalSessions}
                  </span>
                  <p className="text-[10px] text-muted">حصص/أسبوع</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
