// Fluentia LMS — AI Chatbot Edge Function (Learning Assistant)
// Students ask English language questions, get helpful explanations
// Deploy: supabase functions deploy ai-chatbot
// Env: CLAUDE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DAILY_LIMITS: Record<string, number> = {
  asas: 10,
  talaqa: 20,
  tamayuz: 999,
  ielts: 20,
}

const LEVEL_CONTEXT: Record<number, string> = {
  1: 'A1 beginner — use very simple Arabic explanations with basic English examples',
  2: 'A2 elementary — use Arabic explanations with more English examples',
  3: 'B1 intermediate — mix Arabic and English in explanations',
  4: 'B2 upper-intermediate — can use more English with some Arabic clarification',
  5: 'C1 advanced — primarily English explanations with Arabic only when needed',
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
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    let body;
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const { message, conversation_history } = body

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'الرسالة فارغة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get student info
    const { data: student } = await supabase
      .from('students')
      .select('id, package, academic_level')
      .eq('id', user.id)
      .single()

    if (!student) throw new Error('Student not found')

    // Check daily limit
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('type', 'chatbot')
      .gte('created_at', todayStart.toISOString())

    const limit = DAILY_LIMITS[student.package] || 10
    if ((count || 0) >= limit) {
      return new Response(
        JSON.stringify({
          error: `وصلت للحد اليومي (${limit} رسالة). حاول بكرة!`,
          limit_reached: true,
          remaining: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // Check budget
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'ai_monthly_budget')
      .single()

    const budgetCap = parseFloat(settings?.value || '50')

    const { data: totalCostData } = await supabase
      .from('ai_usage')
      .select('estimated_cost_sar')
      .gte('created_at', monthStart.toISOString())

    const totalCost = (totalCostData || []).reduce((sum: number, r: any) => sum + (parseFloat(r.estimated_cost_sar) || 0), 0)
    if (totalCost >= budgetCap) {
      return new Response(
        JSON.stringify({ error: 'خدمة المساعد غير متاحة حالياً', budget_reached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    if (!CLAUDE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    const levelCtx = LEVEL_CONTEXT[student.academic_level] || LEVEL_CONTEXT[1]

    // Build messages with history
    const messages = []
    if (conversation_history?.length) {
      for (const msg of conversation_history.slice(-6)) {
        messages.push({ role: msg.role, content: msg.content })
      }
    }
    messages.push({ role: 'user', content: message })

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: `You are a friendly English language learning assistant for Arab students at ${levelCtx}.
Your role:
- Answer questions about English grammar, vocabulary, pronunciation, and usage
- Give clear examples and explanations
- Be encouraging and patient
- Respond in Arabic by default, with English examples
- Keep responses concise (2-4 paragraphs max)
- If asked non-English-learning questions, politely redirect to English learning
- NEVER do homework for the student — help them understand concepts`,
        messages,
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
      type: 'chatbot',
      student_id: user.id,
      model: 'claude-sonnet',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_sar: costSAR.toFixed(4),
    })

    const remaining = limit - (count || 0) - 1

    return new Response(
      JSON.stringify({ reply, remaining }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[ai-chatbot] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
