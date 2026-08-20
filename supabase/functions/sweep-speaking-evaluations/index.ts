// Fluentia LMS — Speaking Evaluation Sweeper
// Runs every 5 minutes. Two jobs:
//   1) recordings — pending/failed/orphaned speaking recordings are re-sent to
//      evaluate-speaking (up to 5 attempts each, plus a 6-hourly rescue pass).
//   2) conversations — a conversation the student walked away from after speaking
//      enough to be graded is graded FOR her (speaking-conversation-grade), so her
//      feedback, her unit progress and her XP land even though she never pressed
//      «أنهي المحادثة». Before this existed, that work was simply lost.
// Deploy: node scripts/_deploy-fn.cjs sweep-speaking-evaluations   (verify_jwt:false)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Job 2: conversations abandoned mid-flow ──────────────────────────────
  // A student who spoke 2+ turns has already given the grader everything it needs.
  // If she then closed the tab (or the app crashed, or she simply never noticed the
  // finish button), the conversation sits in_progress forever: no evaluation, no
  // speaking_recordings row, no progress, no XP. After 30 minutes of silence we
  // consider it abandoned and grade it exactly as if she had pressed the button.
  // 30 minutes is deliberately generous — a student thinking, or answering the door
  // mid-conversation, must never have her conversation closed out from under her.
  async function sweepAbandonedConversations() {
    const idleCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    // …but only recent work. Feedback on a chat from two months ago is archaeology,
    // not teaching, and the one-time backfill of 2026-08-21 already cleared the tail.
    const tooOld = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: stale, error } = await supabase
      .from('speaking_conversations')
      .select('id, turn_count, updated_at')
      .eq('status', 'in_progress')
      .is('deleted_at', null)
      .gte('turn_count', 2)
      .gte('created_at', tooOld)
      .or(`updated_at.is.null,updated_at.lt.${idleCutoff}`)
      .order('updated_at', { ascending: true, nullsFirst: true })
      .limit(10)

    if (error) {
      console.error('[sweep-speaking] conversation query error:', error.message)
      return { found: 0, graded: 0, failed: 0 }
    }
    if (!stale?.length) return { found: 0, graded: 0, failed: 0 }

    console.log(`[sweep-speaking] ${stale.length} abandoned conversation(s) to grade`)

    const out = await Promise.allSettled(
      stale.map(c =>
        fetch(`${SUPABASE_URL}/functions/v1/speaking-conversation-grade`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: c.id, source: 'sweeper' }),
        })
          .then(async res => {
            const data = await res.json().catch(() => ({}))
            if (!data.ok) console.warn(`[sweep-speaking] convo ${c.id} not graded:`, data.reason || data.error || res.status)
            return { id: c.id, ok: !!data.ok }
          })
          .catch(e => ({ id: c.id, ok: false, error: e.message }))
      )
    )
    const graded = out.filter(r => r.status === 'fulfilled' && (r as any).value?.ok).length
    return { found: stale.length, graded, failed: stale.length - graded }
  }

  try {
    const conversations = await sweepAbandonedConversations()

    // Rows that need attention:
    // - status IN (pending, failed_retrying) older than 3 minutes, OR
    // - status = evaluating older than 3 minutes (orphaned — function crashed mid-run)
    // - attempts < 5 (haven't exhausted retries)
    const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString()

    const { data: candidates, error: qErr } = await supabase
      .from('speaking_recordings')
      .select('id, evaluation_attempts, evaluation_status')
      .in('evaluation_status', ['pending', 'failed_retrying', 'evaluating'])
      .lt('evaluation_attempts', 5)
      .or(`last_attempt_at.is.null,last_attempt_at.lt.${cutoff}`)
      .order('last_attempt_at', { ascending: true, nullsFirst: true })
      .limit(20)

    if (qErr) {
      console.error('[sweep-speaking] Query error:', qErr.message)
      return jsonRes({ error: qErr.message }, 500)
    }

    // ── Rescue pass: retry 'failed_manual' recordings on a long backoff ──
    // Why: a platform-wide outage (retired model ID, exhausted API credits,
    // provider downtime) burns all 5 attempts in minutes and parks the
    // recording in 'failed_manual' forever — the student never gets feedback
    // and the sweep above never looks at it again. Retrying every 6h means a
    // fixed outage self-heals instead of silently stranding students' work.
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    const { data: rescue } = await supabase
      .from('speaking_recordings')
      .select('id, evaluation_attempts, evaluation_status, evaluation_rescue_count')
      .eq('evaluation_status', 'failed_manual')
      .lt('evaluation_rescue_count', 10) // ~10 rescues over ~2.5 days, then give up
      .or(`last_attempt_at.is.null,last_attempt_at.lt.${sixHoursAgo}`)
      .order('last_attempt_at', { ascending: true, nullsFirst: true })
      .limit(3)

    // Reset the attempt budget so evaluate-speaking will process it again,
    // while evaluation_rescue_count keeps total rescues bounded.
    for (const row of rescue ?? []) {
      await supabase
        .from('speaking_recordings')
        .update({
          evaluation_status: 'pending',
          evaluation_attempts: 0,
          evaluation_rescue_count: (row.evaluation_rescue_count ?? 0) + 1,
        })
        .eq('id', row.id)
    }

    const allCandidates = [...(candidates ?? []), ...(rescue ?? [])]

    if (!allCandidates.length) {
      return jsonRes({ swept: 0, conversations, message: 'No pending evaluations' })
    }

    console.log(`[sweep-speaking] Found ${allCandidates.length} recordings to process (${rescue?.length ?? 0} rescued from failed_manual)`)

    // Process in parallel (all at once — evaluate-speaking handles its own concurrency via atomic claim)
    const results = await Promise.allSettled(
      allCandidates.map(c =>
        fetch(`${SUPABASE_URL}/functions/v1/evaluate-speaking`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ recording_id: c.id, source: 'sweeper' }),
        })
          .then(async res => {
            const data = await res.json().catch(() => ({}))
            return { id: c.id, ok: data.ok, skipped: data.skipped, status: res.status }
          })
          .catch(e => ({ id: c.id, ok: false, error: e.message }))
      )
    )

    const succeeded = results.filter(r => r.status === 'fulfilled' && (r as any).value?.ok).length
    const skipped   = results.filter(r => r.status === 'fulfilled' && (r as any).value?.skipped).length
    const failed    = allCandidates.length - succeeded - skipped

    console.log(`[sweep-speaking] Done: ${succeeded} ok, ${skipped} skipped, ${failed} failed`)

    return jsonRes({
      swept: allCandidates.length,
      conversations,
      rescued: rescue?.length ?? 0,
      succeeded,
      skipped,
      failed,
      details: results.map(r =>
        r.status === 'fulfilled'
          ? (r as any).value
          : { ok: false, error: (r as any).reason?.message }
      ),
    })
  } catch (e: any) {
    console.error('[sweep-speaking] Fatal:', e.message)
    return jsonRes({ error: e.message }, 500)
  }
})
