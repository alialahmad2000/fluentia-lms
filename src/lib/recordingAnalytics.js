import { supabase } from './supabase'

export async function logFallbackEvent(recordingId, tier, reason) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('recording_fallback_events').insert({
      recording_id: recordingId,
      student_id: user?.id || null,
      tier_used: tier,
      reason,
      user_agent: navigator.userAgent.substring(0, 200),
    })
  } catch { /* silent — never break playback for analytics */ }
}
