// MEGA-FIX V2 Phase B — fire-and-forget audio telemetry.
//
// Inserts a row into `audio_event_log` for diagnostics. Never throws,
// never blocks audio playback. RLS lets students insert their own rows
// (or anonymous rows when no studentId is available).

import { supabase } from '../supabase'

let queue = []
let flushTimer = null
const FLUSH_DELAY_MS = 1500

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(async () => {
    flushTimer = null
    const batch = queue.splice(0, queue.length)
    if (batch.length === 0) return
    try {
      await supabase.from('audio_event_log').insert(batch)
    } catch {
      // Silent — telemetry must never break the player.
    }
  }, FLUSH_DELAY_MS)
}

export function logAudioEvent({
  studentId = null,
  playerId,
  audioUrl = null,
  event,
  reason = null,
  state = null,
} = {}) {
  if (!event || !playerId) return
  queue.push({
    student_id: studentId || null,
    player_id: String(playerId),
    audio_url: audioUrl ? String(audioUrl).slice(0, 2000) : null,
    event: String(event).slice(0, 64),
    reason: reason ? String(reason).slice(0, 256) : null,
    state: state ? String(state).slice(0, 64) : null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 256) : null,
  })
  scheduleFlush()
}

// Detect iOS (covers iPhone / iPad / iPod). Used to keep the iOS-only
// "silent switch" hint scoped to actual iOS UAs — non-iOS browsers blocking
// autoplay should not see that copy.
function isIOSUserAgent() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent || '')
}

// Classify a play() rejection into one of:
//  - 'ios_silent_or_autoplay'  → NotAllowedError on iOS (silent switch OR autoplay policy)
//  - 'autoplay_blocked'        → NotAllowedError on non-iOS (Chrome/Firefox/Edge autoplay policy)
//  - 'NotSupported'            → codec / src URL not playable
//  - 'AbortError'              → pause() raced ahead of play() resolving — benign
//  - 'NetworkError'            → connectivity / 404
//  - 'Unknown'                 → anything else
//
// LISTENING-AUDIO-FIX-VERIFIED 2026-05-23:
//   Prior code returned 'NotAllowed' uniformly for any NotAllowedError. The
//   admin telemetry panel then labeled ALL of them as "iOS Safari silent
//   switch", which mis-tagged desktop Safari / Chrome sessions that were
//   really just hitting their own autoplay policy. Splitting by UA lets us
//   triage and show the right Arabic hint per platform.
export function classifyPlayError(err) {
  if (!err) return 'Unknown'
  const name = err.name || ''
  const msg = (err.message || '').toLowerCase()
  if (name === 'NotAllowedError') {
    return isIOSUserAgent() ? 'ios_silent_or_autoplay' : 'autoplay_blocked'
  }
  if (name === 'NotSupportedError') return 'NotSupported'
  if (name === 'AbortError') return 'AbortError'
  if (msg.includes('network') || msg.includes('failed to fetch')) return 'NetworkError'
  return 'Unknown'
}

// Map a classified reason to an Arabic, student-facing message.
export function arabicErrorMessage(reason) {
  switch (reason) {
    case 'audio_unavailable':
      return 'المقطع الصوتي غير متاح حالياً — تواصلي مع المدرب'
    case 'NetworkError':
    case 'network':
      return 'ما قدرنا نوصل للملف — جربي مرة ثانية'
    // Legacy reason emitted before the iOS/non-iOS split. Older rows in
    // audio_event_log still carry this — keep the iOS-leaning copy so the
    // historical telemetry view stays sensible.
    case 'NotAllowed':
    case 'ios_silent_or_autoplay':
      return 'اضغطي مرة ثانية لتشغيل الصوت'
    case 'autoplay_blocked':
      return 'اضغطي مرة ثانية — المتصفح يحجب التشغيل التلقائي'
    case 'NotSupported':
      return 'هذا المتصفح ما يدعم هذا النوع من الملفات — جربي Safari أو Chrome'
    case 'AbortError':
      // Benign — don't surface to the user.
      return null
    default:
      return 'حصل خطأ بالتشغيل — حاولي مرة ثانية'
  }
}

// Single-shot HEAD preflight. Returns { ok, status, reason }.
// Used by useAudioEngine to avoid the silent-404 trap before play().
export async function preflightAudio(url) {
  if (!url) return { ok: false, reason: 'empty_url' }
  try {
    const r = await fetch(url, { method: 'HEAD' })
    if (!r.ok) {
      return { ok: false, status: r.status, reason: 'audio_unavailable' }
    }
    return { ok: true, status: r.status }
  } catch (e) {
    return { ok: false, reason: 'network', detail: e?.message }
  }
}
