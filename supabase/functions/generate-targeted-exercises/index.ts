// Fluentia LMS — Generate Targeted Exercises
// Creates personalized exercises based on detected error patterns
// POST { student_id, pattern_id? } — generates for specific or top unresolved patterns

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
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    console.error('[generate-targeted-exercises] Claude API error:', res.status, errText)
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
    const { data: callerProfile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (!callerProfile || !['trainer', 'admin'].includes(callerProfile.role)) {
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

    let body;
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const { student_id, pattern_id } = body

    if (!student_id) {
      return new Response(JSON.stringify({ error: 'student_id required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Get student info
    const { data: student } = await supabase
      .from('students')
      .select('academic_level')
      .eq('id', student_id)
      .single()

    const level = student?.academic_level || 1

    // Get patterns to generate exercises for
    let patternsQuery = supabase
      .from('error_patterns')
      .select('*')
      .eq('student_id', student_id)
      .eq('resolved', false)

    if (pattern_id) {
      patternsQuery = patternsQuery.eq('id', pattern_id)
    } else {
      patternsQuery = patternsQuery.order('frequency', { ascending: false }).limit(3)
    }

    const { data: patterns } = await patternsQuery

    if (!patterns?.length) {
      return new Response(JSON.stringify({ message: 'No error patterns found', exercises: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check existing pending exercises
    const patternIds = patterns.map((p: any) => p.id)
    const { data: existingExercises } = await supabase
      .from('targeted_exercises')
      .select('pattern_id')
      .eq('student_id', student_id)
      .eq('status', 'pending')
      .in('pattern_id', patternIds)

    const existingPatternIds = new Set(existingExercises?.map((e: any) => e.pattern_id) || [])
    const newPatterns = patterns.filter((p: any) => !existingPatternIds.has(p.id))

    if (!newPatterns.length) {
      return new Response(JSON.stringify({ message: 'Exercises already pending', exercises: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const levelMap: Record<number, string> = {
      1: 'A1 Beginner', 2: 'A2 Elementary', 3: 'B1 Intermediate',
      4: 'B2 Upper-Intermediate', 5: 'C1 Advanced', 6: 'C2 Proficiency',
    }

    const exercises: any[] = []

    for (const pattern of newPatterns) {
      const systemPrompt = `You are an English language exercise generator for Arabic-speaking students at level ${levelMap[level] || 'A2'}.

Create a targeted exercise to help the student overcome this specific error pattern.

IMPORTANT:
- Exercise should directly target the error pattern
- Use clear, simple instructions in Arabic
- Include 5-8 questions/items
- Provide the correct answers
- Match the student's level
- Make it engaging and practical

Return ONLY valid JSON (no markdown):
{
  "title": "عنوان التمرين بالعربي",
  "instructions": "تعليمات واضحة بالعربي",
  "difficulty": "easy|medium|hard",
  "content": {
    "type": "fill_blank|multiple_choice|rewrite|match|order",
    "questions": [
      {
        "id": 1,
        "question": "the question or sentence",
        "options": ["a", "b", "c", "d"],
        "correct_answer": "the correct answer",
        "explanation": "شرح بالعربي"
      }
    ]
  }
}`

      const userPrompt = `Error pattern:
Skill: ${pattern.skill}
Type: ${pattern.pattern_type}
Description: ${pattern.description}
Severity: ${pattern.severity}
Examples: ${JSON.stringify(pattern.examples?.slice(0, 3))}

Generate a targeted exercise to help fix this pattern.`

      const result = await callClaude(systemPrompt, userPrompt)

      try {
        const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const exercise = JSON.parse(cleaned)

        const { data: inserted } = await supabase.from('targeted_exercises').insert({
          student_id,
          pattern_id: pattern.id,
          skill: pattern.skill,
          title: exercise.title,
          instructions: exercise.instructions,
          content: exercise.content,
          difficulty: exercise.difficulty || 'medium',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }).select().single()

        if (inserted) exercises.push(inserted)
      } catch (e: any) {
        console.error(`[generate-exercises] Failed for pattern ${pattern.id}:`, e.message)
      }
    }

    if (exercises.length > 0) {
      await supabase.from('notifications').insert({
        user_id: student_id,
        type: 'system',
        title: '📝 تمارين مخصصة جديدة!',
        body: `تم إنشاء ${exercises.length} تمرين مخصص لتحسين نقاط الضعف. ابدأ التدريب الآن!`,
        data: { type: 'targeted_exercises', count: exercises.length },
      })
    }

    return new Response(
      JSON.stringify({
        message: `Generated ${exercises.length} exercises`,
        exercises: exercises.map((e: any) => ({ id: e.id, title: e.title, skill: e.skill })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[generate-targeted-exercises]', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
