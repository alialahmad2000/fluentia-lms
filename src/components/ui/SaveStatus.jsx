import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, CloudOff, Loader2, AlertTriangle, RotateCcw } from 'lucide-react'
import { useG } from '@/i18n/gender'

/**
 * Tells a student, in plain sight, whether her work is actually on the server.
 *
 * Until now every section wrote optimistically and said nothing. A student saw
 * her answers locked in with green ticks whether or not a single byte reached
 * the database — which is precisely how someone can finish a section, be
 * certain she finished it, and find it empty the next day. Silence was the bug
 * that survived four rounds of fixes, because a lost answer produced no signal
 * for her and none for us.
 */
export default function SaveStatus({ state, lastSavedAt, onRetry, className = '', floating = false }) {
  const g = useG()
  const [justSaved, setJustSaved] = useState(false)

  // 'saved' settles to a quiet resting state instead of shouting forever.
  useEffect(() => {
    if (state !== 'saved') return
    setJustSaved(true)
    const t = setTimeout(() => setJustSaved(false), 2600)
    return () => clearTimeout(t)
  }, [state, lastSavedAt])

  if (state === 'idle') return null

  const styles = {
    saving: {
      icon: <Loader2 size={13} className="animate-spin motion-reduce:animate-none" />,
      text: g('جارٍ الحفظ…', 'جارٍ الحفظ…'),
      cls: 'text-slate-300 border-white/10 bg-white/[0.04]',
      dot: 'bg-slate-400',
    },
    saved: {
      icon: <Check size={13} strokeWidth={3} />,
      text: g('تم الحفظ', 'تم الحفظ'),
      cls: 'text-emerald-300 border-emerald-400/25 bg-emerald-400/[0.08]',
      dot: 'bg-emerald-400',
    },
    queued: {
      icon: <CloudOff size={13} />,
      text: g('محفوظ على جهازك — سيُرفع عند عودة الاتصال',
              'محفوظ على جهازك — سيُرفع عند عودة الاتصال'),
      cls: 'text-amber-300 border-amber-400/25 bg-amber-400/[0.08]',
      dot: 'bg-amber-400',
    },
    error: {
      icon: <AlertTriangle size={13} />,
      text: g('لم يُحفظ — حاول مرة أخرى', 'لم يُحفظ — حاولي مرة أخرى'),
      cls: 'text-rose-300 border-rose-400/30 bg-rose-400/[0.10]',
      dot: 'bg-rose-400',
    },
  }[state]

  if (!styles) return null

  const savedTime = lastSavedAt
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { hour: '2-digit', minute: '2-digit' })
        .format(lastSavedAt)
    : null

  const pill = (
    <div
      dir="rtl"
      role="status"
      aria-live="polite"
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5',
        'text-[11px] font-medium leading-none backdrop-blur-md',
        'transition-all duration-500 ease-out',
        styles.cls,
        state === 'saved' && !justSaved ? 'opacity-55' : 'opacity-100',
        className,
      ].filter(Boolean).join(' ')}
    >
      <span className={`relative flex h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`}>
        {state === 'saving' && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 motion-reduce:hidden ${styles.dot}`} />
        )}
      </span>

      <span className="shrink-0">{styles.icon}</span>
      <span>{styles.text}</span>

      {state === 'saved' && savedTime && (
        <span className="opacity-60 tabular-nums">{savedTime}</span>
      )}

      {state === 'error' && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mr-1 inline-flex items-center gap-1 rounded-full border border-rose-400/30
                     px-2 py-0.5 text-[10px] transition-colors hover:bg-rose-400/15
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400/60"
        >
          <RotateCcw size={10} />
          {g('أعد المحاولة', 'أعيدي المحاولة')}
        </button>
      )}
    </div>
  )

  if (!floating) return pill

  // Portalled to <body>. The student surfaces render inside a shell at z-index 1
  // with the bottom nav stacked above it, so a fixed element rendered in-tree is
  // painted UNDER the nav no matter how high its own z-index is. It also sits
  // clear of the nav band rather than behind it.
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)' }}
    >
      <div className="pointer-events-auto">{pill}</div>
    </div>,
    document.body
  )
}
