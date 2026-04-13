import { useEffect, useRef } from 'react'

/**
 * Register a page-specific reset action.
 * Called with no args whenever the user clicks the global Reset Page button.
 *
 * Example:
 *   usePageReset(() => {
 *     audioRef.current?.pause();
 *     setFocusMode(false);
 *     setOpenAccordions([]);
 *   });
 */
export function usePageReset(handler) {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    const listener = () => {
      try {
        handlerRef.current?.()
      } catch (err) {
        console.warn('[usePageReset] handler error:', err)
      }
    }
    window.addEventListener('fluentia:reset-page', listener)
    return () => window.removeEventListener('fluentia:reset-page', listener)
  }, [])
}
