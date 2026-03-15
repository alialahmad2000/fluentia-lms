import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Calendar, Clock, Video, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getArabicDay, formatTime, formatDateAr } from '../../utils/dateHelpers'

const DAYS_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function StudentSchedule() {
  const { studentData } = useAuthStore()
  const group = studentData?.groups

  // Upcoming classes from classes table
  const { data: upcomingClasses } = useQuery({
    queryKey: ['student-upcoming-classes'],
    queryFn: async () => {
      if (!group?.id) return []
      const { data } = await supabase
        .from('classes')
        .select('id, title, topic, date, start_time, end_time, google_meet_link, status, recording_url')
        .eq('group_id', group.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date')
        .order('start_time')
        .limit(10)
      return data || []
    },
    enabled: !!group?.id,
  })

  // Past classes with recordings
  const { data: pastClasses } = useQuery({
    queryKey: ['student-past-classes'],
    queryFn: async () => {
      if (!group?.id) return []
      const { data } = await supabase
        .from('classes')
        .select('id, title, topic, date, start_time, end_time, recording_url, status')
        .eq('group_id', group.id)
        .lt('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(10)
      return data || []
    },
    enabled: !!group?.id,
  })

  const schedule = group?.schedule
  const sortedDays = schedule?.days
    ? [...schedule.days].sort((a, b) => DAYS_ORDER.indexOf(a) - DAYS_ORDER.indexOf(b))
    : []

  return (
    <div className="space-y-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Calendar size={22} className="text-sky-400" />
          </div>
          الجدول
        </h1>
        <p className="text-muted text-sm mt-1">مواعيد الحصص والتسجيلات</p>
      </motion.div>

      {/* Weekly Schedule */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass-card-raised p-7">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Calendar size={16} className="text-sky-400" />
          </div>
          <h3 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>الجدول الأسبوعي</h3>
        </div>
        {group ? (
          <div className="space-y-3">
            <p className="text-sm text-white mb-3">{group.name}</p>
            <div className="grid grid-cols-7 gap-2">
              {DAYS_ORDER.map((day) => {
                const isClassDay = sortedDays.includes(day)
                return (
                  <div
                    key={day}
                    className={`text-center p-3 rounded-xl text-xs transition-all duration-200 hover:translate-y-[-2px] ${
                      isClassDay
                        ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                        : 'text-muted border border-transparent'
                    }`}
                  >
                    <p className="font-medium">{getArabicDay(day)}</p>
                    {isClassDay && schedule?.time && (
                      <p className="text-xs mt-1 text-white/40">{formatTime(schedule.time)}</p>
                    )}
                  </div>
                )
              })}
            </div>
            {group.google_meet_link && (
              <a
                href={group.google_meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2 text-sm mt-3 py-2 px-4"
              >
                <Video size={14} />
                <span>رابط الحصة</span>
                <ArrowLeft size={14} />
              </a>
            )}
          </div>
        ) : (
          <p className="text-muted text-sm">لا توجد مجموعة مسجلة</p>
        )}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Classes */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="glass-card p-7">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Clock size={16} className="text-emerald-400" />
            </div>
            <h3 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>الحصص القادمة</h3>
          </div>
          {upcomingClasses?.length > 0 ? (
            <div className="space-y-3">
              {upcomingClasses.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-xl p-3 hover:bg-white/[0.08] transition-all duration-200"
                  style={{ background: 'var(--color-bg-surface-raised)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">{c.title || c.topic || 'حصة'}</p>
                      <p className="text-xs text-white/40 mt-1">
                        {formatDateAr(c.date)} &middot; {formatTime(c.start_time)}
                      </p>
                    </div>
                    {(c.google_meet_link || group?.google_meet_link) && (
                      <a href={c.google_meet_link || group.google_meet_link} target="_blank" rel="noopener noreferrer" className="btn-icon text-sky-400 hover:text-sky-300">
                        <Video size={16} />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">لا توجد حصص قادمة مجدولة</p>
          )}
        </motion.div>

        {/* Past Classes */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="glass-card p-7">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Video size={16} className="text-violet-400" />
            </div>
            <h3 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>الحصص السابقة</h3>
          </div>
          {pastClasses?.length > 0 ? (
            <div className="space-y-3">
              {pastClasses.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-xl p-3 hover:bg-white/[0.08] transition-all duration-200"
                  style={{ background: 'var(--color-bg-surface-raised)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">{c.title || c.topic || 'حصة'}</p>
                      <p className="text-xs text-white/40 mt-1">{formatDateAr(c.date)}</p>
                    </div>
                    {c.recording_url && (
                      <a href={c.recording_url} target="_blank" rel="noopener noreferrer"
                        className="badge-blue flex items-center gap-1 hover:translate-y-[-2px] transition-all duration-200">
                        <Video size={12} /> تسجيل
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">لا توجد حصص سابقة</p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
