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

    // Get unit title + level info
    let unitTitle = 'Speaking Activity'
    let studentLevel = 1
    const { data: unitData } = await supabase
      .from('curriculum_units')
      .select('title_en, title_ar, level:curriculum_levels(level_number)')
      .eq('id', recording.unit_id)
      .maybeSingle()
    if (unitData?.title_en) unitTitle = unitData.title_en
    if (unitData?.level?.level_number) studentLevel = unitData.level.level_number

    // Fallback: get level from student's group
    if (studentLevel === 1) {
      const { data: studentData } = await supabase
        .from('students')
        .select('groups(level)')
        .eq('id', recording.student_id)
        .maybeSingle()
      if (studentData?.groups?.level) studentLevel = studentData.groups.level
    }

    // Get the speaking topic prompt for context
    let topicPrompt = ''
    const { data: speakingTopic } = await supabase
      .from('curriculum_speaking')
      .select('prompt_en')
      .eq('unit_id', recording.unit_id)
      .order('sort_order')
      .limit(1)
      .maybeSingle()
    if (speakingTopic?.prompt_en) topicPrompt = speakingTopic.prompt_en

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
        const LEVEL_DESCRIPTORS: Record<number, string> = {
          1: 'A1 Beginner — expects very simple sentences, basic vocabulary (family, food, daily routine). Grammatical errors are normal. A score of 5 means good for this level.',
          2: 'A2 Elementary — expects short responses on everyday topics. Some variety in vocabulary. A score of 5 means meeting expectations.',
          3: 'B1 Intermediate — expects connected speech on familiar topics, use of linking words, some complex sentences. Hold to higher standards.',
          4: 'B2 Upper-intermediate — expects detailed responses, variety of tenses, nuanced vocabulary. Accuracy matters more.',
          5: 'C1 Advanced — expects complex, well-structured speech with nuanced expression. Near-native accuracy expected.',
        }
        const levelDesc = LEVEL_DESCRIPTORS[studentLevel] || LEVEL_DESCRIPTORS[1]
        const wordCount = transcript.split(/\s+/).filter(Boolean).length
        const wordsPerMinute = durationSec > 0 ? Math.round((wordCount / durationSec) * 60) : 0

        const systemPrompt = `You are a strict but encouraging ESL speaking examiner at Fluentia Academy (Saudi Arabia). You evaluate Arabic-speaking students' spoken English from Whisper transcripts.

SCORING RUBRIC — use these bands strictly. Do NOT default to middle scores.

GRAMMAR (0-10):
0-2: No control of basic structures. Every sentence has errors. Cannot form subject-verb-object.
3-4: Frequent errors in basic tenses and agreement. Uses only present simple, often incorrectly.
5-6: Basic structures mostly correct. Attempts past/future tense with some errors. Articles often missing.
7-8: Good control of common structures. Occasional errors in complex grammar. Uses multiple tenses.
9-10: Near-native accuracy. Complex structures used correctly. Only minor slips.

VOCABULARY (0-10):
0-2: Fewer than 20 unique words. Extreme repetition. Cannot express basic ideas.
3-4: Very limited range. Heavy repetition of basic words. No descriptive language.
5-6: Adequate for the topic. Some repetition but gets meaning across. Mostly high-frequency words.
7-8: Good range. Uses some less common words and collocations. Appropriate word choice.
9-10: Rich, precise vocabulary. Idiomatic expressions. Natural collocations throughout.

FLUENCY (0-10):
0-2: Cannot produce connected speech. Isolated words or fragments only.
3-4: Very hesitant. Long pauses between words. Under 40 words per minute.
5-6: Noticeable hesitation but completes thoughts. 40-80 words per minute.
7-8: Generally smooth with occasional pauses. 80-120 words per minute. Uses some linking words.
9-10: Natural flow. Self-corrects smoothly. Over 120 wpm with appropriate pausing.

TASK COMPLETION (0-10):
0-2: Does not address the topic at all.
3-4: Barely touches the topic. Under 3 sentences. Major aspects missing.
5-6: Addresses the topic but superficially. Some relevant content.
7-8: Good coverage of the topic. Provides details and examples.
9-10: Thorough, well-developed response with clear structure and supporting details.

OVERALL SCORE: Weighted average — Grammar 25%, Vocabulary 20%, Fluency 30%, Task Completion 25%.
Calculate it; do NOT just pick 7.

ANTI-CONVERGENCE RULE: If your calculated overall is exactly 7, re-examine each criterion and commit to 6 or 8 based on whether the student is below or above the midpoint for their level. Scores of exactly 7 require explicit justification.

CALIBRATION EXAMPLES:
- A1 student, 20 words, 3 grammar errors per sentence, topic barely addressed → overall: 3
- A1 student, 60 words, basic but mostly correct, addresses topic simply → overall: 5
- B1 student, 100 words, good variety, minor errors, well-structured → overall: 8

Student level: ${levelDesc}
Whisper may introduce minor transcription artifacts — do not penalize obvious Whisper errors.
All Arabic text: Modern Standard Arabic or simple colloquial. Be warm but honest.`

        const userPrompt = `Evaluate this student's speaking recording.

Topic: ${unitTitle}${topicPrompt ? `\nPrompt given to student: ${topicPrompt}` : ''}
Student Level: L${studentLevel}
Audio Duration: ${durationSec} seconds
Word Count: ${wordCount} words
Speaking Rate: ${wordsPerMinute} words/minute
Transcript:
"""
${transcript}
"""

Respond ONLY with valid JSON (no markdown, no backticks, no explanation outside the JSON):
{
  "grammar_score": <integer 0-10>,
  "vocabulary_score": <integer 0-10>,
  "fluency_score": <integer 0-10>,
  "task_completion_score": <integer 0-10>,
  "overall_score": <integer 0-10, calculated as weighted average>,
  "score_justification": "<1 sentence explaining the overall score>",
  "corrected_transcript": "<student's content rewritten with correct grammar and better vocabulary>",
  "errors": [{"spoken": "...", "corrected": "...", "rule": "<Arabic explanation>", "category": "grammar|vocabulary"}],
  "better_expressions": [{"basic": "...", "natural": "...", "context": "<Arabic usage note>"}],
  "fluency_tips": ["<Arabic practical tip>"],
  "model_answer": "<How a good L${studentLevel} speaker would answer — 2-3 sentences>",
  "strengths": "<Arabic — warm, specific praise for what they did well>",
  "improvement_tip": "<Arabic — ONE specific next step>",
  "feedback_ar": "<Arabic summary — 3-4 sentences covering strengths, areas to improve, encouragement>",
  "feedback_en": "<English summary>",
  "suggestions": ["<actionable tip 1>", "<actionable tip 2>"]
}`

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
            temperature: 0.2,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
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
                    task_completion_score: scoreMatch('task_completion_score'),
                    confidence_score: scoreMatch('task_completion_score'), // backward compat
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
          if (aiEvaluation) {
            aiEvaluation.transcript = transcript
            // Backward compat: map task_completion_score → confidence_score for UI
            if (aiEvaluation.task_completion_score != null && aiEvaluation.confidence_score == null) {
              aiEvaluation.confidence_score = aiEvaluation.task_completion_score
            }
            // Validate overall_score is actually calculated, not hardcoded 7
            const g = aiEvaluation.grammar_score || 0
            const v = aiEvaluation.vocabulary_score || 0
            const f = aiEvaluation.fluency_score || 0
            const t = aiEvaluation.task_completion_score || aiEvaluation.confidence_score || 0
            const calculated = Math.round(g * 0.25 + v * 0.20 + f * 0.30 + t * 0.25)
            if (aiEvaluation.overall_score === 7 && Math.abs(calculated - 7) > 0.5) {
              aiEvaluation.overall_score = calculated
              console.log('[evaluate-speaking] Overrode lazy-7 with calculated:', calculated)
            }
          }

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
