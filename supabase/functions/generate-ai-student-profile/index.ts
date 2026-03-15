// Fluentia LMS — Generate AI Student Profile
// Analyzes student data and generates comprehensive AI profile
// Deploy: supabase functions deploy generate-ai-student-profile --no-verify-jwt --project-ref nmjexpuycmqcxuxljier

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check role (trainer or admin only)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['trainer', 'admin'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'يجب أن تكون مدرباً أو مشرفاً' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Parse body
    let body: { student_id?: string } = {}
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: 'بيانات غير صالحة' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { student_id } = body
    if (!student_id) {
      return new Response(JSON.stringify({ error: 'student_id مطلوب' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Gather student data
    const [
      { data: student },
      { data: studentProfile },
      { data: submissions },
      { data: weeklyTasks },
      { data: attendance },
      { data: xpLog },
      { data: quizAttempts },
      { data: errorPatterns },
    ] = await Promise.all([
      supabase.from('students').select('*, groups(name, code, level)').eq('id', student_id).single(),
      supabase.from('profiles').select('full_name, display_name').eq('id', student_id).single(),
      supabase.from('submissions').select('grade, grade_numeric, is_late, points_awarded, assignments(type, title)').eq('student_id', student_id).eq('status', 'graded').is('deleted_at', null).order('created_at', { ascending: false }).limit(30),
      supabase.from('weekly_tasks').select('type, status, auto_score, trainer_score').eq('student_id', student_id).is('deleted_at', null).order('created_at', { ascending: false }).limit(50),
      supabase.from('attendance').select('status, created_at').eq('student_id', student_id).order('created_at', { ascending: false }).limit(20),
      supabase.from('xp_transactions').select('amount, reason').eq('student_id', student_id).order('created_at', { ascending: false }).limit(50),
      supabase.from('quiz_attempts').select('score, total_questions, quiz_type').eq('student_id', student_id).order('created_at', { ascending: false }).limit(10),
      supabase.from('error_patterns').select('pattern_type, frequency, examples').eq('student_id', student_id).limit(20),
    ])

    if (!student) {
      return new Response(JSON.stringify({ error: 'الطالب غير موجود' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const studentName = studentProfile?.display_name || studentProfile?.full_name || 'طالب'

    // Build data summary for Claude
    const dataSummary = {
      name: studentName,
      level: student.academic_level,
      package: student.package,
      xp: student.xp_total,
      streak: student.current_streak,
      longest_streak: student.longest_streak,
      group: student.groups?.name,
      submissions_count: submissions?.length || 0,
      avg_grade: submissions?.length ? Math.round(submissions.reduce((s: number, g: any) => s + (g.grade_numeric || 0), 0) / submissions.length) : 0,
      late_submissions: submissions?.filter((s: any) => s.is_late).length || 0,
      weekly_tasks_completed: weeklyTasks?.filter((t: any) => t.status === 'completed').length || 0,
      weekly_tasks_total: weeklyTasks?.length || 0,
      weekly_task_types: weeklyTasks?.reduce((acc: any, t: any) => { acc[t.type] = (acc[t.type] || 0) + 1; return acc }, {}),
      weekly_avg_score: weeklyTasks?.filter((t: any) => t.auto_score).length ? Math.round(weeklyTasks.filter((t: any) => t.auto_score).reduce((s: number, t: any) => s + t.auto_score, 0) / weeklyTasks.filter((t: any) => t.auto_score).length) : 0,
      attendance_present: attendance?.filter((a: any) => a.status === 'present').length || 0,
      attendance_total: attendance?.length || 0,
      xp_breakdown: xpLog?.reduce((acc: any, x: any) => { acc[x.reason] = (acc[x.reason] || 0) + x.amount; return acc }, {}),
      quiz_avg: quizAttempts?.length ? Math.round(quizAttempts.reduce((s: number, q: any) => s + (q.score / q.total_questions * 100), 0) / quizAttempts.length) : 0,
      error_patterns: errorPatterns?.map((e: any) => ({ type: e.pattern_type, frequency: e.frequency })) || [],
    }

    // Call Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are an expert English language education analyst at Fluentia Academy, a premium English school in Saudi Arabia for Arabic-speaking adults.

Analyze this student's learning data and generate a comprehensive profile. Return ONLY valid JSON with this structure:
{
  "skills": {
    "speaking": 0-100,
    "listening": 0-100,
    "reading": 0-100,
    "writing": 0-100,
    "grammar": 0-100,
    "vocabulary": 0-100,
    "pronunciation": 0-100,
    "consistency": 0-100
  },
  "strengths": ["3-5 specific strengths in Arabic"],
  "weaknesses": ["3-5 specific areas to improve in Arabic"],
  "tips": ["5-7 personalized study tips in Arabic"],
  "summary_ar": "2-3 paragraph Arabic summary of the student's profile, strengths, and recommended path",
  "summary_en": "1 paragraph English summary for trainer reference"
}

Student data:
${JSON.stringify(dataSummary, null, 2)}

Important: Base skill scores on actual data. If data is limited for a skill, score it 50 (neutral) rather than guessing. Write summaries and tips in natural Saudi Arabic (use common expressions). Be encouraging but honest about weak areas.`,
        }],
      }),
    })

    if (!claudeRes.ok) {
      return new Response(JSON.stringify({ error: 'خطأ في تحليل البيانات' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const claudeData = await claudeRes.json()
    const responseText = claudeData.content?.[0]?.text || ''

    let analysis: any
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      analysis = JSON.parse(jsonMatch?.[0] || responseText)
    } catch {
      return new Response(JSON.stringify({ error: 'خطأ في معالجة النتائج' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Upsert into ai_student_profiles
    const { error: upsertErr } = await supabase.from('ai_student_profiles').upsert({
      student_id,
      skills: analysis.skills || {},
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      tips: analysis.tips || [],
      summary_ar: analysis.summary_ar || '',
      summary_en: analysis.summary_en || '',
      raw_analysis: analysis,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id' }).select()

    if (upsertErr) {
      return new Response(JSON.stringify({ error: 'خطأ في حفظ الملف' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Log AI usage
    await supabase.from('ai_usage').insert({
      type: 'ai_student_profile',
      student_id,
      tokens_used: claudeData.usage?.input_tokens + claudeData.usage?.output_tokens || 0,
      estimated_cost_sar: ((claudeData.usage?.input_tokens || 0) * 0.003 + (claudeData.usage?.output_tokens || 0) * 0.015) / 1000 * 3.75,
    })

    return new Response(JSON.stringify({
      success: true,
      profile: analysis,
      message: `تم تحليل ملف ${studentName} بنجاح`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'خطأ داخلي في الخادم' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
