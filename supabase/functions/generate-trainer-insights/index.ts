// Fluentia LMS — Generate Trainer Group Insights
// Analyzes all students in a group and provides group-level insights
// Deploy: supabase functions deploy generate-trainer-insights --no-verify-jwt --project-ref nmjexpuycmqcxuxljier

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

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['trainer', 'admin'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'يجب أن تكون مدرباً' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let body: { group_id?: string } = {}
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: 'بيانات غير صالحة' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { group_id } = body
    if (!group_id) {
      return new Response(JSON.stringify({ error: 'group_id مطلوب' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get group info
    const { data: group } = await supabase.from('groups').select('name, code, level').eq('id', group_id).single()
    if (!group) {
      return new Response(JSON.stringify({ error: 'المجموعة غير موجودة' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get AI profiles for all students in this group
    const { data: students } = await supabase
      .from('students')
      .select('id, xp_total, current_streak, academic_level, profiles(full_name, display_name)')
      .eq('group_id', group_id)
      .eq('status', 'active')
      .is('deleted_at', null)

    if (!students?.length) {
      return new Response(JSON.stringify({ error: 'لا يوجد طلاب في المجموعة' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const studentIds = students.map((s: any) => s.id)
    const { data: aiProfiles } = await supabase
      .from('ai_student_profiles')
      .select('student_id, skills, strengths, weaknesses')
      .in('student_id', studentIds)

    const studentsData = students.map((s: any) => {
      const aiProfile = aiProfiles?.find((p: any) => p.student_id === s.id)
      return {
        name: s.profiles?.display_name || s.profiles?.full_name || 'طالب',
        xp: s.xp_total,
        streak: s.current_streak,
        skills: aiProfile?.skills || {},
        strengths: aiProfile?.strengths || [],
        weaknesses: aiProfile?.weaknesses || [],
      }
    })

    // Call Claude for group insights
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
          content: `You are an expert English language education analyst at Fluentia Academy.

Analyze this group of students and provide group-level insights. Return ONLY valid JSON:
{
  "group_strengths": ["3-5 group-level strengths in Arabic"],
  "group_weaknesses": ["3-5 group-level areas to improve in Arabic"],
  "needs_attention": [{"name": "student name", "reason": "why they need attention in Arabic"}],
  "pairing_suggestions": [{"pair": ["student1", "student2"], "reason": "why pair them in Arabic"}],
  "lesson_focus": ["3-5 recommended lesson focus areas in Arabic based on group gaps"],
  "summary_ar": "2-3 paragraph Arabic overview of the group dynamics and recommendations"
}

Group: ${group.name} (${group.code}), Level: ${group.level}
Students: ${JSON.stringify(studentsData, null, 2)}

Write in natural Saudi Arabic. Be practical and actionable.`,
        }],
      }),
    })

    if (!claudeRes.ok) {
      return new Response(JSON.stringify({ error: 'خطأ في تحليل المجموعة' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const claudeData = await claudeRes.json()
    const responseText = claudeData.content?.[0]?.text || ''

    let insights: any
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      insights = JSON.parse(jsonMatch?.[0] || responseText)
    } catch {
      return new Response(JSON.stringify({ error: 'خطأ في معالجة النتائج' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Log AI usage
    await supabase.from('ai_usage').insert({
      type: 'trainer_insights',
      tokens_used: claudeData.usage?.input_tokens + claudeData.usage?.output_tokens || 0,
      estimated_cost_sar: ((claudeData.usage?.input_tokens || 0) * 0.003 + (claudeData.usage?.output_tokens || 0) * 0.015) / 1000 * 3.75,
    })

    return new Response(JSON.stringify({
      success: true,
      insights,
      group: group.name,
      student_count: students.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'خطأ داخلي' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
