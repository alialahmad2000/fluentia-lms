// Fluentia LMS — Custom Track Drafter
// Turns a student's intake consultation into a proposed course spec for Ali to curate.
// Deploy: supabase functions deploy draft-custom-track --no-verify-jwt
//
// Nine bespoke tracks (Sara's Pro Desk, Anwar's library track, Noura's environment
// track, Malak's studio, Yusra's analyst course…) were each built by hand over
// days. Every one started from the same raw material: what this person does, why
// they need English, and the moment they want to stop dreading. That material is
// now captured by the intake, so the first draft can be mechanical — and Ali's
// judgement is spent on shaping rather than starting from a blank page.
//
// NEVER publishes to a student. Writes status='draft' only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `أنت مصمّم مناهج في «أكاديمية طلاقة»، أكاديمية إنجليزية سعودية، تعمل مع د. علي الأحمد.

مهمتك: من إجابات الطالب في أسئلة التعارف، اقترح مسارًا مخصّصًا لتعلّم الإنجليزية له وحده.

المبادئ:
1. المسار يجب أن يكون عن حياته هو — مهنته، مواقفه، المصطلحات التي يسمعها فعلاً في عمله. لا محتوى عام.
2. ابدأ من «الموقف الذي يتمنّى أن يتكلّم فيه بثقة» — هذا هو قلب المسار، واجعل الوحدة الأخيرة تصل إليه مباشرة.
3. راعِ الوقت المتاح أسبوعياً: لا تقترح ١٢ وحدة لطالب يملك ساعتين.
4. راعِ مستواه الحالي — لا تبنِ مسار B2 لمن يتلعثم في الجمل البسيطة.
5. كل وحدة لها ناتج ملموس واحد (deliverable): مكالمة، إيميل، عرض، تقرير.
6. العناوين العربية دافئة ومهنية، لا ترجمة حرفية.
7. اسم الأكاديمية «طلاقة» دائماً — لا تكتبه بحروف لاتينية (Fluentia) ولا تنقله صوتياً إلى العربية (فلونشيا/فلوينشيا/فلونتيا).
8. المفردات مهنية حقيقية من مجاله، وليست كلمات عامة.
9. إن خاطبتَ الطالب في أي نص، فالتزم بالجنس النحوي المذكور في المعطيات — والافتراضي مؤنّث.

