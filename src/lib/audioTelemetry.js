// AUDIO-TELEMETRY 2026-05-20
//
// Fire-and-forget client-side logger for audio failures. Every "audio doesn't
// play" event for listening / reading / vocab gets written to public.audio_telemetry
// so the next student report is diagnosable from data, not from re-investigation.
//
// Usage:
//   import { logAudioFailure } from '@/lib/audioTelemetry'
//   logAudioFailure({
//     context: 'listening',
//     rowId: listening.id,
//     audioUrl,
//     errorCode: audio.error?.code,        // 1-4 for MediaError, 0 for play() rejection
//     errorMessage: audio.error?.message,
//   })
//
// Contract:
//   - Never throws. All errors swallowed and logged to console.warn only.
//   - Never blocks the UI. Caller MUST NOT await.
//   - Resilient to no-session / pre-auth state — sends profile_id: null.
//   - bundle_version is read once per page from /version.json and cached.

import { supabase } from './supabase'

let _bundleVersion = null
let _bundleVersionPromise = null

async function getBundleVersion() {
  if (_bundleVersion) return _bundleVersion
  if (_bundleVersionPromise) return _bundleVersionPromise
  _bundleVersionPromise = (async () => {
    try {
      const res = await fetch('/version.json', { cache: 'no-store' })
      if (!res.ok) throw new Error('non-2xx')
      const data = await res.json()
      _bundleVersion = data?.version || data?.buildId || 'unknown'
    } catch {
      _bundleVersion = 'unknown'
    }
    return _bundleVersion
  })()
  return _bundleVersionPromise
}

/**
 * Log a single audio failure. Fire-and-forget — never blocks.
 *
 * @param {object}  payload
 * @param {'listening'|'reading'|'vocab'} payload.context
 * @param {string=} payload.rowId         curriculum_listening / curriculum_readings row id
 * @param {string=} payload.audioUrl
 * @param {number=} payload.errorCode     MediaError.code (1-4) or 0 for play() promise rejection
 * @param {string=} payload.errorMessage
 * @param {object=} payload.extra         anything else worth capturing
 */
export function logAudioFailure(payload) {
  // Spin into an async IIFE so the caller doesn't need to await
  ;(async () => {
    try {
      const [{ data: userResult }, bundleVersion] = await Promise.all([
        supabase.auth.getUser(),
        getBundleVersion(),
      ])
      const profileId = userResult?.user?.id ?? null

      const row = {
        profile_id: profileId,
        context: payload.context,
        row_id: payload.rowId ?? null,
        audio_url: payload.audioUrl ?? null,
        error_code: typeof payload.errorCode === 'number' ? payload.errorCode : null,
        error_message:
          typeof payload.errorMessage === 'string'
            ? payload.errorMessage.slice(0, 500)
            : null,
        browser_ua:
          typeof navigator !== 'undefined' && navigator.userAgent
            ? String(navigator.userAgent).slice(0, 500)
            : null,
        network_status:
          typeof navigator !== 'undefined'
            ? navigator.onLine
              ? 'online'
              : 'offline'
            : null,
        bundle_version: bundleVersion,
        extra: payload.extra ?? null,
      }

      const { error } = await supabase.from('audio_telemetry').insert(row)
      if (error) {
        // Telemetry insert failed — degrade silently. Console for dev-tools only.
        // eslint-disable-next-line no-console
        console.warn('[audioTelemetry] insert failed', error.message)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[audioTelemetry] unexpected error', e?.message || e)
    }
  })()
}
