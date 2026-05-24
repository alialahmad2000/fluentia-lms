// retention-weekly-report-generate — runs Sundays via pg_cron (or admin manual).
// For each active student with weekly_reports enabled, calls retention_build_weekly_report.

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

  // Either service-role (cron) or admin (manual button)
  let actor: 'service_role' | 'admin' | 'unknown' = 'unknown'
  if (bearer === SERVICE_ROLE) actor = 'service_role'
  else {
    const { data: { user }, error } = await supabase.auth.getUser(bearer)
    if (error || !user) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ ok: false, error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    actor = 'admin'
  }

  let body: { week_start?: string; student_ids?: string[] } = {}
  try {
    const raw = await req.text()
    if (raw) body = JSON.parse(raw)
  } catch {}

  try {
    // Determine target students: provided list OR all active w/ module enabled
    let students: { id: string }[] = []
    if (Array.isArray(body.student_ids) && body.student_ids.length > 0) {
      students = body.student_ids.map((id) => ({ id }))
    } else {
      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('status', 'active')
        .is('deleted_at', null)
      if (error) throw error
      // Filter by module-enabled
      const enabledIds: string[] = []
      for (const s of (data ?? [])) {
        const { data: enabled } = await supabase.rpc('retention_is_module_enabled', {
          p_student_id: s.id,
          p_module_key: 'weekly_reports',
        })
        if (enabled === true) enabledIds.push(s.id)
      }
      students = enabledIds.map((id) => ({ id }))
    }

    const results: { student_id: string; report_id?: string; error?: string }[] = []
    for (const s of students) {
      try {
        const { data: rid, error } = await supabase.rpc('retention_build_weekly_report', {
          p_student_id: s.id,
          p_week_start: body.week_start ?? null,
        })
        if (error) throw error
        results.push({ student_id: s.id, report_id: rid })
      } catch (e: any) {
        results.push({ student_id: s.id, error: e?.message ?? String(e) })
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      actor,
      total_students: students.length,
      built: results.filter((r) => r.report_id).length,
      failed: results.filter((r) => r.error).length,
      results,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    await supabase.from('system_errors').insert({
      error_type: 'retention_weekly_report_generate.error',
      service: 'retention-weekly-report-generate',
      error_message: e?.message ?? String(e),
    })
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
