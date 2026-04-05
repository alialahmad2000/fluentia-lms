// Fluentia LMS — Evaluate Speaking Edge Function
// Transcribes audio (Whisper) + evaluates with Claude → saves to speaking_recordings
// Deploy: supabase functions deploy evaluate-speaking --no-verify-jwt
// Env: OPENAI_API_KEY, CLAUDE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
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

    // ── Auth ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    // ── Parse body ──
    let body
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400)
    }

    const { recording_id } = body
    if (!recording_id) {
      return jsonResponse({ error: 'recording_id required' }, 400)
    }

    // ── Get recording details ──
    const { data: recording, error: recError } = await supabase
      .from('speaking_recordings')
      .select('*')
      .eq('id', recording_id)
      .single()

    if (recError || !recording) {
      console.error('[evaluate-speaking] Recording lookup error:', recError?.message, 'id:', recording_id)
      return jsonResponse({ error: 'Recording not found' }, 404)
    }

    // Get unit title separately (avoids FK join issues)
    let unitTitle = 'Speaking Activity'
    const { data: unitData } = await supabase
      .from('curriculum_units')
      .select('title_en, title_ar')
      .eq('id', recording.unit_id)
      .maybeSingle()
    if (unitData?.title_en) unitTitle = unitData.title_en

    // ── Verify ownership ──
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'student' && recording.student_id !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    // ── Download audio from storage ──
    // Use audio_path if available, else extract from signed URL
    let storagePath = recording.audio_path
    if (!storagePath) {
      const pathMatch = recording.audio_url?.match(/voice-notes\/([^?]+)/)
      storagePath = pathMatch?.[1]
    }

    if (!storagePath) {
      return jsonResponse({ error: 'Cannot locate audio file' }, 400)
    }

    const { data: fileData, error: dlErr } = await supabase.storage
      .from('voice-notes')
      .download(storagePath)

    if (dlErr || !fileData) {
      console.error('[evaluate-speaking] Download error:', dlErr?.message)
      return jsonResponse({
        error: 'التفريغ النصي غير متاح — صوتك محفوظ وسيراجعه المدرب',
        download_failed: true,
      }, 503)
    }

    const durationSec = recording.audio_duration_seconds || 0
    const audioFormat = recording.audio_format || 'audio/mp4'
    const ext = audioFormat.includes('mp4') ? 'mp4' : audioFormat.includes('webm') ? 'webm' : 'mp4'

    // ── Step 1: Whisper Transcription ──
    let transcript = ''
    let whisperCost = 0

    if (OPENAI_API_KEY) {
      try {
        const formData = new FormData()
        formData.append('file', new File([fileData], `recording.${ext}`, { type: audioFormat }))
        formData.append('model', 'whisper-1')
        formData.append('language', 'en')
        formData.append('response_format', 'text')

        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
          body: formData,
        })

        if (whisperRes.ok) {
          transcript = await whisperRes.text()
          transcript = transcript.trim()
          const minutes = Math.max(1, durationSec) / 60
          whisperCost = minutes * 0.006 * 3.75 // SAR

          await supabase.from('ai_usage').insert({
            type: 'whisper_transcription',
            student_id: recording.student_id,
            model: 'whisper-1',
            audio_seconds: durationSec,
            estimated_cost_sar: whisperCost.toFixed(4),
          })
        } else {
          console.error('[evaluate-speaking] Whisper error:', await whisperRes.text())
          transcript = '[تعذر تفريغ الصوت]'
        }
      } catch (err) {
        console.error('[evaluate-speaking] Whisper failed:', err)
        transcript = '[تعذر تفريغ الصوت]'
      }
    } else {
      transcript = '[تعذر تفريغ الصوت — مفتاح API غير متوفر]'
    }

    // ── Step 2: Claude Evaluation ──
    let aiEvaluation: any = null

    if (CLAUDE_API_KEY && transcript && !transcript.startsWith('[')) {
      try {
        const claudePrompt = `You are an expert English speaking coach for Arabic-speaking students at a Saudi Arabian English academy. A student has recorded a speaking exercise. Your job is NOT just to score — you must TEACH them to speak better.

Unit/Topic: ${unitTitle}
Audio Duration: ${durationSec} seconds
Student Transcript: """
${transcript}
"""

Provide comprehensive educational feedback. Respond ONLY with valid JSON (no markdown, no backticks):

{
  "grammar_score": 7,
  "vocabulary_score": 6,
  "fluency_score": 8,
  "confidence_score": 7,
  "overall_score": 7,

  "corrected_transcript": "The same content the student said, but rewritten with correct grammar and better vocabulary. Keep their ideas.",

  "errors": [
    {
      "spoken": "I am go to school every day",
      "corrected": "I go to school every day",
      "rule": "مع الأفعال في Present Simple لا نستخدم am/is/are — نستخدم الفعل مباشرة",
      "category": "grammar"
    }
  ],

  "better_expressions": [
    {
      "basic": "I think it's good",
      "natural": "I believe it's quite beneficial",
      "context": "عند التعبير عن رأيك، استخدم believe/consider بدل think"
    }
  ],

  "fluency_tips": [
    "نصيحة عملية لتحسين الطلاقة بالعربي"
  ],

  "model_answer": "How a confident speaker would answer this same topic — 3-4 sentences showing natural flow and good vocabulary.",

  "strengths": "ملاحظة إيجابية مفصلة عن أداء الطالب في التحدث بالعربي — جملتين على الأقل",
  "improvement_tip": "نصيحة واحدة محددة وعملية لتحسين التحدث بالعربي",

  "feedback_ar": "ملخص التقييم بالعربي — 3-4 جمل تشمل الإيجابيات والتحسينات والتشجيع",
  "feedback_en": "Same summary in English",

  "suggestions": ["actionable tip 1", "actionable tip 2"]
}

RULES:
- Be warm and encouraging — this is a real student who had the courage to record themselves
- Grammar rules explained in Arabic (students understand Arabic better)
- errors: include ALL spoken grammar/vocab mistakes (up to 8)
- better_expressions: 2-4 basic phrases they used with more natural/advanced alternatives
- fluency_tips: 2-3 practical speaking tips (linking words, filler word alternatives, pacing)
- model_answer: realistic for their level, not native-speaker level
- strengths: warm encouraging paragraph about what they did well
- improvement_tip: ONE specific next step to practice
- If transcript is very short or empty, still give encouraging feedback and tips
- Consider that Whisper transcription may have minor artifacts — don't penalize obvious transcription errors

Keep your response concise but complete:
- errors: top 3-5 most important errors only
- better_expressions: 2-3 most impactful ones
- fluency_tips: 2-3 tips maximum
- model_answer: 2-3 sentences only
- All Arabic feedback: 2-3 sentences each, not paragraphs`

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            messages: [{ role: 'user', content: claudePrompt }],
          }),
        })

        if (claudeRes.ok) {
          const claudeData = await claudeRes.json()
          const responseText = claudeData.content?.[0]?.text || ''
          const inputTokens = claudeData.usage?.input_tokens || 0
          const outputTokens = claudeData.usage?.output_tokens || 0

          // Parse JSON — extract between first { and last }
          console.log('[evaluate-speaking] Raw response length:', responseText.length)
          const jsonStart = responseText.indexOf('{')
          const jsonEnd = responseText.lastIndexOf('}')
          if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
            console.error('[evaluate-speaking] No JSON object found in response')
            aiEvaluation = {
              feedback_ar: 'تم التقييم — بعض التفاصيل قد تكون ناقصة',
              feedback_en: 'Evaluation completed — some details may be missing',
              suggestions: [],
            }
          } else {
            const cleanJson = responseText.substring(jsonStart, jsonEnd + 1)
            try {
              aiEvaluation = JSON.parse(cleanJson)
              console.log('[evaluate-speaking] JSON parse SUCCESS, fields:', Object.keys(aiEvaluation).join(', '))
            } catch (parseErr) {
              console.error('[evaluate-speaking] JSON parse error, attempting repair:', parseErr)
              // Try removing trailing incomplete properties
              const lastValidBrace = cleanJson.lastIndexOf('}')
              if (lastValidBrace > 0) {
                try {
                  aiEvaluation = JSON.parse(cleanJson.slice(0, lastValidBrace + 1))
                  console.log('[evaluate-speaking] Repaired JSON parse SUCCESS')
                } catch {
                  // Last resort: extract scores with regex
                  const scoreMatch = (key: string) => {
                    const m = cleanJson.match(new RegExp(`"${key}"\\s*:\\s*(\\d+)`))
                    return m ? parseInt(m[1]) : null
                  }
                  aiEvaluation = {
                    grammar_score: scoreMatch('grammar_score'),
                    vocabulary_score: scoreMatch('vocabulary_score'),
                    fluency_score: scoreMatch('fluency_score'),
                    confidence_score: scoreMatch('confidence_score'),
                    overall_score: scoreMatch('overall_score'),
                    feedback_ar: 'تم التقييم — بعض التفاصيل قد تكون ناقصة',
                    feedback_en: 'Evaluation completed — some details may be missing',
                    suggestions: [],
                  }
                  console.error('[evaluate-speaking] Fell back to regex score extraction')
                }
              }
            }
          }
          if (aiEvaluation) aiEvaluation.transcript = transcript

          // Log Claude usage
          const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75
          await supabase.from('ai_usage').insert({
            type: 'speaking_analysis',
            student_id: recording.student_id,
            model: 'claude-sonnet',
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            audio_seconds: durationSec,
            estimated_cost_sar: costSAR.toFixed(4),
          })
        } else {
          console.error('[evaluate-speaking] Claude error:', await claudeRes.text())
        }
      } catch (err) {
        console.error('[evaluate-speaking] Claude evaluation failed:', err)
      }
    }

    // ── Fallback if Claude failed but we have a transcript ──
    if (!aiEvaluation && transcript && !transcript.startsWith('[')) {
      aiEvaluation = {
        grammar_score: null,
        vocabulary_score: null,
        fluency_score: null,
        confidence_score: null,
        overall_score: null,
        feedback_ar: 'تم تفريغ الصوت بنجاح. التقييم التلقائي غير متاح حالياً — سيراجع المعلم تسجيلك.',
        feedback_en: 'Transcript saved. AI evaluation unavailable — your trainer will review.',
        suggestions: [],
        transcript: transcript,
      }
    }

    // ── Save evaluation to speaking_recordings ──
    const updateData: any = {
      ai_evaluated_at: new Date().toISOString(),
      ai_model: 'claude-sonnet-4-6',
    }
    if (aiEvaluation) {
      updateData.ai_evaluation = aiEvaluation
    }

    const { error: updateError } = await supabase
      .from('speaking_recordings')
      .update(updateData)
      .eq('id', recording_id)

    if (updateError) {
      console.error('[evaluate-speaking] Save evaluation error:', updateError.message)
    }

    // ── Notify student ──
    await supabase.from('notifications').insert({
      user_id: recording.student_id,
      type: 'speaking_evaluated',
      title: 'تم تقييم تسجيلك',
      body: 'تم تقييم نشاط التحدث بالذكاء الاصطناعي — اطلع على النتيجة',
      data: {
        recording_id: recording_id,
        unit_id: recording.unit_id,
        overall_score: aiEvaluation?.overall_score,
      },
    }).then(() => {}).catch((e: any) => console.error('[evaluate-speaking] Notification error:', e))

    // ── Update curriculum progress score ──
    if (aiEvaluation?.overall_score) {
      const progressRow = {
        student_id: recording.student_id,
        unit_id: recording.unit_id,
        section_type: 'speaking',
        status: 'completed',
        score: aiEvaluation.overall_score * 10,
        completed_at: new Date().toISOString(),
      }

      const { data: existingProgress } = await supabase
        .from('student_curriculum_progress')
        .select('id')
        .eq('student_id', recording.student_id)
        .eq('unit_id', recording.unit_id)
        .eq('section_type', 'speaking')
        .maybeSingle()

      if (existingProgress) {
        await supabase.from('student_curriculum_progress')
          .update({ score: aiEvaluation.overall_score * 10 })
          .eq('id', existingProgress.id)
      } else {
        await supabase.from('student_curriculum_progress').insert(progressRow)
      }
    }

    return jsonResponse({
      success: true,
      evaluation: aiEvaluation,
      transcript: transcript,
    })
  } catch (error: any) {
    console.error('[evaluate-speaking] Error:', error.message)
    return jsonResponse({
      error: 'التقييم غير متاح حالياً',
      details: error.message,
    }, 500)
  }
})
