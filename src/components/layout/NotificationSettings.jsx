import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, ChevronDown, ClipboardList, CalendarCheck, Trophy, MessageCircle, CreditCard, Brain, Settings, Swords } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { NOTIFICATION_TYPES } from '../../lib/constants'

// ─── Category Color Map ──────────────────────────────────
const CATEGORY_COLORS = {
  tasks:         { bg: 'rgba(56, 189, 248, 0.10)',  text: '#38bdf8',  accent: '#38bdf8' },  // sky
  attendance:    { bg: 'rgba(139, 92, 246, 0.10)',   text: '#a78bfa',  accent: '#8b5cf6' },  // violet
  achievements:  { bg: 'rgba(245, 158, 11, 0.10)',   text: '#fbbf24',  accent: '#f59e0b' },  // amber
  communication: { bg: 'rgba(52, 211, 153, 0.10)',   text: '#6ee7b7',  accent: '#34d399' },  // emerald
  financial:     { bg: 'rgba(251, 113, 133, 0.10)',  text: '#fb7185',  accent: '#f43f5e' },  // rose
  ai:            { bg: 'rgba(168, 85, 247, 0.10)',   text: '#c084fc',  accent: '#a855f7' },  // purple
  system:        { bg: 'rgba(148, 163, 184, 0.10)',  text: '#94a3b8',  accent: '#64748b' },  // slate
}

// ─── Category Definitions ──────────────────────────────────
const CATEGORIES = [
  {
    key: 'tasks',
    labelKey: 'common.notifications.category.tasks',
    icon: ClipboardList,
    types: ['assignment_new', 'assignment_deadline', 'assignment_graded', 'weekly_tasks_ready', 'weekly_tasks_remind', 'weekly_tasks_urgent'],
  },
  {
    key: 'attendance',
    labelKey: 'common.notifications.category.attendance',
    icon: CalendarCheck,
    types: ['class_reminder'],
  },
  {
    key: 'achievements',
    labelKey: 'common.notifications.category.achievements',
    icon: Trophy,
    types: ['achievement', 'level_up', 'streak_warning', 'spelling_milestone'],
  },
  {
    key: 'communication',
    labelKey: 'common.notifications.category.communication',
    icon: MessageCircle,
    types: ['trainer_note', 'peer_recognition', 'team_update'],
  },
  {
    key: 'financial',
    labelKey: 'common.notifications.category.financial',
    icon: CreditCard,
    types: ['payment_reminder'],
  },
  {
    key: 'ai',
    labelKey: 'common.notifications.category.ai',
    icon: Brain,
    types: ['smart_nudge', 'test_result', 'curriculum_progress', 'speaking_feedback'],
  },
  {
    key: 'system',
    labelKey: 'common.notifications.category.system',
    icon: Settings,
    types: ['system'],
  },
]

// All notification types across categories
const ALL_TYPES = CATEGORIES.flatMap(c => c.types)

// ─── Toggle Switch Component ───────────────────────────────
function Toggle({ enabled, onToggle, size = 'md', color }) {
  const sizes = size === 'lg'
    ? { track: 'w-12 h-6', knob: 'w-5 h-5', translate: enabled ? 'translate-x-[1.625rem]' : 'translate-x-[0.125rem]' }
    : { track: 'w-10 h-5', knob: 'w-4 h-4', translate: enabled ? 'translate-x-[1.375rem]' : 'translate-x-[0.125rem]' }

  return (
    <button
      onClick={onToggle}
      className={`${sizes.track} rounded-full transition-all duration-300 relative flex-shrink-0 cursor-pointer`}
      style={{ background: enabled ? (color || 'var(--accent-sky, #38bdf8)') : 'var(--surface-raised, #1e293b)' }}
    >
      <div
        className={`${sizes.knob} rounded-full bg-white absolute top-0.5 transition-all duration-300 ${sizes.translate}`}
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
      />
    </button>
  )
}

// ─── Arabic Number Formatter ───────────────────────────────
function toArabicNum(n) {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])
}

