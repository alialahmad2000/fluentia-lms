import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, BookOpen, Zap, StickyNote, Search, Target, Flag } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const ACTIONS = [
  { key: 'add-word', icon: Plus, label: 'إضافة مفردة جديدة', color: 'text-emerald-400' },
  { key: 'words', icon: BookOpen, label: 'قاموسي', color: 'text-sky-400' },
  { key: 'flags', icon: Flag, label: 'أعلام ملاحظاتي', color: 'text-rose-400' },
  { key: 'notes', icon: StickyNote, label: 'ملاحظة سريعة', color: 'text-amber-400' },
  { key: 'practice', icon: Target, label: 'تدريب سريع', color: 'text-violet-400' },
  { key: 'search', icon: Search, label: 'بحث في المفردات', color: 'text-sky-300' },
]

const STORAGE_PREFIX = 'fab-position-'

export default function StudentFAB({ onNotes, onBookmark, onHelp, onWords, onAddWord, onFlags, onPractice, onSearch }) {
  const [open, setOpen] = useState(false)
  const { profile } = useAuthStore()
  const fabRef = useRef(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const pointerStart = useRef({ px: 0, py: 0 })
  const movedPx = useRef(0)
  const [pos, setPos] = useState({ x: 24, y: -1 }) // -1 means "calculate from bottom"

  const FAB_SIZE = 56

  // Load saved position
  useEffect(() => {
    const storageKey = STORAGE_PREFIX + (profile?.id || 'guest')
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        setPos(constrainPos(parsed.x, parsed.y))
      } else {
        // Default: bottom-left
        setPos({ x: 24, y: window.innerHeight - FAB_SIZE - 100 })
      }
    } catch {
      setPos({ x: 24, y: window.innerHeight - FAB_SIZE - 100 })
    }
  }, [profile?.id])

  // Constrain within viewport
  const constrainPos = useCallback((x, y) => {
    const maxX = window.innerWidth - FAB_SIZE - 16
    const maxY = window.innerHeight - FAB_SIZE - 16
    return {
      x: Math.max(16, Math.min(maxX, x)),
      y: Math.max(16, Math.min(maxY, y)),
    }
  }, [])

  // Save position
  const savePos = useCallback((x, y) => {
    const storageKey = STORAGE_PREFIX + (profile?.id || 'guest')
    try { localStorage.setItem(storageKey, JSON.stringify({ x, y })) } catch {}
  }, [profile?.id])

  // Edge snapping
  const snapToEdge = useCallback((x, y) => {
    const midX = window.innerWidth / 2
    const snapped = { ...constrainPos(x, y) }
    // Snap to nearest horizontal edge
    if (snapped.x < midX) {
      if (snapped.x < 36) snapped.x = 16
    } else {
      if (snapped.x > window.innerWidth - FAB_SIZE - 36) snapped.x = window.innerWidth - FAB_SIZE - 16
    }
    return snapped
  }, [constrainPos])

  // Pointer handlers for drag
  const handlePointerDown = useCallback((e) => {
    isDragging.current = false
    movedPx.current = 0
    dragStart.current = { x: pos.x, y: pos.y }
    pointerStart.current = { px: e.clientX, py: e.clientY }
    e.target.setPointerCapture(e.pointerId)
  }, [pos])

  const handlePointerMove = useCallback((e) => {
    const dx = e.clientX - pointerStart.current.px
    const dy = e.clientY - pointerStart.current.py
    movedPx.current = Math.sqrt(dx * dx + dy * dy)

    if (movedPx.current > 5) {
      isDragging.current = true
      const newX = dragStart.current.x + dx
      const newY = dragStart.current.y + dy
      setPos(constrainPos(newX, newY))
    }
  }, [constrainPos])

  const handlePointerUp = useCallback(() => {
    if (isDragging.current) {
      // Snap to edge and save
      const snapped = snapToEdge(pos.x, pos.y)
      setPos(snapped)
      savePos(snapped.x, snapped.y)
    } else {
      // Click — toggle menu
      setOpen(prev => !prev)
    }
    isDragging.current = false
  }, [pos, snapToEdge, savePos])

  // Close on tap outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (fabRef.current && !fabRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  // Re-constrain on resize
  useEffect(() => {
    const handler = () => setPos(prev => constrainPos(prev.x, prev.y))
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [constrainPos])

  const handleAction = (key) => {
    setOpen(false)
    switch (key) {
      case 'notes': onNotes?.(); break
      case 'bookmark': onBookmark?.(); break
      case 'help': onHelp?.(); break
      case 'words': onWords?.(); break
      case 'add-word': onAddWord?.(); break
      case 'flags': onFlags?.(); break
      case 'practice': onPractice?.(); break
      case 'search': onSearch?.(); break
    }
  }

  // Calculate menu direction: open upward by default, downward if near top
  const menuAbove = pos.y > 300
  // Align menu: if FAB is on right half, align menu to the right
  const fabOnRight = pos.x > window.innerWidth / 2

  return (
    <div
      ref={fabRef}
      className="fixed z-50"
      style={{
        left: pos.x,
        top: pos.y,
        touchAction: 'none',
      }}
    >
      {/* Menu */}
      <AnimatePresence>
        {open && (
          <div
            className="absolute flex flex-col gap-1.5"
            style={{
              [menuAbove ? 'bottom' : 'top']: FAB_SIZE + 12,
              [fabOnRight ? 'right' : 'left']: 0,
              minWidth: 220,
              maxWidth: 260,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: menuAbove ? 10 : -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: menuAbove ? 10 : -10 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl overflow-hidden py-2"
              style={{
                background: 'rgba(30,41,59,0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              }}
            >
              {ACTIONS.map((action, i) => {
                const Icon = action.icon
                return (
                  <motion.button
                    key={action.key}
                    initial={{ opacity: 0, x: fabOnRight ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: i * 0.03 }}
                    onClick={() => handleAction(action.key)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium font-['Tajawal'] transition-colors hover:bg-white/5"
                    dir="rtl"
                  >
                    <Icon size={16} className={action.color} />
                    <span className="text-slate-200">{action.label}</span>
                  </motion.button>
                )
              })}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        whileTap={isDragging.current ? {} : { scale: 0.9 }}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl select-none"
        style={{
          background: open
            ? 'rgba(30,41,59,0.95)'
            : 'linear-gradient(135deg, #38bdf8, #fbbf24)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: open
            ? '0 8px 32px rgba(0,0,0,0.3)'
            : '0 8px 32px rgba(56,189,248,0.3)',
          cursor: isDragging.current ? 'grabbing' : 'grab',
        }}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus size={22} className={open ? 'text-slate-300' : 'text-white'} />
        </motion.div>
      </motion.button>
    </div>
  )
}
