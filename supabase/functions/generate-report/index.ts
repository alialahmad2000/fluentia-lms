// Fluentia LMS — AI Progress Report Generation
// Collects student data, generates AI summary via Claude
// Deploy: supabase functions deploy generate-report
// Env: CLAUDE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) throw new Error('Unauthorized')

    // Verify trainer/admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['trainer', 'admin'].includes(profile.role)) {
      throw new Error('Unauthorized — trainers/admins only')
    }

    const body = await req.json()
    const { student_id, period_days } = body

    if (!student_id) throw new Error('Missing student_id')

    const periodDays = period_days || 30
    const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString()

    // Collect student data
    const [
      { data: student },
      { data: studentProfile },
      { data: submissions },
      { data: xpHistory },
      { data: attendance },
      { data: achievements },
      { data: vocabCount },
    ] = await Promise.all([
      supabase.from('students').select('*, groups(name, code)').eq('id', student_id).single(),
      supabase.from('profiles').select('full_name, display_name').eq('id', student_id).single(),
      supabase.from('submissions')
        .select('id, status, grade, grade_numeric, is_late, submitted_at, assignments(title, type)')
        .eq('student_id', student_id)
        .gte('submitted_at', periodStart)
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false }),
      supabase.from('xp_transactions')
        .select('amount, reason, created_at')
        .eq('student_id', student_id)
        .gte('created_at', periodStart),
      supabase.from('attendance')
        .select('status, date')
        .eq('student_id', student_id)
        .gte('date', periodStart.split('T')[0]),
      supabase.from('student_achievements')
        .select('earned_at, achievements(name_ar)')
        .eq('student_id', student_id)
        .gte('earned_at', periodStart),
      supabase.from('vocabulary_bank')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', student_id)
        .eq('mastery', 'mastered'),
    ])

    const studentName = studentProfile?.display_name || studentProfile?.full_name || 'الطالب'

    // Build data summary for Claude
    const totalSubmissions = submissions?.length || 0
    const gradedSubmissions = (submissions || []).filter(s => s.status === 'graded')
    const avgGrade = gradedSubmissions.length > 0
      ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.grade_numeric || 0), 0) / gradedSubmissions.length)
      : null
    const lateCount = (submissions || []).filter(s => s.is_late).length
    const totalXP = (xpHistory || []).reduce((sum, t) => sum + (t.amount || 0), 0)
    const presentCount = (attendance || []).filter(a => a.status === 'present').length
    const absentCount = (attendance || []).filter(a => a.status === 'absent').length
    const totalClasses = (attendance || []).length
    const newAchievements = achievements?.length || 0

    const dataSummary = `Student: ${studentName}
Level: ${student?.academic_level || 'Unknown'}, Package: ${student?.package || 'Unknown'}
Period: last ${periodDays} days
XP earned: ${totalXP}, Current streak: ${student?.current_streak || 0} days
Submissions: ${totalSubmissions} total, ${lateCount} late
Average grade: ${avgGrade !== null ? avgGrade + '%' : 'N/A'}
Attendance: ${presentCount}/${totalClasses} classes (${absentCount} absences)
Achievements earned: ${newAchievements}
Vocabulary mastered: ${vocabCount?.count || 0} words
Assignment types: ${[...new Set((submissions || []).map(s => s.assignments?.type).filter(Boolean))].join(', ') || 'None'}`

    if (!CLAUDE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        system: `You are generating a progress report for an Arab student learning English.
Write the report in Arabic. Structure it as JSON with these fields:
- overview: string (2-3 sentences overall summary)
- strengths: array of strings (2-3 strong points)
- weaknesses: array of strings (1-3 areas needing improvement)
- comparison_note: string (1 sentence about progress trend)
- recommendations: array of strings (2-3 specific action items)
- engagement_score: number 1-10 (overall engagement)
- progress_rating: string (one of: "ممتاز", "جيد جداً", "جيد", "يحتاج تحسين")
Respond ONLY with valid JSON.`,
        messages: [{ role: 'user', content: dataSummary }],
      }),
    })

    if (!claudeRes.ok) {
      return new Response(
        JSON.stringify({ error: 'تعذر إنشاء التقرير' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    const claudeData = await claudeRes.json()
    const responseText = claudeData.content?.[0]?.text || '{}'
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    let report
    try {
      report = JSON.parse(responseText)
    } catch {
      report = { overview: responseText, progress_rating: 'جيد' }
    }

    // Add raw stats to report
    report.stats = {
      total_submissions: totalSubmissions,
      avg_grade: avgGrade,
      late_submissions: lateCount,
      xp_earned: totalXP,
      attendance_rate: totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : null,
      current_streak: student?.current_streak || 0,
      achievements_earned: newAchievements,
      vocab_mastered: vocabCount?.count || 0,
    }
    report.student_name = studentName
    report.period_days = periodDays
    report.generated_at = new Date().toISOString()

    // Log usage — check if user is a trainer (admin may not be in trainers table)
    const { data: trainerRecord } = await supabase
      .from('trainers')
      .select('id')
      .eq('id', user.id)
      .single()

    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75
    await supabase.from('ai_usage').insert({
      type: 'progress_report',
      student_id: student_id,
      trainer_id: trainerRecord ? user.id : null,
      model: 'claude-sonnet',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_sar: costSAR.toFixed(4),
    })

    return new Response(
      JSON.stringify({ report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[generate-report] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
