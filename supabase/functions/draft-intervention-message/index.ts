// Fluentia LMS — Claude Message Drafter for Interventions
// Generates warm Arabic WhatsApp messages for trainer-student outreach.
// Deploy: supabase functions deploy draft-intervention-message
// Called by trainer browser (user JWT required).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT = `أنت مساعد لمدرّب إنجليزي في أكاديمية طلاقة السعودية. مهمتك كتابة رسائل واتساب قصيرة ودافئة لطلابه — بالعربية الفصيحة السهلة. الطلاب معظمهم طالبات سعوديات شابات.

القواعد:
1. ابدأ باسم الطالب/ة مع تحية ودودة (مرحبا، السلام عليكم، كيفك…)
2. لا تلوم الطالب أبداً — اذكر الغياب بلطف فقط إذا كان السبب غياباً
3. اختم بسؤال مفتوح أو دعوة للتواصل
4. طول الرسالة: ٢-٣ جمل قصيرة فقط
5. استخدم emoji واحد مناسب فقط (🌷 💐 ✨ 📚 💪 🎯)
6. خاطب الأنثى بصيغة المؤنث إذا الاسم ينتهي بـ ة أو ى
7. لا تستخدم لغة رسمية ممطوطة — كن طبيعياً مثل رسالة من مدرّب يهتم
8. للمناسبات الإيجابية (milestone): اجعل الرسالة احتفالية وداعمة

أخرج فقط نص الرسالة — لا تضف عنوان أو توضيح.`

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { intervention_id } = await req.json()
    if (!intervention_id) return jsonRes({ ok: false, error: 'intervention_id required' }, 400)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonRes({ ok: false, error: 'unauthorized' }, 401)

    // Authed client — verify trainer owns this intervention
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return jsonRes({ ok: false, error: 'unauthorized' }, 401)

    // Check if there's already a cached draft
    const { data: cached } = await supabase
      .from('student_interventions')
      .select('suggested_message_ar, reason_ar, signal_data, suggested_action_ar, student_id, trainer_id')
      .eq('id', intervention_id)
      .eq('trainer_id', user.id)
      .single()

    if (!cached) return jsonRes({ ok: false, error: 'intervention not found' }, 404)
    if (cached.suggested_message_ar) {
      return jsonRes({ ok: true, message: cached.suggested_message_ar, cached: true })
    }

    // Fetch full detail for Claude context
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: detail } = await serviceSupabase.rpc('get_intervention_detail', {
      p_id: intervention_id,
      p_trainer_id: user.id
    })

    const student = detail?.student || {}
    const interv = detail?.intervention || cached
    const recentActivity = detail?.recent_activity || []

    const lastActiveText = student.last_active_at
      ? `قبل ${Math.round((Date.now() - new Date(student.last_active_at).getTime()) / 3600000)} ساعة`
      : 'لم يسجّل دخول بعد'

    const userPrompt = `اكتب رسالة واتساب للطالب/ة:
- الاسم: ${student.full_name || 'الطالب'}
- سبب التدخل: ${interv.reason_ar || cached.reason_ar}
- الإجراء المقترح: ${interv.suggested_action_ar || cached.suggested_action_ar}
- آخر نشاط: ${lastActiveText}
${recentActivity.length > 0 ? `- آخر تفاعل: ${recentActivity[0].activity_type}` : ''}
- مستوى XP: ${student.xp_total || 0}

اكتب الرسالة:`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('CLAUDE_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      throw new Error(`Claude API ${claudeRes.status}: ${errText}`)
    }

    const claudeData = await claudeRes.json()
    const message: string = claudeData.content?.[0]?.text?.trim() || ''

    // Cache the draft on the intervention row
    await serviceSupabase
      .from('student_interventions')
      .update({ suggested_message_ar: message })
      .eq('id', intervention_id)

    return jsonRes({ ok: true, message, cached: false })

  } catch (e) {
    console.error('Drafter error:', e)
    return jsonRes({ ok: false, error: String(e) }, 500)
  }
})
