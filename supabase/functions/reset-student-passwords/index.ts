// Fluentia LMS — Reset Student Passwords Edge Function
// Admin-only: sets all student passwords to Fluentia2025! and flags must_change_password
// Deploy: supabase functions deploy reset-student-passwords --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Require confirmation
    let body: { confirm?: string } = {}
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'بيانات غير صالحة' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.confirm !== 'RESET_PASSWORDS') {
      return new Response(JSON.stringify({ error: 'يجب تأكيد العملية بإرسال confirm: "RESET_PASSWORDS"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get all active students
    const { data: students, error: fetchErr } = await supabase
      .from('students')
      .select('id')
      .is('deleted_at', null)

    if (fetchErr) {
      return new Response(JSON.stringify({ error: `فشل جلب الطلاب: ${fetchErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!students || students.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: 'لا يوجد طلاب' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const PASSWORD = 'Fluentia2025!'
    let updated = 0
    const errors: string[] = []

    // Update each student's password via Admin API
    for (const student of students) {
      const { error: pwErr } = await supabase.auth.admin.updateUserById(student.id, {
        password: PASSWORD,
      })
      if (pwErr) {
        errors.push(`${student.id}: ${pwErr.message}`)
      } else {
        updated++
      }
    }

    // Set must_change_password = true for all students
    const { error: flagErr } = await supabase
      .from('profiles')
      .update({ must_change_password: true })
      .in('id', students.map(s => s.id))

    if (flagErr) {
      errors.push(`must_change_password flag: ${flagErr.message}`)
    }

    return new Response(JSON.stringify({
      success: true,
      count: updated,
      total: students.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `تم تعيين كلمة مرور موحدة لـ ${updated} طالب من أصل ${students.length}`,
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
