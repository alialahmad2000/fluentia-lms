import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Fluentia Academy <noreply@fluentia.app>";

const TEMPLATES: Record<string, (name: string, data: any) => { subject: string; html: string }> = {
  new_conversion: (name) => ({
    subject: "🎉 عميل جديد! +100 ريال لحسابك",
    html: `
      <h2>مبروك ${name}!</h2>
      <p>عميل جديد انضم عبر رابطك الخاص.</p>
      <p><strong>العمولة: 100 ريال</strong></p>
      <p>ستُحوّل لحسابك كـ "جاهزة" بعد 14 يوم من أول دفعة (فترة حماية).</p>
      <p><a href="https://app.fluentia.academy/partner" style="display:inline-block;padding:12px 32px;background:#0ea5e9;color:white;text-decoration:none;border-radius:12px;font-weight:bold;">افتح لوحة تحكمك</a></p>
      <p>استمر — كل مبيعة تقرّبك من هدفك! 🚀</p>
    `,
  }),
  payout_sent: (name, data) => ({
    subject: `💰 تم تحويل عمولتك — ${data.amount} ريال`,
    html: `
      <h2>مرحباً ${name}!</h2>
      <p>تم تحويل عمولتك بنجاح.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid rgba(255,255,255,0.1);">المبلغ</td><td style="padding:8px;border:1px solid rgba(255,255,255,0.1);font-weight:bold;color:#fbbf24;">${data.amount} ريال</td></tr>
        <tr><td style="padding:8px;border:1px solid rgba(255,255,255,0.1);">عدد المبيعات</td><td style="padding:8px;border:1px solid rgba(255,255,255,0.1);">${data.count}</td></tr>
        <tr><td style="padding:8px;border:1px solid rgba(255,255,255,0.1);">الفترة</td><td style="padding:8px;border:1px solid rgba(255,255,255,0.1);">${data.period}</td></tr>
        <tr><td style="padding:8px;border:1px solid rgba(255,255,255,0.1);">طريقة الدفع</td><td style="padding:8px;border:1px solid rgba(255,255,255,0.1);">${data.method === 'bank' ? 'تحويل بنكي' : data.method === 'stcpay' ? 'STC Pay' : 'أخرى'}</td></tr>
        <tr><td style="padding:8px;border:1px solid rgba(255,255,255,0.1);">مرجع العملية</td><td style="padding:8px;border:1px solid rgba(255,255,255,0.1);">${data.tx_ref}</td></tr>
        <tr><td style="padding:8px;border:1px solid rgba(255,255,255,0.1);">تاريخ التحويل</td><td style="padding:8px;border:1px solid rgba(255,255,255,0.1);">${data.paid_at}</td></tr>
      </table>
      <p>شكراً على جهودك ونتطلع للمزيد 🚀</p>
    `,
  }),
  monthly_statement: (name, data) => ({
    subject: `📊 كشف شهري — ${data.month || ''}`,
    html: `
      <h2>مرحباً ${name}!</h2>
      <p>ملخص أدائك للشهر الماضي:</p>
      <ul>
        <li>النقرات: ${data.clicks || 0}</li>
        <li>العملاء المحتملين: ${data.leads || 0}</li>
        <li>المبيعات المؤكدة: ${data.conversions || 0}</li>
        <li>العمولات المكتسبة: ${data.earned || 0} ريال</li>
      </ul>
      <p><a href="https://app.fluentia.academy/partner" style="display:inline-block;padding:12px 32px;background:#0ea5e9;color:white;text-decoration:none;border-radius:12px;font-weight:bold;">افتح لوحة تحكمك</a></p>
    `,
  }),
  welcome: (name) => ({
    subject: "مبروك! تم اعتماد طلبك كشريك في أكاديمية طلاقة",
    html: `
      <h2>مبروك ${name}!</h2>
      <p>تم اعتماد طلبك كشريك في أكاديمية طلاقة.</p>
      <p>سجّل دخولك الآن وابدأ بمشاركة رابطك الفريد وكسب العمولات.</p>
      <p><a href="https://app.fluentia.academy/partner" style="display:inline-block;padding:12px 32px;background:#0ea5e9;color:white;text-decoration:none;border-radius:12px;font-weight:bold;">ادخل لوحة تحكمك</a></p>
    `,
  }),
};

function wrapTemplate(content: string): string {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>
    body{font-family:'Tajawal','Segoe UI',sans-serif;background:#060e1c;color:#e2e8f0;margin:0;padding:0;direction:rtl}
    .c{max-width:520px;margin:0 auto;padding:32px 24px}
    .h{text-align:center;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:24px}
    .l{font-size:28px;font-weight:bold;color:#38bdf8}
    h2{color:#f1f5f9;font-size:20px}
    a{color:#38bdf8}
    .f{text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;color:#64748b}
  </style></head><body><div class="c"><div class="h"><div class="l">Fluentia</div><div style="font-size:12px;color:#64748b;margin-top:4px;">أكاديمية طلاقة</div></div>${content}<div class="f"><p>فريق أكاديمية طلاقة</p></div></div></body></html>`;
}

serve(async (req) => {
  const headers = { "Content-Type": "application/json" };

  try {
    const body = await req.json();
    const { affiliate_id, template, data } = body;

    if (!affiliate_id || !template) {
      return new Response(JSON.stringify({ ok: false, reason: "missing_params" }), { status: 400, headers });
    }

    const templateFn = TEMPLATES[template];
    if (!templateFn) {
      return new Response(JSON.stringify({ ok: false, reason: "unknown_template" }), { status: 400, headers });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("full_name, email")
      .eq("id", affiliate_id)
      .single();

    if (!affiliate?.email) {
      return new Response(JSON.stringify({ ok: false, reason: "affiliate_not_found" }), { status: 404, headers });
    }

    const { subject, html } = templateFn(affiliate.full_name, data || {});
    const fullHtml = wrapTemplate(html);

    if (!RESEND_API_KEY) {
      console.log(`[send-affiliate-email] No RESEND_API_KEY — logging email:`);
      console.log(`To: ${affiliate.email}, Subject: ${subject}`);
      console.log(fullHtml.substring(0, 500));
      return new Response(JSON.stringify({ ok: true, logged: true }), { status: 200, headers });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: [affiliate.email], subject, html: fullHtml }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ ok: false, reason: "send_failed" }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err) {
    console.error("send-affiliate-email error:", err);
    return new Response(JSON.stringify({ ok: false, reason: "server_error" }), { status: 500, headers });
  }
});
