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

// A pattern tutor is a different job from a task coach. The coach must never
// write the student's answer; here, explaining fully IS the point — the study
// sheet's check is a private self-check that is graded in the browser and saved
// nowhere, so there is no answer to protect. What this prompt protects instead
// is the ENGLISH-FIRST order the owner asked for, and the example count: the
// sheet gives two, and a student who is still asking needs more than two.
const TUTOR_SYSTEM_PROMPT = `You are an English teacher explaining ONE specific language pattern to a Saudi Arabic-speaking student at Fluentia Academy. The pattern comes from a reading passage she has just studied, and she is looking at it right now in her study sheet.

WHAT YOU ARE FOR
Make this pattern click. Explain it a different way than the sheet did, give MORE examples than the sheet did, answer the question she actually asked, and check she understood.

ABSOLUTE RULES — DO NOT VIOLATE:
1. Stay on THIS pattern. If she asks about a different point, answer in one line and bring her back to this one.
2. ENGLISH FIRST, ALWAYS. Lead with the English: the rule in one short English line, then real English example sentences. Arabic comes AFTER, as a short explanation underneath — never the other way round, and never a wall of Arabic with English words buried inside it. She is here to read English.
3. Give at least TWO NEW example sentences every time you explain something. Never reuse the examples already in her sheet — they are listed in the context below and she has read them.
4. Examples must be concrete and from working life (an email, a meeting, a client, a report, a deadline) — never abstract grammar-book sentences.
5. Keep it tight: the English rule line, the examples, then one or two Arabic sentences. Never more than that unless she asks for more.
6. When she says she understood, do NOT just agree. Ask her ONE short question that only someone who understood could answer. If she gets it wrong, correct her gently and give another example.
7. When she writes English, correct it and show the corrected sentence in full.
8. Warm and direct, never sycophantic. Do not overuse «ممتاز».
9. Your knowledge is bounded to this pattern and the context below. Never claim to remember anything else.`

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
  let body: { task_id?: string; task_type?: string; message?: string; draft_text?: string; pattern_id?: string }
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }) }

  const { task_id, task_type, message, draft_text = '', pattern_id = null } = body
  if (!task_id || !task_type || !message?.trim()) return new Response(JSON.stringify({ error: 'task_id, task_type, message required' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  if (!['writing', 'speaking', 'reading_pattern'].includes(task_type)) return new Response(JSON.stringify({ error: 'task_type must be writing, speaking or reading_pattern' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  const isPattern = task_type === 'reading_pattern'
  if (isPattern && !pattern_id) return new Response(JSON.stringify({ error: 'pattern_id required for reading_pattern' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })

  const studentId = user.id

  if (!CLAUDE_API_KEY) return new Response(JSON.stringify({ error: 'المدرّب غير متاح حالياً' }), { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } })

  // ── Load or create conversation ───────────────────
  // One conversation per PATTERN for reading, one per task for writing/speaking.
  // The unique key is (student, task, type, coalesce(pattern_id,'')), so the
  // null branch has to be an IS NULL — an .eq(null) would match nothing and
  // silently start a new conversation on every message.
  let convQuery = supa
    .from('coach_conversations')
    .select('*')
    .eq('student_id', studentId)
    .eq('task_id', task_id)
    .eq('task_type', task_type)
  convQuery = isPattern ? convQuery.eq('pattern_id', pattern_id) : convQuery.is('pattern_id', null)
  let { data: conv } = await convQuery.maybeSingle()

  if (!conv) {
    const { data: created } = await supa
      .from('coach_conversations')
      .insert({ student_id: studentId, task_id, task_type, pattern_id })
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
    isPattern
      ? supa.from('curriculum_readings')
          .select('title_en, title_ar, study_sheet, curriculum_units!unit_id(theme_ar, theme_en, curriculum_levels!level_id(level_number))')
          .eq('id', task_id)
          .maybeSingle()
      : supa.from(taskTable)
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
    isPattern
      ? supa.from('student_curriculum_progress')
          .select('score')
          .eq('student_id', studentId)
          .eq('section_type', 'reading')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(5)
      : task_type === 'writing'
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

  // The pattern she is actually pointing at. If the sheet changed under her
  // (content is re-authored from time to time) there is nothing to tutor, so
  // say so rather than inventing a lesson.
  const pattern = isPattern
    ? ((taskRow as any)?.study_sheet?.teach || []).find((t: any) => t?.id === pattern_id) || null
    : null
  if (isPattern && !pattern) {
    return new Response(JSON.stringify({ error: 'pattern_not_found' }), { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  const taskTypeAr = task_type === 'writing' ? 'الكتابة' : isPattern ? 'القراءة' : 'التحدث'
  const taskTitle = taskRow?.title_ar || taskRow?.title_en || taskRow?.curriculum_units?.theme_ar || taskTypeAr
  const taskPrompt = taskRow?.prompt_ar || taskRow?.prompt_en || ''

  const lastScore = scores[0] ?? null
  const compactBriefing = lastScore != null
    ? `آخر ${taskTypeAr}: ${lastScore}/10 · ركّز: ${profileCtx?.weaknesses?.[0] || 'استمر في التحسن'}`
    : `ابدأ بثقة — المدرّب معك`

  const patternContext = isPattern ? `STUDENT CONTEXT:
- المستوى: ${cefr}
- آخر نتائج القراءة: ${scores.length ? scores.map((x) => `${x}%`).join(', ') : 'لا توجد بعد'}

THE PATTERN SHE IS STUDYING RIGHT NOW
- From the passage: "${taskRow?.title_en || taskRow?.title_ar || ''}"
- Pattern name: ${pattern.title_en || ''} — ${pattern.title_ar || ''}
- The line it was taken from: ${pattern.from_text || '(none)'}
- What the sheet already explained to her, in Arabic: ${(pattern.explain_ar || '').slice(0, 700)}
- The trap the sheet already warned her about: ${(pattern.watch_out_ar || '—').slice(0, 400)}
- Examples the sheet ALREADY gave her (never reuse these): ${(pattern.examples_en || []).join(' | ') || '(none)'}

SHE HAS ALREADY READ ALL OF THE ABOVE. Do not repeat it back to her. Explain it a different way, give NEW examples, and answer the question she actually asked.` : null

  const studentContext = patternContext ?? `STUDENT CONTEXT (${task_type} only — ignore other skills):
- المستوى: ${cefr}
- آخر ${scores.length} نتائج ${taskTypeAr}: ${scores.length ? scores.map(s=>`${s}/10`).join(', ') : 'لا توجد بعد'}
- نقاط القوة في ${taskTypeAr}: ${profileCtx?.strengths?.join('، ') || 'غير متوفر بعد'}
- نقاط التطوير في ${taskTypeAr}: ${profileCtx?.weaknesses?.join('، ') || 'غير متوفر بعد'}

THIS TASK:
- العنوان: ${taskTitle}
- الموضوع: ${taskPrompt.slice(0, 300)}`

  // Build messages array (history + new message)
  const history = (historyRows || []).map((m: any) => ({ role: m.role, content: m.content }))
  const userContent = isPattern
    ? `The student asks about this pattern: "${message.trim()}"`
    : `الطالب${task_type === 'writing' ? 'ة' : ''} يسأل: "${message.trim()}"

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
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          temperature: 0.4,
          stream: true,
          system: [
            { type: 'text', text: isPattern ? TUTOR_SYSTEM_PROMPT : COACH_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
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
        model: 'claude-sonnet-4-6',
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
