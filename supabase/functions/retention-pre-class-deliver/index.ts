// retention-pre-class-deliver — thin HTTP wrapper around retention_deliver_briefs('pre').
// Exists for the §4.4 deploy contract; the pg_cron schedule calls the RPC directly,
// but admin/ops can poke this endpoint to force-run the pre-class window manually.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ ok: false, error: 'misconfig' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!bearer) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing Authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  // Either service-role (cron) or admin (manual)
  let actor: 'service_role' | 'admin' = 'service_role'
  if (bearer !== SERVICE_ROLE) {
    const { data: { user }, error } = await supabase.auth.getUser(bearer)
    if (error || !user) return new Response(JSON.stringify({ ok: false, error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'admin') return new Response(JSON.stringify({ ok: false, error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    actor = 'admin'
  }

  try {
    const { data, error } = await supabase.rpc('retention_deliver_briefs', { p_window: 'pre' })
    if (error) throw error
    return new Response(JSON.stringify({ ok: true, window: 'pre', actor, result: data }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    await supabase.from('system_errors').insert({
      error_type: 'retention_pre_class_deliver.error',
      service: 'retention-pre-class-deliver',
      error_message: e?.message ?? String(e),
    })
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
