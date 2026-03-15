import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, Settings, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { NOTIFICATION_TYPES } from '../../lib/constants'

const DEFAULT_PREFS = {
  assignment_new: true,
  assignment_deadline: true,
  assignment_graded: true,
  class_reminder: true,
  trainer_note: true,
  achievement: true,
  peer_recognition: true,
  team_update: true,
  payment_reminder: true,
  level_up: true,
  streak_warning: true,
  system: true,
}

const STORAGE_KEY = 'fluentia_notification_prefs'

export default function NotificationSettings() {
  const { profile } = useAuthStore()
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [saving, setSaving] = useState(false)

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${profile?.id}`)
    if (stored) {
      try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) }) } catch {}
    }
  }, [profile?.id])

  function toggle(type) {
    const updated = { ...prefs, [type]: !prefs[type] }
    setPrefs(updated)
    if (profile?.id) {
      localStorage.setItem(`${STORAGE_KEY}_${profile.id}`, JSON.stringify(updated))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fl-card-static p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <Bell size={18} className="text-sky-400" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">إعدادات الإشعارات</h3>
      </div>
      <p className="text-sm text-muted mb-4">تحكم في أنواع الإشعارات التي تريد استقبالها</p>

      <div className="space-y-1">
        {Object.entries(NOTIFICATION_TYPES).map(([type, config]) => (
          <div key={type} className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-[var(--surface-base)] transition-all duration-200 border-b border-[var(--border-subtle)] last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--surface-base)] flex items-center justify-center text-sm">{config.icon}</div>
              <span className="text-sm text-[var(--text-primary)]">{config.label_ar}</span>
            </div>
            <button
              onClick={() => toggle(type)}
              className={`w-10 h-5 rounded-full transition-all relative ${
                prefs[type] ? 'bg-sky-500' : 'bg-[var(--surface-raised)]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${
                prefs[type] ? 'left-0.5' : 'right-0.5'
              }`} />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
