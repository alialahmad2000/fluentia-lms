// Fluentia LMS — Process Voice Journal
// Transcribes audio with Whisper, analyzes with Claude, stores feedback
// POST { student_id, audio_url, duration_seconds, topic, mood }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''

async function transcribeAudio(audioUrl: string): Promise<string> {
  // Download audio
  const audioRes = await fetch(audioUrl)
  const audioBlob = await audioRes.blob()

  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', 'whisper-1')
  formData.append('language', 'en')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  })

  const data = await res.json()
  return data.text || ''
}

async function analyzeTranscript(transcript: string, topic: string): Promise<any> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `You are a friendly English speaking coach for Arabic-speaking students. Analyze this voice journal entry and provide helpful feedback.

Return ONLY valid JSON (no markdown):
{
  "fluency_score": 0-100,
  "feedback": "تعليق مشجع وبنّاء بالعربي عن أداء الطالب",
  "corrections": [
    {"original": "what they said", "corrected": "correct form", "explanation": "شرح بالعربي"}
  ],
  "strengths": ["نقطة قوة بالعربي"],
  "improvements": ["نقطة تحسين بالعربي"]
}`,
      messages: [{
        role: 'user',
        content: `Topic: ${topic || 'free talk'}\n\nTranscript:\n${transcript}`,
      }],
    }),
  })

  const data = await res.json()
  const text = data.content?.[0]?.text || '{}'
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
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

    const { student_id, audio_url, duration_seconds, topic, mood } = await req.json()

    if (!student_id || !audio_url) {
      return new Response(JSON.stringify({ error: 'student_id and audio_url required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Transcribe
    const transcript = await transcribeAudio(audio_url)

    if (!transcript) {
      return new Response(JSON.stringify({ error: 'Could not transcribe audio' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Analyze
    let analysis: any = {}
    try {
      analysis = await analyzeTranscript(transcript, topic || '')
    } catch (e: any) {
      console.error('[voice-journal] Analysis failed:', e.message)
      analysis = { fluency_score: 50, feedback: 'أحسنت! استمر في التدريب.', corrections: [] }
    }

    // Calculate XP
    const xp = analysis.fluency_score >= 80 ? 20 : analysis.fluency_score >= 60 ? 15 : 10

    // Save journal entry
    const { data: journal } = await supabase.from('voice_journals').insert({
      student_id,
      audio_url,
      duration_seconds,
      transcript,
      ai_feedback: analysis.feedback,
      ai_corrections: analysis.corrections || [],
      fluency_score: analysis.fluency_score || 50,
      topic: topic || 'free talk',
      mood,
      xp_awarded: xp,
    }).select().single()

    // Award XP
    await supabase.from('xp_transactions').insert({
      student_id,
      amount: xp,
      reason: 'custom',
      description: 'تسجيل يوميات صوتية',
    })

    return new Response(
      JSON.stringify({
        journal_id: journal?.id,
        transcript,
        feedback: analysis.feedback,
        corrections: analysis.corrections,
        fluency_score: analysis.fluency_score,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        xp_awarded: xp,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[process-voice-journal]', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
