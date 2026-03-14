// Fluentia LMS — Universal AI Submission Feedback
// Handles ALL assignment types: writing, speaking, reading, listening, grammar, vocabulary, custom
// Deploy: supabase functions deploy ai-submission-feedback --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CEFR_MAP: Record<number, string> = {
  1: 'A1 (مبتدئ)',
  2: 'A2 (أساسي)',
  3: 'B1 (متوسط)',
  4: 'B2 (فوق المتوسط)',
  5: 'C1 (متقدم)',
}

const PACKAGE_NAMES: Record<string, string> = {
  asas: 'أساس',
  talaqa: 'طلاقة',
  tamayuz: 'تميّز',
  ielts: 'IELTS',
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

    // Auth
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

    // Verify trainer/admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!userProfile || !['trainer', 'admin'].includes(userProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized — trainer/admin only' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    if (!CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY is empty!')
      return new Response(
        JSON.stringify({ error: 'خدمة الذكاء الاصطناعي غير مفعّلة — مفتاح API غير موجود' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
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
    const { submission_id } = body
    if (!submission_id || typeof submission_id !== 'string' || !submission_id.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid submission_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // ── Fetch submission + assignment + student data ──
    const { data: submission, error: subErr } = await supabase
      .from('submissions')
      .select(`
        id, content_text, content_voice_url, content_voice_duration, content_voice_transcript,
        content_image_urls, content_file_urls, content_link, difficulty_rating,
        status, is_late, submitted_at,
        student_id,
        assignment_id,
        assignments!inner(title, type, instructions, description, group_id)
      `)
      .eq('id', submission_id)
      .single()

    if (subErr || !submission) throw new Error(`Submission not found: ${subErr?.message || 'null result'}`)

    const assignmentType = submission.assignments?.type || 'custom'
    const assignmentTitle = submission.assignments?.title || ''
    const assignmentInstructions = submission.assignments?.instructions || submission.assignments?.description || ''

    // ── Fetch student context ──
    const [studentRes, profileRes, skillRes, recentSubsRes, prevAiRes] = await Promise.all([
      supabase.from('students').select('id, academic_level, package, xp_total, current_streak, longest_streak').eq('id', submission.student_id).single(),
      supabase.from('profiles').select('full_name, display_name').eq('id', submission.student_id).single(),
      supabase.from('skill_snapshots').select('grammar, vocabulary, speaking, listening, reading, writing').eq('student_id', submission.student_id).order('snapshot_date', { ascending: false }).limit(1).single(),
      supabase.from('submissions').select('grade, grade_numeric, is_late, ai_feedback, assignments!inner(type, title)').eq('student_id', submission.student_id).eq('status', 'graded').is('deleted_at', null).order('submitted_at', { ascending: false }).limit(10),
      supabase.from('submissions').select('ai_feedback').eq('student_id', submission.student_id).not('ai_feedback', 'is', null).is('deleted_at', null).order('submitted_at', { ascending: false }).limit(3),
    ])

    const student = studentRes.data
    const studentProfile = profileRes.data
    const skillSnapshot = skillRes.data
    const recentSubs = recentSubsRes.data || []
    const prevAiFeedback = prevAiRes.data || []

    const studentName = studentProfile?.display_name || studentProfile?.full_name?.split(' ')[0] || 'الطالب'
    const cefrLevel = CEFR_MAP[student?.academic_level || 1] || 'A1'
    const packageName = PACKAGE_NAMES[student?.package || 'asas'] || 'أساس'

    // Build performance context
    const recentGrades = recentSubs.map((s: any) =>
      `${s.assignments?.type}: ${s.grade || 'N/A'} (${s.grade_numeric || 0}%)${s.is_late ? ' [متأخر]' : ''}`
    ).join(', ')

    const skillCtx = skillSnapshot
      ? `Skills: Grammar=${skillSnapshot.grammar}/100, Vocabulary=${skillSnapshot.vocabulary}/100, Speaking=${skillSnapshot.speaking}/100, Listening=${skillSnapshot.listening}/100, Reading=${skillSnapshot.reading}/100, Writing=${skillSnapshot.writing}/100`
      : 'No skill data available yet'

    const prevSuggestions = prevAiFeedback
      .filter((p: any) => p.ai_feedback?.improvement_tips || p.ai_feedback?.suggestions)
      .flatMap((p: any) => p.ai_feedback?.improvement_tips || p.ai_feedback?.suggestions || [])
      .slice(0, 5)
      .join('; ')

    // ── Whisper transcription for voice submissions ──
    let transcript = submission.content_voice_transcript || ''

    if (submission.content_voice_url && !transcript && OPENAI_API_KEY) {
      try {
        const { data: fileData, error: dlErr } = await supabase.storage
          .from('voice-notes')
          .download(submission.content_voice_url)

        if (!dlErr && fileData) {
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

            // Save transcript
            if (transcript) {
              await supabase.from('submissions').update({ content_voice_transcript: transcript }).eq('id', submission_id)
            }

            // Log whisper cost
            const minutes = (submission.content_voice_duration || 60) / 60
            const { error: whisperLogErr } = await supabase.from('ai_usage').insert({
              type: 'whisper_transcription',
              student_id: submission.student_id,
              model: 'whisper-1',
              audio_seconds: submission.content_voice_duration || 60,
              estimated_cost_sar: (minutes * 0.006 * 3.75).toFixed(4),
            })
            if (whisperLogErr) console.error('Whisper usage log error:', whisperLogErr.message)
          }
        }
      } catch (e) {
        console.error('[ai-submission-feedback] Whisper error:', e)
      }
    }

    // ── Build submission content description ──
    let submissionContent = ''
    if (submission.content_text) {
      submissionContent += `Student's written text:\n"${submission.content_text}"\n\n`
    }
    if (transcript) {
      submissionContent += `Student's spoken words (transcribed):\n"${transcript}"\n\n`
    }
    if (submission.content_voice_url && !transcript) {
      submissionContent += `Student submitted a voice recording (${submission.content_voice_duration || '?'}s) but transcription is not available.\n\n`
    }
    if (submission.content_image_urls?.length > 0) {
      submissionContent += `Student uploaded ${submission.content_image_urls.length} image(s) as proof of work.\n\n`
    }
    if (submission.content_file_urls?.length > 0) {
      submissionContent += `Student uploaded ${submission.content_file_urls.length} file(s).\n\n`
    }
    if (submission.content_link) {
      submissionContent += `Student submitted a link: ${submission.content_link}\n\n`
    }
    if (submission.difficulty_rating) {
      submissionContent += `Student rated the difficulty as: ${submission.difficulty_rating}\n\n`
    }
    if (submission.is_late) {
      submissionContent += `Note: This submission was late.\n`
    }

    // ── Type-specific prompt instructions ──
    const typePrompts: Record<string, string> = {
      writing: `This is a WRITING assignment. Analyze the student's written English text.
Provide:
1. overall_score (1-10): How well did they write overall?
2. overall_feedback: 2-3 sentences in Arabic. Be warm, use their name, mention their progress compared to previous work.
3. grammar_errors: Array of {error, correction, rule} — max 5 errors found. Show the wrong text, the correct version, and explain the rule in Arabic.
4. vocabulary_suggestions: Array of {original, better, reason} — max 3 suggestions for better word choices.
5. structure_assessment: 1-2 sentences in Arabic about text organization and coherence.
6. improvement_tips: 2-3 specific, actionable tips in Arabic.
7. corrected_text: The student's full text with corrections applied (in English).
8. trainer_feedback_text: A clean, ready-to-send Arabic feedback paragraph (2-4 sentences) that a trainer would write — NO JSON, NO formatting, just natural Arabic text suitable for direct use.`,

      speaking: `This is a SPEAKING assignment. Analyze the student's spoken English (from transcription).
Provide:
1. overall_score (1-10): How well did they speak overall?
2. overall_feedback: 2-3 sentences in Arabic. Be warm, use their name.
3. fluency_assessment: 1-2 sentences in Arabic about their fluency and natural speech flow.
4. confidence_level: One of "منخفضة", "متوسطة", "جيدة", "ممتازة"
5. grammar_notes: Array of {issue, suggestion} — max 4. In Arabic.
6. vocabulary_range: 1-2 sentences in Arabic about word variety.
7. pronunciation_notes: 1-2 sentences in Arabic (based on common patterns in transcription).
8. improvement_tips: 2-3 specific tips in Arabic.
9. trainer_feedback_text: A clean Arabic feedback paragraph for the trainer to send directly.`,

      listening: `This is a LISTENING assignment. The student listened to content and submitted a response.
Provide:
1. overall_score (1-10): Based on their summary/response quality.
2. overall_feedback: 2-3 sentences in Arabic. Encouraging and personal.
3. comprehension_assessment: How well did they understand the main points? 1-2 sentences in Arabic.
4. grammar_notes: Array of {issue, suggestion} if they wrote/spoke a response — max 3.
5. listening_tips: 2-3 strategies for better listening in Arabic.
6. improvement_tips: 2-3 actionable tips.
7. trainer_feedback_text: Clean Arabic feedback paragraph.`,

      reading: `This is a READING assignment. The student read material and submitted proof/response.
Provide:
1. overall_score (1-10): Based on completion and engagement.
2. overall_feedback: 2-3 sentences in Arabic. Reference their reading consistency.
3. completion_note: Acknowledge their effort. If they rated difficulty, comment on it.
4. reading_streak: Note how many reading assignments they've completed recently (from their history).
5. improvement_tips: 2-3 tips for better reading habits in Arabic.
6. next_level_suggestion: Suggest what reading level/material to try next.
7. trainer_feedback_text: Clean Arabic feedback paragraph.`,

      grammar: `This is a GRAMMAR worksheet assignment. The student submitted their work.
Provide:
1. overall_score (1-10): Based on what's visible from their submission.
2. overall_feedback: 2-3 sentences in Arabic. Encouraging.
3. grammar_focus: What grammar area this likely covers, based on context.
4. consistency_note: Note their submission pattern (are they consistent?).
5. improvement_tips: 2-3 grammar study tips in Arabic.
6. trainer_feedback_text: Clean Arabic feedback paragraph.`,

      vocabulary: `This is a VOCABULARY assignment. The student practiced vocabulary.
Provide:
1. overall_score (1-10): Based on their vocabulary usage.
2. overall_feedback: 2-3 sentences in Arabic. Personal and encouraging.
3. word_usage_assessment: How well did they use the vocabulary? 1-2 sentences.
4. improvement_tips: 2-3 tips for vocabulary retention in Arabic.
5. trainer_feedback_text: Clean Arabic feedback paragraph.`,
    }

    const typePrompt = typePrompts[assignmentType] || `This is a ${assignmentType} assignment. Provide general feedback.
Provide:
1. overall_score (1-10)
2. overall_feedback: 2-3 sentences in Arabic, warm and encouraging.
3. completion_note: Acknowledge the submission.
4. improvement_tips: 2-3 tips in Arabic.
5. trainer_feedback_text: Clean Arabic feedback paragraph.`

    // ── Build the full Claude prompt ──
    const systemPrompt = `You are a personal English tutor named "فلونتيا" for Arab students at Fluentia Academy.

STUDENT PROFILE:
- Name: ${studentName}
- Level: ${cefrLevel}
- Package: ${packageName}
- XP: ${student?.xp_total || 0} points, Streak: ${student?.current_streak || 0} days
- ${skillCtx}

RECENT PERFORMANCE (last 10 graded assignments):
${recentGrades || 'No graded assignments yet — this may be their first!'}

PREVIOUS AI SUGGESTIONS (avoid repeating these):
${prevSuggestions || 'None yet'}

ASSIGNMENT:
- Title: "${assignmentTitle}"
- Type: ${assignmentType}
- Instructions: "${assignmentInstructions || 'No specific instructions provided'}"

${typePrompt}

CRITICAL RULES:
- ALL text output must be in Arabic (except English examples/corrections)
- Use the student's name (${studentName}) naturally in feedback
- Reference their progress trajectory ("ملاحظ تطورك..." or "مقارنة بالواجبات السابقة...")
- Be warm, encouraging, and specific — like a supportive personal teacher
- The trainer_feedback_text MUST be clean Arabic prose — no JSON, no formatting, no English keys. It should read perfectly if pasted into a WhatsApp message.
- Respond ONLY with valid JSON — no markdown, no code blocks, no backticks.`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: submissionContent || 'The student submitted this assignment (content not available as text — may be image/file upload).',
        }],
      }),
    })

    if (!claudeRes.ok) {
      const errBody = await claudeRes.text()
      console.error('[ai-submission-feedback] Claude API error:', claudeRes.status, errBody)
      const statusMsg = claudeRes.status === 401 ? 'مفتاح API غير صالح'
        : claudeRes.status === 429 ? 'تم تجاوز حد الاستخدام — حاول بعد قليل'
        : claudeRes.status === 529 ? 'الخدمة مشغولة — حاول مرة أخرى'
        : `خطأ في خدمة الذكاء الاصطناعي (${claudeRes.status})`
      return new Response(
        JSON.stringify({ error: statusMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    const claudeData = await claudeRes.json()
    let responseText = claudeData.content?.[0]?.text || '{}'
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    // Clean markdown code blocks if present
    responseText = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    let feedback: any
    try {
      feedback = JSON.parse(responseText)
    } catch {
      // If JSON parse fails, create a structured response from the raw text
      feedback = {
        overall_score: 5,
        overall_feedback: responseText,
        trainer_feedback_text: responseText,
        improvement_tips: [],
      }
    }

    // Ensure trainer_feedback_text exists
    if (!feedback.trainer_feedback_text) {
      feedback.trainer_feedback_text = feedback.overall_feedback || ''
    }

    // Add metadata
    feedback.assignment_type = assignmentType
    feedback.student_name = studentName
    if (transcript && !submission.content_voice_transcript) {
      feedback.transcript = transcript
    }

    // Log cost
    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75
    const { data: trainerRecord } = await supabase.from('trainers').select('id').eq('id', user.id).single()
    const { error: usageErr } = await supabase.from('ai_usage').insert({
      type: assignmentType === 'speaking' ? 'speaking_analysis' : 'writing_feedback',
      trainer_id: trainerRecord ? user.id : null,
      student_id: submission.student_id,
      model: 'claude-sonnet',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_sar: costSAR.toFixed(4),
    })
    if (usageErr) console.error('Usage log error:', usageErr.message)

    // Save AI feedback on submission
    await supabase.from('submissions').update({ ai_feedback: feedback }).eq('id', submission_id)

    return new Response(
      JSON.stringify({ feedback, transcript: transcript || null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[ai-submission-feedback] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
