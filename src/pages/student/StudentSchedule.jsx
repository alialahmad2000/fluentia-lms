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
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">الجدول</h1>
        <p className="text-muted text-sm mt-1">مواعيد الحصص والتسجيلات</p>
      </motion.div>

      {/* Weekly Schedule */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-sky-400" />
          <h3 className="font-medium text-white">الجدول الأسبوعي</h3>
        </div>
        {group ? (
          <div className="space-y-3">
            <p className="text-sm text-white mb-3">{group.name}</p>
            <div className="grid grid-cols-7 gap-1">
              {DAYS_ORDER.map((day) => {
                const isClassDay = sortedDays.includes(day)
                return (
                  <div
                    key={day}
                    className={`text-center p-2 rounded-xl text-xs ${
                      isClassDay
                        ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                        : 'bg-white/5 text-muted'
                    }`}
                  >
                    <p className="font-medium">{getArabicDay(day)}</p>
                    {isClassDay && schedule?.time && (
                      <p className="text-[10px] mt-1">{formatTime(schedule.time)}</p>
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

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Upcoming Classes */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
          <h3 className="font-medium text-white mb-4">الحصص القادمة</h3>
          {upcomingClasses?.length > 0 ? (
            <div className="space-y-2">
              {upcomingClasses.map((c) => (
                <div key={c.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">{c.title || c.topic || 'حصة'}</p>
                      <p className="text-xs text-muted mt-1">
                        {formatDateAr(c.date)} &middot; {formatTime(c.start_time)}
                      </p>
                    </div>
                    {(c.google_meet_link || group?.google_meet_link) && (
                      <a href={c.google_meet_link || group.google_meet_link} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300">
                        <Video size={16} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">لا توجد حصص قادمة مجدولة</p>
          )}
        </motion.div>

        {/* Past Classes */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
          <h3 className="font-medium text-white mb-4">الحصص السابقة</h3>
          {pastClasses?.length > 0 ? (
            <div className="space-y-2">
              {pastClasses.map((c) => (
                <div key={c.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">{c.title || c.topic || 'حصة'}</p>
                      <p className="text-xs text-muted mt-1">{formatDateAr(c.date)}</p>
                    </div>
                    {c.recording_url && (
                      <a href={c.recording_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
                        <Video size={12} /> تسجيل
                      </a>
                    )}
                  </div>
                </div>
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
