// Fluentia LMS — AI Test Question Generator
// Generates adaptive test questions using Claude API
// POST — triggered by admin to expand the question bank
// Deploy: supabase functions deploy generate-test-questions
// Env: CLAUDE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || ''
const CLAUDE_MODEL = 'claude-sonnet-4-6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: 'A1 beginner — basic greetings, simple present tense, common nouns, very simple reading',
  2: 'A2 elementary — past tense, comparatives, daily life topics, short paragraphs',
  3: 'B1 intermediate — present perfect, conditionals, passive voice, narrative texts',
  4: 'B2 upper-intermediate — advanced conditionals, reported speech, academic topics',
  5: 'C1 advanced — subjunctive, inversion, nominalization, nuanced argumentation',
}

const GRAMMAR_TOPICS: Record<number, string[]> = {
  1: ['be verb', 'present simple', 'articles', 'plurals', 'possessives', 'prepositions of place', 'can/can\'t'],
  2: ['past simple', 'going to', 'comparatives', 'superlatives', 'should/shouldn\'t', 'present continuous', 'countable/uncountable'],
  3: ['present perfect', 'first conditional', 'passive voice', 'relative clauses', 'used to', 'reported speech basic', 'modal verbs'],
  4: ['third conditional', 'wish/if only', 'mixed conditionals', 'advanced passive', 'inversion', 'participle clauses', 'future perfect'],
  5: ['subjunctive', 'cleft sentences', 'nominalization', 'advanced inversion', 'fronting', 'ellipsis', 'discourse markers'],
}

interface GeneratedQuestion {
  skill: string
  level: number
  difficulty: number
  question_type: string
  question_text: string
  question_text_ar: string
  options: string[]
  correct_answer: string
  explanation: string
  explanation_ar: string
  grammar_topic: string | null
  tags: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      })
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      })
    }

    // Parse request
    let body: { skill?: string; level?: number; count?: number } = {}
    try { body = await req.json() } catch { body = {} }

    const skill = body.skill || 'grammar'
    const level = body.level || 1
    const count = Math.min(body.count || 10, 20) // Max 20 at a time

    if (!['grammar', 'vocabulary', 'reading', 'listening'].includes(skill)) {
      return new Response(JSON.stringify({ error: `Invalid skill: ${skill}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    if (level < 1 || level > 5) {
      return new Response(JSON.stringify({ error: 'Level must be 1-5' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    // Get existing question count for this skill/level to avoid duplicates
    const { count: existingCount } = await supabase
      .from('test_questions')
      .select('id', { count: 'exact', head: true })
      .eq('skill', skill)
      .eq('level', level)
      .eq('is_active', true)

    const levelDesc = LEVEL_DESCRIPTIONS[level]
    const grammarTopics = GRAMMAR_TOPICS[level]

    const systemPrompt = `You are an expert English test question writer for Arabic-speaking adult learners.
Generate ${count} multiple-choice questions for adaptive placement testing.

Rules:
- All questions must be at CEFR level ${level} (${levelDesc})
- Questions should test ${skill} skills specifically
- Each question must have exactly 4 options (A, B, C, D)
- Include Arabic translation of each question
- Include explanation in both English and Arabic
- Vary difficulty from 0.20 to 0.90 within the level
- For grammar: focus on these topics: ${grammarTopics?.join(', ')}
- For vocabulary: test word meanings, synonyms, collocations, and contextual usage
- For reading: include a short passage then ask comprehension questions
- For listening: simulate audio transcript scenarios
- Questions should be culturally appropriate for Arab adults
- Avoid trick questions — test genuine knowledge

Output ONLY valid JSON — no markdown, no code fences.`

    const userPrompt = `Generate ${count} ${skill} questions at level ${level}.
There are currently ${existingCount || 0} existing questions — make these unique and different.

JSON format (array of objects):
[
  {
    "question_text": "English question text",
    "question_text_ar": "Arabic question text",
    "difficulty": 0.45,
    "question_type": "mcq",
    "options": ["option A", "option B", "option C", "option D"],
    "correct_answer": "option B",
    "explanation": "English explanation",
    "explanation_ar": "Arabic explanation",
    "grammar_topic": "present_simple or null for non-grammar",
    "tags": ["tag1", "tag2"]
  }
]

${skill === 'reading' ? 'For reading questions, include a "passage" field with a short reading passage (50-200 words depending on level).' : ''}
${skill === 'listening' ? 'For listening questions, prefix question_text with [Audio transcript] and describe what was said.' : ''}`

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503,
      })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 6000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Claude API error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const inputTokens = data.usage?.input_tokens ?? 0
    const outputTokens = data.usage?.output_tokens ?? 0

    let rawText = data.content?.[0]?.text ?? ''

    // Parse JSON robustly
    if (rawText.includes('```')) {
      const fenceMatch = rawText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
      if (fenceMatch) rawText = fenceMatch[1].trim()
    }
    const firstBracket = rawText.indexOf('[')
    const lastBracket = rawText.lastIndexOf(']')
    if (firstBracket !== -1 && lastBracket !== -1) {
      rawText = rawText.slice(firstBracket, lastBracket + 1)
    }

    let questions: GeneratedQuestion[]
    try {
      questions = JSON.parse(rawText)
    } catch (e) {
      throw new Error(`Failed to parse questions: ${e instanceof Error ? e.message : String(e)}`)
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('No questions generated')
    }

    // Insert questions
    const toInsert = questions.map((q: any) => ({
      skill,
      level,
      difficulty: Math.max(0.1, Math.min(0.95, q.difficulty || 0.5)),
      question_type: q.question_type || 'mcq',
      question_text: q.question_text,
      question_text_ar: q.question_text_ar || null,
      options: q.options || null,
      correct_answer: q.correct_answer,
      explanation: q.explanation || null,
      explanation_ar: q.explanation_ar || null,
      passage: q.passage || null,
      grammar_topic: q.grammar_topic || null,
      tags: q.tags || [],
      is_active: true,
      created_by: user.id,
    }))

    const { data: inserted, error: insertErr } = await supabase
      .from('test_questions')
      .insert(toInsert)
      .select('id')

    if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`)

    // Log AI usage
    const costSar = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75
    await supabase.from('ai_usage').insert({
      type: 'test_question_generation',
      model: CLAUDE_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_sar: costSar.toFixed(4),
    })

    return new Response(JSON.stringify({
      generated: inserted?.length || 0,
      skill,
      level,
      total_existing: (existingCount || 0) + (inserted?.length || 0),
      message: `تم إنشاء ${inserted?.length || 0} سؤال بنجاح`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Error generating test questions:', message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
