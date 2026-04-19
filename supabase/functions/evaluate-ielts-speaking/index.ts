// Fluentia LMS — IELTS Speaking Evaluation Edge Function
// Downloads audio from ielts-speaking-submissions, transcribes via Whisper, evaluates via Claude
// Input: { audio_paths: string[], part_num: 1|2|3, questions: string[], cue_card?: object }
// Output: { overall_band, criteria, transcripts, feedback_ar, strengths, weaknesses }
// Deploy: supabase functions deploy evaluate-ielts-speaking

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Monthly limits (same as evaluate-writing)
const SPEAKING_LIMITS: Record<string, number> = { asas: 5, talaqa: 10, tamayuz: 20, ielts: 30 }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status,
  })
}

function getPartSystemPrompt(partNum: number, cueCard: any): string {
  const baseRubric = `You are an IELTS Speaking examiner. Evaluate the candidate's spoken answers.

IELTS Speaking Criteria (all scored 0-9, half-bands allowed e.g. 6.5):
1. Fluency & Coherence: pace, hesitation, logical flow, linking
2. Lexical Resource: range, accuracy, collocations, uncommon vocabulary
3. Grammatical Range & Accuracy: range of structures, error frequency
4. Pronunciation: phonemic accuracy, word stress, intonation, intelligibility
  (NOTE: pronunciation is estimated from transcript — flag uncertainty)

Overall Band = arithmetic average of 4 criteria, rounded to nearest 0.5.

IMPORTANT: Use the full 0-9 range. Band 5 = modest competence, 6 = modest to competent, 7 = good, 8 = very good. Do NOT default to 7 for all criteria.`

  if (partNum === 2) {
    const cueText = cueCard
      ? `\nCue Card:\n${cueCard.prompt || ''}\nBullets: ${(cueCard.bullet_points || []).join(', ')}`
      : ''
    return `${baseRubric}${cueText}

This is Part 2 (Long Turn). The candidate had 1 minute to prepare. Evaluate as a 1-2 minute monologue.
Respond ONLY with valid JSON (no markdown):
{
  "overall_band": <0-9 half-band>,
  "criteria": {
    "fluency_coherence": <0-9 half-band>,
    "lexical_resource": <0-9 half-band>,
    "grammatical_range": <0-9 half-band>,
    "pronunciation": <0-9 half-band>
  },
  "feedback_ar": "<3-4 sentences in Arabic: strengths + weaknesses + next steps>",
  "strengths": ["<Arabic string>", "<Arabic string>"],
  "weaknesses": ["<Arabic string>", "<Arabic string>"],
  "per_question_feedback": [{"q_index": 0, "note_ar": "<brief Arabic note>"}]
}`
  }

  const partLabel = partNum === 1 ? 'Part 1 (Introduction & Interview)' : 'Part 3 (Two-way Discussion)'
  return `${baseRubric}

This is ${partLabel}. You will see multiple Q&A pairs labeled Q1/A1, Q2/A2 etc.
Evaluate the responses holistically as one speaking session.
Respond ONLY with valid JSON (no markdown):
{
  "overall_band": <0-9 half-band>,
  "criteria": {
    "fluency_coherence": <0-9 half-band>,
    "lexical_resource": <0-9 half-band>,
    "grammatical_range": <0-9 half-band>,
    "pronunciation": <0-9 half-band>
  },
  "feedback_ar": "<3-4 sentences in Arabic: strengths + weaknesses + next steps>",
  "strengths": ["<Arabic string>", "<Arabic string>"],
  "weaknesses": ["<Arabic string>", "<Arabic string>"],
  "per_question_feedback": [
    {"q_index": 0, "note_ar": "<brief Arabic note>"},
    {"q_index": 1, "note_ar": "<brief Arabic note>"}
  ]
}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // ── Auth ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing authorization' }, 401)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    // ── Parse body ──
    let body: any
    try { body = await req.json() } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400)
    }

    const { audio_paths, part_num, questions, cue_card } = body

    if (!Array.isArray(audio_paths) || audio_paths.length === 0) {
      return jsonResponse({ error: 'audio_paths array required' }, 400)
    }
    if (![1, 2, 3].includes(part_num)) {
      return jsonResponse({ error: 'part_num must be 1, 2, or 3' }, 400)
    }

    // ── Get student data ──
    const { data: student } = await supabase.from('students')
      .select('id, package, custom_access')
      .eq('id', user.id)
      .single()

    if (!student) return jsonResponse({ error: 'Student not found' }, 403)

    const hasAccess = student.package === 'ielts' ||
      (Array.isArray(student.custom_access) && student.custom_access.includes('ielts'))
    if (!hasAccess) return jsonResponse({ error: 'IELTS access required', access_denied: true }, 403)

    // ── Monthly quota check ──
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { count: usedCount } = await supabase.from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('type', 'speaking_analysis')
      .gte('created_at', monthStart.toISOString())

    const limit = SPEAKING_LIMITS[student.package] || 5
    if ((usedCount || 0) >= limit) {
      return jsonResponse({
        error: `وصلت للحد الشهري (${limit} تقييم). الباقة الأعلى تعطيك أكثر!`,
        limit_reached: true,
      }, 429)
    }

    // ── Budget cap check ──
    const { data: settings } = await supabase.from('system_settings')
      .select('value').eq('key', 'ai_monthly_budget').single()
    const budgetCap = parseFloat(settings?.value || '50')
    const { data: costData } = await supabase.from('ai_usage')
      .select('estimated_cost_sar').gte('created_at', monthStart.toISOString())
    const totalCost = (costData || []).reduce((s: number, r: any) => s + parseFloat(r.estimated_cost_sar || 0), 0)
    if (totalCost >= budgetCap) {
      return jsonResponse({ error: 'تم الوصول للحد الشهري للذكاء الاصطناعي', budget_reached: true }, 429)
    }

    if (!OPENAI_API_KEY || !CLAUDE_API_KEY) {
      return jsonResponse({ error: 'AI services not configured', skipped: true }, 503)
    }

    // ── Step 1: Transcribe each audio via Whisper ──
    const transcripts: string[] = []
    let totalAudioSeconds = 0

    for (const audioPath of audio_paths) {
      // Download from ielts-speaking-submissions bucket
      const { data: fileData, error: dlErr } = await supabase.storage
        .from('ielts-speaking-submissions')
        .download(audioPath)

      if (dlErr || !fileData) {
        console.error('[evaluate-ielts-speaking] Download failed:', dlErr?.message, audioPath)
        transcripts.push('[تعذّر تحميل التسجيل]')
        continue
      }

      const ext = audioPath.endsWith('.mp4') ? 'mp4' : 'webm'
      const mime = ext === 'mp4' ? 'audio/mp4' : 'audio/webm'
      const arrayBuffer = await fileData.arrayBuffer()
      totalAudioSeconds += Math.ceil(arrayBuffer.byteLength / 16000) // rough estimate

      // Call OpenAI Whisper
      const formData = new FormData()
      formData.append('file', new Blob([arrayBuffer], { type: mime }), `audio.${ext}`)
      formData.append('model', 'whisper-1')
      formData.append('language', 'en')

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      })

      if (!whisperRes.ok) {
        console.error('[evaluate-ielts-speaking] Whisper error:', await whisperRes.text())
        transcripts.push('[فشل التفريغ النصي]')
        continue
      }

      const whisperData = await whisperRes.json()
      transcripts.push(whisperData.text || '[نص فارغ]')
    }

    // ── Step 2: Build Claude prompt ──
    const qs = Array.isArray(questions) ? questions : []
    let userContent = ''
    for (let i = 0; i < transcripts.length; i++) {
      const qText = qs[i] || `Question ${i + 1}`
      userContent += `Q${i + 1}: ${qText}\nA${i + 1}: ${transcripts[i]}\n\n`
    }

    const systemPrompt = getPartSystemPrompt(part_num, cue_card)

    // ── Step 3: Call Claude ──
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent.trim() }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      console.error('[evaluate-ielts-speaking] Claude error:', err)
      return jsonResponse({ error: 'التقييم التلقائي غير متاح — حاول مرة أخرى', ai_unavailable: true }, 503)
    }

    const claudeData = await claudeRes.json()
    const responseText = claudeData.content?.[0]?.text || '{}'
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    // ── Step 4: Parse response ──
    let evaluation: any
    try {
      let clean = responseText
      const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fenceMatch) clean = fenceMatch[1]
      const first = clean.indexOf('{')
      const last = clean.lastIndexOf('}')
      if (first !== -1 && last > first) clean = clean.slice(first, last + 1)
      evaluation = JSON.parse(clean)
    } catch {
      console.error('[evaluate-ielts-speaking] JSON parse failed:', responseText.slice(0, 300))
      return jsonResponse({ error: 'فشل في تحليل نتيجة التقييم — حاول مرة أخرى', parse_failed: true }, 500)
    }

    // Validate band range
    const band = evaluation.overall_band
    if (typeof band !== 'number' || band < 0 || band > 9) {
      return jsonResponse({ error: 'نتيجة التقييم خارج النطاق المتوقع', invalid_band: true }, 500)
    }

    // ── Step 5: Write ai_usage ──
    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75 +
      (totalAudioSeconds * 0.006 / 60 * 3.75) // Whisper ~$0.006/min

    await supabase.from('ai_usage').insert({
      type: 'speaking_analysis',
      student_id: user.id,
      model: 'claude-sonnet',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      audio_seconds: totalAudioSeconds,
      estimated_cost_sar: costSAR.toFixed(4),
    })

    return jsonResponse({
      overall_band: evaluation.overall_band,
      criteria: evaluation.criteria || {},
      transcripts,
      feedback_ar: evaluation.feedback_ar || '',
      strengths: evaluation.strengths || [],
      weaknesses: evaluation.weaknesses || [],
      per_question_feedback: evaluation.per_question_feedback || [],
    })

  } catch (error: any) {
    console.error('[evaluate-ielts-speaking] Error:', error.message)
    return jsonResponse({ error: error.message }, 500)
  }
})
