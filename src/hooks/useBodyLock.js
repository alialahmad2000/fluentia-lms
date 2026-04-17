import { useEffect } from 'react'

/**
 * Lock body scroll while active.
 * Adds `modal-open` to <body>, which CSS uses to:
 *   1. Prevent background scroll on iOS Safari (position:fixed trick)
 *   2. Hide the mobile bottom nav (avoids z-index/backdrop-filter bleed)
 * Restores scroll position on close.
 */
export function useBodyLock(active = true) {
  useEffect(() => {
    if (!active) return

    const scrollY = window.scrollY
    document.body.style.top = `-${scrollY}px`
    document.body.classList.add('modal-open')

    return () => {
      document.body.classList.remove('modal-open')
      document.body.style.top = ''
      window.scrollTo(0, scrollY)
    }
  }, [active])
}
