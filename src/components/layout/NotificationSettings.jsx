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
    localStorage.setItem(`${STORAGE_KEY}_${profile?.id}`, JSON.stringify(updated))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Bell size={18} className="text-sky-400" />
        <h3 className="text-sm font-medium text-white">إعدادات الإشعارات</h3>
      </div>
      <p className="text-xs text-muted mb-4">تحكم في أنواع الإشعارات التي تريد استقبالها</p>

      <div className="space-y-2">
        {Object.entries(NOTIFICATION_TYPES).map(([type, config]) => (
          <div key={type} className="flex items-center justify-between py-2 border-b border-border-subtle/50 last:border-0">
            <div className="flex items-center gap-2">
              <span>{config.icon}</span>
              <span className="text-xs text-white">{config.label_ar}</span>
            </div>
            <button
              onClick={() => toggle(type)}
              className={`w-10 h-5 rounded-full transition-all relative ${
                prefs[type] ? 'bg-sky-500' : 'bg-white/10'
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
