// Fluentia LMS — Churn Prediction
// Analyzes student engagement signals and predicts dropout risk
// POST { student_id? } — specific student or all active students

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    console.error('[predict-churn] Claude API error:', res.status, errText)
    throw new Error(`Claude API failed: ${res.status}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text || ''
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

    const { student_id } = await req.json().catch(() => ({}))

    // Get students to analyze
    let studentsQuery = supabase
      .from('students')
      .select('id, group_id, academic_level, xp_total, current_streak, package, created_at, status')
      .eq('status', 'active')
      .is('deleted_at', null)

    if (student_id) {
      studentsQuery = studentsQuery.eq('id', student_id)
    }

    const { data: students } = await studentsQuery

    if (!students?.length) {
      return new Response(JSON.stringify({ message: 'No students to analyze', predictions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const predictions: any[] = []

    for (const student of students) {
      try {
        // Gather engagement signals
        const [
          { count: recentSubmissions },
          { count: totalAssignments },
          { data: attendance },
          { data: recentPayments },
          { data: profile },
          { count: missedDeadlines },
          { data: lastLogin },
        ] = await Promise.all([
          supabase.from('submissions').select('id', { count: 'exact', head: true })
            .eq('student_id', student.id).gte('submitted_at', twoWeeksAgo),
          supabase.from('assignments').select('id', { count: 'exact', head: true })
            .eq('group_id', student.group_id).is('deleted_at', null)
            .gte('created_at', oneMonthAgo),
          supabase.from('attendance').select('status')
            .eq('student_id', student.id).gte('created_at', oneMonthAgo),
          supabase.from('payments').select('status, amount')
            .eq('student_id', student.id).order('created_at', { ascending: false }).limit(3),
          supabase.from('profiles').select('full_name, display_name, last_sign_in_at')
            .eq('id', student.id).single(),
          supabase.from('submissions').select('id', { count: 'exact', head: true })
            .eq('student_id', student.id).eq('is_late', true).gte('submitted_at', oneMonthAgo),
          supabase.from('profiles').select('last_sign_in_at')
            .eq('id', student.id).single(),
        ])

        // Calculate factors
        const factors: any[] = []
        let riskScore = 0

        // 1. Submission rate
        const submissionRate = totalAssignments ? (recentSubmissions || 0) / (totalAssignments || 1) : 1
        if (submissionRate < 0.3) {
          factors.push({ factor: 'low_submissions', weight: 30, description: 'نسبة تسليم الواجبات منخفضة جداً' })
          riskScore += 30
        } else if (submissionRate < 0.6) {
          factors.push({ factor: 'moderate_submissions', weight: 15, description: 'نسبة تسليم الواجبات متوسطة' })
          riskScore += 15
        }

        // 2. Attendance
        const totalAttendance = attendance?.length || 0
        const presentCount = attendance?.filter((a: any) => a.status === 'present').length || 0
        const attendanceRate = totalAttendance ? presentCount / totalAttendance : 1
        if (attendanceRate < 0.4) {
          factors.push({ factor: 'poor_attendance', weight: 25, description: 'نسبة الحضور ضعيفة' })
          riskScore += 25
        } else if (attendanceRate < 0.7) {
          factors.push({ factor: 'declining_attendance', weight: 12, description: 'نسبة الحضور في تراجع' })
          riskScore += 12
        }

        // 3. Streak
        if (student.current_streak === 0) {
          factors.push({ factor: 'no_streak', weight: 10, description: 'لا يوجد سلسلة نشاط' })
          riskScore += 10
        }

        // 4. Payment status
        const hasOverdue = recentPayments?.some((p: any) => p.status === 'overdue')
        if (hasOverdue) {
          factors.push({ factor: 'overdue_payment', weight: 20, description: 'مدفوعات متأخرة' })
          riskScore += 20
        }

        // 5. Last login recency
        const lastSignIn = lastLogin?.last_sign_in_at
        if (lastSignIn) {
          const daysSinceLogin = (Date.now() - new Date(lastSignIn).getTime()) / (1000 * 60 * 60 * 24)
          if (daysSinceLogin > 14) {
            factors.push({ factor: 'inactive', weight: 25, description: `آخر تسجيل دخول قبل ${Math.round(daysSinceLogin)} يوم` })
            riskScore += 25
          } else if (daysSinceLogin > 7) {
            factors.push({ factor: 'declining_activity', weight: 10, description: `آخر تسجيل دخول قبل ${Math.round(daysSinceLogin)} يوم` })
            riskScore += 10
          }
        }

        // 6. Missed deadlines
        if ((missedDeadlines || 0) > 3) {
          factors.push({ factor: 'missed_deadlines', weight: 15, description: `${missedDeadlines} واجبات متأخرة الشهر الماضي` })
          riskScore += 15
        }

        // Cap at 100
        riskScore = Math.min(100, riskScore)

        // Determine risk level
        let riskLevel = 'low'
        if (riskScore >= 75) riskLevel = 'critical'
        else if (riskScore >= 50) riskLevel = 'high'
        else if (riskScore >= 25) riskLevel = 'medium'

        // Generate recommendations with AI for high-risk students
        let recommendations: any[] = []
        if (riskScore >= 40) {
          const studentName = profile?.display_name || profile?.full_name || 'الطالب'
          const aiResult = await callClaude(
            `You are a student retention specialist for an English language learning academy with Arabic-speaking students. Generate specific, actionable recommendations to retain at-risk students. Return ONLY a JSON array (no markdown): [{"action": "action_name", "description": "وصف بالعربي", "priority": "high|medium|low"}]`,
            `Student: ${studentName}\nRisk Score: ${riskScore}/100\nRisk Level: ${riskLevel}\nFactors:\n${factors.map(f => `- ${f.description} (weight: ${f.weight})`).join('\n')}\n\nProvide 3-5 specific recommendations in Arabic.`
          )
          try {
            const cleaned = aiResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            recommendations = JSON.parse(cleaned)
          } catch { /* use empty */ }
        }

        // Save prediction
        const { data: prediction } = await supabase.from('churn_predictions').insert({
          student_id: student.id,
          risk_score: riskScore,
          risk_level: riskLevel,
          factors,
          recommendations,
        }).select().single()

        if (prediction) predictions.push(prediction)

        // Alert trainer for critical risk
        if (riskLevel === 'critical' || riskLevel === 'high') {
          const { data: group } = await supabase
            .from('groups').select('trainer_id').eq('id', student.group_id).single()

          if (group?.trainer_id) {
            const studentName = profile?.display_name || profile?.full_name || 'طالب'
            await supabase.from('notifications').insert({
              user_id: group.trainer_id,
              type: 'system',
              title: `⚠️ خطر انسحاب: ${studentName}`,
              body: `نسبة خطر الانسحاب ${riskScore}% — ${factors.map(f => f.description).join('، ')}`,
              data: { type: 'churn_alert', student_id: student.id, risk_score: riskScore },
            })
          }
        }
      } catch (err: any) {
        console.error(`[predict-churn] Error for ${student.id}:`, err.message)
      }
    }

    return new Response(
      JSON.stringify({
        message: `Analyzed ${predictions.length} students`,
        predictions: predictions.map(p => ({
          student_id: p.student_id,
          risk_score: p.risk_score,
          risk_level: p.risk_level,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[predict-churn]', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
