// Fluentia LMS — Evaluation Health Monitor (Layer 6)
// Runs hourly via pg_cron. Counts stuck items across writing + speaking,
// logs to evaluation_health_log, alerts admin if manual review needed,
// and force-recovers any failed_retrying rows > 30 minutes old.
// Deploy: supabase functions deploy health-monitor-evaluations --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Admin user ID (د. علي الأحمد — admin@fluentia.academy)
const ADMIN_USER_ID = 'e5528ced-b3e2-45bb-8c89-9368dc9b5b96'

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (_req) => {
  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const now = new Date()
    const window24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const staleThreshold = new Date(now.getTime() - 30 * 60 * 1000).toISOString()

    // ── Speaking counts ──
    const { data: speaking } = await supa
      .from('speaking_recordings')
      .select('evaluation_status, student_id, created_at')
      .gte('created_at', window24h)

    const speakingCounts = {
      total: speaking?.length ?? 0,
      completed: speaking?.filter(r => r.evaluation_status === 'completed').length ?? 0,
      pending: speaking?.filter(r => r.evaluation_status === 'pending').length ?? 0,
      failed_retrying: speaking?.filter(r => r.evaluation_status === 'failed_retrying').length ?? 0,
      failed_manual: speaking?.filter(r => r.evaluation_status === 'failed_manual').length ?? 0,
    }

    // ── Writing counts (via student_curriculum_progress) ──
    const { data: writing } = await supa
      .from('student_curriculum_progress')
      .select('evaluation_status, student_id, created_at')
      .eq('section_type', 'writing')
      .gte('created_at', window24h)

    const writingCounts = {
      total: writing?.length ?? 0,
      completed: writing?.filter(r => r.evaluation_status === 'completed').length ?? 0,
      pending: writing?.filter(r => r.evaluation_status === 'pending' || r.evaluation_status === null).length ?? 0,
      failed: writing?.filter(r => r.evaluation_status === 'failed').length ?? 0,
      escalated: writing?.filter(r => r.evaluation_status === 'escalated').length ?? 0,
    }

    // ── Oldest stuck item ──
    const stuckSpeaking = speaking?.filter(r => r.evaluation_status !== 'completed') ?? []
    const stuckWriting = writing?.filter(r => r.evaluation_status !== 'completed' && r.evaluation_status !== null) ?? []
    const allStuck = [...stuckSpeaking, ...stuckWriting]
    const oldestStuck = allStuck.length > 0
      ? allStuck.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]?.created_at
      : null

    // ── Affected students ──
    const affectedIds = new Set([
      ...stuckSpeaking.map(r => r.student_id),
      ...stuckWriting.map(r => r.student_id),
    ])

    // ── Log to health table ──
    await supa.from('evaluation_health_log').insert({
      check_at: now.toISOString(),
      writing_total: writingCounts.total,
      writing_completed: writingCounts.completed,
      writing_pending: writingCounts.pending,
      writing_failed: writingCounts.failed,
      writing_escalated: writingCounts.escalated,
      speaking_total: speakingCounts.total,
      speaking_completed: speakingCounts.completed,
      speaking_pending: speakingCounts.pending,
      speaking_failed_retrying: speakingCounts.failed_retrying,
      speaking_failed_manual: speakingCounts.failed_manual,
      affected_students: affectedIds.size,
      oldest_stuck_at: oldestStuck,
      notes: `auto-check at ${now.toISOString()}`,
    })

    // ── Alert admin if failed_manual / escalated > 0 ──
    const manualCount = speakingCounts.failed_manual + writingCounts.escalated
    if (manualCount > 0) {
      await supa.from('notifications').insert({
        user_id: ADMIN_USER_ID,
        type: 'system',
        title: `⚠️ ${manualCount} تقييم يحتاج مراجعة يدوية`,
        body: `كتابة: ${writingCounts.escalated} متصاعد | محادثة: ${speakingCounts.failed_manual} فشل نهائي`,
        data: { link: '/admin/evaluation-health', writing_escalated: writingCounts.escalated, speaking_failed_manual: speakingCounts.failed_manual },
        priority: 'high',
      })
    }

    // ── Force-recover stale failed_retrying speaking rows (> 30 min) ──
    const { data: staleSpeak } = await supa
      .from('speaking_recordings')
      .select('id, evaluation_attempts')
      .eq('evaluation_status', 'failed_retrying')
      .lt('last_attempt_at', staleThreshold)
      .lt('evaluation_attempts', 5)
      .limit(10)

    let speakRescued = 0
    if (staleSpeak?.length) {
      // Reset to pending so sweeper picks them up
      await supa.from('speaking_recordings')
        .update({ evaluation_status: 'pending', last_attempt_at: null })
        .in('id', staleSpeak.map(r => r.id))
      speakRescued = staleSpeak.length
    }

    // ── Force-recover stale failed writing rows (> 30 min) ──
    const { data: staleWrite } = await supa
      .from('student_curriculum_progress')
      .select('id')
      .eq('section_type', 'writing')
      .eq('evaluation_status', 'failed')
      .lt('evaluation_last_attempt_at', staleThreshold)
      .lt('evaluation_attempts', 5)
      .limit(10)

    let writeRescued = 0
    if (staleWrite?.length) {
      await supa.from('student_curriculum_progress')
        .update({ evaluation_status: 'pending', evaluation_last_attempt_at: null })
        .in('id', staleWrite.map(r => r.id))
      writeRescued = staleWrite.length
    }

    const summary = {
      checked_at: now.toISOString(),
      writing: writingCounts,
      speaking: speakingCounts,
      affected_students: affectedIds.size,
      manual_review_needed: manualCount,
      rescued: { speaking: speakRescued, writing: writeRescued },
      admin_alerted: manualCount > 0,
    }

    console.log('[health-monitor] Summary:', JSON.stringify(summary))
    return jsonRes(summary)

  } catch (e: any) {
    console.error('[health-monitor] Fatal:', e.message)
    return jsonRes({ error: e.message }, 500)
  }
})
