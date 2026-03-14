// Fluentia LMS — AI Quiz Generator Edge Function (Claude API)
// Generates quiz questions based on trainer-provided context
// POST { context, level, skill_focus, question_count, question_types }
// Deploy: supabase functions deploy ai-quiz-generator
// Env: CLAUDE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CEFR_MAP: Record<number, string> = {
  1: 'A1',
  2: 'A2',
  3: 'B1',
  4: 'B2',
  5: 'C1',
}

const VALID_QUESTION_TYPES = ['multiple_choice', 'true_false', 'fill_blank']
const VALID_SKILLS = ['grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing']

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // 1. Verify auth (JWT from Authorization header)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'التوثيق مطلوب — يرجى تسجيل الدخول' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'جلسة غير صالحة — يرجى إعادة تسجيل الدخول' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // 2. Verify user is trainer or admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || (userProfile.role !== 'trainer' && userProfile.role !== 'admin')) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح — هذه الخدمة متاحة للمدربين والمسؤولين فقط' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const { context, level, skill_focus, question_count, question_types } = body

    if (!context || typeof context !== 'string' || context.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'حقل السياق (context) مطلوب ويجب أن يكون 3 أحرف على الأقل' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (context.trim().length > 2000) {
      return new Response(
        JSON.stringify({ error: 'حقل السياق (context) يجب أن لا يتجاوز 2000 حرف' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!level || !CEFR_MAP[level]) {
      return new Response(
        JSON.stringify({ error: 'المستوى (level) مطلوب ويجب أن يكون بين 1 و 5' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!skill_focus || !Array.isArray(skill_focus) || skill_focus.length === 0) {
      return new Response(
        JSON.stringify({ error: 'حقل المهارات (skill_focus) مطلوب ويجب أن يحتوي على مهارة واحدة على الأقل' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const invalidSkills = skill_focus.filter((s: string) => !VALID_SKILLS.includes(s))
    if (invalidSkills.length > 0) {
      return new Response(
        JSON.stringify({ error: `مهارات غير صالحة: ${invalidSkills.join(', ')}. المهارات المتاحة: ${VALID_SKILLS.join(', ')}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!question_count || typeof question_count !== 'number' || question_count < 1 || question_count > 50) {
      return new Response(
        JSON.stringify({ error: 'عدد الأسئلة (question_count) مطلوب ويجب أن يكون بين 1 و 50' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!question_types || !Array.isArray(question_types) || question_types.length === 0) {
      return new Response(
        JSON.stringify({ error: 'أنواع الأسئلة (question_types) مطلوبة ويجب أن تحتوي على نوع واحد على الأقل' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const invalidTypes = question_types.filter((t: string) => !VALID_QUESTION_TYPES.includes(t))
    if (invalidTypes.length > 0) {
      return new Response(
        JSON.stringify({ error: `أنواع أسئلة غير صالحة: ${invalidTypes.join(', ')}. الأنواع المتاحة: ${VALID_QUESTION_TYPES.join(', ')}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check Claude API key
    if (!CLAUDE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'خدمة الذكاء الاصطناعي غير مُعدّة — يرجى التواصل مع المسؤول' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    // 3. Build Claude API prompt
    const levelLabel = CEFR_MAP[level]

    const systemPrompt = `You are an English language quiz generator for Saudi students. Generate exactly ${question_count} questions at CEFR level ${levelLabel}.

Rules:
- Focus on: ${skill_focus.join(', ')}
- Question types to use: ${question_types.join(', ')}
- Each question must test a specific skill
- For multiple_choice: provide exactly 4 options, mark one correct
- For true_false: the correct_answer should be "true" or "false"
- For fill_blank: provide the sentence with ___ and the correct_answer
- Explanations should be brief and in simple English
- Questions should be appropriate for Saudi adult learners (ages 18-34)

Return ONLY a JSON array, no markdown, no explanation:
[{
  "type": "multiple_choice",
  "question_text": "Choose the correct answer: She ___ to school every day.",
  "options": [
    {"id": "a", "text": "go", "is_correct": false},
    {"id": "b", "text": "goes", "is_correct": true},
    {"id": "c", "text": "going", "is_correct": false},
    {"id": "d", "text": "gone", "is_correct": false}
  ],
  "correct_answer": "b",
  "explanation": "'goes' is correct because we use third person singular present tense with 'she'.",
  "skill_tag": "grammar",
  "points": 1
}]`

    const userPrompt = `Generate a quiz about: ${context.trim()}`

    // 4. Call Claude API
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[ai-quiz-generator] Claude API error:', claudeRes.status, errText)
      return new Response(
        JSON.stringify({ error: 'خطأ في خدمة الذكاء الاصطناعي — يرجى المحاولة مرة أخرى' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    const claudeData = await claudeRes.json()
    const responseText = claudeData.content?.[0]?.text || '[]'
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    // 5. Parse the JSON response from Claude
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let questions
    try {
      questions = JSON.parse(cleaned)
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array')
      }
    } catch {
      console.error('[ai-quiz-generator] Failed to parse Claude response:', cleaned.substring(0, 200))
      return new Response(
        JSON.stringify({ error: 'خطأ في معالجة الاستجابة من الذكاء الاصطناعي — يرجى المحاولة مرة أخرى' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    // 6. Log usage to ai_usage table
    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75

    const usageRecord: Record<string, unknown> = {
      type: 'quiz_generation',
      model: 'claude-sonnet',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_sar: costSAR.toFixed(4),
    }

    // Determine if user is trainer or admin and set appropriate ID
    const { data: trainerRecord } = await supabase
      .from('trainers')
      .select('id')
      .eq('id', user.id)
      .single()

    if (trainerRecord) {
      usageRecord.trainer_id = user.id
    }

    const { error: usageErr } = await supabase.from('ai_usage').insert(usageRecord)
    if (usageErr) console.error('[ai-quiz-generator] Usage insert error:', usageErr.message)

    // 7. Return the questions array
    return new Response(
      JSON.stringify({
        questions,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[ai-quiz-generator] Error:', error.message)
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع — يرجى المحاولة لاحقاً' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
