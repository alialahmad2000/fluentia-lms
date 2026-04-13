import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ORIGINS = (Deno.env.get("CORS_ORIGINS") || "https://fluentia.academy,https://app.fluentia.academy,https://fluentia.online,http://localhost:5173").split(",");

function corsHeaders(origin: string) {
  const allowed = ALLOWED_ORIGINS.find((o) => origin.startsWith(o.trim()));
  return {
    "Access-Control-Allow-Origin": allowed || ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const body = await req.json();
    const { ref_code, landing_url, referrer, utm_source, utm_medium, utm_campaign, visitor_id } = body;

    if (!ref_code) {
      return new Response(JSON.stringify({ ok: false, reason: "missing_code" }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Validate affiliate
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id")
      .eq("ref_code", ref_code.toUpperCase())
      .eq("status", "approved")
      .maybeSingle();

    if (!affiliate) {
      return new Response(JSON.stringify({ ok: false, reason: "invalid_code" }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
    }

    // Dedup: same affiliate + visitor in last 24h
    if (visitor_id) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("affiliate_clicks")
        .select("id", { count: "exact", head: true })
        .eq("affiliate_id", affiliate.id)
        .eq("visitor_id", visitor_id)
        .gte("created_at", since);

      if (count && count > 0) {
        return new Response(JSON.stringify({ ok: true, deduped: true }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
      }
    }

    // Hash IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
    const dailySalt = new Date().toISOString().split("T")[0];
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(ip + dailySalt));
    const ipHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

    // Detect country from CF header
    const country = req.headers.get("cf-ipcountry") || null;

    // Insert click
    const { error } = await supabase.from("affiliate_clicks").insert({
      affiliate_id: affiliate.id,
      ref_code: ref_code.toUpperCase(),
      landing_url: landing_url || null,
      referrer: referrer || null,
      user_agent: req.headers.get("user-agent") || null,
      ip_hash: ipHash,
      country,
      visitor_id: visitor_id || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
    });

    if (error) {
      console.error("Insert click error:", error);
      return new Response(JSON.stringify({ ok: false, reason: "db_error" }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, affiliate_id: affiliate.id }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("track-click error:", err);
    return new Response(JSON.stringify({ ok: false, reason: "server_error" }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
  }
});
