// send-mock-exam-launch-emails
// One-shot dispatcher that emails every eligible L1/L3 student the mock-exam
// launch announcement via Resend. Idempotent: skips students whose
// (student_id, channel='email', exam_code) row in mock_exam_launch_notification_log
// is already 'sent'. Safe to re-invoke.

// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API = "https://api.resend.com/emails";
const REPLY_TO = "ali@fluentia.academy";
const APP_URL = "https://fluentia-lms.vercel.app";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY missing");

    const FROM =
      Deno.env.get("RESEND_FROM_EMAIL")
      ?? Deno.env.get("RESEND_FROM_ADDRESS")
      ?? 'أكاديمية طلاقة <notifications@fluentia.app>';

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // L1 + L3 students, NOT test accounts, NOT soft-deleted, with email
    const { data: rows, error } = await admin
      .from("profiles")
      .select(`
        id, full_name, email,
        student:students!inner(academic_level, deleted_at)
      `)
      .eq("role", "student")
      .eq("is_test_account", false)
      .in("student.academic_level", [1, 3])
      .is("student.deleted_at", null);
    if (error) throw error;

    const eligible = (rows ?? []).filter((r: any) => r.email && r.student?.academic_level);
    if (eligible.length === 0) throw new Error("no_eligible_students");

    let sent = 0, failed = 0, skipped = 0;
    const details: Array<Record<string, unknown>> = [];

    for (const s of eligible) {
      const level: number = (s as any).student.academic_level;
      const examCode = level === 1 ? "midterm-mock-a1" : "midterm-mock-b1";

      // Idempotency check
      const { data: existing } = await admin
        .from("mock_exam_launch_notification_log")
        .select("id, status")
        .eq("student_id", s.id)
        .eq("channel", "email")
        .eq("exam_code", examCode)
        .eq("status", "sent")
        .maybeSingle();
      if (existing) {
        skipped++;
        details.push({ student_id: s.id, email: s.email, status: "skipped", reason: "already_sent" });
        continue;
      }

      try {
        const { subject, html, text } = buildEmail(s.full_name || "", level);

        const resp = await fetch(RESEND_API, {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM,
            to: [s.email],
            reply_to: REPLY_TO,
            subject,
            html,
            text,
          }),
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`resend_${resp.status}: ${errText.slice(0, 300)}`);
        }
        const data = await resp.json().catch(() => ({} as any));

        await admin
          .from("mock_exam_launch_notification_log")
          .upsert(
            {
              student_id: s.id,
              channel: "email",
              exam_code: examCode,
              status: "sent",
              details: { resend_id: data?.id ?? null, email_to: s.email },
            },
            { onConflict: "student_id,channel,exam_code" }
          );

        sent++;
        details.push({ student_id: s.id, email: s.email, status: "sent", resend_id: data?.id ?? null });

        // gentle pacing for Resend burst limits
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        const msg = String((err as any)?.message ?? err);
        await admin
          .from("mock_exam_launch_notification_log")
          .upsert(
            {
              student_id: s.id,
              channel: "email",
              exam_code: examCode,
              status: "failed",
              details: { error: msg, email_to: s.email },
            },
            { onConflict: "student_id,channel,exam_code" }
          );
        failed++;
        details.push({ student_id: s.id, email: s.email, status: "failed", error: msg });
      }
    }

    return json({
      success: true,
      from: FROM,
      total_eligible: eligible.length,
      sent,
      failed,
      skipped,
      details,
    });
  } catch (err) {
    console.error("[launch-emails] fatal:", err);
    return json({ success: false, error: String((err as any)?.message ?? err) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function buildEmail(fullName: string, level: number) {
  const levelCode = level === 1 ? "A1" : "B1";
  const duration = level === 1 ? "٧٥ دقيقة" : "٩٠ دقيقة";
  const minWords = level === 1 ? "٥٠ كلمة" : "٨٠ كلمة";
  const subject = `📝 الاختبار التجريبي للوحدات ١-٤ متاح من ١٠م الليلة (${levelCode})`;

  const text = `السلام عليكم ${fullName}،

سيُفتح الاختبار التجريبي للوحدات ١ إلى ٤ من المستوى ${levelCode} في الموعد التالي:

من ١٠م الجمعة ٢٢ مايو ٢٠٢٦ إلى ١٠م السبت ٢٣ مايو ٢٠٢٦ (٢٤ ساعة كاملة)

كيف تبدئين:
١. ادخلي على ${APP_URL}
٢. اضغطي "الاختبار التجريبي" من القائمة الجانبية
٣. اضغطي "ابدئي الاختبار" — الوقت يبدأ من هذي اللحظة

معلومات مهمة:
- المدة: ${duration} من لحظة البدء
- محاولة واحدة فقط
- إجاباتك تُحفظ تلقائياً
- النتائج لن تظهر فوراً — سأراجع إجاباتك قبل كشفها
- هذا اختبار تجريبي للتعوّد على شكل الاختبار الفعلي
- قسم الكتابة يحتاج على الأقل ${minWords}

للدعم الفني: WhatsApp +966558669974

وفّقكِ الله 🌟

د. علي الأحمد
أكاديمية طلاقة`;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,'Segoe UI','Tahoma',sans-serif;direction:rtl;text-align:right;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0a0f;padding:32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#13131a;border-radius:16px;border:1px solid #2a2a35;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 16px;border-bottom:1px solid #2a2a35;">
              <h1 style="margin:0;color:#d4af37;font-size:24px;font-weight:700;">طلاقة | Fluentia Academy</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#e5e5ec;font-size:16px;line-height:1.8;">السلام عليكم ${fullName}،</p>
              <p style="margin:0 0 24px;color:#e5e5ec;font-size:16px;line-height:1.8;">
                سيُفتح <strong style="color:#d4af37;">الاختبار التجريبي</strong> للوحدات ١ إلى ٤ من المستوى <strong>${levelCode}</strong> في الموعد التالي:
              </p>
              <div style="background:#1a1a23;border-right:4px solid #d4af37;padding:16px 20px;border-radius:8px;margin-bottom:24px;">
                <p style="margin:0;color:#e5e5ec;font-size:18px;font-weight:600;line-height:1.6;">
                  🕙 من ١٠م الجمعة ٢٢ مايو<br>
                  إلى ١٠م السبت ٢٣ مايو<br>
                  <span style="font-size:14px;color:#a5a5b5;font-weight:normal;">(٢٤ ساعة كاملة)</span>
                </p>
              </div>
              <p style="margin:0 0 8px;color:#d4af37;font-size:18px;font-weight:600;">كيف تبدئين:</p>
              <ol style="margin:0 0 24px;padding-right:24px;color:#e5e5ec;font-size:15px;line-height:2;">
                <li>ادخلي على <a href="${APP_URL}" style="color:#d4af37;text-decoration:none;">${APP_URL}</a></li>
                <li>اضغطي "الاختبار التجريبي" من القائمة الجانبية</li>
                <li>اضغطي "ابدئي الاختبار" — الوقت يبدأ من هذي اللحظة</li>
              </ol>
              <p style="margin:0 0 8px;color:#d4af37;font-size:18px;font-weight:600;">معلومات مهمة:</p>
              <ul style="margin:0 0 24px;padding-right:24px;color:#e5e5ec;font-size:15px;line-height:2;">
                <li>المدة: <strong>${duration}</strong> من لحظة البدء</li>
                <li><strong>محاولة واحدة فقط</strong></li>
                <li>إجاباتك تُحفظ تلقائياً</li>
                <li>النتائج لن تظهر فوراً — سأراجع إجاباتك قبل كشفها</li>
                <li>هذا اختبار <strong>تجريبي</strong> للتعوّد على شكل الاختبار الفعلي</li>
                <li>قسم الكتابة يحتاج على الأقل <strong>${minWords}</strong></li>
              </ul>
              <div style="text-align:center;margin:32px 0;">
                <a href="${APP_URL}/student/mock-exam"
                   style="display:inline-block;background:#d4af37;color:#0a0a0f;font-weight:700;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">
                  الذهاب إلى الاختبار
                </a>
              </div>
              <p style="margin:24px 0 8px;color:#a5a5b5;font-size:14px;">
                للدعم الفني: WhatsApp <a href="https://wa.me/966558669974" style="color:#d4af37;text-decoration:none;">+966 55 866 9974</a>
              </p>
              <p style="margin:16px 0 0;color:#d4af37;font-size:16px;font-weight:600;">وفّقكِ الله 🌟</p>
              <p style="margin:24px 0 0;color:#a5a5b5;font-size:14px;line-height:1.6;">
                د. علي الأحمد<br>
                <span style="color:#7a7a8a;">أكاديمية طلاقة</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#0e0e15;border-top:1px solid #2a2a35;text-align:center;">
              <p style="margin:0;color:#7a7a8a;font-size:12px;">
                هذه رسالة من <a href="https://fluentia.academy" style="color:#d4af37;text-decoration:none;">أكاديمية طلاقة</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
