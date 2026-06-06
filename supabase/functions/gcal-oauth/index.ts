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
    // Not connected yet → bounce back into the app instead of showing a bare page.
    return Response.redirect(`${APP_URL}/admin/integrations?gcal=notconfigured`, 302);
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
