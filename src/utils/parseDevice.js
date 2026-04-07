export function parseDeviceType(userAgent, deviceLabel) {
  // Use device_label first — it's more reliable (especially for iPadOS)
  if (deviceLabel) {
    const dl = deviceLabel.toLowerCase()
    if (dl === 'ipados') return 'ipad'
    if (dl === 'ios') return 'iphone'
    if (dl === 'android phone') return 'android_phone'
    if (dl === 'android tablet') return 'android_tablet'
    // 'Mac', 'Windows', 'Linux', 'Unknown' → fall through to UA parsing
  }

  if (!userAgent) return 'unknown'
  const ua = userAgent.toLowerCase()

  if (ua.includes('ipad')) return 'ipad'
  // iPadOS 13+ Safari: reports as Macintosh but uses Safari (not Chrome/Firefox)
  // Safari-only on macOS-like UA is a strong iPadOS signal
  if (ua.includes('macintosh') && ua.includes('safari') && !ua.includes('chrome') && !ua.includes('firefox') && !ua.includes('edg')) {
    // Check for mobile Safari version pattern (common on iPadOS)
    if (ua.includes('mobile')) return 'ipad'
    // Heuristic: Safari-only on "Macintosh" with WebKit — could be iPadOS or real Mac
    // Without maxTouchPoints we can't be sure, so check device_label
    // If device_label was "Mac" explicitly, it's a real Mac (new subscriptions will say "iPadOS" for iPads)
    if (deviceLabel && deviceLabel.toLowerCase() === 'mac') return 'desktop'
    // Legacy records without proper device_label — best guess as desktop
  }
  if (ua.includes('iphone')) return 'iphone'
  if (ua.includes('android') && ua.includes('mobile')) return 'android_phone'
  if (ua.includes('android')) return 'android_tablet'
  return 'desktop'
}

export function isPhone(deviceType) {
  return deviceType === 'iphone' || deviceType === 'android_phone'
}

export function isTablet(deviceType) {
  return deviceType === 'ipad' || deviceType === 'android_tablet'
}
