// Fluentia LMS — Bug-report reply EMAIL notifier.
// Invoked (fire-and-forget, via pg_net from the notify_bug_report_reply trigger)
// whenever a STUDENT replies on a bug ticket. It emails the admins — most
// importantly Dr. Ali's main inbox — so a student reply is as visible as the
// original report was. (Push + in-app are handled in the trigger itself.)
// Deploy with verify_jwt=false (called server-side by the DB trigger).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Fluentia Academy <notifications@fluentia.app>";
const APP_BASE = "https://app.fluentia.academy";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const esc = (t: string) => (t || "").replace(/[<>]/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({} as any));
    const reportId = body?.report_id;
    if (!reportId) return json({ error: "missing report_id" }, 400);

    const { data: report } = await admin
      .from("bug_reports")
      .select("id, reporter_name, reporter_role, description, page_url, status")
      .eq("id", reportId)
      .maybeSingle();
    if (!report) return json({ error: "report not found" }, 404);

    // The reply we're notifying about (by id if given, else the latest message).
    let reply: any = null;
    if (body?.message_id) {
      const { data } = await admin
        .from("bug_report_messages")
        .select("body, created_at, sender_role")
        .eq("id", body.message_id)
        .maybeSingle();
      reply = data;
    }
    if (!reply) {
      const { data } = await admin
        .from("bug_report_messages")
        .select("body, created_at, sender_role")
        .eq("report_id", reportId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      reply = data;
    }
    const replyText = (reply?.body || "").toString();
    const name = report.reporter_name || "طالب";

    if (!RESEND_API_KEY) return json({ success: true, skipped: "no_resend_key" });

    // Recipients: real admins (skip QA/test accounts) + Dr. Ali's main inbox.
    const { data: staff } = await admin.from("profiles").select("email, role").eq("role", "admin");
    const recipients = Array.from(
      new Set(
        (staff || [])
          .filter((s: any) => s.email && s.email.includes("@") && !s.email.includes("qa-admin") && !s.email.includes("zz-cs-verify"))
          .map((s: any) => s.email as string)
          .concat(["alialahmad2000@gmail.com"]),
      ),
    );

    const link = `${APP_BASE}/admin/bug-reports`;
    const html = `
<!DOCTYPE html><html dir="rtl" lang="ar"><body style="font-family:Tajawal,'Segoe UI',sans-serif;background:#060e1c;color:#e2e8f0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#0a1225;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:24px;">
    <h2 style="color:#38bdf8;margin:0 0 8px;">💬 ردّ جديد على بلاغ مشكلة</h2>
    <p style="color:#94a3b8;margin:0 0 16px;font-size:13px;">أكاديمية طلاقة — Fluentia LMS</p>
    <p><strong>الطالب${report.reporter_role === "student" ? "ة" : ""}:</strong> ${esc(name)}</p>
    <p><strong>ردّها الآن:</strong></p>
    <div style="background:#11131c;border-radius:10px;padding:12px;white-space:pre-wrap;line-height:1.7;font-size:15px;">${esc(replyText) || "—"}</div>
    <p style="color:#64748b;margin-top:14px;font-size:13px;"><strong>البلاغ الأصلي:</strong> ${esc(report.description || "")}</p>
    ${report.page_url ? `<p style="font-size:13px;"><strong>الصفحة:</strong> <span style="color:#7dd3fc;">${esc(report.page_url)}</span></p>` : ""}
    <p style="margin-top:18px;"><a href="${link}" style="display:inline-block;padding:11px 22px;background:#0ea5e9;color:#fff;border-radius:10px;text-decoration:none;">افتح المحادثة وردّ ←</a></p>
    <p style="color:#64748b;margin-top:16px;font-size:12px;">مساعد طلاقة الذكي ردّ على الطالب رداً أوّلياً تلقائياً — هذا البريد ليطّلع الفريق ويتابع.</p>
  </div>
</body></html>`;

    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: recipients,
          subject: `💬 ردّ جديد من ${name} على بلاغ — طلاقة`,
          html,
        }),
      });
      const out = await r.json().catch(() => ({}));
      return json({ success: r.ok, recipients: recipients.length, resend: out?.id || null });
    } catch (e) {
      return json({ success: false, error: String(e) }, 200); // email is best-effort
    }
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
