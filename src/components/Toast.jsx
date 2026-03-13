/**
 * Toast Notification System — Fluentia LMS
 *
 * Exports:
 *   ToastProvider  — wrap your app (or Routes) with this
 *   useToast()     — returns { toast } where toast.success / .error / .info / .warning(msg)
 *
 * No external library required.  Uses React context + Framer Motion.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────
const MAX_TOASTS = 3
const AUTO_DISMISS_MS = 3000

// ─── Reducer ─────────────────────────────────────────────────
function toastReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      // Keep at most MAX_TOASTS; drop the oldest if needed
      const next = [action.payload, ...state]
      return next.slice(0, MAX_TOASTS)
    }
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id)
    default:
      return state
  }
}

// ─── Context ─────────────────────────────────────────────────
const ToastContext = createContext(null)

// ─── Type config ─────────────────────────────────────────────
const TYPE_CONFIG = {
  success: {
    Icon: CheckCircle,
    bg: 'bg-emerald-600',
    border: 'border-emerald-400',
    iconColor: 'text-emerald-200',
  },
  error: {
    Icon: XCircle,
    bg: 'bg-red-600',
    border: 'border-red-400',
    iconColor: 'text-red-200',
  },
  info: {
    Icon: Info,
    bg: 'bg-sky-600',
    border: 'border-sky-400',
    iconColor: 'text-sky-200',
  },
  warning: {
    Icon: AlertTriangle,
    bg: 'bg-amber-500',
    border: 'border-amber-300',
    iconColor: 'text-amber-100',
  },
}

// ─── Single Toast Item ────────────────────────────────────────
function ToastItem({ toast, onDismiss }) {
  const { Icon, bg, border, iconColor } = TYPE_CONFIG[toast.type] ?? TYPE_CONFIG.info

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      dir="rtl"
      className={[
        'flex items-center gap-3',
        'min-w-[220px] max-w-xs w-full',
        'rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md',
        'text-sm font-medium text-white',
        bg,
        border,
      ].join(' ')}
      role="alert"
      aria-live="assertive"
    >
      <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="إغلاق الإشعار"
        className="shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

// ─── Provider ────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(toastReducer, [])
  const timers = useRef({})

  // Clear ALL pending timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout)
      timers.current = {}
    }
  }, [])

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    dispatch({ type: 'REMOVE', id })
  }, [])

  const addToast = useCallback(
    (type, message) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`

      // If already at MAX_TOASTS the reducer will silently drop the oldest toast.
      // Proactively cancel its timer before dispatching so it never fires after
      // the toast has been evicted from state.
      const currentTimerIds = Object.keys(timers.current)
      if (currentTimerIds.length >= MAX_TOASTS) {
        const oldestId = currentTimerIds[currentTimerIds.length - 1]
        clearTimeout(timers.current[oldestId])
        delete timers.current[oldestId]
      }

      dispatch({ type: 'ADD', payload: { id, type, message } })
      timers.current[id] = setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    },
    [dismiss],
  )

  const toast = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    info: (msg) => addToast('info', msg),
    warning: (msg) => addToast('warning', msg),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* ── Toast viewport — bottom-left, bottom-center on mobile ── */}
      <div
        aria-label="منطقة الإشعارات"
        className={[
          'fixed z-[9998] flex flex-col-reverse gap-2 pointer-events-none',
          // Mobile: horizontally centred, 16px from bottom
          'bottom-4 left-1/2 -translate-x-1/2',
          // sm+: anchored to bottom-left, natural x
          'sm:left-4 sm:translate-x-0 sm:bottom-4',
        ].join(' ')}
      >
        <AnimatePresence mode="sync">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>')
  }
  return ctx
}
