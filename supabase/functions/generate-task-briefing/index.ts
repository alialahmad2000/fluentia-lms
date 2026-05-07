// Fluentia LMS — Generate Pre-Task Briefing (AI Coach B1)
// Returns a short Arabic briefing before a writing or speaking task.
// Hybrid: generic questions (always) + personalized layer (if profile exists).
// Results cached in task_briefings_cache for 7 days.
// Deploy: supabase functions deploy generate-task-briefing --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CEFR: Record<number, string> = {
  0: 'ما قبل A1 — مبتدئ جداً',
  1: 'A1 — مبتدئ',
  2: 'A2 — أساسي',
  3: 'B1 — متوسط',
  4: 'B2 — فوق المتوسط',
  5: 'C1 — متقدم',
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Auth ──────────────────────────────────────────
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  if (!token) return err('Missing authorization', 401)

  const { data: { user }, error: authErr } = await supa.auth.getUser(token)
  if (authErr || !user) return err('Unauthorized', 401)

  // ── Parse body ────────────────────────────────────
  let body: { student_id?: string; task_id?: string; task_type?: string }
  try { body = await req.json() } catch { return err('Invalid JSON') }

  const { student_id, task_id, task_type } = body
  if (!student_id || !task_id || !task_type) return err('student_id, task_id, task_type required')
  if (!['writing', 'speaking'].includes(task_type)) return err('task_type must be writing or speaking')

  // Caller must be the student themselves or admin/trainer
  if (user.id !== student_id) {
    const { data: callerRole } = await supa.from('profiles').select('role').eq('id', user.id).single()
    if (!['admin', 'trainer'].includes(callerRole?.role ?? '')) return err('Forbidden', 403)
  }

  // ── Cache check ───────────────────────────────────
  const { data: cached } = await supa
    .from('task_briefings_cache')
    .select('briefing_payload, generated_at')
    .eq('student_id', student_id)
    .eq('task_id', task_id)
    .eq('task_type', task_type)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (cached) {
    return ok({ briefing: cached.briefing_payload, cached: true, generated_at: cached.generated_at })
  }

  // ── Fetch context ─────────────────────────────────

  // Task data — join to unit for brief_questions
  const taskTable = task_type === 'writing' ? 'curriculum_writing' : 'curriculum_speaking'
  const { data: taskRow } = await supa
    .from(taskTable)
    .select('*, curriculum_units!unit_id(brief_questions, warmup_questions, theme_en, theme_ar, unit_number, curriculum_levels!level_id(level_number, cefr))')
    .eq('id', task_id)
    .maybeSingle()

  if (!taskRow) return err('Task not found', 404)

  // Student profile (latest by generated_at — no is_latest column)
  const { data: profile } = await supa
    .from('ai_student_profiles')
    .select('strengths, weaknesses, tips, skills, summary_ar')
    .eq('student_id', student_id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Student level
  const { data: studentRow } = await supa
    .from('students')
    .select('academic_level')
    .eq('id', student_id)
    .maybeSingle()
  const level: number = taskRow.curriculum_units?.curriculum_levels?.level_number
    ?? studentRow?.academic_level
    ?? 1

  // Last 5 same-type submissions/scores
  let recentScores: number[] = []
  if (task_type === 'writing') {
    const { data: recentW } = await supa
      .from('student_curriculum_progress')
      .select('ai_feedback')
      .eq('student_id', student_id)
      .eq('section_type', 'writing')
      .eq('evaluation_status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(5)
    recentScores = (recentW || [])
      .map(r => r.ai_feedback?.overall_score ?? r.ai_feedback?.fluency_score)
      .filter(Boolean)
  } else {
    const { data: recentS } = await supa
      .from('speaking_recordings')
      .select('ai_evaluation')
      .eq('student_id', student_id)
      .eq('evaluation_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5)
    recentScores = (recentS || [])
      .map(r => r.ai_evaluation?.overall_score)
      .filter(Boolean)
  }

  // ── Build generic fallback (no AI) ────────────────
  const unit = taskRow.curriculum_units
  const briefQs: string[] = unit?.brief_questions || []
  const taskTitle = task_type === 'writing'
    ? (taskRow.title_ar || taskRow.title_en || unit?.theme_ar || 'مهمة الكتابة')
    : (taskRow.title_ar || taskRow.title_en || unit?.theme_ar || 'موضوع التحدث')

  const genericFallback = {
    generic_section: {
      title: 'اسأل نفسك قبل ما تبدأ',
      questions: briefQs.slice(0, 4),
      task_title: taskTitle,
    },
    personalized_section: {
      show: false,
      strengths_note: '',
      focus_for_this_task: '',
      encouragement: 'أنت قادر — ابدأ بثقة!',
    },
  }

  // ── AI generation (with fallback) ────────────────
  if (!CLAUDE_API_KEY) {
    // No API key → generic only, cache it
    await cacheBriefing(supa, student_id, task_id, task_type, genericFallback)
    return ok({ briefing: genericFallback, cached: false, generated_at: new Date().toISOString() })
  }

  const hasProfile = !!(profile?.strengths?.length || profile?.weaknesses?.length)
  const scoresText = recentScores.length
    ? recentScores.map(s => `${s}/10`).join(', ')
    : 'لا توجد تسجيلات سابقة بعد'

  const taskSpecific = task_type === 'writing'
    ? `نوع المهمة: ${taskRow.task_type || 'كتابة'}
الموضوع: ${taskRow.prompt_ar || taskRow.prompt_en || ''}
الحد الأدنى للكلمات: ${taskRow.word_count_min || 50}`
    : `نوع الموضوع: ${taskRow.topic_type || 'محادثة'}
الموضوع: ${taskRow.prompt_ar || taskRow.prompt_en || ''}
المدة المطلوبة: ${taskRow.min_duration_seconds ? Math.round(taskRow.min_duration_seconds / 60) + ' دقائق' : ''}`

  const systemPrompt = `أنت مدرب لغة إنجليزية لطالبة سعودية. مهمتك توجيه قصير وودي بالعربية قبل بدء ${task_type === 'writing' ? 'مهمة الكتابة' : 'موضوع التحدث'}.`

  const userPrompt = `STUDENT CONTEXT:
- المستوى: ${CEFR[level] || CEFR[1]}
- آخر ${recentScores.length} نتائج: ${scoresText}
- نقاط القوة: ${hasProfile ? (profile.strengths || []).slice(0, 3).join('، ') : 'غير متوفر بعد'}
- نقاط التطوير: ${hasProfile ? (profile.weaknesses || []).slice(0, 3).join('، ') : 'غير متوفر بعد'}

THIS TASK:
- العنوان: ${taskTitle}
${taskSpecific}
- أسئلة التأمل (brief_questions): ${JSON.stringify(briefQs.slice(0, 4))}

أنشئ توجيهاً قصيراً قبل المهمة. أجب ONLY بـ JSON هذا بدون markdown:
{
  "generic_section": {
    "title": "اسأل نفسك قبل ما تبدأ",
    "questions": [3-4 أسئلة محادثة من brief_questions أو مشابهة لها],
    "task_title": "${taskTitle}"
  },
  "personalized_section": {
    "show": ${hasProfile},
    "strengths_note": "${hasProfile ? 'جملة واحدة عن نقطة قوة من سجلها' : ''}",
    "focus_for_this_task": "${hasProfile ? 'جملة أو جملتين عن نقطة ضعف تركز عليها في هذا التاسك' : ''}",
    "encouragement": "جملة تشجيع قصيرة ودافئة"
  }
}

RULES:
- كل الجمل بالعربية. أسلوب ودي غير رسمي.
- كل جملة أقل من 20 كلمة.
- لا تذكر "AI" أو "نموذج" — تكلم كمدرب بشري.
- إذا ${hasProfile ? 'عندك بيانات عن الطالبة' : 'ما عندك بيانات شخصية'} — personalized_section.show = ${hasProfile}.`

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 30000)

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: ctrl.signal,
    })
    clearTimeout(timer)

    if (!claudeRes.ok) throw new Error(`Claude ${claudeRes.status}`)

    const claudeData = await claudeRes.json()
    const rawText: string = claudeData.content?.[0]?.text || ''
    const start = rawText.indexOf('{')
    const end = rawText.lastIndexOf('}') + 1
    if (start === -1 || end <= start) throw new Error('No JSON in Claude response')

    let briefing: any
    try {
      briefing = JSON.parse(rawText.slice(start, end))
    } catch {
      throw new Error('JSON parse failed')
    }

    // Validate shape
    if (!briefing.generic_section || !briefing.personalized_section) throw new Error('Bad shape')
    if (!Array.isArray(briefing.generic_section.questions)) {
      briefing.generic_section.questions = briefQs.slice(0, 4)
    }

    // Track usage
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0
    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75
    await supa.from('ai_usage').insert({
      type: 'task_briefing',
      student_id,
      model: 'claude-sonnet-4-20250514',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_sar: costSAR.toFixed(4),
    })

    await cacheBriefing(supa, student_id, task_id, task_type, briefing)
    return ok({ briefing, cached: false, generated_at: new Date().toISOString() })

  } catch (e: any) {
    // AI failure → return generic fallback, no cache
    console.error('[generate-task-briefing] AI error:', e.message)
    return ok({ briefing: genericFallback, cached: false, fallback: true, generated_at: new Date().toISOString() })
  }
})

async function cacheBriefing(
  supa: any,
  student_id: string,
  task_id: string,
  task_type: string,
  payload: any,
) {
  const now = new Date()
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  await supa.from('task_briefings_cache').upsert(
    {
      student_id,
      task_id,
      task_type,
      briefing_payload: payload,
      generated_at: now.toISOString(),
      expires_at: expires.toISOString(),
    },
    { onConflict: 'student_id,task_id,task_type' },
  )
}