كن محدّداً. مسار عام = مسار فاشل.`

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const TRACK_TOOL = {
  name: 'propose_track',
  description: 'اقترح مسارًا مخصّصًا لتعلّم الإنجليزية لهذا الطالب',
  input_schema: {
    type: 'object',
    properties: {
      track_name_ar: { type: 'string', description: 'اسم المسار بالعربية — دافئ ومهني' },
      track_name_en: { type: 'string' },
      rationale_ar: { type: 'string', description: 'لماذا هذا المسار لهذا الطالب تحديداً — ٢-٣ جمل' },
      target_moment_ar: { type: 'string', description: 'الموقف الذي سيتمكّن من خوضه بثقة في نهاية المسار' },
      weeks: { type: 'integer', description: 'مدة المسار بالأسابيع، متسقة مع ساعاته الأسبوعية' },
      units: {
        type: 'array',
        description: 'وحدات المسار مرتّبة تصاعدياً',
        items: {
          type: 'object',
          properties: {
            n: { type: 'integer' },
            title_ar: { type: 'string' },
            title_en: { type: 'string' },
            goal_ar: { type: 'string', description: 'ما الذي سيستطيع فعله بعد هذه الوحدة' },
            scenarios: { type: 'array', items: { type: 'string' }, description: 'مواقف واقعية من عمله' },
            vocabulary_themes: { type: 'array', items: { type: 'string' } },
            grammar_focus: { type: 'string' },
            deliverable_ar: { type: 'string', description: 'ناتج ملموس واحد' },
          },
          required: ['n', 'title_ar', 'title_en', 'goal_ar', 'scenarios', 'vocabulary_themes', 'grammar_focus', 'deliverable_ar'],
        },
      },
      open_questions_ar: {
        type: 'array',
        items: { type: 'string' },
        description: 'أسئلة تحتاج أن تسألها لـ د. علي قبل البناء',
      },
    },
    required: ['track_name_ar', 'track_name_en', 'rationale_ar', 'target_moment_ar', 'weeks', 'units'],
  },
}

const GOAL_AR: Record<string, string> = {
  ielts: 'اختبار آيلتس بدرجة محدّدة',
  career: 'الإنجليزية في العمل',
  growth: 'الطلاقة العامة لأسباب شخصية',
}

const HORIZON_AR: Record<string, string> = {
  '2_months': 'خلال شهرين',
  '3_6_months': 'من ٣ إلى ٦ أشهر',
  a_year: 'خلال سنة',
  no_deadline: 'بلا موعد محدّد',
}

const CONFIDENCE_AR: Record<number, string> = {
  1: 'يفهم قليلاً ويتكلم بصعوبة',
  2: 'يفهم لكنه يتلعثم عند الكلام',
  3: 'يتكلم في المواضيع المعتادة',
  4: 'يشعر بالارتياح غالباً، ويتعثّر في المواقف الرسمية',
  5: 'مرتاح المستوى — يريد الصقل والدقّة',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    let body: { student_id?: string }
    try {
      body = await req.json()
    } catch {
      return jsonRes({ ok: false, error: 'invalid_json' }, 400)
    }

    const student_id = body?.student_id
    if (!student_id) return jsonRes({ ok: false, error: 'student_id required' }, 400)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonRes({ ok: false, error: 'unauthorized' }, 401)

    const authed = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await authed.auth.getUser()
    if (!user) return jsonRes({ ok: false, error: 'unauthorized' }, 401)

    const service = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Drafting a course costs tokens and is a staff decision — admins only.
    const { data: caller } = await service
      .from('profiles').select('role').eq('id', user.id).single()
    if (caller?.role !== 'admin') return jsonRes({ ok: false, error: 'admin_only' }, 403)

    const { data: intake } = await service
      .from('student_intake').select('*').eq('student_id', student_id).single()
    if (!intake) return jsonRes({ ok: false, error: 'no_intake_for_student' }, 404)

    const { data: prof } = await service
      .from('profiles').select('full_name').eq('id', student_id).single()
    const { data: stu } = await service
      .from('students').select('academic_level, gender').eq('id', student_id).single()

    const userPrompt = `${stu?.gender === 'male' ? 'الطالب' : 'الطالبة'}: ${prof?.full_name || '—'}
- الجنس النحوي للمخاطبة: ${stu?.gender === 'male' ? 'مذكّر' : 'مؤنّث'}
- المستوى في الأكاديمية: ${stu?.academic_level ?? 'غير محدّد'}
- الهدف: ${GOAL_AR[intake.goal] || intake.goal}
- المجال: ${intake.field || 'غير محدّد'}${intake.role_title ? ` (${intake.role_title})` : ''}
- الموعد: ${HORIZON_AR[intake.horizon] || 'غير محدّد'}
- تقييمه لنفسه: ${CONFIDENCE_AR[intake.confidence] || 'غير محدّد'}
- الساعات المتاحة أسبوعياً: ${intake.weekly_hours ?? 'غير محدّد'}

الموقف الذي يريد التحدّث فيه بثقة (بنصّه كما كتبه):
"${intake.motivation_moment || 'لم يذكره'}"

اقترح المسار.`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('CLAUDE_API_KEY') ?? Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        tools: [TRACK_TOOL],
        tool_choice: { type: 'tool', name: 'propose_track' },
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return jsonRes({ ok: false, error: `claude_${claudeRes.status}`, detail: errText.slice(0, 400) }, 502)
    }

    const claudeData = await claudeRes.json()
    const toolUse = claudeData.content?.find((c: { type: string }) => c.type === 'tool_use')
    const spec = toolUse?.input
    if (!spec?.units?.length) {
      return jsonRes({ ok: false, error: 'no_spec_returned' }, 502)
    }

    const { data: draft, error: insErr } = await service
      .from('custom_track_drafts')
      .insert({ student_id, spec, model: MODEL, status: 'draft' })
      .select('id')
      .single()

    if (insErr) return jsonRes({ ok: false, error: insErr.message }, 500)

    return jsonRes({ ok: true, draft_id: draft.id, spec })
  } catch (e) {
    console.error('draft-custom-track error:', e)
    return jsonRes({ ok: false, error: String(e) }, 500)
  }
})
