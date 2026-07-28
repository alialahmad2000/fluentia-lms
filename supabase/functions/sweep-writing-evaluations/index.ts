// Fluentia LMS — Background Writing Evaluation Sweeper
// Runs every 5 minutes via pg_cron. Picks up pending/failed writing submissions
// and sends them to ai-writing-feedback for evaluation.
// Deploy: supabase functions deploy sweep-writing-evaluations --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  try {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    // Find pending/failed submissions that need evaluation
    // Also catch stale 'evaluating' rows (>5 min = likely timed out)
    const { data: queue, error: qErr } = await supabase
      .from('student_curriculum_progress')
      .select('id, student_id, writing_id, evaluation_status, evaluation_attempts')
      .eq('section_type', 'writing')
      .not('writing_id', 'is', null)
      .in('evaluation_status', ['pending', 'failed', 'evaluating'])
      .lt('evaluation_attempts', 5)
      .or(`evaluation_last_attempt_at.is.null,evaluation_last_attempt_at.lt.${twoMinAgo}`)
      .order('evaluation_last_attempt_at', { ascending: true, nullsFirst: true })
      .limit(5)

    if (qErr) {
      console.error('[sweep] Query error:', qErr.message)
      return jsonRes({ error: qErr.message }, 500)
    }

    // ── Rescue pass: retry 'escalated' rows on a long backoff ──────────
    // Why: a platform-wide outage (retired model ID, exhausted API credits,
    // provider downtime) burns all 5 attempts within minutes and parks the
    // submission in 'escalated' forever — the student never gets feedback and
    // the normal sweep above will never look at it again. Retrying escalated
    // rows every 6h means any fixed outage self-heals instead of silently
    // stranding students' work. (2026-07-28: 14 submissions across 7 students
    // sat escalated for up to 5 weeks after the model ID was retired.)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    const { data: rescue } = await supabase
      .from('student_curriculum_progress')
      .select('id, student_id, writing_id, evaluation_status, evaluation_attempts, evaluation_rescue_count')
      .eq('section_type', 'writing')
      .not('writing_id', 'is', null)
      .eq('evaluation_status', 'escalated')
      .lt('evaluation_rescue_count', 10) // ~10 rescues over ~2.5 days, then truly give up
      .or(`evaluation_last_attempt_at.is.null,evaluation_last_attempt_at.lt.${sixHoursAgo}`)
      .order('evaluation_last_attempt_at', { ascending: true, nullsFirst: true })
      .limit(3)

    // Reset the attempt budget so ai-writing-feedback's `attempts >= 5` guard
    // lets the retry through, while evaluation_rescue_count keeps the overall
    // number of rescues bounded.
    for (const row of rescue ?? []) {
      await supabase
        .from('student_curriculum_progress')
        .update({
          evaluation_status: 'pending',
          evaluation_attempts: 0,
          evaluation_rescue_count: (row.evaluation_rescue_count ?? 0) + 1,
        })
        .eq('id', row.id)
    }

    const fullQueue = [...(queue ?? []), ...(rescue ?? [])]

    if (fullQueue.length === 0) {
      return jsonRes({ swept: 0, message: 'No pending evaluations' })
    }

    console.log(`[sweep] Found ${fullQueue.length} submissions to evaluate (${rescue?.length ?? 0} rescued from escalated)`)

    // Process each submission by calling ai-writing-feedback with progress_id
    const results = await Promise.allSettled(
      fullQueue.map(async (row) => {
        // Skip stale 'evaluating' only if <5 min old
        if (row.evaluation_status === 'evaluating') {
          // Already checked in query, but double-check
        }

        const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-writing-feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ progress_id: row.id }),
        })

        const data = await res.json()
        return { id: row.id, ok: data.ok, status: data.status, cached: data.cached }
      })
    )

    const succeeded = results.filter(r => r.status === 'fulfilled' && (r as any).value?.ok).length
    const failed = results.filter(r => r.status === 'rejected' || !(r as any).value?.ok).length

    console.log(`[sweep] Results: ${succeeded} succeeded, ${failed} failed out of ${fullQueue.length}`)

    return jsonRes({
      swept: fullQueue.length,
      rescued: rescue?.length ?? 0,
      succeeded,
      failed,
      details: results.map(r => r.status === 'fulfilled' ? (r as any).value : { error: (r as any).reason?.message }),
    })

  } catch (err: any) {
    console.error('[sweep] Error:', err.message)
    return jsonRes({ error: err.message }, 500)
  }
})
