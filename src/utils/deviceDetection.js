/**
 * Detect device type, browser, and PWA install capabilities.
 * Returns a stable object — memoize at hook level, do not call in render loops.
 */
export function detectDevice() {
  if (typeof navigator === 'undefined') {
    return { type: 'unknown', browser: 'unknown', os: 'unknown', canInstall: false, installMethod: 'unknown' }
  }

  const ua = navigator.userAgent

  // OS detection
  let os = 'unknown'
  if (/iPhone/i.test(ua)) os = 'ios'
  else if (/iPad/i.test(ua)) os = 'ipados'
  else if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) os = 'ipados'
  else if (/Android/i.test(ua)) os = 'android'
  else if (/Mac OS X/i.test(ua)) os = 'macos'
  else if (/Windows/i.test(ua)) os = 'windows'
  else if (/Linux/i.test(ua)) os = 'linux'

  // Device type
  let type = 'desktop'
  if (os === 'ios') type = 'iphone'
  else if (os === 'ipados') type = 'ipad'
  else if (os === 'android') {
    // Use screen size instead of UA "Mobile" flag — many Android tablets include "Mobile" in UA
    const minDim = Math.min(screen.width, screen.height)
    type = minDim >= 600 ? 'android_tablet' : 'android_phone'
  }

  // Browser detection (order matters)
  let browser = 'unknown'
  if (/CriOS/i.test(ua)) browser = 'chrome_ios'
  else if (/FxiOS/i.test(ua)) browser = 'firefox_ios'
  else if (/EdgiOS/i.test(ua)) browser = 'edge_ios'
  else if (/Edg/i.test(ua)) browser = 'edge'
  else if (/SamsungBrowser/i.test(ua)) browser = 'samsung'
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'chrome'
  else if (/Firefox/i.test(ua)) browser = 'firefox'
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'safari'

  // Install capability
  let canInstall = false
  let installMethod = 'unsupported_browser'

  if (os === 'android') {
    if (['chrome', 'edge', 'samsung'].includes(browser)) {
      canInstall = true
      installMethod = 'native_prompt'
    }
  } else if (os === 'ios') {
    if (browser === 'safari') {
      canInstall = true
      installMethod = 'ios_share_bottom'
    } else {
      installMethod = 'switch_to_safari'
    }
  } else if (os === 'ipados') {
    if (browser === 'safari') {
      canInstall = true
      installMethod = 'ios_share_top'
    } else {
      installMethod = 'switch_to_safari'
    }
  } else if (['windows', 'linux', 'macos'].includes(os)) {
    if (['chrome', 'edge'].includes(browser)) {
      canInstall = true
      installMethod = 'native_prompt'
    } else if (browser === 'safari' && os === 'macos') {
      canInstall = true
      installMethod = 'macos_dock'
    }
  }

  return { type, os, browser, canInstall, installMethod }
}

/**
 * Detect if app is currently running as installed PWA
 */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true
  )
}
