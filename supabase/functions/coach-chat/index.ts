// Fluentia LMS — AI Coach Chat (B4)
// Streaming conversational tutor for Foundation writing + speaking tasks.
// SSE streaming, prompt caching, 20-message cap, pedagogical guardrails.
// Deploy: supabase functions deploy coach-chat --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MESSAGE_CAP = 20

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Task-type context extractor (same as generate-task-briefing hotfix) ──────
function extractTaskTypeContext(profile: any, taskType: string) {
  if (!profile) return null
  const writingKeywords = ['كتاب','كتب','جملة','فقرة','نص','قواعد','نحو','ضمير','كلمة','writing','grammar','spelling','انخفاض','تراجع']
  const speakingKeywords = ['تحدث','تسجيل','ثانية','دقيقة','صوت','نطق','محادثة','speaking','fluency','pronunciation','مدة']
  const genericKeywords  = ['مستوى','استمرار','تطور','تحسن','أداء','إكمال','انتظام']
  const typeKeywords = taskType === 'writing' ? writingKeywords : speakingKeywords
  const filter = (items: string[]) => (items || []).filter(s => {
    const lower = s.toLowerCase()
    const otherKws = taskType === 'writing' ? speakingKeywords : writingKeywords
    if (otherKws.some(k => lower.includes(k.toLowerCase()))) return false
    return typeKeywords.some(k => lower.includes(k.toLowerCase())) || genericKeywords.some(k => lower.includes(k))
  })
  return {
    skill_score: profile.skills?.[taskType] ?? null,
    strengths: filter(profile.strengths || []).slice(0, 3),
    weaknesses: filter(profile.weaknesses || []).slice(0, 2),
  }
}

