// Fluentia LMS — Student bug report intake.
// Records the report (service role), notifies every staff member in-app, and
// emails the admins. Deliberately simple: one short description + optional
// screenshot. Deploy with --no-verify-jwt (auth handled internally).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Fluentia Academy <notifications@fluentia.app>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing authorization" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Resolve the reporter from their JWT.
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);
    const reporterId = userData.user.id;

    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Invalid body" }, 400); }

    const description = String(body?.description || "").trim();
    if (!description) return json({ error: "الوصف مطلوب" }, 400);
    const pageUrl = body?.page_url ? String(body.page_url).slice(0, 600) : null;
    const screenshotPath = body?.screenshot_path ? String(body.screenshot_path).slice(0, 600) : null;
    const deviceInfo = (body?.device_info && typeof body.device_info === "object") ? body.device_info : {};

    // Reporter profile (name + role) for nicer notifications.
    const { data: prof } = await admin
      .from("profiles")
      .select("full_name, display_name, role")
      .eq("id", reporterId)
      .maybeSingle();
    const reporterName = prof?.display_name || prof?.full_name || "طالب";
    const reporterRole = prof?.role || "student";

    // 1) Record the report.
    const { data: inserted, error: insErr } = await admin
      .from("bug_reports")
      .insert({
        reporter_id: reporterId,
        reporter_role: reporterRole,
        reporter_name: reporterName,
        description: description.slice(0, 4000),
        page_url: pageUrl,
        screenshot_path: screenshotPath,
        device_info: deviceInfo,
      })
      .select("id, created_at")
      .single();
    if (insErr) return json({ error: insErr.message }, 500);
    const bugId = inserted.id;

    // A signed URL for the screenshot so staff can view it (private bucket).
    let screenshotUrl: string | null = null;
    if (screenshotPath) {
      const { data: signed } = await admin.storage
        .from("bug-screenshots")
        .createSignedUrl(screenshotPath, 60 * 60 * 24 * 30); // 30 days
      screenshotUrl = signed?.signedUrl || null;
    }

    // 2) Notify every staff member in-app (best effort).
    const { data: staff } = await admin
      .from("profiles")
      .select("id, email, role")
      .in("role", ["admin", "trainer"]);
    const staffRows = staff || [];

    if (staffRows.length) {
      const preview = description.length > 130 ? description.slice(0, 130) + "…" : description;
      const notifications = staffRows.map((s) => ({
        user_id: s.id,
        type: "system",
        title: "بلاغ جديد عن مشكلة 🐞",
        body: `${reporterName}: ${preview}`,
        data: { kind: "bug_report", bug_id: bugId, page_url: pageUrl, screenshot_url: screenshotUrl },
        priority: "high",
        action_url: "/admin/bug-reports",
        action_label: "عرض البلاغات",
      }));
      await admin.from("notifications").insert(notifications);
    }

    // 3) Email the admins (best effort, only real addresses).
    if (RESEND_API_KEY) {
      const recipients = Array.from(
        new Set(
          staffRows
            .filter((s) => s.role === "admin" && s.email && s.email.includes("@") && !s.email.includes("qa-admin"))
            .map((s) => s.email as string)
            .concat(["alialahmad2000@gmail.com"]),
        ),
      );
      const html = `
<!DOCTYPE html><html dir="rtl" lang="ar"><body style="font-family:Tajawal,'Segoe UI',sans-serif;background:#060e1c;color:#e2e8f0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#0a1225;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:24px;">
    <h2 style="color:#38bdf8;margin:0 0 8px;">🐞 بلاغ جديد عن مشكلة</h2>
    <p style="color:#94a3b8;margin:0 0 16px;font-size:13px;">من أكاديمية طلاقة — Fluentia LMS</p>
    <p><strong>المُبلِّغ:</strong> ${reporterName} (${reporterRole})</p>
    <p><strong>الوصف:</strong></p>
    <div style="background:#11131c;border-radius:10px;padding:12px;white-space:pre-wrap;line-height:1.7;">${description.replace(/[<>]/g, "")}</div>
    ${pageUrl ? `<p style="margin-top:12px;"><strong>الصفحة:</strong> <span style="color:#7dd3fc;">${pageUrl}</span></p>` : ""}
    ${screenshotUrl ? `<p><a href="${screenshotUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#0ea5e9;color:#fff;border-radius:10px;text-decoration:none;">عرض الصورة المرفقة</a></p>` : ""}
    <p style="margin-top:16px;"><a href="https://fluentia-lms.vercel.app/admin/bug-reports" style="color:#fbbf24;">فتح لوحة البلاغات ←</a></p>
  </div>
</body></html>`;
      // Resend accepts an array of recipients in one call.
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: FROM_EMAIL, to: recipients, subject: "🐞 بلاغ جديد عن مشكلة — طلاقة", html }),
        });
      } catch (_e) { /* email is best-effort; the report is already saved */ }
    }

    return json({ success: true, bug_id: bugId });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
