// Fluentia LMS — AI Form Filler Edge Function (Claude API)
// Receives a form schema and natural language instruction, returns filled field values
// POST { pageId, formSchema, userMessage, contextData }
// Deploy: supabase functions deploy ai-form-filler
// Env: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FormField {
  key: string
  type: string
  label: string
  options?: { value: string; label: string }[]
  required?: boolean
}

interface ContextData {
  groups?: { id: string; name: string }[]
  currentDate?: string
  students?: { id: string; name: string; group_id?: string }[]
}

interface RequestBody {
  pageId: string
  formSchema: FormField[]
  userMessage: string
  contextData?: ContextData
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

    // 2. Verify user is trainer or admin (not student)
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

    // Rate limit check — 30 requests per hour per user
    const { count: recentCount } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('trainer_id', user.id)
      .eq('type', 'form_fill')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    if (recentCount !== null && recentCount >= 30) {
      return new Response(
        JSON.stringify({ error: 'تجاوزت الحد الأقصى للطلبات — حاول مرة أخرى بعد قليل' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // 3. Parse and validate request body
    let body: RequestBody;
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const { pageId, formSchema, userMessage, contextData } = body

    if (!pageId || typeof pageId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'حقل معرف الصفحة (pageId) مطلوب' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!formSchema || !Array.isArray(formSchema) || formSchema.length === 0) {
      return new Response(
        JSON.stringify({ error: 'مخطط النموذج (formSchema) مطلوب ويجب أن يحتوي على حقل واحد على الأقل' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'رسالة المستخدم (userMessage) مطلوبة ويجب أن تكون حرفين على الأقل' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (userMessage.trim().length > 1000) {
      return new Response(
        JSON.stringify({ error: 'رسالة المستخدم (userMessage) يجب أن لا تتجاوز 1000 حرف' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check Anthropic API key
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'خدمة الذكاء الاصطناعي غير مُعدّة — يرجى التواصل مع المسؤول' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    // 4. Build the form schema description for Claude
    const schemaDescription = formSchema.map((field) => {
      let desc = `- key: "${field.key}", type: "${field.type}", label: "${field.label}"`
      if (field.required) desc += ', required: true'
      if (field.options && field.options.length > 0) {
        const opts = field.options.map((o) => `${o.value} (${o.label})`).join(', ')
        desc += `, valid options: [${opts}]`
      }
      return desc
    }).join('\n')

    // Build context section
    let contextSection = ''
    if (contextData) {
      if (contextData.currentDate) {
        contextSection += `\nCurrent date: ${contextData.currentDate}`
      }
      if (contextData.groups && contextData.groups.length > 0) {
        const groupList = contextData.groups.map((g) => `"${g.name}" -> UUID: ${g.id}`).join(', ')
        contextSection += `\nAvailable groups: ${groupList}`
      }
      if (contextData.students && contextData.students.length > 0) {
        const studentList = contextData.students.map((s) => {
          let entry = `"${s.name}" -> UUID: ${s.id}`
          if (s.group_id) entry += ` (group: ${s.group_id})`
          return entry
        }).join(', ')
        contextSection += `\nAvailable students: ${studentList}`
      }
    }

    // 5. Build Claude API prompt
    const systemPrompt = `You are a smart form-filling assistant for Fluentia LMS. You receive a form schema and a natural language instruction (in Arabic, English, or mixed), and you must fill the form fields based on the user's intent.

Rules:
- Return ONLY valid JSON, no markdown, no explanation, no wrapping.
- The JSON must have this exact structure: {"filledFields": {}, "unfilled": [], "confidence": "high"|"medium"}
- "filledFields" is an object mapping field keys to their values.
- "unfilled" is an array of field keys you could not confidently determine from the user's message.
- "confidence" is "high" if all required fields are filled clearly, "medium" if some inference was needed or optional fields are missing.

Field type rules:
- For "select" fields: only return a value that matches one of the valid option values listed.
- For "date" fields: calculate relative date expressions. Examples: "بعد 3 أيام" means current date + 3 days, "next Sunday" means the upcoming Sunday, "الأسبوع القادم" means next week. Return dates in YYYY-MM-DD format.
- For "group_id" or fields referencing groups: match the group name mentioned by the user to the correct UUID from the context data.
- For "student_id" or fields referencing students: match the student name mentioned by the user to the correct UUID from the context data.
- For "boolean" / "checkbox" / "toggle" fields: infer true/false from context (e.g., "مفعّل" = true, "نعم" = true, "لا" = false).
- For "number" fields: extract numeric values from the text.
- For "text" / "textarea" fields: extract the relevant text content.

Be smart about Arabic/English mixed input. Understand common Arabic phrases and their intent.
If a user says "سجل طالب اسمه أحمد في مجموعة المبتدئين", you should match "أحمد" to a student and "المبتدئين" to a group from context data.

Form schema:
${schemaDescription}
${contextSection ? `\nContext data:${contextSection}` : ''}`

    const userPrompt = userMessage.trim()

    // 6. Call Claude API
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[ai-form-filler] Claude API error:', claudeRes.status, errText)
      return new Response(
        JSON.stringify({ error: 'خطأ في خدمة الذكاء الاصطناعي — يرجى المحاولة مرة أخرى' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    const claudeData = await claudeRes.json()
    const responseText = claudeData.content?.[0]?.text || '{}'
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    // 7. Parse the JSON response from Claude
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let result: { filledFields: Record<string, unknown>; unfilled: string[]; confidence: string }
    try {
      result = JSON.parse(cleaned)
      if (!result.filledFields || typeof result.filledFields !== 'object') {
        throw new Error('Response missing filledFields object')
      }
      if (!Array.isArray(result.unfilled)) {
        result.unfilled = []
      }
      if (!result.confidence || !['high', 'medium'].includes(result.confidence)) {
        result.confidence = 'medium'
      }
    } catch {
      console.error('[ai-form-filler] Failed to parse Claude response:', cleaned.substring(0, 200))
      return new Response(
        JSON.stringify({ error: 'خطأ في معالجة الاستجابة من الذكاء الاصطناعي — يرجى المحاولة مرة أخرى' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    // 8. Validate select field values against allowed options
    for (const field of formSchema) {
      const value = result.filledFields[field.key]
      if (value !== undefined && field.type === 'select' && field.options && field.options.length > 0) {
        const validValues = field.options.map((o) => o.value)
        if (!validValues.includes(value as string)) {
          // Move invalid select value to unfilled
          delete result.filledFields[field.key]
          if (!result.unfilled.includes(field.key)) {
            result.unfilled.push(field.key)
          }
          result.confidence = 'medium'
        }
      }
    }

    // 9. Log usage to ai_usage table
    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75

    const usageRecord: Record<string, unknown> = {
      type: 'form_fill',
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
    if (usageErr) console.error('[ai-form-filler] Usage insert error:', usageErr.message)

    // 10. Return the filled form data
    return new Response(
      JSON.stringify({
        filledFields: result.filledFields,
        unfilled: result.unfilled,
        confidence: result.confidence,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[ai-form-filler] Error:', error.message)
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع — يرجى المحاولة لاحقاً' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
