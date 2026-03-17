// Fluentia LMS — Generate AI Student Profile
// Gathers ALL student data, sends to Claude for comprehensive analysis, upserts ai_student_profiles + skill_snapshots
// POST { student_id } — admin/trainer only
// Deploy: supabase functions deploy generate-ai-student-profile --no-verify-jwt --project-ref nmjexpuycmqcxuxljier

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // --- Auth check ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'غير مصرح — التوكن مطلوب' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    if (authError || !user) {
      return jsonResponse({ error: 'غير مصرح' }, 401)
    }

    // Check role (trainer or admin only)
    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!callerProfile || !['trainer', 'admin'].includes(callerProfile.role)) {
      return jsonResponse({ error: 'يجب أن تكون مدرباً أو مشرفاً' }, 403)
    }

    // --- Parse body ---
    let body: { student_id?: string } = {}
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'بيانات غير صالحة' }, 400)
    }

    const { student_id } = body
    if (!student_id) {
      return jsonResponse({ error: 'student_id مطلوب' }, 400)
    }

    // --- Gather ALL student data in parallel ---
    const [
      { data: student },
      { data: studentProfile },
      { data: submissions },
      { data: testSessions },
      { data: testResponses },
      { data: weeklyTasks },
      { data: attendance },
      { data: skillSnapshots },
      { data: aiUsageRecords },
      { data: curriculumProgress },
      { data: xpLog },
      { data: quizAttempts },
      { data: errorPatterns },
    ] = await Promise.all([
      // 1. Student core data (XP, streak, level)
      supabase
        .from('students')
        .select('*, groups(name, code, level, trainer_id)')
        .eq('id', student_id)
        .single(),

      // 2. Profile info
      supabase
        .from('profiles')
        .select('full_name, display_name, created_at, last_sign_in_at')
        .eq('id', student_id)
        .single(),

      // 3. All assignment submissions (grades, on-time ratio)
      supabase
        .from('submissions')
        .select('grade, grade_numeric, is_late, points_awarded, status, submitted_at, assignments(type, title, due_date)')
        .eq('student_id', student_id)
        .eq('status', 'graded')
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false })
        .limit(100),

      // 4. All test sessions (adaptive test performance)
      supabase
        .from('test_sessions')
        .select('id, test_type, score, total_questions, difficulty_level, completed_at, status, created_at')
        .eq('student_id', student_id)
        .order('created_at', { ascending: false })
        .limit(50),

      // 5. Test responses (detailed performance per question)
      supabase
        .from('test_responses')
        .select('is_correct, skill_area, difficulty, time_spent_seconds, session_id')
        .eq('student_id', student_id)
        .order('created_at', { ascending: false })
        .limit(200),

      // 6. Weekly task submissions (completion, quality)
      supabase
        .from('weekly_task_submissions')
        .select('task_type, status, auto_score, trainer_score, feedback, submitted_at, created_at')
        .eq('student_id', student_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100),

      // 7. Attendance records
      supabase
        .from('attendance')
        .select('status, date, created_at')
        .eq('student_id', student_id)
        .order('created_at', { ascending: false })
        .limit(60),

      // 8. Skill snapshots (progression over time)
      supabase
        .from('skill_snapshots')
        .select('grammar, vocabulary, speaking, listening, reading, writing, snapshot_date')
        .eq('student_id', student_id)
        .order('snapshot_date', { ascending: false })
        .limit(12),

      // 9. AI usage (chatbot interactions count)
      supabase
        .from('ai_usage')
        .select('type, tokens_used, created_at')
        .eq('student_id', student_id)
        .order('created_at', { ascending: false })
        .limit(100),

      // 10. Student curriculum progress
      supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', student_id)
        .order('updated_at', { ascending: false })
        .limit(50),

      // 11. XP transactions
      supabase
        .from('xp_transactions')
        .select('amount, reason, created_at')
        .eq('student_id', student_id)
        .order('created_at', { ascending: false })
        .limit(100),

      // 12. Quiz attempts
      supabase
        .from('quiz_attempts')
        .select('score, total_questions, quiz_type, created_at')
        .eq('student_id', student_id)
        .order('created_at', { ascending: false })
        .limit(20),

      // 13. Error patterns
      supabase
        .from('error_patterns')
        .select('pattern_type, frequency, examples')
        .eq('student_id', student_id)
        .limit(30),
    ])

    if (!student) {
      return jsonResponse({ error: 'الطالب غير موجود' }, 404)
    }

    const studentName = studentProfile?.display_name || studentProfile?.full_name || 'طالب'

    // --- Build comprehensive data summary ---
    const totalSubmissions = submissions?.length || 0
    const gradedScores = submissions?.filter((s: any) => s.grade_numeric != null) || []
    const lateSubmissions = submissions?.filter((s: any) => s.is_late) || []

    // Submission breakdown by assignment type
    const submissionsByType: Record<string, { count: number; avgGrade: number; lateCount: number }> = {}
    for (const sub of submissions || []) {
      const type = sub.assignments?.type || 'unknown'
      if (!submissionsByType[type]) submissionsByType[type] = { count: 0, avgGrade: 0, lateCount: 0 }
      submissionsByType[type].count++
      submissionsByType[type].avgGrade += sub.grade_numeric || 0
      if (sub.is_late) submissionsByType[type].lateCount++
    }
    for (const type of Object.keys(submissionsByType)) {
      submissionsByType[type].avgGrade = Math.round(submissionsByType[type].avgGrade / submissionsByType[type].count)
    }

    // Test performance analysis
    const completedTests = testSessions?.filter((t: any) => t.status === 'completed') || []
    const testPerformance = completedTests.map((t: any) => ({
      type: t.test_type,
      score: t.score,
      total: t.total_questions,
      percentage: t.total_questions ? Math.round((t.score / t.total_questions) * 100) : 0,
      difficulty: t.difficulty_level,
      date: t.completed_at,
    }))

    // Test response accuracy by skill area
    const responsesBySkill: Record<string, { correct: number; total: number; avgTime: number }> = {}
    for (const resp of testResponses || []) {
      const skill = resp.skill_area || 'general'
      if (!responsesBySkill[skill]) responsesBySkill[skill] = { correct: 0, total: 0, avgTime: 0 }
      responsesBySkill[skill].total++
      if (resp.is_correct) responsesBySkill[skill].correct++
      responsesBySkill[skill].avgTime += resp.time_spent_seconds || 0
    }
    for (const skill of Object.keys(responsesBySkill)) {
      responsesBySkill[skill].avgTime = Math.round(responsesBySkill[skill].avgTime / responsesBySkill[skill].total)
    }

    // Weekly tasks analysis
    const completedWeeklyTasks = weeklyTasks?.filter((t: any) => t.status === 'completed' || t.status === 'graded') || []
    const weeklyTasksByType: Record<string, { count: number; avgScore: number }> = {}
    for (const task of weeklyTasks || []) {
      const type = task.task_type || 'unknown'
      if (!weeklyTasksByType[type]) weeklyTasksByType[type] = { count: 0, avgScore: 0 }
      weeklyTasksByType[type].count++
      weeklyTasksByType[type].avgScore += task.auto_score || task.trainer_score || 0
    }
    for (const type of Object.keys(weeklyTasksByType)) {
      weeklyTasksByType[type].avgScore = Math.round(weeklyTasksByType[type].avgScore / weeklyTasksByType[type].count)
    }

    // Attendance analysis
    const totalAttendance = attendance?.length || 0
    const presentCount = attendance?.filter((a: any) => a.status === 'present').length || 0
    const absentCount = attendance?.filter((a: any) => a.status === 'absent').length || 0
    const lateCount = attendance?.filter((a: any) => a.status === 'late').length || 0

    // Skill progression (last 12 snapshots)
    const skillProgression = (skillSnapshots || []).map((s: any) => ({
      date: s.snapshot_date,
      grammar: s.grammar,
      vocabulary: s.vocabulary,
      speaking: s.speaking,
      listening: s.listening,
      reading: s.reading,
      writing: s.writing,
    }))

    // AI chatbot usage
    const chatbotInteractions = aiUsageRecords?.filter((a: any) => a.type === 'chatbot' || a.type === 'ai_chatbot') || []

    // XP breakdown
    const xpBreakdown: Record<string, number> = {}
    for (const x of xpLog || []) {
      xpBreakdown[x.reason] = (xpBreakdown[x.reason] || 0) + x.amount
    }

    // Days since enrollment
    const enrolledDate = studentProfile?.created_at ? new Date(studentProfile.created_at) : null
    const daysSinceEnrollment = enrolledDate ? Math.floor((Date.now() - enrolledDate.getTime()) / (1000 * 60 * 60 * 24)) : null

    // Days since last activity
    const lastSignIn = studentProfile?.last_sign_in_at ? new Date(studentProfile.last_sign_in_at) : null
    const daysSinceLastActive = lastSignIn ? Math.floor((Date.now() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)) : null

    const dataSummary = {
      // Student identity & core data
      name: studentName,
      level: student.academic_level,
      package: student.package,
      group: student.groups?.name,
      group_level: student.groups?.level,
      xp_total: student.xp_total,
      current_streak: student.current_streak,
      longest_streak: student.longest_streak,
      status: student.status,
      days_since_enrollment: daysSinceEnrollment,
      days_since_last_active: daysSinceLastActive,

      // Assignment submissions
      submissions_total: totalSubmissions,
      submissions_avg_grade: gradedScores.length
        ? Math.round(gradedScores.reduce((s: number, g: any) => s + (g.grade_numeric || 0), 0) / gradedScores.length)
        : null,
      submissions_late_count: lateSubmissions.length,
      submissions_on_time_ratio: totalSubmissions
        ? Math.round(((totalSubmissions - lateSubmissions.length) / totalSubmissions) * 100)
        : null,
      submissions_by_type: submissionsByType,

      // Adaptive test performance
      test_sessions_count: testSessions?.length || 0,
      test_sessions_completed: completedTests.length,
      test_performance: testPerformance,
      test_accuracy_by_skill: responsesBySkill,

      // Weekly task submissions
      weekly_tasks_total: weeklyTasks?.length || 0,
      weekly_tasks_completed: completedWeeklyTasks.length,
      weekly_tasks_completion_rate: weeklyTasks?.length
        ? Math.round((completedWeeklyTasks.length / weeklyTasks.length) * 100)
        : null,
      weekly_tasks_by_type: weeklyTasksByType,
      weekly_avg_score: completedWeeklyTasks.length
        ? Math.round(
            completedWeeklyTasks
              .filter((t: any) => t.auto_score || t.trainer_score)
              .reduce((s: number, t: any) => s + (t.trainer_score || t.auto_score || 0), 0) /
              (completedWeeklyTasks.filter((t: any) => t.auto_score || t.trainer_score).length || 1)
          )
        : null,

      // Attendance
      attendance_total_sessions: totalAttendance,
      attendance_present: presentCount,
      attendance_absent: absentCount,
      attendance_late: lateCount,
      attendance_rate: totalAttendance ? Math.round((presentCount / totalAttendance) * 100) : null,

      // Skill progression
      skill_snapshots_count: skillSnapshots?.length || 0,
      skill_progression: skillProgression,
      latest_skills: skillProgression.length > 0 ? skillProgression[0] : null,

      // AI chatbot usage
      ai_chatbot_interactions: chatbotInteractions.length,
      ai_total_interactions: aiUsageRecords?.length || 0,

      // Curriculum progress
      curriculum_progress: curriculumProgress || [],

      // XP breakdown
      xp_breakdown: xpBreakdown,

      // Quiz performance
      quiz_attempts_count: quizAttempts?.length || 0,
      quiz_avg_score: quizAttempts?.length
        ? Math.round(
            quizAttempts.reduce((s: number, q: any) => s + ((q.score / q.total_questions) * 100), 0) /
              quizAttempts.length
          )
        : null,

      // Error patterns
      error_patterns: (errorPatterns || []).map((e: any) => ({
        type: e.pattern_type,
        frequency: e.frequency,
        examples: e.examples,
      })),
    }

    // --- Call Claude for comprehensive analysis ---
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
        system: `You are an expert English language education analyst at Fluentia Academy, a premium English school in Saudi Arabia for Arabic-speaking adults. You analyze student data comprehensively and generate detailed AI profiles. Always respond with valid JSON only — no markdown, no explanation, no wrapping.`,
        messages: [
          {
            role: 'user',
            content: `Analyze this student's complete learning data and generate a comprehensive AI profile.

Return ONLY valid JSON with EXACTLY this structure:
{
  "learning_style": "visual" | "auditory" | "kinesthetic" | "reading_writing",
  "personality_summary_ar": "وصف شخصية التعلم بالعربي — فقرتين على الأقل",
  "strengths": [
    { "skill": "اسم المهارة", "evidence": "الدليل من البيانات" }
  ],
  "weaknesses": [
    { "skill": "اسم المهارة", "evidence": "الدليل من البيانات" }
  ],
  "risk_level": "low" | "medium" | "high",
  "risk_factors": ["عامل الخطر 1", "عامل الخطر 2"],
  "recommended_approach_ar": "توصيات للمدرب بالعربي — كيف يتعامل مع هذا الطالب",
  "pace": "slow" | "normal" | "fast",
  "engagement_pattern": "وصف نمط تفاعل الطالب — متى وكيف يتفاعل",
  "predicted_level_completion": "عدد الأسابيع المتوقعة لإكمال المستوى الحالي (رقم أو نطاق)",
  "custom_tips_ar": ["نصيحة شخصية 1", "نصيحة شخصية 2", "..."],
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
  "summary_ar": "ملخص شامل بالعربي — 2-3 فقرات",
  "summary_en": "1 paragraph English summary for trainer reference"
}

Rules:
- Base skill scores on actual data. If data is limited, use 50 (neutral).
- "strengths" and "weaknesses" must include evidence from the data (grades, attendance, test scores, etc.).
- "risk_level" should reflect dropout risk based on attendance, streak, submission rates, and activity recency.
- "risk_factors" should be empty array [] if risk_level is "low".
- "predicted_level_completion" should be a realistic estimate like "6-8 أسابيع" based on current pace.
- "custom_tips_ar" should be 5-7 personalized, actionable tips in Saudi Arabic.
- "engagement_pattern" should describe WHEN (morning/evening, weekdays/weekends) and HOW (assignments focus, chatbot heavy, etc.).
- Write all Arabic content in natural Saudi Arabic. Be encouraging but honest.

Student data:
${JSON.stringify(dataSummary, null, 2)}`,
          },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[generate-ai-student-profile] Claude API error:', claudeRes.status, errText)
      return jsonResponse({ error: 'خطأ في تحليل البيانات — حاول مرة أخرى' }, 500)
    }

    const claudeData = await claudeRes.json()
    const responseText = claudeData.content?.[0]?.text || ''

    let analysis: any
    try {
      // Extract JSON from response (handle potential markdown wrapping)
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      analysis = JSON.parse(jsonMatch?.[0] || cleaned)
    } catch (parseErr) {
      console.error('[generate-ai-student-profile] JSON parse error:', parseErr, 'Raw:', responseText.substring(0, 500))
      return jsonResponse({ error: 'خطأ في معالجة النتائج — حاول مرة أخرى' }, 500)
    }

    // --- Upsert into ai_student_profiles ---
    const { error: upsertErr } = await supabase.from('ai_student_profiles').upsert(
      {
        student_id,
        // New comprehensive fields
        learning_style: analysis.learning_style || null,
        personality_summary_ar: analysis.personality_summary_ar || '',
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        risk_level: analysis.risk_level || 'low',
        risk_factors: analysis.risk_factors || [],
        recommended_approach_ar: analysis.recommended_approach_ar || '',
        pace: analysis.pace || 'normal',
        engagement_pattern: analysis.engagement_pattern || '',
        predicted_level_completion: analysis.predicted_level_completion || '',
        custom_tips_ar: analysis.custom_tips_ar || [],
        // Existing fields
        skills: analysis.skills || {},
        tips: analysis.custom_tips_ar || [],
        summary_ar: analysis.summary_ar || '',
        summary_en: analysis.summary_en || '',
        raw_analysis: analysis,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id' }
    )

    if (upsertErr) {
      console.error('[generate-ai-student-profile] Upsert error:', upsertErr)
      return jsonResponse({ error: 'خطأ في حفظ الملف الشخصي' }, 500)
    }

    // --- Create skill_snapshots entry with current skill levels ---
    if (analysis.skills) {
      const today = new Date().toISOString().split('T')[0]
      const { error: snapshotErr } = await supabase.from('skill_snapshots').insert({
        student_id,
        grammar: analysis.skills.grammar ?? 50,
        vocabulary: analysis.skills.vocabulary ?? 50,
        speaking: analysis.skills.speaking ?? 50,
        listening: analysis.skills.listening ?? 50,
        reading: analysis.skills.reading ?? 50,
        writing: analysis.skills.writing ?? 50,
        snapshot_date: today,
      })

      if (snapshotErr) {
        // Non-fatal — log but continue (might be duplicate for today)
        console.warn('[generate-ai-student-profile] Skill snapshot insert warning:', snapshotErr.message)
      }
    }

    // --- Log AI usage ---
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0
    await supabase.from('ai_usage').insert({
      type: 'ai_student_profile',
      student_id,
      tokens_used: inputTokens + outputTokens,
      estimated_cost_sar: ((inputTokens * 0.003 + outputTokens * 0.015) / 1000) * 3.75,
    })

    return jsonResponse({
      success: true,
      profile: analysis,
      message: `تم تحليل ملف ${studentName} بنجاح`,
    })
  } catch (err: any) {
    console.error('[generate-ai-student-profile] Fatal error:', err.message)
    return jsonResponse({ error: 'خطأ داخلي في الخادم' }, 500)
  }
})
