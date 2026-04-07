import { useState, useEffect, useCallback } from 'react'
import { detectDevice, isStandalone } from '../utils/deviceDetection'

const DISMISS_KEY = 'pwa_install_dismissed_at'
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 hours

export function usePWAInstall() {
  const [device] = useState(() => detectDevice())
  const [standalone, setStandalone] = useState(() => isStandalone())
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  // Capture beforeinstallprompt for native install
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Watch for app being installed
  useEffect(() => {
    const handler = () => {
      setStandalone(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', handler)
    return () => window.removeEventListener('appinstalled', handler)
  }, [])

  // Check dismissal state on mount
  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10)
      if (elapsed < DISMISS_COOLDOWN_MS) {
        setDismissed(true)
      } else {
        localStorage.removeItem(DISMISS_KEY)
      }
    }
  }, [])

  const triggerNativeInstall = useCallback(async () => {
    if (!deferredPrompt) return { outcome: 'no_prompt' }
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return choice
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setDismissed(true)
  }, [])

  const shouldShow = !standalone && !dismissed && device.canInstall !== 'unknown'

  return {
    device,
    standalone,
    dismissed,
    shouldShow,
    hasNativePrompt: !!deferredPrompt,
    triggerNativeInstall,
    dismiss,
  }
}
