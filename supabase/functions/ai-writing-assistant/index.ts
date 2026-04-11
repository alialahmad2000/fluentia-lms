// Fluentia LMS — AI Writing Assistant Edge Function (Claude API)
// In-composition writing help: ideas, outline, starters, continuations, vocab, grammar, expansion
// Deploy: supabase functions deploy ai-writing-assistant --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Per-student hourly rate limits (in-composition help is cheap, allow generous use)
const HOURLY_LIMIT = 20

const LEVEL_CONTEXT: Record<number, string> = {
  0: 'pre-A1 foundation — very basic words and phrases',
  1: 'A1 beginner — very simple sentences, basic vocabulary',
  2: 'A2 elementary — short paragraphs, everyday topics',
  3: 'B1 intermediate — connected paragraphs, familiar topics',
  4: 'B2 upper-intermediate — detailed text, variety of topics',
  5: 'C1 advanced — complex writing, nuanced expression',
}

type Action =
  | 'ideas'
  | 'outline'
  | 'starters'
  | 'continue'
  | 'vocab_help'
  | 'fix_grammar'
  | 'expand'

const VALID_ACTIONS: Action[] = [
  'ideas', 'outline', 'starters', 'continue', 'vocab_help', 'fix_grammar', 'expand'
]

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
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      })
    }

    // Body
    let body: any
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const action: Action = body.action
    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid or missing action' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const prompt = (body.prompt || '').toString().slice(0, 1000)
    const currentText = (body.current_text || '').toString().slice(0, 4000)
    const taskType = (body.task_type || 'paragraph').toString().slice(0, 50)
    const wordCountMin = Number(body.word_count_min) || 0
    const wordCountMax = Number(body.word_count_max) || 0
    const targetVocab: string[] = Array.isArray(body.target_vocab)
      ? body.target_vocab.slice(0, 15).map((v: any) => String(v).slice(0, 40))
      : []
    const grammarTopic = (body.grammar_topic || '').toString().slice(0, 100)
    const studentLevel = Number(body.level) || null

    // Actions that require current text
    if (['continue', 'fix_grammar', 'expand'].includes(action)) {
      if (!currentText || currentText.trim().length < 3) {
        return new Response(JSON.stringify({ error: 'اكتب جملة على الأقل قبل استخدام هذه المساعدة' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        })
      }
    }

    // Role check + rate limit (staff bypass)
    const { data: userProfile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    const isStaff = userProfile?.role === 'trainer' || userProfile?.role === 'admin'

    let level = studentLevel
    if (!isStaff) {
      // Hourly rate limit for students
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('type', 'writing_assistant')
        .gte('created_at', hourAgo)

      if ((count || 0) >= HOURLY_LIMIT) {
        return new Response(JSON.stringify({
          error: `استخدمت المساعد ${HOURLY_LIMIT} مرة في الساعة الماضية — خذ فرصة واكتب بنفسك، ثم عد للمساعد بعد شوي`,
          limit_reached: true,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 })
      }

      if (level == null) {
        const { data: studentData } = await supabase
          .from('students').select('academic_level').eq('id', user.id).single()
        level = studentData?.academic_level || 3
      }
    }

    // Monthly budget cap (shared with other AI features)
    const monthStart = new Date()
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

    const { data: settings } = await supabase
      .from('system_settings').select('value').eq('key', 'ai_monthly_budget').single()
    const budgetCap = parseFloat(settings?.value || '50')

    const { data: totalCostData } = await supabase
      .from('ai_usage').select('estimated_cost_sar').gte('created_at', monthStart.toISOString())
    const totalCost = (totalCostData || []).reduce(
      (sum: number, r: any) => sum + (parseFloat(r.estimated_cost_sar) || 0), 0
    )

    if (totalCost >= budgetCap) {
      return new Response(JSON.stringify({
        error: 'تم الوصول للحد الشهري لخدمات الذكاء الاصطناعي', budget_reached: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 })
    }

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
    if (!CLAUDE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503,
      })
    }

    const levelCtx = LEVEL_CONTEXT[level || 3] || LEVEL_CONTEXT[3]

    const systemPrompt = buildSystemPrompt(action, {
      prompt, currentText, taskType, wordCountMin, wordCountMax, targetVocab, grammarTopic, levelCtx,
    })
    const userMessage = buildUserMessage(action, { prompt, currentText })

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1800,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[ai-writing-assistant] Claude API error:', errText)
      return new Response(JSON.stringify({
        error: 'المساعد غير متاح حالياً — حاول بعد قليل',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text || '{}'
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    // Parse JSON
    let result: any
    const jsonStart = rawText.indexOf('{')
    const jsonEnd = rawText.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      result = { text: rawText.slice(0, 1000) }
    } else {
      try {
        result = JSON.parse(rawText.substring(jsonStart, jsonEnd + 1))
      } catch {
        result = { text: rawText.slice(0, 1000) }
      }
    }

    // Cost calculation (Sonnet 4: $3/M input, $15/M output, SAR = USD * 3.75)
    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75

    // Log usage
    const usageRecord: any = {
      type: 'writing_assistant',
      model: 'claude-sonnet',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_sar: costSAR.toFixed(4),
    }
    if (isStaff) {
      const { data: trainerRecord } = await supabase
        .from('trainers').select('id').eq('id', user.id).single()
      usageRecord.trainer_id = trainerRecord ? user.id : null
    } else {
      usageRecord.student_id = user.id
    }
    const { error: usageErr } = await supabase.from('ai_usage').insert(usageRecord)
    if (usageErr) console.error('[ai-writing-assistant] Usage insert error:', usageErr.message)

    return new Response(JSON.stringify({ action, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('[ai-writing-assistant] Error:', error?.message || error)
    return new Response(JSON.stringify({ error: 'حدث خطأ في المساعد' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  }
})

// ─── Prompt builders ──────────────────────────────────

function buildSystemPrompt(action: Action, ctx: {
  prompt: string
  currentText: string
  taskType: string
  wordCountMin: number
  wordCountMax: number
  targetVocab: string[]
  grammarTopic: string
  levelCtx: string
}): string {
  const base = `You are a warm, patient writing tutor for Arabic-speaking English learners at an online academy. Your job is to help the student MAKE PROGRESS on their own writing — never to write the whole piece for them. Always respond in the exact JSON format specified. Keep English at a level that matches the student.

STUDENT LEVEL: ${ctx.levelCtx}

TASK CONTEXT:
- Prompt: ${ctx.prompt || '(no prompt provided)'}
- Task type: ${ctx.taskType}
- Required word count: ${ctx.wordCountMin}-${ctx.wordCountMax} words
${ctx.grammarTopic ? `- Target grammar: ${ctx.grammarTopic}` : ''}
${ctx.targetVocab.length > 0 ? `- Target vocabulary: ${ctx.targetVocab.join(', ')}` : ''}

GENERAL RULES:
- Arabic explanations should be warm, encouraging, and use simple Arabic (informal Saudi dialect is fine when it feels natural)
- English examples should match the student level exactly — do not use complex words unless the level supports it
- Never write the entire piece for the student
- Never invent target vocabulary the student can't use
- Respond ONLY with valid JSON, no markdown fences, no explanatory text outside the JSON`

  const instructions: Record<Action, string> = {
    ideas: `ACTION: Generate 3-4 concrete ideas/angles the student could write about for this prompt. Each idea should be a direction they can expand into sentences, not a full sentence itself.

Respond ONLY with this JSON:
{
  "ideas": [
    {
      "title_ar": "عنوان الفكرة بالعربي",
      "title_en": "Idea title in English",
      "hint_ar": "جملة أو اثنتين بالعربي تشرح كيف يطور هذه الفكرة في كتابته"
    }
  ]
}`,

    outline: `ACTION: Build a simple outline appropriate for the task type and word count. For a paragraph: topic sentence + 2-3 supporting sentences + closing. For an essay/letter/story: intro/body/conclusion with bullet points.

Respond ONLY with this JSON:
{
  "outline": [
    {
      "section_ar": "اسم القسم بالعربي",
      "section_en": "Section name in English",
      "points": ["point 1 in English at student level", "point 2", "point 3"]
    }
  ]
}`,

    starters: `ACTION: Suggest 3 different opening sentences the student could use. Each must match the task type, the student level, and the prompt. Give the student real choices — different angles, not rephrasings of the same sentence.

Respond ONLY with this JSON:
{
  "starters": [
    {
      "sentence": "Opening sentence in English at student level",
      "explanation_ar": "ليش هذه جملة افتتاحية جيدة وكيف تستمر منها"
    }
  ]
}`,

    continue: `ACTION: The student has written the text below. Suggest 2-3 different ways to continue — possible next sentences that naturally follow what they wrote. DO NOT rewrite what they already wrote; only suggest what comes next.

Respond ONLY with this JSON:
{
  "suggestions": [
    {
      "next_sentence": "Suggested next sentence in English at student level",
      "reason_ar": "جملة قصيرة بالعربي توضح ليش هذه جملة مفيدة تكمل فيها"
    }
  ]
}`,

    vocab_help: `ACTION: Suggest 5-8 useful English words or short phrases the student could use in this specific writing. If the task has target vocabulary, prioritize words from that list first. Each word must be at the student's level.

Respond ONLY with this JSON:
{
  "vocabulary": [
    {
      "word": "English word or short phrase",
      "meaning_ar": "المعنى بالعربي",
      "example": "Example sentence using the word in the context of this prompt"
    }
  ]
}`,

    fix_grammar: `ACTION: Look at the student's current text below. Find 2-5 important grammar, spelling, or word-choice issues and show how to fix each. Be gentle and educational — explain the rule in Arabic. Do NOT rewrite the whole text; only fix specific issues.

Respond ONLY with this JSON:
{
  "corrections": [
    {
      "original": "the exact phrase from the student's text",
      "corrected": "the fixed phrase",
      "explanation_ar": "شرح بالعربي للقاعدة وليش هذا التصحيح"
    }
  ],
  "overall_comment_ar": "تعليق عام مشجع بالعربي (جملة واحدة)"
}`,

    expand: `ACTION: The student is stuck and needs to add more words/detail. Look at what they wrote and pick 2-4 sentences that could be expanded with more details (who, what, when, where, why, how). Show the expanded version of each. Keep the expansion at student level — don't use complex words.

Respond ONLY with this JSON:
{
  "expansions": [
    {
      "original": "the exact original sentence from the student",
      "expanded": "the expanded version with more details, at student level",
      "explanation_ar": "شرح قصير بالعربي عن التفاصيل اللي أضفناها"
    }
  ]
}`,
  }

  return base + '\n\n' + instructions[action]
}

function buildUserMessage(action: Action, ctx: { prompt: string; currentText: string }): string {
  const needsText = ['continue', 'fix_grammar', 'expand'].includes(action)
  if (needsText) {
    return `The student has written this so far:\n"""\n${ctx.currentText}\n"""\n\nRespond with the JSON format specified above.`
  }
  return `Help the student with the prompt above. Respond with the JSON format specified above.`
}
