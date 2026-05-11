// supabase/functions/send-password-reset/index.ts
// Bulletproof password reset — bypasses Supabase's resetPasswordForEmail throttle
// by using auth.admin.generateLink + Resend directly.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://app.fluentia.academy";
const FROM_ADDR = "أكاديمية طلاقة <noreply@fluentia.academy>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const emailRaw = String(body.email ?? "").trim().toLowerCase();

    // ─── Basic validation ─────────────────────────────────────────
    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return json({ error: "invalid_email", message: "البريد الإلكتروني غير صحيح" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ─── Look up the user by email ────────────────────────────────
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr) {
      console.error("listUsers failed:", listErr);
      return json({ error: "internal", message: "حدث خطأ مؤقت، حاول مرة أخرى" }, 500);
    }

    const user = list.users.find((u) => u.email?.toLowerCase() === emailRaw);

    // ─── Security: respond identically whether the user exists or not ──
    if (!user) {
      await admin.from("system_errors").insert({
        error_type: "password_reset_unknown_email",
        context: { email: emailRaw },
        created_at: new Date().toISOString(),
      }).select().then(() => {}).catch(() => {});
      return json({ success: true, message: "إذا كان البريد مسجلاً، تم إرسال الرابط" });
    }

    // ─── Generate recovery link (NO email send — admin API doesn't throttle) ──
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: emailRaw,
      options: { redirectTo: `${APP_URL}/reset-password` },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      console.error("generateLink failed:", linkErr);
      return json({ error: "link_failed", message: "تعذّر توليد الرابط، حاول مرة أخرى" }, 500);
    }

    const resetLink = linkData.properties.action_link;

    // ─── Send the email via Resend ────────────────────────────────
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      "";
    const greeting = fullName ? `أهلاً ${fullName} 👋` : "أهلاً 👋";

    const subject = "إعادة تعيين كلمة المرور — أكاديمية طلاقة";
    const html = buildEmailHtml({ greeting, resetLink });
    const text = buildEmailText({ greeting, resetLink });

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDR,
        to: [emailRaw],
        subject,
        html,
        text,
        reply_to: "support@fluentia.academy",
        tags: [{ name: "type", value: "password_reset" }],
      }),
    });

    if (!resendResp.ok) {
      const detail = await resendResp.text().catch(() => "");
      console.error("Resend failed:", resendResp.status, detail);
      await admin.from("system_errors").insert({
        error_type: "password_reset_resend_failed",
        context: { email: emailRaw, status: resendResp.status, detail },
        user_id: user.id,
        created_at: new Date().toISOString(),
      }).select().then(() => {}).catch(() => {});
      return json({
        error: "email_failed",
        message: "تعذّر إرسال الإيميل الآن، تواصل معنا واتساب: +966558669974",
      }, 502);
    }

    // ─── Log success ──────────────────────────────────────────────
    await admin.from("system_errors").insert({
      error_type: "password_reset_sent",
      context: { email: emailRaw },
      user_id: user.id,
      created_at: new Date().toISOString(),
    }).select().then(() => {}).catch(() => {});

    return json({ success: true, message: "تم إرسال رابط إعادة التعيين إلى بريدك ✉️" });
  } catch (e) {
    console.error("unhandled error:", e);
    return json({ error: "internal", message: "حدث خطأ، حاول مرة أخرى" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function buildEmailText({ greeting, resetLink }: { greeting: string; resetLink: string }): string {
  return `${greeting}

استلمنا طلب إعادة تعيين كلمة المرور لحسابك في أكاديمية طلاقة.

اضغطي على الرابط التالي لإنشاء كلمة مرور جديدة:
${resetLink}

هذا الرابط صالح لمدة ساعة واحدة فقط، وتقدرين تطلبين رابط جديد في أي وقت من صفحة تسجيل الدخول.

إذا ما طلبتي إعادة التعيين، تجاهلي هذا الإيميل — حسابك بأمان.

للمساعدة:
واتساب: +966558669974
البريد: support@fluentia.academy

أكاديمية طلاقة
fluentia.academy`;
}

function buildEmailHtml({ greeting, resetLink }: { greeting: string; resetLink: string }): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>إعادة تعيين كلمة المرور</title>
</head>
<body style="margin:0;padding:0;background:#0f1421;font-family:'Tajawal','Segoe UI',Tahoma,Arial,sans-serif;color:#e9ecf5;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#fff;">أكاديمية طلاقة</div>
      <div style="font-size:13px;color:#8aa;margin-top:4px;">Fluentia Academy</div>
    </div>

    <div style="background:#1a2238;border:1px solid rgba(255,255,255,0.06);border-radius:18px;padding:28px;">
      <div style="font-size:18px;font-weight:700;margin-bottom:14px;color:#fff;">${greeting}</div>
      <div style="font-size:15px;line-height:1.8;color:#c8d0e0;">
        استلمنا طلب إعادة تعيين كلمة المرور لحسابك في أكاديمية طلاقة.
        <br><br>
        اضغطي على الزر التالي لإنشاء كلمة مرور جديدة:
      </div>

      <div style="text-align:center;margin:26px 0;">
        <a href="${resetLink}"
           style="display:inline-block;background:#38bdf8;color:#0a0f1e;text-decoration:none;
                  padding:14px 36px;border-radius:14px;font-weight:700;font-size:15px;">
          إعادة تعيين كلمة المرور
        </a>
      </div>

      <div style="font-size:13px;color:#8aa;line-height:1.7;">
        هذا الرابط صالح لمدة ساعة واحدة فقط.
        <br>
        لو ما طلبتي إعادة التعيين، تجاهلي هذا الإيميل — حسابك بأمان.
      </div>

      <div style="border-top:1px solid rgba(255,255,255,0.06);margin-top:24px;padding-top:18px;
                  font-size:12px;color:#778;line-height:1.7;">
        محتاجة مساعدة؟
        <br>
        واتساب: <a href="https://wa.me/966558669974" style="color:#38bdf8;text-decoration:none;">+966 55 866 9974</a>
        <br>
        البريد: <a href="mailto:support@fluentia.academy" style="color:#38bdf8;text-decoration:none;">support@fluentia.academy</a>
      </div>
    </div>

    <div style="text-align:center;margin-top:18px;font-size:11px;color:#556;">
      © 2026 أكاديمية طلاقة · fluentia.academy
    </div>
  </div>
</body>
</html>`;
}
