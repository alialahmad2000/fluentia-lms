// Fluentia LMS — Trainer Weekly Report (AI-Generated)
// Generates an AI-powered weekly summary of student performance
// Deploy: supabase functions deploy trainer-weekly-report --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      })
    }

    const { trainer_id } = await req.json()
    if (!trainer_id) {
      return new Response(JSON.stringify({ error: 'trainer_id required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    // Get trainer's groups
    const { data: groups } = await supabase
      .from('groups')
      .select('id, name')
      .eq('trainer_id', trainer_id)
      .eq('is_active', true)

    const groupIds = groups?.map(g => g.id) || []
    if (groupIds.length === 0) {
      return new Response(JSON.stringify({ report: null, error: 'No groups found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get students (students.group_id, no group_members table)
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, xp_total, current_streak, group_id, profiles!inner(full_name, display_name, last_active_at)')
      .in('group_id', groupIds)
      .eq('status', 'active')
      .is('deleted_at', null)

    const students = studentsData || []
    const studentIds = students.map(s => s.id)
    if (studentIds.length === 0) {
      return new Response(JSON.stringify({ report: null, error: 'No students found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get last 7 days of data
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // XP transactions
    const { data: xpData } = await supabase
      .from('xp_transactions')
      .select('student_id, amount')
      .in('student_id', studentIds)
      .gte('created_at', oneWeekAgo)

    // Submissions (writing)
    const { data: submissions } = await supabase
      .from('submissions')
      .select('student_id, status, grade_numeric, ai_feedback, created_at')
      .in('student_id', studentIds)
      .gte('created_at', oneWeekAgo)
      .limit(50)

    // Speaking recordings
    const { data: recordings } = await supabase
      .from('speaking_recordings')
      .select('student_id, ai_evaluation, created_at')
      .in('student_id', studentIds)
      .gte('created_at', oneWeekAgo)
      .limit(50)

    // Aggregate per student
    const studentStats = students.map(s => {
      const name = s.profiles?.display_name || s.profiles?.full_name || '—'
      const weekXP = (xpData || []).filter(x => x.student_id === s.id).reduce((sum, x) => sum + (x.amount || 0), 0)
      const stuSubs = (submissions || []).filter(sub => sub.student_id === s.id)
      const stuRecs = (recordings || []).filter(rec => rec.student_id === s.id)
      const scores: number[] = []
      stuSubs.forEach(sub => { if (sub.grade_numeric) scores.push(sub.grade_numeric) })
      const lastActive = s.profiles?.last_active_at

      return {
        name,
        xp_total: s.xp_total || 0,
        week_xp: weekXP,
        streak: s.current_streak || 0,
        writing_count: stuSubs.length,
        speaking_count: stuRecs.length,
        avg_score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        last_active: lastActive,
        pending_count: stuSubs.filter(sub => sub.status === 'submitted').length,
      }
    })

    // Get AI feedback excerpts for common error analysis
    const feedbackSamples = [
      ...(submissions || []).slice(0, 15).map(s => {
        if (typeof s.ai_feedback === 'object' && s.ai_feedback) return JSON.stringify(s.ai_feedback).slice(0, 300)
        return null
      }),
      ...(recordings || []).slice(0, 10).map(r => {
        if (typeof r.ai_evaluation === 'object' && r.ai_evaluation) return JSON.stringify(r.ai_evaluation).slice(0, 300)
        return null
      }),
    ].filter(Boolean)

    // Call Claude
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')
    if (!CLAUDE_API_KEY) {
      return new Response(JSON.stringify({ error: 'CLAUDE_API_KEY not set' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      })
    }

    const prompt = `أنت مساعد ذكي لمدرب لغة إنجليزية. اكتب تقرير أسبوعي مختصر بالعربي عن أداء الطلاب.

بيانات الطلاب هذا الأسبوع:
${JSON.stringify(studentStats, null, 2)}

عينة من تقييمات AI (كتابة + تحدث):
${feedbackSamples.slice(0, 10).join('\n')}

أجب بـ JSON فقط بالشكل التالي (لا تضف أي شيء خارج JSON):
{
  "summary": "ملخص عام ٢-٣ جمل بالعربي عن أداء المجموعة",
  "stars": [{"name": "اسم الطالب", "detail": "سبب التميز"}],
  "needs_attention": [{"name": "اسم الطالب", "reason": "السبب"}],
  "common_errors": [{"error": "وصف الخطأ", "student_count": 0}],
  "recommendations": ["توصية ١", "توصية ٢", "توصية ٣"]
}`

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const aiData = await aiResponse.json()
    const text = aiData.content?.[0]?.text || '{}'
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    let report = {}
    try {
      report = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
    } catch {
      report = { summary: text, stars: [], needs_attention: [], common_errors: [], recommendations: [] }
    }

    return new Response(JSON.stringify({ report, stats: studentStats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Weekly report error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
