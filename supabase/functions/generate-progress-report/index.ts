// Fluentia LMS — Generate Comprehensive AI-Powered Student Progress Report
// Gathers multi-table student data, sends to Claude for bilingual analysis
// Deploy: supabase functions deploy generate-progress-report --no-verify-jwt
// Env: CLAUDE_API_KEY or ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Period durations in days
const PERIOD_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify trainer/admin role
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || !['trainer', 'admin'].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized — trainers/admins only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Parse body ───────────────────────────────────────────────────
    let body: { student_id?: string; period?: string; language?: string } = {}
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { student_id, period = 'monthly', language = 'both' } = body

    if (!student_id || typeof student_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing student_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['weekly', 'biweekly', 'monthly'].includes(period)) {
      return new Response(
        JSON.stringify({ error: 'Invalid period — must be weekly, biweekly, or monthly' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['ar', 'en', 'both'].includes(language)) {
      return new Response(
        JSON.stringify({ error: 'Invalid language — must be ar, en, or both' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const periodDays = PERIOD_DAYS[period]
    const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString()
    const periodStartDate = periodStart.split('T')[0]

    // ── Gather comprehensive student data ────────────────────────────
    const [
      { data: studentProfile },
      { data: studentData },
      { data: attendance },
      { data: assignmentSubmissions },
      { data: weeklyTaskSubmissions },
      { data: testSessions },
      { data: latestSkillSnapshot },
      { data: periodStartSnapshot },
      { data: aiStudentProfile },
      { data: curriculumProgress },
    ] = await Promise.all([
      // profiles — name, level, package, enrollment date
      supabase
        .from('profiles')
        .select('full_name, display_name, created_at')
        .eq('id', student_id)
        .single(),

      // student_data — xp, streak, current stats
      supabase
        .from('student_data')
        .select('*')
        .eq('student_id', student_id)
        .single(),

      // attendance — records for the period
      supabase
        .from('attendance')
        .select('status, date, created_at')
        .eq('student_id', student_id)
        .gte('date', periodStartDate)
        .order('date', { ascending: true }),

      // assignment_submissions — submissions and grades for the period
      supabase
        .from('assignment_submissions')
        .select('id, status, grade, score, submitted_at, assignment_id, feedback')
        .eq('student_id', student_id)
        .gte('submitted_at', periodStart)
        .order('submitted_at', { ascending: false }),

      // weekly_task_submissions — weekly task performance
      supabase
        .from('weekly_task_submissions')
        .select('id, status, score, submitted_at, task_type, feedback')
        .eq('student_id', student_id)
        .gte('submitted_at', periodStart)
        .order('submitted_at', { ascending: false }),

      // test_sessions — test results
      supabase
        .from('test_sessions')
        .select('id, test_type, score, total_score, status, completed_at')
        .eq('student_id', student_id)
        .gte('completed_at', periodStart)
        .order('completed_at', { ascending: false }),

      // skill_snapshots — latest snapshot
      supabase
        .from('skill_snapshots')
        .select('grammar, vocabulary, speaking, listening, reading, writing, snapshot_date')
        .eq('student_id', student_id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // skill_snapshots — snapshot closest to start of period (for comparison)
      supabase
        .from('skill_snapshots')
        .select('grammar, vocabulary, speaking, listening, reading, writing, snapshot_date')
        .eq('student_id', student_id)
        .lte('snapshot_date', periodStartDate)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // ai_student_profiles — AI analysis
      supabase
        .from('ai_student_profiles')
        .select('skills, strengths, weaknesses, tips, summary_ar, summary_en')
        .eq('student_id', student_id)
        .maybeSingle(),

      // student_curriculum_progress — curriculum progress
      supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', student_id),
    ])

    const studentName = studentProfile?.display_name || studentProfile?.full_name || 'الطالب'

    // ── Calculate key metrics ────────────────────────────────────────

    // Attendance rate
    const totalClasses = attendance?.length || 0
    const presentCount = (attendance || []).filter((a: any) => a.status === 'present').length
    const absentCount = (attendance || []).filter((a: any) => a.status === 'absent').length
    const lateCount = (attendance || []).filter((a: any) => a.status === 'late').length
    const attendanceRate = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : null

    // Assignment metrics
    const totalAssignments = assignmentSubmissions?.length || 0
    const gradedAssignments = (assignmentSubmissions || []).filter((s: any) => s.status === 'graded' || s.score !== null)
    const avgGrade = gradedAssignments.length > 0
      ? Math.round(gradedAssignments.reduce((sum: number, s: any) => sum + (s.score || s.grade || 0), 0) / gradedAssignments.length)
      : null
    const assignmentCompletionRate = totalAssignments > 0
      ? Math.round(((assignmentSubmissions || []).filter((s: any) => s.status === 'submitted' || s.status === 'graded').length / totalAssignments) * 100)
      : null

    // Weekly task metrics
    const totalWeeklyTasks = weeklyTaskSubmissions?.length || 0
    const completedWeeklyTasks = (weeklyTaskSubmissions || []).filter((t: any) => t.status === 'completed' || t.status === 'graded').length
    const weeklyTaskCompletionRate = totalWeeklyTasks > 0
      ? Math.round((completedWeeklyTasks / totalWeeklyTasks) * 100)
      : null
    const weeklyTaskAvgScore = (weeklyTaskSubmissions || []).filter((t: any) => t.score !== null).length > 0
      ? Math.round(
          (weeklyTaskSubmissions || []).filter((t: any) => t.score !== null)
            .reduce((sum: number, t: any) => sum + t.score, 0) /
          (weeklyTaskSubmissions || []).filter((t: any) => t.score !== null).length
        )
      : null

    // Test results
    const testResults = (testSessions || []).map((t: any) => ({
      type: t.test_type,
      score: t.score,
      total: t.total_score,
      percentage: t.total_score > 0 ? Math.round((t.score / t.total_score) * 100) : null,
      date: t.completed_at,
    }))

    // Skill improvements (compare snapshots)
    const skillImprovement: Record<string, { start: number; current: number; change: number }> = {}
    const skills = ['grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing']
    for (const skill of skills) {
      const current = latestSkillSnapshot?.[skill] ?? null
      const start = periodStartSnapshot?.[skill] ?? null
      if (current !== null) {
        skillImprovement[skill] = {
          start: start ?? current,
          current,
          change: start !== null ? current - start : 0,
        }
      }
    }

    // XP info from student_data
    const currentXP = studentData?.xp ?? studentData?.xp_total ?? 0
    const currentStreak = studentData?.streak ?? studentData?.current_streak ?? 0
    const longestStreak = studentData?.longest_streak ?? 0

    // ── Build data payload for Claude ────────────────────────────────
    const dataForClaude = {
      student_name: studentName,
      enrollment_date: studentProfile?.created_at,
      period: `${period} (last ${periodDays} days)`,
      level: studentData?.level ?? studentData?.academic_level ?? 'Unknown',
      package: studentData?.package ?? 'Unknown',
      xp: currentXP,
      streak: currentStreak,
      longest_streak: longestStreak,
      attendance: {
        total_classes: totalClasses,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        rate_percent: attendanceRate,
      },
      assignments: {
        total: totalAssignments,
        graded: gradedAssignments.length,
        avg_grade: avgGrade,
        completion_rate_percent: assignmentCompletionRate,
        submissions: (assignmentSubmissions || []).slice(0, 15).map((s: any) => ({
          status: s.status,
          score: s.score || s.grade,
          date: s.submitted_at,
        })),
      },
      weekly_tasks: {
        total: totalWeeklyTasks,
        completed: completedWeeklyTasks,
        completion_rate_percent: weeklyTaskCompletionRate,
        avg_score: weeklyTaskAvgScore,
        by_type: (weeklyTaskSubmissions || []).reduce((acc: any, t: any) => {
          const type = t.task_type || 'unknown'
          if (!acc[type]) acc[type] = { count: 0, total_score: 0, scored: 0 }
          acc[type].count++
          if (t.score !== null) {
            acc[type].total_score += t.score
            acc[type].scored++
          }
          return acc
        }, {}),
      },
      tests: testResults,
      skill_snapshots: {
        current: latestSkillSnapshot || null,
        improvement: skillImprovement,
      },
      ai_profile: aiStudentProfile ? {
        skills: aiStudentProfile.skills,
        strengths: aiStudentProfile.strengths,
        weaknesses: aiStudentProfile.weaknesses,
      } : null,
      curriculum_progress: curriculumProgress || [],
    }

    // ── Claude API call ──────────────────────────────────────────────
    if (!CLAUDE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = `You are a professional educational report writer at Fluentia Academy, a premium English language academy for Arabic-speaking students. You generate comprehensive, warm, and encouraging student progress reports.

Your reports should be honest but positive — always highlight progress and growth while clearly identifying areas for improvement. Use a professional yet warm tone appropriate for sharing with parents and trainers.

You MUST respond with ONLY valid JSON (no markdown, no code blocks, no extra text) with the following structure:
{
  "executive_summary_ar": "2-3 sentence Arabic summary for parents — warm and clear",
  "executive_summary_en": "2-3 sentence English version of the summary",
  "skill_analysis": {
    "grammar": { "rating": "excellent|good|needs_improvement|weak", "comment_ar": "Arabic comment on this skill" },
    "vocabulary": { "rating": "...", "comment_ar": "..." },
    "reading": { "rating": "...", "comment_ar": "..." },
    "speaking": { "rating": "...", "comment_ar": "..." },
    "listening": { "rating": "...", "comment_ar": "..." },
    "writing": { "rating": "...", "comment_ar": "..." }
  },
  "strengths_ar": ["3-5 specific strengths in Arabic"],
  "areas_for_improvement_ar": ["3-5 specific areas needing work in Arabic"],
  "recommendations_ar": ["3-5 specific, actionable recommendations in Arabic"],
  "recommendations_en": ["3-5 English version of the recommendations"],
  "homework_quality": "Assessment of assignment/homework performance in Arabic — mention completion rate, average grade, consistency",
  "engagement_level": { "level": "high|moderate|low", "explanation_ar": "Arabic explanation of engagement assessment" },
  "next_period_goals": ["2-3 specific goals for the next period in Arabic"],
  "overall_rating": 1-5,
  "parent_message_ar": "A warm, encouraging message for parents in Arabic — acknowledge effort, celebrate achievements, gently note areas for growth, end with motivation"
}

Guidelines:
- Base all assessments on the actual data provided. If data is limited for a metric, acknowledge that.
- Skill ratings: excellent (80+), good (60-79), needs_improvement (40-59), weak (below 40). If no snapshot data, infer from assignment/task performance.
- Overall rating: 5=outstanding, 4=very good, 3=good, 2=needs improvement, 1=concerning
- Write Arabic in natural, professional Saudi Arabic
- Parent message should be personalized, mentioning the student by name
- Recommendations should be specific and actionable, not generic`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Generate a comprehensive progress report for this student.\n\nStudent data:\n${JSON.stringify(dataForClaude, null, 2)}`,
        }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[generate-progress-report] Claude API error:', claudeRes.status, errText)
      return new Response(
        JSON.stringify({ error: 'AI service unavailable — please try again later' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const claudeData = await claudeRes.json()
    const responseText = claudeData.content?.[0]?.text || '{}'
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    let report: any
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      report = JSON.parse(jsonMatch?.[0] || responseText)
    } catch {
      console.error('[generate-progress-report] Failed to parse Claude response:', responseText.slice(0, 500))
      report = { executive_summary_ar: responseText, overall_rating: 3 }
    }

    // Attach raw metrics to report
    report.metrics = {
      attendance_rate: attendanceRate,
      total_classes: totalClasses,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      assignment_completion_rate: assignmentCompletionRate,
      avg_grade: avgGrade,
      total_assignments: totalAssignments,
      weekly_task_completion_rate: weeklyTaskCompletionRate,
      weekly_task_avg_score: weeklyTaskAvgScore,
      total_weekly_tasks: totalWeeklyTasks,
      xp: currentXP,
      streak: currentStreak,
      longest_streak: longestStreak,
      skill_improvement: skillImprovement,
      test_results: testResults,
    }
    report.student_name = studentName
    report.period = period
    report.period_days = periodDays
    report.generated_at = new Date().toISOString()

    // ── Store in progress_reports table ──────────────────────────────
    const { error: insertErr } = await supabase.from('progress_reports').insert({
      student_id,
      trainer_id: user.id,
      period,
      report_data: report,
      generated_at: new Date().toISOString(),
      language,
    })

    if (insertErr) {
      console.error('[generate-progress-report] Failed to save report:', insertErr.message)
      // Non-fatal — still return the report
    }

    // ── Log AI usage ─────────────────────────────────────────────────
    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75
    await supabase.from('ai_usage').insert({
      type: 'progress_report',
      student_id,
      trainer_id: user.id,
      model: 'claude-sonnet-4-6',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      tokens_used: inputTokens + outputTokens,
      estimated_cost_sar: costSAR.toFixed(4),
    })

    // ── Return ───────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[generate-progress-report] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
