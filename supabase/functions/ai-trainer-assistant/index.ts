// Fluentia LMS — AI Trainer Assistant Edge Function
// Helps trainers with tasks: suggest assignments, analyze students, write notes
// Deploy: supabase functions deploy ai-trainer-assistant
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

    // Verify trainer/admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['trainer', 'admin'].includes(profile.role)) {
      throw new Error('Unauthorized')
    }

    const body = await req.json()
    const { message, context } = body

    if (!message?.trim()) throw new Error('Message required')

    // Gather context about trainer's groups
    let contextData = ''
    if (context?.group_id) {
      const { data: group } = await supabase
        .from('groups')
        .select('name, code, level')
        .eq('id', context.group_id)
        .single()

      const { data: students } = await supabase
        .from('students')
        .select('id, xp_total, current_streak, academic_level, profiles(full_name)')
        .eq('group_id', context.group_id)
        .eq('status', 'active')

      contextData = `Group: ${group?.name} (${group?.code}), Level: ${group?.level || 'Unknown'}
Students (${students?.length || 0}):
${(students || []).map((s: any) => `- ${s.profiles?.full_name || 'Unknown'}: XP=${s.xp_total}, Streak=${s.current_streak}d, Level=${s.academic_level}`).join('\n')}`
    }

    if (context?.student_id) {
      const { data: student } = await supabase
        .from('students')
        .select('*, profiles(full_name), groups(name)')
        .eq('id', context.student_id)
        .single()

      const { data: recentSubmissions } = await supabase
        .from('submissions')
        .select('grade, grade_numeric, is_late, assignments(title, type)')
        .eq('student_id', context.student_id)
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false })
        .limit(5)

      contextData += `\nStudent: ${student?.profiles?.full_name || 'Unknown'}
Group: ${student?.groups?.name || 'Unknown'}, Package: ${student?.package}, Level: ${student?.academic_level}
XP: ${student?.xp_total}, Streak: ${student?.current_streak}d
Recent grades: ${(recentSubmissions || []).map((s: any) => `${s.assignments?.type}: ${s.grade || 'ungraded'}${s.is_late ? ' (late)' : ''}`).join(', ')}`
    }

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
        max_tokens: 800,
        system: `You are an AI assistant for English language trainers at Fluentia Academy (أكاديمية طلاقة).
Help trainers with:
- Suggesting assignments appropriate for student levels
- Analyzing student performance and identifying patterns
- Writing encouraging notes or feedback in Arabic
- Summarizing group performance
- Suggesting teaching strategies

Respond in Arabic. Be practical and concise. Focus on actionable insights.
${contextData ? `\nCurrent context:\n${contextData}` : ''}`,
        messages: [{ role: 'user', content: message }],
      }),
    })

    if (!claudeRes.ok) {
      return new Response(
        JSON.stringify({ error: 'المساعد غير متاح حالياً' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    const claudeData = await claudeRes.json()
    const reply = claudeData.content?.[0]?.text || ''
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75
    await supabase.from('ai_usage').insert({
      type: 'trainer_assistant',
      trainer_id: user.id,
      model: 'claude-sonnet',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_sar: costSAR.toFixed(4),
    })

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[ai-trainer-assistant] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
