// Fluentia LMS — Class Prep AI Analysis (T5)
// Uses get_class_prep_context RPC + Claude for talking points, focus areas, students to call on
// Caches result 6h in trainer_daily_rituals.prep_cache
// Deploy: supabase functions deploy class-prep-analysis --linked

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CACHE_HOURS = 6

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { trainer_id, group_id, unit_id, force_refresh = false } = await req.json()

    if (!trainer_id || !group_id) {
      return new Response(JSON.stringify({ error: 'trainer_id and group_id required' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Check cache
    if (!force_refresh) {
      const today = new Date().toISOString().split('T')[0]
      const { data: ritual } = await supabase
        .from('trainer_daily_rituals')
        .select('prep_cache, prep_cache_generated_at')
        .eq('trainer_id', trainer_id)
        .eq('day', today)
        .maybeSingle()

      if (ritual?.prep_cache?.group_id === group_id && ritual?.prep_cache_generated_at) {
        const age_h = (Date.now() - new Date(ritual.prep_cache_generated_at).getTime()) / 3_600_000
        if (age_h < CACHE_HOURS) {
          return new Response(
            JSON.stringify({ ...ritual.prep_cache, cached: true, age_hours: age_h }),
            { headers: { ...CORS, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // 2. Fetch context via RPC
    const { data: ctx, error: ctxErr } = await supabase.rpc('get_class_prep_context', {
      p_trainer_id: trainer_id,
      p_group_id: group_id,
    })
    if (ctxErr) throw ctxErr

    // 3. Pull recent student progress
    const { data: students } = await supabase
      .from('students')
      .select('id, profiles(full_name)')
      .eq('group_id', group_id)
      .eq('status', 'active')
      .is('deleted_at', null)

    const studentIds = (students || []).map((s: any) => s.id)

    let recentProgress: any[] = []
    if (studentIds.length) {
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, section_type, status, score, completed_at')
        .in('student_id', studentIds)
        .gte('updated_at', new Date(Date.now() - 14 * 24 * 3_600_000).toISOString())
        .limit(80)
      recentProgress = data || []
    }

    // 4. Build prompt
    const prompt = `أنت مساعد المدرب في أكاديمية طلاقة. أنت تعدّ المدرب لحصة قادمة بتوليد نقاط حوار ذكية ومحددة.

بيانات الحصة:
- المجموعة: ${ctx?.group?.name || 'غير محددة'} (Level ${ctx?.group?.level || '?'})
- عدد الطلاب: ${students?.length || 0}
- الوحدة: ${ctx?.unit?.title || 'غير محددة'} (الوحدة رقم ${ctx?.unit?.order_index || '—'})
- الحصة بعد: ${Math.floor(ctx?.next_class?.minutes_until || 0)} دقيقة

نقاط ضعف المجموعة (آخر ١٤ يوم):
${JSON.stringify(ctx?.weaknesses || [], null, 2)}

طلاب يستحقون الإشادة:
${JSON.stringify(ctx?.celebrate_students || [], null, 2)}

طلاب يحتاجون انتباه عاجل:
${JSON.stringify(ctx?.urgent_students || [], null, 2)}

عينة من أداء الطلاب الأخير:
${JSON.stringify(recentProgress.slice(0, 20), null, 2)}

أرجع JSON فقط بهذا الشكل (لا تكتب أي شيء قبل أو بعد):
{
  "talking_points": [
    "نقطة حوار محددة وعملية، بالعربية، مبنية على البيانات"
  ],
  "focus_areas": [
    { "title": "العنوان", "reason": "لماذا هذا التركيز مهم" }
  ],
  "students_to_call_on": [
    { "name": "اسم الطالبة", "reason": "لأنها صامتة/لأنها أبدعت/...", "approach": "اقتراح كيف تخاطبها" }
  ],
  "success_story": { "name": "اسم", "moment": "اذكر لحظة نجاحها في بداية الحصة لرفع المعنويات" }
}

القواعد:
- 3-5 talking_points
- 2-3 focus_areas
- 2-3 students_to_call_on
- كل النصوص بالعربية الفصحى البسيطة
- لا تخترع بيانات — استخدم ما هو موجود فقط
- إذا البيانات شحيحة، أرجع قوائم أقصر`

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = (resp.content[0] as any).text as string
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON in response')

    const parsed = JSON.parse(text.slice(start, end + 1))

    const payload = {
      ...parsed,
      group_id,
      unit_id: unit_id || ctx?.unit?.id || null,
      generated_at: new Date().toISOString(),
      cached: false,
    }

    // 5. Save to cache
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('trainer_daily_rituals').upsert(
      {
        trainer_id,
        day: today,
        prep_cache: payload,
        prep_cache_generated_at: new Date().toISOString(),
      },
      { onConflict: 'trainer_id,day' }
    )

    return new Response(JSON.stringify(payload), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('class-prep-analysis error:', err)
    return new Response(JSON.stringify({ error: err.message, fallback: true }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
