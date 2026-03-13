// Fluentia LMS — AI Student Chatbot (English Conversation Practice)
// Deploy: supabase functions deploy ai-student-chatbot --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CEFR_MAP: Record<number, string> = {
  1: 'A1 (Beginner)',
  2: 'A2 (Elementary)',
  3: 'B1 (Intermediate)',
  4: 'B2 (Upper-Intermediate)',
  5: 'C1 (Advanced)',
}

const DAILY_MESSAGE_LIMIT = 20

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Auth
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

    // Get student profile and level
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'student') {
      return new Response(
        JSON.stringify({ error: 'هذه الخدمة متاحة للطلاب فقط' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const { data: student } = await supabase
      .from('students')
      .select('id, level')
      .eq('id', user.id)
      .single()

    const studentId = student?.id || user.id
    const studentLevel = student?.level || 1

    // Check Claude API key
    if (!CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY is empty!')
      return new Response(
        JSON.stringify({ error: 'خدمة الذكاء الاصطناعي غير مفعّلة — مفتاح API غير موجود' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { message, history } = body as {
      message: string
      history?: Array<{ role: string; content: string }>
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'الرجاء إدخال رسالة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'الرسالة طويلة جداً — الحد الأقصى 2000 حرف' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Rate limit: count today's messages for this student
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count: todayCount, error: countErr } = await supabase
      .from('ai_chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('role', 'user')
      .gte('created_at', todayStart.toISOString())

    if (countErr) {
      console.error('Rate limit check error:', countErr)
    }

    if ((todayCount ?? 0) >= DAILY_MESSAGE_LIMIT) {
      return new Response(
        JSON.stringify({
          error: 'لقد وصلت إلى الحد الأقصى من الرسائل اليومية (٢٠ رسالة). حاول مرة أخرى غدًا!',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // Build system prompt
    const levelLabel = CEFR_MAP[studentLevel] || 'A1 (Beginner)'
    const systemPrompt = `You are a friendly English conversation practice assistant for Saudi students learning English. The student's current level is ${levelLabel}.

Rules:
- Respond in simple English appropriate to the student's level (${levelLabel}).
- Give gentle corrections when the student makes grammar or vocabulary mistakes. Show the corrected form naturally in your response.
- Be encouraging and supportive. Praise their efforts.
- If the student writes in Arabic, respond in Arabic but gently encourage them to try writing in English.
- Keep your responses concise — 2 to 3 sentences maximum.
- Do not use complex vocabulary or long explanations beyond the student's level.
- The student's name is ${profile.full_name}.`

    // Build messages array for Claude
    const claudeMessages: Array<{ role: string; content: string }> = []

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          claudeMessages.push({ role: msg.role, content: msg.content })
        }
      }
    }

    claudeMessages.push({ role: 'user', content: message })

    // Call Claude API
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: claudeMessages,
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('Claude API error:', claudeRes.status, errText)
      return new Response(
        JSON.stringify({ error: 'حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    const claudeData = await claudeRes.json()
    const reply =
      claudeData.content?.[0]?.text || 'Sorry, I could not generate a response.'

    // Save user message and assistant reply to ai_chat_messages
    const now = new Date().toISOString()

    await supabase.from('ai_chat_messages').insert([
      {
        student_id: studentId,
        role: 'user',
        content: message,
        created_at: now,
      },
      {
        student_id: studentId,
        role: 'assistant',
        content: reply,
        created_at: now,
      },
    ])

    // Log usage to ai_usage
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    await supabase.from('ai_usage').insert({
      user_id: user.id,
      function_name: 'ai-student-chatbot',
      model: 'claude-sonnet-4-20250514',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      created_at: now,
    })

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('ai-student-chatbot error:', err)
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
