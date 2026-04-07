export function parseDeviceType(userAgent) {
  if (!userAgent) return 'unknown'
  const ua = userAgent.toLowerCase()

  if (ua.includes('ipad')) return 'ipad'
  // iPadOS 13+ identifies as Macintosh + Mobile
  if (ua.includes('macintosh') && ua.includes('mobile')) return 'ipad'
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
