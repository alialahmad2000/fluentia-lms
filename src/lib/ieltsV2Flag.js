// src/lib/ieltsV2Flag.js
//
// IELTS Masterclass V2 feature flag.
// Enabled if:
//   1. ?ielts-v2=1 in URL (persists to localStorage)
//   2. ?ielts-v2=0 in URL (clears localStorage, forces off)
//   3. localStorage key 'fluentia.ielts-v2' === '1'
//   4. profile.email is in ALLOWLIST (always on for Ali + testers)
//
// No DB call. Pure client check. Safe to call in render.

const STORAGE_KEY = 'fluentia.ielts-v2'

const ALLOWLIST = [
  'ali@fluentia.academy',
  // add more testers here as needed
]

function readUrlToggle() {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const val = params.get('ielts-v2')
    if (val === '1') {
      localStorage.setItem(STORAGE_KEY, '1')
      return true
    }
    if (val === '0') {
      localStorage.removeItem(STORAGE_KEY)
      return false
    }
    return null
  } catch {
    return null
  }
}

function readLocalStorage() {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function readAllowlist(email) {
  if (!email) return false
  return ALLOWLIST.includes(email.toLowerCase())
}

/**
 * Is IELTS V2 enabled for this profile?
 * @param {object|null} profile - object with at least { email }
 * @returns {boolean}
 */
export function isIELTSV2Enabled(profile) {
  const urlResult = readUrlToggle()
  if (urlResult === true) return true
  if (urlResult === false) return false
  if (readLocalStorage()) return true
  if (!profile) return false
  if (readAllowlist(profile.email)) return true
  return false
}

if (typeof window !== 'undefined') {
  window.__disableIELTSV2 = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    window.location.reload()
  }
  window.__enableIELTSV2 = () => {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    window.location.reload()
  }
}
