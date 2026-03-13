import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/dateHelpers'
import { NOTIFICATION_TYPES } from '../../lib/constants'

// Map notification types to routes
const NOTIFICATION_ROUTES = {
  assignment_new: '/student/assignments',
  assignment_deadline: '/student/assignments',
  assignment_graded: '/student/grades',
  class_reminder: '/student/schedule',
  trainer_note: '/student/assignments',
  achievement: '/student/profile',
  peer_recognition: '/student/recognition',
  team_update: '/student/leaderboard',
  payment_reminder: '/student/profile',
  level_up: '/student/profile',
  streak_warning: '/student',
  system: null,
}

export default function NotificationCenter() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close on click outside
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(30)
      return data || []
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  })

  // Unread count
  const unreadCount = notifications?.filter(n => !n.read).length || 0

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', profile.id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, queryClient])

  // Mark single as read
  const markRead = useMutation({
    mutationFn: async (id) => {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] })
    },
  })

  // Mark all as read — capture profile.id at call time via mutationFn arg
  const markAllRead = useMutation({
    mutationFn: async (userId) => {
      if (!userId) return
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] })
    },
  })

  function handleNotificationClick(notification) {
    // Mark as read
    if (!notification.read) {
      markRead.mutate(notification.id)
    }

    // Navigate to relevant page
    const role = profile?.role
    let route = NOTIFICATION_ROUTES[notification.type]

    // Adjust routes for trainer/admin
    if (role === 'trainer' || role === 'admin') {
      if (notification.type === 'assignment_new' || notification.type === 'assignment_graded') {
        route = '/trainer/assignments'
      } else if (notification.type === 'class_reminder') {
        route = '/trainer/schedule'
      }
    }

    // Use link from notification data if available
    if (notification.data?.link) {
      route = notification.data.link
    }

    if (route) {
      navigate(route)
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="الإشعارات"
        className="relative btn-icon text-muted hover:text-white transition-all duration-200 p-1.5"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            aria-live="polite"
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label="مركز الإشعارات"
            className="absolute top-full left-0 mt-2 w-80 sm:w-96 glass-card-raised rounded-2xl shadow-2xl overflow-hidden z-50"
            style={{ maxHeight: '70vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">الإشعارات</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate(profile?.id)}
                    className="btn-ghost text-xs text-sky-400 hover:text-sky-300 transition-all duration-200 flex items-center gap-1 px-2 py-1 rounded-lg"
                  >
                    <CheckCheck size={12} /> قراءة الكل
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="btn-ghost p-1.5 rounded-xl text-muted hover:text-white transition-all duration-200"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 48px)' }}>
              {notifications?.length > 0 ? (
                notifications.map((n) => {
                  const typeConfig = NOTIFICATION_TYPES[n.type] || NOTIFICATION_TYPES.system
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-right flex items-start gap-3 px-5 py-3.5 hover:bg-white/5 transition-all duration-200 border-b border-white/5 ${
                        !n.read ? 'bg-sky-500/[0.03]' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-lg shrink-0">{typeConfig.icon}</div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${!n.read ? 'text-white' : 'text-muted'}`}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-muted truncate mt-0.5">{n.body}</p>
                        <p className="text-[10px] text-muted mt-1">{timeAgo(n.created_at)}</p>
                      </div>

                      {/* Unread dot */}
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-sky-400 shrink-0 mt-2" />
                      )}
                    </button>
                  )
                })
              ) : (
                <div className="px-4 py-8 text-center">
                  <Bell size={24} className="text-muted mx-auto mb-2 opacity-30" />
                  <p className="text-xs text-muted">لا توجد إشعارات</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
