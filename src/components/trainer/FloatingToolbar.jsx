import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import useClassMode from '../../stores/classModeStore'
import QuickPointsPopup from './QuickPointsPopup'
import AttendancePopup from './AttendancePopup'
import QuickNotePopup from './QuickNotePopup'
import TimerPopup from './TimerPopup'
import UnitProgressPopup from './UnitProgressPopup'
import HelpRequestsPopup from './HelpRequestsPopup'

const TOOLBAR_BUTTONS = [
  { key: 'classMode', icon: '🎓', label: 'الكلاس', activeLabel: 'إنهاء' },
  { key: 'points', icon: '🎯', label: 'نقاط' },
  { key: 'attendance', icon: '✋', label: 'حضور' },
  { key: 'note', icon: '📝', label: 'ملاحظة' },
  { key: 'timer', icon: '⏱', label: 'تايمر' },
  { key: 'progress', icon: '📊', label: 'تقدم' },
  { key: 'helpRequests', icon: '❓', label: 'مساعدة' },
]

export default function FloatingToolbar() {
  const { profile, trainerData } = useAuthStore()
  const location = useLocation()
  const { isClassMode, startClass, endClass } = useClassMode()
  const [activePopup, setActivePopup] = useState(null)

  // Determine if we're on a curriculum page
  const isCurriculumPage = useMemo(() => {
    const path = location.pathname
    return path.includes('/curriculum/') || path.includes('/unit/') || path.includes('/trainer/curriculum')
  }, [location.pathname])

  // Only show for trainer/admin on curriculum pages
  const role = profile?.role
  const showToolbar = useMemo(() => {
    if (role !== 'trainer' && role !== 'admin') return false
    return isCurriculumPage
  }, [role, isCurriculumPage])

  // Extract unitId from URL if available
  const unitId = useMemo(() => {
    const match = location.pathname.match(/unit[\/s]?\/([a-f0-9-]+)/i)
    return match?.[1] || null
  }, [location.pathname])

  // Get trainer's group(s) for the popups
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups-toolbar', role, profile?.id],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name').order('level')
      if (role !== 'admin') query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: showToolbar && !!profile?.id,
  })

  const groupId = groups?.[0]?.id || null

  // Toggle popup — one at a time
  const togglePopup = useCallback((name) => {
    setActivePopup(prev => prev === name ? null : name)
  }, [])

  // Class mode toggle
  const toggleClassMode = useCallback(() => {
    if (isClassMode) {
      endClass()
    } else {
      startClass(unitId)
    }
  }, [isClassMode, endClass, startClass, unitId])

  // Keyboard shortcuts
  useEffect(() => {
    if (!showToolbar) return
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key) {
          case 'P': e.preventDefault(); togglePopup('points'); break
          case 'A': e.preventDefault(); togglePopup('attendance'); break
          case 'N': e.preventDefault(); togglePopup('note'); break
          case 'T': e.preventDefault(); togglePopup('timer'); break
          case 'C': e.preventDefault(); toggleClassMode(); break
        }
      }
      if (e.key === 'Escape') setActivePopup(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showToolbar, togglePopup, toggleClassMode])

  if (!showToolbar) return null

  return (
    <>
      {/* Popups */}
      <AnimatePresence>
        {activePopup === 'points' && groupId && (
          <QuickPointsPopup groupId={groupId} onClose={() => setActivePopup(null)} />
        )}
        {activePopup === 'attendance' && groupId && (
          <AttendancePopup groupId={groupId} onClose={() => setActivePopup(null)} />
        )}
        {activePopup === 'note' && groupId && (
          <QuickNotePopup groupId={groupId} onClose={() => setActivePopup(null)} />
        )}
        {activePopup === 'timer' && (
          <TimerPopup onClose={() => setActivePopup(null)} />
        )}
        {activePopup === 'progress' && groupId && unitId && (
          <UnitProgressPopup groupId={groupId} unitId={unitId} onClose={() => setActivePopup(null)} />
        )}
        {activePopup === 'helpRequests' && groupId && (
          <HelpRequestsPopup groupId={groupId} onClose={() => setActivePopup(null)} />
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-0 left-0 right-0 z-[60] lg:bottom-0"
        style={{
          background: 'rgba(6, 14, 28, 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center justify-center gap-1 sm:gap-3 h-[60px] max-w-lg mx-auto px-2">
          {TOOLBAR_BUTTONS.map(btn => {
            const isActive = btn.key === 'classMode' ? isClassMode : activePopup === btn.key
            const isClassBtn = btn.key === 'classMode'

            return (
              <button
                key={btn.key}
                onClick={() => {
                  if (isClassBtn) {
                    toggleClassMode()
                  } else {
                    togglePopup(btn.key)
                  }
                }}
                className="flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] rounded-xl transition-all duration-200"
                style={{
                  background: isActive ? 'rgba(56,189,248,0.15)' : 'transparent',
                  color: isActive ? 'var(--accent-sky)' : 'rgba(255,255,255,0.5)',
                  ...(isActive && isClassBtn ? { boxShadow: '0 0 12px rgba(56,189,248,0.3)' } : {}),
                }}
              >
                <span className="text-lg leading-none">{btn.icon}</span>
                <span className="text-[9px] sm:text-[10px] font-medium leading-none hidden sm:block">
                  {isActive && isClassBtn ? btn.activeLabel : btn.label}
                </span>
              </button>
            )
          })}
        </div>
      </motion.div>
    </>
  )
}