// ─── Main Component ────────────────────────────────────────
export default function NotificationSettings() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [openCategories, setOpenCategories] = useState({})
  // Local prefs state: { [notification_type]: boolean }
  // true = enabled, false = disabled. Missing = enabled (default)
  const [localPrefs, setLocalPrefs] = useState({})
  const debounceRef = useRef(null)
  const pendingChangesRef = useRef({})

  // ── Fetch existing preferences from Supabase ──
  const { data: serverPrefs, isLoading } = useQuery({
    queryKey: ['notification-preferences', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('notification_type, enabled')
        .eq('user_id', profile.id)
      if (error) throw error
      const map = {}
      for (const row of data || []) {
        map[row.notification_type] = row.enabled
      }
      return map
    },
    enabled: !!profile?.id,
    staleTime: 30000,
  })

  // Sync server prefs into local state on load
  useEffect(() => {
    if (serverPrefs) {
      setLocalPrefs(serverPrefs)
    }
  }, [serverPrefs])

  // ── Upsert mutation ──
  const upsertMutation = useMutation({
    mutationFn: async (changes) => {
      const rows = Object.entries(changes).map(([notification_type, enabled]) => ({
        user_id: profile.id,
        notification_type,
        category: getCategoryForType(notification_type),
        enabled,
      }))
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(rows, { onConflict: 'user_id,notification_type' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', profile?.id] })
    },
  })

  function getCategoryForType(type) {
    if (type === 'master_kill') return 'system'
    for (const cat of CATEGORIES) {
      if (cat.types.includes(type)) return cat.key
    }
    return 'system'
  }

  // ── Debounced save ──
  const scheduleSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const changes = { ...pendingChangesRef.current }
      pendingChangesRef.current = {}
      if (Object.keys(changes).length > 0) {
        upsertMutation.mutate(changes)
      }
    }, 500)
  }, [upsertMutation])

  // ── Toggle a single notification type ──
  function toggleType(type) {
    const currentVal = localPrefs[type] !== undefined ? localPrefs[type] : true
    const newVal = !currentVal
    setLocalPrefs(prev => ({ ...prev, [type]: newVal }))
    pendingChangesRef.current[type] = newVal
    scheduleSave()
  }

  // ── Toggle all types in a category ──
  function toggleCategory(category) {
    const enabledCount = category.types.filter(t => isEnabled(t)).length
    const allEnabled = enabledCount === category.types.length
    const newVal = !allEnabled

    setLocalPrefs(prev => {
      const updated = { ...prev }
      for (const type of category.types) {
        updated[type] = newVal
        pendingChangesRef.current[type] = newVal
      }
      return updated
    })
    scheduleSave()
  }

  // ── Master kill toggle ──
  function toggleMasterKill() {
    const masterOff = localPrefs['master_kill'] === true
    const newVal = !masterOff // toggling: if currently killed, un-kill

    setLocalPrefs(prev => {
      const updated = { ...prev, master_kill: !masterOff }
      // When enabling master kill, disable everything
      if (!masterOff) {
        for (const type of ALL_TYPES) {
          updated[type] = false
          pendingChangesRef.current[type] = false
        }
      }
      pendingChangesRef.current['master_kill'] = !masterOff
      return updated
    })
    scheduleSave()
  }

  // Helper: is a type enabled?
  function isEnabled(type) {
    return localPrefs[type] !== undefined ? localPrefs[type] : true
  }

  const masterKilled = localPrefs['master_kill'] === true

  // ── Accordion toggle ──
  function toggleAccordion(key) {
    setOpenCategories(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ── Competition preferences (jsonb on profiles) ──
  const { data: compPrefs } = useQuery({
    queryKey: ['competition-notif-prefs', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', profile.id)
        .single()
      return data?.notification_preferences ?? { competition_digest: true, competition_events: true }
    },
    enabled: !!profile?.id,
    staleTime: 30000,
  })

  const [compLocalPrefs, setCompLocalPrefs] = useState({ competition_digest: true, competition_events: true })
  useEffect(() => { if (compPrefs) setCompLocalPrefs(compPrefs) }, [compPrefs])

  const updateCompPrefs = useMutation({
    mutationFn: async (prefs) => {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: prefs })
        .eq('id', profile.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-notif-prefs', profile?.id] })
    },
  })

  function toggleCompPref(key) {
    const updated = { ...compLocalPrefs, [key]: !compLocalPrefs[key] }
    setCompLocalPrefs(updated)
    updateCompPrefs.mutate(updated)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        // Flush pending changes
        const changes = { ...pendingChangesRef.current }
        pendingChangesRef.current = {}
        if (Object.keys(changes).length > 0 && profile?.id) {
          const rows = Object.entries(changes).map(([notification_type, enabled]) => ({
            user_id: profile.id,
            notification_type,
            category: getCategoryForType(notification_type),
            enabled,
          }))
          supabase
            .from('notification_preferences')
            .upsert(rows, { onConflict: 'user_id,notification_type' })
            .then(() => {})
        }
      }
    }
  }, [profile?.id])

  if (isLoading) {
    return (
      <div className="fl-card-static p-6 flex items-center justify-center gap-3">
        <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted">{t('common.loading', 'جارٍ التحميل…')}</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="fl-card-static p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Bell size={18} className="text-sky-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('common.notifications.settings.title')}</h3>
              <p className="text-sm text-muted">{t('common.notifications.settings.description')}</p>
            </div>
          </div>
          {upsertMutation.isPending && (
            <span className="text-xs text-muted flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              {t('common.saving')}
            </span>
          )}
        </div>

        {/* Master Kill Switch */}
        <div
          className="mt-5 flex items-center justify-between p-4 rounded-xl transition-all duration-300"
          style={{
            background: masterKilled ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface-base)',
            border: `1px solid ${masterKilled ? 'rgba(239, 68, 68, 0.2)' : 'var(--border-subtle)'}`,
          }}
        >
          <div className="flex items-center gap-3">
            <BellOff size={18} className={masterKilled ? 'text-red-400' : 'text-muted'} strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('common.notifications.disable_all')}</p>
              <p className="text-xs text-muted">{t('common.notifications.disable_all_description')}</p>
            </div>
          </div>
          <Toggle enabled={masterKilled} onToggle={toggleMasterKill} size="lg" />
        </div>
      </div>

      {/* Competition Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="fl-card-static overflow-hidden"
        style={{ opacity: masterKilled ? 0.5 : 1, pointerEvents: masterKilled ? 'none' : 'auto' }}
      >
        <button
          onClick={() => toggleAccordion('competition')}
          className="w-full flex items-center justify-between p-5 cursor-pointer hover:bg-[var(--surface-base)] transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.1)' }}>
              <Swords size={17} style={{ color: '#38bdf8' }} strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('common.notifications.competition.title')}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
              background: Object.values(compLocalPrefs).every(Boolean) ? 'rgba(56,189,248,0.1)' : 'var(--surface-raised)',
              color: Object.values(compLocalPrefs).every(Boolean) ? '#38bdf8' : 'var(--text-tertiary)',
            }}>
              {toArabicNum(Object.values(compLocalPrefs).filter(Boolean).length)}/{toArabicNum(Object.values(compLocalPrefs).length)}
            </span>
          </div>
          <motion.div animate={{ rotate: openCategories['competition'] ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} className="text-muted" strokeWidth={1.5} />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {openCategories['competition'] && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-5 pb-5 space-y-1">
                <div className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[var(--surface-base)] transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background: 'var(--surface-base)' }}>🌅</div>
                    <div>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t('common.notifications.competition.digest')}</span>
                      <p className="text-xs text-muted">{t('common.notifications.competition.digest_description')}</p>
                    </div>
                  </div>
                  <Toggle enabled={!!compLocalPrefs.competition_digest} onToggle={() => toggleCompPref('competition_digest')} color="#38bdf8" />
                </div>
                <div className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[var(--surface-base)] transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background: 'var(--surface-base)' }}>⚡</div>
                    <div>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t('common.notifications.competition.events')}</span>
                      <p className="text-xs text-muted">{t('common.notifications.competition.events_description')}</p>
                    </div>
                  </div>
                  <Toggle enabled={!!compLocalPrefs.competition_events} onToggle={() => toggleCompPref('competition_events')} color="#38bdf8" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Category Accordions */}
      <div className="space-y-3">
        {CATEGORIES.map((category, catIndex) => {
          const isOpen = openCategories[category.key] || false
          const enabledCount = category.types.filter(t => isEnabled(t)).length
          const totalCount = category.types.length
          const allEnabled = enabledCount === totalCount
          const CatIcon = category.icon
          const catColor = CATEGORY_COLORS[category.key] || CATEGORY_COLORS.system

          return (
            <motion.div
              key={category.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.04 }}
              className="fl-card-static overflow-hidden"
              style={{ opacity: masterKilled ? 0.5 : 1, pointerEvents: masterKilled ? 'none' : 'auto' }}
            >
              {/* Accordion Header */}
              <button
                onClick={() => toggleAccordion(category.key)}
                className="w-full flex items-center justify-between p-5 cursor-pointer hover:bg-[var(--surface-base)] transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: catColor.bg }}>
                    <CatIcon size={17} style={{ color: catColor.text }} strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {t(category.labelKey)}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: enabledCount === totalCount ? catColor.bg : 'var(--surface-raised)',
                      color: enabledCount === totalCount ? catColor.accent : 'var(--text-tertiary)',
                    }}
                  >
                    {toArabicNum(enabledCount)}/{toArabicNum(totalCount)}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={18} className="text-muted" strokeWidth={1.5} />
                </motion.div>
              </button>

              {/* Accordion Body */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="px-5 pb-5 space-y-1">
                      {/* Category-level toggle */}
                      <div
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg mb-2"
                        style={{ background: 'var(--surface-base)' }}
                      >
                        <span className="text-xs font-medium" style={{ color: catColor.accent }}>
                          {allEnabled ? t('common.notifications.category.disable_all') : t('common.notifications.category.enable_all')}
                        </span>
                        <Toggle enabled={allEnabled} onToggle={() => toggleCategory(category)} color={catColor.accent} />
                      </div>

                      {/* Individual type toggles */}
                      {category.types.map((type) => {
                        const config = NOTIFICATION_TYPES[type]
                        if (!config) return null
                        return (
                          <div
                            key={type}
                            className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[var(--surface-base)] transition-all duration-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background: 'var(--surface-base)' }}>
                                {config.icon}
                              </div>
                              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                {config.label_ar}
                              </span>
                            </div>
                            <Toggle enabled={isEnabled(type)} onToggle={() => toggleType(type)} color={catColor.accent} />
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