const COACH_SYSTEM_PROMPT = `You are an English coach for a Saudi Arabic-speaking student at Fluentia Academy (Saudi Arabia).

ABSOLUTE RULES — DO NOT VIOLATE:
1. NEVER write the complete answer for the student. If asked "اكتب لي الفقرة" or "اعطيني الإجابة" or similar, politely refuse and give scaffolded help instead (guiding questions, structure tips, vocabulary they could use — NOT the full text).
2. ONLY discuss the skill type of the current task. If the student asks about another skill, redirect: "نحن الآن نشتغل على [skill] — خل نركز هنا."
3. Arabic for all explanations. English only for examples and when correcting the student's English text.
4. Keep responses CONCISE — 2-4 sentences maximum for most replies. Use bullet lists only when listing corrections or options.
5. Warm and encouraging but not sycophantic. Don't overuse "ممتاز!". Vary encouragement.
6. When the student is stuck, ask ONE Socratic question to guide them. Don't dump information at them.
7. Your knowledge is bounded to this conversation and the context provided below. Never claim to remember things from outside.
8. If asked about something completely unrelated to English learning or this specific task, briefly redirect.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Auth ──────────────────────────────────────────
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  if (!token) return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })

  const { data: { user }, error: authErr } = await supa.auth.getUser(token)
  if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })

  // ── Parse body ────────────────────────────────────
  let body: { task_id?: string; task_type?: string; message?: string; draft_text?: string }
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }) }

  const { task_id, task_type, message, draft_text = '' } = body
  if (!task_id || !task_type || !message?.trim()) return new Response(JSON.stringify({ error: 'task_id, task_type, message required' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  if (!['writing', 'speaking'].includes(task_type)) return new Response(JSON.stringify({ error: 'task_type must be writing or speaking' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })

  const studentId = user.id

  if (!CLAUDE_API_KEY) return new Response(JSON.stringify({ error: 'المدرّب غير متاح حالياً' }), { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } })

  // ── Load or create conversation ───────────────────
  let { data: conv } = await supa
    .from('coach_conversations')
    .select('*')
    .eq('student_id', studentId)
    .eq('task_id', task_id)
    .eq('task_type', task_type)
    .maybeSingle()

  if (!conv) {
    const { data: created } = await supa
      .from('coach_conversations')
      .insert({ student_id: studentId, task_id, task_type })
      .select()
      .single()
    conv = created
  }

  if (!conv) return new Response(JSON.stringify({ error: 'Failed to create conversation' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })

  // ── 20-message cap ────────────────────────────────
  if ((conv.message_count || 0) >= MESSAGE_CAP) {
    return new Response(JSON.stringify({
      error: 'message_cap_reached',
      message_ar: `وصلت للحد الأقصى من الرسائل (${MESSAGE_CAP}). أكمل التاسك بنفسك — أنت قادر!`,
      messages_remaining: 0,
    }), { status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // ── Fetch context (parallel) ──────────────────────
  const taskTable = task_type === 'writing' ? 'curriculum_writing' : 'curriculum_speaking'
  const [
    { data: taskRow },
    { data: profile },
    { data: historyRows },
    { data: recentScores },
    { data: studentRow },
  ] = await Promise.all([
    supa.from(taskTable)
      .select('title_en, title_ar, prompt_en, prompt_ar, curriculum_units!unit_id(theme_ar, theme_en, curriculum_levels!level_id(level_number))')
      .eq('id', task_id)
      .maybeSingle(),
    supa.from('ai_student_profiles')
      .select('strengths, weaknesses, skills, summary_ar')
      .eq('student_id', studentId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supa.from('coach_messages')
      .select('role, content')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
      .limit(10),
    task_type === 'writing'
      ? supa.from('student_curriculum_progress')
          .select('ai_feedback')
          .eq('student_id', studentId)
          .eq('section_type', 'writing')
          .eq('evaluation_status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(5)
      : supa.from('speaking_recordings')
          .select('ai_evaluation')
          .eq('student_id', studentId)
          .eq('evaluation_status', 'completed')
          .order('created_at', { ascending: false })
          .limit(5),
    supa.from('students').select('academic_level').eq('id', studentId).maybeSingle(),
  ])

  const level = taskRow?.curriculum_units?.curriculum_levels?.level_number ?? studentRow?.academic_level ?? 2
  const CEFR: Record<number, string> = { 0:'ما قبل A1', 1:'A1 مبتدئ', 2:'A2 أساسي', 3:'B1 متوسط', 4:'B2 فوق المتوسط', 5:'C1 متقدم' }
  const cefr = CEFR[level] || CEFR[2]

  // Filtered profile context
  const profileCtx = extractTaskTypeContext(profile, task_type)
  const scores = (task_type === 'writing'
    ? (recentScores || []).map((r: any) => r.ai_feedback?.overall_score ?? r.ai_feedback?.fluency_score)
    : (recentScores || []).map((r: any) => r.ai_evaluation?.overall_score)
  ).filter(Boolean) as number[]

  const taskTypeAr = task_type === 'writing' ? 'الكتابة' : 'التحدث'
  const taskTitle = taskRow?.title_ar || taskRow?.title_en || taskRow?.curriculum_units?.theme_ar || taskTypeAr
  const taskPrompt = taskRow?.prompt_ar || taskRow?.prompt_en || ''

  const lastScore = scores[0] ?? null
  const compactBriefing = lastScore != null
    ? `آخر ${taskTypeAr}: ${lastScore}/10 · ركّز: ${profileCtx?.weaknesses?.[0] || 'استمر في التحسن'}`
    : `ابدأ بثقة — المدرّب معك`

  const studentContext = `STUDENT CONTEXT (${task_type} only — ignore other skills):
- المستوى: ${cefr}
- آخر ${scores.length} نتائج ${taskTypeAr}: ${scores.length ? scores.map(s=>`${s}/10`).join(', ') : 'لا توجد بعد'}
- نقاط القوة في ${taskTypeAr}: ${profileCtx?.strengths?.join('، ') || 'غير متوفر بعد'}
- نقاط التطوير في ${taskTypeAr}: ${profileCtx?.weaknesses?.join('، ') || 'غير متوفر بعد'}

THIS TASK:
- العنوان: ${taskTitle}
- الموضوع: ${taskPrompt.slice(0, 300)}`

  // Build messages array (history + new message)
  const history = (historyRows || []).map((m: any) => ({ role: m.role, content: m.content }))
  const userContent = `الطالب${task_type === 'writing' ? 'ة' : ''} يسأل: "${message.trim()}"

