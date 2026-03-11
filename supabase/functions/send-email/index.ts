// Fluentia LMS — Email Sending Edge Function (via Resend)
// Deploy: supabase functions deploy send-email
// Env: RESEND_API_KEY, RESEND_FROM_EMAIL

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Fluentia Academy <notifications@fluentia.app>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Wrap content in branded HTML email template
function wrapInTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Tajawal', 'Segoe UI', sans-serif; background: #060e1c; color: #e2e8f0; margin: 0; padding: 0; direction: rtl; }
    .container { max-width: 520px; margin: 0 auto; padding: 32px 24px; }
    .header { text-align: center; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 24px; }
    .logo { font-size: 28px; font-weight: bold; color: #38bdf8; }
    .content { font-size: 15px; line-height: 1.7; color: #cbd5e1; }
    .content h2 { color: #f1f5f9; font-size: 20px; margin-bottom: 12px; }
    .btn { display: inline-block; padding: 12px 32px; background: #0ea5e9; color: white !important; text-decoration: none; border-radius: 12px; font-weight: bold; margin: 16px 0; }
    .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #64748b; }
    .highlight { color: #38bdf8; font-weight: bold; }
    .gold { color: #fbbf24; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Fluentia</div>
      <p style="color: #64748b; font-size: 12px; margin-top: 4px;">أكاديمية طلاقة</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>أكاديمية طلاقة — Fluentia Academy</p>
      <p>هذا البريد مُرسل تلقائياً، لا ترد عليه.</p>
    </div>
  </div>
</body>
</html>`
}

// Email template builders per type
const templates: Record<string, (data: any) => { subject: string; html: string }> = {
  class_reminder: (data) => ({
    subject: `تذكير بالحصة — ${data.className || 'Fluentia'}`,
    html: wrapInTemplate(`
      <h2>تذكير بالحصة 🔔</h2>
      <p>حصتك تبدأ قريباً!</p>
      <p><strong>المجموعة:</strong> ${data.groupName || ''}</p>
      <p><strong>الموعد:</strong> ${data.time || ''}</p>
      ${data.meetLink ? `<a href="${data.meetLink}" class="btn">دخول الحصة</a>` : ''}
    `),
  }),

  payment_reminder: (data) => ({
    subject: `تذكير بالدفع — ${data.amount || ''} ريال`,
    html: wrapInTemplate(`
      <h2>تذكير بالدفع 💳</h2>
      <p>${data.message || 'يرجى إتمام الدفع في الموعد المحدد.'}</p>
      <p><strong>المبلغ:</strong> <span class="highlight">${data.amount || ''} ريال</span></p>
      <p><strong>الموعد:</strong> ${data.dueDate || ''}</p>
      ${data.paymentLink ? `<a href="${data.paymentLink}" class="btn">ادفع الآن</a>` : ''}
    `),
  }),

  deadline_reminder: (data) => ({
    subject: `موعد تسليم قريب — ${data.assignmentTitle || ''}`,
    html: wrapInTemplate(`
      <h2>موعد تسليم قريب ⏰</h2>
      <p>واجب <span class="highlight">"${data.assignmentTitle || ''}"</span> موعد تسليمه ${data.deadline || 'قريباً'}!</p>
      <p>لا تنسى تسليم واجبك في الوقت.</p>
      <a href="https://fluentia-lms.vercel.app/student/assignments" class="btn">تسليم الواجب</a>
    `),
  }),

  welcome: (data) => ({
    subject: 'أهلاً بك في Fluentia! 🎉',
    html: wrapInTemplate(`
      <h2>أهلاً بك في أكاديمية طلاقة! 🎉</h2>
      <p>مرحباً <span class="highlight">${data.studentName || ''}</span>،</p>
      <p>نحن سعداء بانضمامك لعائلة طلاقة! رحلتك في تعلم الإنجليزية تبدأ الآن.</p>
      <p><strong>المجموعة:</strong> ${data.groupName || ''}</p>
      <p><strong>المدرب:</strong> ${data.trainerName || ''}</p>
      <a href="https://fluentia-lms.vercel.app" class="btn">ابدأ الآن</a>
    `),
  }),

  streak_warning: (data) => ({
    subject: `تحذير: سلسلتك ${data.streakDays || ''} يوم في خطر! 🔥`,
    html: wrapInTemplate(`
      <h2>تحذير الـ Streak 🔥</h2>
      <p>سلسلتك <span class="gold">${data.streakDays || ''} يوم</span> في خطر!</p>
      <p>سلّم واجب أو أكمل التحدي اليومي قبل انتهاء اليوم.</p>
      <a href="https://fluentia-lms.vercel.app/student" class="btn">حافظ على سلسلتك</a>
    `),
  }),
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { to, type, data, subject: rawSubject, html: rawHtml } = body

    if (!to) {
      return new Response(
        JSON.stringify({ error: 'Missing "to" field' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    let subject = rawSubject || ''
    let html = rawHtml || ''

    // Use template if type provided
    if (type && templates[type]) {
      const tpl = templates[type](data || {})
      subject = tpl.subject
      html = tpl.html
    } else if (!html) {
      html = wrapInTemplate(`<p>${subject}</p>`)
    }

    // Skip if no API key configured
    if (!RESEND_API_KEY) {
      console.log('[send-email] RESEND_API_KEY not set, skipping email to:', to)
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'no_api_key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('[send-email] Resend API error:', result)
      return new Response(
        JSON.stringify({ error: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[send-email] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
