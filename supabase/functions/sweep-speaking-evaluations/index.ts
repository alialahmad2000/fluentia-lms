// Fluentia LMS — Speaking Evaluation Sweeper
// Runs every 5 minutes. Picks up pending/failed/orphaned speaking recordings
// and re-invokes evaluate-speaking for each (up to 5 attempts per recording).
// Deploy: supabase functions deploy sweep-speaking-evaluations --no-verify-jwt

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

  try {
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

    if (!candidates?.length) {
      return jsonRes({ swept: 0, message: 'No pending evaluations' })
    }

    console.log(`[sweep-speaking] Found ${candidates.length} recordings to process`)

    // Process in parallel (all at once — evaluate-speaking handles its own concurrency via atomic claim)
    const results = await Promise.allSettled(
      candidates.map(c =>
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
    const failed    = candidates.length - succeeded - skipped

    console.log(`[sweep-speaking] Done: ${succeeded} ok, ${skipped} skipped, ${failed} failed`)

    return jsonRes({
      swept: candidates.length,
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
