// Fluentia LMS — Class Summary AI (T6)
// Generates student-facing Arabic summary for a class_summaries row
// Deploy: supabase functions deploy class-summary-ai --project-ref nmjexpuycmqcxuxljier

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { summary_id } = await req.json()
    if (!summary_id) throw new Error('summary_id required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Load the class summary + related info
    const { data: summary, error: sErr } = await supabase
      .from('class_summaries')
      .select('*, groups(name, level), curriculum_units(title, order_index)')
      .eq('id', summary_id)
      .single()
    if (sErr) throw sErr

    // 2. Top students from points_summary
    const stars = ((summary.points_summary || []) as any[])
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 3)
      .map((s: any) => ({ name: s.name, points: s.points }))

    const ctx = {
      class_date: summary.class_date,
      duration_minutes: summary.duration_minutes,
      attendance_count: summary.attendance_count,
      total_students: summary.total_students,
      group: (summary as any).groups?.name,
      level: (summary as any).groups?.level,
      unit: (summary as any).curriculum_units?.title,
      unit_order: (summary as any).curriculum_units?.order_index,
      stars,
      trainer_notes_preview: (summary.trainer_notes || '').slice(0, 200),
    }

    const prompt = `أنت مساعد المدرب في أكاديمية طلاقة. تكتب ملخص حصة موجه للطلاب بعد انتهاء الحصة.

بيانات الحصة:
${JSON.stringify(ctx, null, 2)}

اكتب ملخصاً دافئاً ومحفّزاً للطلاب بالعربية الفصحى البسيطة يتضمن:
1. تحية افتتاحية قصيرة
2. ما تمّ تغطيته في الحصة (جملة أو جملتين، مبنية على اسم الوحدة)
3. تنويه بنجوم الحصة (إذا وُجدوا) — فقط الأسماء
4. رسالة تحفيزية ختامية قصيرة

قواعد صارمة:
- بين 80 و 150 كلمة فقط
- لا تذكر أسماء الغائبين
- لا تكشف ملاحظات المدرب الخاصة
- لا emojis أكثر من 2
- اختتم بـ "إلى اللقاء في الحصة القادمة" أو ما يشابهها

أرجع النص فقط — لا مقدمة، لا JSON.`

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = ((resp.content[0] as any).text as string).trim()

    // 3. Save generated summary
    await supabase
      .from('class_summaries')
      .update({
        ai_summary_text: text,
        ai_summary_generated_at: new Date().toISOString(),
      })
      .eq('id', summary_id)

    return new Response(JSON.stringify({ summary_text: text }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('class-summary-ai error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
