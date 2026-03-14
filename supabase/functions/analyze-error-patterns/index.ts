// Fluentia LMS — Analyze Error Patterns
// Called after grading a submission to detect recurring error patterns
// POST { student_id, submission_id } or { student_id, analyze_all: true }

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
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    console.error('[analyze-error-patterns] Claude API error:', res.status, errText)
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
    const { student_id, submission_id, analyze_all } = body

    if (!student_id) {
      return new Response(JSON.stringify({ error: 'student_id required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Get recent graded submissions with feedback
    let query = supabase
      .from('submissions')
      .select('id, grade_numeric, grade, trainer_feedback, ai_feedback, content_text, assignments(type, title, instructions)')
      .eq('student_id', student_id)
      .eq('status', 'graded')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    if (submission_id && !analyze_all) {
      query = query.eq('id', submission_id)
    } else {
      query = query.limit(15)
    }

    const { data: submissions } = await query

    if (!submissions?.length) {
      return new Response(JSON.stringify({ message: 'No graded submissions found', patterns: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get existing patterns for context
    const { data: existingPatterns } = await supabase
      .from('error_patterns')
      .select('*')
      .eq('student_id', student_id)
      .eq('resolved', false)

    const submissionSummaries = submissions.map((s: any) => {
      const type = s.assignments?.type || 'unknown'
      return `[${type}] "${s.assignments?.title}"\nGrade: ${s.grade} (${s.grade_numeric}%)\nStudent Answer: ${(s.content_text || '').substring(0, 500)}\nFeedback: ${(s.trainer_feedback || s.ai_feedback || '').substring(0, 500)}`
    }).join('\n---\n')

    const existingPatternsStr = existingPatterns?.length
      ? existingPatterns.map((p: any) => `- [${p.skill}] ${p.pattern_type}: ${p.description} (freq: ${p.frequency})`).join('\n')
      : 'None'

    const systemPrompt = `You are an English language learning error pattern analyzer for Arabic-speaking students.
Analyze student submissions to identify RECURRING error patterns.

IMPORTANT:
- Focus on patterns that appear multiple times, not one-off mistakes
- Categorize by skill: grammar, vocabulary, speaking, listening, reading, writing
- Use specific pattern_type names: tense_confusion, article_misuse, spelling, word_order, subject_verb_agreement, preposition_errors, plural_formation, pronoun_reference, run_on_sentences, fragment_sentences, vocabulary_misuse, false_friends, etc.
- Provide descriptions in Arabic
- Include specific examples from the submissions

Return ONLY valid JSON array (no markdown):
[{
  "skill": "grammar",
  "pattern_type": "tense_confusion",
  "description": "خلط بين الماضي والمضارع",
  "severity": "high|medium|low",
  "examples": [{"source": "original text", "error": "the error", "correction": "correct form"}],
  "is_existing": false
}]

If an existing pattern is found again, set is_existing to true and include the pattern_type.
Return empty array [] if no clear patterns found.`

    const userPrompt = `Existing patterns:\n${existingPatternsStr}\n\nRecent submissions:\n${submissionSummaries}`

    const analysis = await callClaude(systemPrompt, userPrompt)

    let patterns: any[] = []
    try {
      const cleaned = analysis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      patterns = JSON.parse(cleaned)
    } catch {
      console.error('[analyze-error-patterns] Failed to parse:', analysis)
      return new Response(JSON.stringify({ message: 'Analysis completed but no patterns extracted', raw: analysis }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let newPatterns = 0
    let updatedPatterns = 0

    for (const pattern of patterns) {
      if (pattern.is_existing) {
        const existing = existingPatterns?.find((p: any) => p.pattern_type === pattern.pattern_type && p.skill === pattern.skill)
        if (existing) {
          const mergedExamples = [...(existing.examples || []), ...(pattern.examples || [])].slice(-10)
          await supabase
            .from('error_patterns')
            .update({
              frequency: existing.frequency + 1,
              last_detected_at: new Date().toISOString(),
              examples: mergedExamples,
              severity: pattern.severity || existing.severity,
            })
            .eq('id', existing.id)
          updatedPatterns++
        }
      } else {
        await supabase.from('error_patterns').insert({
          student_id,
          skill: pattern.skill,
          pattern_type: pattern.pattern_type,
          description: pattern.description,
          examples: pattern.examples || [],
          severity: pattern.severity || 'medium',
        })
        newPatterns++
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Analysis complete',
        total_patterns: patterns.length,
        new_patterns: newPatterns,
        updated_patterns: updatedPatterns,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[analyze-error-patterns]', error.message)
    return new Response(JSON.stringify({ error: 'حدث خطأ في المعالجة', error_ar: 'حدث خطأ في المعالجة — حاول مرة أخرى' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
