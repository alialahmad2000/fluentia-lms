// ─── Social Share Utility ─────────────────────────────────────────────────────
// Reusable sharing helpers for Fluentia Academy achievements
// All share texts are in Arabic, RTL-safe

const FLUENTIA_URL = 'fluentia-site.vercel.app'
const FLUENTIA_CTA = `\nجرّب لقاء مبدئي مجاني مع المدرب 👇\n${FLUENTIA_URL}`

// ─── Platform Openers ─────────────────────────────────────────────────────────

/**
 * Opens WhatsApp share intent with the given text.
 * @param {string} text - The message to share
 */
export function shareToWhatsApp(text) {
  const encoded = encodeURIComponent(text)
  window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer')
}

/**
 * Opens Twitter/X share intent with the given text.
 * @param {string} text - The tweet text
 */
export function shareToTwitter(text) {
  const encoded = encodeURIComponent(text)
  window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank', 'noopener,noreferrer')
}

/**
 * Instagram does not support direct link sharing.
 * Shows a browser alert with instructions to copy and paste.
 */
export function shareToInstagram() {
  alert(
    'لمشاركة إنجازك على انستقرام:\n\n' +
    '1. انسخ الرسالة باستخدام زر "نسخ"\n' +
    '2. افتح تطبيق انستقرام\n' +
    '3. أنشئ ستوري أو منشوراً والصق الرسالة\n\n' +
    `لا تنسَ وسم أكاديمية طلاقة: @fluentia__`
  )
}

/**
 * Copies the given text to the clipboard.
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - true if successful, false otherwise
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    // Fallback for older browsers / non-secure contexts
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'absolute'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}

/**
 * Uses the Web Share API if available; falls back to copyToClipboard.
 * @param {string} title - Share title
 * @param {string} text  - Share body text
 * @param {string} [url] - Optional URL to attach
 * @returns {Promise<'native'|'copied'|'failed'>}
 */
export async function nativeShare(title, text, url = '') {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url: url || undefined })
      return 'native'
    } catch {
      // User cancelled or share failed — fall through
    }
  }
  // Fallback: copy full text + url to clipboard
  const full = url ? `${text}\n${url}` : text
  const ok = await copyToClipboard(full)
  return ok ? 'copied' : 'failed'
}

// ─── Share Text Generator ─────────────────────────────────────────────────────

/**
 * Generates an Arabic share message for a given achievement type.
 *
 * Supported types and required data fields:
 *   'streak'      — { days: number }
 *   'level_up'    — { level: string|number }
 *   'badge'       — { badge: string }
 *   'certificate' — { cert: string }
 *   'leaderboard' — { rank: number }
 *   'quiz_score'  — { score: number, quiz: string }
 *
 * @param {'streak'|'level_up'|'badge'|'certificate'|'leaderboard'|'quiz_score'} type
 * @param {Object} data
 * @returns {string} Arabic share message
 */
export function generateShareText(type, data = {}) {
  let body = ''

  switch (type) {
    case 'streak':
      body = `حققت سلسلة ${data.days ?? ''} يوم في أكاديمية طلاقة! 🔥`
      break
    case 'level_up':
      body = `ارتقيت إلى مستوى ${data.level ?? ''} في أكاديمية طلاقة! 🚀`
      break
    case 'badge':
      body = `حصلت على شارة ${data.badge ?? ''} في أكاديمية طلاقة! 🏆`
      break
    case 'certificate':
      body = `حصلت على شهادة ${data.cert ?? ''} من أكاديمية طلاقة! 📜`
      break
    case 'leaderboard':
      body = `أنا في المركز ${data.rank ?? ''} على لوحة المتصدرين! ⭐`
      break
    case 'quiz_score':
      body = `حصلت على ${data.score ?? ''}% في اختبار ${data.quiz ?? ''}! 📝`
      break
    default:
      body = 'حققت إنجازاً رائعاً في أكاديمية طلاقة! 🌟'
  }

  return `${body}${FLUENTIA_CTA}`
}
