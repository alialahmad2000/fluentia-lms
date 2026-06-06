// Fluentia CS Ops — gcal-oauth edge function.
// GET (no code)  → redirect the browser to Google's consent screen.
// GET (?code=…)  → exchange code for a refresh token, store it, redirect back to /admin/integrations.
// Gated: returns 503 until GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI are set. Deploy with --no-verify-jwt.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") || "";
const APP_URL = Deno.env.get("APP_URL") || "https://app.fluentia.academy";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

serve(async (req) => {
  const url = new URL(req.url);
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>تقويم Google</title>
<style>body{font-family:'Tajawal',system-ui,sans-serif;background:#060e1c;color:#f0f4f8;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center}
.box{max-width:420px;padding:32px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px}
h1{font-size:20px;margin:0 0 12px}p{color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 20px}
a{display:inline-block;background:#38bdf8;color:#06121f;text-decoration:none;font-weight:700;padding:10px 20px;border-radius:10px}</style></head>
<body><div class="box"><h1>تقويم Google غير مُفعّل بعد</h1>
<p>لتفعيل التذكيرات التلقائية، يجب ضبط بيانات اعتماد Google أولاً (تُضاف من قِبل الإدارة). الحجوزات تعمل الآن — فقط تنبيهات التقويم بانتظار هذه الخطوة.</p>
<a href="${APP_URL}/admin/integrations">العودة</a></div></body></html>`;
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const code = url.searchParams.get("code");
  if (!code) {
    const consent = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    consent.searchParams.set("client_id", CLIENT_ID);
    consent.searchParams.set("redirect_uri", REDIRECT_URI);
    consent.searchParams.set("response_type", "code");
    consent.searchParams.set("scope", SCOPE);
    consent.searchParams.set("access_type", "offline");
    consent.searchParams.set("prompt", "consent");
    return Response.redirect(consent.toString(), 302);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI, grant_type: "authorization_code",
    }),
  });
  const tok = await tokenRes.json();
  if (!tok.refresh_token) {
    return Response.redirect(`${APP_URL}/admin/integrations?gcal=error`, 302);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  await supabase.from("integration_tokens").upsert({
    provider: "google",
    refresh_token: tok.refresh_token,
    access_token: tok.access_token || null,
    token_expires_at: tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : null,
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "provider" });

  return Response.redirect(`${APP_URL}/admin/integrations?gcal=connected`, 302);
});
