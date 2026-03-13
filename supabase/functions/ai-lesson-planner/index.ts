// Fluentia LMS — AI Lesson Planner
// Generates lesson plans based on group level, recent performance, and curriculum
// POST { group_id, topic?, duration_minutes?, focus_skills? }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Auth validation
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Verify trainer/admin role
    const { data: userProfile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (!userProfile || !['trainer', 'admin'].includes(userProfile.role)) {
      return new Response(JSON.stringify({ error: 'Unauthorized — trainer/admin only' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    if (!CLAUDE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503,
      })
    }

    const { group_id, topic, duration_minutes, focus_skills } = await req.json()

    if (!group_id) {
      return new Response(JSON.stringify({ error: 'group_id required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Get group info
    const { data: group } = await supabase
      .from('groups')
      .select('name, code, level, schedule')
      .eq('id', group_id)
      .single()

    // Get students in group with skill data
    const { data: students } = await supabase
      .from('students')
      .select('id, academic_level, profiles(full_name)')
      .eq('group_id', group_id)
      .eq('status', 'active')

    // Get recent skill snapshots for the group
    const studentIds = students?.map(s => s.id) || []
    const { data: snapshots } = await supabase
      .from('skill_snapshots')
      .select('student_id, grammar, vocabulary, speaking, listening, reading, writing')
      .in('student_id', studentIds)
      .order('snapshot_date', { ascending: false })
      .limit(studentIds.length)

    // Average skills
    const skillAvg: Record<string, number> = { grammar: 0, vocabulary: 0, speaking: 0, listening: 0, reading: 0, writing: 0 }
    if (snapshots?.length) {
      for (const snap of snapshots) {
        for (const skill of Object.keys(skillAvg)) {
          skillAvg[skill] += (snap[skill] || 0)
        }
      }
      for (const skill of Object.keys(skillAvg)) {
        skillAvg[skill] = Math.round(skillAvg[skill] / snapshots.length)
      }
    }

    // Get recent assignments to avoid repetition
    const { data: recentAssignments } = await supabase
      .from('assignments')
      .select('title, type, topic')
      .eq('group_id', group_id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get common error patterns
    const { data: errorPatterns } = await supabase
      .from('error_patterns')
      .select('pattern_type, description, skill, frequency')
      .in('student_id', studentIds)
      .eq('resolved', false)
      .order('frequency', { ascending: false })
      .limit(10)

    const avgLevel = students?.length
      ? Math.round(students.reduce((a, s) => a + (s.academic_level || 1), 0) / students.length)
      : 2

    const levelMap: Record<number, string> = {
      1: 'A1 Beginner', 2: 'A2 Elementary', 3: 'B1 Intermediate',
      4: 'B2 Upper-Intermediate', 5: 'C1 Advanced', 6: 'C2 Proficiency',
    }

    const systemPrompt = `You are an expert English language lesson planner for Arabic-speaking students.
Create a detailed, practical lesson plan that a trainer can follow step by step.

Return ONLY valid JSON (no markdown):
{
  "title": "عنوان الدرس بالعربي",
  "objectives": ["هدف 1", "هدف 2"],
  "duration": "60 minutes",
  "materials": ["مادة 1"],
  "warm_up": {
    "duration": "10 min",
    "activity": "وصف النشاط",
    "instructions": "تعليمات مفصلة"
  },
  "main_activities": [
    {
      "title": "عنوان النشاط",
      "duration": "15 min",
      "type": "grammar|speaking|reading|writing|vocabulary|listening",
      "instructions": "تعليمات مفصلة خطوة بخطوة",
      "resources": "المصادر المطلوبة"
    }
  ],
  "practice": {
    "duration": "15 min",
    "activity": "نشاط التطبيق",
    "instructions": "تعليمات"
  },
  "wrap_up": {
    "duration": "5 min",
    "activity": "الختام والمراجعة"
  },
  "homework_suggestion": "اقتراح واجب منزلي",
  "differentiation": "ملاحظات لمراعاة الفروق الفردية",
  "assessment_ideas": ["فكرة تقييم 1"]
}`

    const userPrompt = `Group: ${group?.name || 'Unknown'} (${group?.code || ''})
Level: ${levelMap[avgLevel] || 'A2'}
Students: ${students?.length || 0}
Duration: ${duration_minutes || 60} minutes
${topic ? `Requested topic: ${topic}` : ''}
${focus_skills ? `Focus skills: ${focus_skills}` : ''}

Average skill levels:
${Object.entries(skillAvg).map(([k, v]) => `- ${k}: ${v}%`).join('\n')}

Common error patterns:
${errorPatterns?.map(p => `- [${p.skill}] ${p.description} (freq: ${p.frequency})`).join('\n') || 'None'}

Recent assignments (avoid repetition):
${recentAssignments?.map(a => `- ${a.title} (${a.type})`).join('\n') || 'None'}

Create a comprehensive, engaging lesson plan.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[ai-lesson-planner] Claude API error:', res.status, errText)
      throw new Error(`Claude API failed: ${res.status}`)
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || '{}'
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let plan
    try {
      plan = JSON.parse(cleaned)
    } catch {
      plan = { title: 'خطة درس', raw: cleaned }
    }

    return new Response(JSON.stringify({ plan, group: group?.name }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('[ai-lesson-planner]', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
