// Fluentia LMS — Data Reset Edge Function
// Admin-only: truncates all student activity data while keeping structure
// Deploy: supabase functions deploy reset-all-data --no-verify-jwt --project-ref nmjexpuycmqcxuxljier

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tables to truncate (student activity data only)
const TABLES_TO_TRUNCATE = [
  'submissions',
  'weekly_tasks',
  'weekly_task_sets',
  'xp_transactions',
  'attendance',
  'student_speaking_progress',
  'activity_feed',
  'student_achievements',
  'daily_challenges',
  'quiz_attempts',
  'voice_journals',
  'targeted_exercises',
  'chat_messages',
  'notifications',
  'ai_usage',
  'ai_student_profiles',
]

// Student stats to reset
const STUDENT_RESET_VALUES = {
  xp_total: 0,
  current_streak: 0,
  longest_streak: 0,
  gamification_level: 1,
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'يجب أن تكون مشرفاً' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse body
    let body: { confirm?: string } = {}
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'بيانات غير صالحة' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Require confirmation
    if (body.confirm !== 'RESET') {
      return new Response(JSON.stringify({ error: 'يجب تأكيد العملية بإرسال confirm: "RESET"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Truncate tables
    const truncated: string[] = []
    const errors: string[] = []

    for (const table of TABLES_TO_TRUNCATE) {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) {
        errors.push(`${table}: ${error.message}`)
      } else {
        truncated.push(table)
      }
    }

    // Reset student stats
    const { data: students } = await supabase.from('students').select('id').is('deleted_at', null)
    const studentCount = students?.length || 0

    if (studentCount > 0) {
      const { error: resetErr } = await supabase
        .from('students')
        .update(STUDENT_RESET_VALUES)
        .is('deleted_at', null)
      if (resetErr) {
        errors.push(`students reset: ${resetErr.message}`)
      }
    }

    // Log the reset
    await supabase.from('data_reset_log').insert({
      admin_id: user.id,
      reset_type: 'full',
      tables_reset: truncated,
      student_count: studentCount,
    })

    return new Response(JSON.stringify({
      success: true,
      tables_reset: truncated,
      student_count: studentCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `تم إعادة تعيين بيانات ${studentCount} طالب في ${truncated.length} جدول`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'خطأ داخلي في الخادم' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
