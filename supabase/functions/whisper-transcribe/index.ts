// Fluentia LMS — Whisper Transcription + AI Speaking Analysis
// Downloads voice note from storage, transcribes via Whisper, analyzes via Claude
// Deploy: supabase functions deploy whisper-transcribe
// Env: OPENAI_API_KEY, CLAUDE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LEVEL_CONTEXT: Record<number, string> = {
  1: 'A1 beginner',
  2: 'A2 elementary',
  3: 'B1 intermediate',
  4: 'B2 upper-intermediate',
  5: 'C1 advanced',
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
    const { voice_url, submission_id, duration_seconds } = body

    if (!voice_url || typeof voice_url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing voice_url' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate voice_url is a storage path, not an external URL (SSRF prevention)
    if (voice_url.startsWith('http://') || voice_url.startsWith('https://')) {
      return new Response(
        JSON.stringify({ error: 'voice_url must be a storage path, not an external URL' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get student info
    const { data: student } = await supabase
      .from('students')
      .select('id, package, academic_level')
      .eq('id', user.id)
      .single()

    // Download voice file from storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from('voice-notes')
      .download(voice_url)

    if (dlErr || !fileData) {
      return new Response(
        JSON.stringify({ error: 'التفريغ النصي غير متاح — صوتك محفوظ وسيراجعه المدرب', download_failed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    let transcript = ''
    let whisperCost = 0

    // ── Step 1: Whisper Transcription ──
    if (OPENAI_API_KEY) {
      const formData = new FormData()
      formData.append('file', fileData, 'audio.webm')
      formData.append('model', 'whisper-1')
      formData.append('language', 'en')

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      })

      if (whisperRes.ok) {
        const whisperData = await whisperRes.json()
        transcript = whisperData.text || ''
        // Whisper cost: ~$0.006/minute
        const minutes = (duration_seconds || 60) / 60
        whisperCost = minutes * 0.006 * 3.75 // SAR

        // Log Whisper usage
        await supabase.from('ai_usage').insert({
          type: 'whisper_transcription',
          student_id: user.id,
          model: 'whisper-1',
          audio_seconds: duration_seconds || 60,
          estimated_cost_sar: whisperCost.toFixed(4),
        })
      } else {
        const errText = await whisperRes.text()
        console.error('[whisper-transcribe] Whisper API error:', whisperRes.status, errText)
        return new Response(JSON.stringify({
          error: 'فشل في تحويل الصوت إلى نص',
          error_ar: 'فشل في تحويل الصوت إلى نص — حاول مرة أخرى'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 502,
        })
      }
    }

    // Store transcript on submission
    if (submission_id && transcript) {
      await supabase
        .from('submissions')
        .update({ content_voice_transcript: transcript })
        .eq('id', submission_id)
    }

    // ── Step 2: Claude Speaking Analysis ──
    let analysis = null

    if (CLAUDE_API_KEY && transcript) {
      const levelCtx = LEVEL_CONTEXT[student?.academic_level || 1] || 'A1 beginner'

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 800,
          system: `You are an English speaking coach for Arab students at ${levelCtx} level.
Analyze this transcription of their spoken English and respond in JSON with:
- grammar_notes: array of {issue: string, suggestion: string} (max 4, in Arabic)
- vocabulary_range: string (1-2 sentences in Arabic assessing word variety)
- fluency_assessment: string (1-2 sentences in Arabic)
- confidence_level: string (one of: "منخفضة", "متوسطة", "جيدة", "ممتازة")
- suggestions: array of strings (2-3 improvement tips in Arabic)
- overall_score: number 1-10
Respond ONLY with valid JSON.`,
          messages: [{ role: 'user', content: `Transcription: "${transcript}"` }],
        }),
      })

      if (claudeRes.ok) {
        const claudeData = await claudeRes.json()
        const responseText = claudeData.content?.[0]?.text || '{}'
        const inputTokens = claudeData.usage?.input_tokens || 0
        const outputTokens = claudeData.usage?.output_tokens || 0

        try {
          analysis = JSON.parse(responseText)
        } catch {
          analysis = { overall_score: 5, fluency_assessment: responseText }
        }

        const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75

        await supabase.from('ai_usage').insert({
          type: 'speaking_analysis',
          student_id: user.id,
          model: 'claude-sonnet',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          audio_seconds: duration_seconds || 60,
          estimated_cost_sar: costSAR.toFixed(4),
        })

        // Store analysis on submission
        if (submission_id) {
          await supabase
            .from('submissions')
            .update({ ai_feedback: analysis })
            .eq('id', submission_id)
        }
      }
    }

    return new Response(
      JSON.stringify({ transcript, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[whisper-transcribe] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
