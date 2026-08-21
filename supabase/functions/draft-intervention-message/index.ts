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

const SYSTEM_PROMPT = `أنت تكتب نيابة عن د. علي الأحمد، مدرّب الإنجليزية في «أكاديمية طلاقة» السعودية. تكتب رسالة واتساب واحدة لطالب من طلابه — بالعربية السهلة الدارجة القريبة.

**القاعدة الأهم — الرسالة يجب أن تُثبت أنك تابعتَ هذا الطالب بالذات:**
اذكر شيئاً واحداً محدّداً من معطياته — القسم الذي تركه في منتصفه، أو اسم الوحدة، أو درجة حقيقية حصل عليها، أو تصحيحاً وصله في آخر تسجيل. **بدون تفصيلة محدّدة الرسالة فاشلة.**

ممنوع تماماً: «نفتقدك»، «وينك عنّا»، «لا تنقطع عن الدراسة»، «نتمنى نشوفك قريباً»، وأي كلام عام يصلح لأي طالب.
المطلوب: «خلّصتَ القواعد بـ٩٤ وباقي لك الكتابة في نفس الوحدة» — كلام لا يصلح إلا له.

القواعد:
1. ابدأ باسمه الأول فقط مع تحية قصيرة طبيعية.
2. **اذكر التفصيلة المحدّدة** — وإن كانت درجة عالية فاذكرها بإعجاب صادق قبل أن تدعوه للعودة.
3. لا تلُم أبداً، ولا تذكر عدد أيام الغياب كأنه محاسبة. الغياب يُذكر بلطف أو لا يُذكر.
4. اختم بسؤال مفتوح واحد أو دعوة خفيفة — لا أمر.
5. الطول: ٢-٣ جمل قصيرة. لا فقرات.
6. emoji واحد فقط على الأكثر (🌷 💐 ✨ 📚 💪 🎯) — أو بلا emoji.
7. التزم بالجنس النحوي المعطى في المعطيات: «مؤنّث» ⇒ كل الأفعال والضمائر مؤنّثة (تركتِ، درجتكِ، تقدرين)، «مذكّر» ⇒ مذكّرة. هذا ليس اختيارياً.
8. اسم الأكاديمية «طلاقة» — لا تكتبه بحروف لاتينية ولا تنقله صوتياً.
9. لا تخترع معلومة غير موجودة في المعطيات. إن لم تجد تفصيلة محدّدة، اكتب رسالة قصيرة صادقة بلا ادّعاء.

أخرج نص الرسالة فقط — بلا عنوان ولا شرح ولا علامات اقتباس.`

const SECTION_AR: Record<string, string> = {
  reading: 'القراءة',
  grammar: 'القواعد',
  writing: 'الكتابة',
  listening: 'الاستماع',
  speaking: 'المحادثة',
  vocabulary: 'المفردات',
  vocabulary_exercise: 'تمارين المفردات',
  pronunciation: 'النطق',
  assessment: 'اختبار الوحدة',
}

const secAr = (s?: string) => (s && SECTION_AR[s]) || s || ''

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { intervention_id, force } = await req.json()
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

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // The academy owner is role=admin, not a trainer, so ownership alone would
    // lock them out of every row they can see in the academy-wide queue. The
    // coordinator (added 2026-08-21) works the SAME academy-wide queue from the
    // coordinator console and owns none of the rows either — without this branch
    // every draft request from the console 404s.
    const { data: caller } = await serviceSupabase
      .from('profiles').select('role').eq('id', user.id).single()
    const isStaff = caller?.role === 'admin' || caller?.role === 'coordinator'

    let q = serviceSupabase
      .from('student_interventions')
      .select('suggested_message_ar, reason_ar, signal_data, suggested_action_ar, student_id, trainer_id')
      .eq('id', intervention_id)
    if (!isStaff) q = q.eq('trainer_id', user.id)
    const { data: cached } = await q.single()

    if (!cached) return jsonRes({ ok: false, error: 'intervention not found' }, 404)
    // force = the "أعد الكتابة" button. Without it the cached draft comes straight
    // back and the button appears to do nothing.
    if (cached.suggested_message_ar && !force) {
      return jsonRes({ ok: true, message: cached.suggested_message_ar, cached: true })
    }

    // The old prompt got a name, an absence reason and an XP total — enough to
    // write "we miss you" and nothing more, which is why every draft read the
    // same. This pulls the facts that actually make a message land: the section
    // they abandoned mid-way, what they scored right before going quiet, and the
    // correction from their last graded speaking attempt.
    const { data: ctx } = await serviceSupabase.rpc('get_student_outreach_context', {
      p_student_id: cached.student_id,
    })

    const firstName = String(ctx?.full_name || 'الطالب').split(' ')[0]
    const isFemale = ctx?.gender !== 'male'

    const lines: string[] = [
      `- الاسم الأول: ${firstName}`,
      `- الجنس النحوي: ${isFemale ? 'مؤنّث' : 'مذكّر'} (التزم به في كل فعل وضمير)`,
      `- سبب التنبيه: ${cached.reason_ar || ''}`,
    ]

    if (ctx?.days_silent != null) lines.push(`- آخر دخول: قبل ${ctx.days_silent} يوم`)

    if (ctx?.unfinished?.section) {
      lines.push(
        `- **تركَ${isFemale ? 'تْ' : ''} في المنتصف:** ${secAr(ctx.unfinished.section)} في وحدة «${ctx.unfinished.unit}» (بتاريخ ${ctx.unfinished.at}) ← أقوى تفصيلة، استخدمها`
      )
    }

    if (Array.isArray(ctx?.recent_wins) && ctx.recent_wins.length) {
      const wins = ctx.recent_wins
        .map((w: { section: string; unit: string; score: number }) =>
          `${secAr(w.section)} ${w.score}/100 في «${w.unit}»`)
        .join(' · ')
      lines.push(`- درجات حقيقية قبل الانقطاع: ${wins}`)
    }

    if (ctx?.last_speaking?.score != null) {
      const c = ctx.last_speaking.correction
      lines.push(`- آخر تسجيل محادثة: ${ctx.last_speaking.score}/10 بتاريخ ${ctx.last_speaking.at}`)
      if (c?.spoken && c?.corrected) {
        lines.push(`- تصحيح وصل${isFemale ? 'ها' : 'ه'} حينها: قال${isFemale ? 'ت' : ''} "${c.spoken}" والصواب "${c.corrected}"`)
      }
      if (ctx.last_speaking.strength) lines.push(`- نقطة قوة لوحظت: ${ctx.last_speaking.strength}`)
    }

    if (ctx?.words_mastered_30d) lines.push(`- أتقن${isFemale ? 'تْ' : ''} ${ctx.words_mastered_30d} كلمة خلال ٣٠ يوماً`)
    if (ctx?.streak) lines.push(`- سلسلة الأيام المتصلة: ${ctx.streak}`)
    if (ctx?.group_name) lines.push(`- المجموعة: ${ctx.group_name}`)

    const userPrompt = `معطيات الطالب:
${lines.join('\n')}

اكتب رسالة واتساب واحدة، واذكر فيها تفصيلة محدّدة من المعطيات أعلاه:`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('CLAUDE_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        // Sonnet, not Haiku: these messages go to real students unedited if Ali
        // approves them as-is, and Haiku produced Arabic typos («بالقواعس» for
        // «بالقواعد») in testing. A few short messages a day costs almost nothing.
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
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
