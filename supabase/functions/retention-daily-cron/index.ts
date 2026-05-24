// retention-daily-cron — HTTP endpoint that invokes retention_daily_run().
// Two use cases:
//   1. pg_cron HTTP-triggered (cron job calls this URL)
//   2. Admin "force run now" button on /admin/retention dashboard
//
// All real work lives in the SECURITY DEFINER PL/pgSQL function. This wrapper
// just adds: auth check, error envelope, structured JSON response, telemetry.
//
// Deploy: supabase functions deploy retention-daily-cron --no-verify-jwt --project-ref <ref>
// (verify_jwt=false; auth handled internally — same pattern as other cron functions)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Server misconfiguration (missing SUPABASE_URL or SERVICE_ROLE_KEY)' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Auth: either a valid admin JWT OR the service-role bearer (cron uses the latter)
  const authHeader = req.headers.get('Authorization') ?? ''
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!bearer) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Missing Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  let invokedBy: 'service_role' | 'admin' | 'unknown' = 'unknown'

  if (bearer === SERVICE_ROLE_KEY) {
    invokedBy = 'service_role'
  } else {
    // User JWT — must resolve to an admin
    const { data: userResult, error: userErr } = await supabase.auth.getUser(bearer)
    if (userErr || !userResult?.user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userResult.user.id)
      .maybeSingle()
    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Forbidden — admin only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    invokedBy = 'admin'
  }

  // Body parsing (try/catch — never 500 on bad JSON)
  let body: Record<string, unknown> = {}
  try {
    const raw = await req.text()
    if (raw && raw.length > 0) body = JSON.parse(raw)
  } catch {
    // Cron may send empty body; not an error
  }

  // Invoke the orchestrator RPC
  const startedAt = Date.now()
  const { data, error } = await supabase.rpc('retention_daily_run')
  const durationMs = Date.now() - startedAt

  if (error) {
    // Log to system_errors
    await supabase.from('system_errors').insert({
      error_type: 'retention_daily_cron.invoke_failed',
      service: 'retention-daily-cron',
      error_message: error.message,
      error_context: { invokedBy, body, duration_ms: durationMs },
    })
    return new Response(
      JSON.stringify({ ok: false, error: error.message, invoked_by: invokedBy }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // RPC returns SETOF, so data is an array with one row
  const summary = Array.isArray(data) && data.length > 0 ? data[0] : data
  return new Response(
    JSON.stringify({
      ok: true,
      invoked_by: invokedBy,
      duration_ms: durationMs,
      summary,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
