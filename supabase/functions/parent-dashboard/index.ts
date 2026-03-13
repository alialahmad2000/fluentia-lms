// Fluentia LMS — Parent Dashboard API
// Public endpoint: returns student progress data given an access code
// POST { access_code }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    const { access_code, action } = await req.json()

    if (!access_code || typeof access_code !== 'string') {
      return new Response(JSON.stringify({ error: 'access_code required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (access_code.length > 32) {
      return new Response(JSON.stringify({ error: 'رمز الوصول غير صالح' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Verify access code
    const { data: link } = await supabase
      .from('parent_links')
      .select('*')
      .eq('access_code', access_code)
      .eq('is_active', true)
      .single()

    if (!link) {
      return new Response(JSON.stringify({ error: 'رمز الوصول غير صالح' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Update last accessed
    await supabase.from('parent_links').update({ last_accessed_at: new Date().toISOString() }).eq('id', link.id)

    const studentId = link.student_id

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, display_name, avatar_url')
      .eq('id', studentId)
      .single()

    const { data: student } = await supabase
      .from('students')
      .select('academic_level, xp_total, current_streak, package, status, group_id, groups(name, code, schedule)')
      .eq('id', studentId)
      .single()

    // Get recent grades
    const { data: recentGrades } = await supabase
      .from('submissions')
      .select('grade_numeric, grade, submitted_at, assignments(title, type)')
      .eq('student_id', studentId)
      .eq('status', 'graded')
      .order('updated_at', { ascending: false })
      .limit(10)

    // Get attendance this month
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: attendance } = await supabase
      .from('attendance')
      .select('status, created_at')
      .eq('student_id', studentId)
      .gte('created_at', monthAgo)

    const totalClasses = attendance?.length || 0
    const presentCount = attendance?.filter((a: any) => a.status === 'present').length || 0

    // Get skill snapshot
    const { data: skillSnapshot } = await supabase
      .from('skill_snapshots')
      .select('grammar, vocabulary, speaking, listening, reading, writing, snapshot_date')
      .eq('student_id', studentId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Get payment status
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, status, period_start, period_end')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(3)

    // Assignment completion rate
    const { count: totalAssignments } = await supabase
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', student?.group_id)
      .is('deleted_at', null)

    const { count: completedAssignments } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .in('status', ['graded', 'submitted'])

    // Average grade
    const avgGrade = recentGrades?.length
      ? Math.round(recentGrades.reduce((a: number, s: any) => a + (s.grade_numeric || 0), 0) / recentGrades.length)
      : null

    const result = {
      student: {
        name: profile?.display_name || profile?.full_name || 'طالب',
        avatar: profile?.avatar_url,
        level: student?.academic_level,
        xp: student?.xp_total || 0,
        streak: student?.current_streak || 0,
        package: student?.package,
        status: student?.status,
        group: student?.groups?.name,
      },
      grades: {
        recent: recentGrades?.map((g: any) => ({
          title: g.assignments?.title,
          type: g.assignments?.type,
          grade: g.grade,
          score: g.grade_numeric,
          date: g.submitted_at,
        })) || [],
        average: avgGrade,
      },
      attendance: {
        total: totalClasses,
        present: presentCount,
        rate: totalClasses ? Math.round((presentCount / totalClasses) * 100) : null,
      },
      assignments: {
        total: totalAssignments || 0,
        completed: completedAssignments || 0,
        rate: totalAssignments ? Math.round(((completedAssignments || 0) / totalAssignments) * 100) : null,
      },
      skills: skillSnapshot || null,
      payments: payments?.map((p: any) => ({
        amount: p.amount,
        status: p.status,
        period: `${p.period_start || ''} - ${p.period_end || ''}`,
      })) || [],
      parent_name: link.parent_name,
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('[parent-dashboard]', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
