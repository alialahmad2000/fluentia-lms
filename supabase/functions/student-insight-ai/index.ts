// Fluentia LMS — Student Insight AI (T7a)
// Generates trainer-facing diagnosis + recommended_action for a student
// 12h cache on students.ai_insight_cache
// Deploy: supabase functions deploy student-insight-ai --project-ref nmjexpuycmqcxuxljier

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CACHE_HOURS = 12

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { student_id, force_refresh = false } = await req.json()
    if (!student_id) throw new Error('student_id required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check cache
    const { data: cacheRow } = await supabase
      .from('students')
      .select('ai_insight_cache, ai_insight_generated_at')
      .eq('id', student_id)
      .maybeSingle()

    if (!force_refresh && cacheRow?.ai_insight_generated_at && cacheRow?.ai_insight_cache) {
      const age_h = (Date.now() - new Date(cacheRow.ai_insight_generated_at).getTime()) / 3_600_000
      if (age_h < CACHE_HOURS) {
        return new Response(
          JSON.stringify({ ...cacheRow.ai_insight_cache, cached: true, age_hours: Math.round(age_h * 10) / 10 }),
          { headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Pull overview + timeline + interventions in parallel
    const [overview, timeline, interventionsRes] = await Promise.all([
      supabase.rpc('get_student_360_overview', { p_student_id: student_id }),
      supabase.rpc('get_student_activity_timeline', { p_student_id: student_id, p_days: 14, p_limit: 30 }),
      supabase
        .from('student_interventions')
        .select('reason_code, reason_ar, severity, status, created_at')
        .eq('student_id', student_id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    if (overview.error) throw overview.error

    const ov = overview.data as any
    const events = (timeline.data as any[]) || []
    const interventions = (interventionsRes.data as any[]) || []

    const ctx = {
      name: ov.student?.name,
      level: ov.group?.level,
      group: ov.group?.name,
      status: ov.student?.status,
      last_active: ov.student?.last_active_at,
      xp_total: ov.metrics?.xp_total,
      xp_30d: ov.metrics?.xp_30d,
      metrics: ov.metrics,
      recent_events_count: events.length,
      event_breakdown: events.reduce((acc: any, e: any) => {
        acc[e.event_type] = (acc[e.event_type] || 0) + 1
        return acc
      }, {}),
      open_interventions: interventions.filter((i: any) => i.status === 'pending'),
      recent_interventions: interventions.slice(0, 3).map((i: any) => ({
        reason: i.reason_ar,
        severity: i.severity,
        status: i.status,
        days_ago: Math.floor((Date.now() - new Date(i.created_at).getTime()) / 86400000),
      })),
    }

    const prompt = `أنت مساعد المدرب في أكاديمية طلاقة. تحلّل بيانات طالب لتقدّم للمدرب توصية واحدة دقيقة وعملية.

بيانات الطالب:
${JSON.stringify(ctx, null, 2)}

أعد JSON بهذا الشكل فقط (لا شيء قبله أو بعده):

{
  "diagnosis": "<جملة واحدة عربية ٢٠ كلمة كحد أقصى — ما هو الوضع الفعلي للطالب الآن>",
  "recommended_action": "<جملة واحدة عربية — ماذا يفعل المدرب اليوم بالضبط، مع تحديد الإجراء والتوقيت>",
  "tone": "<urgent | celebrate | nurture | observe>",
  "evidence": ["<دليل قصير من البيانات>", "<دليل ثانٍ>"]
}

قواعد صارمة:
- diagnosis مبنية على الأرقام الحقيقية أعلاه، لا تختلق
- recommended_action عملية ومحددة (فعل + وقت، مثل: "أرسل له رسالة واتساب الآن تثني على تقدّمه")
- tone "urgent" فقط لو في إشارة خطر واضحة (غياب + انخفاض نشاط + تدخل مفتوح)
- tone "celebrate" لو في إنجاز واضح (XP مرتفع أو درجات ممتازة)
- tone "nurture" للحالات المتوسطة
- tone "observe" لو البيانات شحيحة أو الطالب جديد
- evidence: ٢-٣ حقائق رقمية من البيانات أعلاه فقط`

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('CLAUDE_API_KEY')
    if (!apiKey) throw new Error('No Claude API key configured')

    const anthropic = new Anthropic({ apiKey })
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = ((resp.content[0] as any).text as string).trim()
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1) throw new Error('No JSON in Claude response')

    const parsed = JSON.parse(text.slice(start, end + 1))
    const payload = {
      ...parsed,
      generated_at: new Date().toISOString(),
      cached: false,
    }

    // Save to cache
    await supabase
      .from('students')
      .update({ ai_insight_cache: payload, ai_insight_generated_at: payload.generated_at })
      .eq('id', student_id)

    return new Response(JSON.stringify(payload), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('student-insight-ai error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