${task_type === 'writing' ? `نص الطالبة الحالي في التاسك:\n"""\n${draft_text?.trim() || '(لم تبدأ الكتابة بعد)'}\n"""` : `(موضوع التحدث — لا توجد مسودة نصية)`}`

  // ── Streaming response ────────────────────────────
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const enc = new TextEncoder()

  const processStream = async () => {
    let fullText = ''
    let inputTokens = 0
    let outputTokens = 0
    let cacheCreation = 0
    let cacheRead = 0

    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          temperature: 0.4,
          stream: true,
          system: [
            { type: 'text', text: COACH_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: studentContext, cache_control: { type: 'ephemeral' } },
          ],
          messages: [
            ...history,
            { role: 'user', content: userContent },
          ],
        }),
      })

      if (!claudeRes.ok) {
        const errText = await claudeRes.text()
        console.error('[coach-chat] Claude error:', errText)
        await writer.write(enc.encode(`data: ${JSON.stringify({ error: 'المدرّب غير متاح حالياً. حاول بعد دقيقة.' })}\n\n`))
        await writer.close()
        return
      }

      const reader = claudeRes.body!.getReader()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += new TextDecoder().decode(value)
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''  // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (!data || data === '[DONE]') continue

          try {
            const event = JSON.parse(data)
            if (event.type === 'content_block_delta' && event.delta?.text) {
              fullText += event.delta.text
              await writer.write(enc.encode(`data: ${JSON.stringify({ token: event.delta.text })}\n\n`))
            } else if (event.type === 'message_start' && event.message?.usage) {
              inputTokens = event.message.usage.input_tokens || 0
              cacheCreation = event.message.usage.cache_creation_input_tokens || 0
              cacheRead = event.message.usage.cache_read_input_tokens || 0
            } else if (event.type === 'message_delta' && event.usage) {
              outputTokens = event.usage.output_tokens || 0
            }
          } catch { /* ignore malformed event */ }
        }
      }
    } catch (e: any) {
      console.error('[coach-chat] Stream error:', e.message)
      if (fullText) {
        fullText += ' [stream interrupted]'
      } else {
        await writer.write(enc.encode(`data: ${JSON.stringify({ error: 'تعذّر الاتصال بالمدرّب. حاول مرة ثانية.' })}\n\n`))
        await writer.close()
        return
      }
    }

    // ── Post-stream: save to DB ─────────────────────
    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75
    const newMsgCount = (conv!.message_count || 0) + 2

    await Promise.all([
      // Insert user message
      supa.from('coach_messages').insert({
        conversation_id: conv!.id,
        role: 'user',
        content: userContent,
        draft_snapshot: draft_text || null,
      }),
      // Insert assistant message
      supa.from('coach_messages').insert({
        conversation_id: conv!.id,
        role: 'assistant',
        content: fullText,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_sar: costSAR.toFixed(4),
      }),
      // Update conversation stats
      supa.from('coach_conversations').update({
        message_count: newMsgCount,
        last_message_at: new Date().toISOString(),
        total_cost_sar: (parseFloat(conv!.total_cost_sar || '0') + costSAR).toFixed(4),
      }).eq('id', conv!.id),
      // Log to ai_usage
      supa.from('ai_usage').insert({
        type: 'chatbot',
        student_id: studentId,
        model: 'claude-sonnet-4-20250514',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost_sar: costSAR.toFixed(4),
      }),
    ])

    const remaining = Math.max(0, MESSAGE_CAP - newMsgCount)
    await writer.write(enc.encode(`data: ${JSON.stringify({
      done: true,
      messages_remaining: remaining,
      compact_briefing: compactBriefing,
      cache_read: cacheRead,
    })}\n\n`))
    await writer.close()
  }

  processStream().catch(async (e) => {
    console.error('[coach-chat] Unhandled error:', e.message)
    try { await writer.close() } catch {}
  })

  return new Response(readable, {
    headers: {
      ...CORS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Compact-Briefing': encodeURIComponent(compactBriefing),
    },
  })
})
