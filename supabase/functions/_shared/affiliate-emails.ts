// Shared email templates + Resend sender for affiliate flows.
// Runs in Deno edge environment.

const RESEND_FROM =
  Deno.env.get("RESEND_FROM_ADDRESS") ||
  Deno.env.get("RESEND_FROM_EMAIL") ||
  "Fluentia Academy <noreply@fluentia.academy>";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ADMIN_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "alialahmad2000@gmail.com";

export async function sendResend(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}) {
  if (!RESEND_KEY) throw new Error("RESEND_API_KEY not configured");
  const body: Record<string, unknown> = {
    from: RESEND_FROM,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
  };
  if (opts.replyTo) body.reply_to = opts.replyTo;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Resend failed:", res.status, data);
    throw new Error(`Resend ${res.status}: ${data?.message ?? "unknown"}`);
  }
  return { id: data?.id };
}

// ─── HTML SHELL ─────────────────────────────────────────────────────────────

const shell = (inner: string) => `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b1628;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#e5e7eb;">
  <div style="max-width:560px;margin:32px auto;background:#111d35;border-radius:16px;padding:32px;text-align:right;">
    ${inner}
  </div>
  <p style="text-align:center;color:#64748b;font-size:12px;margin:16px 0 32px;">أكاديمية طلاقة | Fluentia Academy</p>
</body>
</html>`;

// ─── TEMPLATES ──────────────────────────────────────────────────────────────

// 1. WELCOME (on approval) — with one-time magic link
export function welcomeEmail(a: {
  full_name: string;
  ref_code: string;
  magic_link: string;
}) {
  const refLink = `https://fluentia.academy/?ref=${encodeURIComponent(a.ref_code)}`;
  const inner = `
    <h1 style="color:#fbbf24;font-size:28px;margin:0 0 16px;">🎉 مرحباً ${escapeHtml(a.full_name)}</h1>
    <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">
      تم اعتماد طلبك في <strong>برنامج شركاء أكاديمية طلاقة</strong>. أنت الآن جاهز لبدء التسويق والكسب.
    </p>
    <div style="background:#0b1628;border:1px solid #1f2d4a;border-radius:12px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;">كودك التسويقي:</p>
      <p style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#fbbf24;letter-spacing:2px;">${escapeHtml(a.ref_code)}</p>
      <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;">رابطك للتسويق:</p>
      <p style="margin:0;font-size:14px;word-break:break-all;"><a href="${refLink}" style="color:#7dd3fc;text-decoration:none;">${refLink}</a></p>
    </div>
    <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">
      كل طالب يسجّل ويدفع عبر رابطك = <strong style="color:#fbbf24;">100 ريال عمولة لك</strong>.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${a.magic_link}" style="display:inline-block;background:linear-gradient(90deg,#fbbf24,#f59e0b);color:#0b1628;padding:16px 36px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;">ادخل لبوابة الشركاء</a>
    </div>
    <p style="font-size:13px;color:#94a3b8;line-height:1.7;margin:16px 0 0;text-align:center;">
      الرابط صالح لساعة واحدة ومرة واحدة فقط — اضغطه لتسجيل الدخول وتعيين كلمة مرورك.
    </p>
    <p style="font-size:14px;color:#94a3b8;line-height:1.7;margin:24px 0 0;border-top:1px solid #1f2d4a;padding-top:16px;">
      إذا انتهت صلاحية الرابط، تواصل معنا على واتساب: +966558669974
    </p>`;
  return {
    subject: `مرحباً بك في شركاء طلاقة — كودك ${a.ref_code} جاهز 🎉`,
    html: shell(inner),
  };
}

// 2. APPLICATION RECEIVED (to applicant, right after form submit)
export function applicationReceivedEmail(a: { full_name: string }) {
  const inner = `
    <h1 style="color:#fbbf24;font-size:26px;margin:0 0 16px;">📬 استلمنا طلبك ${escapeHtml(a.full_name)}</h1>
    <p style="font-size:16px;line-height:1.8;margin:0 0 16px;">
      شكراً لاهتمامك بالانضمام لبرنامج شركاء <strong>أكاديمية طلاقة</strong>.
    </p>
    <div style="background:#0b1628;border:1px solid #1f2d4a;border-radius:12px;padding:20px;margin:24px 0;">
      <p style="margin:0;font-size:15px;line-height:1.9;">
        ✓ وصلنا طلبك وفريقنا بيراجعه خلال <strong>٤٨ ساعة</strong><br>
        ✓ لو تم اعتماد طلبك، بنرسلك إيميل تاني فيه كودك ورابطك التسويقي<br>
        ✓ كل طالب يسجّل عبر رابطك = <strong style="color:#fbbf24;">١٠٠ ريال عمولة</strong>
      </p>
    </div>
    <p style="font-size:14px;color:#94a3b8;line-height:1.7;margin:24px 0 0;border-top:1px solid #1f2d4a;padding-top:16px;">
      لو عندك أي سؤال، تواصل معنا على واتساب: +966558669974
    </p>`;
  return { subject: "استلمنا طلب انضمامك لشركاء طلاقة 📬", html: shell(inner) };
}

// 3. ADMIN NOTIFICATION (to Ali, on every new application)
export function adminNewApplicationEmail(a: {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  audience_size?: number | null;
  heard_from?: string | null;
  reason?: string | null;
  ref_code: string;
}) {
  const adminUrl = `https://app.fluentia.academy/admin/affiliates/${a.id}`;
  const fieldRow = (label: string, value: string | number | null | undefined) =>
    value == null || value === ""
      ? ""
      : `<tr>
      <td style="padding:8px 12px;color:#94a3b8;font-size:13px;width:35%;">${label}</td>
      <td style="padding:8px 12px;color:#e5e7eb;font-size:14px;">${escapeHtml(String(value))}</td>
    </tr>`;
  const inner = `
    <div style="background:#f59e0b14;border:1px solid #f59e0b55;border-radius:10px;padding:12px 16px;margin:0 0 20px;">
      <p style="margin:0;color:#fbbf24;font-size:14px;font-weight:600;">⚡ طلب شركاء جديد بانتظار مراجعتك</p>
    </div>
    <h1 style="color:#e5e7eb;font-size:22px;margin:0 0 8px;">${escapeHtml(a.full_name)}</h1>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;">الكود التسويقي المقترح: <strong style="color:#fbbf24;">${escapeHtml(a.ref_code)}</strong></p>
    <table style="width:100%;border-collapse:collapse;background:#0b1628;border:1px solid #1f2d4a;border-radius:10px;overflow:hidden;margin:0 0 24px;">
      ${fieldRow("البريد", a.email)}
      ${fieldRow("الجوال", a.phone)}
      ${fieldRow("المدينة", a.city)}
      ${fieldRow("حجم الجمهور", a.audience_size)}
      ${fieldRow("كيف سمع عنّا", a.heard_from)}
      ${fieldRow("الدافع", a.reason)}
    </table>
    <div style="text-align:center;margin:24px 0;">
      <a href="${adminUrl}" style="display:inline-block;background:linear-gradient(90deg,#fbbf24,#f59e0b);color:#0b1628;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;">راجع الطلب واعتمده</a>
    </div>
    <p style="color:#64748b;font-size:12px;text-align:center;margin:16px 0 0;">هذا إيميل تنبيه تلقائي لفريق إدارة طلاقة.</p>`;
  return {
    subject: `⚡ طلب شركاء جديد: ${a.full_name}`,
    html: shell(inner),
  };
}

export const ADMIN_EMAIL_ADDRESS = ADMIN_EMAIL;

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}
