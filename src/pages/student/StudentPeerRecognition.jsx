import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Send, Loader2, Users, Star } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/dateHelpers'

export default function StudentPeerRecognition() {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [message, setMessage] = useState('')
  const [toast, setToast] = useState(null)

  const groupId = studentData?.group_id

  // Get classmates (same group, not self)
  const { data: classmates } = useQuery({
    queryKey: ['peer-classmates', groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, xp_total, profiles(full_name, display_name)')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .neq('id', profile?.id)
      return data || []
    },
    enabled: !!groupId,
  })

  // Today's recognitions sent by me (limit: 3/day)
  const { data: todaySent } = useQuery({
    queryKey: ['peer-today-sent', profile?.id],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('peer_recognitions')
        .select('id, to_student, created_at')
        .eq('from_student', profile?.id)
        .gte('created_at', today.toISOString())
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Recent recognitions in the group
  const { data: recentRecognitions } = useQuery({
    queryKey: ['peer-recent', groupId],
    queryFn: async () => {
      // Get all students in the group
      const { data: groupStudents } = await supabase
        .from('students')
        .select('id')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('deleted_at', null)

      const studentIds = (groupStudents || []).map(s => s.id)
      if (!studentIds.length) return []

      const { data } = await supabase
        .from('peer_recognitions')
        .select(`
          id, message, xp_awarded, created_at,
          from_profile:from_student(profiles(full_name, display_name)),
          to_profile:to_student(profiles(full_name, display_name))
        `)
        .in('from_student', studentIds)
        .order('created_at', { ascending: false })
        .limit(20)

      return (data || []).map(r => {
        const fromP = Array.isArray(r.from_profile) ? r.from_profile[0] : r.from_profile
        const toP = Array.isArray(r.to_profile) ? r.to_profile[0] : r.to_profile
        return {
          ...r,
          fromName: fromP?.profiles?.display_name || fromP?.profiles?.full_name || 'طالب',
          toName: toP?.profiles?.display_name || toP?.profiles?.full_name || 'طالب',
        }
      })
    },
    enabled: !!groupId,
  })

  // Helper of the week
  const { data: helperOfWeek } = useQuery({
    queryKey: ['peer-helper-week', groupId],
    queryFn: async () => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const { data: groupStudents } = await supabase
        .from('students')
        .select('id')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('deleted_at', null)

      const studentIds = (groupStudents || []).map(s => s.id)
      if (!studentIds.length) return null

      const { data } = await supabase
        .from('peer_recognitions')
        .select('to_student')
        .in('to_student', studentIds)
        .gte('created_at', weekAgo.toISOString())

      // Count recognitions per student
      const counts = {}
      ;(data || []).forEach(r => {
        counts[r.to_student] = (counts[r.to_student] || 0) + 1
      })

      const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      if (!topId) return null

      const { data: topStudent } = await supabase
        .from('profiles')
        .select('full_name, display_name')
        .eq('id', topId[0])
        .single()

      return {
        name: topStudent?.display_name || topStudent?.full_name || 'طالب',
        count: topId[1],
      }
    },
    enabled: !!groupId,
  })

  // Send recognition
  const sendRecognition = useMutation({
    mutationFn: async () => {
      if (!selectedStudent || !message.trim()) throw new Error('اختر زميل واكتب رسالة')
      if ((todaySent?.length || 0) >= 3) throw new Error('وصلت الحد اليومي (٣ شكر باليوم)')

      const { error } = await supabase.from('peer_recognitions').insert({
        from_student: profile?.id,
        to_student: selectedStudent.id,
        message: message.trim(),
        xp_awarded: 5,
      })
      if (error) throw error

      // Also create XP transaction for receiver
      await supabase.from('xp_transactions').insert({
        student_id: selectedStudent.id,
        amount: 5,
        reason: 'peer_recognition',
        description: `شكر من ${profile?.display_name || profile?.full_name}`,
        awarded_by: profile?.id,
      })

      // Create notification for receiver
      const senderName = profile?.display_name || profile?.full_name || 'زميلك'
      await supabase.from('notifications').insert({
        user_id: selectedStudent.id,
        type: 'peer_recognition',
        title: 'شكر من زميلك 🤝',
        body: `${senderName} شكرك: "${message.trim()}"`,
        data: { from_student: profile?.id },
      })
    },
    onSuccess: () => {
      setToast('تم إرسال الشكر بنجاح! 🤝')
      setSelectedStudent(null)
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['peer-today-sent'] })
      queryClient.invalidateQueries({ queryKey: ['peer-recent'] })
      queryClient.invalidateQueries({ queryKey: ['peer-helper-week'] })
      setTimeout(() => setToast(null), 3000)
    },
    onError: (err) => {
      setToast(err.message)
      setTimeout(() => setToast(null), 3000)
    },
  })

  const remainingToday = 3 - (todaySent?.length || 0)
  const getName = (s) => s.profiles?.display_name || s.profiles?.full_name || 'طالب'

  return (
    <div className="space-y-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <Heart className="text-rose-400" size={20} />
          </div>
          تقدير الزملاء
        </h1>
        <p className="text-muted text-sm mt-1">اشكر زملاءك على مساعدتهم</p>
      </motion.div>

      {/* Helper of the Week */}
      {helperOfWeek && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-7 border-gold-500/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
              <Star size={20} className="text-gold-400" />
            </div>
            <div>
              <p className="text-xs text-gold-400 font-medium">مساعد الأسبوع</p>
              <p className="text-lg font-bold text-white">{helperOfWeek.name}</p>
              <p className="text-xs text-muted">{helperOfWeek.count} شكر هذا الأسبوع</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Send Recognition */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-7"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">أرسل شكر</h3>
          <span className={`text-xs ${remainingToday > 0 ? 'text-muted' : 'text-red-400'}`}>
            {remainingToday > 0 ? `متبقي: ${remainingToday} من ٣` : 'وصلت الحد اليومي'}
          </span>
        </div>

        {/* Classmate picker */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-4">
          {classmates?.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStudent(selectedStudent?.id === s.id ? null : s)}
              disabled={remainingToday <= 0}
              className={`p-3 rounded-xl text-center hover:translate-y-[-2px] transition-all duration-200 border ${
                selectedStudent?.id === s.id
                  ? 'bg-rose-500/10 border-rose-500/30 ring-1 ring-rose-500/10'
                  : 'border-border-subtle hover:bg-white/10'
              } ${remainingToday <= 0 ? 'opacity-40' : ''}`}
              style={selectedStudent?.id !== s.id ? { background: 'var(--color-bg-surface-raised)' } : undefined}
            >
              <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold mx-auto mb-1">
                {getName(s)[0]}
              </div>
              <p className="text-xs text-white truncate">{getName(s)}</p>
            </button>
          ))}
        </div>

        {/* Message + Send */}
        <AnimatePresence>
          {selectedStudent && remainingToday > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <p className="text-xs text-muted">
                أرسل شكر لـ <span className="text-rose-400 font-medium">{getName(selectedStudent)}</span>
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="شكراً لمساعدتك..."
                className="input-field text-sm resize-none h-20"
                maxLength={200}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">{message.length}/200</span>
                <button
                  onClick={() => sendRecognition.mutate()}
                  disabled={!message.trim() || sendRecognition.isPending}
                  className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                >
                  {sendRecognition.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  أرسل شكر (+5 XP)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Recent recognitions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-7"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <Users size={16} className="text-rose-400" />
          </div>
          <h3 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>آخر التقديرات</h3>
        </div>
        {recentRecognitions?.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {recentRecognitions.map((r) => (
              <div key={r.id} className="flex items-start gap-3 rounded-xl p-3" style={{ background: 'var(--color-bg-surface-raised)' }}>
                <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  🤝
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white">
                    <span className="font-medium">{r.fromName}</span>
                    {' '}شكر{' '}
                    <span className="font-medium text-rose-400">{r.toName}</span>
                  </p>
                  {r.message && (
                    <p className="text-xs text-muted mt-1">"{r.message}"</p>
                  )}
                  <p className="text-xs text-muted mt-1">{timeAgo(r.created_at)}</p>
                </div>
                <span className="text-xs text-emerald-400 font-bold">+{r.xp_awarded}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm text-center py-4">لا توجد تقديرات بعد — كن أول من يشكر زميله!</p>
        )}
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-rose-500/20 border border-rose-500/30 text-rose-300 px-6 py-3 rounded-2xl text-sm font-medium z-50 backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
