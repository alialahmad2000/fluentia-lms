// Fluentia LMS — Evaluate Speaking Practice Attempt (AI Coach B3)
// Light Whisper + Sonnet micro-feedback for 30s practice sentences.
// 5 attempts/task cap. Results stored in speaking_practice_attempts (not speaking_recordings).
// Deploy: supabase functions deploy evaluate-practice-attempt --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PRACTICE_CAP = 5
const MAX_DURATION_SEC = 30
const MIN_DURATION_SEC = 2

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { ...CORS, 'Content-Type': 'application/json' } })
}
function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 60000): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    return res
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error(`Request timed out after ${ms}ms`)
    throw e
  } finally { clearTimeout(timer) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Auth ──
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  if (!token) return err('Missing authorization', 401)

  const { data: { user }, error: authErr } = await supa.auth.getUser(token)
  if (authErr || !user) return err('Unauthorized', 401)

  // ── Parse body ──
  let body: { student_id?: string; task_id?: string; audio_path?: string; duration_sec?: number }
  try { body = await req.json() } catch { return err('Invalid JSON') }

  const { student_id, task_id, audio_path, duration_sec = 0 } = body
  if (!student_id || !task_id || !audio_path) return err('student_id, task_id, audio_path required')

  if (user.id !== student_id) return err('Forbidden', 403)

  // ── Duration guard ──
  if (duration_sec < MIN_DURATION_SEC) {
    return ok({ error: true, message_ar: 'تسجيل قصير جداً. سجل جملة كاملة (ثانيتين على الأقل)', feedback: null })
  }
  if (duration_sec > MAX_DURATION_SEC) {
    return ok({ error: true, message_ar: 'للممارسة، سجل جملة وحدة فقط (أقل من 30 ثانية)', feedback: null })
  }

  // ── Per-task attempt cap ──
  const { count: existingCount } = await supa
    .from('speaking_practice_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', student_id)
    .eq('task_id', task_id)

  const usedAttempts = existingCount ?? 0
  if (usedAttempts >= PRACTICE_CAP) {
    return ok({
      error: true,
      message_ar: `استنفدت محاولاتك التدريبية (${PRACTICE_CAP} من ${PRACTICE_CAP}). انتقل للتسجيل النهائي!`,
      attempts_used: usedAttempts,
      attempts_remaining: 0,
      feedback: null,
    })
  }

  // ── Fetch task context ──
  const { data: taskRow } = await supa
    .from('curriculum_speaking')
    .select('title_en, title_ar, topic_type, prompt_en, prompt_ar, curriculum_units!unit_id(curriculum_levels!level_id(level_number))')
    .eq('id', task_id)
    .maybeSingle()

  const taskTitle = taskRow?.title_ar || taskRow?.title_en || 'موضوع التحدث'
  const taskTopic = taskRow?.prompt_ar || taskRow?.prompt_en || ''

  // ── Download audio via service role ──
  const { data: audioBlob, error: dlErr } = await supa.storage
    .from('voice-notes')
    .download(audio_path)

  if (dlErr || !audioBlob) {
    return ok({ error: true, message_ar: 'تعذّر تحميل الصوت. جرب مرة ثانية', feedback: null })
  }

  const audioBytes = new Uint8Array(await audioBlob.arrayBuffer())
  const mimeType = audioBlob.type || 'audio/webm'
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('m4a') ? 'm4a' : mimeType.includes('wav') ? 'wav' : 'webm'

  // ── Whisper transcription ──
  let transcript = ''
  let whisperCostSAR = 0

  if (!OPENAI_API_KEY) {
    // Fallback without Whisper
    transcript = '[لا يمكن تفريغ الصوت]'
  } else {
    try {
      const formData = new FormData()
      formData.append('file', new Blob([audioBytes], { type: mimeType }), `practice.${ext}`)
      formData.append('model', 'whisper-1')
      formData.append('language', 'en')
      formData.append('response_format', 'text')

      const whisperRes = await fetchWithTimeout(
        'https://api.openai.com/v1/audio/transcriptions',
        { method: 'POST', headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, body: formData },
        60000
      )

      if (whisperRes.ok) {
        transcript = (await whisperRes.text()).trim()
        const minutes = Math.max(0.1, duration_sec / 60)
        whisperCostSAR = minutes * 0.006 * 3.75
      } else {
        transcript = '[تعذر تفريغ الصوت]'
      }
    } catch {
      transcript = '[تعذر تفريغ الصوت]'
    }
  }

  // ── Light Sonnet micro-feedback ──
  let feedback: any = null
  let claudeCostSAR = 0

  if (!CLAUDE_API_KEY) {
    feedback = {
      transcript_check: 'unclear',
      pronunciation_notes: null,
      fluency_note: null,
      suggestion: 'سجل في مكان هادي وواضح للحصول على ملاحظات',
      score_1to10: null,
      encouragement: 'استمر في التدريب!',
    }
  } else if (transcript && !transcript.startsWith('[')) {
    try {
      const systemPrompt = `أنت مدرب نطق إنجليزي لطالبة سعودية. أعطِ ملاحظات مختصرة وعملية فقط.`
      const userPrompt = `الطالبة تتدرب قبل مهمة التحدث.

المهمة: ${taskTitle}
الموضوع: ${taskTopic}
مدة التسجيل: ${duration_sec} ثانية
ما قالته (Whisper): "${transcript}"

أعطِ ONLY هذا JSON بدون markdown:
{
  "transcript_check": "yes|no|partial",
  "pronunciation_notes": "ملاحظة واحدة محددة عن النطق أو null",
  "fluency_note": "ملاحظة واحدة عن الطلاقة أو null",
  "suggestion": "اقتراح واحد محدد وعملي للمحاولة الجاية",
  "score_1to10": <integer 1-10 واقعي وليس دائماً 7>,
  "encouragement": "جملة تشجيع قصيرة وصادقة"
}

RULES:
- كل شيء بالعربية.
- كل جملة أقل من 15 كلمة.
- score_1to10: متنوع وواقعي — جملة بسيطة = 4-5، جملة ممتازة = 8-9.
- لا تقل "حاول مرة ثانية" فقط — كن محدداً.`

      const claudeRes = await fetchWithTimeout(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 400,
            temperature: 0.2,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        },
        60000
      )

      if (claudeRes.ok) {
        const claudeData = await claudeRes.json()
        const rawText: string = claudeData.content?.[0]?.text || ''
        const start = rawText.indexOf('{'), end = rawText.lastIndexOf('}') + 1
        if (start !== -1 && end > start) {
          try {
            feedback = JSON.parse(rawText.slice(start, end))
          } catch {
            feedback = {
              transcript_check: 'yes',
              pronunciation_notes: null,
              fluency_note: null,
              suggestion: 'استمر في التدريب وحاول جملة أطول',
              score_1to10: 5,
              encouragement: 'أحسنت! واصل.',
            }
          }
        }
        const inputT = claudeData.usage?.input_tokens || 0
        const outputT = claudeData.usage?.output_tokens || 0
        claudeCostSAR = ((inputT * 3 + outputT * 15) / 1_000_000) * 3.75
      }
    } catch (e: any) {
      console.error('[evaluate-practice-attempt] Claude error:', e.message)
      feedback = {
        transcript_check: 'yes',
        pronunciation_notes: null,
        fluency_note: null,
        suggestion: 'واصل التدريب وركّز على الطلاقة',
        score_1to10: 5,
        encouragement: 'أحسنت! استمر.',
      }
    }
  } else {
    feedback = {
      transcript_check: 'unclear',
      pronunciation_notes: null,
      fluency_note: null,
      suggestion: 'ما قدرنا نسمع تسجيلك بوضوح. جرب مكان أهدأ',
      score_1to10: null,
      encouragement: 'لا تستسلم — جرب مرة ثانية!',
    }
  }

  // ── INSERT practice attempt ──
  const attemptNumber = usedAttempts + 1
  const totalCostSAR = whisperCostSAR + claudeCostSAR

  const { error: insertErr } = await supa.from('speaking_practice_attempts').insert({
    student_id,
    task_id,
    attempt_number: attemptNumber,
    audio_path,
    audio_duration_sec: duration_sec,
    transcript: transcript || null,
    feedback: feedback || null,
    cost_sar: totalCostSAR.toFixed(4),
  })

  if (insertErr) {
    console.error('[evaluate-practice-attempt] Insert error:', insertErr.message)
    // Don't block — still return feedback
  }

  // ── Log ai_usage ──
  if (whisperCostSAR > 0) {
    await supa.from('ai_usage').insert({
      type: 'whisper_transcription',
      student_id,
      model: 'whisper-1',
      audio_seconds: duration_sec,
      estimated_cost_sar: whisperCostSAR.toFixed(4),
    })
  }
  if (claudeCostSAR > 0) {
    await supa.from('ai_usage').insert({
      type: 'speaking_analysis',
      student_id,
      model: 'claude-sonnet-4-20250514',
      estimated_cost_sar: claudeCostSAR.toFixed(4),
    })
  }

  return ok({
    ok: true,
    attempt_number: attemptNumber,
    attempts_used: attemptNumber,
    attempts_remaining: Math.max(0, PRACTICE_CAP - attemptNumber),
    transcript,
    feedback,
    cost_sar: totalCostSAR.toFixed(4),
  })
})
