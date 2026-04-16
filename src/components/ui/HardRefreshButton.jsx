import { useState } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'

/**
 * Hard refresh: clears browser caches and reloads the page from the server.
 *
 * NOTE: localStorage/sessionStorage are intentionally NOT cleared here — that
 * would log the user out, drop impersonation state, onboarding flags, and
 * sidebar preferences. A "hard refresh" in the browser sense only bypasses
 * the HTTP cache; we mirror that by dumping service-worker caches and asking
 * the SW to re-register, then reloading.
 */
async function performHardRefresh() {
  try {
    if ('caches' in window) {
      const names = await caches.keys()
      await Promise.all(names.map((n) => caches.delete(n)))
    }
  } catch {}
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.update().catch(() => {})))
    }
  } catch {}
  // Append a cache-busting query so intermediaries re-fetch even if they
  // ignore reload hints. replace() avoids polluting history.
  const url = new URL(window.location.href)
  url.searchParams.set('_hr', Date.now().toString(36))
  window.location.replace(url.toString())
}

export default function HardRefreshButton({ className = '', compact = false }) {
  const [busy, setBusy] = useState(false)

  const handleClick = async () => {
    if (busy) return
    setBusy(true)
    try {
      await performHardRefresh()
    } catch {
      setBusy(false)
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={busy}
        aria-label="تحديث شامل"
        title="تحديث شامل — يمسح الذاكرة المؤقتة ويعيد التحميل"
        className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-wait ${className}`}
        style={{
          background: 'var(--surface-raised, var(--ds-surface-1, rgba(255,255,255,0.04)))',
          borderColor: 'var(--border-subtle, var(--ds-border-subtle, rgba(255,255,255,0.08)))',
        }}
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-sky, var(--ds-accent-primary, #38bdf8))' }} />
        ) : (
          <RefreshCw size={16} style={{ color: 'var(--accent-sky, var(--ds-accent-primary, #38bdf8))' }} />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      title="تحديث شامل — يمسح الذاكرة المؤقتة ويعيد التحميل"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-wait font-['Tajawal'] ${className}`}
      style={{
        background: 'var(--surface-raised, var(--ds-surface-1, rgba(255,255,255,0.04)))',
        border: '1px solid var(--border-subtle, var(--ds-border-subtle, rgba(255,255,255,0.08)))',
        color: 'var(--text-secondary, var(--ds-text-secondary, #cbd5e1))',
      }}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
      تحديث شامل
    </button>
  )
}
