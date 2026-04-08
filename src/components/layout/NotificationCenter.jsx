import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/dateHelpers'
import { NOTIFICATION_TYPES } from '../../lib/constants'
import { updateAppBadge, listenForSWMessages } from '../../utils/pushSubscribe'

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
  weekly_tasks_ready: '/student/weekly-tasks',
  weekly_tasks_remind: '/student/weekly-tasks',
  weekly_tasks_urgent: '/student/weekly-tasks',
  spelling_milestone: '/student/spelling',
  challenge_new: '/student/challenges',
  challenge_reminder: '/student/challenges',
  challenge_complete: '/student/challenges',
  creator_challenge: '/student/creator-challenge',
  test_result: '/student/profile',
  curriculum_progress: '/student/curriculum',
  speaking_feedback: '/student/speaking',
  smart_nudge: '/student',
  task_completed: '/student/weekly-tasks',
  system: null,
  announcement: null,
}

function groupNotificationsByDate(notifications) {
  const groups = {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  for (const n of notifications) {
    const d = new Date(n.created_at)
    d.setHours(0, 0, 0, 0)
    let label
    if (d.getTime() === today.getTime()) {
      label = 'اليوم'
    } else if (d.getTime() === yesterday.getTime()) {
      label = 'أمس'
    } else {
      label = d.toLocaleDateString('ar-SA', { weekday: 'long', month: 'short', day: 'numeric' })
    }
    if (!groups[label]) groups[label] = { label, items: [] }
    groups[label].items.push(n)
  }
  return Object.values(groups)
}

export default function NotificationCenter() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
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

  // Unread count + sync app badge
  const unreadCount = notifications?.filter(n => !n.read).length || 0

  useEffect(() => {
    updateAppBadge(unreadCount)
  }, [unreadCount])

  // Listen for SW notification clicks → mark as read + refetch
  useEffect(() => {
    listenForSWMessages((data) => {
      if (data.notificationId) {
        supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', data.notificationId)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] })
          })
      }
    })
  }, [])

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

    // 1. First priority: action_url or data.link (explicit target from the notification sender)
    let route = notification.action_url || notification.data?.link || null

    // 2. Fallback: type-based route mapping
    if (!route) {
      route = NOTIFICATION_ROUTES[notification.type]
    }

    // 3. Adjust routes for trainer/admin
    if (role === 'trainer' || role === 'admin') {
      if (notification.type === 'assignment_new' || notification.type === 'assignment_graded') {
        route = route || '/trainer/assignments'
      } else if (notification.type === 'class_reminder') {
        route = route || '/trainer/schedule'
      }
    }

    // 4. Adjust route for current role — map student routes to known equivalents
    if (route && route.startsWith('/student/') && (role === 'admin' || role === 'trainer')) {
      const ROLE_ROUTE_MAP = {
        admin: {
          '/student/challenges': '/admin/creator-challenge',
          '/student/creator-challenge': '/admin/creator-challenge',
          '/student/assignments': '/admin/reports',
          '/student/weekly-tasks': '/admin/weekly-tasks',
          '/student/curriculum': '/admin/curriculum',
          '/student/profile': '/admin/users',
        },
        trainer: {
          '/student/challenges': '/trainer/challenges',
          '/student/creator-challenge': '/trainer/challenges',
          '/student/assignments': '/trainer/assignments',
          '/student/weekly-tasks': '/trainer/weekly-grading',
          '/student/curriculum': '/trainer/curriculum',
          '/student/schedule': '/trainer/schedule',
          '/student/profile': '/trainer/students',
        },
      }
      route = ROLE_ROUTE_MAP[role]?.[route] || route.replace('/student/', `/${role}/`)
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
        className="relative btn-icon text-muted transition-all duration-200 p-1.5 hover:scale-110 active:scale-95"
      >
        <Bell size={20} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <>
            {/* Pulse ring */}
            <span className="absolute -top-1 -end-1 w-5 h-5 bg-red-500 rounded-full animate-ping opacity-40" />
            {/* Badge */}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              aria-live="polite"
              className="absolute -top-1 -end-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          </>
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
            className="absolute top-full end-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden z-50"
            style={{ maxHeight: '70vh', background: 'var(--color-dropdown-bg)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid var(--border-default)', boxShadow: '0 8px 32px var(--shadow-sm), 0 0 0 1px var(--border-subtle)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>الإشعارات</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate(profile?.id)}
                    className="btn-ghost text-xs text-sky-400 hover:text-sky-300 transition-all duration-200 flex items-center gap-1 px-3 py-2.5 min-h-[44px] rounded-lg"
                  >
                    <CheckCheck size={12} /> قراءة الكل
                  </button>

                )}
                <button
                  onClick={() => setOpen(false)}
                  className="btn-icon text-muted transition-all duration-200"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notification list — grouped by date */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 48px)' }}>
              {notifications?.length > 0 ? (
                groupNotificationsByDate(notifications).map((group) => (
                  <div key={group.label}>
                    {/* Date header */}
                    <div className="px-5 py-2 sticky top-0" style={{ background: 'var(--surface-base)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        {group.label}
                      </span>
                    </div>
                    {group.items.map((n) => {
                      const typeConfig = NOTIFICATION_TYPES[n.type] || NOTIFICATION_TYPES.system
                      const isExpanded = expandedId === n.id
                      const isLong = n.body && n.body.length > 60
                      return (
                        <div
                          key={n.id}
                          className={`w-full text-right transition-all duration-200 ${
                            !n.read ? 'bg-sky-500/[0.03]' : ''
                          }`}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
                          onMouseLeave={e => e.currentTarget.style.background = !n.read ? 'rgba(56,189,248,0.03)' : ''}
                        >
                          <button
                            onClick={() => {
                              const hasRoute = n.action_url || n.data?.link || NOTIFICATION_ROUTES[n.type]
                              // Long notifications: expand first so user can read, then navigate via action button
                              if (isLong && !isExpanded) {
                                setExpandedId(n.id)
                                if (!n.read) markRead.mutate(n.id)
                              } else if (hasRoute) {
                                handleNotificationClick(n)
                              } else {
                                // Short notification without route — just mark as read
                                if (!n.read) markRead.mutate(n.id)
                              }
                            }}
                            className="w-full text-right flex items-start gap-3 px-5 py-3.5"
                          >
                            {/* Icon */}
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: 'var(--surface-raised)' }}>{typeConfig.icon}</div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium" style={{ color: !n.read ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                                {n.title}
                              </p>
                              <AnimatePresence mode="wait">
                                {isExpanded ? (
                                  <motion.p
                                    key="full"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-xs mt-1 leading-relaxed whitespace-pre-wrap"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    {n.body}
                                  </motion.p>
                                ) : (
                                  <motion.p
                                    key="truncated"
                                    className={`text-xs text-muted mt-0.5 ${isLong ? 'truncate' : ''}`}
                                  >
                                    {n.body}
                                  </motion.p>
                                )}
                              </AnimatePresence>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted">{timeAgo(n.created_at)}</p>
                                {isLong && (
                                  <span className="text-[10px] text-sky-400">
                                    {isExpanded ? 'إغلاق' : 'عرض المزيد'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Unread dot */}
                            {!n.read && (
                              <div className="w-2 h-2 rounded-full bg-sky-400 shrink-0 mt-2" />
                            )}
                          </button>

                          {/* Expanded action bar */}
                          {isExpanded && (n.action_url || n.data?.link || NOTIFICATION_ROUTES[n.type]) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="px-5 pb-3 flex items-center gap-2"
                              style={{ paddingRight: 'calc(1.25rem + 36px + 0.75rem)' }}
                            >
                              <button
                                onClick={() => handleNotificationClick(n)}
                                className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all"
                                style={{ background: 'rgba(56,189,248,0.1)', color: 'var(--accent-sky)' }}
                              >
                                {n.action_label || 'فتح'}
                              </button>
                              <button
                                onClick={() => setExpandedId(null)}
                                className="text-[11px] px-3 py-1.5 rounded-lg transition-all"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                إغلاق
                              </button>
                            </motion.div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))
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
